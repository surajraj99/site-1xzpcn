# One year

A private, phone-first anniversary story. It is a static site designed to be
read as a single scrolling piece: a gentle date gate, six chapters of photos,
silent video, letters, a few text exchanges, verified relationship statistics,
and a closing letter. It is intended to be hosted on GitHub Pages and to work
offline after its first complete visit.

## Privacy

The source photos, videos, audio, and message export live in `data/`, which is
ignored by Git and must never be committed. `site/media/` contains the
converted derivatives that are intentionally published with the site. The
deployed site also uses `noindex` metadata and `robots.txt`, but those are
polite requests rather than access control; GitHub Pages itself is public.

## Project layout

| Path | Purpose |
| --- | --- |
| `site/index.html` | Static document shell and metadata |
| `site/content/story.json` | The full ordered story and its copy |
| `site/css/app.css` | Visual language, layout, and motion |
| `site/js/frames.js` | Pure story-frame renderers |
| `site/js/gate.js` | Date parsing and gate behaviour |
| `site/js/reveal.js` | Reveal, lazy-load, video, and pan observers |
| `site/js/audio.js` | User-initiated soundtrack playback and final fade |
| `site/sw.js` | Offline shell and media caching |
| `tools/` | Local-only media conversion, validation, and text-mining helpers |
| `tests/` | Node tests for pure browser modules |

There is no framework, package dependency, or build step. The browser renders
the story directly from the JSON manifest.

## Preview locally

From the repository root, start the static server:

```sh
npm run serve
```

Open [http://localhost:8080](http://localhost:8080) on this laptop. Keep that
terminal running while previewing.

To view the same current working copy on a phone, connect the phone and laptop
to the same Wi-Fi network, then open this laptop's LAN address with the same
port. At the time this README was written, that address is:

```
http://192.168.1.194:8080
```

LAN addresses can change. To get the current Wi-Fi address on this Mac, run:

```sh
ipconfig getifaddr en0
```

Then open `http://<that-address>:8080` on the phone. If it does not load,
confirm both devices are on the same non-guest network and allow the incoming
connection in macOS Firewall if prompted. Use the phone preview for the final
checklist in `docs/verification.md`; it catches Safari-specific audio,
safe-area, and offline behaviour that desktop preview cannot.

## Validate changes

```sh
npm test
node tools/validate_story.mjs site/content/story.json
python3 -m unittest tools.tests.test_mine_texts
```

The first command covers the JavaScript modules, the second checks the story
manifest's structure and media references, and the third checks the local text
mining utility.

## Deployment

Pushing `main` triggers `.github/workflows/pages.yml`, which deploys only the
`site/` directory to GitHub Pages. Before publishing, complete the live iPhone,
cellular, and offline checks in `docs/verification.md`.

## Content sources

`docs/mined/stats.json` is the current source of verified text-history counts.
The chapter files in `docs/mined/` are working quote sheets. The design spec
and implementation plan under `docs/superpowers/` explain the intended
experience and implementation decisions; some older figures in the design
spec predate the current mined statistics.
