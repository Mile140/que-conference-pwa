#!/usr/bin/env python3
"""
Import an Eventbrite attendee export (.xlsx or .csv) into the Supabase
`attendees` table.

Handles the mess real Eventbrite exports come with: duplicate rows per
attendee (one row per ticket line item on the same order), a placeholder
"Info Requested" row Eventbrite inserts when a purchaser bought on behalf of
someone who hasn't filled in their own details, and a trailing "TOTALS"
summary row.

Re-runnable: upserts by lowercased email. On conflict, only import-owned
fields are refreshed (name/company/imported_at) -- fields the attendee or
admin edits after import (job_title, job_function, focus_areas, photo_url,
bio, contact_opt_in, is_speaker, etc.) are never touched by this script.

`company` is a rough placeholder derived from the attendee's email domain
(Eventbrite doesn't collect a real company name) -- attendees can correct it
during profile setup, or the admin can bulk-edit later.

Usage:
    pip install -r scripts/requirements.txt
    cp scripts/.env.example scripts/.env   # fill in SUPABASE_SERVICE_ROLE_KEY
    python scripts/import_attendees.py path/to/export.xlsx
"""
import argparse
import csv
import os
import re
import sys

FREE_EMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com",
}

SKIP_NAME_MARKERS = {"info requested", "totals", ""}


def company_from_email(email: str) -> str | None:
    domain = email.split("@", 1)[1].lower() if "@" in email else None
    if not domain or domain in FREE_EMAIL_DOMAINS:
        return None
    return domain


def load_rows(path: str):
    """Yield raw dict rows keyed by a normalized header name, from either
    .xlsx or .csv. Eventbrite's exact column set/order varies by event, so
    matching is done by fuzzy header text rather than position."""
    if path.lower().endswith(".csv"):
        with open(path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                yield row
        return

    import openpyxl

    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    header = [str(h).strip() if h else "" for h in rows[0]]
    for r in rows[1:]:
        yield dict(zip(header, r))


def find_col(row: dict, *needles: str) -> str | None:
    for key in row:
        k = key.lower()
        if all(n in k for n in needles):
            val = row[key]
            return str(val).strip() if val is not None else None
    return None


def parse_attendees(path: str):
    seen_emails: dict[str, dict] = {}
    skipped = []

    for row in load_rows(path):
        email = find_col(row, "email")
        first = find_col(row, "first", "name") or ""
        last = find_col(row, "last", "name") or ""
        company_col = find_col(row, "compan")

        if not email or "@" not in email:
            skipped.append(("no valid email", row))
            continue
        name_check = f"{first} {last}".strip().lower()
        if name_check in SKIP_NAME_MARKERS:
            skipped.append(("placeholder row", row))
            continue

        email_norm = email.strip().lower()
        if email_norm in seen_emails:
            continue  # duplicate ticket line item for the same attendee

        company = company_col if (company_col and company_col != "#VALUE!") else None
        if not company:
            company = company_from_email(email_norm)

        seen_emails[email_norm] = {
            "email": email_norm,
            "name": f"{first} {last}".strip() or None,
            "company": company,
        }

    return list(seen_emails.values()), skipped


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("export_path", help="Path to the Eventbrite export (.xlsx or .csv)")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be upserted, don't write.")
    args = parser.parse_args()

    attendees, skipped = parse_attendees(args.export_path)

    print(f"Parsed {len(attendees)} unique attendees from {args.export_path}")
    for a in attendees[:10]:
        print(f"  {a['name'] or '(no name)':30s}  {a['email']:35s}  company={a['company']}")
    if len(attendees) > 10:
        print(f"  ... and {len(attendees) - 10} more")
    if skipped:
        print(f"\nSkipped {len(skipped)} row(s):")
        for reason, row in skipped:
            print(f"  [{reason}] {row}")

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
            "Copy scripts/.env.example to scripts/.env and fill them in.",
            file=sys.stderr,
        )
        sys.exit(1)

    import datetime

    client = create_client(url, key)
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    rows = [{**a, "imported_at": now_iso} for a in attendees]

    result = client.table("attendees").upsert(rows, on_conflict="email").execute()
    print(f"\nUpserted {len(result.data)} attendees.")


if __name__ == "__main__":
    main()
