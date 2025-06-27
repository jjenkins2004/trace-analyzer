import sys, json
from analyze import analyze
from dataclasses import asdict
from enum import Enum
import traceback


def _json_default(o):
    # handle Enums
    if isinstance(o, Enum):
        return o.value
    return str(o)

def main():
    for line in sys.stdin:
        try:
            data = json.loads(line)
            result = analyze(path=data)
            out = asdict(result)
        except Exception:
            # Catch all errors, and create our custom response for it
            out = { "error": str(traceback.format_exc()) }
        # write result as a single JSON line
        sys.stdout.write(json.dumps(out, default=_json_default) + "\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()
