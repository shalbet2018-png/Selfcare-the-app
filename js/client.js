// Selfcare (client) screens.
import { CATEGORIES, PROVIDERS, providerById, fromPrice } from './data.js';
import { money, travelFee, SERVICE_FEE, SERVICE_FEE_LABEL, PAYMENT_METHODS, ARRIVED_CANCEL_FEE, CITY } from './config.js';
import * as store from './store.js';
import { esc, icon, providerCard, toast, segmented } from './ui.js';
import { go } from './router.js';

const MODE_OPTIONS = [
  { id: 'shop', label: 'At the shop' },
  { id: 'home', label: 'Come to me' }
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/* ---------------- Home ---------------- */
export function home() {
  const s = store.get();
  const nearby = PROVIDERS.filter((p) => p.modes.includes(s.serviceMode)).sort((a, b) => a.km - b.km);
  return {
    title: 'Home',
    theme: 'hair',
    html: `
      <section class="hero-block">
        <p class="eyebrow">${greeting()} · ${CITY}</p>
        <h1 tabindex="-1">Time for you.</h1>
        <form class="search-bar glass" data-form="search" role="search">
          <label class="visually-hidden" for="q">Search services</label>
          ${icon('search', 18)}
          <input id="q" name="q" type="search" placeholder="Braids, gel nails, lash fill…" autocomplete="off">
          <button class="btn btn-dark" type="submit">Search</button>
        </form>
        ${segmented('serviceMode', MODE_OPTIONS, s.serviceMode, 'Where the service happens')}
      </section>

      <section class="block">
        <div class="block-head"><h2>Categories</h2></div>
        <div class="cat-grid">
          ${CATEGORIES.map((c) => `
            <a class="cat glass" href="#/search?cat=${c.id}">
              <span class="cat-title">${esc(c.label)}</span>
              <span class="muted small">${esc(c.blurb)}</span>
            </a>`).join('')}
        </div>
      </section>

      <section class="block">
        <div class="block-head">
          <h2>${s.serviceMode === 'home' ? 'Can come to you' : 'Near you'}</h2>
          <a href="#/search">See all</a>
        </div>
        <div class="provider-grid">${nearby.map(providerCard).join('')}</div>
      </section>`,
    bind(root) {
      root.querySelector('[data-form="search"]').addEventListener('submit', (e) => {
        e.preventDefault();
        const q = new FormData(e.target).get('q') || '';
        go(`#/search?q=${encodeURIComponent(q)}`);
      });
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-action="serviceMode"]');
        if (b) { store.set({ serviceMode: b.dataset.value }); go(location.hash, { replace: true }); }
      });
    }
  };
}

