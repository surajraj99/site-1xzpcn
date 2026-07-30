# Anniversary Scroll Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a phone-first, offline-capable scrolling story of a first year together — six chapters of photos, silent video loops, letter scans, and real text exchanges, closing on verified statistics and a handwritten-in-spirit letter — deployed to GitHub Pages behind a soft date gate by 2026-08-11.

**Architecture:** A static site with no build step. All content lives in one `site/content/story.json` manifest; the renderer walks it and dispatches on frame `type`. Render functions are pure (frame object → HTML string) so they are unit-testable in Node without a DOM. Two throwaway local tools convert media and mine the text export; neither ships. An `IntersectionObserver` drives reveals, video playback, and lazy loading; a service worker makes the whole thing work offline after one pass.

**Tech Stack:** Vanilla HTML / CSS / ES modules. `node:test` (built in) for JS unit tests, `unittest` (stdlib) for Python. `ffmpeg` and `sips` for media. No npm dependencies, no bundler, no framework.

## Global Constraints

These apply to every task. Values are copied from the spec verbatim.

- **No framework, no bundler, no build step.** No npm dependencies beyond what ships with Node.
- **Deadline 2026-08-11.** Content quality beats feature count; when in doubt, cut scope not polish.
- **`data/` is never committed and never deployed.** The 61MB export cannot be un-pushed once in git history.
- **No webfonts.** `--serif: ui-serif, "New York", Georgia, "Times New Roman", serif;` and `--sans: system-ui, -apple-system, "Helvetica Neue", sans-serif;`
- **Palette is exactly:** `--ground: #100e10`, `--ivory: #f2ece6`, `--rose: #c9788a`, `--amber: #e9b7a0`, `--dim: #8d8681`. **At most one accent colour per frame.**
- **Motion is one vocabulary:** opacity 0→1 plus a 14px rise, 800ms, `cubic-bezier(0.22, 0.61, 0.36, 1)`. No bounce, no spring, no parallax, no ticking counters. `prefers-reduced-motion` reveals immediately with no transform.
- **Type scale:** emotional lines 26–34px, captions 15–17px at 1.45 line-height, metadata 9–11px uppercase at 0.16em tracking. **No more than two type sizes in a single frame.**
- **Phone correctness:** `100dvh` never `100vh`; `env(safe-area-inset-*)` padding; `overflow-x: hidden` on root; tap targets ≥44×44px; `-webkit-tap-highlight-color: transparent`; explicit `width`/`height` on every image. Primary target width 390px.
- **Performance:** first screen under 400KB; total payload 15–20MB; nothing outside the next two frames is fetched.
- **Video:** muted, `playsinline`, `loop`, audio stripped at encode time (`-an`), autoplays only while in view.
- **All 34 media placed:** 19 photos, 9 clips, 6 letter pages. Text exchanges appear about six times total across the whole piece.
- **Gate answer is `04-29`** (first date, April 29 2025). Three wrong attempts reveal the hint. It never hard-locks.
- **The four approved statistics, exact strings:** `260,993` words; `22,068` messages; `April 29, 2025`; `181,359` to `79,634`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `package.json` | `{"type":"module"}` and the `test` script. No dependencies. |
| `site/index.html` | Document shell, meta tags, noindex, root containers. |
| `site/css/app.css` | The entire design system and every frame's layout. |
| `site/js/main.js` | Bootstrap: fetch manifest, render, mount gate, wire observers and audio. |
| `site/js/frames.js` | **Pure.** `treatmentFor()` and `renderFrame()` — frame object to HTML string. |
| `site/js/gate.js` | **Pure** `normalizeDate()` plus `mountGate()` DOM wiring. |
| `site/js/reveal.js` | `createRevealController()` — IntersectionObserver for reveal, video, pan, lazy load. |
| `site/js/audio.js` | `createAudio()` — start on gesture, seamless loop, fade out. |
| `site/content/story.json` | **All content.** Ordered frame array. |
| `site/media/` | Converted derivatives only. Committed. |
| `site/sw.js` | Service worker: precache shell, runtime-cache media. |
| `site/robots.txt` | Disallow everything. |
| `tools/build_media.sh` | `data/` originals → `site/media/` + `tools/measured.json`. Never deployed. |
| `tools/mine_texts.py` | Export XML → verified stats + candidate quote sheets. Never deployed. |
| `tools/validate_story.mjs` | `validateStory()` — manifest schema checks. |
| `tests/*.test.mjs` | Node unit tests for the pure modules. |
| `tools/tests/test_mine_texts.py` | Python unit tests with a small fixture XML. |

---

## Task 1: Project skeleton and the gate's date parser

**Files:**
- Create: `package.json`
- Create: `site/js/gate.js`
- Test: `tests/gate.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `normalizeDate(input: string) -> string | null` returning `"MM-DD"` or `null`. `checkAnswer(input: string, expected: string) -> boolean`. Both imported by `main.js` in Task 8.

- [ ] **Step 1: Write the failing test**

`tests/gate.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDate, checkAnswer } from '../site/js/gate.js';

test('accepts slashed numeric forms', () => {
  assert.equal(normalizeDate('04/29'), '04-29');
  assert.equal(normalizeDate('4/29'), '04-29');
  assert.equal(normalizeDate('04 / 29'), '04-29');
});

test('accepts compact and dashed numeric forms', () => {
  assert.equal(normalizeDate('0429'), '04-29');
  assert.equal(normalizeDate('4-29'), '04-29');
  assert.equal(normalizeDate('04.29'), '04-29');
});

test('accepts month names in either order, any case', () => {
  assert.equal(normalizeDate('april 29'), '04-29');
  assert.equal(normalizeDate('Apr 29'), '04-29');
  assert.equal(normalizeDate('APRIL 29th'), '04-29');
  assert.equal(normalizeDate('29 april'), '04-29');
});

test('rejects nonsense without throwing', () => {
  assert.equal(normalizeDate(''), null);
  assert.equal(normalizeDate('hello'), null);
  assert.equal(normalizeDate('13/45'), null);
  assert.equal(normalizeDate('0/0'), null);
  assert.equal(normalizeDate(null), null);
});

