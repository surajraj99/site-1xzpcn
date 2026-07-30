# Anniversary Gift — Design Spec

**Date:** 2026-07-29
**Deliver by:** 2026-08-11 (first anniversary of making it official)
**Audience:** one person, on her phone, once — then whenever she wants after that

---

## 1. What we're making

A phone-first scrolling story of the first year, hosted on GitHub Pages behind a soft date
gate. She scrolls top to bottom through six chapters built from photos, short silent video
loops, photographs of letters she wrote, and a handful of real text exchanges. It closes on
three frames: verified numbers from the text history, a letter written to her that arrives
line by line, and a final card dated August 11, 2026.

One instrumental track plays from the moment she taps to begin until the music fades on the
last frame.

### Success criteria

1. It opens in under two seconds on cellular data and never stalls mid-scroll.
2. She reaches the letter still emotionally inside the piece — target four minutes.
3. Nothing about it looks like a template. The pacing is deliberate and the words are his.
4. It still works weeks later on a dead signal, without re-downloading.
5. No one but her ever sees it.

### Non-goals

No sharing features, no analytics, no comments, no login, no CMS, no framework, no build
step, no multi-device sync, no "add more photos later" admin surface. Every one of these
costs days and buys nothing for an audience of one.

---

## 2. Content inventory (verified, not estimated)

| Asset | Count | Notes |
|---|---|---|
| Photos | 19 | `data/*.jpg`, `*.heic`, `*.heif`. HEIC needs conversion. |
| Video clips | 9 | 1–12s. Eight landscape, one portrait (`IMG_7818`). |
| Letter photographs | 6 | Ultra-wide, ~4624×2084. |
| Audio | 1 | *Scars To Your Beautiful* (Instrumental), 3:50, 192kbps. |
| Text export | 61MB XML | SMS Backup & Restore v10.22, 51,570 raw entries. |

### Media distribution is severely lopsided

Photos by month: May 2025 (1), Aug 2025 (1), Sep 2025 (2), then **nothing until Jan 2026**,
then Jan (4), Feb (2), Mar (4), May (2), Jun (2), Jul (1). Video clips are all 2026 except
none in 2025 at all.

The cause is known: she was traveling for much of the first eight months. The design treats
this as the story's actual shape rather than a defect — see chapter one.

### Text history, cleaned

Raw 51,570 entries reduce to **22,068 real messages / 260,993 words** after removing:

- **6,504 tapback reactions** (`❤️ to "…"`) — not written messages.
- **Duplicates**, which account for the bulk of the reduction — every message is stored once as
  `<sms>` and again as `<mms>` with an identical timestamp and body. Dedupe on
  `(date, direction, body)`.
- **9,497 SMIL blocks** — MMS layout XML (`<smil><head>…`) that appears in the `text`
  attribute of `application/smil` parts. Only read parts where `ct="text/plain"`.

A subtle trap: when streaming with `iterparse`, clearing every element on its end event wipes
`<parts>` children before `<mms>` closes, making the text look absent. Clear only on `sms`/`mms`.

Verified figures:

- **22,068 messages / 260,993 words** across **456 days** (Apr 29 2025 → Jul 29 2026), ~48/day
- Her: 14,916 messages / 181,359 words (avg 12.2 words)
- Him: 7,152 messages / 79,634 words (avg 11.1 words)
- 1,118 messages (5.1%) sent between midnight and 5am
- June 2025 is absent from the export entirely; July 2025 has only 393 messages

### Known dates

| Date | Event | Evidence |
|---|---|---|
| Apr 29, 2025 | First date | Text history begins this same day |
| Aug 11, 2025 | Made it official | `IMG_20250905_174757.heic`, captured Aug 11 7:15pm |
| ~Dec 2, 2025 | First "I love you", said in person | Her Dec 9 12:32am message refers to it in past tense |
| Dec 29, 2025 | His birthday | She wrote him a letter |
| Jan 30–31, 2026 | First trip, Point Reyes backpacking | 4 photos + 2 clips |
| Feb 14, 2026 | Valentine's | She wrote him a letter |
| May 18, 2026 | His PhD conferred | She wrote him a letter |
| Jun 10, 2026 | Her birthday | Photos from Jun 9 and Jun 10 |
| Aug 11, 2026 | Delivery | — |

---

## 3. The experience

Ten frame types, in this order. Each frame is roughly one screen.

### Opening

1. **Gate** — "What day did we first see each other?" Accepts `04/29`, `4/29`, `0429`, `april 29`.
   Wrong answers never lock her out: after three attempts it offers "it's the day I couldn't
   stop talking about you." Passing sets a local flag so she never sees the gate again.
2. **Title card** — "One year of you and me / tap to begin." Her tap is what legally lets audio
   start on iOS, and it doubles as the curtain going up.

