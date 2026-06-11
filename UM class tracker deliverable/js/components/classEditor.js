// Class setup modals: info, grading weights, policies, grade cutoffs.
import { modal, modalHeader, confirmDialog, toast, esc, icon } from './ui.js';
import { put, remove, currentSemester } from '../store.js';
import { DEFAULT_CUTOFFS } from '../engine/grades.js';
import { GRADE_POINTS } from '../engine/gpa.js';

const PALETTE = ['#4A9BD1', '#C2A44D', '#7AB08F', '#9CA635', '#C8102E', '#B8A87E', '#F47321', '#005030'];
const LETTERS = Object.keys(GRADE_POINTS);

export function openClassEditor(cls = null, semesterId = null) {
  const isNew = !cls;
  const c = cls || {
    semesterId: semesterId || currentSemester()?.id, code: '', name: '', creditHours: 3,
    professor: '', color: PALETTE[0], targetGrade: 'A',
    gradingWeights: [], policies: { dropLowest: [], rounding: 'none', extraCredit: '', latePolicy: '' }, cutoffs: [],
    finalLetterGrade: null,
  };
  const m = modal(`
    ${modalHeader(isNew ? 'Add Class' : `Edit ${c.code}`)}
    <form id="class-form" class="form-grid">
      <label class="field"><span>Code</span><input name="code" required value="${esc(c.code)}" placeholder="ACC 212"></label>
      <label class="field"><span>Credit hours</span><input name="creditHours" type="number" min="0" step="0.5" value="${c.creditHours}"></label>
      <label class="field span2"><span>Name</span><input name="name" required value="${esc(c.name)}" placeholder="Managerial Accounting"></label>
      <label class="field span2"><span>Professor</span><input name="professor" value="${esc(c.professor || '')}" placeholder="Optional"></label>
      <label class="field"><span>Target grade</span>
        <select name="targetGrade">${LETTERS.map(l => `<option ${l === (c.targetGrade || 'A') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Final grade <small>(past semesters — feeds GPA history)</small></span>
        <select name="finalLetterGrade"><option value="">— in progress</option>
          ${LETTERS.map(l => `<option ${l === c.finalLetterGrade ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="field"><span>Calendar color</span>
        <div class="swatches" id="swatches">${PALETTE.map(p =>
          `<button type="button" class="swatch ${p === c.color ? 'sel' : ''}" data-color="${p}" style="background:${p}" aria-label="${p}"></button>`).join('')}</div></div>
      <div class="modal-actions span2">
        ${isNew ? '' : `<button type="button" class="btn btn-danger-ghost" id="del-class">${icon('trash', 16)} Delete</button>`}
        <span style="flex:1"></span>
        <button type="button" class="btn btn-ghost" data-close2>Cancel</button>
        <button type="submit" class="btn btn-primary">${isNew ? 'Add Class' : 'Save'}</button>
      </div>
    </form>`, { wide: true });

  let color = c.color;
  m.root.querySelectorAll('.swatch').forEach(b => b.onclick = () => {
    color = b.dataset.color;
    m.root.querySelectorAll('.swatch').forEach(x => x.classList.toggle('sel', x === b));
  });
  m.root.querySelector('[data-close2]').onclick = m.close;
  m.root.querySelector('#del-class')?.addEventListener('click', async () => {
    if (await confirmDialog({ title: `Delete ${c.code}?`, message: 'The class and every assignment, score, and link inside it will be permanently removed.' })) {
      await remove('classes', c.id);
      m.close();
      location.hash = '/';
      toast('Class deleted');
    }
  });
  m.root.querySelector('#class-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target.elements;
    await put('classes', {
      ...c, code: f.code.value.trim(), name: f.name.value.trim(),
      creditHours: parseFloat(f.creditHours.value) || 0,
      professor: f.professor.value.trim(), targetGrade: f.targetGrade.value, color,
      finalLetterGrade: f.finalLetterGrade.value || null,
    });
    m.close();
    toast(isNew ? 'Class added' : 'Saved');
  };
}

export function openWeightsEditor(cls) {
  let rows = (cls.gradingWeights || []).map(w => ({ ...w }));
  if (!rows.length) rows = [{ category: 'Exams', weightPct: 40 }, { category: 'Quizzes', weightPct: 15 }, { category: 'Homework', weightPct: 20 }, { category: 'Participation', weightPct: 10 }, { category: 'Final', weightPct: 15 }];
  const m = modal(`
    ${modalHeader(`Grading Weights — ${cls.code}`)}
    <p class="body-sm" style="margin-top:0">How each category counts toward the final grade. Must total 100%.</p>
    <div id="w-rows"></div>
    <button type="button" class="btn btn-ghost btn-sm" id="w-add">${icon('plus', 16)} Add category</button>
    <div class="weights-total" id="w-total"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-close2>Cancel</button>
      <button class="btn btn-primary" id="w-save">Save Weights</button>
    </div>`, { wide: true });

  const render = () => {
    m.root.querySelector('#w-rows').innerHTML = rows.map((r, i) => `
      <div class="material-row">
        <input data-i="${i}" data-f="category" value="${esc(r.category)}" placeholder="Category">
        <input data-i="${i}" data-f="weightPct" type="number" min="0" max="100" step="any" value="${r.weightPct}" style="max-width:90px">
        <button type="button" class="btn-icon" data-del="${i}" aria-label="Remove">${icon('x', 16)}</button>
      </div>`).join('');
    const total = rows.reduce((s, r) => s + (parseFloat(r.weightPct) || 0), 0);
    const t = m.root.querySelector('#w-total');
    t.textContent = `Total: ${total}%`;
    t.className = 'weights-total ' + (Math.abs(total - 100) < 0.01 ? 'ok' : 'warn');
    m.root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { rows.splice(+b.dataset.del, 1); render(); });
    m.root.querySelectorAll('[data-i]').forEach(inp => inp.oninput = () => {
      rows[+inp.dataset.i][inp.dataset.f] = inp.dataset.f === 'weightPct' ? parseFloat(inp.value) || 0 : inp.value;
      const total = rows.reduce((s, r) => s + (parseFloat(r.weightPct) || 0), 0);
      const t = m.root.querySelector('#w-total');
      t.textContent = `Total: ${Math.round(total * 100) / 100}%`;
      t.className = 'weights-total ' + (Math.abs(total - 100) < 0.01 ? 'ok' : 'warn');
    });
  };
  render();
  m.root.querySelector('#w-add').onclick = () => { rows.push({ category: '', weightPct: 0 }); render(); };
  m.root.querySelector('[data-close2]').onclick = m.close;
  m.root.querySelector('#w-save').onclick = async () => {
    const clean = rows.filter(r => r.category.trim()).map(r => ({ category: r.category.trim(), weightPct: parseFloat(r.weightPct) || 0 }));
    const total = clean.reduce((s, r) => s + r.weightPct, 0);
    if (clean.length && Math.abs(total - 100) > 0.01 &&
        !(await confirmDialog({ title: `Weights total ${Math.round(total * 100) / 100}%`, message: 'They don’t add up to 100%. Save anyway? (Math still works — weights are normalized.)', confirmLabel: 'Save anyway', danger: false }))) return;
    await put('classes', { ...cls, gradingWeights: clean });
    m.close();
    toast('Weights saved — grades recalculated');
  };
}

export function openPoliciesEditor(cls) {
  const p = { dropLowest: [], rounding: 'none', extraCredit: '', latePolicy: '', ...(cls.policies || {}) };
  let drops = (p.dropLowest || []).map(d => ({ ...d }));
  const cats = (cls.gradingWeights || []).map(w => w.category);
  const m = modal(`
    ${modalHeader(`Grading Policies — ${cls.code}`)}
    <div class="eyebrow" style="margin-bottom:8px">Drop Lowest</div>
    <div id="d-rows"></div>
    <button type="button" class="btn btn-ghost btn-sm" id="d-add" ${cats.length ? '' : 'disabled'}>${icon('plus', 16)} Add drop rule</button>
    ${cats.length ? '' : '<p class="caption">Set grading weights first to add drop rules.</p>'}
    <form id="p-form" class="form-grid" style="margin-top:16px">
      <label class="field span2"><span>Rounding</span>
        <select name="rounding">
          <option value="none" ${p.rounding === 'none' ? 'selected' : ''}>No rounding (89.9% is a B+)</option>
          <option value="nearest" ${p.rounding === 'nearest' ? 'selected' : ''}>Round to nearest whole % (89.5% becomes 90%)</option>
        </select></label>
      <label class="field span2"><span>Extra credit</span>
        <input name="extraCredit" value="${esc(p.extraCredit)}" placeholder="e.g. Up to 2% for case competitions"></label>
      <label class="field span2"><span>Late policy</span>
        <input name="latePolicy" value="${esc(p.latePolicy)}" placeholder="e.g. -10% per day, max 3 days"></label>
      <div class="modal-actions span2">
        <button type="button" class="btn btn-ghost" data-close2>Cancel</button>
        <button type="submit" class="btn btn-primary">Save Policies</button>
      </div>
    </form>`, { wide: true });

  const render = () => {
    m.root.querySelector('#d-rows').innerHTML = drops.map((d, i) => `
      <div class="material-row">
        <select data-i="${i}" data-f="category">${cats.map(c => `<option ${c === d.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
        <span class="body-sm" style="white-space:nowrap">drop lowest</span>
        <input data-i="${i}" data-f="n" type="number" min="1" max="10" value="${d.n}" style="max-width:70px">
        <button type="button" class="btn-icon" data-del="${i}" aria-label="Remove">${icon('x', 16)}</button>
      </div>`).join('') || '<p class="caption" style="margin:0 0 8px">No drop rules.</p>';
    m.root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { drops.splice(+b.dataset.del, 1); render(); });
    m.root.querySelectorAll('[data-i]').forEach(inp => inp.onchange = () => {
      drops[+inp.dataset.i][inp.dataset.f] = inp.dataset.f === 'n' ? parseInt(inp.value) || 1 : inp.value;
    });
  };
  render();
  m.root.querySelector('#d-add').onclick = () => { drops.push({ category: cats[0], n: 1 }); render(); };
  m.root.querySelector('[data-close2]').onclick = m.close;
  m.root.querySelector('#p-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target.elements;
    await put('classes', { ...cls, policies: { dropLowest: drops, rounding: f.rounding.value, extraCredit: f.extraCredit.value, latePolicy: f.latePolicy.value } });
    m.close();
    toast('Policies saved — grades recalculated');
  };
}

export function openCutoffsEditor(cls) {
  let rows = (cls.cutoffs?.length ? cls.cutoffs : DEFAULT_CUTOFFS).map(c => ({ ...c }));
  const m = modal(`
    ${modalHeader(`Grade Cutoffs — ${cls.code}`)}
    <p class="body-sm" style="margin-top:0">Minimum % for each letter. Standard scale by default — edit if this professor curves differently.</p>
    <div id="c-rows"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-sm" id="c-reset">Reset to standard</button>
      <span style="flex:1"></span>
      <button class="btn btn-ghost" data-close2>Cancel</button>
      <button class="btn btn-primary" id="c-save">Save Cutoffs</button>
    </div>`);
  const render = () => {
    m.root.querySelector('#c-rows').innerHTML = `<div class="cutoff-grid">` + rows.map((r, i) => `
      <label class="cutoff-cell"><span>${esc(r.letter)}</span>
        <input data-i="${i}" type="number" min="0" max="110" step="any" value="${r.minPct}"></label>`).join('') + `</div>`;
    m.root.querySelectorAll('[data-i]').forEach(inp => inp.oninput = () => { rows[+inp.dataset.i].minPct = parseFloat(inp.value) || 0; });
  };
  render();
  m.root.querySelector('#c-reset').onclick = () => { rows = DEFAULT_CUTOFFS.map(c => ({ ...c })); render(); };
  m.root.querySelector('[data-close2]').onclick = m.close;
  m.root.querySelector('#c-save').onclick = async () => {
    await put('classes', { ...cls, cutoffs: rows });
    m.close();
    toast('Cutoffs saved — letters recalculated');
  };
}
