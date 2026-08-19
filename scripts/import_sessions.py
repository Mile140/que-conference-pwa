#!/usr/bin/env python3
"""
Import the board's agenda workbook (.xlsx) into the Supabase `sessions` table.

Re-runnable: matches existing rows by a stable `source_row_key` (derived from
day + start time + topic) and upserts. On conflict, `room` and `lab_notes`
are deliberately NOT overwritten -- once you've hand-edited a session's room
in Supabase, re-running this script (because the board updated the workbook)
will refresh title/time/type/description/presenter but leave your room
assignment alone. Pass --seed-rooms on the very first run only, to apply the
initial room overrides below (e.g. splitting a "happening in tandem" row into
two rooms).

Usage:
    pip install -r scripts/requirements.txt
    cp scripts/.env.example scripts/.env   # fill in SUPABASE_SERVICE_ROLE_KEY
    python scripts/import_sessions.py path/to/agenda.xlsx --seed-rooms

The service role key is required (not the anon key) because `sessions`
writes are admin-only under RLS, and this script runs outside any attendee/
admin login session. NEVER commit scripts/.env or expose this key to the
frontend -- it bypasses Row Level Security entirely.
"""
import argparse
import datetime
import os
import re
import sys

import openpyxl

# ---------------------------------------------------------------------------
# Config that's specific to *this* workbook's quirks. Update these as the
# board's file changes shape year to year.
# ---------------------------------------------------------------------------

DAY_TO_DATE = {
    "tuesday": "2026-09-15",
    "wednesday": "2026-09-16",
    "thursday": "2026-09-17",
    "friday": "2026-09-18",
}

HEADER_ROW_MARKERS = {"DAY 1", "DAY 2", "DAY 3"}

# Rows where AM/PM can't be inferred from context (e.g. the very first
# session of a day, so there's no prior end-time to infer "forward
# progress" from). Keyed by source_row_key computed with the *literal*
# (unresolved) start time, mapped to the correct (start, end) in 24h HH:MM.
MANUAL_TIME_OVERRIDES = {
    "2026-09-15-0100-cc-headquarters-welcome": ("13:00", "17:00"),
}

# Split one workbook row into multiple session rows in different rooms
# (e.g. concurrent round tables). Keyed by source_row_key (computed with the
# *resolved* start time). Only applied when --seed-rooms is passed.
ROOM_SPLIT_OVERRIDES = {
    "2026-09-16-1500-round-tables-2": ["Main Conf Room", "Breakout Room"],
}

TYPE_KEYWORDS = [
    (r"\bbreak\b|\blunch\b", "meal_break"),
    (r"\bpanel\b", "panel"),
    (r"round table|work thru|working session", "hands_on_lab"),
    (r"take off|board introductions|kick ?off", "keynote"),
]
DEFAULT_TYPE = "general_session"