/* ---------------- Search and filters ---------------- */
export function search(params) {
  const s = store.get();
  const f = {
    q: params.get('q') || '',
    cat: params.get('cat') || '',
    max: params.get('max') || '',
    mode: params.get('mode') || s.serviceMode,
    sort: params.get('sort') || 'distance'
  };

  function results() {
    const q = f.q.trim().toLowerCase();
    let list = PROVIDERS.filter((p) =>
      (!f.cat || p.category === f.cat) &&
      (!f.max || fromPrice(p) <= Number(f.max)) &&
      (f.mode === 'any' || p.modes.includes(f.mode)) &&
      (!q || p.name.toLowerCase().includes(q) || p.category.includes(q) || p.services.some((sv) => sv.name.toLowerCase().includes(q)))
    );
    const by = { distance: (a, b) => a.km - b.km, price: (a, b) => fromPrice(a) - fromPrice(b), rating: (a, b) => b.rating - a.rating };
    list = list.sort(by[f.sort]);
    return list.length
      ? `<p class="muted small" role="status">${list.length} provider${list.length === 1 ? '' : 's'}</p><div class="provider-grid">${list.map(providerCard).join('')}</div>`
      : `<div class="empty glass"><h3>No matches yet</h3><p class="muted">Try a higher price limit, another category, or switch between shop and home service.</p></div>`;
  }

  const catTitle = CATEGORIES.find((c) => c.id === f.cat)?.label;
  return {
    title: catTitle || 'Search',
    theme: f.cat || 'lashes',
    html: `
      <a class="back" href="#/">${icon('back', 18)} Home</a>
      <h1 tabindex="-1">${esc(catTitle || 'Find a service')}</h1>
      <form class="filters glass" data-form="filters">
        <label class="field grow">Search
          <input name="q" type="search" value="${esc(f.q)}" placeholder="Service or provider">
        </label>
        <label class="field">Category
          <select name="cat">
            <option value="">All</option>
            ${CATEGORIES.map((c) => `<option value="${c.id}"${c.id === f.cat ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}
          </select>
        </label>
        <label class="field">Price up to
          <select name="max">
            ${[['', 'Any price'], ['1000', money(1000)], ['2000', money(2000)], ['3000', money(3000)], ['5000', money(5000)]]
              .map(([v, l]) => `<option value="${v}"${v === f.max ? ' selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <label class="field">Where
          <select name="mode">
            ${[['any', 'Shop or home'], ['shop', 'At the shop'], ['home', 'Come to me']]
              .map(([v, l]) => `<option value="${v}"${v === f.mode ? ' selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <label class="field">Sort by
          <select name="sort">
            ${[['distance', 'Nearest'], ['price', 'Lowest price'], ['rating', 'Top rated']]
              .map(([v, l]) => `<option value="${v}"${v === f.sort ? ' selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
      </form>
      <div data-results>${results()}</div>`,
    bind(root) {
      const form = root.querySelector('[data-form="filters"]');
      const out = root.querySelector('[data-results]');
      const update = () => {
        const fd = new FormData(form);
        Object.keys(f).forEach((k) => { f[k] = fd.get(k) ?? f[k]; });
        out.innerHTML = results();
        const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
        history.replaceState(null, '', `#/search?${qs}`);
      };
      form.addEventListener('input', update);
      form.addEventListener('submit', (e) => { e.preventDefault(); update(); });
    }
  };
}

/* ---------------- Provider profile ---------------- */
export function provider(id) {
  const p = providerById(id);
  if (!p) return notFound();
  return {
    title: p.name,
    theme: p.category,
    html: `
      <a class="back" href="#/search">${icon('back', 18)} Results</a>
      <div class="profile-layout">
        <div class="profile-main">
          <div class="cover ph-${esc(p.category)}"><span>Portfolio photos</span></div>
          <div class="profile-head">
            <h1 tabindex="-1">${esc(p.name)}</h1>
            <span class="badge">${icon('check', 12)} Verified</span>
          </div>
          <p class="muted">${p.type === 'freelancer' ? 'Freelancer' : 'Business'} · ${esc(p.area)} · ${p.km.toFixed(1)} km · ${icon('star', 14)} ${p.rating.toFixed(1)}</p>
          <div class="chips">${p.modes.map((m) => `<span class="chip">${m === 'shop' ? 'At the shop' : 'Comes to you'}</span>`).join('')}</div>

          <h2 class="h3">Services</h2>
          <ul class="service-list">
            ${p.services.map((sv) => `
              <li class="service glass">
                <div>
                  <p class="service-name">${esc(sv.name)}</p>
                  <p class="muted small">${sv.mins} min</p>
                </div>
                <div class="service-end">
                  <strong>${money(sv.price)}</strong>
                  <a class="btn btn-dark btn-sm" href="#/book/${esc(p.id)}/${esc(sv.id)}">Book</a>
                </div>
              </li>`).join('')}
          </ul>
        </div>
        <aside class="profile-side glass">
          <h2 class="h3">About</h2>
          <dl class="facts">
            <dt>Hours</dt><dd>${esc(p.hours)}</dd>
            <dt>Area</dt><dd>${esc(p.area)}, ${CITY}</dd>
            ${p.staff.length ? `<dt>Team</dt><dd>${p.staff.map(esc).join(', ')}</dd>` : ''}
            <dt>Verification</dt><dd>Permit checked by Selfcare</dd>
          </dl>
          <h2 class="h3">Reviews</h2>
          <p class="muted small">Reviews appear here after completed bookings.</p>
        </aside>
      </div>`
  };
}

/* ---------------- Booking ---------------- */
function nextDays(n) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    out.push({
      id: x.toISOString().slice(0, 10),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : x.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' })
    });
  }
  return out;
}
const SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export function book(providerId, serviceId) {
  const p = providerById(providerId);
  const sv = p?.services.find((x) => x.id === serviceId);
  if (!p || !sv) return notFound();
  const s = store.get();
  const days = nextDays(7);
  const b = {
    mode: p.modes.includes(s.serviceMode) ? s.serviceMode : p.modes[0],
    day: days[0].id,
    time: '',
    when: 'now',
    staff: '',
    address: s.address,
    pay: 'mpesa'
  };

  function totals() {
    const travel = b.mode === 'home' ? travelFee(p.km) : 0;
    return { travel, total: sv.price + travel + SERVICE_FEE };
  }

  function form() {
    const t = totals();
    const needsTime = b.mode === 'shop' || b.when === 'later';
    const ready = (needsTime ? b.time : true) && (b.mode === 'shop' || b.address.trim());
    return `
      <div class="book-layout">
        <div class="book-main">
          ${p.modes.length > 1 ? `<div class="step-block"><h2 class="h3">Where?</h2>${segmented('mode', MODE_OPTIONS, b.mode, 'Where the service happens')}</div>` : `<p class="muted">${p.modes[0] === 'home' ? 'This provider comes to you.' : 'This service is at the shop.'}</p>`}

          ${b.mode === 'home' ? `
            <div class="step-block">
              <h2 class="h3">Your address</h2>
              <label class="field">Address or landmark
                <input data-input="address" value="${esc(b.address)}" placeholder="e.g. apartment, street, area" autocomplete="street-address">
              </label>
              ${segmented('when', [{ id: 'now', label: 'As soon as possible' }, { id: 'later', label: 'Schedule' }], b.when, 'When')}
            </div>` : ''}

          ${needsTime ? `
            <div class="step-block">
              <h2 class="h3">Day</h2>
              <div class="pill-row">${days.map((d) => `<button type="button" class="pill${d.id === b.day ? ' is-on' : ''}" aria-pressed="${d.id === b.day}" data-action="day" data-value="${d.id}">${esc(d.label)}</button>`).join('')}</div>
              <h2 class="h3">Time</h2>
              <div class="pill-row">${SLOTS.map((t2) => `<button type="button" class="pill${t2 === b.time ? ' is-on' : ''}" aria-pressed="${t2 === b.time}" data-action="time" data-value="${t2}">${t2}</button>`).join('')}</div>
            </div>` : ''}

          ${p.staff.length && b.mode === 'shop' ? `
            <div class="step-block">
              <h2 class="h3">Who? <span class="muted small">(optional)</span></h2>
              <div class="pill-row">
                <button type="button" class="pill${!b.staff ? ' is-on' : ''}" aria-pressed="${!b.staff}" data-action="staff" data-value="">Anyone</button>
                ${p.staff.map((m) => `<button type="button" class="pill${m === b.staff ? ' is-on' : ''}" aria-pressed="${m === b.staff}" data-action="staff" data-value="${esc(m)}">${esc(m)}</button>`).join('')}
              </div>
            </div>` : ''}

          <div class="step-block">
            <h2 class="h3">Pay with</h2>
            <div class="pay-list">
              ${PAYMENT_METHODS.map((m) => `
                <label class="pay glass${m.id === b.pay ? ' is-on' : ''}">
                  <input type="radio" name="pay" value="${m.id}" data-input="pay"${m.id === b.pay ? ' checked' : ''}>
                  <span><strong>${esc(m.label)}</strong><span class="muted small">${esc(m.note)}</span></span>
                </label>`).join('')}
            </div>
          </div>
        </div>

        <aside class="summary glass" aria-label="Booking summary">
          <p class="eyebrow">${esc(p.name)}</p>
          <h2 class="h3">${esc(sv.name)}</h2>
          <dl class="lines">
            <dt>Service</dt><dd>${money(sv.price)}</dd>
            ${b.mode === 'home' ? `<dt>Travel fee (${p.km.toFixed(1)} km)</dt><dd>${money(t.travel)}</dd>` : ''}
            <dt>${SERVICE_FEE_LABEL}</dt><dd>${money(SERVICE_FEE)}</dd>
            <dt class="total">Total</dt><dd class="total">${money(t.total)}</dd>
          </dl>
          <button type="button" class="btn btn-dark btn-block" data-action="confirm"${ready ? '' : ' disabled'}>
            ${b.mode === 'home' && b.when === 'now' ? 'Request now' : 'Confirm booking'}
          </button>
          <p class="muted small">${ready ? 'You are charged when the provider accepts. Payment is released to them once the service is done.' : b.mode === 'home' && !b.address.trim() ? 'Add your address to continue.' : 'Pick a time to continue.'}</p>
        </aside>
      </div>`;
  }

  return {
    title: 'Book',
    theme: p.category,
    html: `
      <a class="back" href="#/provider/${esc(p.id)}">${icon('back', 18)} ${esc(p.name)}</a>
      <h1 tabindex="-1">Book ${esc(sv.name.toLowerCase())}</h1>
      <div data-book>${form()}</div>`,
    bind(root) {
      const box = root.querySelector('[data-book]');
      const rerender = (focusSel) => {
        box.innerHTML = form();
        if (focusSel) box.querySelector(focusSel)?.focus();
      };
      box.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn || btn.disabled) return;
        const { action, value } = btn.dataset;
        if (action === 'confirm') {
          const t = totals();
          const booking = store.addBooking({
            providerId: p.id, providerName: p.name, serviceName: sv.name,
            mode: b.mode, when: b.mode === 'home' ? b.when : 'later',
            day: b.day, time: b.time, staff: b.staff, address: b.address,
            pay: b.pay, price: sv.price, travel: t.travel, fee: SERVICE_FEE, total: t.total,
            status: b.mode === 'home' && b.when === 'now' ? 'requested' : 'confirmed'
          });
          if (b.mode === 'home') store.set({ address: b.address });
          toast(b.mode === 'home' && b.when === 'now' ? 'Request sent to nearby providers' : 'Booking confirmed');
          go(`#/booking/${booking.id}`);
          return;
        }
        b[action] = value;
        rerender(`[data-action="${action}"][data-value="${CSS.escape(value)}"]`);
      });
      box.addEventListener('input', (e) => {
        const k = e.target.dataset.input;
        if (k === 'address') {
          b.address = e.target.value;
          const pos = e.target.selectionStart;
          rerender('[data-input="address"]');
          const el = box.querySelector('[data-input="address"]');
          el.setSelectionRange(pos, pos);
        }
        if (k === 'pay') { b.pay = e.target.value; rerender(`[data-input="pay"][value="${b.pay}"]`); }
      });
    }
  };
}

