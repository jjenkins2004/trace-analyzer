import pyshark
from pyshark.capture.capture import TSharkCrashException
from dataclasses import dataclass
from enum import Enum
import math
import logging


class DeviceType(Enum):
    CLIENT = 0
    ACCESS_POINT = 1


class Type(Enum):
    GHZ_2 = 0
    GHZ_5 = 1


@dataclass
class Frame:
    """
    Represents just a general frame, which is used to find our total airtime and sustained data rates in time bins.

    airtime_us (int): the duration of the frame in microseconds
    size_bits (int): total size in bits of that frame
    """

    timestamp: float
    airtime_us: int
    size_bits: int


@dataclass
class BeaconFrame:
    """
    Represents a parsed beacon frame from a Wi-Fi capture.

    Attributes:
        sa (str): Source MAC address of the access point (BSSID).
        protocol (str): Wi-Fi protocol in use (e.g., 802.11g, 802.11n).
        rssi (float): Received Signal Strength Indicator (RSSI) in dBm.
        timestamp (float): Time when the frame was captured, in seconds from the start of the capture.
    """

    sa: str
    rssi: float
    timestamp: float


@dataclass
class DeviceInfo:
    """
    Represents info for a unique device found from the beacon frames

    Attributes:
        sa (str): Source MAC address of the access point (BSSID).
        total_frames (int): Total frames found for this device in an interval.
        score (float): Contributing score of this device for an interval for the overall density metric.
    """

    sa: str
    total_frames: int
    total_rssi: float
    score: float


@dataclass
class Bin:
    """
    Data aggregated over a single time interval (bin) in the trace.

    Attributes:
        devices (list[DeviceInfo]): List of unique devices observed in this interval.
        total_devices_in_interval (int): Number of distinct devices detected.
        total_frames_in_interval (int): Total frames captured in this interval.
        total_beacon_frames_in_interval (int): Total number of beacon frames
        avg_beacon_rssi_in_interval (float): Average rssi across all beacon frames in this interval.
        density_rating_in_interval (float): Computed network density score (0-1).
        N_eff (float): Our weighed AP score.
        U (float): Our busy time score.
        D (float): Our traffic score.
        start_time (float): Start timestamp (in seconds) of this interval relative to capture start.
        end_time (float): End timestamp (in seconds) of this interval relative to capture start.
    """

    devices: list[DeviceInfo]
    total_devices_in_interval: int
    total_frames_in_interval: int
    total_beacon_frames_in_interval: int
    avg_beacon_rssi_in_interval: float
    density_rating_in_interval: float
    N_eff: float
    U: float
    D: float
    start_time: float
    end_time: float


@dataclass
class DensityAnalysis:
    """
    Summary of the network density analysis over the entire packet capture.

    Attributes:
        interval (float): Duration (in seconds) of each bin.
        bins (list[Bin]): List of bin-level statistics computed over time intervals.
        total_devices (int): Total number of unique source devices (APs) seen across the capture.
        total_frames (int): Total number of frames captured throughout the trace.
        total_beacon_frames (int): Total number of beacon frames in whole trace.
        avg_beacon_rssi (float): Time-weighted average rssi of beacon frames across all bins.
        density_rating (float): Time-weighted Overall density score (normalized 0–1) for all bins.
        N_eff (float): Our weighed AP score.
        U (float): Our busy time score.
        D (float): Our traffic score.
    """

    interval: float
    bins: list[Bin]
    total_devices: int
    total_frames: int
    total_beacon_frames: int
    avg_beacon_rssi: float
    density_rating: float
    N_eff: float
    U: float
    D: float


"""
First value is for 2.4Ghz, second value is for 5Ghz
"""
R_MIN = (-86.69, -89.37)
N_MAX = (75.24, 48.46)  # max weighted AP score
F_CUTOFF = (27.2, 210)
U_MAX = (34.04, 22.71)  # busy %
T_MAX = (7.67, 14.24)  # mbps


