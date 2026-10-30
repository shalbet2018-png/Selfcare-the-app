// Selfcare for Business screens.
import { money, travelFee, PAYOUT_OPTIONS, CITY } from './config.js';
import * as store from './store.js';
import { esc, icon, toast, segmented } from './ui.js';
import { go } from './router.js';

const VERIFY_LABEL = {
  'not-started': 'Not started',
  submitted: 'Submitted',
  'in-review': 'In review',
  approved: 'Approved'
};

// Demo incoming requests, shown one at a time while the business is online.
const DEMO_REQUESTS = [
  { service: 'Lash fill', client: 'Demo client A', km: 3.2, price: 1500, mins: 60 },
  { service: 'Gel manicure', client: 'Demo client B', km: 1.8, price: 1500, mins: 45 },
  { service: 'Cornrows', client: 'Demo client C', km: 5.0, price: 1200, mins: 90 }
];

function requireRegistered() {
  const biz = store.get().business;
  if (!biz.registered) { go('#/biz/register', { replace: true }); return null; }
  return biz;
}

/* ---------------- Dashboard ---------------- */
export function dashboard() {
  const biz = store.get().business;
  if (!biz.registered) {
    return {
      title: 'Business',
      theme: 'business',
      dark: true,
      html: `
        <section class="hero-block">
          <p class="eyebrow">Selfcare for Business · ${CITY}</p>
          <h1 tabindex="-1">Get found. Get booked. Get paid.</h1>
          <p class="lead">List your services, set your own prices, and take shop bookings and home calls from one app.</p>
          <div class="actions">
            <a class="btn btn-light" href="#/biz/register">Register your business</a>
            <button type="button" class="btn btn-outline" data-action="to-client">${icon('swap', 18)} Back to Selfcare</button>
          </div>
        </section>
        <ul class="benefit-grid">
          <li class="glass-dark panel"><h2 class="h3">Your prices, your hours</h2><p>Go online or offline whenever you like.</p></li>
          <li class="glass-dark panel"><h2 class="h3">Paid your way</h2><p>After every service, daily or weekly.</p></li>
          <li class="glass-dark panel"><h2 class="h3">Verified badge</h2><p>Upload your permit once; clients see you are checked.</p></li>
        </ul>`,
      bind: bindModeSwitch
    };
  }

  const approved = biz.verification === 'approved';
  const jobs = biz.jobs || [];
  const reqIndex = biz.requestIndex || 0;
  const req = DEMO_REQUESTS[reqIndex % DEMO_REQUESTS.length];
  const earned = jobs.filter((j) => j.status === 'done').reduce((sum, j) => sum + j.price + j.travel, 0);
  const pending = jobs.filter((j) => j.status === 'accepted');

  return {
    title: 'Dashboard',
    theme: 'business',
    dark: true,
    html: `
      <div class="biz-head">
        <div>
          <p class="eyebrow">Selfcare for Business</p>
          <h1 tabindex="-1">${esc(biz.name || 'Your business')}</h1>
        </div>
        <button type="button" class="online-toggle${biz.online ? ' is-on' : ''}" data-action="online" aria-pressed="${biz.online}"${approved ? '' : ' disabled'}>
          <span class="dot"></span>${biz.online ? 'Online' : 'Offline'}
        </button>
      </div>

      ${approved ? '' : `
        <section class="glass-dark panel notice">
          ${icon('shield', 24)}
          <div>
            <h2 class="h3">Verification: ${VERIFY_LABEL[biz.verification]}</h2>
            <p>You can take bookings once Selfcare has checked your documents.</p>
            <button type="button" class="btn btn-light btn-sm" data-action="approve">Demo: approve my account</button>
          </div>
        </section>`}

      <div class="dash-grid">
        <section class="request-card" aria-label="Incoming request">
          ${approved && biz.online ? `
            <div class="request-top"><span class="eyebrow sage">New home-service request</span><span class="muted small">Respond soon</span></div>
            <h2>${esc(req.service)}</h2>
            <p class="muted">${esc(req.client)} · ${req.km.toFixed(1)} km away · ${req.mins} min</p>
            <dl class="lines">
              <dt>Your price</dt><dd>${money(req.price)}</dd>
              <dt>Travel fee (by distance)</dt><dd>${money(travelFee(req.km))}</dd>
              <dt class="total">You receive</dt><dd class="total">${money(req.price + travelFee(req.km))}</dd>
            </dl>
            <div class="actions">
              <button type="button" class="btn btn-outline-dark grow" data-action="decline">Decline</button>
              <button type="button" class="btn btn-dark grow2" data-action="accept">Accept</button>
            </div>`
          : `<h2 class="h3">${approved ? 'You are offline' : 'Requests appear here'}</h2>
             <p class="muted">${approved ? 'Go online to receive home-service requests near you.' : 'After approval, go online to start receiving requests.'}</p>`}
        </section>

        <section class="glass-dark panel">
          <h2 class="h3">${icon('wallet', 20)} Earnings</h2>
          <p class="big-num">${money(earned)}</p>
          <p class="small">From completed services on this device. Clients pay the service fee, so you keep your full price.</p>
          <h3 class="h4">Get paid</h3>
          ${segmented('payout', PAYOUT_OPTIONS, biz.payout, 'Payout schedule')}
        </section>

        <section class="glass-dark panel span-2">
          <h2 class="h3">${icon('calendar', 20)} Upcoming jobs</h2>
          ${pending.length ? `<ul class="job-list">${pending.map((j) => `
            <li class="job">
              <div><p class="service-name">${esc(j.service)}</p><p class="small">${esc(j.client)} · ${j.km.toFixed(1)} km · ${money(j.price + j.travel)}</p></div>
              <button type="button" class="btn btn-light btn-sm" data-action="complete" data-value="${esc(j.id)}">Mark done</button>
            </li>`).join('')}</ul>`
          : '<p class="small">No upcoming jobs. Accepted requests and shop bookings show here.</p>'}
        </section>
      </div>`,
    bind(root) {
      bindModeSwitch(root);
      root.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn || btn.disabled || btn.dataset.action === 'to-client') return;
        const { action, value } = btn.dataset;
        const b = store.get().business;
        if (action === 'approve') { store.setBusiness({ verification: 'approved' }); toast('Account approved (demo)'); }
        if (action === 'online') store.setBusiness({ online: !b.online });
        if (action === 'payout') { store.setBusiness({ payout: value }); toast(`Payouts: ${PAYOUT_OPTIONS.find((o) => o.id === value).label.toLowerCase()}`); }
        if (action === 'decline') store.setBusiness({ requestIndex: (b.requestIndex || 0) + 1 });
        if (action === 'accept') {
          const job = { id: 'j' + Date.now().toString(36), ...req, travel: travelFee(req.km), status: 'accepted' };
          store.setBusiness({ jobs: [...(b.jobs || []), job], requestIndex: (b.requestIndex || 0) + 1 });
          toast('Accepted. Head to the client when ready.');
        }
        if (action === 'complete') {
          store.setBusiness({ jobs: (b.jobs || []).map((j) => (j.id === value ? { ...j, status: 'done' } : j)) });
          toast('Marked done. Payment released.');
        }
        go(location.hash, { replace: true });
      });
    }
  };
}

