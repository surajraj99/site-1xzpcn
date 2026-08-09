import { renderStory } from './frames.js';
import { createRevealController } from './reveal.js';
import { mountGate } from './gate.js';
import { createAudio } from './audio.js';

async function loadStory() {
  const response = await fetch('content/story.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`story.json ${response.status}`);
  return response.json();
}

async function boot() {
  const story = await loadStory();
  const container = document.getElementById('story');
  container.innerHTML = renderStory(story.frames);

  const controller = createRevealController({ root: container });

  mountGate({
    container,
    expected: story.meta.gateAnswer,
    storage: window.localStorage,
    onPass: () => {
      document.body.classList.add('is-open');
      controller.observe();
      mountAudio(story, container);
    },
  });

  window.__story = story; // Tasks 8 and 9 read meta from here.
}

function mountAudio(story, container) {
  const audio = createAudio(story.meta.audio);

  const toggle = document.createElement('button');
  toggle.className = 'audio-toggle';
  toggle.type = 'button';
  toggle.hidden = true;
  function updateToggle() {
    const playing = audio.isPlaying();
    toggle.textContent = playing ? 'sound on' : 'sound off';
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.setAttribute('aria-label', playing ? 'Turn sound off' : 'Turn sound on');
  }
  toggle.addEventListener('click', async () => {
    await audio.toggle();
    updateToggle();
  });
  document.body.append(toggle);

  const begin = container.querySelector('#begin');
  if (begin) {
    begin.addEventListener('click', async () => {
      await audio.start();
      toggle.hidden = false;
      updateToggle();
      container.querySelector('.frame--chapter')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  const end = container.querySelector('#end');
  if (end) {
    new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          audio.fadeOut(4000);
          observer.disconnect();
        }
      }
    }, { threshold: 0.4 }).observe(end);
  }

  return audio;
}

boot().catch((error) => {
  document.getElementById('story').innerHTML =
    '<p class="noscript">Something went wrong loading this. Try reopening it.</p>';
  console.error(error);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* offline support is a bonus, never a blocker */
    });
  });
}
