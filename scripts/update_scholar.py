#!/usr/bin/env python3
"""Fetch citation metrics from a Google Scholar profile into data/scholar.json.

Stdlib only. If Scholar blocks the request (CAPTCHA / 429) or the page
cannot be parsed, the existing JSON is left untouched so the site keeps
showing the last good values.

Exit codes: 0 = updated or unchanged, 2 = fetch/parse failed (data kept).
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

USER_ID = os.environ.get("SCHOLAR_USER_ID", "Y3G14vWvNa8C")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "scholar.json")
URL = f"https://scholar.google.com/citations?user={USER_ID}&hl=en"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}


def log(msg):
    print(msg, flush=True)


def warn(msg):
    # Rendered as a yellow annotation in GitHub Actions
    print(f"::warning::{msg}" if os.environ.get("GITHUB_ACTIONS") else f"WARNING: {msg}", flush=True)


def fetch(retries=3):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(URL, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}"
        except Exception as e:  # network errors, timeouts
            last = str(e)
        log(f"attempt {i + 1}/{retries} failed: {last}")
        time.sleep(10 * (i + 1))
    raise RuntimeError(last)


def parse(html):
    if re.search(r"captcha|unusual traffic|gs_captcha", html, re.I):
        raise ValueError("blocked by Google Scholar (CAPTCHA page)")

    # Six cells: citations(all, since), h-index(all, since), i10-index(all, since)
    cells = [int(x) for x in re.findall(r'class="gsc_rsb_std">(\d+)<', html)]
    if len(cells) < 6:
        raise ValueError(f"metrics table not found ({len(cells)} cells)")

    since = re.search(r'class="gsc_rsb_sth">\s*Since (\d{4})', html)

    # Bar chart: year labels left->right; bars carry z-index where 1 = most recent year.
    # Years with zero citations have no bar, hence the z-index mapping.
    years = [int(y) for y in re.findall(r'class="gsc_g_t"[^>]*>(\d{4})<', html)]
    per_year = {y: 0 for y in years}
    for z, c in re.findall(
        r'class="gsc_g_a"[^>]*?z-index:(\d+)[^>]*><span class="gsc_g_al">(\d+)<', html
    ):
        idx = len(years) - int(z)
        if 0 <= idx < len(years):
            per_year[years[idx]] = int(c)

    name = re.search(r'id="gsc_prf_in"[^>]*>([^<]+)<', html)
    data = {
        "name": name.group(1).strip() if name else None,
        "profile": URL,
        "citations": cells[0],
        "citations_since": cells[1],
        "h_index": cells[2],
        "h_index_since": cells[3],
        "i10_index": cells[4],
        "i10_index_since": cells[5],
        "since_year": int(since.group(1)) if since else None,
        "per_year": [{"year": y, "citations": per_year[y]} for y in years],
    }
    if data["citations"] <= 0 or not data["per_year"]:
        raise ValueError("parsed data looks empty")
    return data


def load_old():
    try:
        with open(OUT, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return None


def main():
    old = load_old()
    try:
        data = parse(fetch())
    except Exception as e:
        warn(f"Scholar update skipped, keeping previous data: {e}")
        return 2

    # Guard against a bad parse silently wiping numbers: citations never shrink by >20%.
    if old and data["citations"] < old.get("citations", 0) * 0.8:
        warn(f"citations dropped {old['citations']} -> {data['citations']}; refusing to overwrite")
        return 2

    comparable = {k: v for k, v in (old or {}).items() if k != "updated"}
    if comparable == data:
        log(f"unchanged: {data['citations']} citations, h={data['h_index']}, i10={data['i10_index']}")
        return 0

    data["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    before = f"{old['citations']} -> " if old else ""
    log(f"updated: citations {before}{data['citations']}, h={data['h_index']}, i10={data['i10_index']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