test('checkAnswer compares normalized forms', () => {
  assert.equal(checkAnswer('april 29th', '04-29'), true);
  assert.equal(checkAnswer('0429', '04-29'), true);
  assert.equal(checkAnswer('08/11', '04-29'), false);
  assert.equal(checkAnswer('garbage', '04-29'), false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/`
Expected: FAIL — `Cannot find module '.../site/js/gate.js'`

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "anniversary",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/",
    "serve": "python3 -m http.server 8080 --directory site"
  }
}
```

- [ ] **Step 4: Write the implementation**

`site/js/gate.js`:

```js
const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function pad(n) {
  return String(n).padStart(2, '0');
}

function build(month, day) {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > DAYS_IN_MONTH[month]) return null;
  return `${pad(month)}-${pad(day)}`;
}

// Accepts "04/29", "4-29", "0429", "april 29", "29 Apr", "APRIL 29th".
export function normalizeDate(input) {
  if (typeof input !== 'string') return null;
  const text = input.trim().toLowerCase();
  if (!text) return null;

  const named = text.match(/([a-z]{3,9})\.?\s*(\d{1,2})|(\d{1,2})\s*(?:st|nd|rd|th)?\s+([a-z]{3,9})/);
  if (named) {
    const word = named[1] || named[4];
    const number = Number(named[2] || named[3]);
    const month = MONTHS[word.slice(0, 3)];
    if (month) return build(month, number);
  }

  const separated = text.match(/^(\d{1,2})\s*[/.\-\s]\s*(\d{1,2})/);
  if (separated) return build(Number(separated[1]), Number(separated[2]));

  const compact = text.replace(/\D/g, '');
  if (compact.length === 4) return build(Number(compact.slice(0, 2)), Number(compact.slice(2)));
  if (compact.length === 3) return build(Number(compact.slice(0, 1)), Number(compact.slice(1)));

  return null;
}

export function checkAnswer(input, expected) {
  const got = normalizeDate(input);
  return got !== null && got === expected;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all 5 gate tests green.

- [ ] **Step 6: Commit**

```bash
git init
git add .gitignore package.json site/js/gate.js tests/gate.test.mjs docs/
git commit -m "feat: gate date parser with forgiving input handling"
```

---

## Task 2: Frame treatment rules and pure renderers

**Files:**
- Create: `site/js/frames.js`
- Test: `tests/frames.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `treatmentFor({width, height}) -> 'portrait' | 'still' | 'pan' | 'inset'`. `renderFrame(frame) -> string`. `renderStory(frames) -> string`. `escapeHtml(text) -> string`. All consumed by `main.js` in Task 7.

**Treatment rules from the spec:** long edge under 1000px is `inset` (never enlarged); otherwise ratio ≥ 1.9 is `pan`; ratio ≥ 1.2 is `still`; anything taller than wide is `portrait`.

- [ ] **Step 1: Write the failing test**

`tests/frames.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { treatmentFor, renderFrame, renderStory, escapeHtml } from '../site/js/frames.js';

test('treatment follows measured aspect ratio', () => {
  assert.equal(treatmentFor({ width: 3024, height: 4032 }), 'portrait');
  assert.equal(treatmentFor({ width: 4032, height: 3024 }), 'still');
  assert.equal(treatmentFor({ width: 4624, height: 2084 }), 'pan');
  assert.equal(treatmentFor({ width: 836, height: 627 }), 'inset');
});

test('small portrait images are inset, not full-bleed', () => {
  assert.equal(treatmentFor({ width: 627, height: 836 }), 'inset');
});

test('escapeHtml neutralizes markup in her words', () => {
  assert.equal(escapeHtml('<b>hi</b> & "bye"'), '&lt;b&gt;hi&lt;/b&gt; &amp; &quot;bye&quot;');
});

test('photo frame carries dimensions, lazy src and treatment class', () => {
  const html = renderFrame({
    type: 'photo', src: 'media/photos/0004.webp', width: 1600, height: 1200,
    date: 'Jan 30, 2026', caption: 'The morning it rained.',
  });
  assert.match(html, /class="frame frame--photo is-still"/);
  assert.match(html, /data-src="media\/photos\/0004\.webp"/);
  assert.match(html, /width="1600" height="1200"/);
  assert.match(html, /The morning it rained\./);
  assert.match(html, /Jan 30, 2026/);
  assert.ok(!html.includes('src="media/photos/0004.webp"'), 'src must stay lazy until revealed');
});

test('video frame is muted, looping, inline and poster-backed', () => {
  const html = renderFrame({
    type: 'video', src: 'media/video/0002.mp4', poster: 'media/video/0002.jpg',
    width: 1280, height: 720, caption: 'You laughing.',
  });
  assert.match(html, /muted/);
  assert.match(html, /loop/);
  assert.match(html, /playsinline/);
  assert.match(html, /poster="media\/video\/0002\.jpg"/);
  assert.ok(!html.includes('autoplay'), 'playback is driven by the observer, not the attribute');
});

test('texts frame renders one bubble per message with the sender class', () => {
  const html = renderFrame({
    type: 'texts', date: 'Dec 9, 2025 · 12:32 am',
    messages: [
      { from: 'her', body: 'of course I love you' },
      { from: 'him', body: 'obviously yes' },
    ],
  });
  assert.equal((html.match(/class="bubble bubble--/g) || []).length, 2);
  assert.match(html, /bubble--her/);
  assert.match(html, /bubble--him/);
});

test('numbers frame renders each stat value and label', () => {
  const html = renderFrame({
    type: 'numbers',
    stats: [{ value: '260,993', label: 'words', note: 'longer than Moby Dick' }],
  });
  assert.match(html, /260,993/);
  assert.match(html, /words/);
  assert.match(html, /longer than Moby Dick/);
});

test('missive renders one element per line so each can reveal separately', () => {
  const html = renderFrame({
    type: 'missive', lines: ['One.', 'Two.', 'Three.'], signoff: '— me',
  });
  assert.equal((html.match(/class="missive__line"/g) || []).length, 3);
  assert.match(html, /— me/);
});

test('unknown frame types throw rather than render silently', () => {
  assert.throws(() => renderFrame({ type: 'nope' }), /unknown frame type: nope/);
});

test('renderStory concatenates in manifest order', () => {
  const html = renderStory([
    { type: 'chapter', number: 1, title: 'April 29', dateRange: 'Apr 29 – Aug 10, 2025' },
    { type: 'end', line: 'Happy anniversary', date: 'August 11, 2026' },
  ]);
  assert.ok(html.indexOf('April 29') < html.indexOf('Happy anniversary'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../site/js/frames.js'`

- [ ] **Step 3: Write the implementation**

`site/js/frames.js`:

```js
export function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function treatmentFor({ width, height }) {
  const longEdge = Math.max(width, height);
  if (longEdge < 1000) return 'inset';
  const ratio = width / height;
  if (ratio >= 1.9) return 'pan';
  if (ratio >= 1.2) return 'still';
  return 'portrait';
}

function caption(frame) {
  if (!frame.caption && !frame.date) return '';
  const line = frame.caption ? `<p class="caption__line">${escapeHtml(frame.caption)}</p>` : '';
  const date = frame.date ? `<p class="caption__date">${escapeHtml(frame.date)}</p>` : '';
  return `<figcaption class="caption">${line}${date}</figcaption>`;
}

const RENDERERS = {
  gate: (f) => `
    <section class="frame frame--gate" id="gate">
      <div class="gate__inner">
        <p class="gate__prompt">${escapeHtml(f.prompt)}</p>
        <input class="gate__input" id="gate-input" inputmode="numeric"
               autocomplete="off" autocapitalize="off" spellcheck="false"
               aria-label="${escapeHtml(f.prompt)}" placeholder="MM / DD">
        <button class="gate__submit" id="gate-submit" type="button">enter</button>
        <p class="gate__hint" id="gate-hint" hidden>${escapeHtml(f.hint)}</p>
      </div>
    </section>`,

  title: (f) => `
    <section class="frame frame--title">
      <div class="title__inner">
        <p class="kicker">${escapeHtml(f.kicker)}</p>
        <h1 class="title__line">${escapeHtml(f.line)}</h1>
        <hr class="rule">
        <button class="title__cta" id="begin" type="button">${escapeHtml(f.cta)}</button>
      </div>
    </section>`,

  chapter: (f) => `
    <section class="frame frame--chapter" data-reveal>
      <div class="chapter__inner">
        <p class="kicker">chapter ${escapeHtml(f.number)}</p>
        <h2 class="chapter__title">${escapeHtml(f.title)}</h2>
        <p class="chapter__range">${escapeHtml(f.dateRange)}</p>
      </div>
    </section>`,

  interstitial: (f) => `
    <section class="frame frame--interstitial" data-reveal>
      <p class="interstitial__line">${escapeHtml(f.line)}</p>
    </section>`,

  photo: (f) => `
    <figure class="frame frame--photo is-${treatmentFor(f)}" data-reveal>
      <img class="media" data-src="${escapeHtml(f.src)}"
           width="${escapeHtml(f.width)}" height="${escapeHtml(f.height)}"
           alt="${escapeHtml(f.caption || '')}" decoding="async">
      ${caption(f)}
    </figure>`,

  video: (f) => `
    <figure class="frame frame--video is-${treatmentFor(f)}" data-reveal>
      <video class="media" data-src="${escapeHtml(f.src)}" poster="${escapeHtml(f.poster)}"
             width="${escapeHtml(f.width)}" height="${escapeHtml(f.height)}"
             muted loop playsinline preload="none"></video>
      ${caption(f)}
    </figure>`,

  letter: (f) => `
    <figure class="frame frame--letter is-${treatmentFor(f)}" data-reveal>
      <div class="letter__viewport">
        <img class="media letter__img" data-src="${escapeHtml(f.src)}"
             width="${escapeHtml(f.width)}" height="${escapeHtml(f.height)}"
             alt="A letter she wrote" decoding="async">
      </div>
      <figcaption class="caption">
        <p class="caption__date">${escapeHtml(f.occasion)}</p>
      </figcaption>
    </figure>`,

  texts: (f) => {
    const bubbles = f.messages.map((m) =>
      `<p class="bubble bubble--${m.from === 'her' ? 'her' : 'him'}">${escapeHtml(m.body)}</p>`
    ).join('');
    return `
    <section class="frame frame--texts" data-reveal>
      <div class="thread">${bubbles}</div>
      <p class="thread__stamp">${escapeHtml(f.date)}</p>
    </section>`;
  },

  numbers: (f) => {
    const stats = f.stats.map((s) => `
      <div class="stat" data-reveal>
        <b class="stat__value">${escapeHtml(s.value)}</b>
        <span class="stat__label">${escapeHtml(s.label)}</span>
        <em class="stat__note">${escapeHtml(s.note)}</em>
      </div>`).join('');
    return `<section class="frame frame--numbers">${stats}</section>`;
  },

  missive: (f) => {
    const lines = f.lines.map((line) =>
      `<p class="missive__line" data-reveal>${escapeHtml(line)}</p>`
    ).join('');
    return `
    <section class="frame frame--missive">
      <div class="missive__inner">${lines}
        <p class="missive__signoff" data-reveal>${escapeHtml(f.signoff)}</p>
      </div>
    </section>`;
  },

  end: (f) => `
    <section class="frame frame--end" id="end" data-reveal>
      <div class="end__inner">
        <h2 class="end__line">${escapeHtml(f.line)}</h2>
        <hr class="rule">
        <p class="end__date">${escapeHtml(f.date)}</p>
      </div>
    </section>`,
};

export function renderFrame(frame) {
  const render = RENDERERS[frame.type];
  if (!render) throw new Error(`unknown frame type: ${frame.type}`);
  return render(frame);
}

export function renderStory(frames) {
  return frames.map(renderFrame).join('\n');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 10 frame tests plus the 5 from Task 1.

- [ ] **Step 5: Commit**

```bash
git add site/js/frames.js tests/frames.test.mjs
git commit -m "feat: pure frame renderers with aspect-ratio-driven treatments"
```

---

## Task 3: Manifest validator

**Files:**
- Create: `tools/validate_story.mjs`
- Test: `tests/validate_story.test.mjs`

**Interfaces:**
- Consumes: `treatmentFor` from `site/js/frames.js`.
- Produces: `validateStory(manifest) -> string[]` (empty array means valid). CLI: `node tools/validate_story.mjs site/content/story.json` exits 1 and prints errors when invalid.

Catching a typo in a 100-frame manifest by reading JSON is miserable. This is the safety net for Task 11.

- [ ] **Step 1: Write the failing test**

`tests/validate_story.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStory } from '../tools/validate_story.mjs';

const valid = {
  meta: { audio: 'media/audio/theme.m4a', gateAnswer: '04-29' },
  frames: [
    { type: 'gate', prompt: 'What day?', hint: 'the day' },
    { type: 'title', kicker: 'one year', line: 'of you and me', cta: 'tap to begin' },
    { type: 'chapter', number: 1, title: 'April 29', dateRange: 'Apr 29 – Aug 10, 2025' },
    { type: 'photo', src: 'media/photos/0001.webp', width: 1600, height: 1200, caption: 'x' },
    { type: 'end', line: 'Happy anniversary', date: 'August 11, 2026' },
  ],
};

test('a well-formed manifest produces no errors', () => {
  assert.deepEqual(validateStory(valid), []);
});

test('requires meta.gateAnswer in MM-DD form', () => {
  const bad = structuredClone(valid);
  bad.meta.gateAnswer = 'April 29';
  assert.match(validateStory(bad).join(' '), /gateAnswer/);
});

test('rejects unknown frame types', () => {
  const bad = structuredClone(valid);
  bad.frames.push({ type: 'carousel' });
  assert.match(validateStory(bad).join(' '), /frame 5: unknown type "carousel"/);
});

test('media frames must carry positive numeric dimensions', () => {
  const bad = structuredClone(valid);
  bad.frames[3].width = '1600';
  assert.match(validateStory(bad).join(' '), /frame 3: width must be a positive number/);

  const missing = structuredClone(valid);
  delete missing.frames[3].height;
  assert.match(validateStory(missing).join(' '), /frame 3: height must be a positive number/);
});

test('video frames require a poster', () => {
  const bad = structuredClone(valid);
  bad.frames.push({ type: 'video', src: 'media/video/1.mp4', width: 1280, height: 720 });
  assert.match(validateStory(bad).join(' '), /frame 5: missing poster/);
});

test('texts frames require sender to be her or him', () => {
  const bad = structuredClone(valid);
  bad.frames.push({ type: 'texts', date: 'x', messages: [{ from: 'them', body: 'hi' }] });
  assert.match(validateStory(bad).join(' '), /message 0: from must be "her" or "him"/);
});

test('the story must open on a gate and close on an end', () => {
  const bad = structuredClone(valid);
  bad.frames.shift();
  assert.match(validateStory(bad).join(' '), /first frame must be the gate/);

  const noEnd = structuredClone(valid);
  noEnd.frames.pop();
  assert.match(validateStory(noEnd).join(' '), /last frame must be the end card/);
});

test('flags duplicate media so nothing is accidentally shown twice', () => {
  const bad = structuredClone(valid);
  bad.frames.splice(4, 0, { type: 'photo', src: 'media/photos/0001.webp', width: 10, height: 10, caption: 'y' });
  assert.match(validateStory(bad).join(' '), /duplicate media src/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../tools/validate_story.mjs'`

- [ ] **Step 3: Write the implementation**

`tools/validate_story.mjs`:

```js
import { readFileSync } from 'node:fs';

const REQUIRED = {
  gate: ['prompt', 'hint'],
  title: ['kicker', 'line', 'cta'],
  chapter: ['number', 'title', 'dateRange'],
  interstitial: ['line'],
  photo: ['src', 'width', 'height'],
  video: ['src', 'poster', 'width', 'height'],
  letter: ['src', 'width', 'height', 'occasion'],
  texts: ['date', 'messages'],
  numbers: ['stats'],
  missive: ['lines', 'signoff'],
  end: ['line', 'date'],
};

const MEASURED = new Set(['photo', 'video', 'letter']);

export function validateStory(manifest) {
  const errors = [];
  const frames = manifest?.frames;

  if (!manifest?.meta || typeof manifest.meta !== 'object') errors.push('missing meta object');
  else {
    if (!/^\d{2}-\d{2}$/.test(manifest.meta.gateAnswer ?? '')) {
      errors.push('meta.gateAnswer must be MM-DD, e.g. "04-29"');
    }
    if (!manifest.meta.audio) errors.push('missing meta.audio');
  }

  if (!Array.isArray(frames) || frames.length === 0) {
    errors.push('frames must be a non-empty array');
    return errors;
  }

  if (frames[0].type !== 'gate') errors.push('first frame must be the gate');
  if (frames.at(-1).type !== 'end') errors.push('last frame must be the end card');

  const seenMedia = new Set();

  frames.forEach((frame, index) => {
    const required = REQUIRED[frame.type];
    if (!required) {
      errors.push(`frame ${index}: unknown type "${frame.type}"`);
      return;
    }
    for (const key of required) {
      if (frame[key] === undefined || frame[key] === null || frame[key] === '') {
        errors.push(`frame ${index}: missing ${key}`);
      }
    }
    if (MEASURED.has(frame.type)) {
      for (const key of ['width', 'height']) {
        if (typeof frame[key] !== 'number' || !(frame[key] > 0)) {
          errors.push(`frame ${index}: ${key} must be a positive number`);
        }
      }
      if (frame.src) {
        if (seenMedia.has(frame.src)) errors.push(`frame ${index}: duplicate media src ${frame.src}`);
        seenMedia.add(frame.src);
      }
    }
    if (frame.type === 'texts' && Array.isArray(frame.messages)) {
      frame.messages.forEach((message, m) => {
        if (message.from !== 'her' && message.from !== 'him') {
          errors.push(`frame ${index} message ${m}: from must be "her" or "him"`);
        }
        if (!message.body) errors.push(`frame ${index} message ${m}: missing body`);
      });
    }
    if (frame.type === 'numbers' && Array.isArray(frame.stats)) {
      frame.stats.forEach((stat, s) => {
        for (const key of ['value', 'label', 'note']) {
          if (!stat[key]) errors.push(`frame ${index} stat ${s}: missing ${key}`);
        }
      });
    }
  });

  return errors;
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (invokedDirectly && process.argv[2]) {
  const errors = validateStory(JSON.parse(readFileSync(process.argv[2], 'utf8')));
  if (errors.length) {
    console.error(`${errors.length} problem(s) in ${process.argv[2]}:`);
    for (const error of errors) console.error('  -', error);
    process.exit(1);
  }
  console.log('manifest valid');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 8 validator tests green.

- [ ] **Step 5: Commit**

```bash
git add tools/validate_story.mjs tests/validate_story.test.mjs
git commit -m "feat: story manifest validator"
```

---

## Task 4: Media conversion pipeline

**Files:**
- Create: `tools/build_media.sh`
- Creates at runtime: `site/media/photos/*.webp`, `site/media/video/*.mp4`, `site/media/video/*.jpg`, `site/media/letters/*.webp`, `site/media/audio/theme.m4a`, `tools/measured.json`

**Interfaces:**
- Consumes: originals in `data/`.
- Produces: `tools/measured.json` — an array of `{ kind, out, src, width, height, captured, duration }`. Task 11 reads this to seed the manifest.

Orientation is resolved empirically: `ffprobe` measures the **converted output**, so EXIF rotation is already baked in and no metadata is trusted.

- [ ] **Step 1: Write the script**

`tools/build_media.sh`:

```bash
#!/usr/bin/env bash
# Converts data/ originals into web derivatives under site/media/.
# Re-runnable: existing outputs are overwritten. Requires ffmpeg + sips (preinstalled on macOS).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/data"
OUT="$ROOT/site/media"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$OUT/photos" "$OUT/video" "$OUT/letters" "$OUT/audio"

MANIFEST="$ROOT/tools/measured.json"
echo "[" > "$MANIFEST"
FIRST=1

emit() { # kind out src width height captured duration
  [ $FIRST -eq 1 ] || echo "," >> "$MANIFEST"
  FIRST=0
  printf '  {"kind":"%s","out":"%s","src":"%s","width":%s,"height":%s,"captured":"%s","duration":%s}' \
    "$1" "$2" "$3" "$4" "$5" "$6" "$7" >> "$MANIFEST"
}

dims() { ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$1"; }

captured_photo() { sips -g creation "$1" 2>/dev/null | awk -F': ' '/creation/{print $2}'; }

# --- photos and letters -------------------------------------------------------
convert_image() { # infile outdir index longedge quality kind
  local infile="$1" outdir="$2" index="$3" longedge="$4" quality="$5" kind="$6"
  local base; base="$(basename "$infile")"
  local staged="$WORK/${index}.jpg"
  local out; out="$(printf '%s/%04d.webp' "$outdir" "$index")"

  # sips applies EXIF rotation while transcoding HEIC/JPEG to a working JPEG.
  sips -s format jpeg -s formatOptions 95 --resampleHeightWidthMax "$longedge" \
       "$infile" --out "$staged" >/dev/null

  ffmpeg -nostdin -loglevel error -y -i "$staged" -quality "$quality" "$out"

  local wh; wh="$(dims "$out")"
  emit "$kind" "${out#"$ROOT/site/"}" "$base" "${wh%x*}" "${wh#*x}" "$(captured_photo "$infile")" "0"
  echo "  $base -> ${out#"$ROOT/site/"} ($wh)"
}

echo "photos:"
i=0
while IFS= read -r f; do
  i=$((i+1))
  convert_image "$f" "$OUT/photos" "$i" 1600 82 photo
done < <(find "$DATA" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.heic' -o -iname '*.heif' \) | sort)

echo "letters:"
i=0
while IFS= read -r f; do
  i=$((i+1))
  convert_image "$f" "$OUT/letters" "$i" 3000 90 letter
done < <(find "$DATA/letters" -maxdepth 1 -type f -iname '*.jpg' | sort)

# --- video --------------------------------------------------------------------
echo "video:"
i=0
while IFS= read -r f; do
  i=$((i+1))
  base="$(basename "$f")"
  out="$(printf '%s/%04d.mp4' "$OUT/video" "$i")"
  poster="$(printf '%s/%04d.jpg' "$OUT/video" "$i")"

  # -an strips audio: smaller files, and nothing can ever fight the soundtrack.
  ffmpeg -nostdin -loglevel error -y -i "$f" \
    -vf "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))',format=yuv420p" \
    -c:v libx264 -preset slow -crf 26 -an -movflags +faststart "$out"

  ffmpeg -nostdin -loglevel error -y -ss 0.1 -i "$out" -frames:v 1 -q:v 4 "$poster"

  wh="$(dims "$out")"
  dur="$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$out")"
  cap="$(ffprobe -v quiet -show_entries format_tags=creation_time -of csv=p=0 "$f")"
  emit video "${out#"$ROOT/site/"}" "$base" "${wh%x*}" "${wh#*x}" "$cap" "${dur:-0}"
  echo "  $base -> ${out#"$ROOT/site/"} ($wh, ${dur}s)"
done < <(find "$DATA" -maxdepth 1 -type f \( -iname '*.mov' -o -iname '*.mp4' \) | sort)

# --- audio --------------------------------------------------------------------
echo "audio:"
song="$(find "$DATA" -maxdepth 1 -type f -iname '*.mp3' | head -n 1)"
ffmpeg -nostdin -loglevel error -y -i "$song" -c:a aac -b:a 128k -movflags +faststart "$OUT/audio/theme.m4a"
adur="$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$OUT/audio/theme.m4a")"
emit audio "media/audio/theme.m4a" "$(basename "$song")" 0 0 "" "${adur:-0}"
echo "  $(basename "$song") -> media/audio/theme.m4a (${adur}s)"

echo "" >> "$MANIFEST"
echo "]" >> "$MANIFEST"

echo ""
echo "wrote $MANIFEST"
du -sh "$OUT"
```

- [ ] **Step 2: Make it executable and run it**

Run:
```bash
chmod +x tools/build_media.sh && ./tools/build_media.sh
```
Expected: a line per file, then a total size. Every one of the 19 photos, 9 videos, and 6 letters must appear.

- [ ] **Step 3: Verify the output count and budget**

Run:
```bash
ls site/media/photos/*.webp | wc -l   # expect 19
ls site/media/video/*.mp4   | wc -l   # expect 9
ls site/media/video/*.jpg   | wc -l   # expect 9
ls site/media/letters/*.webp | wc -l  # expect 6
python3 -c "import json;d=json.load(open('tools/measured.json'));print(len(d),'entries');print([e['out'] for e in d if e['width']==0 and e['kind']!='audio'])"
du -sh site/media
```
Expected: 19 / 9 / 9 / 6, 35 manifest entries, an empty list of zero-dimension entries, and a total under 20MB. **If the total exceeds 20MB, raise video CRF to 28 and re-run** before continuing.

- [ ] **Step 4: Spot-check one landscape and one portrait conversion**

Run: `python3 -c "import json;[print(e['src'],e['width'],'x',e['height']) for e in json.load(open('tools/measured.json'))if e['kind']=='photo']"`
Expected: dimensions are orientation-correct — a photo that looks portrait on your phone reports height greater than width. Open two converted WebPs to confirm nothing is rotated 90°.

- [ ] **Step 5: Commit**

```bash
git add tools/build_media.sh site/media
git commit -m "feat: media pipeline and converted web derivatives"
```

---

## Task 5: Text mining tool

**Files:**
- Create: `tools/mine_texts.py`
- Create: `tools/tests/fixtures/sample.xml`
- Test: `tools/tests/test_mine_texts.py`

**Interfaces:**
- Consumes: `data/tejasvi.xml`.
- Produces: `parse_messages(path) -> list[Message]` where `Message = namedtuple('Message', 'ts direction body')` and `direction` is `'her'` or `'him'`. `compute_stats(messages) -> dict`. CLI writes `docs/mined/stats.json` and `docs/mined/chapter-N.md`. Task 11 and Task 12 read those files.

The three filters are the whole point: tapbacks, duplicates, and SMIL blocks. Getting any of them wrong corrupts every statistic in the piece.

- [ ] **Step 1: Write the fixture**

`tools/tests/fixtures/sample.xml` — deliberately contains one of each trap:

```xml
<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<smses count="7">
  <sms protocol="0" address="+1555" date="1746039300000" type="1" body="first real message from her" readable_date="Apr 30, 2025 14:55:00" contact_name="Her" />
  <sms protocol="0" address="+1555" date="1746039300000" type="1" body="first real message from her" readable_date="Apr 30, 2025 14:55:00" contact_name="Her" />
  <sms protocol="0" address="+1555" date="1746039400000" type="2" body="reply from him with four words" readable_date="Apr 30, 2025 14:56:40" contact_name="Her" />
  <sms protocol="0" address="+1555" date="1746039500000" type="1" body="&#8203;&#10084;&#65039; to &#8220; reply from him with four words &#8221;" readable_date="Apr 30, 2025 14:58:20" contact_name="Her" />
  <sms protocol="0" address="+1555" date="1746039600000" type="1" body="null" readable_date="Apr 30, 2025 15:00:00" contact_name="Her" />
  <mms date="1746039700000" msg_box="2" address="+1555" readable_date="Apr 30, 2025 15:01:40" contact_name="Her">
    <parts>
      <part seq="-1" ct="application/smil" name="smil.xml" text="&lt;smil&gt;&lt;head&gt;&lt;layout&gt;&lt;/layout&gt;&lt;/head&gt;&lt;/smil&gt;" />
      <part seq="0" ct="text/plain" name="text000001.txt" text="mms text from him" />
    </parts>
  </mms>
  <mms date="1746039800000" msg_box="1" address="+1555" readable_date="Apr 30, 2025 15:03:20" contact_name="Her">
    <parts>
      <part seq="0" ct="text/plain" name="text000001.txt" text="I love you and I mean it" />
    </parts>
  </mms>
</smses>
```

- [ ] **Step 2: Write the failing test**

`tools/tests/test_mine_texts.py`:

```python
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `python3 -m unittest discover -s tools/tests -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'mine_texts'`

- [ ] **Step 4: Write the implementation**

`tools/mine_texts.py`:

```python
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `python3 -m unittest discover -s tools/tests -v`
Expected: PASS — 9 tests green.

- [ ] **Step 6: Run it against the real export and confirm the spec's numbers**

Run: `python3 tools/mine_texts.py data/tejasvi.xml`
Expected, matching the spec exactly:
```
22,068 messages · 260,993 words · 456 days · 48/day
her 14,916 msgs / 181,359 words
him 7,152 msgs / 79,634 words
```
**If these differ, stop.** A filter is wrong and every statistic in the piece depends on it.

- [ ] **Step 7: Commit**

```bash
git add tools/mine_texts.py tools/tests docs/mined
git commit -m "feat: text mining with tapback, duplicate and SMIL filtering"
```

Note: `docs/mined/` contains real message excerpts. It is committed because the repo is his working copy, but it lives outside `site/` and is therefore never deployed. If he would rather it never touch git, add `docs/mined/` to `.gitignore` at this step instead.

---

## Task 6: Document shell and the design system

**Files:**
- Create: `site/index.html`
- Create: `site/css/app.css`
- Create: `site/robots.txt`

**Interfaces:**
- Consumes: nothing.
- Produces: `#story` container that `main.js` renders into (Task 7); the class names emitted by `frames.js` in Task 2; CSS custom properties `--ground`, `--ivory`, `--rose`, `--amber`, `--dim`, `--serif`, `--sans`, `--ease`.

- [ ] **Step 1: Write `site/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
<meta name="theme-color" content="#100e10">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>One year</title>
<link rel="stylesheet" href="css/app.css">
</head>
<body>
  <main id="story" aria-live="polite"></main>
  <noscript>
    <p class="noscript">This one needs JavaScript on. Sorry — it's the only way the photos load politely.</p>
  </noscript>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `site/robots.txt`**

```
User-agent: *
Disallow: /
```

- [ ] **Step 3: Write `site/css/app.css`**

```css
:root {
  --ground: #100e10;
  --ivory: #f2ece6;
  --rose: #c9788a;
  --amber: #e9b7a0;
  --dim: #8d8681;
  --serif: ui-serif, "New York", Georgia, "Times New Roman", serif;
  --sans: system-ui, -apple-system, "Helvetica Neue", sans-serif;
  --ease: cubic-bezier(0.22, 0.61, 0.36, 1);
  --pad: max(20px, env(safe-area-inset-left));
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html { background: var(--ground); }

body {
  background: var(--ground);
  color: var(--ivory);
  font-family: var(--sans);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  text-rendering: optimizeLegibility;
}

/* --- the single motion vocabulary ---------------------------------------- */
[data-reveal] {
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 800ms var(--ease), transform 800ms var(--ease);
  will-change: opacity, transform;
}
[data-reveal].is-revealed { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  [data-reveal] { opacity: 1; transform: none; transition: none; }
  .letter__img { transition: none !important; }
}

/* --- frame scaffold ------------------------------------------------------ */
.frame {
  position: relative;
  padding: 12vh var(--pad);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.frame--gate, .frame--title, .frame--chapter, .frame--end {
  min-height: 100dvh;
  align-items: center;
  text-align: center;
  padding-top: max(12vh, env(safe-area-inset-top));
  padding-bottom: max(12vh, env(safe-area-inset-bottom));
}

.kicker {
  font-family: var(--sans);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--dim);
}

.rule { border: 0; width: 28px; height: 1px; background: rgba(242,236,230,0.3); margin: 18px auto; }

/* --- gate ---------------------------------------------------------------- */
.gate__inner { max-width: 300px; }
.gate__prompt { font-family: var(--serif); font-size: 26px; line-height: 1.25; margin-bottom: 26px; }

.gate__input {
  width: 100%; min-height: 48px;
  background: transparent;
  border: 1px solid rgba(242,236,230,0.28);
  border-radius: 10px;
  color: var(--ivory);
  font-family: var(--sans);
  font-size: 17px; /* 17px or larger stops iOS zooming the field on focus */
  letter-spacing: 0.12em;
  text-align: center;
  padding: 12px;
}
.gate__input:focus { outline: none; border-color: var(--amber); }

.gate__submit {
  margin-top: 14px; min-height: 44px; width: 100%;
  background: transparent; border: 1px solid rgba(242,236,230,0.28); border-radius: 10px;
  color: var(--ivory); font-family: var(--sans);
  font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
}
.gate__submit:active { background: rgba(242,236,230,0.06); }
.gate__input.is-wrong { border-color: var(--rose); }
.gate__hint { margin-top: 20px; font-family: var(--serif); font-style: italic; font-size: 15px; color: var(--dim); }

/* --- title and chapter --------------------------------------------------- */
.title__line {
  font-family: var(--serif); font-weight: 500;
  font-size: clamp(30px, 10vw, 40px); line-height: 1.1;
  letter-spacing: -0.015em; margin-top: 12px;
}
.title__cta {
  background: transparent; border: 0; color: var(--dim);
  font-family: var(--sans); font-size: 10px;
  letter-spacing: 0.18em; text-transform: uppercase;
  min-height: 44px; padding: 0 16px;
}

.chapter__title {
  font-family: var(--serif); font-weight: 500;
  font-size: clamp(28px, 9vw, 34px); line-height: 1.15; margin-top: 10px;
}
.chapter__range { font-family: var(--sans); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); margin-top: 12px; }
.frame--chapter .kicker { color: var(--rose); }

.interstitial__line {
  font-family: var(--serif); font-size: 22px; line-height: 1.5;
  max-width: 22ch; margin: 0 auto; text-align: center; color: var(--ivory);
}

/* --- media treatments ---------------------------------------------------- */
.frame--photo, .frame--video, .frame--letter { padding: 8vh 0; }

.media { display: block; width: 100%; height: auto; background: #17151a; }

/* portrait: full-bleed with the caption over a scrim */
.is-portrait { padding: 0; min-height: 100dvh; justify-content: flex-end; }
.is-portrait .media { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.is-portrait .caption {
  position: relative; z-index: 1;
  padding: 0 var(--pad) max(34px, env(safe-area-inset-bottom));
  background: linear-gradient(to top, rgba(0,0,0,0.82), rgba(0,0,0,0));
  padding-top: 90px;
}

/* landscape: a film still centred on the ground, caption beneath */
.is-still .media { width: 100%; }
.is-still .caption, .is-inset .caption, .is-pan .caption { padding: 16px var(--pad) 0; }

/* small originals: never enlarged past native size */
.is-inset { padding: 8vh var(--pad); }
.is-inset .media { width: 78%; margin: 0 auto; max-width: 100%; }

/* ultra-wide: drifts horizontally as she scrolls past */
.is-pan .letter__viewport, .is-pan.frame--photo { overflow: hidden; }
.letter__viewport { overflow: hidden; width: 100%; }
.is-pan .media {
  width: auto; height: 62dvh; max-width: none;
  transform: translateX(var(--pan, 0%));
  transition: transform 120ms linear;
}

.caption { text-align: left; }
.caption__line { font-family: var(--serif); font-size: 16px; line-height: 1.45; max-width: 34ch; }
.caption__date { font-family: var(--sans); font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); margin-top: 8px; }

/* --- text exchanges ------------------------------------------------------ */
.frame--texts { padding: 14vh var(--pad); }
.thread { max-width: 340px; margin: 0 auto; width: 100%; }
.bubble {
  font-family: var(--sans); font-size: 15px; line-height: 1.4;
  padding: 9px 13px; border-radius: 17px; margin: 6px 0; max-width: 82%;
  word-wrap: break-word;
}
.bubble--her { background: #26232a; color: var(--ivory); border-bottom-left-radius: 5px; }
.bubble--him { background: #7d4f5c; color: #fff; margin-left: auto; border-bottom-right-radius: 5px; }
.thread__stamp {
  font-family: var(--sans); font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--dim); text-align: center; margin-top: 18px;
}

/* --- numbers ------------------------------------------------------------- */
.frame--numbers { min-height: 100dvh; gap: 44px; padding: 16vh var(--pad); }
.stat { text-align: center; max-width: 30ch; margin: 0 auto; }
.stat__value { font-family: var(--serif); font-weight: 500; font-size: clamp(34px, 11vw, 46px); color: var(--amber); line-height: 1; display: block; }
.stat__label { font-family: var(--sans); font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--dim); display: block; margin-top: 10px; }
.stat__note { font-family: var(--serif); font-style: normal; font-size: 15px; line-height: 1.5; color: var(--ivory); display: block; margin-top: 14px; }

/* --- the letter ---------------------------------------------------------- */
.frame--missive { padding: 18vh var(--pad); }
.missive__inner { max-width: 33ch; margin: 0 auto; }
.missive__line { font-family: var(--serif); font-size: 17px; line-height: 1.75; margin-bottom: 20px; }
.missive__signoff { font-family: var(--serif); font-style: italic; font-size: 16px; color: var(--amber); margin-top: 12px; }

/* --- end ----------------------------------------------------------------- */
.end__line { font-family: var(--serif); font-weight: 500; font-size: clamp(28px, 9vw, 34px); line-height: 1.15; }
.end__date { font-family: var(--sans); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--dim); }

.noscript { padding: 40vh 24px; text-align: center; font-family: var(--serif); color: var(--ivory); }

/* --- audio toggle -------------------------------------------------------- */
.audio-toggle {
  position: fixed; z-index: 20;
  top: max(14px, env(safe-area-inset-top)); right: 14px;
  min-width: 44px; min-height: 44px;
  background: rgba(16,14,16,0.55); backdrop-filter: blur(8px);
  border: 1px solid rgba(242,236,230,0.18); border-radius: 999px;
  color: var(--ivory); font-family: var(--sans);
  font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
}
.audio-toggle[hidden] { display: none; }
```

- [ ] **Step 4: Verify the shell renders and the palette is live**

Run: `npm run serve` then open `http://localhost:8080` in Safari with the responsive viewport set to 390px wide.
Expected: a warm near-black page, no console errors other than the missing `story.json` fetch (Task 7 adds the fetch), and no horizontal scrollbar.

- [ ] **Step 5: Commit**

```bash
git add site/index.html site/css/app.css site/robots.txt
git commit -m "feat: document shell and design system"
```

---

## Task 7: Bootstrap and the reveal controller

**Files:**
- Create: `site/js/reveal.js`
- Create: `site/js/main.js`
- Create: `site/content/story.json` (a five-frame stub, replaced in Task 11)

**Interfaces:**
- Consumes: `renderStory` from `frames.js`; `normalizeDate`/`checkAnswer` from `gate.js` (wired in Task 8); `createAudio` from `audio.js` (wired in Task 9).
- Produces: `createRevealController({ root, onFirstReveal }) -> { observe(), disconnect() }`. Sets `.is-revealed`, swaps `data-src` to `src`, plays and pauses video by visibility, and drives `--pan` on ultra-wide media.

- [ ] **Step 1: Write the stub manifest**

`site/content/story.json` — enough to exercise every mechanism:

```json
{
  "meta": { "audio": "media/audio/theme.m4a", "gateAnswer": "04-29" },
  "frames": [
    { "type": "gate", "prompt": "What day did we first see each other?", "hint": "the day I couldn't stop talking about you" },
    { "type": "title", "kicker": "one year", "line": "of you and me", "cta": "tap to begin" },
    { "type": "chapter", "number": 1, "title": "April 29", "dateRange": "Apr 29 – Aug 10, 2025" },
    { "type": "photo", "src": "media/photos/0001.webp", "width": 1600, "height": 720, "date": "May 23, 2025", "caption": "Placeholder caption." },
    { "type": "end", "line": "Happy anniversary", "date": "August 11, 2026" }
  ]
}
```

- [ ] **Step 2: Verify the stub against the validator**

Run: `node tools/validate_story.mjs site/content/story.json`
Expected: `manifest valid`

- [ ] **Step 3: Write `site/js/reveal.js`**

```js
const REVEAL_MARGIN = '0px 0px -12% 0px';
const LOAD_MARGIN = '150% 0px 150% 0px'; // roughly two screens ahead
const PLAY_THRESHOLD = 0.55;

function swapInSource(media) {
  const src = media.dataset.src;
  if (!src || media.dataset.loaded === 'true') return;
  media.dataset.loaded = 'true';
  if (media.tagName === 'VIDEO') {
    media.preload = 'auto';
    media.src = src;
    media.load();
  } else {
    media.src = src;
  }
}

export function createRevealController({ root = document, onFirstReveal } = {}) {
  let announced = false;

  const revealer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-revealed');
      revealer.unobserve(entry.target);
      if (!announced && onFirstReveal) {
        announced = true;
        onFirstReveal();
      }
    }
  }, { rootMargin: REVEAL_MARGIN, threshold: 0.15 });

  const loader = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        swapInSource(entry.target);
        loader.unobserve(entry.target);
      }
    }
  }, { rootMargin: LOAD_MARGIN });

  const player = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= PLAY_THRESHOLD) {
        swapInSource(video);
        // Autoplay can still be refused; a silent catch keeps the poster visible.
        video.play().catch(() => {});
      } else if (!video.paused) {
        video.pause();
      }
    }
  }, { threshold: [0, PLAY_THRESHOLD, 1] });

  const panners = [];
  function registerPan(frame) {
    const media = frame.querySelector('.media');
    if (media) panners.push({ frame, media });
  }

  function updatePans() {
    const viewportHeight = window.innerHeight;
    for (const { frame, media } of panners) {
      const box = frame.getBoundingClientRect();
      if (box.bottom < 0 || box.top > viewportHeight) continue;
      // 0 when the frame's top enters the bottom edge, 1 when its bottom leaves the top.
      const progress = Math.min(Math.max(
        (viewportHeight - box.top) / (viewportHeight + box.height), 0), 1);
      const overflow = media.scrollWidth - frame.clientWidth;
      if (overflow > 0) {
        media.style.setProperty('--pan', `${-progress * overflow}px`);
      }
    }
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updatePans();
      ticking = false;
    });
  }

  return {
    observe() {
      for (const element of root.querySelectorAll('[data-reveal]')) revealer.observe(element);
      for (const media of root.querySelectorAll('img.media')) loader.observe(media);
      for (const video of root.querySelectorAll('video.media')) player.observe(video);
      for (const frame of root.querySelectorAll('.is-pan')) registerPan(frame);
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      updatePans();
    },
    disconnect() {
      revealer.disconnect();
      loader.disconnect();
      player.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    },
  };
}
```

Note the `--pan` unit: `frames.js` declares `transform: translateX(var(--pan, 0%))` and this sets pixels, which is valid for `translateX` and avoids a percentage-of-what ambiguity.

- [ ] **Step 4: Write `site/js/main.js`**

```js
import { renderStory } from './frames.js';
import { createRevealController } from './reveal.js';

async function loadStory() {
  const response = await fetch('content/story.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`story.json ${response.status}`);
  return response.json();
}

async function boot() {
  const story = await loadStory();
  const container = document.getElementById('story');
  container.innerHTML = renderStory(story.frames);

  const controller = createRevealController({ root: container });
  controller.observe();

  window.__story = story; // Tasks 8 and 9 read meta from here.
}

boot().catch((error) => {
  document.getElementById('story').innerHTML =
    '<p class="noscript">Something went wrong loading this. Try reopening it.</p>';
  console.error(error);
});
```

- [ ] **Step 5: Verify in the browser**

Run: `npm run serve`, open at 390px width, scroll slowly.
Expected: frames fade and rise once each; the photo's `src` appears in DevTools Network only as you approach it; no horizontal scroll; no layout shift when the image lands.

- [ ] **Step 6: Commit**

```bash
git add site/js/reveal.js site/js/main.js site/content/story.json
git commit -m "feat: bootstrap, reveal observers, lazy media and ultra-wide panning"
```

---

## Task 8: Gate behaviour

**Files:**
- Modify: `site/js/gate.js` (append `mountGate`)
- Modify: `site/js/main.js`
- Test: `tests/gate.test.mjs` (append)

**Interfaces:**
- Consumes: `checkAnswer` from Task 1.
- Produces: `mountGate({ container, expected, onPass, storage }) -> void`. Adds `shouldSkipGate(storage) -> boolean` and `rememberPass(storage) -> void`, both taking a storage object so they are testable without a browser.

- [ ] **Step 1: Write the failing test**

Append to `tests/gate.test.mjs`:

```js
import { shouldSkipGate, rememberPass, GATE_KEY } from '../site/js/gate.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    data,
  };
}

test('the gate is skipped only after a recorded pass', () => {
  assert.equal(shouldSkipGate(fakeStorage()), false);
  assert.equal(shouldSkipGate(fakeStorage({ [GATE_KEY]: 'true' })), true);
});

test('rememberPass records the pass', () => {
  const storage = fakeStorage();
  rememberPass(storage);
  assert.equal(storage.data[GATE_KEY], 'true');
  assert.equal(shouldSkipGate(storage), true);
});

test('missing storage never throws', () => {
  assert.equal(shouldSkipGate(null), false);
  assert.doesNotThrow(() => rememberPass(null));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `shouldSkipGate is not a function` / no export named `GATE_KEY`.

- [ ] **Step 3: Append the implementation to `site/js/gate.js`**

```js
export const GATE_KEY = 'anniversary.entered';

export function shouldSkipGate(storage) {
  try {
    return storage?.getItem(GATE_KEY) === 'true';
  } catch {
    return false; // Private browsing can throw on access.
  }
}

export function rememberPass(storage) {
  try {
    storage?.setItem(GATE_KEY, 'true');
  } catch {
    /* nothing to do — she just sees the gate again next time */
  }
}

// Wrong answers never lock her out; the third attempt surfaces the hint.
export function mountGate({ container, expected, onPass, storage = null }) {
  const gate = container.querySelector('#gate');
  const input = container.querySelector('#gate-input');
  const submit = container.querySelector('#gate-submit');
  const hint = container.querySelector('#gate-hint');
  if (!gate) return;

  if (shouldSkipGate(storage)) {
    gate.remove();
    onPass({ skipped: true });
    return;
  }

  let attempts = 0;

  function attempt() {
    if (checkAnswer(input.value, expected)) {
      rememberPass(storage);
      gate.style.transition = 'opacity 700ms var(--ease)';
      gate.style.opacity = '0';
      setTimeout(() => {
        gate.remove();
        window.scrollTo(0, 0);
        onPass({ skipped: false });
      }, 700);
      return;
    }
    attempts += 1;
    input.classList.add('is-wrong');
    input.value = '';
    if (attempts >= 3) hint.hidden = false;
    setTimeout(() => input.classList.remove('is-wrong'), 900);
  }

  submit.addEventListener('click', attempt);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') attempt();
  });
}
```

- [ ] **Step 4: Wire it into `site/js/main.js`**

Replace the body of `boot()` after the render line with:

```js
  const controller = createRevealController({ root: container });

  mountGate({
    container,
    expected: story.meta.gateAnswer,
    storage: window.localStorage,
    onPass: () => {
      document.body.classList.add('is-open');
      controller.observe();
    },
  });

  window.__story = story;
```

and add to the imports:

```js
import { mountGate } from './gate.js';
```

- [ ] **Step 5: Run tests and verify by hand**

Run: `npm test`
Expected: PASS — 8 gate tests.

Then `npm run serve` and check: `08/11` shakes the field and clears it; a third wrong answer reveals the hint; `april 29` fades the gate away and reveals the title; reloading skips the gate entirely.

- [ ] **Step 6: Commit**

```bash
git add site/js/gate.js site/js/main.js tests/gate.test.mjs
git commit -m "feat: date gate with forgiving retries and remembered entry"
```

---

## Task 9: Soundtrack

**Files:**
- Create: `site/js/audio.js`
- Modify: `site/js/main.js`
- Test: `tests/audio.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `createAudio(src, { element } = {}) -> { start(), fadeOut(ms), toggle(), isPlaying() }`. The `element` option injects a stub so this is unit-testable in Node with no DOM.

Audio is the single most fragile thing in the piece: iOS refuses playback without a user gesture, so `start()` is only ever called from the tap handler on the title card.

- [ ] **Step 1: Write the failing test**

`tests/audio.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../site/js/audio.js';

function stubElement() {
  return {
    src: '', loop: false, volume: 1, paused: true,
    play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; },
  };
}

test('start plays a looping track at full volume', async () => {
  const element = stubElement();
  const audio = createAudio('media/audio/theme.m4a', { element });
  await audio.start();
  assert.equal(element.src, 'media/audio/theme.m4a');
  assert.equal(element.loop, true);
  assert.equal(element.paused, false);
  assert.equal(audio.isPlaying(), true);
});

test('a refused autoplay is swallowed rather than thrown', async () => {
  const element = stubElement();
  element.play = () => Promise.reject(new Error('NotAllowedError'));
  const audio = createAudio('x.m4a', { element });
  await assert.doesNotReject(() => audio.start());
  assert.equal(audio.isPlaying(), false);
});

test('toggle pauses and resumes', async () => {
  const element = stubElement();
  const audio = createAudio('x.m4a', { element });
  await audio.start();
  await audio.toggle();
  assert.equal(element.paused, true);
  await audio.toggle();
  assert.equal(element.paused, false);
});

test('fadeOut ramps volume to zero and pauses', async () => {
  const element = stubElement();
  const audio = createAudio('x.m4a', { element });
  await audio.start();
  await audio.fadeOut(60);
  assert.equal(element.volume, 0);
  assert.equal(element.paused, true);
});

test('fadeOut is idempotent when already stopped', async () => {
  const element = stubElement();
  const audio = createAudio('x.m4a', { element });
  await assert.doesNotReject(() => audio.fadeOut(10));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../site/js/audio.js'`

- [ ] **Step 3: Write the implementation**

`site/js/audio.js`:

```js
const STEP_MS = 40;

export function createAudio(src, { element } = {}) {
  const media = element ?? new Audio();
  media.loop = true;
  media.preload = 'auto';
  let playing = false;
  let fading = false;

  async function start() {
    if (!media.src) media.src = src;
    media.volume = 1;
    try {
      await media.play();
      playing = true;
    } catch {
      playing = false; // iOS refused; the toggle stays available.
    }
  }

  async function toggle() {
    if (media.paused) {
      await start();
    } else {
      media.pause();
      playing = false;
    }
  }

  function fadeOut(ms = 4000) {
    if (fading || media.paused) return Promise.resolve();
    fading = true;
    const steps = Math.max(1, Math.round(ms / STEP_MS));
    const decrement = media.volume / steps;
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        const next = media.volume - decrement;
        if (next <= 0.001) {
          clearInterval(timer);
          media.volume = 0;
          media.pause();
          playing = false;
          fading = false;
          resolve();
        } else {
          media.volume = next;
        }
      }, STEP_MS);
    });
  }

  return { start, toggle, fadeOut, isPlaying: () => playing };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 5 audio tests.

- [ ] **Step 5: Wire it into `main.js`**

Add the import and replace `boot()`'s tail so the tap starts the music, a toggle appears, and reaching the end fades it out:

```js
import { createAudio } from './audio.js';

// ...inside boot(), after mountGate's onPass has been defined:

function mountAudio(story, container) {
  const audio = createAudio(story.meta.audio);

  const toggle = document.createElement('button');
  toggle.className = 'audio-toggle';
  toggle.type = 'button';
  toggle.hidden = true;
  toggle.textContent = 'sound on';
  toggle.addEventListener('click', async () => {
    await audio.toggle();
    toggle.textContent = audio.isPlaying() ? 'sound on' : 'sound off';
  });
  document.body.append(toggle);

  const begin = container.querySelector('#begin');
  if (begin) {
    begin.addEventListener('click', async () => {
      await audio.start();
      toggle.hidden = false;
      toggle.textContent = audio.isPlaying() ? 'sound on' : 'sound off';
      container.querySelector('.frame--chapter')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  const end = container.querySelector('#end');
  if (end) {
    new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          audio.fadeOut(4000);
          observer.disconnect();
        }
      }
    }, { threshold: 0.4 }).observe(end);
  }

  return audio;
}
```

Call `mountAudio(story, container)` inside `onPass`, immediately after `controller.observe()`.

- [ ] **Step 6: Verify on a real iPhone**

Serve over the LAN (`python3 -m http.server 8080 --directory site --bind 0.0.0.0`) and open it on the phone.
Expected: no sound until "tap to begin"; sound then plays; the toggle works; scrolling to the final card fades the music over four seconds.

- [ ] **Step 7: Commit**

```bash
git add site/js/audio.js site/js/main.js tests/audio.test.mjs
git commit -m "feat: soundtrack with gesture start, toggle and closing fade"
```

---

## Task 10: Offline support

**Files:**
- Create: `site/sw.js`
- Modify: `site/js/main.js`

**Interfaces:**
- Consumes: nothing.
- Produces: a registered service worker. Shell assets are precached; media is cached as she reaches it, so a second visit works with no signal.

- [ ] **Step 1: Write `site/sw.js`**

```js
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const MEDIA = `media-${VERSION}`;

const SHELL_ASSETS = [
  './',
  'index.html',
  'css/app.css',
  'js/main.js',
  'js/frames.js',
  'js/gate.js',
  'js/reveal.js',
  'js/audio.js',
  'content/story.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== SHELL && key !== MEDIA).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isMedia = url.pathname.includes('/media/');

  // Media: cache-first and permanent — it never changes once converted.
  if (isMedia) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((response) => {
        // Range requests for video come back as 206 and must not be cached.
        if (response.ok && response.status === 200) {
          const copy = response.clone();
          caches.open(MEDIA).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
    return;
  }

  // Shell: network-first so edits show up during development, cache as fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
```

- [ ] **Step 2: Register it from `main.js`**

Append to the end of `site/js/main.js`:

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline support is a bonus, never a blocker */
    });
  });
}
```

- [ ] **Step 3: Verify offline behaviour**

Run: `npm run serve`, load the page, scroll all the way to the end, then in DevTools set the network to Offline and reload.
Expected: it loads and scrolls through completely from cache. In Application → Cache Storage, `media-v1` holds every photo, poster, clip, and the audio track.

- [ ] **Step 4: Commit**

```bash
git add site/sw.js site/js/main.js
git commit -m "feat: service worker for offline playback after first pass"
```

---

## Task 11: Author the real manifest

**Files:**
- Modify: `site/content/story.json` (replace the stub entirely)
- Reference: `tools/measured.json`, `docs/mined/chapter-*.md`, `docs/mined/stats.json`

**Interfaces:**
- Consumes: `treatmentFor` behaviour from Task 2, dimensions from Task 4, quotes from Task 5, `validateStory` from Task 3.
- Produces: the finished content layer. Tasks 12 through 14 depend on it.

This is where the piece actually becomes a gift. Budget the most time here.

- [ ] **Step 1: Assign every asset to a chapter by capture date**

Run: `python3 -c "
import json
rows=[e for e in json.load(open('tools/measured.json')) if e['kind']!='audio']
for e in sorted(rows,key=lambda r:r['captured']):
    print(f\"{e['captured'][:10]:12} {e['kind']:7} {e['out']:28} {e['width']}x{e['height']}\")
"`

Expected: 34 rows in date order. Map them to the six chapter windows from the spec — Ch1 to Aug 10 2025; Ch2 Aug 11 to Nov 30 2025; Ch3 December 2025; Ch4 Jan 2026; Ch5 Feb to Apr 2026; Ch6 May to Jul 2026. The six letters carry no useful capture date (all photographed 2026-07-29), so place them by occasion: two in Ch1 (her 2025 travels), one in Ch3 (his birthday, Dec 29), one in Ch5 (Valentine's), one in Ch6 (his PhD, May 18), one held for Ch6's close.

- [ ] **Step 2: Read the mined quote sheets and choose exactly six exchanges**

Read `docs/mined/chapter-1.md` through `chapter-6.md`. Pick at most one per chapter, six total. Each becomes a `texts` frame with two to four messages and its real timestamp.

Mandatory: the Dec 9 2025 12:32am message about "the most significant progression / milestone" belongs in Chapter 3.

- [ ] **Step 3: Write the full manifest**

Replace `site/content/story.json`. Copy `width`/`height` verbatim from `tools/measured.json` — never guess. Shape, with real values filled in from the previous steps:

```json
{
  "meta": { "audio": "media/audio/theme.m4a", "gateAnswer": "04-29" },
  "frames": [
    { "type": "gate", "prompt": "What day did we first see each other?", "hint": "the day I couldn't stop talking about you" },
    { "type": "title", "kicker": "one year", "line": "of you and me", "cta": "tap to begin" },

    { "type": "chapter", "number": 1, "title": "April 29", "dateRange": "Apr 29 – Aug 10, 2025" },
    { "type": "interstitial", "line": "Before there were pictures of us, there were almost eighteen thousand words." },
    { "type": "photo", "src": "media/photos/0001.webp", "width": 1600, "height": 720, "date": "May 23, 2025", "caption": "…" },
    { "type": "letter", "src": "media/letters/0001.webp", "width": 3000, "height": 1352, "occasion": "while you were away, 2025" },
    { "type": "texts", "date": "…", "messages": [ { "from": "her", "body": "…" }, { "from": "him", "body": "…" } ] },

    { "type": "chapter", "number": 2, "title": "August 11", "dateRange": "Aug 11 – Nov 30, 2025" },
    { "type": "photo", "src": "media/photos/0015.webp", "width": 1200, "height": 1600, "date": "August 11, 2025 · 7:15 pm", "caption": "…" },

    { "type": "chapter", "number": 3, "title": "December", "dateRange": "December 2025" },
    { "type": "chapter", "number": 4, "title": "Point Reyes", "dateRange": "January 30 – 31, 2026" },
    { "type": "chapter", "number": 5, "title": "The ordinary months", "dateRange": "February – April 2026" },
    { "type": "chapter", "number": 6, "title": "May 18", "dateRange": "May – July 2026" },

    { "type": "numbers", "stats": [] },
    { "type": "missive", "lines": [], "signoff": "— me" },
    { "type": "end", "line": "Happy anniversary", "date": "August 11, 2026" }
  ]
}
```

Rules while authoring:

- Every one of the 19 photos, 9 clips, and 6 letters appears exactly once.
- One thought per caption, never a paragraph. Some photos need no caption at all — omit `caption` rather than padding it.
- The Aug 11 2025 photo (`IMG_20250905_174757.heic`, whichever numbered output it became) opens Chapter 2. It is the anchor image.
- Chapter 4's four photos and two clips run in capture order; it is the visual peak and needs no commentary.
- June 10 2026 gets a beat in Chapter 6 for her birthday, and the Jul 24 2026 photo is the last image before the closing frames.

- [ ] **Step 4: Validate and count**

Run:
```bash
node tools/validate_story.mjs site/content/story.json
python3 -c "
import json
frames=json.load(open('site/content/story.json'))['frames']
from collections import Counter
c=Counter(f['type'] for f in frames)
print(c)
assert c['photo']==19, f\"expected 19 photos, got {c['photo']}\"
assert c['video']==9,  f\"expected 9 videos, got {c['video']}\"
assert c['letter']==6, f\"expected 6 letters, got {c['letter']}\"
assert c['chapter']==6
assert c['texts']<=6, 'no more than six text exchanges'
print('counts ok ·', len(frames), 'frames total')
"
```
Expected: `manifest valid` then `counts ok`. Any assertion failure means an asset was dropped or duplicated.

- [ ] **Step 5: Read it on the phone end to end**

Serve over the LAN and scroll the whole thing on the actual device. Check that landscape photos are letterboxed rather than cropped, letters are legible without pinching, and the pacing lands the last chapter around three minutes in.

- [ ] **Step 6: Commit**

```bash
git add site/content/story.json
git commit -m "feat: author the full story manifest with all 34 assets placed"
```

---

## Task 12: The numbers and the letter

**Files:**
- Modify: `site/content/story.json` (the `numbers` and `missive` frames)

**Interfaces:**
- Consumes: `docs/mined/stats.json`.
- Produces: the finished closing sequence.

- [ ] **Step 1: Fill in the numbers frame with the four approved statistics**

Exact strings, verified against `docs/mined/stats.json`:

```json
{ "type": "numbers", "stats": [
  { "value": "260,993", "label": "words", "note": "We wrote each other something longer than Moby Dick and never once noticed." },
  { "value": "22,068", "label": "messages", "note": "About forty-eight a day, every day, for four hundred and fifty-six days." },
  { "value": "April 29, 2025", "label": "where the record starts", "note": "Our text history begins the same day I first saw you. There is no before." },
  { "value": "181,359", "label": "words from you", "note": "To my 79,634. For every word I sent, you sent more than two. I've read all of them." }
] }
```

Cross-check each against `stats.json`:

```bash
python3 -c "
import json
s=json.load(open('docs/mined/stats.json'))
print(f\"words {s['words']:,} · messages {s['messages']:,} · her {s['her']['words']:,} · him {s['him']['words']:,} · first {s['first']} · per day {s['per_day_average']} · span {s['span_days']}\")
"
```
Expected: `words 260,993 · messages 22,068 · her 181,359 · him 79,634 · first 2025-04-29 · per day 48 · span 456`

- [ ] **Step 2: Draft the letter from his own voice**

Read the `## Longest messages` sections of all six mined sheets — that is the corpus of how he actually writes to her. Draft eight to fourteen short lines, each its own array entry so each reveals separately as she scrolls. Concrete over abstract: a specific Tuesday beats "you mean everything to me."

Anchor at least one line in something only the two of them know, drawn from the mined material.

- [ ] **Step 3: Hand the draft over for rewriting**

Present the drafted lines for him to rewrite. **The final words must be his.** This is the one part of the project where a good-enough draft is worse than a rough sentence he actually means.

- [ ] **Step 4: Validate and read aloud**

Run: `node tools/validate_story.mjs site/content/story.json`
Expected: `manifest valid`

Then read the letter out loud on the phone. If any line would be embarrassing to say to her face, cut it.

- [ ] **Step 5: Commit**

```bash
git add site/content/story.json
git commit -m "feat: closing numbers and letter"
```

---

## Task 13: Deploy to GitHub Pages

**Files:**
- Create: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: the contents of `site/`.
- Produces: a live URL.

- [ ] **Step 1: Confirm nothing private is staged**

Run:
```bash
git status --porcelain
git ls-files | grep -E '^data/' || echo "OK: no data/ files tracked"
git ls-files | grep -i 'tejasvi' || echo "OK: export not tracked"
du -sh site
```
Expected: both `OK:` lines print, and `site/` is under 20MB. **If the export is tracked, stop and remove it from history before pushing** — it cannot be undone after a push.

- [ ] **Step 2: Write the workflow**

`.github/workflows/pages.yml`:

```yaml
name: Deploy site
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Create the repository with an unguessable name**

Run:
```bash
gh repo create rr-2f9c41 --public --source=. --remote=origin --push
gh api -X POST repos/:owner/rr-2f9c41/pages -f build_type=workflow || true
```
The name must contain no names, no dates, and not the word "anniversary". Substitute your own random string for `rr-2f9c41`.

- [ ] **Step 4: Verify the deployment**

Run:
```bash
gh run watch
curl -sI "$(gh api repos/:owner/rr-2f9c41/pages --jq .html_url)" | head -n 1
curl -s "$(gh api repos/:owner/rr-2f9c41/pages --jq .html_url)robots.txt"
```
Expected: `HTTP/2 200`, and `robots.txt` returns `User-agent: *` / `Disallow: /`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/pages.yml
git commit -m "ci: deploy site/ to GitHub Pages"
git push
```

---

## Task 14: Device verification

**Files:**
- Create: `docs/verification.md`

**Interfaces:**
- Consumes: the deployed URL.
- Produces: a signed-off checklist. This is the last gate before she sees it.

Run every check on a real iPhone against the live URL, **with wifi turned off** — those are the actual delivery conditions.

- [ ] **Step 1: Run the checklist and record results in `docs/verification.md`**

```markdown
# Verification — iPhone, cellular, live URL

Device / iOS: ______   Date: ______

## Gate
- [ ] `04/29`, `4/29`, `0429`, `april 29`, `Apr 29th` all pass
- [ ] `08/11` fails without locking anything
- [ ] Third wrong answer reveals the hint
- [ ] Field does not zoom the page on focus
- [ ] Reload skips the gate

## Audio — the most fragile part
- [ ] Silent until "tap to begin"
- [ ] Plays on tap, first try
- [ ] Toggle mutes and unmutes
- [ ] Fades out over ~4s on the final card
- [ ] Track loops without an audible seam

## Media
- [ ] Landscape photos are letterboxed, never cropped through faces
- [ ] The portrait photo goes full-bleed
- [ ] Small originals are inset, not stretched
- [ ] All 9 clips autoplay muted and loop
- [ ] Every one of the 6 letters is legible without pinch-zoom
- [ ] Ultra-wide letters pan smoothly, no stutter

## Layout
- [ ] No horizontal scroll anywhere
- [ ] Nothing hidden under the notch or home indicator
- [ ] No layout shift as media loads
- [ ] Verified at 390px width

## Performance
- [ ] First screen under 400KB (DevTools, throttled)
- [ ] Total transfer for a full pass: ______ MB (target 15–20)
- [ ] No stall longer than one second while scrolling

## Offline
- [ ] Full pass, then airplane mode, then reload: plays start to finish

## Content
- [ ] All 19 photos, 9 clips, 6 letters present
- [ ] Six or fewer text exchanges
- [ ] Every date correct
- [ ] Every statistic matches `docs/mined/stats.json`
- [ ] Read aloud: it sounds like him
```

- [ ] **Step 2: Fix anything that failed, then re-run the affected section**

Any failure goes back to its owning task: gate to Task 8, audio to Task 9, treatments to Task 2, offline to Task 10, content to Tasks 11 and 12.

- [ ] **Step 3: Commit**

```bash
git add docs/verification.md
git commit -m "docs: device verification checklist, signed off"
git push
```

---

## Self-Review

**Spec coverage.** Spec §1 success criteria map to Tasks 9, 11, 12 and 14. §2 inventory to Tasks 4 and 5. §3 arc to Tasks 2, 7 and 11. §4 treatments to Task 2 (`treatmentFor`) and Task 6 (CSS). §5 numbers to Task 12. §6 words to Tasks 5 and 12. §6a visual language to Task 6. §7 architecture to Tasks 1–3 and 7. §8 privacy to Tasks 6 and 13. §9 performance and offline to Tasks 4, 7 and 10. §10 testing to Task 14. §11 the letter to Task 12 Step 3.

**Placeholders.** The `"…"` strings in Task 11 Step 3 are deliberate: that task's deliverable *is* filling them, and Step 4's assertions fail until every asset is placed. No other step defers work.

**Type consistency.** `treatmentFor`, `renderFrame`, `renderStory`, `escapeHtml` (Task 2) are consumed under those exact names in Tasks 3 and 7. `normalizeDate`, `checkAnswer`, `shouldSkipGate`, `rememberPass`, `GATE_KEY`, `mountGate` (Tasks 1 and 8) match their call sites in `main.js`. `createRevealController({root, onFirstReveal})` returning `{observe, disconnect}` matches Task 7's usage. `createAudio(src, {element})` returning `{start, toggle, fadeOut, isPlaying}` matches Tasks 9's tests and wiring. `validateStory(manifest) -> string[]` matches Tasks 7, 11 and 12. `Message(ts, direction, body)` and `compute_stats` keys (`messages`, `words`, `her.words`, `him.words`, `first`, `per_day_average`, `span_days`) match the assertions in Task 12 Step 1. The `--pan` custom property is declared in `frames.js` CSS (Task 6) and written in pixels by `reveal.js` (Task 7).
