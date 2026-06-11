// Herbert HQ boot: store init, routes, nav, re-render on every state change.
import { init, subscribe, state } from './store.js';
import { route, parse } from './router.js';
import * as dashboard from './views/dashboard.js';
import * as classDetail from './views/classDetail.js';
import * as whatif from './views/whatif.js';
import * as gpa from './views/gpa.js';
import * as calendar from './views/calendar.js';
import * as todos from './views/todos.js';
import * as importView from './import/syllabus.js';
import * as settings from './views/settings.js';
import * as more from './views/more.js';

// Tell the boot guard in index.html the module graph loaded fine.
window.__hqBooted?.();

const app = document.getElementById('app');

route('/', dashboard.render);
route('/class/:id', classDetail.render);
route('/whatif', whatif.render);
route('/gpa', gpa.render);
route('/calendar', calendar.render);
route('/todos', todos.render);
route('/import', importView.render);
route('/settings', settings.render);
route('/more', more.render);

function renderRoute() {
  if (!state.ready) return;
  const { render, params, path } = parse();
  render(app, params);
  // nav active states (desktop sidebar + mobile tab bar share data-nav)
  document.querySelectorAll('[data-nav]').forEach(a => {
    const target = a.dataset.nav;
    const active = target === '/' ? (path === '/' || path.startsWith('/class')) : path.startsWith(target);
    a.classList.toggle('active', active);
  });
  app.scrollTop = 0;
}

window.addEventListener('hashchange', renderRoute);
// Any data change re-renders the current view: grades, GPA, priorities,
// study plans, and calendars all recompute — no refresh button anywhere.
subscribe(renderRoute);

init().then(renderRoute).catch(err => {
  app.innerHTML = `<div class="page"><h2 class="h-3">Couldn't load your data</h2>
    <p class="body-sm">${err.message}</p>
    <p class="caption">If this persists, your browser may be blocking IndexedDB (private browsing?).</p></div>`;
});

// PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline-first is a bonus, not a blocker */ });
  });
}
