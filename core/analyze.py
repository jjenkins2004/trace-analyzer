import time
import os
import sys
from dataclasses import dataclass


from density import network_density, DensityAnalysis


@dataclass
class Analysis:
    density: DensityAnalysis


def analyze(path: str) -> dict[str, any]:

    density = network_density(path=path)

    return Analysis(density=density)


if __name__ == "__main__":
    import pprint

    result = analyze(path="test_pcap/dense-sparse-dense.pcap")

    pprint.pprint(result, width=80)

    # Suppress any TShark stderr noise
    devnull = open(os.devnull, "w")
    sys.stderr = devnull
