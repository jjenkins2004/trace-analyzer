import pyshark
from pyshark.capture.capture import TSharkCrashException
from dataclasses import dataclass
from enum import Enum


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
    total_snr_linear: float
    score: float


# For now we will calculate a density for the entire trace, but will break it up into smaller units of time
def network_density(path: str):
    frames = extract(path=path)
    devices: dict[str:DeviceInfo] = {}

    for frame in frames:
        # Initialize if first time seeing this BSSID
        if frame.sa not in devices:
            devices[frame.sa] = DeviceInfo(
                sa=frame.sa,
                type=frame.type,
                total_frames=1,
                total_snr_linear=db_to_linear(frame.snr),
                score=0,
            )
        else:
            # Update existing entry
            info = devices[frame.sa]
            info.total_frames += 1
            info.total_snr_linear += db_to_linear(frame.snr)

    for value in devices.values():
        value.score = value.total_snr_linear / value.total_frames

    return devices


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


def db_to_linear(db_val: float) -> float:
    """Convert dB value (e.g. SNR in dB) to a linear scale."""
    return 10 ** (db_val / 10)
