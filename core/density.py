import pyshark
from pyshark.capture.capture import TSharkCrashException
from dataclasses import dataclass
from enum import Enum
import math


class DeviceType(Enum):
    CLIENT = 0
    ACCESS_POINT = 1


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
    protocol: str
    rssi: float
    timestamp: float


@dataclass
class DeviceInfo:
    """
    Represents info for a unique device found from the beacon frames

    Attributes:
        sa (str): Source MAC address of the access point (BSSID).
        total_frames (int): Total frames found for this device in an interval.
        total_rssi (float): Total rssi added in dBm.
        score (float): Contributing score of this device for an interval for the overall density metric.
    """

    sa: str
    total_frames: int
    total_rssi: float
    total_rssi_normalized: float
    score: float


@dataclass
class Bin:
    """
    Data aggregated over a single time interval (bin) in the trace.

    Attributes:
        devices (list[DeviceInfo]): List of unique devices observed in this interval.
        total_devices_in_interval (int): Number of distinct devices detected.
        total_frames_in_interval (int): Total frames captured in this interval.
        avg_rssi_in_interval (float): Average rssi across all frames in this interval.
        density_rating_in_interval (float): Computed network density score (0-1).
        start_time (int): Start timestamp (in seconds) of this interval relative to capture start.
        end_time (int): End timestamp (in seconds) of this interval relative to capture start.
    """

    devices: list[DeviceInfo]
    total_devices_in_interval: int
    total_frames_in_interval: int
    avg_rssi_in_interval: float
    density_rating_in_interval: float
    start_time: float
    end_time: float


@dataclass
class DensityAnalysis:
    """
    Summary of the network density analysis over the entire packet capture.

    Attributes:
        interval (int): Duration (in seconds) of each bin.
        bins (list[Bin]): List of bin-level statistics computed over time intervals.
        total_devices (int): Total number of unique source devices (APs) seen across the capture.
        total_frames (int): Total number of frames captured throughout the trace.
        avg_rssi (float): Time-weighted average rssi across all bins.
        density_rating (float): Time-weighted Overall density score (normalized 0–1) for all bins.
    """

    interval: int
    bins: list[Bin]
    total_devices: int
    total_frames: int
    avg_rssi: float
    density_rating: float


# For now we will calculate a density for the entire trace, but will break it up into smaller units of time
def network_density(path: str):

    # Extract all frames
    frames = extract(path=path)

    # Quit here if no frames were extracted
    if not frames:
        raise ValueError("No frames extracted")

    # Find the total lifespan of the trace, best time interval for each bin, and num of bins
    lifespan = frames[-1].timestamp
    interval_s = find_time_interval(lifespan_s=lifespan)
    num_bins = math.ceil(lifespan / interval_s)

    all_bins: list[Bin] = []
    found_devices = set()
    frame_idx = 0

    # Loop through the number of bins we have
    for b in range(num_bins):

        # Find the start and end time of the bin relative to capture start
        bin_start = b * interval_s
        bin_end = lifespan if b == num_bins - 1 else bin_start + interval_s

        devices: dict[str, DeviceInfo] = {}

        # Only go through frames that are in this time bin
        while frame_idx < len(frames) and frames[frame_idx].timestamp <= bin_end:
            frame = frames[frame_idx]
            frame_idx += 1

            # Initialize if first time seeing this BSSID
            if frame.sa not in devices:
                found_devices.add(frame.sa)
                devices[frame.sa] = DeviceInfo(
                    sa=frame.sa,
                    # type=frame.type,
                    total_frames=1,
                    total_rssi=frame.rssi,
                    total_rssi_normalized= get_normalized_rssi(frame.rssi),
                    score=0,
                )
            else:
                # Update existing entry
                info = devices[frame.sa]
                info.total_frames += 1
                info.total_rssi += frame.rssi
                info.total_rssi_normalized += get_normalized_rssi(frame.rssi)

        # Finished going through all devices for this bin, now calculate bin level values
        total_rssi: float = 0
        total_frames: int = 0
        total_score: float = 0

        if devices:
            # Calculate scores for each device and update global metrics
            for value in devices.values():
                value.score = value.total_rssi_normalized / value.total_frames
                total_score += value.score
                total_rssi += value.total_rssi
                total_frames += value.total_frames

            all_bins.append(
                Bin(
                    devices=list(devices.values()),
                    total_devices_in_interval=len(devices),
                    total_frames_in_interval=total_frames,
                    avg_rssi_in_interval=total_rssi / (total_frames),
                    density_rating_in_interval=getRating(total_score=total_score),
                    start_time=bin_start,
                    end_time=bin_end,
                )
            )
        else:
            all_bins.append(
                Bin(
                    devices=[],
                    total_devices_in_interval=0,
                    total_frames_in_interval=0,
                    avg_rssi_in_interval=0,
                    density_rating_in_interval=0,
                    start_time=bin_start,
                    end_time=bin_end,
                )
            )

    # Return a complete analysis based on all time intervals
    return DensityAnalysis(
        interval=interval_s,
        bins=all_bins,
        total_devices=len(found_devices),
        total_frames=len(frames),
        avg_rssi=sum(
            bin.avg_rssi_in_interval * (bin.end_time - bin.start_time) / lifespan
            for bin in all_bins
        ),
        density_rating=sum(
            bin.density_rating_in_interval * (bin.end_time - bin.start_time) / lifespan
            for bin in all_bins
        ),
    )


def get_normalized_rssi(rssi: float):

    # The lowest and highest dbm that we will count, that way strong signals won't saturate our score too much
    floor, ceiling = -85, -40

    return max(0, min(rssi - floor, ceiling - floor))



def find_time_interval(lifespan_s: float) -> int:
    """
    Returns the time interval in seconds
    """
    possible_intervals = [1, 2, 5, 10, 15, 20, 30]
    TARGET_BINS = 10

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


"""
Completely hypotetical upperbound for network density. Hypothetical 30ft x 30ft room with 5 access points and each giving an
average of -45 dBm signal strength per AP. So ceiling score would be 5*(-45-(-85)) = 200.
"""
max_score = 200


def getRating(total_score: float) -> float:
    if total_score <= 0:
        return 0.0
    return min(total_score / max_score, 1.0)


def extract(path: str) -> list[BeaconFrame]:
    # Load beacon frames and probe requests into memory
    cap = pyshark.FileCapture(
        path,
        keep_packets=False,
        use_json=True,
        display_filter="wlan.fc.type == 0 && (wlan.fc.type_subtype == 8)",
    )

    frames: list[BeaconFrame] = []

    first = True
    start_time: float

    # Extract relevant data
    try:
        for pkt in cap:
            if first:
                start_time = float(pkt.sniff_timestamp)
                first = False
            # Source Address, same as BSSID for APs
            sa = pkt.wlan.sa

            radio = pkt.wlan_radio

            # Wifi protocol
            protocol = radio.phy

            # Signal Strength
            rssi = float(radio.signal_dbm)

            timestamp = float(pkt.sniff_timestamp) - start_time

            frames.append(
                BeaconFrame(
                    sa=sa,
                    # type=(
                    #     DeviceType.ACCESS_POINT
                    #     if int(pkt.wlan.type_subtype, 16) == 8
                    #     else DeviceType.CLIENT
                    # ),
                    protocol=protocol,
                    rssi=rssi,
                    timestamp=timestamp,
                )
            )

        # Ensure results are sorted by timestamp
        frames.sort(key=lambda f: f.timestamp)

    except TSharkCrashException:
        pass
    finally:
        try:
            cap.close()
        except TSharkCrashException:
            pass

    return frames
