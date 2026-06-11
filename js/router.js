// Hash router — GitHub Pages safe.
const routes = [];

export function route(pattern, render) {
  // pattern like '/class/:id'
  const keys = [];
  const rx = new RegExp('^' + pattern.replace(/:[^/]+/g, m => {
    keys.push(m.slice(1));
    return '([^/]+)';
  }) + '$');
  routes.push({ rx, keys, render });
}

export function parse() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = hash.split('?');
  for (const r of routes) {
    const m = path.match(r.rx);
    if (m) {
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      params.query = query;
      return { render: r.render, params, path };
    }
  }
  return { render: routes[0]?.render, params: { query }, path };
}

export function navigate(path) {
  if (location.hash === '#' + path) return;
  location.hash = path;
}

export function currentPath() {
  return location.hash.replace(/^#/, '') || '/';
}
