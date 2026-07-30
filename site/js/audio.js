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
