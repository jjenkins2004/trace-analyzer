import time
import os
import sys
from dataclasses import dataclass
from enum import Enum


from density import network_density, DensityAnalysis
from throughput import wifi_throughput, ThroughputAnalysis


class process(Enum):
    THROUGHPUT = "THROUGHPUT"
    DENSITY = "DENSITY"


@dataclass
class Analysis:
    type: process
    data: DensityAnalysis | ThroughputAnalysis


def analyze_density(path: str) -> dict[str, any]:

    density = network_density(path=path)

    return Analysis(type=process.DENSITY, data=density)


def analyze_throughput(path: str, ap: str, host: str):

    throughput = wifi_throughput(path=path, ap_mac=ap, host_mac=host)

    return Analysis(type=process.THROUGHPUT, data=throughput)


if __name__ == "__main__":
    import pprint
    from pathlib import Path
    import logging

    # Determine directory of this Python file
    BASE_DIR = Path(__file__).resolve().parent

    # Build the log file path in the same directory
    log_path = BASE_DIR / 'app.log'

    # Configure logging to write to that file
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(message)s',
        handlers=[
            logging.FileHandler(str(log_path), mode='w'),
        ]
    )

    # result = analyze_throughput(
    #     path="test_pcap/large-aggregate.pcap",
    #     ap="e8:1b:69:29:de:c0",
    #     host="28:02:2e:28:87:4f",
    # )

    result = analyze_density(path="test_pcap/very-dense.pcap")

    pprint.pprint(result, width=80)

    # Suppress any TShark stderr noise
    devnull = open(os.devnull, "w")
    sys.stderr = devnull
