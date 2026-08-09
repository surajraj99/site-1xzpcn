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
