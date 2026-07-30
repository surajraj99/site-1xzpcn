import { renderStory } from './frames.js';
import { createRevealController } from './reveal.js';
import { mountGate } from './gate.js';

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
    },
  });

  window.__story = story; // Tasks 8 and 9 read meta from here.
}

boot().catch((error) => {
  document.getElementById('story').innerHTML =
    '<p class="noscript">Something went wrong loading this. Try reopening it.</p>';
  console.error(error);
});
