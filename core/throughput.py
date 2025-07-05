import pyshark
from pyshark.capture.capture import TSharkCrashException
from dataclasses import dataclass
from collections import deque
from statistics import mean


@dataclass
class DownlinkFrame:
    rssi: float
    data_rate: float
    retry: int
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
class ThroughputAnalysis:
    source_ap: str
    dest_host: str
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

    throughput = compute_downlink_throughput(frames=frames)
    throughput.source_ap=ap_mac
    throughput.dest_host=host_mac
    return throughput


def compute_downlink_throughput(
    frames: list[DownlinkFrame], window_size: int = 50
) -> ThroughputAnalysis:

    buf: deque[DownlinkFrame] = deque(maxlen=window_size)
    points: list[SlidingWindowPoint] = []

    for f in frames:
        buf.append(f)
        # wait until buffer is full
        if len(buf) < window_size:
            continue

        # compute the sliding‐window stats
        rel_ts = f.timestamp
        avg_rssi = mean(frame.rssi for frame in buf)
        avg_data_rate = mean(frame.data_rate for frame in buf)
        retry_rate = sum(frame.retry for frame in buf) / window_size
        tp = avg_data_rate * (1 - retry_rate)

        points.append(
            SlidingWindowPoint(
                timestamp=rel_ts,
                rssi=avg_rssi,
                data_rate=avg_data_rate,
                retry_rate=retry_rate,
                throughput=tp,
            )
        )

    # overall averages (over entire trace / full windows)
    avg_rssi_all = mean(f.rssi for f in frames)
    avg_retry_all = sum(f.retry for f in frames) / len(frames)
    avg_tp_all = mean(p.throughput for p in points) if points else 0.0

    return ThroughputAnalysis(
        source_ap="",
        dest_host="",
        avg_rssi=avg_rssi_all,
        avg_retry=avg_retry_all,
        avg_througput=avg_tp_all,
        points=points,
    )


def extract(path: str, ap_mac: str, host_mac: str) -> list[DownlinkFrame]:
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
            retry = int(pkt.wlan.fc_tree.flags_tree.retry)

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