/* ---------------- Register and verify ---------------- */
export function register() {
  const biz = store.get().business;
  return {
    title: 'Register',
    theme: 'business',
    dark: true,
    html: `
      <a class="back" href="#/biz">${icon('back', 18)} Business</a>
      <h1 tabindex="-1">${biz.registered ? 'Business details' : 'Register your business'}</h1>
      <form class="form glass-dark panel" data-form="register">
        <fieldset>
          <legend class="h3">I am a</legend>
          <div class="radio-row">
            <label class="radio"><input type="radio" name="kind" value="business"${biz.kind === 'business' ? ' checked' : ''}> Business with a shop or studio</label>
            <label class="radio"><input type="radio" name="kind" value="freelancer"${biz.kind === 'freelancer' ? ' checked' : ''}> Freelancer</label>
          </div>
        </fieldset>
        <label class="field dark">Business or display name
          <input name="name" required value="${esc(biz.name)}" autocomplete="organization">
        </label>
        <label class="field dark">Area in ${CITY}
          <input name="area" required value="${esc(biz.area)}" placeholder="e.g. Kilimani">
        </label>
        <label class="field dark">How far will you travel for home calls? (km)
          <input name="radiusKm" type="number" min="0" max="50" value="${Number(biz.radiusKm) || 0}">
        </label>
        <fieldset>
          <legend class="h3">Verification documents</legend>
          <p class="small">Businesses: business registration and your operating permit. Freelancers: national ID or passport and a selfie. In this preview, files stay on your device.</p>
          <label class="field dark">Permit or ID
            <input name="doc1" type="file" accept="image/*,application/pdf">
          </label>
          <label class="field dark">Second document or selfie
            <input name="doc2" type="file" accept="image/*,application/pdf">
          </label>
        </fieldset>
        <button type="submit" class="btn btn-light">${biz.registered ? 'Save' : 'Submit for verification'}</button>
      </form>`,
    bind(root) {
      root.querySelector('[data-form="register"]').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const first = !store.get().business.registered;
        store.setBusiness({
          registered: true,
          kind: fd.get('kind') || 'business',
          name: String(fd.get('name') || '').trim(),
          area: String(fd.get('area') || '').trim(),
          radiusKm: Number(fd.get('radiusKm')) || 0,
          verification: first ? 'submitted' : store.get().business.verification
        });
        toast(first ? 'Submitted. We will check your documents.' : 'Saved');
        go(first ? '#/biz/services' : '#/biz');
      });
    }
  };
}