# For now we will calculate a density for the entire trace, but will break it up into smaller units of time
def network_density(path: str):

    # Extract all frames
    all_frames, beacon_frames, band = extract(path=path)

    # Quit here if no frames were extracted
    if not beacon_frames:
        raise ValueError("No frames extracted")

    # Find the total lifespan of the trace, best time interval for each bin, and num of bins
    lifespan = all_frames[-1].timestamp
    interval_s = find_time_interval(lifespan_s=lifespan)
    num_bins = math.ceil(lifespan / interval_s)

    all_bins: list[Bin] = []
    found_devices = set()
    frame_idx = 0
    beacon_idx = 0

    # Loop through the number of bins we have
    for b in range(num_bins):
        total_frames: int = 0

        # Find the start and end time of the bin relative to capture start
        bin_start = b * interval_s
        bin_end = lifespan if b == num_bins - 1 else bin_start + interval_s

        # Parse through general frames for this bin
        total_airtime_us = 0
        total_bits = 0
        while (
            frame_idx < len(all_frames) and all_frames[frame_idx].timestamp <= bin_end
        ):
            total_airtime_us += all_frames[frame_idx].airtime_us
            total_bits += all_frames[frame_idx].size_bits
            frame_idx += 1
            total_frames += 1
        bin_duration_s = bin_end - bin_start
        total_airtime_s = total_airtime_us / 1e6
        sustained_bitrate_bps = total_bits / bin_duration_s
        sustained_bitrate_mbps = sustained_bitrate_bps / 1e6
        percent_airtime = (total_airtime_s / bin_duration_s) * 100

        # Parse through beacon frames for this bin
        devices: dict[str, DeviceInfo] = {}
        while (
            beacon_idx < len(beacon_frames)
            and beacon_frames[beacon_idx].timestamp <= bin_end
        ):
            frame = beacon_frames[beacon_idx]
            beacon_idx += 1

            # Initialize if first time seeing this BSSID
            if frame.sa not in devices:
                found_devices.add(frame.sa)
                devices[frame.sa] = DeviceInfo(
                    sa=frame.sa,
                    total_frames=1,
                    total_rssi=frame.rssi,
                    score=0,
                )
            else:
                # Update existing entry
                info = devices[frame.sa]
                info.total_frames += 1
                info.total_rssi += frame.rssi

        # Finished going through all devices for this bin, now calculate bin level values
        total_rssi: float = 0.0
        total_beacon_frames: int = 0
        total_score: float = 0.0

        # Traffic and airtime parts of our density score
        D = min(1, math.sqrt(sustained_bitrate_mbps / T_MAX[band.value]))
        U = min(1, percent_airtime / U_MAX[band.value])

        if devices:
            # Calculate scores for each device and update global metrics
            for value in devices.values():
                # Only contribute to the score if it passes our cutoff
                if (value.total_frames / (bin_end - bin_start)) * 60 >= F_CUTOFF[
                    band.value
                ]:
                    avg_rssi = value.total_rssi / value.total_frames
                    avg_normalized = get_normalized_rssi(rssi=avg_rssi, type=band)
                    value.score = avg_normalized
                    total_score += value.score

                total_rssi += value.total_rssi
                total_beacon_frames += value.total_frames

            # Weighted AP score
            N_eff = getApRating(total_score=total_score, type=band)

            # Final density score
            density_score = 0.5 * N_eff + 0.35 * U + 0.15 * D

            all_bins.append(
                Bin(
                    devices=list(devices.values()),
                    total_devices_in_interval=len(devices),
                    total_frames_in_interval=total_frames,
                    total_beacon_frames_in_interval=total_beacon_frames,
                    avg_beacon_rssi_in_interval=total_rssi / (total_beacon_frames),
                    density_rating_in_interval=density_score,
                    N_eff=N_eff,
                    D=D,
                    U=U,
                    start_time=bin_start,
                    end_time=bin_end,
                )
            )
        else:
            all_bins.append(
                Bin(
                    devices=[],
                    total_devices_in_interval=0,
                    total_frames_in_interval=total_frames,
                    total_beacon_frames_in_interval=total_beacon_frames,
                    avg_beacon_rssi_in_interval=0,
                    density_rating_in_interval=0.35 * U + 0.15 * D,
                    N_eff=0,
                    U=U,
                    D=D,
                    start_time=bin_start,
                    end_time=bin_end,
                )
            )

    # Now for overall density metrics
    # Return a complete analysis based on all time intervals
    return DensityAnalysis(
        interval=interval_s,
        bins=all_bins,
        total_devices=len(found_devices),
        total_frames=len(all_frames),
        total_beacon_frames=len(beacon_frames),
        avg_beacon_rssi=sum(
            bin.avg_beacon_rssi_in_interval * (bin.end_time - bin.start_time) / lifespan
            for bin in all_bins
        ),
        density_rating=sum(
            bin.density_rating_in_interval * (bin.end_time - bin.start_time) / lifespan
            for bin in all_bins
        ),
        N_eff=sum(
            bin.N_eff * (bin.end_time - bin.start_time) / lifespan for bin in all_bins
        ),
        U=sum(bin.U * (bin.end_time - bin.start_time) / lifespan for bin in all_bins),
        D=sum(bin.D * (bin.end_time - bin.start_time) / lifespan for bin in all_bins),
    )


