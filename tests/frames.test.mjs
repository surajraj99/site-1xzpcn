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
  assert.ok(!/\ssrc="media\/photos\/0004\.webp"/.test(html), 'src must stay lazy until revealed');
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
