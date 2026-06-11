// Add/edit modal for any item (assignment, quiz, test, project, reading, other).
// Handles score entry, status, priority, linked materials, and notes.
import { modal, modalHeader, confirmDialog, toast, esc, icon, toLocalInput, TYPE_LABELS, STATUS_LABELS } from './ui.js';
import { state, put, remove, currentClasses, classById } from '../store.js';

export function openItemEditor({ item = null, classId = null, defaultDate = null } = {}) {
  const isNew = !item;
  const it = item || {
    classId: classId || currentClasses()[0]?.id || '',
    title: '', type: 'assignment', category: '',
    dueAt: defaultDate ? `${defaultDate}T23:59` : '',
    pointsPossible: 100, scoreEarned: null, status: 'upcoming',
    priority: false, materials: [], notes: '',
  };
  const classes = currentClasses();
  if (!classes.length) { toast('Add a class to the current semester first.'); return; }

  const catOptions = (cid, selected) => {
    const cls = classById(cid);
    const cats = (cls?.gradingWeights || []).map(w => w.category);
    if (selected && !cats.includes(selected)) cats.push(selected);
    return cats.map(c => `<option value="${esc(c)}" ${c === selected ? 'selected' : ''}>${esc(c)}</option>`).join('')
      + `<option value="__custom__">Custom…</option>`;
  };

  const m = modal(`
    ${modalHeader(isNew ? 'Add Item' : 'Edit Item')}
    <form id="item-form" class="form-grid">
      <label class="field span2"><span>Title</span>
        <input name="title" required value="${esc(it.title)}" placeholder="e.g. Exam 1, Case write-up"></label>
      <label class="field"><span>Class</span>
        <select name="classId">${classes.map(c =>
          `<option value="${c.id}" ${c.id === it.classId ? 'selected' : ''}>${esc(c.code)}</option>`).join('')}</select></label>
      <label class="field"><span>Type</span>
        <select name="type">${Object.entries(TYPE_LABELS).map(([v, l]) =>
          `<option value="${v}" ${v === it.type ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Category (counts toward)</span>
        <select name="category">${catOptions(it.classId, it.category)}</select></label>
      <label class="field hidden" id="custom-cat-wrap"><span>Custom category</span>
        <input name="customCategory" placeholder="e.g. Exams"></label>
      <label class="field"><span>Due date &amp; time</span>
        <input name="dueAt" type="datetime-local" value="${toLocalInput(it.dueAt)}"></label>
      <label class="field"><span>Points possible</span>
        <input name="pointsPossible" type="number" min="0" step="any" value="${it.pointsPossible ?? ''}"></label>
      <label class="field"><span>Score earned <small>(leave blank until graded)</small></span>
        <input name="scoreEarned" type="number" min="0" step="any" value="${it.scoreEarned ?? ''}" placeholder="—"></label>
      <label class="field"><span>Status</span>
        <select name="status">${Object.entries(STATUS_LABELS).map(([v, l]) =>
          `<option value="${v}" ${v === it.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field check span2"><input type="checkbox" name="priority" ${it.priority ? 'checked' : ''}>
        <span>High priority (manual boost in rankings)</span></label>

      <div class="span2">
        <div class="eyebrow" style="margin-bottom:8px">Linked Materials</div>
        <div id="materials-list"></div>
        <button type="button" class="btn btn-ghost btn-sm" id="add-material">${icon('plus', 16)} Add link</button>
      </div>

      <label class="field span2"><span>Notes</span>
        <textarea name="notes" rows="3" placeholder="What to remember for this one…">${esc(it.notes)}</textarea></label>

      <div class="modal-actions span2">
        ${isNew ? '' : `<button type="button" class="btn btn-danger-ghost" id="delete-item">${icon('trash', 16)} Delete</button>`}
        <span style="flex:1"></span>
        <button type="button" class="btn btn-ghost" data-close2>Cancel</button>
        <button type="submit" class="btn btn-primary">${isNew ? 'Add Item' : 'Save'}</button>
      </div>
    </form>`, { wide: true });

  const root = m.root;
  const form = root.querySelector('#item-form');
  let materials = (it.materials || []).map(x => ({ ...x }));

  function renderMaterials() {
    root.querySelector('#materials-list').innerHTML = materials.map((mat, i) => `
      <div class="material-row">
        <input data-mi="${i}" data-mf="label" value="${esc(mat.label)}" placeholder="Label (e.g. Ch. 4 notes)">
        <input data-mi="${i}" data-mf="url" value="${esc(mat.url)}" placeholder="https://…">
        <button type="button" class="btn-icon" data-mdel="${i}" aria-label="Remove link">${icon('x', 16)}</button>
      </div>`).join('') || `<p class="caption" style="margin:0 0 8px">No links yet — Drive docs, Obsidian notes, websites.</p>`;
    root.querySelectorAll('[data-mdel]').forEach(b => b.onclick = () => { materials.splice(+b.dataset.mdel, 1); renderMaterials(); });
    root.querySelectorAll('[data-mi]').forEach(inp => inp.oninput = () => { materials[+inp.dataset.mi][inp.dataset.mf] = inp.value; });
  }
  renderMaterials();
  root.querySelector('#add-material').onclick = () => { materials.push({ label: '', url: '' }); renderMaterials(); };

  const catSelect = form.elements.category;
  const customWrap = root.querySelector('#custom-cat-wrap');
  const syncCustom = () => customWrap.classList.toggle('hidden', catSelect.value !== '__custom__');
  catSelect.onchange = syncCustom;
  if (!catSelect.options.length || (catSelect.options.length === 1 && !it.category)) {
    catSelect.value = '__custom__';
  }
  syncCustom();
  form.elements.classId.onchange = () => {
    catSelect.innerHTML = catOptions(form.elements.classId.value, null);
    syncCustom();
  };

  root.querySelector('[data-close2]').onclick = m.close;
  root.querySelector('#delete-item')?.addEventListener('click', async () => {
    if (await confirmDialog({ title: 'Delete this item?', message: `"${it.title}" and its links/notes will be removed. This can't be undone.` })) {
      await remove('items', it.id);
      m.close();
      toast('Item deleted');
    }
  });

  form.onsubmit = async e => {
    e.preventDefault();
    const f = form.elements;
    let category = f.category.value === '__custom__' ? f.customCategory.value.trim() : f.category.value;
    if (!category) category = 'Other';
    const score = f.scoreEarned.value === '' ? null : parseFloat(f.scoreEarned.value);
    let status = f.status.value;
    if (score !== null && status !== 'graded') status = 'graded'; // entering a score grades it
    await put('items', {
      ...(item || {}),
      classId: f.classId.value,
      title: f.title.value.trim(),
      type: f.type.value,
      category,
      dueAt: f.dueAt.value || null,
      pointsPossible: f.pointsPossible.value === '' ? null : parseFloat(f.pointsPossible.value),
      scoreEarned: score,
      status,
      priority: f.priority.checked,
      materials: materials.filter(x => x.url.trim()),
      notes: f.notes.value,
    });
    m.close();
    toast(isNew ? 'Item added' : 'Saved');
  };
}

// Quick score entry — tap a grade cell, type the score, done.
export function openScoreEntry(item) {
  const cls = classById(item.classId);
  const m = modal(`
    ${modalHeader(`Score — ${item.title}`)}
    <form id="score-form" class="form-grid">
      <p class="body-sm span2" style="margin:0">${esc(cls?.code || '')} · ${esc(item.category)} · out of ${item.pointsPossible ?? '?'} pts</p>
      <label class="field"><span>Score earned</span>
        <input name="score" type="number" min="0" step="any" value="${item.scoreEarned ?? ''}" autofocus></label>
      <div class="modal-actions span2">
        <button type="button" class="btn btn-ghost" data-close2>Cancel</button>
        <button type="submit" class="btn btn-primary">Save Score</button>
      </div>
    </form>`);
  m.root.querySelector('[data-close2]').onclick = m.close;
  m.root.querySelector('#score-form').onsubmit = async e => {
    e.preventDefault();
    const v = e.target.elements.score.value;
    await put('items', { ...item, scoreEarned: v === '' ? null : parseFloat(v), status: v === '' ? 'upcoming' : 'graded' });
    m.close();
    toast(v === '' ? 'Score cleared' : 'Score saved — grades updated');
  };
}
