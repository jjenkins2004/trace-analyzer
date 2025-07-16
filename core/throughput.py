import pyshark
from pyshark.capture.capture import TSharkCrashException
from dataclasses import dataclass
from collections import deque
from statistics import mean
import logging

from wifi import relative_data_rate_ratio, phy_info


@dataclass
class DownlinkFrame:
    """
    Data for a single downlink Wi-Fi frame.

    Attributes:
        rssi (float): Received Signal Strength Indicator in dBm.
        data_rate (float): PHY data rate in Mbps.
        payload_bits (float): number of actual payload bits after removing header stuff.
        retry (int): Retry flag (1 if this is a retransmission, else 0).
        protocol (int): Numeric PHY type code, refer to wifi.py.
        time_on_air_us (float): On-air transmission time in microseconds.
        ifs (float): inter frame spacing.
        relative_data_rate_ratio (float): Ratio of observed MCS to max achievable MCS (0-1).
        timestamp (float): Time (s) since capture start when this frame was observed.
    """

    rssi: float
    data_rate: float
    payload_bits: float
    retry: int
    protocol: int
    time_on_air_us: float
    relative_data_rate_ratio: float
    timestamp: float


@dataclass
class SlidingWindowPoint:
    """
    Aggregated Wi-Fi metrics computed over a sliding window of frames (50 frames).

    Attributes:
        timestamp (float): Timestamp (in seconds) of the current sliding window end.
        rssi (float): Average RSSI over the window.
        data_rate (float): Average data rate (Mbps) over the window.
        retry_rate (float): Ratio of retry frames in the window.
        throughput (float): Estimated throughput in Mbps (data rate * (1 - retry_rate)).
        rate_ratio (float): Average data rate efficiency.
        avg_time_on_air_us (float): Average frame duration in microseconds.
    """

    timestamp: float
    rssi: float
    data_rate: float
    retry_rate: float
    throughput: float
    rate_ratio: float
    avg_time_on_air_us: float


@dataclass
class ThroughputAnalysis:
    """
    Overall analysis of Wi-Fi throughput performance over a trace.

    Attributes:
        avg_rssi (float): Average received signal strength (dBm) across all downlink frames.
        avg_retry (float): Average retry rate across all frames (value between 0 and 1).
        avg_througput (float): Average throughput (Mbps) across all windows.
        total_frames (float): Total number of downlink frames processed.
        time_on_air_us (float): Total channel occupancy time (in microseconds) for all frames.
        avg_rate_ratio (float): Average ratio of observed data rate to theoretical max.
        found_phys (list[str]): List of unique PHY protocols encountered (e.g. ["802.11n", "802.11ac"]).
        points (list[SlidingWindowPoint]): Time series of computed stats per window.
    """

    avg_rssi: float
    avg_retry: float
    avg_througput: float
    total_frames: float
    time_on_air_us: float
    avg_rate_ratio: float
    found_phys: list[str]
    points: list[SlidingWindowPoint]


def wifi_throughput(path: str, ap_mac: str, host_mac: str):

    # Extract all downlink data frames from ap to host
    frames = extract(path=path, ap_mac=ap_mac, host_mac=host_mac)

    # Quit here if no frames were extracted
    if not frames:
        raise ValueError("No frames extracted")

    # Compute all of our metrics from the frames
    throughput = compute_downlink_throughput(frames=frames)
    return throughput


