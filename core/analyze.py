import pyshark
from collections import Counter


def analyze(path: str) -> dict[str, any]:
    """
    Analyze the given pcap file and return a summary dict.
    """
    # Open the capture (lazy, no decoding until used)
    cap = pyshark.FileCapture(path, keep_packets=False)

    total_packets = 0
    proto_counter = Counter()
    src_counter = Counter()

    for pkt in cap:
        if total_packets > 1000:
            break
        
        total_packets += 1

        # Protocol layer names (e.g. 'IP', 'TCP', 'HTTP')
        for layer in pkt.layers:
            proto_counter[layer.layer_name.upper()] += 1

        # Source IP (if present)
        if "IP" in pkt:
            src = pkt.ip.src
            src_counter[src] += 1

    cap.close()

    # Build the summary
    summary = {
        "total_packets": total_packets,
        "protocol_counts": dict(proto_counter.most_common()),
        "top_source_ips": src_counter.most_common(5),
    }

    return summary