def slugify(text: str, max_len: int = 40) -> str:
    text = (text or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")[:max_len]


def classify_type(topic: str) -> str:
    t = (topic or "").lower()
    for pattern, session_type in TYPE_KEYWORDS:
        if re.search(pattern, t):
            return session_type
    return DEFAULT_TYPE


def to_time_candidates(val):
    """Return list of (hour, minute) interpretations for a raw cell value.
    Bare hours 1-7 get both an AM and a PM candidate, since the source sheet
    mixes 12h/24h entry with no consistent AM/PM marker."""
    if val is None:
        return []
    if isinstance(val, datetime.time):
        h, m = val.hour, val.minute
        cands = [(h, m)]
        if 1 <= h <= 7:
            cands.append((h + 12, m))
        return cands
    if isinstance(val, (int, float)):
        h = int(val)
        m = int(round((val - h) * 60))
        cands = [(h, m)]
        if 1 <= h <= 7:
            cands.append((h + 12, m))
        return cands
    if isinstance(val, str):
        s = val.strip().lower().replace(" ", "")
        ampm = None
        if s.endswith("am"):
            ampm, s = "am", s[:-2]
        elif s.endswith("pm"):
            ampm, s = "pm", s[:-2]
        if ":" in s:
            hh, mm = s.split(":")
            h, m = int(hh), int(mm)
        else:
            h, m = int(s), 0
        if ampm == "pm" and h != 12:
            h += 12
        if ampm == "am" and h == 12:
            h = 0
        return [(h, m)]
    return []


def pick_candidate(cands, floor_minutes):
    valid = [c for c in cands if c[0] * 60 + c[1] >= floor_minutes]
    return min(valid) if valid else min(cands)


def parse_workbook(path: str):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["Sheet1"]

    raw_rows = []
    for day, start, end, topic, desc, presenter, location in ws.iter_rows(
        min_row=2, values_only=True
    ):
        if day in HEADER_ROW_MARKERS or topic is None:
            continue
        key = str(day).strip().lower() if day else ""
        if key not in DAY_TO_DATE:
            continue
        raw_rows.append(
            {
                "day_key": key,
                "date": DAY_TO_DATE[key],
                "start_raw": start,
                "end_raw": end,
                "topic": str(topic).strip(),
                "description": (desc or "").strip() if isinstance(desc, str) else desc,
                "presenter": (presenter or "").strip() if isinstance(presenter, str) else presenter,
                "location": location,
            }
        )

    # Resolve AM/PM per day using a "time only moves forward" heuristic,
    # with manual overrides for rows that heuristic can't disambiguate
    # (typically the first session of the day).
    by_day = {}
    for row in raw_rows:
        by_day.setdefault(row["day_key"], []).append(row)

    resolved = []
    for day_key, rows in by_day.items():
        prev_end = 0
        for row in rows:
            literal_start_key = f"{row['date']}-{{}}-{slugify(row['topic'])}"
            # compute literal (first-candidate) key for override lookup
            lit_cands = to_time_candidates(row["start_raw"])
            lit_h, lit_m = lit_cands[0] if lit_cands else (0, 0)
            literal_key = literal_start_key.format(f"{lit_h:02d}{lit_m:02d}")

            if literal_key in MANUAL_TIME_OVERRIDES:
                start_str, end_str = MANUAL_TIME_OVERRIDES[literal_key]
                sh, sm = map(int, start_str.split(":"))
                eh, em = map(int, end_str.split(":"))
            else:
                sh, sm = pick_candidate(to_time_candidates(row["start_raw"]), prev_end)
                eh, em = pick_candidate(
                    to_time_candidates(row["end_raw"]), sh * 60 + sm
                )

            source_row_key = f"{row['date']}-{sh:02d}{sm:02d}-{slugify(row['topic'])}"
            resolved.append(
                {
                    **row,
                    "start": f"{sh:02d}:{sm:02d}:00",
                    "end": f"{eh:02d}:{em:02d}:00",
                    "source_row_key": source_row_key,
                }
            )
            prev_end = eh * 60 + em

    return resolved


def build_session_rows(parsed, seed_rooms: bool):
    out = []
    for row in parsed:
        base = {
            "title": row["topic"],
            "day": row["date"],
            "start": f"{row['date']}T{row['start']}",
            "end": f"{row['date']}T{row['end']}",
            "type": classify_type(row["topic"]),
            "description": row["description"] or None,
            "presenter_text": row["presenter"] or None,
        }

        if seed_rooms and row["source_row_key"] in ROOM_SPLIT_OVERRIDES:
            for room in ROOM_SPLIT_OVERRIDES[row["source_row_key"]]:
                out.append(
                    {
                        **base,
                        "source_row_key": f"{row['source_row_key']}-{slugify(room)}",
                        "room": room,
                    }
                )
        else:
            entry = {**base, "source_row_key": row["source_row_key"]}
            if seed_rooms:
                entry["room"] = row["location"] or None
            out.append(entry)
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xlsx_path", help="Path to the agenda .xlsx file")
    parser.add_argument(
        "--seed-rooms",
        action="store_true",
        help="Also set room (incl. splitting tandem sessions per ROOM_SPLIT_OVERRIDES). "
        "Use on first import only -- future runs should leave admin-edited rooms alone.",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Print what would be upserted, don't write."
    )
    args = parser.parse_args()

    parsed = parse_workbook(args.xlsx_path)
    rows = build_session_rows(parsed, seed_rooms=args.seed_rooms)

    print(f"Parsed {len(rows)} session rows from {args.xlsx_path}")
    for r in rows:
        print(f"  {r['day']} {r['start'][11:16]}-{r['end'][11:16]}  [{r['type']:14s}]  {r['title'][:50]}"
              + (f"  room={r['room']!r}" if "room" in r else ""))

    if args.dry_run:
        print("\n--dry-run: not writing to Supabase.")
        return

    from dotenv import load_dotenv
    from supabase import create_client

    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print(
            "\nMissing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.\n"
            "Copy scripts/.env.example to scripts/.env and fill them in "
            "(service role key is in Supabase dashboard -> Project Settings -> API).",
            file=sys.stderr,
        )
        sys.exit(1)

    client = create_client(url, key)
    result = client.table("sessions").upsert(rows, on_conflict="source_row_key").execute()
    print(f"\nUpserted {len(result.data)} sessions.")


if __name__ == "__main__":
    main()
