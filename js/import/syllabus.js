// Syllabus import: copy a prompt for Claude, paste back the JSON it returns,
// review everything it found, then import. Never crashes on bad input.
import { esc, icon, sectionHead, toast, fmtDateTime, TYPE_LABELS } from '../components/ui.js';
import { state, put, bulkPut, currentClasses, currentSemester, uid } from '../store.js';

export const CLAUDE_PROMPT = `I'm attaching a course syllabus. Read it carefully and return ONLY a single JSON object — no markdown fences, no commentary, no text before or after — matching exactly this schema:

{
  "class": {
    "code": "ACC 212",            // department + number as printed
    "name": "Managerial Accounting",
    "creditHours": 3,
    "professor": "Dr. Jane Smith" // "" if not listed
  },
  "gradingWeights": [             // every grading category and its % of the final grade; must total 100
    { "category": "Exams", "weightPct": 40 }
  ],
  "policies": {
    "dropLowest": [               // [] if none
      { "category": "Quizzes", "n": 1 }
    ],
    "rounding": "none",           // "nearest" only if the syllabus explicitly says grades are rounded
    "extraCredit": "",            // quote the syllabus briefly, "" if none
    "latePolicy": ""              // quote the syllabus briefly, "" if none
  },
  "cutoffs": [                    // ONLY if the syllabus defines its own grade scale, else []
    { "letter": "A", "minPct": 93 }
  ],
  "items": [                      // EVERY dated assignment, quiz, exam, project, reading
    {
      "title": "Exam 1",
      "type": "test",             // one of: assignment | quiz | test | project | reading | other
      "category": "Exams",        // must match a gradingWeights category
      "dueAt": "2026-10-01T09:30",// ISO local datetime; use T23:59 if only a date is given; null if undated
      "pointsPossible": 100       // null if not listed
    }
  ]
}

Rules:
- Output raw JSON only. Your entire reply must parse with JSON.parse().
- Do not invent dates, weights, or points that are not in the syllabus — use null or "" instead.
- If recurring items are listed (e.g. "quiz every Friday"), expand them into individual dated items for the whole semester.
- Every item's "category" must exactly match one of the gradingWeights categories.`;

function validate(payload) {
  const errors = [];
  if (typeof payload !== 'object' || payload === null) return ['Not a JSON object.'];
  if (!payload.class?.code) errors.push('Missing class.code');
  if (!Array.isArray(payload.gradingWeights)) errors.push('gradingWeights must be an array');
  else {
    const total = payload.gradingWeights.reduce((s, w) => s + (Number(w.weightPct) || 0), 0);
    if (payload.gradingWeights.length && Math.abs(total - 100) > 1) errors.push(`Weights total ${total}%, expected ~100% (you can fix this after import)`);
  }
  if (payload.items !== undefined && !Array.isArray(payload.items)) errors.push('items must be an array');
  for (const [i, it] of (payload.items || []).entries()) {
    if (!it.title) errors.push(`items[${i}] missing title`);
    if (it.type && !TYPE_LABELS[it.type]) errors.push(`items[${i}] has unknown type "${it.type}"`);
    if (it.dueAt && Number.isNaN(new Date(it.dueAt).getTime())) errors.push(`items[${i}] has unparseable dueAt "${it.dueAt}"`);
  }
  return errors;
}