/* ---------------- Bookings ---------------- */
const STATUS_LABEL = {
  requested: 'Finding a provider', confirmed: 'Confirmed', 'on-the-way': 'On the way',
  arrived: 'Arrived', done: 'Completed', cancelled: 'Cancelled'
};

function whenText(b) {
  if (b.mode === 'home' && b.when === 'now') return 'As soon as possible';
  const d = new Date(b.day + 'T00:00:00');
  return `${d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })} · ${b.time}`;
}

export function bookings() {
  const list = store.get().bookings;
  return {
    title: 'Bookings',
    theme: 'nails',
    html: `
      <h1 tabindex="-1">Your bookings</h1>
      ${list.length ? `<ul class="booking-list">${list.map((b) => `
        <li><a class="booking glass" href="#/booking/${esc(b.id)}">
          <div>
            <p class="service-name">${esc(b.serviceName)}</p>
            <p class="muted small">${esc(b.providerName)} · ${b.mode === 'home' ? 'At your place' : 'At the shop'} · ${esc(whenText(b))}</p>
          </div>
          <span class="status status-${esc(b.status)}">${STATUS_LABEL[b.status] || esc(b.status)}</span>
        </a></li>`).join('')}</ul>`
        : `<div class="empty glass"><h2 class="h3">No bookings yet</h2><p class="muted">When you book a service it shows up here.</p><a class="btn btn-dark" href="#/search">Find a service</a></div>`}`
  };
}

