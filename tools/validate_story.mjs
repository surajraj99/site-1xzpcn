import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

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
const COLLECTIONS = {
  texts: 'messages',
  numbers: 'stats',
  missive: 'lines',
};

export function validateStory(manifest, { assetExists } = {}) {
  const errors = [];
  const frames = manifest?.frames;

  if (!manifest?.meta || typeof manifest.meta !== 'object') errors.push('missing meta object');
  else {
    if (!/^\d{2}-\d{2}$/.test(manifest.meta.gateAnswer ?? '')) {
      errors.push('meta.gateAnswer must be MM-DD, e.g. "04-29"');
    }
    if (!manifest.meta.audio) errors.push('missing meta.audio');
    else if (assetExists && !assetExists(manifest.meta.audio)) {
      errors.push(`missing audio asset ${manifest.meta.audio}`);
    }
  }

  if (!Array.isArray(frames) || frames.length === 0) {
    errors.push('frames must be a non-empty array');
    return errors;
  }

  if (frames[0]?.type !== 'gate') errors.push('first frame must be the gate');
  if (frames.at(-1)?.type !== 'end') errors.push('last frame must be the end card');

  const seenMedia = new Set();

  frames.forEach((frame, index) => {
    if (frame === null || typeof frame !== 'object' || Array.isArray(frame)) {
      errors.push(`frame ${index}: must be an object`);
      return;
    }
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
    const collection = COLLECTIONS[frame.type];
    if (collection && !Array.isArray(frame[collection])) {
      errors.push(`frame ${index}: ${collection} must be an array`);
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
        if (assetExists && !assetExists(frame.src)) {
          errors.push(`frame ${index}: missing media asset ${frame.src}`);
        }
      }
      if (frame.type === 'video' && frame.poster && assetExists && !assetExists(frame.poster)) {
        errors.push(`frame ${index}: missing poster asset ${frame.poster}`);
      }
    }
    if (frame.type === 'texts' && Array.isArray(frame.messages)) {
      frame.messages.forEach((message, m) => {
        if (message === null || typeof message !== 'object' || Array.isArray(message)) {
          errors.push(`frame ${index} message ${m}: must be an object`);
          return;
        }
        if (message.from !== 'her' && message.from !== 'him') {
          errors.push(`frame ${index} message ${m}: from must be "her" or "him"`);
        }
        if (!message.body) errors.push(`frame ${index} message ${m}: missing body`);
      });
    }
    if (frame.type === 'numbers' && Array.isArray(frame.stats)) {
      frame.stats.forEach((stat, s) => {
        if (stat === null || typeof stat !== 'object' || Array.isArray(stat)) {
          errors.push(`frame ${index} stat ${s}: must be an object`);
          return;
        }
        for (const key of ['value', 'label', 'note']) {
          if (!stat[key]) errors.push(`frame ${index} stat ${s}: missing ${key}`);
        }
      });
    }
  });

  return errors;
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly && process.argv[2]) {
  const manifestPath = resolve(process.argv[2]);
  const siteRoot = resolve(dirname(manifestPath), '..');
  const assetExists = (asset) => {
    const path = resolve(siteRoot, asset);
    return relative(siteRoot, path) && !relative(siteRoot, path).startsWith('..') && existsSync(path);
  };
  const errors = validateStory(JSON.parse(readFileSync(manifestPath, 'utf8')), { assetExists });
  if (errors.length) {
    console.error(`${errors.length} problem(s) in ${process.argv[2]}:`);
    for (const error of errors) console.error('  -', error);
    process.exit(1);
  }
  console.log('manifest valid');
}