### Chapters

**One — April 29** (Apr 29 – Aug 10, 2025 · 1,206 messages · 1 photo · her 2025 letters)
The first date and the months after, when she was traveling and the two of them existed mostly
as text and paper. The chapter states its own poverty of images out loud: before there were
pictures of them, there were almost eighteen thousand words. Built from her letters and the
earliest messages.

**Two — August 11** (Aug 11 – Nov 30, 2025 · 6,456 messages · 3 photos)
Opens on the 7:15pm photo from the night it became official. Then the months where volume more
than doubles, 973 messages in August becoming 2,359 in November, without either of them
announcing anything.

**Three — December** (Dec 2025 · 2,298 messages · her birthday letter)
Saying it out loud for the first time around the 2nd. Her Dec 9 message calling it "the most
significant progression." Then the 29th, his birthday, and the letter she wrote.

**Four — Point Reyes** (Jan 30–31, 2026 · 4 photos · 2 clips)
Forty-eight hours gets a full chapter because it is the only stretch where the camera kept up.
The visual peak of the piece, in the same month they sent more messages than any other.

**Five — The ordinary months** (Feb – Apr 2026 · 4,819 messages · 6 photos · 4 clips · Valentine's letter)
Valentine's, her letter, and then the unremarkable weeks that are the actual argument of the
piece — a Tuesday in March, a joke that only works because of something said in October.

**Six — May 18** (May – Jul 2026 · 4,765 messages · 5 photos · 3 clips · her graduation letter)
His PhD and the letter she wrote for it. Her birthday on June 10. Then July, ending on the
photo taken five days before delivery, so the story closes in the present tense.

### Closing

7. **Numbers** — see §5.
8. **The letter** — his words, revealed line by line as she scrolls so she cannot skim ahead.
9. **Final card** — "Happy anniversary. August 11, 2026." Music fades. Nothing after it.

### Pacing against the music

The track is 230 seconds. Total frame count is tuned so a normal reading pace puts the letter
near the 3:10 mark. The track loops seamlessly if she lingers, and cross-fades to silence over
four seconds on the final frame regardless of where playback is.

---

## 4. Media treatment is driven by measured aspect ratio

**18 of 19 photos and 8 of 9 clips are landscape.** Metadata is not trustworthy about this —
`sips` reports stored pixels while Spotlight applies the EXIF rotation flag, and the two
disagree on several files. So orientation is resolved empirically: the media pass converts each
file, measures the *output*, and writes real `width`/`height` into the manifest. The renderer
selects a treatment from that measured ratio. No hardcoded assumptions.

| Measured shape | Treatment |
|---|---|
| Portrait (h > w) | Full-bleed, edge to edge, caption over a bottom scrim |
| Landscape (1.2 ≤ w/h < 1.9) | Film still: centered on black at full width, caption below the frame |
| Ultra-wide (w/h ≥ 1.9) | Slow horizontal pan across the image as she scrolls past |
| Small (long edge < 1000px) | Framed card at 78% width, never enlarged past its native size |

This is a correction to the original concept, which assumed full-bleed everywhere. Cropping a
4:3 landscape photo to a portrait phone screen would cut them out of their own frame. The film-still
treatment preserves composition and reads as more deliberate, not less.

**Letters** are ultra-wide and get the pan treatment, which suits them: her handwriting scrolls
past like it is being read aloud. Legibility at phone width is the binding constraint on how much
compression they can take.

**Video** is muted, `playsinline`, `loop`, and autoplays only while in view. The audio track is
stripped at encode time, which both shrinks the files and guarantees nothing ever fights the music.

---

## 5. The numbers frame

Four numbers, in this order. All verified against the cleaned export.

1. **260,993 words** — "longer than *Moby Dick*"
2. **22,068 messages** — "about 48 a day, every day, for 456 days"
3. **April 29, 2025** — "your text history starts the day we first saw each other. There is no before."
4. **181,359 to 79,634** — her words to his. Approved for inclusion. Framed as a joke at his own
   expense rather than a scoreboard: for every word he sent, she sent 2.3 of them. The number is
   hers, and it should read as admiration for how much she had to say.

**Explicitly cut:** December 18, 2025. It was the highest-volume day in the export, but the
content is a salary negotiation, a debate about whether Oscar is a public company, and a tangent
about snack food. Its apparent 3am romance was 37 SMIL blocks. Also cut: the after-midnight
percentage, at 5.1%, which is too tame to earn a frame.

---

## 6. Words

He is not writing from scratch and he is not accepting a draft blind. The flow is:

1. The text-mining tool surfaces candidate material: the highest-signal exchanges per chapter,
   plus every message containing terms of endearment, plus the longest messages either sent.
2. Drafts of chapter titles, photo captions, and the closing letter are written from that
   material, in his voice as evidenced by his own messages.
3. He rewrites anything that does not sound like him. The letter especially — a letter that
   sounds like a machine wrote it is worse than no letter.

Captions are one thought each, never a paragraph. Text exchanges appear about six times total
across the whole piece; used more often they stop being special.

---

## 6a. Visual language

"Modern and romantic" pulls in two directions, and unmanaged it lands on wedding-invitation
kitsch. The resolution: **modern in the structure, romantic in the material.** Layout, motion, and
typography discipline come from editorial design. Warmth comes from colour temperature, paper
texture, and restraint — never from script fonts, hearts, sparkles, or gradients behind text.

**Ground.** Warm near-black, `#100e10`, never pure black. Pure black reads like a device; a warm
black reads like a dark room. Photographs glow against it, and it is comfortable to read in bed at
midnight, which is when she will see it.

**Palette.** Four values, no more.

| Token | Value | Used for |
|---|---|---|
| `--ground` | `#100e10` | page background |
| `--ivory` | `#f2ece6` | primary text, slightly warm so it never looks clinical |
| `--rose` | `#c9788a` | chapter numerals, the one accent per frame |
| `--amber` | `#e9b7a0` | statistic values, hairlines, the letter's signature |

Muted `--dim: #8d8681` carries metadata. **At most one accent colour per frame.**

**Typography.** No webfonts at all — **zero downloaded bytes and zero offline risk.** She is opening
this on an iPhone, and iOS ships two excellent faces addressable by CSS keyword:

- `ui-serif` resolves to **New York** on Apple devices — a genuinely modern high-contrast serif.
  Used for anything emotional: chapter titles, captions, the letter. Serif is what makes it feel
  written rather than shipped.
- `system-ui` resolves to **SF Pro** — used for anything factual: dates, kickers, counts, the gate.

```css
--serif: ui-serif, "New York", Georgia, "Times New Roman", serif;
--sans:  system-ui, -apple-system, "Helvetica Neue", sans-serif;
```

Self-hosting a webfont would mean 60KB to download, a service-worker entry to get right, and a
flash of unstyled text on the title card — all to land somewhere close to what the device already
has. The fallbacks cover the desktop browsers he will develop in.

Emotional lines 26–34px, captions 15–17px with 1.45 line-height, metadata 9–11px uppercase at
0.16em tracking. **No more than two type sizes in a single frame.**

**Motion.** One vocabulary, used everywhere: opacity 0→1 and a 14px rise, 800ms, `cubic-bezier(0.22,
0.61, 0.36, 1)`. No bounce, no spring, no parallax, no counters ticking up. The restraint is the
romance — things arriving calmly feels intimate, things arriving athletically feels like an ad.
`prefers-reduced-motion` shows everything immediately with no transform.

**Phone correctness**, which is not optional given it will only ever be seen on one:

- `100dvh`, never `100vh` — `vh` is wrong whenever mobile Safari's toolbar is showing.
- `env(safe-area-inset-*)` padding so nothing hides under the notch or home indicator.
- `overflow-x: hidden` on the root; a single horizontal scrollbar would ruin it.
- Tap targets at least 44×44px; `-webkit-tap-highlight-color: transparent`.
- Explicit `width`/`height` on every image so no frame reflows as media loads.
- Tested at 390px wide (iPhone 14/15/16 base width) as the primary target.

## 7. Architecture

Plain static site. HTML, CSS, vanilla ES modules. No framework, no bundler, no build step. With
thirteen days on the clock, every hour spent on tooling is an hour not spent on content, and the
site does exactly one thing.

```
/
├── site/                       ← the deployed artifact
│   ├── index.html
│   ├── css/app.css
│   ├── js/
│   │   ├── main.js             bootstrap: fetch manifest, build frames, wire observers
│   │   ├── gate.js             date check, attempt hints, local flag
│   │   ├── audio.js            start on tap, seamless loop, fade on final frame
│   │   ├── frames.js           one render function per frame type
│   │   └── reveal.js           IntersectionObserver: fade-in, video play/pause, pan
│   ├── content/story.json      ← ALL content lives here
│   ├── media/{photos,video,letters,audio}/
│   └── sw.js                   service worker
├── tools/                      ← runs locally, never deployed
│   ├── build-media.sh          sips + ffmpeg → web derivatives + measured dimensions
│   └── mine-texts.py           XML → candidate quotes and verified stats
├── data/                       ← originals, gitignored, never committed
└── docs/
```

### The one important boundary

**`story.json` is the entire content layer.** It is an ordered array of frames; the renderer
walks it and dispatches on `type`. Reordering a chapter, cutting a photo, or rewriting a caption
is a text edit, never a code change. This matters most at 1am on August 10.

```jsonc
{
  "meta": { "audio": "media/audio/theme.m4a", "gateAnswer": "04-29", "fadeAt": "end" },
  "frames": [
    { "type": "gate",    "prompt": "What day did we first see each other?",
                         "hint": "the day I couldn't stop talking about you" },
    { "type": "title",   "kicker": "one year", "line": "of you and me", "cta": "tap to begin" },
    { "type": "chapter", "number": 1, "title": "April 29", "dateRange": "Apr 29 – Aug 10, 2025" },
    { "type": "photo",   "src": "media/photos/0002.webp", "width": 1600, "height": 1200,
                         "date": "May 23, 2025", "caption": "…" },
    { "type": "video",   "src": "media/video/0001.mp4", "poster": "media/video/0001.jpg",
                         "width": 1280, "height": 720, "caption": "…" },
    { "type": "texts",   "date": "Dec 9, 2025 · 12:32 am",
                         "messages": [ { "from": "her", "body": "…" } ] },
    { "type": "letter",  "src": "media/letters/0003.webp", "width": 3000, "height": 1352,
                         "occasion": "your birthday, December 29" },
    { "type": "numbers", "stats": [ { "value": "260,993", "label": "words", "note": "…" } ] },
    { "type": "missive", "lines": [ "…", "…" ], "signoff": "— me" },
    { "type": "end",     "line": "Happy anniversary", "date": "August 11, 2026" }
  ]
}
```

Each module stays small and single-purpose: `gate.js` knows nothing about frames, `frames.js`
knows nothing about scrolling, `reveal.js` knows nothing about content. Any of them can be
understood or replaced without reading the others.

### Media pipeline (`tools/build-media.sh`)

Runs once locally, output committed. `ffmpeg` and `sips` are already installed; nothing new to
install.

- **Photos** → `sips` converts HEIC to a working JPEG, `ffmpeg` produces WebP at 1600px long
  edge, quality 82, EXIF rotation applied. Emits measured output dimensions.
- **Letters** → WebP at 3000px long edge, quality 88. Higher budget than photos because
  handwriting legibility is the constraint.
- **Video** → H.264 MP4, 720p long edge, CRF 26, `-an` to strip audio, `+faststart`. Poster
  frame extracted at 0.1s.
- **Audio** → AAC 128kbps mono-safe stereo, ~3.7MB.
- Writes `tools/measured.json` with every output's real dimensions, which seeds `story.json`.

### Text mining (`tools/mine-texts.py`)

Streams the XML with `iterparse`, applies the three filters from §2, and emits a reviewable
Markdown file per chapter with candidate exchanges plus the verified statistics. **The raw export
is never committed and never deployed.** Only the handful of exchanges he approves are copied
into `story.json` by hand.

---

## 8. Privacy and delivery

- GitHub Pages, public repo (Pages on private repos requires a paid plan), **unguessable repo
  name** — no names, no "anniversary", nothing searchable.
- `robots.txt` disallowing everything, plus `<meta name="robots" content="noindex, nofollow">`.
- The date gate is a soft gate, not security. It keeps a stray visitor out and sets the mood; it
  is not encryption and the spec does not pretend otherwise. The real protection is that nobody
  knows the URL.
- `.gitignore` excludes `data/`, `.superpowers/`, `.DS_Store` from the first commit onward. **The
  61MB text export must never enter git history** — it cannot be un-pushed once it does.
- Delivered as a link. A QR code printed on card stock is an optional physical handoff.

## 9. Performance and offline

- **First screen under 400KB.** Gate and title card use no media at all, so it opens instantly.
- **Total payload target 15–20MB**, loaded progressively. Nothing outside the next two frames is
  fetched, so early scrolling costs almost nothing.
- Service worker precaches the shell plus chapter one; everything else is runtime-cached as she
  reaches it. Once she has scrolled through, the whole piece works on no signal.
- Images carry explicit `width`/`height` so nothing reflows as it loads — a layout shift during a
  slow reveal would break the spell.

## 10. Testing

Manual, on a real iPhone, over cellular with wifi off — the actual delivery conditions:

1. Gate accepts every input format listed, and three wrong answers surface the hint.
2. Audio starts on the title tap and does not fail silently. This is the single most fragile
   thing in the piece.
3. Muted inline video autoplays and loops in Safari; landscape clips are letterboxed, not cropped.
4. Every letter is legible without pinch-zoom.
5. Total transferred bytes measured against budget.
6. Airplane mode after one full pass: it still plays start to finish.
7. Full read-through for tone. The last check is whether it sounds like him.

## 11. Decisions he still owns

**The letter's content.** Drafted from the texts, then rewritten by him. It is non-negotiable that
the final words are his; everything else in this document exists to earn her attention by the time
she reaches them.