export function bookingDetail(id) {
  const b = store.get().bookings.find((x) => x.id === id);
  if (!b) return notFound();
  const steps = b.mode === 'home' ? ['requested', 'confirmed', 'on-the-way', 'arrived', 'done'] : ['confirmed', 'done'];
  const at = steps.indexOf(b.status);
  const active = !['done', 'cancelled'].includes(b.status);
  const lateCancel = b.status === 'arrived';
  return {
    title: 'Booking',
    theme: 'spa',
    html: `
      <a class="back" href="#/bookings">${icon('back', 18)} Bookings</a>
      <h1 tabindex="-1">${esc(b.serviceName)}</h1>
      <p class="muted">${esc(b.providerName)} · ${esc(whenText(b))}</p>
      <div class="book-layout">
        <div class="book-main">
          ${b.mode === 'home' ? `<div class="map glass">${icon('pin', 28)}<span>Live map: provider's route to ${esc(b.address || 'you')}</span></div>` : ''}
          ${b.status === 'cancelled' ? '<p class="status status-cancelled">Cancelled</p>' : `
          <ol class="progress">
            ${steps.map((st, i) => `<li class="${i < at ? 'done' : i === at ? 'now' : ''}">${STATUS_LABEL[st]}</li>`).join('')}
          </ol>`}
          ${active ? `
          <div class="demo-box">
            <p class="muted small">Demo controls: in the live app the provider's actions move this along.</p>
            <button type="button" class="btn btn-ghost btn-sm" data-action="advance">Next status</button>
          </div>` : ''}
        </div>
        <aside class="summary glass">
          <dl class="lines">
            <dt>Service</dt><dd>${money(b.price)}</dd>
            ${b.travel ? `<dt>Travel fee</dt><dd>${money(b.travel)}</dd>` : ''}
            <dt>${SERVICE_FEE_LABEL}</dt><dd>${money(b.fee)}</dd>
            ${b.cancelFee ? `<dt>Inconvenience fee</dt><dd>${money(b.cancelFee)}</dd>` : ''}
            <dt class="total">${b.status === 'cancelled' ? 'Charged' : 'Total'}</dt><dd class="total">${money(b.status === 'cancelled' ? (b.cancelFee || 0) : b.total)}</dd>
          </dl>
          <p class="muted small">Paying with ${esc(PAYMENT_METHODS.find((m) => m.id === b.pay)?.label || b.pay)}</p>
          ${active ? `<button type="button" class="btn btn-outline-dark btn-block" data-action="cancel">Cancel booking</button>
          <p class="muted small">${lateCancel ? `Your provider has arrived, so cancelling now costs ${money(ARRIVED_CANCEL_FEE)}.` : 'Free to cancel until your provider arrives.'}</p>` : ''}
          ${b.status === 'done' ? '<a class="btn btn-dark btn-block" href="#/search">Book again</a>' : ''}
        </aside>
      </div>`,
    bind(root) {
      root.addEventListener('click', (e) => {
        const a = e.target.closest('[data-action]')?.dataset.action;
        if (a === 'advance') {
          const next = steps[Math.min(at + 1, steps.length - 1)];
          store.updateBooking(b.id, { status: next });
          go(location.hash, { replace: true });
        }
        if (a === 'cancel') {
          const fee = lateCancel ? ARRIVED_CANCEL_FEE : 0;
          if (!confirm(fee ? `Cancel and pay the ${money(fee)} inconvenience fee?` : 'Cancel this booking?')) return;
          store.updateBooking(b.id, { status: 'cancelled', cancelFee: fee });
          toast('Booking cancelled');
          go(location.hash, { replace: true });
        }
      });
    }
  };
}

/* ---------------- Profile ---------------- */
export function profile() {
  const s = store.get();
  return {
    title: 'Profile',
    theme: 'skincare',
    html: `
      <h1 tabindex="-1">Profile</h1>
      <div class="settings">
        <section class="glass panel">
          <h2 class="h3">Saved address</h2>
          <p class="muted">${esc(s.address || 'None yet. It is saved after your first home-service booking.')}</p>
        </section>
        <section class="glass panel">
          <h2 class="h3">Run a salon, spa or freelance business?</h2>
          <p class="muted">Switch to Selfcare for Business to list your services and take bookings.</p>
          <button type="button" class="btn btn-dark" data-action="to-business">${icon('swap', 18)} Switch to Business</button>
        </section>
        <section class="glass panel">
          <h2 class="h3">Demo data</h2>
          <p class="muted">This preview keeps everything on this device.</p>
          <button type="button" class="btn btn-ghost" data-action="reset">Clear demo bookings</button>
        </section>
      </div>`,
    bind(root) {
      root.addEventListener('click', (e) => {
        const a = e.target.closest('[data-action]')?.dataset.action;
        if (a === 'to-business') { store.set({ mode: 'business' }); go('#/biz'); }
        if (a === 'reset' && confirm('Clear all demo bookings and business details on this device?')) { store.reset(); toast('Cleared'); go('#/'); }
      });
    }
  };
}

export function notFound() {
  return {
    title: 'Not found',
    theme: 'hair',
    html: `<h1 tabindex="-1">Page not found</h1><p class="muted">That link doesn't lead anywhere.</p><a class="btn btn-dark" href="#/">Go home</a>`
  };
}
