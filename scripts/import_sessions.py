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

    # Or with no argument at all: looks in the current working directory
    # (wherever you run the script from) for QueGroup_2026_agenda.xlsx.
    python scripts/import_sessions.py --seed-rooms

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
from zoneinfo import ZoneInfo

import openpyxl

DEFAULT_XLSX_NAME = "QueGroup_2026_agenda.xlsx"

# The conference runs in San Diego. `sessions.start`/`end` are `timestamptz`
# columns, and the frontend formats them for display in this timezone
# regardless of the viewer's own device timezone (see VENUE_TIMEZONE in
# src/lib/sessions.ts) -- so the instant we write here has to be correct in
# Pacific time, not a naive "looks right" string. A plain
# "2026-09-16T13:00:00" with no UTC offset gets interpreted by Postgres as
# UTC, silently shifting every session 7-8 hours early. Attaching this
# tzinfo before calling .isoformat() makes Python compute and include the
# correct offset (-07:00 for these September dates, DST-aware).
VENUE_TZ = ZoneInfo("America/Los_Angeles")


def to_venue_iso(date_str: str, time_str: str) -> str:
    naive = datetime.datetime.fromisoformat(f"{date_str}T{time_str}")
    return naive.replace(tzinfo=VENUE_TZ).isoformat()


def resolve_default_xlsx_path() -> str:
    """Look in the current working directory for QueGroup_2026_agenda.xlsx."""
    candidate = os.path.join(os.getcwd(), DEFAULT_XLSX_NAME)
    if os.path.isfile(candidate):
        return candidate
    print(
        f"No xlsx path given, and couldn't find {DEFAULT_XLSX_NAME} in the "
        f"current directory ({os.getcwd()}).\n"
        "Either place the file there, or pass a path explicitly:\n"
        "  python scripts/import_sessions.py path/to/agenda.xlsx",
        file=sys.stderr,
    )
    sys.exit(1)

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
# Empty for the 2026 workbook -- START/END are real Excel time cells this
# year (datetime.time, already unambiguous), not the mixed 12h/24h
# text/number entry the 2025 sheet used. Add entries here again if a future
# revision reintroduces ambiguous time cells.
MANUAL_TIME_OVERRIDES = {}

# Split one workbook row into multiple session rows in different rooms
# (e.g. concurrent round tables). Keyed by source_row_key (computed with the
# *resolved* start time). Only applied when --seed-rooms is passed.
# Empty for the 2026 workbook -- concurrent sessions (round tables, breakouts)
# are already listed as separate rows this year, each with its own LOCATION,
# rather than one row covering multiple rooms. Add entries here again if a
# future revision goes back to combining them into a single row.
ROOM_SPLIT_OVERRIDES = {}

TYPE_KEYWORDS = [
    (r"\bbreak(?:fast)?\b|\blunch\b", "meal_break"),
    (r"\bpanel\b", "panel"),
    (r"round table|work.?thru|working session|workshop", "hands_on_lab"),
    (r"take.?off|board introductions|kick.?off", "keynote"),
    (r"\bsocial\b|cocktail|reception|happy hour|networking", "social_event"),
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


def split_location(location):
    """The 2026 sheet's LOCATION column is sometimes a plain venue name
    ("CC HQ", "Starlight Outdoor Terrace") and sometimes "Category: Room"
    ("General Session: Gaslamp", "Breakout: Santa Rosa") -- split the latter
    into (track, room) so Schedule's track/room filters actually have
    something to filter on. A handful of rows list multiple locations
    stacked with blank lines (one workshop using several rooms at once);
    those are joined into a single room string rather than split, since it's
    one session in all of them, not a choice between rooms."""
    if not location or not isinstance(location, str):
        return None, None
    text = location.strip()
    if not text:
        return None, None
    if "\n" in text:
        parts = [p.strip() for p in text.split("\n") if p.strip()]
        return None, "; ".join(parts)
    if ": " in text:
        track, room = text.split(": ", 1)
        return track.strip(), room.strip()
    return None, text


def parse_workbook(path: str):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["Sheet1"]

    raw_rows = []
    for day, start, end, topic, desc, presenter, location, note in ws.iter_rows(
        min_row=2, values_only=True
    ):
        if day in HEADER_ROW_MARKERS or topic is None:
            continue
        key = str(day).strip().lower() if day else ""
        if key not in DAY_TO_DATE:
            continue
        description = (desc or "").strip() if isinstance(desc, str) else desc
        note_text = (note or "").strip() if isinstance(note, str) else note
        if note_text:
            description = f"{description}\n\n{note_text}" if description else note_text
        track, room = split_location(location)
        raw_rows.append(
            {
                "day_key": key,
                "date": DAY_TO_DATE[key],
                "start_raw": start,
                "end_raw": end,
                "topic": str(topic).strip(),
                "description": description,
                "presenter": (presenter or "").strip() if isinstance(presenter, str) else presenter,
                "track": track,
                "room": room,
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
        presenter = row["presenter"].replace("\n", ", ") if row["presenter"] else None
        base = {
            "title": row["topic"],
            "day": row["date"],
            "start": to_venue_iso(row["date"], row["start"]),
            "end": to_venue_iso(row["date"], row["end"]),
            "type": classify_type(row["topic"]),
            "description": row["description"] or None,
            "presenter_text": presenter,
            "track": row["track"],
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
                entry["room"] = row["room"]
            out.append(entry)
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "xlsx_path",
        nargs="?",
        default=None,
        help=(
            "Path to the agenda .xlsx file. If omitted, looks for "
            f"{DEFAULT_XLSX_NAME} in the current directory."
        ),
    )
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

    xlsx_path = args.xlsx_path or resolve_default_xlsx_path()
    parsed = parse_workbook(xlsx_path)
    rows = build_session_rows(parsed, seed_rooms=args.seed_rooms)

    print(f"Parsed {len(rows)} session rows from {xlsx_path}")
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
