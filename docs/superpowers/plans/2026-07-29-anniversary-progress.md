# Anniversary Gift Implementation Progress

**Status:** Paused after Task 4, per request  
**Branch:** `build`  
**Main plan:** `docs/superpowers/plans/2026-07-29-anniversary-scroll-story.md`

## Completed and reviewed

### Task 1 — Gate date parser

- Added a dependency-free, pure date parser.
- Accepts normal numeric and month-name formats for April 29.
- Rejects embedded junk, invalid dates, malformed years, and invalid month words.
- Added regression tests for 53 accepted/rejected cases.
- Review completed after two fix rounds.

### Task 2 — Pure frame renderers

- Added renderers for all 11 planned frame types.
- Added aspect-ratio treatments: portrait, still, pan, and inset.
- Added HTML escaping for captions, text messages, letters, and other content.
- Deferred both media sources and video posters using `data-src` and `data-poster`.
- Added prototype-key dispatch protection and boundary tests.
- Review completed after one fix round.

### Task 3 — Story manifest validator

- Added manifest validation for frame types, required fields, media dimensions, duplicate media,
  nested messages/statistics/letter lines, and ordering.
- Added CLI validation with useful diagnostics.
- Hardened validation against null, primitive, and incorrectly typed nested values.
- Review completed after one fix round.

### Task 4 — Media conversion pipeline, initial implementation

- Added `tools/build_media.sh`.
- Converted:
  - 19 photos to WebP
  - 9 videos to muted H.264 MP4
  - 9 video poster frames
  - 6 letter scans to WebP
  - 1 soundtrack to AAC/M4A
- Added measured dimensions to `tools/measured.json`.
- Verified output dimensions and orientation handling.
- Verified exact output size: 18,672,265 bytes, under the 20MB target.
- Confirmed the private `data/` directory remains untracked.

## Task 4 review status

Task 4 is **not yet approved**. The review found these hardening issues:

1. `measured.json` is assembled by interpolating strings directly into JSON. It should use a
   JSON-aware writer so filenames or metadata cannot produce invalid JSON.
2. Public derivatives should strip source metadata, especially capture dates, before deployment.
3. Rebuilding should remove only the pipeline's managed numbered outputs first, preventing stale
   derivatives from remaining after an input is removed.
4. Audio selection should be deterministic and fail clearly unless exactly one MP3 exists.
5. The manifest should be written to a temporary file and atomically renamed only after a
   successful conversion.

An attempt to dispatch the Task 4 fix was interrupted when this work was paused. No fix for these
items has been committed yet.

## Remaining tasks

Tasks 5–14 remain untouched:

1. Text mining and candidate quote sheets
2. Document shell and modern romantic visual system
3. Bootstrap, lazy loading, reveal animations, and ultra-wide panning
4. Date gate DOM behavior
5. Soundtrack controls and fade-out
6. Service worker and offline caching
7. Full story manifest with all 34 media assets
8. Verified statistics and the closing letter
9. GitHub Pages deployment
10. Real-iPhone cellular/offline verification

## Important implementation decisions already recorded

- Use `ui-serif` / New York and `system-ui` / SF Pro instead of downloaded webfonts.
- Use warm near-black, ivory, rose, amber, and muted gray.
- Keep modern structure and restrained motion; use the photos, letters, and real texts for
  romance rather than decorative hearts, scripts, or glitter.
- Treat square and near-square media as letterboxed stills; reserve full-bleed treatment for
  genuinely portrait media.
- Keep `data/` gitignored and never deploy the raw XML export.

## Verification so far

The current branch contains the initial Task 4 commit and all preceding reviewed work. The latest
commits are:

```text
2087c1e feat: media pipeline and converted web derivatives
d84fc8e fix: harden story manifest validation
2a4badd feat: story manifest validator
```

The next session should resume by fixing and re-reviewing Task 4 before starting Task 5.
