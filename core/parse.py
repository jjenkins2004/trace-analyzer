import sys, json
from analyze import analyze

def main():
    for line in sys.stdin:
        try:
            data = json.loads(line)
            # do something with data…
            result = analyze(data)
        except Exception as e:
            result = { "error": str(e) }
        # write result as a single JSON line
        sys.stdout.write(json.dumps(result) + "\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()
