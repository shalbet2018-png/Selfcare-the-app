import { money } from './config.js';
import { fromPrice } from './data.js';

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const paths = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M16 13h2M3 10h18"/>',
  swap: '<path d="M7 7h13l-3-3M17 17H4l3 3"/>'
};

export function icon(name, size = 22) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
}

export function providerCard(p) {
  const modes = p.modes.map((m) => `<span class="chip">${m === 'shop' ? 'At the shop' : 'Comes to you'}</span>`).join('');
  return `
  <article class="provider glass">
    <a class="provider-link" href="#/provider/${esc(p.id)}">
      <div class="provider-photo ph-${esc(p.category)}"><span>Photo</span></div>
      <div class="provider-body">
        <div class="provider-top">
          <h3>${esc(p.name)}</h3>
          <span class="badge">${icon('check', 12)} Verified</span>
        </div>
        <p class="muted small">${esc(p.area)} · ${p.km.toFixed(1)} km · ${icon('star', 13)} ${p.rating.toFixed(1)}</p>
        <div class="chips">${modes}</div>
        <p class="price">From <strong>${money(fromPrice(p))}</strong></p>
      </div>
    </a>
  </article>`;
}

export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('is-on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('is-on'), 2800);
}

export function segmented(name, options, value, label) {
  return `<div class="segmented" role="group" aria-label="${esc(label)}">${options
    .map((o) => `<button type="button" class="seg-btn${o.id === value ? ' is-on' : ''}" aria-pressed="${o.id === value}" data-action="${esc(name)}" data-value="${esc(o.id)}">${esc(o.label)}</button>`)
    .join('')}</div>`;
}
