import pyshark
from pyshark.capture.capture import TSharkCrashException
from dataclasses import dataclass


@dataclass
class DownlinkFrame:
    rssi: float
    data_rate: float
    retry: bool
    protocol: str
    timestamp: float

@dataclass
class SlidingWindowPoint:
    timestamp: float
    rssi: float
    data_rate: float
    retry_rate: float
    throughput: float

@dataclass
class DownlinkThroughput:
    avg_rssi: float
    avg_retry: float
    avg_througput: float
    points: list[SlidingWindowPoint]



def wifi_throughput(path: str, ap_mac: str, host_mac: str):

    # Extract all downlink data frames from ap to host
    frames = extract(path=path, ap_mac=ap_mac, host_mac=host_mac)

    # Quit here if no frames were extracted
    if not frames:
        raise ValueError("No frames extracted")
    
    return frames

    pass


def extract(path: str, ap_mac: str, host_mac: str):
    # Load data frames and probe requests into memory
    cap = pyshark.FileCapture(
        path,
        keep_packets=False,
        use_json=True,
        display_filter=f"wlan.fc.type == 2 && wlan.sa == {ap_mac} && wlan.da == {host_mac}",
    )

    frames: list[DownlinkFrame] = []

    first = True
    start_time: float

    # Extract relevant data
    try:
        for pkt in cap:
            if first:
                start_time = float(pkt.sniff_timestamp)
                first = False
            
            radio = pkt.wlan_radio

            # Wifi protocol
            protocol = radio.phy

            # RSSI
            rssi = float(radio.signal_dbm)

            # Data rate
            data_rate = float(radio.data_rate)

            # Retry flag
            retry = pkt.wlan.fc_tree.flags_tree.retry

            timestamp = float(pkt.sniff_timestamp) - start_time

            frames.append(
                DownlinkFrame(
                    rssi=rssi,
                    data_rate=data_rate,
                    retry=retry,
                    protocol=protocol,
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
