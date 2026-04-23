"""
get_logs.py - Print the last N lines of the local scraper log file.
Usage: python get_logs.py [lines]
"""
import sys
from pathlib import Path

LOG_FILE = Path(__file__).parent / "movie_scraper.log"
DEFAULT_LINES = 100

def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_LINES

    if not LOG_FILE.exists():
        print(f"[WARN] Log file not found: {LOG_FILE}")
        print("  -> Run the scraper at least once to generate it.")
        return

    lines = LOG_FILE.read_text(encoding='utf-8').splitlines()
    total = len(lines)

    if total == 0:
        print("[INFO] Log file is empty - no scraping sessions recorded yet.")
        return

    recent = lines[-n:]
    print(f"--- Showing last {len(recent)} of {total} log lines [{LOG_FILE}] ---\n")
    for line in recent:
        print(line)

if __name__ == "__main__":
    main()
