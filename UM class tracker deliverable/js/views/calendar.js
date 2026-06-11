// Calendar: month grid + week list, items color-coded by class, study blocks included.
import { esc, icon, sectionHead, dayStart } from '../components/ui.js';
import { itemRow, bindItemRows } from '../components/itemRow.js';
import { openItemEditor } from '../components/itemEditor.js';
import { state, currentItems, currentClasses, classById } from '../store.js';
import { allStudyBlocks } from '../engine/studyplan.js';

const MS_DAY = 86400000;
let view = { mode: 'month', year: null, month: null, selected: null };

const dkey = d => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export function render(container) {
  const now = new Date();
  if (view.year === null) { view.year = now.getFullYear(); view.month = now.getMonth(); view.selected = dkey(now); }

  const items = currentItems().filter(i => i.dueAt);
  const blocks = allStudyBlocks(currentItems(), now);
  const byDay = {};
  for (const i of items) (byDay[dkey(i.dueAt)] ||= { items: [], blocks: [] }).items.push(i);
  for (const b of blocks) (byDay[dkey(b.date)] ||= { items: [], blocks: [] }).blocks.push(b);

  const monthName = new Date(view.year, view.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  container.innerHTML = `
    <div class="page">
      ${sectionHead('Calendar', '')}
      <div class="cal-toolbar">
        <div class="cal-nav">
          <button class="btn-icon" id="cal-prev" aria-label="Previous">${icon('chevronLeft')}</button>
          <h3 class="h-4" style="margin:0;min-width:170px;text-align:center">${view.mode === 'month' ? monthName : 'This Week'}</h3>
          <button class="btn-icon" id="cal-next" aria-label="Next">${icon('chevronRight')}</button>
        </div>
        <div class="seg">
          <button class="seg-btn ${view.mode === 'month' ? 'on' : ''}" data-mode="month">Month</button>
          <button class="seg-btn ${view.mode === 'week' ? 'on' : ''}" data-mode="week">Week</button>
        </div>
      </div>
      <div id="cal-body"></div>
      <div id="cal-day-detail"></div>
    </div>
    <button class="fab" id="fab-add" aria-label="Add item">${icon('plus', 24)}</button>`;

  const body = container.querySelector('#cal-body');

  if (view.mode === 'month') {
    const first = new Date(view.year, view.month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell cal-empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const day = byDay[key];
      const isToday = key === dkey(now);
      cells += `<div class="cal-cell ${isToday ? 'cal-today' : ''} ${key === view.selected ? 'cal-sel' : ''}" data-day="${key}">
        <span class="cal-date">${d}</span>
        <div class="cal-dots">
          ${(day?.items || []).slice(0, 4).map(i => `<span class="cal-dot ${i.type === 'test' ? 'cal-dot-exam' : ''}" style="background:${classById(i.classId)?.color || '#75787B'}"></span>`).join('')}
          ${day?.blocks?.length ? `<span class="cal-dot cal-dot-study" title="Study block"></span>` : ''}
        </div></div>`;
    }
    body.innerHTML = `<div class="cal-grid">
      ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>`;
    body.querySelectorAll('[data-day]').forEach(c => c.onclick = () => { view.selected = c.dataset.day; render(container); });
    renderDayDetail(container, byDay, items);
  } else {
    const start = dayStart(now);
    let html = '';
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + d * MS_DAY);
      const key = dkey(date);
      const day = byDay[key];
      html += `<div class="week-day">
        <div class="week-day-head ${key === dkey(now) ? 'today' : ''}">${date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
        ${(day?.items || []).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)).map(i => itemRow(i)).join('')}
        ${(day?.blocks || []).map(b => `<div class="study-block">${icon('bookOpen', 15)}<div>
          <div class="item-title">${esc(b.label)}</div><div class="caption">${esc(b.focus)}</div></div></div>`).join('')}
        ${!day ? '<p class="caption" style="margin:4px 0 12px">Free.</p>' : ''}
      </div>`;
    }
    body.innerHTML = html;
    bindItemRows(body, items);
  }

  container.querySelector('#cal-prev').onclick = () => { shift(-1); render(container); };
  container.querySelector('#cal-next').onclick = () => { shift(1); render(container); };
  container.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { view.mode = b.dataset.mode; render(container); });
  container.querySelector('#fab-add').onclick = () => openItemEditor({ defaultDate: view.selected });
}

function shift(dir) {
  if (view.mode === 'month') {
    view.month += dir;
    if (view.month < 0) { view.month = 11; view.year--; }
    if (view.month > 11) { view.month = 0; view.year++; }
  }
}

function renderDayDetail(container, byDay, items) {
  const box = container.querySelector('#cal-day-detail');
  const day = byDay[view.selected];
  const date = new Date(view.selected + 'T12:00');
  box.innerHTML = `<div class="eyebrow" style="margin:16px 0 8px">${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
    ${day?.items?.length || day?.blocks?.length ? `
      ${(day.items || []).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)).map(i => itemRow(i)).join('')}
      ${(day.blocks || []).map(b => `<div class="study-block">${icon('bookOpen', 15)}<div>
        <div class="item-title">${esc(b.label)}</div><div class="caption">${esc(b.focus)}</div></div></div>`).join('')}`
      : `<p class="caption">Nothing due. Tap + to add something for this day.</p>`}`;
  bindItemRows(box, items);
}