def compute_downlink_throughput(
    frames: list[DownlinkFrame], window_size: int = 50
) -> ThroughputAnalysis:

    # Use a buffer to keep track of which frames we should analyze for the window
    buf: deque[DownlinkFrame] = deque(maxlen=window_size)
    points: list[SlidingWindowPoint] = []

    for f in frames:
        buf.append(f)
        # Wait until buffer is full
        if len(buf) < window_size:
            continue

        # Compute the sliding‐window stats
        rel_ts = f.timestamp
        avg_rssi = mean(frame.rssi for frame in buf if frame.rssi != 0)
        avg_data_rate = mean(frame.data_rate for frame in buf)
        avg_time = mean(frame.time_on_air_us for frame in buf)
        rate_ratio = mean(frame.relative_data_rate_ratio for frame in buf)
        num_retries = sum(frame.retry for frame in buf)
        retry_rate =  num_retries / window_size

        # Calculate tries per success
        total = num_retries * 2 + window_size - num_retries
        correction_factor = window_size / total

        # Calculate tp
        extra_frame_time = 69 # SIFS + ACK
        real_avg_data_rate = sum(frame.payload_bits for frame in frames) / sum(frame.time_on_air_us + extra_frame_time for frame in frames)
        tp = real_avg_data_rate * correction_factor

        # Save new sliding window point
        points.append(
            SlidingWindowPoint(
                timestamp=rel_ts,
                rssi=avg_rssi,
                data_rate=avg_data_rate,
                retry_rate=retry_rate,
                throughput=tp,
                rate_ratio=rate_ratio,
                avg_time_on_air_us=avg_time,
            )
        )

    # Overall averages (over entire trace / windows)
    avg_rssi_all = mean(f.rssi for f in frames if f.rssi != 0)
    avg_retry_all = sum(f.retry for f in frames) / len(frames)
    avg_tp_all = mean(p.throughput for p in points)
    rate_ratio = mean(p.rate_ratio for p in points)

    # All found Wifi standards used
    found_phys = []
    for f in frames:
        name = phy_info[f.protocol]["name"]
        if f.protocol != 0 and name not in found_phys:
            found_phys.append(name)

    # Fix holes in our data
    points = fill_zero_rssis(points=points)

    # Final Analysis object
    return ThroughputAnalysis(
        avg_rssi=avg_rssi_all,
        avg_retry=avg_retry_all,
        avg_througput=avg_tp_all,
        total_frames=len(frames),
        time_on_air_us=sum(frame.time_on_air_us for frame in frames),
        avg_rate_ratio=rate_ratio,
        found_phys=found_phys,
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
    failed_packets = 0
    total_packets = 0
    try:
        for pkt in cap:
            failed = False

            if total_packets % 10_000 == 0:
                logging.info(f"Total parsed: {total_packets}")

            if first:
                try:
                    start_time = float(pkt.sniff_timestamp)
                except (AttributeError, ValueError):
                    start_time = 0.0
                first = False

            radio = getattr(pkt, "wlan_radio", None)

            # Wifi protocol
            try:
                protocol = int(radio.phy)
            except (AttributeError, ValueError, TypeError):
                protocol = 0

            # RSSI
            try:
                rssi = float(radio.signal_dbm)
            except (AttributeError, ValueError, TypeError):
                failed = True

            # Data rate
            try:
                data_rate = float(radio.data_rate)
            except (AttributeError, ValueError, TypeError):
                failed = True

            # Retry flag
            try:
                retry = int(pkt.wlan.fc_tree.flags_tree.retry)
            except (AttributeError, ValueError, TypeError):
                retry = 0

            # Packet duration
            try:
                time_on_air_us = float(radio.duration)
            except (AttributeError, ValueError, TypeError):
                time_on_air_us = 0.0
            
            # Number of payload bits
            try:
                payload_bits = float(pkt.data.len) * 8
            except (AttributeError, ValueError, TypeError):
                failed = True

            # data rate potential ratio
            try:
                ratio = relative_data_rate_ratio(pkt)
            except Exception:
                ratio = 0.0

            # Timestamp relative to first packet
            try:
                timestamp = float(pkt.sniff_timestamp) - start_time
            except (AttributeError, ValueError, TypeError):
                timestamp = 0.0

            total_packets +=1
            if not failed:
                frames.append(
                    DownlinkFrame(
                        rssi=rssi,
                        data_rate=data_rate,
                        payload_bits=payload_bits,
                        retry=retry,
                        protocol=protocol,
                        time_on_air_us=time_on_air_us,
                        relative_data_rate_ratio=ratio,
                        timestamp=timestamp,
                    )
                )
            else:
                failed_packets += 1
        
        # Don't process this file if there are too many failures
        if total_packets != 0 and failed_packets / total_packets > 0.3:
            raise ValueError("Frames did not have necessary fields")

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


def fill_zero_rssis(points: list[SlidingWindowPoint]) -> list[SlidingWindowPoint]:
    corrected = []
    n = len(points)

    for i, pt in enumerate(points):
        if pt.rssi != 0:
            corrected.append(pt)
            continue

        left, right = i - 1, i + 1
        replacement = None

        while left >= 0 or right < n:
            if left >= 0 and points[left].rssi != 0:
                replacement = points[left].rssi
                break
            if right < n and points[right].rssi != 0:
                replacement = points[right].rssi
                break
            left -= 1
            right += 1

        if replacement is not None:
            pt.rssi = replacement
        corrected.append(pt)

    return corrected
