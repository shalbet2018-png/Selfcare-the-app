// Hash router: works from any static host and from the home-screen app.
let renderFn = () => {};

export function onRoute(fn) {
  renderFn = fn;
  window.addEventListener('hashchange', () => renderFn());
}

export function go(hash, { replace = false } = {}) {
  if (hash === location.hash) { renderFn({ keepScroll: true }); return; }
  if (replace) { history.replaceState(null, '', hash); renderFn({ keepScroll: true }); }
  else location.hash = hash;
}

// "#/provider/p1?x=1" -> { parts: ['provider', 'p1'], params }
export function parse() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), params: new URLSearchParams(query) };
}
