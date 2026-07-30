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
  // Anything at least as wide as it is tall is letterboxed. Full-bleed is reserved for
  // genuinely portrait media: cropping a square to a phone screen loses the subject too.
  if (ratio >= 1.0) return 'still';
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
      <video class="media" data-src="${escapeHtml(f.src)}" data-poster="${escapeHtml(f.poster)}"
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
  // hasOwn, not a truthiness check: `{type: 'toString'}` would otherwise resolve through
  // Object.prototype and render garbage instead of failing loudly.
  if (!Object.hasOwn(RENDERERS, frame.type)) {
    throw new Error(`unknown frame type: ${frame.type}`);
  }
  return RENDERERS[frame.type](frame);
}

export function renderStory(frames) {
  return frames.map(renderFrame).join('\n');
}
