import time
import os
import sys

from density import network_density


def analyze(path: str) -> dict[str, any]:

    # Start timer
    start = time.time()
    # cap.load_packets()

    scores = network_density(path=path)

    # Stop timer
    elapsed = time.time() - start

    print(elapsed)
    return scores


if __name__ == "__main__":
    import pprint

    result = analyze(path="test_pcap/newnewtest.pcap")

    sorted_items = sorted(
        result.items(),
        key=lambda kv: kv[1].score,
        reverse=True,
    )

    pprint.pprint(sorted_items, width=80)

    # Suppress any TShark stderr noise
    devnull = open(os.devnull, "w")
    sys.stderr = devnull
