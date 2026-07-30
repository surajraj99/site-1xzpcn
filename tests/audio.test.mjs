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
