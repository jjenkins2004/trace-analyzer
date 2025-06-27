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
    timestamp: int


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

    start_ts = frames[0].timestamp
    end_ts = frames[-1].timestamp
    lifespan = end_ts - start_ts

    interval_s = find_time_interval(lifespan=lifespan)
    interval_us = interval_s * 1_000_000

    num_bins = math.ceil(lifespan / interval_us)

    all_bins: list[Bin] = []

    for b in range(num_bins):
        bin_start = start_ts + b * interval_us
        bin_end = bin_start + interval_us

        devices: dict[str:DeviceInfo] = {}

        for frame in frames:
            if frame.timestamp < bin_start:
                continue
            if frame.timestamp >= bin_end:
                break

            # Initialize if first time seeing this BSSID
            if frame.sa not in devices:
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
        for value in devices.values():
            value.score = value.total_snr / value.total_frames

        all_bins.append(
            Bin(
                devices=devices,
                total_devices_in_interval=len(devices),
                total_frames_in_interval= total_frames/len(devices),
                avg_snr_in_interval= total_snr / len(devices),
                density_rating_in_interval=getRating(),
                start_time=bin_start
            )
        )


def find_time_interval(lifespan: int) -> int:
    """
    Returns the time interval in seconds
    """
    possible_intervals = [1, 2, 5, 10, 15, 20, 30]
    total_seconds = lifespan / 1_000_000
    TARGET_BINS = 10

    best_interval = possible_intervals[0]
    best_diff = float("inf")

    for iv in possible_intervals:
        # how many bins we'd get
        num_bins = total_seconds / iv
        # how far is that from our target?
        diff = abs(num_bins - TARGET_BINS)
        if diff < best_diff:
            best_diff = diff
            best_interval = iv

    return best_interval


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

                timestamp = int(radio.timestamp)

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
