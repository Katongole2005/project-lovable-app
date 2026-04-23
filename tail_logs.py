"""
tail_logs.py - Live tail the scraper log file (like `tail -f`).
Press Ctrl+C to stop.
Usage: python tail_logs.py
"""
import time
from pathlib import Path

LOG_FILE = Path(__file__).parent / "movie_scraper.log"

def tail_f(path: Path):
    if not path.exists():
        print(f"[WARN] Log file not found: {path}")
        print("  -> Run the scraper to generate it. Waiting...")

    # Wait until the file exists
    while not path.exists():
        time.sleep(1)

    print(f"--- Tailing {path} --- (Press Ctrl+C to stop)\n")
    with open(path, 'r', encoding='utf-8') as f:
        # Seek to end of file before tailing
        f.seek(0, 2)
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.3)  # Wait for new lines
                continue
            print(line, end='', flush=True)

if __name__ == "__main__":
    try:
        tail_f(LOG_FILE)
    except KeyboardInterrupt:
        print("\n[INFO] Stopped tailing log.")
