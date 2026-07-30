const REVEAL_MARGIN = '0px 0px -12% 0px';
const LOAD_MARGIN = '150% 0px 150% 0px'; // roughly two screens ahead
const PLAY_THRESHOLD = 0.55;

function swapInSource(media) {
  const src = media.dataset.src;
  if (!src || media.dataset.loaded === 'true') return;
  media.dataset.loaded = 'true';
  if (media.tagName === 'VIDEO') {
    // The poster is deferred too — a `poster` attribute is fetched immediately even under
    // preload="none", and nine posters loaded upfront would blow the first-screen budget.
    if (media.dataset.poster) media.poster = media.dataset.poster;
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