export function render(container) {
  container.innerHTML = `
    <div class="page">
      ${sectionHead('Syllabus Import', 'Let Claude do the typing')}
      <ol class="import-steps">
        <li><strong>Copy the prompt</strong> below and paste it into Claude with your syllabus attached (PDF, Word, or photos).</li>
        <li>Claude replies with a block of JSON. <strong>Copy its entire reply.</strong></li>
        <li><strong>Paste it here</strong>, review what it found, and import.</li>
      </ol>
      <button class="btn btn-primary" id="copy-prompt">${icon('copy', 16)} Copy Prompt for Claude</button>
      <details style="margin-top:8px"><summary class="caption">Preview the prompt</summary>
        <pre class="prompt-pre mono">${esc(CLAUDE_PROMPT)}</pre></details>

      <label class="field" style="margin-top:24px"><span>Paste Claude's JSON reply</span>
        <textarea id="json-in" rows="8" class="mono" placeholder='{"class": {"code": "ACC 212", …'></textarea></label>
      <button class="btn btn-secondary" id="parse-btn">Review Import</button>
      <div id="import-review" style="margin-top:16px"></div>
    </div>`;

  container.querySelector('#copy-prompt').onclick = async () => {
    try {
      await navigator.clipboard.writeText(CLAUDE_PROMPT);
      toast('Prompt copied — paste it into Claude with your syllabus');
    } catch {
      // clipboard can be blocked; show it for manual copy
      container.querySelector('details').open = true;
      toast('Copy blocked by browser — select the preview text instead');
    }
  };

  container.querySelector('#parse-btn').onclick = () => {
    const box = container.querySelector('#import-review');
    let raw = container.querySelector('#json-in').value.trim();
    if (!raw) { box.innerHTML = `<div class="wi-verdict warn">Paste Claude's reply first.</div>`; return; }
    // tolerate accidental markdown fences
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    let payload;
    try { payload = JSON.parse(raw); }
    catch (e) {
      box.innerHTML = `<div class="wi-verdict bad">${icon('alert', 16)} That's not valid JSON (${esc(e.message)}). Make sure you copied Claude's entire reply and nothing else.</div>`;
      return;
    }
    const errors = validate(payload);
    const fatal = errors.filter(e => !e.includes('after import'));
    if (fatal.length) {
      box.innerHTML = `<div class="wi-verdict bad">${icon('alert', 16)} The JSON doesn't match the schema:</div>
        <ul class="caption">${fatal.map(e => `<li>${esc(e)}</li>`).join('')}</ul>
        <p class="caption">Ask Claude to fix it ("the JSON failed validation: …") and paste the corrected version.</p>`;
      return;
    }
    renderReview(container, payload, errors);
  };
}

