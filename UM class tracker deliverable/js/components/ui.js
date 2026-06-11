// Shared UI helpers: escaping, dates, modals, confirm, toast.
import { icon } from './icons.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- dates ----------
const MS_DAY = 86400000;
export const dayStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const hasTime = !(d.getHours() === 0 && d.getMinutes() === 0);
  return hasTime ? `${date}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : date;
}
export function relDay(iso, now = new Date()) {
  const diff = Math.round((dayStart(iso) - dayStart(now)) / MS_DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${-diff}d overdue`;
  if (diff < 7) return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' });
  return fmtDate(iso);
}
export function dueClass(iso, now = new Date()) {
  if (!iso) return '';
  const diff = Math.round((dayStart(iso) - dayStart(now)) / MS_DAY);
  if (diff < 0) return 'due-overdue';
  if (diff <= 1) return 'due-soon';
  return '';
}
export const toLocalInput = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function fmtPct(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

// ---------- modal ----------
export function modal(html, { wide = false } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { overlay.remove(); document.body.classList.remove('modal-open'); };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('[data-close]')?.addEventListener('click', close);
  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');
  return { root: overlay.firstElementChild, overlay, close };
}

export function modalHeader(title) {
  return `<div class="modal-head">
    <h3 class="modal-title">${esc(title)}</h3>
    <button class="btn-icon" data-close aria-label="Close">${icon('x')}</button>
  </div>`;
}

// ---------- confirm (used before every destructive action) ----------
export function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Delete', danger = true }) {
  return new Promise(resolve => {
    const m = modal(`
      ${modalHeader(title)}
      <p class="body-sm" style="margin:0 0 20px">${esc(message)}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-cancel>Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmLabel)}</button>
      </div>`);
    m.root.querySelector('[data-cancel]').onclick = () => { m.close(); resolve(false); };
    m.root.querySelector('[data-ok]').onclick = () => { m.close(); resolve(true); };
    m.overlay.addEventListener('click', e => { if (e.target === m.overlay) resolve(false); });
    m.root.querySelector('[data-close]').addEventListener('click', () => resolve(false));
  });
}

// ---------- toast ----------
let toastTimer;
export function toast(message) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- small shared renders ----------
export function gradeBadge(letter, pct = null) {
  if (!letter) return `<span class="grade-badge grade-none">—</span>`;
  const tone = letter.startsWith('A') ? 'grade-a' : letter.startsWith('B') ? 'grade-b' : 'grade-c';
  return `<span class="grade-badge ${tone}" title="${pct !== null ? fmtPct(pct) : ''}">${esc(letter)}</span>`;
}

export const TYPE_LABELS = { assignment: 'Assignment', quiz: 'Quiz', test: 'Test / Exam', project: 'Project', reading: 'Reading', other: 'Other' };
export const STATUS_LABELS = { upcoming: 'Upcoming', 'in-progress': 'In progress', submitted: 'Submitted', graded: 'Graded' };

export function eyebrow(text) {
  return `<div class="eyebrow">${esc(text)}</div>`;
}
export function sectionHead(eyebrowText, title) {
  return `<div class="section-head">
    <div class="eyebrow">${esc(eyebrowText)}</div>
    <span class="rule-accent"></span>
    ${title ? `<h3 class="h-3">${esc(title)}</h3>` : ''}
  </div>`;
}

export { icon };
