#!/usr/bin/env python3
"""Turn an SMS Backup & Restore export into verified stats and candidate quotes.

Three filters matter, and getting any of them wrong corrupts every number:
  1. Tapback reactions ("<heart> to <quote>") are not written messages.
  2. Every message is stored twice, once as <sms> and once as <mms>.
  3. MMS carry an application/smil layout part whose text is XML, not prose.

Also: when streaming with iterparse, clearing every element on its end event
wipes <parts> children before <mms> closes. Clear only on sms/mms.
"""

import argparse
import collections
import datetime as dt
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

Message = collections.namedtuple("Message", "ts direction body")

TAPBACK = re.compile(
    r"^\s*(?:[\u200b\u2063\ufe0f\u2764\U0001F300-\U0001FAFF\s]{1,8}|Liked|Loved|Emphasized|"
    r"Laughed at|Questioned|Disliked)\s*(?:to\s*)?[\u201c\"]"
)

CHAPTERS = [
    (1, "April 29",            dt.date(2025, 4, 29), dt.date(2025, 8, 10)),
    (2, "August 11",           dt.date(2025, 8, 11), dt.date(2025, 11, 30)),
    (3, "December",            dt.date(2025, 12, 1), dt.date(2025, 12, 31)),
    (4, "Point Reyes",         dt.date(2026, 1, 1),  dt.date(2026, 1, 31)),
    (5, "The ordinary months", dt.date(2026, 2, 1),  dt.date(2026, 4, 30)),
    (6, "May 18",              dt.date(2026, 5, 1),  dt.date(2026, 7, 31)),
]

ENDEARMENT = re.compile(
    r"\b(love you|i love|miss you|my favorite|proud of you|cutie|babe|baby|"
    r"can't wait|cant wait|thank you for|you make me)\b",
    re.I,
)


def is_tapback(body: str) -> bool:
    return bool(TAPBACK.match(body or ""))


def extract_body(element) -> str | None:
    """Prose body of an <sms> or <mms>, or None. Never returns SMIL XML."""
    if element.tag == "sms":
        body = element.get("body")
    else:
        body = None
        for part in element.iter("part"):
            if (part.get("ct") or "") == "text/plain":
                text = part.get("text")
                if text and text != "null":
                    body = text
                    break
    body = (body or "").strip()
    if not body or body == "null" or body.startswith("<smil"):
        return None
    return body


def parse_messages(path) -> list[Message]:
    seen: set[tuple] = set()
    messages: list[Message] = []

    for _event, element in ET.iterparse(str(path), events=("end",)):
        if element.tag not in ("sms", "mms"):
            continue

        stamp = element.get("date")
        box = element.get("msg_box") or element.get("type")
        body = extract_body(element)
        element.clear()

        if body is None or not stamp or is_tapback(body):
            continue

        key = (stamp, box, body)
        if key in seen:
            continue
        seen.add(key)

        messages.append(Message(
            ts=dt.datetime.fromtimestamp(int(stamp) / 1000),
            direction="her" if box == "1" else "him",
            body=body,
        ))

    messages.sort(key=lambda m: m.ts)
    return messages


def compute_stats(messages: list[Message]) -> dict:
    def side(which):
        subset = [m for m in messages if m.direction == which]
        words = sum(len(m.body.split()) for m in subset)
        return {"messages": len(subset), "words": words}

    per_day = collections.Counter(m.ts.date() for m in messages)
    first, last = messages[0].ts.date(), messages[-1].ts.date()
    span = max((last - first).days, 1)

    return {
        "messages": len(messages),
        "words": sum(len(m.body.split()) for m in messages),
        "her": side("her"),
        "him": side("him"),
        "first": first.isoformat(),
        "last": last.isoformat(),
        "span_days": span,
        "per_day_average": round(len(messages) / span),
        "after_midnight": sum(1 for m in messages if 0 <= m.ts.hour < 5),
        "busiest_days": [[d.isoformat(), c] for d, c in per_day.most_common(15)],
        "monthly": dict(sorted(collections.Counter(
            m.ts.strftime("%Y-%m") for m in messages).items())),
    }


def candidates(messages: list[Message], start: dt.date, end: dt.date) -> dict:
    window = [m for m in messages if start <= m.ts.date() <= end]
    endearing = [m for m in window if ENDEARMENT.search(m.body)]
    longest = sorted(window, key=lambda m: -len(m.body))[:12]
    late = [m for m in window if 0 <= m.ts.hour < 5]
    return {
        "count": len(window),
        "words": sum(len(m.body.split()) for m in window),
        "endearing": endearing[:25],
        "longest": longest,
        "late": late[:15],
    }


def fmt(message: Message) -> str:
    who = "HER" if message.direction == "her" else "HIM"
    stamp = message.ts.strftime("%b %d %Y, %-I:%M %p")
    body = message.body.replace("\n", " ")
    return f"- **{who}** · {stamp} — {body}"


def write_sheets(messages: list[Message], outdir: Path) -> None:
    outdir.mkdir(parents=True, exist_ok=True)
    for number, title, start, end in CHAPTERS:
        data = candidates(messages, start, end)
        lines = [
            f"# Chapter {number} — {title}",
            "",
            f"{start:%b %d %Y} to {end:%b %d %Y} · "
            f"{data['count']:,} messages · {data['words']:,} words",
            "",
            "Pick at most one or two exchanges from this chapter. Six across the whole piece.",
            "",
            "## Terms of endearment", "",
            *[fmt(m) for m in data["endearing"]], "",
            "## Longest messages", "",
            *[fmt(m) for m in data["longest"]], "",
            "## After midnight", "",
            *[fmt(m) for m in data["late"]], "",
        ]
        (outdir / f"chapter-{number}.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("export", type=Path)
    parser.add_argument("--outdir", type=Path, default=Path("docs/mined"))
    args = parser.parse_args()

    messages = parse_messages(args.export)
    stats = compute_stats(messages)

    args.outdir.mkdir(parents=True, exist_ok=True)
    (args.outdir / "stats.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")
    write_sheets(messages, args.outdir)

    print(f"{stats['messages']:,} messages · {stats['words']:,} words "
          f"· {stats['span_days']} days · {stats['per_day_average']}/day")
    print(f"her {stats['her']['messages']:,} msgs / {stats['her']['words']:,} words")
    print(f"him {stats['him']['messages']:,} msgs / {stats['him']['words']:,} words")
    print(f"wrote {args.outdir}/stats.json and {len(CHAPTERS)} chapter sheets")


if __name__ == "__main__":
    main()
