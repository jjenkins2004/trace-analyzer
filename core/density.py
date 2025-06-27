import pyshark
from pyshark.capture.capture import TSharkCrashException
from dataclasses import dataclass
from enum import Enum
import math


class NetworkDensity:
    total_beacon: int
    total_unique: int


class DeviceType(Enum):
    CLIENT = 0
    ACCESS_POINT = 1


@dataclass
class BeaconFrame:
    sa: str
    type: DeviceType
    protocol: str
    rssi: float
    snr: float
    timestamp: float


@dataclass
class DeviceInfo:
    sa: str
    type: DeviceType
    total_frames: int
    total_snr: float
    score: float


@dataclass
class Bin:
    devices: list[DeviceInfo]
    total_devices_in_interval: int
    total_frames_in_interval: int
    avg_snr_in_interval: float
    density_rating_in_interval: float
    start_time: int
    end_time: int


@dataclass
class DensityAnalysis:
    interval: int
    bins: list[Bin]
    total_devices: int
    total_frames: int
    avg_snr: float
    density_rating: float


# For now we will calculate a density for the entire trace, but will break it up into smaller units of time
def network_density(path: str):
    frames = extract(path=path)

    if not frames:
        raise ValueError("No frames extracted")
    
    start_time = float(frames[0].timestamp)
    for f in frames:
        f.rel_time = float(f.timestamp) - start_time

    frames.sort(key=lambda f: f.rel_time)

    lifespan = frames[-1].rel_time
    interval_s = find_time_interval(lifespan_s=lifespan)

    num_bins = math.ceil(lifespan / interval_s)

    all_bins: list[Bin] = []
    found_devices = set()
    frame_idx = 0

    for b in range(num_bins):
        bin_start = b * interval_s
        bin_end = lifespan if b == num_bins - 1 else bin_start + interval_s

        devices: dict[str, DeviceInfo] = {}

        while frame_idx < len(frames) and frames[frame_idx].rel_time <= bin_end:
            frame = frames[frame_idx]
            frame_idx += 1

            # Initialize if first time seeing this BSSID
            if frame.sa not in devices:
                found_devices.add(frame.sa)
                devices[frame.sa] = DeviceInfo(
                    sa=frame.sa,
                    type=frame.type,
                    total_frames=1,
                    total_snr=frame.snr,
                    score=0,
                )
            else:
                # Update existing entry
                info = devices[frame.sa]
                info.total_frames += 1
                info.total_snr += frame.snr

        total_snr: float = 0
        total_frames: int = 0
        total_score: float = 0

        if devices:
            for value in devices.values():
                value.score = value.total_snr / value.total_frames
                total_score += value.score
                total_snr += value.total_snr
                total_frames += value.total_frames

            all_bins.append(
                Bin(
                    devices=devices,
                    total_devices_in_interval=len(devices),
                    total_frames_in_interval=total_frames,
                    avg_snr_in_interval=total_snr / (total_frames),
                    density_rating_in_interval=getRating(total_score=total_score),
                    start_time=bin_start,
                    end_time=bin_end,
                )
            )
        else:
            all_bins.append(
                Bin(
                    devices={},
                    total_devices_in_interval=0,
                    total_frames_in_interval=0,
                    avg_snr_in_interval=0,
                    density_rating_in_interval=0,
                    start_time=bin_start,
                    end_time=bin_end,
                )
            )

    return DensityAnalysis(
        interval=interval_s,
        bins=all_bins,
        total_devices=len(found_devices),
        total_frames=len(frames),
        avg_snr=sum(
            bin.avg_snr_in_interval * (bin.end_time - bin.start_time) / lifespan
            for bin in all_bins
        ),
        density_rating=sum(
            bin.density_rating_in_interval * (bin.end_time - bin.start_time) / lifespan
            for bin in all_bins
        ),
    )


def find_time_interval(lifespan_s: float) -> int:
    """
    Returns the time interval in seconds
    """
    possible_intervals = [1, 2, 5, 10, 15, 20, 30]
    TARGET_BINS = 10

    best_interval = possible_intervals[0]
    best_diff = float("inf")

    for iv in possible_intervals:
        # how many bins we'd get
        num_bins = lifespan_s / iv
        # how far is that from our target?
        diff = abs(num_bins - TARGET_BINS)
        if diff < best_diff:
            best_diff = diff
            best_interval = iv

    return best_interval


max_score = 250


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

    # Extract relevant data
    count = 0
    try:
        for pkt in cap:
            try:
                # 1) Source Address, same as BSSID for APs
                sa = pkt.wlan.sa

                radio = pkt.wlan_radio

                # 3) Type/Subtype (e.g. “0x08” for beacon)
                protocol = radio.phy

                # 4) RSSI (dBm_AntSignal)
                rssi = float(radio.signal_dbm)

                # 5) Noise (dBm_AntNoise) → compute SNR
                noise = float(radio.noise_dbm)
                snr = rssi - noise

                timestamp = float(pkt.sniff_timestamp)

                frames.append(
                    BeaconFrame(
                        sa=sa,
                        type=(
                            DeviceType.ACCESS_POINT
                            if int(pkt.wlan.type_subtype, 16) == 8
                            else DeviceType.CLIENT
                        ),
                        protocol=protocol,
                        rssi=rssi,
                        snr=snr,
                        timestamp=timestamp,
                    )
                )
            except (AttributeError, ValueError) as e:
                print(e)
                return
    except TSharkCrashException:
        pass
    finally:
        try:
            cap.close()
        except TSharkCrashException:
            pass

    return frames
