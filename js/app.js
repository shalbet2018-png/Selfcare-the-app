import * as store from './store.js';
import { onRoute, parse, go } from './router.js';
import { icon, esc } from './ui.js';
import * as client from './client.js';
import * as biz from './business.js';

const NAV = {
  client: [
    { href: '#/', label: 'Home', icon: 'home', match: (p) => p.length === 0 },
    { href: '#/search', label: 'Search', icon: 'search', match: (p) => ['search', 'provider', 'book'].includes(p[0]) },
    { href: '#/bookings', label: 'Bookings', icon: 'calendar', match: (p) => ['bookings', 'booking'].includes(p[0]) },
    { href: '#/profile', label: 'Profile', icon: 'user', match: (p) => p[0] === 'profile' }
  ],
  business: [
    { href: '#/biz', label: 'Dashboard', icon: 'grid', match: (p) => p[0] === 'biz' && !p[1] },
    { href: '#/biz/services', label: 'Services', icon: 'list', match: (p) => p[1] === 'services' },
    { href: '#/biz/account', label: 'Account', icon: 'user', match: (p) => p[1] === 'account' || p[1] === 'register' }
  ]
};

function resolve(parts, params) {
  const [a, b, c] = parts;
  if (a === 'biz') {
    if (!b) return biz.dashboard();
    if (b === 'register') return biz.register();
    if (b === 'services') return biz.services();
    if (b === 'account') return biz.account();
    return client.notFound();
  }
  if (!a) return client.home();
  if (a === 'search') return client.search(params);
  if (a === 'provider') return client.provider(b);
  if (a === 'book') return client.book(b, c);
  if (a === 'bookings') return client.bookings();
  if (a === 'booking') return client.bookingDetail(b);
  if (a === 'profile') return client.profile();
  return client.notFound();
}

const view = document.getElementById('view');
const nav = document.getElementById('nav');
const stage = document.getElementById('bg-stage');
let lastPath = null;

function render({ keepScroll = false } = {}) {
  const { parts, params } = parse();
  const side = parts[0] === 'biz' ? 'business' : 'client';
  if (store.get().mode !== side) store.set({ mode: side });

  const v = resolve(parts, params);
  const path = parts.join('/');
  const samePage = path === lastPath;
  lastPath = path;

  // Fresh element each time so old listeners are dropped.
  const main = document.createElement('div');
  main.className = 'view-inner';
  main.innerHTML = v.html;
  view.replaceChildren(main);
  if (v.bind) v.bind(main);

  document.title = v.title ? `${v.title} · Selfcare${side === 'business' ? ' for Business' : ''}` : 'Selfcare';
  document.body.classList.toggle('is-dark', !!v.dark);
  stage.dataset.theme = v.theme || 'hair';
  document.querySelector('meta[name="theme-color"]').content = v.dark ? '#221E27' : '#F4EEF0';

  nav.innerHTML = `
    <a class="brand" href="${side === 'business' ? '#/biz' : '#/'}">selfcare${side === 'business' ? '<span> for Business</span>' : ''}</a>
    ${NAV[side].map((n) => {
      const on = n.match(parts);
      return `<a class="nav-link${on ? ' is-on' : ''}" href="${n.href}"${on ? ' aria-current="page"' : ''}>${icon(n.icon)}<span>${esc(n.label)}</span></a>`;
    }).join('')}`;

  if (!(keepScroll && samePage)) {
    window.scrollTo(0, 0);
    main.querySelector('h1')?.focus({ preventScroll: true });
  }
}

document.querySelector('[data-skip]').addEventListener('click', () => {
  (view.querySelector('h1') || view).focus();
});

onRoute(render);
if (!location.hash && store.get().mode === 'business') history.replaceState(null, '', '#/biz');
render();

// Offline support and home-screen install.
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

export { go };
