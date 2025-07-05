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

    result = analyze_throughput(
        path="test_pcap/throughput-test.pcap",
        ap_mac="2C:F8:9B:DD:06:A0",
        host_mac="00:20:A6:FC:B0:36",
    )

    pprint.pprint(result, width=80)

    # Suppress any TShark stderr noise
    devnull = open(os.devnull, "w")
    sys.stderr = devnull
