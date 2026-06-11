// Dashboard: today + next 7 days, priority ranking, exam countdowns, class grade chips.
import { esc, icon, fmtPct, sectionHead, dayStart, relDay, gradeBadge } from '../components/ui.js';
import { itemRow, bindItemRows, emptyState } from '../components/itemRow.js';
import { openItemEditor } from '../components/itemEditor.js';
import { state, currentSemester, currentClasses, currentItems, pastClasses } from '../store.js';
import { classGrade, cutoffFor, DEFAULT_CUTOFFS } from '../engine/grades.js';
import { cumulativeGPA, projectedTermGPA, projectedCumulative } from '../engine/gpa.js';
import { rankItems } from '../engine/priority.js';
import { allStudyBlocks, daysUntil } from '../engine/studyplan.js';

const MS_DAY = 86400000;

export function render(container) {
  const sem = currentSemester();
  const classes = currentClasses();
  const items = currentItems();
  const now = new Date();

  // --- grades / GPA summary
  const grades = classes.map(c => ({ cls: c, grade: classGrade(c, items) }));
  const below = grades.filter(g => {
    if (g.grade.pct === null) return false;
    const cutoffs = g.cls.cutoffs?.length ? g.cls.cutoffs : DEFAULT_CUTOFFS;
    const cut = cutoffFor(g.cls.targetGrade || 'A', cutoffs);
    return cut !== null && g.grade.pct < cut;
  });
  const past = cumulativeGPA(pastClasses());
  const term = projectedTermGPA(grades.map(g => ({ creditHours: g.cls.creditHours, letter: g.grade.letter })));
  const proj = projectedCumulative(past, term);

  // --- agenda: next 7 days
  const today = dayStart(now);
  const week = new Date(today.getTime() + 7 * MS_DAY);
  const open = items.filter(i => i.status !== 'graded' && i.status !== 'submitted');
  const agenda = open.filter(i => i.dueAt && new Date(i.dueAt) < week)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

  // --- exams within 21 days
  const exams = items.filter(i => i.type === 'test' && i.status !== 'graded' && i.dueAt &&
    daysUntil(i.dueAt, now) >= 0 && daysUntil(i.dueAt, now) <= 21)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

  // --- today's study blocks
  const todayBlocks = allStudyBlocks(items, now).filter(b => dayStart(b.date).getTime() === today.getTime());

  // --- priority
  const ranked = rankItems(classes, items, now).slice(0, 8);

  const hasAnyItems = items.length > 0;

  container.innerHTML = `
    <div class="page">
      <div class="hero-strip">
        <div class="eyebrow">${esc(sem?.name || 'No current semester')} · Week of ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</div>
        <h1 class="page-title">Command Center</h1>
        <div class="stat-row">
          <div class="stat-block">
            <div class="stat-num">${proj.gpa !== null ? proj.gpa.toFixed(3) : past.gpa?.toFixed(3) ?? '—'}</div>
            <div class="stat-label">Projected Cum GPA</div>
          </div>
          <div class="stat-block">
            <div class="stat-num">${term.gpa !== null ? term.gpa.toFixed(2) : '—'}</div>
            <div class="stat-label">Term GPA (live)</div>
          </div>
          <div class="stat-block ${below.length ? 'stat-warn' : ''}">
            <div class="stat-num">${below.length}</div>
            <div class="stat-label">${below.length === 1 ? 'Class' : 'Classes'} below target</div>
          </div>
        </div>
      </div>

      ${below.length ? `<div class="alert-banner">${icon('alert', 18)}
        <span><strong>Protect the 4.0:</strong> ${below.map(b =>
          `${esc(b.cls.code)} at ${fmtPct(b.grade.pct)} (target ${esc(b.cls.targetGrade || 'A')})`).join(' · ')}</span></div>` : ''}

      <section>
        ${sectionHead('Your Classes', '')}
        <div class="class-chips">
          ${classes.map(c => {
            const g = grades.find(x => x.cls.id === c.id).grade;
            return `<a class="class-chip" href="#/class/${c.id}">
              <span class="class-dot" style="background:${c.color}"></span>
              <span class="chip-code">${esc(c.code)}</span>
              <span class="chip-grade">${g.pct !== null ? `${fmtPct(g.pct)} ${gradeBadge(g.letter)}` : '<span class="caption">no grades yet</span>'}</span>
            </a>`;
          }).join('') || emptyState('graduationCap', 'No classes yet', 'Add your Fall 2026 classes in Settings.')}
        </div>
      </section>

      ${exams.length ? `<section>
        ${sectionHead('Exam Countdowns', '')}
        <div class="exam-cards">
          ${exams.map(e => {
            const d = daysUntil(e.dueAt, now);
            const cls = classes.find(c => c.id === e.classId);
            return `<a class="exam-card ${d <= 3 ? 'exam-urgent' : ''}" href="#/class/${e.classId}?exam=${e.id}">
              <div class="exam-days"><span class="stat-num">${d}</span><span class="stat-label">${d === 1 ? 'day' : 'days'}</span></div>
              <div class="exam-info">
                <div class="item-title">${esc(e.title)}</div>
                <div class="caption">${esc(cls?.code || '')} · ${relDay(e.dueAt, now)} · study plan &amp; materials ${icon('chevronRight', 13)}</div>
              </div></a>`;
          }).join('')}
        </div>
      </section>` : ''}

      ${todayBlocks.length ? `<section>
        ${sectionHead("Today's Study Blocks", '')}
        ${todayBlocks.map(b => `<div class="study-block">${icon('bookOpen', 16)}<div>
          <div class="item-title">${esc(b.label)}</div><div class="caption">${esc(b.focus)}</div></div></div>`).join('')}
      </section>` : ''}

      <section>
        ${sectionHead('Priorities', 'What to work on')}
        <div id="prio-list">
        ${ranked.length ? ranked.map(r => itemRow(r.item, {
          why: [
            r.overdue ? '<strong>OVERDUE</strong>' : null,
            r.impact !== null ? `${r.impact.toFixed(1)}% of grade` : null,
            r.classPct !== null ? `${esc(r.cls.code)} at ${fmtPct(r.classPct)}` : `${esc(r.cls.code)}: no grades yet`,
            r.border > 1.05 ? 'borderline — protect it' : null,
          ].filter(Boolean).join(' · '),
        })).join('')
        : emptyState('checkSquare', hasAnyItems ? 'Nothing open — all caught up' : 'No assignments yet',
            hasAnyItems ? 'Everything is submitted or graded.' : 'Import a syllabus or add your first item to get rolling.',
            'Add an item', 'dash-add-empty')}
        </div>
      </section>

      <section>
        ${sectionHead('Next 7 Days', '')}
        <div id="agenda-list">
        ${agenda.length ? agenda.map(i => itemRow(i)).join('')
          : `<p class="caption">Nothing due in the next 7 days${hasAnyItems ? '' : ' — add items or import a syllabus'}.</p>`}
        </div>
      </section>
    </div>
    <button class="fab" id="fab-add" aria-label="Add item">${icon('plus', 24)}</button>
  `;

  bindItemRows(container, items);
  container.querySelector('#fab-add').onclick = () => openItemEditor({});
  container.querySelector('#dash-add-empty')?.addEventListener('click', () => openItemEditor({}));
}
