// Shared list-row renderer for items + the click bindings that go with it.
import { esc, icon, fmtDateTime, relDay, dueClass, STATUS_LABELS } from './ui.js';
import { classById } from '../store.js';
import { openItemEditor, openScoreEntry } from './itemEditor.js';

const TYPE_ICONS = { assignment: 'fileText', quiz: 'listTodo', test: 'flag', project: 'star', reading: 'bookOpen', other: 'fileText' };

export function itemRow(item, { showClass = true, why = null } = {}) {
  const cls = classById(item.classId);
  const graded = item.scoreEarned !== null && item.scoreEarned !== undefined;
  const scoreTxt = graded
    ? `${item.scoreEarned}/${item.pointsPossible}`
    : (item.pointsPossible ? `${item.pointsPossible} pts` : '');
  return `
  <div class="item-row ${item.status === 'graded' ? 'is-graded' : ''}" data-item="${item.id}">
    <span class="class-dot" style="background:${cls?.color || '#75787B'}"></span>
    <div class="item-main">
      <div class="item-title">
        ${item.priority ? `<span class="prio-flag" title="High priority">${icon('flag', 13)}</span>` : ''}
        ${esc(item.title)}
        ${item.materials?.length ? `<span class="link-count" title="${item.materials.length} linked material(s)">${icon('link', 13)}${item.materials.length}</span>` : ''}
      </div>
      <div class="item-meta">
        ${showClass && cls ? `<span>${esc(cls.code)}</span> ·` : ''}
        <span>${esc(item.category || '')}</span>
        ${item.dueAt ? `· <span class="${dueClass(item.dueAt)}">${relDay(item.dueAt)} — ${fmtDateTime(item.dueAt)}</span>` : ''}
        ${why ? `<div class="item-why">${why}</div>` : ''}
      </div>
    </div>
    <div class="item-right">
      ${graded
        ? `<span class="score-chip">${esc(scoreTxt)}</span>`
        : `<button class="btn btn-ghost btn-sm" data-score="${item.id}">${esc(scoreTxt) || 'Score'}<span class="score-plus">${icon('plus', 13)}</span></button>`}
      <span class="status-chip status-${item.status}">${STATUS_LABELS[item.status] || item.status}</span>
    </div>
  </div>`;
}

// Wire up row clicks inside a container: row → editor, score button → quick entry.
export function bindItemRows(container, items) {
  const byId = Object.fromEntries(items.map(i => [i.id, i]));
  container.querySelectorAll('[data-score]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    openScoreEntry(byId[b.dataset.score]);
  }));
  container.querySelectorAll('[data-item]').forEach(row => row.addEventListener('click', () => {
    openItemEditor({ item: byId[row.dataset.item] });
  }));
}

export function emptyState(iconName, title, hint, ctaLabel = null, ctaId = null) {
  return `<div class="empty-state">
    ${icon(iconName, 32)}
    <div class="empty-title">${esc(title)}</div>
    <div class="caption">${esc(hint)}</div>
    ${ctaLabel ? `<button class="btn btn-primary btn-sm" id="${ctaId}" style="margin-top:12px">${esc(ctaLabel)}</button>` : ''}
  </div>`;
}