def get_normalized_rssi(rssi: float, type: Type):
    return math.sqrt(max(0, (rssi - R_MIN[type.value])))


def find_time_interval(lifespan_s: float) -> float:
    """
    Returns the time interval in seconds
    """
    possible_intervals = [0.25, 0.5, 1, 2, 5, 10, 15, 20, 30]
    TARGET_BINS = 20

    best_interval = possible_intervals[0]
    best_diff = float("inf")

    for iv in possible_intervals:
        # How many bins we get with this chosen interval
        num_bins = lifespan_s / iv
        # How ideal is it?
        diff = abs(num_bins - TARGET_BINS)
        if diff < best_diff:
            best_diff = diff
            best_interval = iv

    return best_interval


def getApRating(total_score: float, type: Type) -> float:
    if total_score <= 0:
        return 0.0
    return min(1.0, total_score / N_MAX[type.value])


def extract(path: str) -> tuple[list[Frame], list[BeaconFrame], Type]:
    # Load beacon frames and probe requests into memory
    cap = pyshark.FileCapture(
        path,
        keep_packets=False,
        use_json=True,
    )

    all_frames: list[Frame] = []
    beacon_frames: list[BeaconFrame] = []

    first = True
    start_time: float = 0.0
    band: Type = Type.GHZ_2

    # Extract relevant data
    failed_packets = 0
    total_packets = 0
    try:
        for pkt in cap:
            if total_packets % 10_000 == 0:
                logging.info(f"Total parsed: {total_packets}")
            failed = False
            total_packets += 1

            if first:
                try:
                    start_time = float(pkt.sniff_timestamp)
                    freq = int(pkt.radiotap.freq)
                    if 2400 <= freq <= 2500:
                        band = Type.GHZ_2
                    else:
                        band = Type.GHZ_5
                except (AttributeError, ValueError, TypeError):
                    start_time = 0.0
                first = False

            # First extract airtime and length, which we need from all frames
            radio = getattr(pkt, "wlan_radio", None)

            length_bits = int(pkt.length) * 8

            # Timestamp relative to first packet
            try:
                timestamp = float(pkt.sniff_timestamp) - start_time
            except (AttributeError, ValueError, TypeError):
                failed = True

            # Some packets dont have a duration field, we fall back if they have a rate field, otherwise just ignore it.
            # < 0.01% dont have both so the difference will be very negligable
            airtime_us = 0
            if hasattr(radio, "duration"):
                airtime_us = int(radio.duration)
            elif hasattr(radio, "rate"):
                # Fallback: estimate on air time based on data rate and a standard preamble
                rate_mbps = float(radio.rate)
                preamble_us = 20  # 16 µs preamble + 4 µs SIG
                data_us = (length_bits / (rate_mbps * 1e6)) * 1e6
                airtime_us = int(preamble_us + data_us)

            if not failed:
                all_frames.append(
                    Frame(
                        timestamp=timestamp,
                        airtime_us=airtime_us,
                        size_bits=length_bits,
                    )
                )
            else:
                failed_packets += 1
                continue

            # Only continue if this is a beacon frame
            if not (pkt.wlan.fc_tree.type == "0" and pkt.wlan.fc_tree.subtype == "8"):
                continue

            # Source Address, same as BSSID for APs
            try:
                sa = pkt.wlan.sa
            except (AttributeError, ValueError):
                sa = "Unknown"

            # Signal Strength
            try:
                rssi = float(radio.signal_dbm)
            except (AttributeError, ValueError, TypeError):
                failed = True

            if not failed:
                beacon_frames.append(
                    BeaconFrame(
                        sa=sa,
                        rssi=rssi,
                        timestamp=timestamp,
                    )
                )
            else:
                failed_packets += 1

        # Don't process this file if there are too many failures
        if total_packets != 0 and failed_packets / total_packets > 0.3:
            raise ValueError("Frames did not have necessary fields")

        # Ensure results are sorted by timestamp
        beacon_frames.sort(key=lambda f: f.timestamp)
        all_frames.sort(key=lambda f: f.timestamp)

    except TSharkCrashException:
        pass
    finally:
        try:
            cap.close()
        except TSharkCrashException:
            pass
    return all_frames, beacon_frames, band
