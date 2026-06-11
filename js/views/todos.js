// Standalone to-do lists — errands, club work, recruiting, anything non-class.
import { esc, icon, sectionHead, relDay, dueClass, confirmDialog, toast } from '../components/ui.js';
import { state, put, remove } from '../store.js';

export function render(container) {
  const todos = state.todos;
  const lists = [...new Set(['Errands', 'Clubs', 'Recruiting', ...todos.map(t => t.listName)])];
  const openCount = todos.filter(t => !t.done).length;

  container.innerHTML = `
    <div class="page">
      ${sectionHead('To-Dos', 'Beyond the classroom')}
      <p class="caption">${openCount} open · separate from class work — these never touch your grades.</p>
      <form id="todo-add" class="todo-add">
        <input name="title" required placeholder="Add a to-do…">
        <select name="listName">${lists.map(l => `<option>${esc(l)}</option>`).join('')}<option value="__new__">New list…</option></select>
        <input name="dueAt" type="date" aria-label="Due date (optional)">
        <button class="btn btn-primary btn-sm" type="submit">${icon('plus', 16)} Add</button>
      </form>
      ${lists.map(list => {
        const inList = todos.filter(t => t.listName === list)
          .sort((a, b) => (a.done - b.done) || ((a.dueAt || '9999') < (b.dueAt || '9999') ? -1 : 1));
        if (!inList.length) return '';
        return `<section>
          <div class="eyebrow" style="margin-bottom:8px">${esc(list)}</div>
          ${inList.map(t => `
            <div class="todo-row ${t.done ? 'done' : ''}">
              <button class="todo-check" data-toggle="${t.id}" aria-label="Toggle">${t.done ? icon('check', 15) : ''}</button>
              <span class="todo-title">${esc(t.title)}</span>
              ${t.dueAt ? `<span class="caption ${dueClass(t.dueAt)}">${relDay(t.dueAt)}</span>` : ''}
              <button class="btn-icon" data-del="${t.id}" aria-label="Delete">${icon('trash', 15)}</button>
            </div>`).join('')}
        </section>`;
      }).join('')}
      ${!todos.length ? `<div class="empty-state">${icon('checkSquare', 32)}
        <div class="empty-title">Nothing here yet</div>
        <div class="caption">Club tasks, recruiting follow-ups, errands — keep them out of your head.</div></div>` : ''}
    </div>`;

  container.querySelector('#todo-add').onsubmit = async e => {
    e.preventDefault();
    const f = e.target.elements;
    let listName = f.listName.value;
    if (listName === '__new__') {
      listName = prompt('New list name:')?.trim();
      if (!listName) return;
    }
    await put('todos', { title: f.title.value.trim(), listName, dueAt: f.dueAt.value || null, done: false });
    toast('Added');
  };
  container.querySelectorAll('[data-toggle]').forEach(b => b.onclick = async () => {
    const t = state.todos.find(x => x.id === b.dataset.toggle);
    await put('todos', { ...t, done: !t.done });
  });
  container.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const t = state.todos.find(x => x.id === b.dataset.del);
    if (t.done || await confirmDialog({ title: 'Delete to-do?', message: `"${t.title}"` })) {
      await remove('todos', t.id);
    }
  });
}
