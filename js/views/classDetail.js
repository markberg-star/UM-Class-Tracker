// Per-class view: live grade, category breakdown, sparkline, items, setup, exam study panels.
import { esc, icon, fmtPct, sectionHead, gradeBadge, fmtDateTime } from '../components/ui.js';
import { itemRow, bindItemRows, emptyState } from '../components/itemRow.js';
import { openItemEditor } from '../components/itemEditor.js';
import { openClassEditor, openWeightsEditor, openPoliciesEditor, openCutoffsEditor } from '../components/classEditor.js';
import { state, classById, itemsFor } from '../store.js';
import { classGrade, cutoffFor, DEFAULT_CUTOFFS, isGraded } from '../engine/grades.js';
import { studyPlan, daysUntil } from '../engine/studyplan.js';

function sparkline(cls, items) {
  const graded = items.filter(isGraded).sort((a, b) => (a.dueAt || '') < (b.dueAt || '') ? -1 : 1);
  if (graded.length < 2) return '';
  const pts = graded.map((_, idx) => classGrade(cls, graded.slice(0, idx + 1)).pct);
  const min = Math.min(...pts, 80), max = Math.max(...pts, 100);
  const W = 280, H = 56, pad = 4;
  const x = i => pad + (i / (pts.length - 1)) * (W - 2 * pad);
  const y = p => pad + (1 - (p - min) / (max - min || 1)) * (H - 2 * pad);
  const poly = pts.map((p, i) => `${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
  return `<div class="sparkline-wrap"><div class="eyebrow" style="margin-bottom:4px">Grade Over the Semester</div>
    <svg viewBox="0 0 ${W} ${H}" class="sparkline" preserveAspectRatio="none">
      <polyline points="${poly}" fill="none" stroke="var(--um-green)" stroke-width="2"/>
      ${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p).toFixed(1)}" r="2.5" fill="${i === pts.length - 1 ? 'var(--um-orange)' : 'var(--um-green)'}"/>`).join('')}
    </svg>
    <div class="caption">${fmtPct(pts[0])} after first grade → ${fmtPct(pts[pts.length - 1])} now</div></div>`;
}

function examPanel(cls, items, exam) {
  const now = new Date();
  const d = daysUntil(exam.dueAt, now);
  const plan = studyPlan(exam, now);
  // study materials: this exam's links + everything linked in the same class & category
  const related = items.filter(i => i.category === exam.category && i.id !== exam.id);
  const allLinks = [
    ...(exam.materials || []).map(m => ({ ...m, from: exam.title })),
    ...related.flatMap(i => (i.materials || []).map(m => ({ ...m, from: i.title }))),
  ];
  return `<section class="exam-panel" id="exam-${exam.id}">
    ${sectionHead('Exam Prep', exam.title)}
    <div class="exam-prep-head">
      <div class="stat-block"><div class="stat-num">${d >= 0 ? d : '—'}</div><div class="stat-label">${d === 1 ? 'day left' : 'days left'}</div></div>
      <div class="body-sm">${fmtDateTime(exam.dueAt)} · counts toward <strong>${esc(exam.category)}</strong>${exam.notes ? `<br><em>${esc(exam.notes)}</em>` : ''}</div>
    </div>
    ${plan.length ? `<div class="eyebrow" style="margin:12px 0 6px">Study Plan</div>
      ${plan.map(b => `<div class="study-block"><span class="study-date">${b.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        <div><div class="item-title">${esc(b.label)}</div><div class="caption">${esc(b.focus)}</div></div></div>`).join('')}` : ''}
    <div class="eyebrow" style="margin:12px 0 6px">Study Materials</div>
    ${allLinks.length ? allLinks.map(l => `<a class="material-link" href="${esc(l.url)}" target="_blank" rel="noopener">
        ${icon('externalLink', 14)} <span>${esc(l.label || l.url)}</span> <span class="caption">· ${esc(l.from)}</span></a>`).join('')
      : `<p class="caption">No linked materials yet for ${esc(exam.category)} — open the exam or a related item and add links to notes, Drive docs, or Obsidian.</p>`}
  </section>`;
}

export function render(container, params) {
  const cls = classById(params.id);
  if (!cls) { container.innerHTML = `<div class="page"><p>Class not found.</p></div>`; return; }
  const items = itemsFor(cls.id).sort((a, b) => (a.dueAt || '9999') < (b.dueAt || '9999') ? -1 : 1);
  const grade = classGrade(cls, items);
  const cutoffs = cls.cutoffs?.length ? cls.cutoffs : DEFAULT_CUTOFFS;
  const targetCut = cutoffFor(cls.targetGrade || 'A', cutoffs);
  const hasWeights = (cls.gradingWeights || []).length > 0;

  const open = items.filter(i => i.status !== 'graded');
  const graded = items.filter(i => i.status === 'graded');
  const exams = items.filter(i => i.type === 'test' && i.status !== 'graded' && i.dueAt && daysUntil(i.dueAt) >= 0 && daysUntil(i.dueAt) <= 21);

  container.innerHTML = `
    <div class="page">
      <a class="back-link" href="#/">${icon('chevronLeft', 16)} Dashboard</a>
      <div class="class-head">
        <span class="class-dot lg" style="background:${cls.color}"></span>
        <div style="flex:1">
          <h1 class="page-title">${esc(cls.code)}</h1>
          <div class="body-sm">${esc(cls.name)} · ${cls.creditHours} cr${cls.professor ? ` · ${esc(cls.professor)}` : ''}</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="edit-class">${icon('pencil', 15)} Edit</button>
      </div>

      <div class="grade-hero ${grade.pct !== null && targetCut !== null && grade.pct < targetCut ? 'grade-hero-warn' : ''}">
        <div class="stat-block">
          <div class="stat-num">${grade.pct !== null ? fmtPct(grade.pct) : '—'}</div>
          <div class="stat-label">Current Grade ${gradeBadge(grade.letter, grade.pct)}</div>
        </div>
        <div class="grade-hero-side">
          ${grade.pct !== null ? `<div class="caption">Based on ${grade.gradedWeightPct.toFixed(0)}% of total weight graded.
            Ungraded categories don’t count yet — weights renormalize.</div>` : `<div class="caption">No grades yet.</div>`}
          ${targetCut !== null ? `<div class="caption">Target ${esc(cls.targetGrade || 'A')} needs ≥ ${targetCut}%.</div>` : ''}
          <a class="btn btn-secondary btn-sm" href="#/whatif?class=${cls.id}" style="margin-top:8px">${icon('calculator', 15)} What-If Calculator</a>
        </div>
      </div>

      ${hasWeights ? `<section>
        ${sectionHead('Category Breakdown', '')}
        ${grade.perCategory.map(c => `
          <div class="cat-row">
            <div class="cat-head"><span>${esc(c.category)} <span class="caption">(${c.weightPct}%)</span></span>
              <span>${c.pct !== null ? fmtPct(c.pct) : `<span class="caption">${c.itemCount ? 'not graded yet' : 'no items yet'}</span>`}
              ${c.droppedIds.length ? `<span class="caption" title="Lowest score dropped per policy"> · ${c.droppedIds.length} dropped</span>` : ''}</span></div>
            <div class="cat-bar"><div class="cat-fill" style="width:${c.pct ?? 0}%"></div>
              ${targetCut !== null ? `<div class="cat-target" style="left:${targetCut}%"></div>` : ''}</div>
          </div>`).join('')}
        ${sparkline(cls, items)}
      </section>` : `
      <div class="setup-callout">
        ${icon('alert', 18)}
        <div><strong>Set up grading weights</strong><br><span class="caption">Add this class's categories (Exams 40%, Quizzes 15%…) from the syllabus — or use the Syllabus Import to do it automatically.</span></div>
      </div>`}

      <div class="btn-row">
        <button class="btn btn-ghost btn-sm" id="edit-weights">${icon('pencil', 14)} Weights</button>
        <button class="btn btn-ghost btn-sm" id="edit-policies">Policies</button>
        <button class="btn btn-ghost btn-sm" id="edit-cutoffs">Cutoffs</button>
        <a class="btn btn-ghost btn-sm" href="#/import">${icon('upload', 14)} Import syllabus</a>
      </div>
      ${(cls.policies?.dropLowest?.length || cls.policies?.extraCredit || cls.policies?.latePolicy) ? `
        <p class="caption policy-line">${[
          ...(cls.policies.dropLowest || []).map(d => `Drops lowest ${d.n} ${esc(d.category)}`),
          cls.policies.rounding === 'nearest' ? 'Rounds to nearest %' : null,
          cls.policies.extraCredit ? `Extra credit: ${esc(cls.policies.extraCredit)}` : null,
          cls.policies.latePolicy ? `Late: ${esc(cls.policies.latePolicy)}` : null,
        ].filter(Boolean).join(' · ')}</p>` : ''}

      ${exams.map(e => examPanel(cls, items, e)).join('')}

      <section>
        ${sectionHead('Open Items', '')}
        <div id="open-items">
          ${open.length ? open.map(i => itemRow(i, { showClass: false })).join('')
            : emptyState('checkSquare', 'Nothing open', 'Add assignments, quizzes, and exams as the syllabus drops them.', 'Add an item', 'cls-add-empty')}
        </div>
      </section>
      <section>
        ${sectionHead('Graded', '')}
        <div id="graded-items">
          ${graded.length ? graded.map(i => itemRow(i, { showClass: false })).join('') : `<p class="caption">No graded items yet.</p>`}
        </div>
      </section>
    </div>
    <button class="fab" id="fab-add" aria-label="Add item">${icon('plus', 24)}</button>
  `;

  bindItemRows(container, items);
  container.querySelector('#edit-class').onclick = () => openClassEditor(cls);
  container.querySelector('#edit-weights').onclick = () => openWeightsEditor(cls);
  container.querySelector('#edit-policies').onclick = () => openPoliciesEditor(cls);
  container.querySelector('#edit-cutoffs').onclick = () => openCutoffsEditor(cls);
  container.querySelector('#fab-add').onclick = () => openItemEditor({ classId: cls.id });
  container.querySelector('#cls-add-empty')?.addEventListener('click', () => openItemEditor({ classId: cls.id }));

  // deep link: #/class/id?exam=xyz scrolls to that exam's prep panel
  const examId = (params.query || '').match(/exam=([^&]+)/)?.[1];
  if (examId) document.getElementById(`exam-${examId}`)?.scrollIntoView({ behavior: 'smooth' });
}
