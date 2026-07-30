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