function renderReview(container, payload, warnings) {
  const box = container.querySelector('#import-review');
  const classes = currentClasses();
  const match = classes.find(c => c.code.replace(/\s/g, '').toLowerCase() === (payload.class.code || '').replace(/\s/g, '').toLowerCase());
  const items = (payload.items || []).map(it => ({ ...it, _include: true }));

  box.innerHTML = `
    <div class="review-card">
      <div class="eyebrow" style="margin-bottom:8px">Found in the Syllabus</div>
      <div class="form-grid">
        <label class="field"><span>Apply to class</span>
          <select id="rv-class">
            ${classes.map(c => `<option value="${c.id}" ${match?.id === c.id ? 'selected' : ''}>${esc(c.code)} — ${esc(c.name)}</option>`).join('')}
            <option value="__new__" ${match ? '' : 'selected'}>Create new: ${esc(payload.class.code)} ${esc(payload.class.name || '')}</option>
          </select></label>
        <div class="field"><span>Professor / credits</span>
          <div class="body-sm" style="padding-top:8px">${esc(payload.class.professor || '—')} · ${payload.class.creditHours ?? '?'} cr</div></div>
      </div>

      <div class="eyebrow" style="margin:12px 0 6px">Grading Weights</div>
      ${(payload.gradingWeights || []).map(w => `<div class="wi-item-need"><span>${esc(w.category)}</span><span class="mono">${w.weightPct}%</span></div>`).join('') || '<p class="caption">None found.</p>'}

      ${(payload.policies?.dropLowest?.length || payload.policies?.extraCredit || payload.policies?.latePolicy || payload.policies?.rounding === 'nearest') ? `
      <div class="eyebrow" style="margin:12px 0 6px">Policies</div>
      <p class="body-sm" style="margin:0">${[
        ...(payload.policies.dropLowest || []).map(d => `drops lowest ${d.n} ${esc(d.category)}`),
        payload.policies.rounding === 'nearest' ? 'rounds to nearest %' : null,
        payload.policies.extraCredit ? `extra credit: ${esc(payload.policies.extraCredit)}` : null,
        payload.policies.latePolicy ? `late: ${esc(payload.policies.latePolicy)}` : null,
      ].filter(Boolean).join(' · ')}</p>` : ''}

      ${payload.cutoffs?.length ? `<div class="eyebrow" style="margin:12px 0 6px">Custom Grade Scale</div>
        <p class="body-sm" style="margin:0">${payload.cutoffs.map(c => `${esc(c.letter)} ≥ ${c.minPct}%`).join(' · ')}</p>` : ''}

      <div class="eyebrow" style="margin:12px 0 6px">Items (${items.length})</div>
      <div id="rv-items">
        ${items.map((it, i) => `
          <label class="rv-item">
            <input type="checkbox" data-inc="${i}" checked>
            <span class="item-title">${esc(it.title)}</span>
            <span class="caption">${esc(it.type || 'other')} · ${esc(it.category || '')} · ${it.dueAt ? fmtDateTime(it.dueAt) : 'no date'} · ${it.pointsPossible ?? '?'} pts</span>
          </label>`).join('') || '<p class="caption">No dated items found.</p>'}
      </div>

      ${warnings.length ? `<div class="wi-verdict warn" style="margin-top:10px">${warnings.map(esc).join('<br>')}</div>` : ''}
      <div class="modal-actions" style="margin-top:14px">
        <button class="btn btn-ghost" id="rv-cancel">Cancel</button>
        <button class="btn btn-primary" id="rv-confirm">Import</button>
      </div>
    </div>`;

  box.querySelectorAll('[data-inc]').forEach(cb => cb.onchange = () => { items[+cb.dataset.inc]._include = cb.checked; });
  box.querySelector('#rv-cancel').onclick = () => { box.innerHTML = ''; };
  box.querySelector('#rv-confirm').onclick = async () => {
    const sel = box.querySelector('#rv-class').value;
    let cls;
    if (sel === '__new__') {
      cls = {
        id: uid(), semesterId: currentSemester()?.id, code: payload.class.code,
        name: payload.class.name || payload.class.code,
        creditHours: Number(payload.class.creditHours) || 3,
        professor: payload.class.professor || '', color: '#4A9BD1', targetGrade: 'A',
        gradingWeights: [], policies: {}, cutoffs: [], finalLetterGrade: null,
      };
    } else {
      cls = { ...state.classes.find(c => c.id === sel) };
      if (payload.class.professor && !cls.professor) cls.professor = payload.class.professor;
    }
    cls.gradingWeights = (payload.gradingWeights || []).map(w => ({ category: String(w.category), weightPct: Number(w.weightPct) || 0 }));
    cls.policies = {
      dropLowest: (payload.policies?.dropLowest || []).map(d => ({ category: String(d.category), n: Number(d.n) || 1 })),
      rounding: payload.policies?.rounding === 'nearest' ? 'nearest' : 'none',
      extraCredit: payload.policies?.extraCredit || '',
      latePolicy: payload.policies?.latePolicy || '',
    };
    if (payload.cutoffs?.length) cls.cutoffs = payload.cutoffs.map(c => ({ letter: String(c.letter), minPct: Number(c.minPct) || 0 }));
    await put('classes', cls);

    const newItems = items.filter(it => it._include).map(it => ({
      id: uid(), classId: cls.id, title: String(it.title),
      type: TYPE_LABELS[it.type] ? it.type : 'other',
      category: String(it.category || 'Other'),
      dueAt: it.dueAt || null,
      pointsPossible: it.pointsPossible === null || it.pointsPossible === undefined ? null : Number(it.pointsPossible),
      scoreEarned: null, status: 'upcoming', priority: false, materials: [], notes: '',
    }));
    if (newItems.length) await bulkPut('items', newItems);
    toast(`Imported ${cls.code}: ${newItems.length} items, ${cls.gradingWeights.length} categories`);
    location.hash = `/class/${cls.id}`;
  };
}
