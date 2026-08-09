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
        self.assertEqual(stats["words"], 5 + 6 + 4 + 7)
        self.assertEqual(stats["her"]["messages"], 2)
        self.assertEqual(stats["him"]["messages"], 2)
        self.assertEqual(stats["first"], "2025-04-30")


if __name__ == "__main__":
    unittest.main()
