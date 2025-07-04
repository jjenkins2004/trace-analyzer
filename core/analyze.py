import time
import os
import sys
from dataclasses import dataclass


from density import network_density, DensityAnalysis
from throughput import wifi_throughput


@dataclass
class Analysis:
    density: DensityAnalysis
    #throughput: any


def analyze(path: str) -> dict[str, any]:

    density = network_density(path=path)

    # throughput = wifi_throughput(path=path, ap_mac=ap_mac, host_mac=host_mac)

    return Analysis(density= density)


if __name__ == "__main__":
    import pprint

    result = analyze(path="test_pcap/throughput-test.pcap", ap_mac="2C:F8:9B:DD:06:A0", host_mac="00:20:A6:FC:B0:36")

    pprint.pprint(result, width=80)

    # Suppress any TShark stderr noise
    devnull = open(os.devnull, "w")
    sys.stderr = devnull
