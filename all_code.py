import json
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from mine_texts import parse_messages, compute_stats, is_tapback, extract_body

FIXTURE = Path(__file__).parent / "fixtures" / "sample.xml"


class TestFilters(unittest.TestCase):
    def test_tapbacks_are_detected(self):
        self.assertTrue(is_tapback('\u200b\u2764\ufe0f to \u201c reply from him \u201d'))
        self.assertTrue(is_tapback('Liked \u201chello\u201d'))
        self.assertFalse(is_tapback("I love you and I mean it"))
        self.assertFalse(is_tapback("going to the store"))

    def test_smil_parts_are_never_used_as_body(self):
        import xml.etree.ElementTree as ET
        mms = ET.fromstring(
            '<mms><parts>'
            '<part ct="application/smil" text="&lt;smil&gt;&lt;head&gt;&lt;/head&gt;&lt;/smil&gt;"/>'
            '<part ct="text/plain" text="the real text"/>'
            '</parts></mms>'
        )
        self.assertEqual(extract_body(mms), "the real text")

    def test_smil_only_mms_yields_no_body(self):
        import xml.etree.ElementTree as ET
        mms = ET.fromstring(
            '<mms><parts><part ct="application/smil" text="&lt;smil&gt;x&lt;/smil&gt;"/></parts></mms>'
        )
        self.assertIsNone(extract_body(mms))


class TestParsing(unittest.TestCase):
    def setUp(self):
        self.messages = parse_messages(FIXTURE)

    def test_keeps_only_real_unique_messages(self):
        bodies = [m.body for m in self.messages]
        self.assertEqual(len(self.messages), 4, bodies)
        self.assertIn("first real message from her", bodies)
        self.assertIn("reply from him with four words", bodies)
        self.assertIn("mms text from him", bodies)
        self.assertIn("I love you and I mean it", bodies)

    def test_duplicate_is_collapsed(self):
        first = [m for m in self.messages if m.body == "first real message from her"]
        self.assertEqual(len(first), 1)

    def test_direction_mapping(self):
        by_body = {m.body: m.direction for m in self.messages}
        self.assertEqual(by_body["first real message from her"], "her")
        self.assertEqual(by_body["reply from him with four words"], "him")
        self.assertEqual(by_body["mms text from him"], "him")

    def test_messages_are_chronological(self):
        stamps = [m.ts for m in self.messages]
        self.assertEqual(stamps, sorted(stamps))


class TestStats(unittest.TestCase):
    def test_counts_and_words(self):
        stats = compute_stats(parse_messages(FIXTURE))
        self.assertEqual(stats["messages"], 4)
        self.assertEqual(stats["words"], 5 + 6 + 4 + 6)
        self.assertEqual(stats["her"]["messages"], 2)
        self.assertEqual(stats["him"]["messages"], 2)
        self.assertEqual(stats["first"], "2025-04-30")


if __name__ == "__main__":
    unittest.main()
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
