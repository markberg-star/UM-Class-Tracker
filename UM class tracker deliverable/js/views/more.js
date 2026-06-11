// "More" menu (mobile bottom-nav overflow): to-dos, import, settings.
import { icon, sectionHead } from '../components/ui.js';
import { state } from '../store.js';
import { backupOverdue } from './settings.js';

export function render(container) {
  const openTodos = state.todos.filter(t => !t.done).length;
  container.innerHTML = `
    <div class="page">
      ${sectionHead('More', '')}
      <a class="more-row" href="#/todos">${icon('checkSquare')}<div><strong>To-Do Lists</strong>
        <div class="caption">${openTodos} open — errands, clubs, recruiting</div></div>${icon('chevronRight', 16)}</a>
      <a class="more-row" href="#/import">${icon('upload')}<div><strong>Syllabus Import</strong>
        <div class="caption">Set up a whole class from its syllabus via Claude</div></div>${icon('chevronRight', 16)}</a>
      <a class="more-row" href="#/settings">${icon('settings')}<div><strong>Settings &amp; Backup</strong>
        <div class="caption">${backupOverdue() ? '<span class="due-overdue">Backup recommended</span>' : 'Semesters, classes, export/restore'}</div></div>${icon('chevronRight', 16)}</a>
    </div>`;
}
