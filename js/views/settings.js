// Settings: semesters & classes admin, backup/export/import, danger zone.
import { esc, icon, sectionHead, confirmDialog, toast, gradeBadge, modal, modalHeader } from '../components/ui.js';
import { state, put, remove, setSetting, classesFor, exportData, importData } from '../store.js';
import { openClassEditor } from '../components/classEditor.js';
import { db } from '../db.js';

const MS_DAY = 86400000;

export function backupOverdue() {
  const last = state.settings.lastBackupAt;
  if (!last) return state.items.length > 0; // has real work, never backed up
  return (Date.now() - new Date(last)) / MS_DAY > 14;
}

function openSemesterEditor(sem = null) {
  const isNew = !sem;
  const s = sem || { name: '', startDate: '', endDate: '', status: 'future' };
  const m = modal(`
    ${modalHeader(isNew ? 'Add Semester' : `Edit ${s.name}`)}
    <form id="sem-form" class="form-grid">
      <label class="field span2"><span>Name</span><input name="name" required value="${esc(s.name)}" placeholder="Spring 2027"></label>
      <label class="field"><span>Start date</span><input name="startDate" type="date" required value="${s.startDate}"></label>
      <label class="field"><span>End date</span><input name="endDate" type="date" required value="${s.endDate}"></label>
      <label class="field span2"><span>Status</span>
        <select name="status">${['past', 'current', 'future'].map(v => `<option value="${v}" ${v === s.status ? 'selected' : ''}>${v[0].toUpperCase() + v.slice(1)}</option>`).join('')}</select></label>
      <p class="caption span2">Only one semester should be “current” — it's what the dashboard, calendar, and what-if views run on.</p>
      <div class="modal-actions span2">
        <button type="button" class="btn btn-ghost" data-close2>Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`);
  m.root.querySelector('[data-close2]').onclick = m.close;
  m.root.querySelector('#sem-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target.elements;
    if (f.status.value === 'current') {
      // demote any other current semester
      for (const other of state.semesters.filter(x => x.status === 'current' && x.id !== s.id)) {
        await db.semesters.put({ ...other, status: 'past' });
      }
    }
    await put('semesters', { ...s, name: f.name.value.trim(), startDate: f.startDate.value, endDate: f.endDate.value, status: f.status.value });
    m.close();
    toast('Semester saved');
  };
}

export function render(container) {
  const semesterEndingSoon = (() => {
    const cur = state.semesters.find(s => s.status === 'current');
    if (!cur?.endDate) return false;
    const days = (new Date(cur.endDate) - new Date()) / MS_DAY;
    return days > -7 && days < 14;
  })();

  container.innerHTML = `
    <div class="page">
      ${sectionHead('Settings', '')}

      ${backupOverdue() ? `<div class="alert-banner">${icon('alert', 18)}<span><strong>Back up your data.</strong> Everything lives in this browser — export a JSON file so a cleared cache can't take your semester with it.</span></div>` : ''}
      ${semesterEndingSoon ? `<div class="alert-banner">${icon('download', 18)}<span><strong>Semester wrapping up</strong> — export a backup now, then mark the semester “past” and enter final letter grades on each class.</span></div>` : ''}

      <section>
        ${sectionHead('Data Safety', 'Backup & restore')}
        <div class="btn-row">
          <button class="btn btn-primary" id="export-btn">${icon('download', 16)} Export All Data (JSON)</button>
          <label class="btn btn-secondary" style="cursor:pointer">${icon('upload', 16)} Restore from Backup
            <input type="file" id="import-file" accept="application/json,.json" hidden></label>
        </div>
        <p class="caption">Last backup: ${state.settings.lastBackupAt ? new Date(state.settings.lastBackupAt).toLocaleDateString() : 'never'}. Restoring replaces everything with the backup's contents.</p>
      </section>

      <section>
        ${sectionHead('Semesters & Classes', '')}
        ${state.semesters.map(s => `
          <div class="sem-card">
            <div class="sem-head">
              <h4 class="h-5">${esc(s.name)} <span class="caption">· ${s.status}${s.startDate ? ` · ${s.startDate} → ${s.endDate}` : ''}</span></h4>
              <button class="btn btn-ghost btn-sm" data-edit-sem="${s.id}">${icon('pencil', 14)}</button>
            </div>
            ${classesFor(s.id).map(c => `
              <div class="sem-row">
                <span class="class-dot" style="background:${c.color}"></span>
                <span style="flex:1">${esc(c.code)} <span class="caption">${esc(c.name)} · ${c.creditHours} cr</span></span>
                ${s.status === 'past' ? gradeBadge(c.finalLetterGrade) : ''}
                <button class="btn-icon" data-edit-class="${c.id}" aria-label="Edit">${icon('pencil', 14)}</button>
              </div>`).join('') || '<p class="caption">No classes.</p>'}
            <button class="btn btn-ghost btn-sm" data-add-class="${s.id}">${icon('plus', 14)} Add class</button>
          </div>`).join('')}
        <button class="btn btn-secondary btn-sm" id="add-sem">${icon('plus', 15)} Add semester</button>
        <p class="caption">Past classes carry a final letter grade for GPA history. Mark a past class's grade by editing it — set the letter in the “final grade” field that appears for past semesters.</p>
      </section>

      <section>
        ${sectionHead('Danger Zone', '')}
        <button class="btn btn-danger-ghost" id="wipe-btn">${icon('trash', 15)} Erase all data</button>
        <p class="caption">Deletes every semester, class, item, and to-do from this browser. Export first.</p>
      </section>

      <p class="caption" style="margin-top:32px">Herbert HQ · built on the Miami Herbert design system · data stays on this device (IndexedDB)</p>
    </div>`;

  container.querySelector('#export-btn').onclick = async () => {
    const payload = await exportData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `herbert-hq-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    await setSetting('lastBackupAt', new Date().toISOString());
    toast('Backup downloaded');
  };

  container.querySelector('#import-file').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (!await confirmDialog({
        title: 'Restore from backup?',
        message: `This replaces ALL current data with the backup from ${payload.exportedAt ? new Date(payload.exportedAt).toLocaleString() : 'unknown date'}.`,
        confirmLabel: 'Replace everything',
      })) return;
      await importData(payload);
      toast('Backup restored');
    } catch (err) {
      toast(`Restore failed: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };

  container.querySelector('#add-sem').onclick = () => openSemesterEditor();
  container.querySelectorAll('[data-edit-sem]').forEach(b => b.onclick = () =>
    openSemesterEditor(state.semesters.find(s => s.id === b.dataset.editSem)));
  container.querySelectorAll('[data-add-class]').forEach(b => b.onclick = () =>
    openClassEditor(null, b.dataset.addClass));
  container.querySelectorAll('[data-edit-class]').forEach(b => b.onclick = () =>
    openClassEditor(state.classes.find(c => c.id === b.dataset.editClass)));

  container.querySelector('#wipe-btn').onclick = async () => {
    if (!await confirmDialog({ title: 'Erase ALL data?', message: 'Every semester, class, grade, and to-do will be permanently deleted from this device.' })) return;
    if (!await confirmDialog({ title: 'Last chance', message: 'This cannot be undone. Did you export a backup?', confirmLabel: 'Erase everything' })) return;
    await Promise.all([db.semesters.clear(), db.classes.clear(), db.items.clear(), db.todos.clear(), db.settings.clear()]);
    location.reload();
  };
}
