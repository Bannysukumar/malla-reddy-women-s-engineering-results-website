"""Fetch whole class results for section 23RH1A05 (rolls 01–60)."""
import json
import os
from scraper import DEFAULT_CLASS, fetch_class_results

BASE_DIR = os.path.dirname(__file__)

if __name__ == "__main__":
    cfg = DEFAULT_CLASS
    print(f"Fetching {cfg['prefix']}{cfg['start_roll']:02d} … {cfg['prefix']}{cfg['end_roll']:02d}")
    print(f"(from sample hall ticket {cfg['sample_ticket']})\n")

    result = fetch_class_results(
        cfg["prefix"],
        cfg["start_roll"],
        cfg["end_roll"],
        cfg["roll_digits"],
    )

    out_file = os.path.join(BASE_DIR, "data", "class_results.json")
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"Done: {result['successCount']} found, {result['failedCount']} failed")
    print(f"Class avg CGPA: {result['classAverageCgpa']}")
    print(f"Saved to {out_file}")
