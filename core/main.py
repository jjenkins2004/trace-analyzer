import sys, json
from analyze import analyze_density, analyze_throughput, process
from dataclasses import asdict
from enum import Enum
import traceback
import os
import logging
from pathlib import Path

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

def _json_default(o):
    # handle Enums
    if isinstance(o, Enum):
        return o.value
    return str(o)


def main():
    for line in sys.stdin:
        try:
            data = json.loads(line)
            if process(data["process"]) == process.THROUGHPUT:
                result = analyze_throughput(
                    path=data["path"], ap=data["ap"], host=data["host"]
                )
            else:
                result = analyze_density(path=data["path"])
            out = asdict(result)
        except ValueError:
            out = {"error": str(traceback.format_exc), "code": "NO_FRAMES"}
        except Exception:
            # Catch all errors, and create our custom response for it
            out = {"error": str(traceback.format_exc())}
        # write result as a single JSON line
        print(json.dumps(out, default=_json_default) + "\n", flush=True)

        # Suppress any TShark stderr noise
        devnull = open(os.devnull, "w")
        sys.stderr = devnull


if __name__ == "__main__":
    main()