/* ---------------- Services and prices ---------------- */
export function services() {
  const biz = requireRegistered();
  if (!biz) return { title: '', html: '' };
  const list = biz.services || [];
  const where = { shop: 'At the shop', home: 'Home service', both: 'Shop and home' };
  return {
    title: 'Services',
    theme: 'business',
    dark: true,
    html: `
      <h1 tabindex="-1">Services and prices</h1>
      <p class="lead">You set your own prices. Home calls add a travel fee by distance automatically.</p>
      ${list.length ? `<ul class="job-list">${list.map((s, i) => `
        <li class="job glass-dark">
          <div><p class="service-name">${esc(s.name)}</p><p class="small">${s.mins} min · ${where[s.where]}</p></div>
          <div class="service-end"><strong>${money(s.price)}</strong>
          <button type="button" class="btn btn-outline btn-sm" data-action="remove" data-value="${i}" aria-label="Remove ${esc(s.name)}">Remove</button></div>
        </li>`).join('')}</ul>` : '<p class="small">No services yet. Add your first one below.</p>'}
      <form class="form glass-dark panel" data-form="service">
        <h2 class="h3">Add a service</h2>
        <label class="field dark">Service name<input name="name" required placeholder="e.g. Knotless braids, medium"></label>
        <div class="form-row">
          <label class="field dark">Price (KES)<input name="price" type="number" min="0" step="50" required></label>
          <label class="field dark">Length (minutes)<input name="mins" type="number" min="5" step="5" required></label>
          <label class="field dark">Where
            <select name="where"><option value="both">Shop and home</option><option value="shop">At the shop</option><option value="home">Home service</option></select>
          </label>
        </div>
        <button type="submit" class="btn btn-light">Add service</button>
      </form>`,
    bind(root) {
      root.querySelector('[data-form="service"]').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const s = { name: String(fd.get('name')).trim(), price: Number(fd.get('price')), mins: Number(fd.get('mins')), where: fd.get('where') };
        store.setBusiness({ services: [...(store.get().business.services || []), s] });
        toast('Service added');
        go(location.hash, { replace: true });
      });
      root.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="remove"]');
        if (!btn) return;
        const list2 = [...(store.get().business.services || [])];
        list2.splice(Number(btn.dataset.value), 1);
        store.setBusiness({ services: list2 });
        go(location.hash, { replace: true });
      });
    }
  };
}

/* ---------------- Account ---------------- */
export function account() {
  const biz = store.get().business;
  return {
    title: 'Account',
    theme: 'business',
    dark: true,
    html: `
      <h1 tabindex="-1">Account</h1>
      <div class="settings">
        <section class="glass-dark panel">
          <h2 class="h3">${esc(biz.name || 'Not registered yet')}</h2>
          <p class="small">${biz.kind === 'freelancer' ? 'Freelancer' : 'Business'}${biz.area ? ` · ${esc(biz.area)}` : ''} · Verification: ${VERIFY_LABEL[biz.verification]}</p>
          <a class="btn btn-light btn-sm" href="#/biz/register">${biz.registered ? 'Edit details' : 'Register'}</a>
        </section>
        <section class="glass-dark panel">
          <h2 class="h3">Booking for yourself?</h2>
          <button type="button" class="btn btn-outline" data-action="to-client">${icon('swap', 18)} Switch to Selfcare</button>
        </section>
      </div>`,
    bind: bindModeSwitch
  };
}

function bindModeSwitch(root) {
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="to-client"]')) { store.set({ mode: 'client' }); go('#/'); }
  });
}
