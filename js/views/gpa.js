// GPA view: real transcript history, live projection, goal solver.
import { esc, icon, fmtPct, sectionHead, gradeBadge } from '../components/ui.js';
import { state, currentSemester, classesFor, currentItems, pastClasses } from '../store.js';
import { classGrade } from '../engine/grades.js';
import { GRADE_POINTS, termGPA, cumulativeGPA, projectedTermGPA, projectedCumulative, requiredTermGPA } from '../engine/gpa.js';

export function render(container) {
  const pastSems = state.semesters.filter(s => s.status === 'past');
  const sem = currentSemester();
  const items = currentItems();
  const past = cumulativeGPA(pastClasses());

  const liveClasses = sem ? classesFor(sem.id) : [];
  const live = liveClasses.map(c => ({ cls: c, grade: classGrade(c, itemsOf(c)) }));
  function itemsOf(c) { return items.filter(i => i.classId === c.id); }
  const term = projectedTermGPA(live.map(l => ({ creditHours: l.cls.creditHours, letter: l.grade.letter })));
  const proj = projectedCumulative(past, term);
  const termCredits = liveClasses.reduce((s, c) => s + c.creditHours, 0);

  container.innerHTML = `
    <div class="page">
      ${sectionHead('GPA', 'Tracking & Projection')}
      <div class="stat-row">
        <div class="stat-block"><div class="stat-num">${past.gpa !== null ? past.gpa.toFixed(3) : '—'}</div>
          <div class="stat-label">Cumulative GPA <span class="caption">(${past.credits} cr)</span></div></div>
        <div class="stat-block"><div class="stat-num">${term.gpa !== null ? term.gpa.toFixed(3) : '—'}</div>
          <div class="stat-label">Live Term GPA</div></div>
        <div class="stat-block"><div class="stat-num">${proj.gpa !== null ? proj.gpa.toFixed(3) : past.gpa?.toFixed(3) ?? '—'}</div>
          <div class="stat-label">Projected Cumulative</div></div>
      </div>
      <p class="caption">Live term GPA uses each class's current letter grade; classes with no grades yet are excluded until something is graded. UM scale: A+/A = 4.0, A- = 3.7, B+ = 3.3…</p>

      ${sem ? `<section>
        ${sectionHead(esc(sem.name), 'In Progress')}
        <table class="gpa-table">
          <thead><tr><th>Class</th><th>Cr</th><th>Current</th><th>Letter</th><th>Pts</th></tr></thead>
          <tbody>${live.map(l => `
            <tr>
              <td><a href="#/class/${l.cls.id}">${esc(l.cls.code)}</a></td>
              <td>${l.cls.creditHours}</td>
              <td class="mono">${l.grade.pct !== null ? fmtPct(l.grade.pct) : '—'}</td>
              <td>${gradeBadge(l.grade.letter, l.grade.pct)}</td>
              <td class="mono">${l.grade.letter ? (GRADE_POINTS[l.grade.letter] * l.cls.creditHours).toFixed(1) : '—'}</td>
            </tr>`).join('')}</tbody>
        </table>
      </section>` : ''}

      <section>
        ${sectionHead('GPA Goal', 'What does this semester need to be?')}
        <div class="wi-controls">
          <label class="field"><span>Target cumulative GPA</span>
            <input id="goal-input" type="number" min="0" max="4" step="0.01" value="4.00" style="max-width:140px"></label>
        </div>
        <div id="goal-result"></div>
      </section>

      <section>
        ${sectionHead('Semester History', 'From your transcript')}
        ${pastSems.map(s => {
          const cs = classesFor(s.id);
          const t = termGPA(cs);
          return `<div class="sem-card">
            <div class="sem-head"><h4 class="h-5">${esc(s.name)}</h4>
              <span class="mono">${t.gpa !== null ? t.gpa.toFixed(3) : '—'} <span class="caption">· ${t.credits} cr</span></span></div>
            ${cs.map(c => `<div class="sem-row">
              <span>${esc(c.code)} <span class="caption">${esc(c.name)}</span></span>
              <span class="caption">${c.creditHours} cr${c.creditHours === 0 ? ' (not in GPA)' : ''}</span>
              ${gradeBadge(c.finalLetterGrade)}
            </div>`).join('')}
          </div>`;
        }).join('') || '<p class="caption">No past semesters.</p>'}
      </section>
    </div>`;

  const goalBox = container.querySelector('#goal-result');
  const renderGoal = () => {
    const target = parseFloat(container.querySelector('#goal-input').value);
    if (Number.isNaN(target)) { goalBox.innerHTML = ''; return; }
    if (!termCredits) { goalBox.innerHTML = '<p class="caption">No current-semester credits to project with.</p>'; return; }
    const r = requiredTermGPA(target, past, termCredits);
    goalBox.innerHTML = r.alreadyMet
      ? `<div class="wi-verdict ok">${icon('check', 16)} Already there — any passing term keeps you at or above ${target.toFixed(2)}.</div>`
      : r.possible
        ? `<div class="wi-verdict ${r.gpa > 3.8 ? 'warn' : 'ok'}">You need a <strong>${r.gpa.toFixed(3)}</strong> term GPA across your ${termCredits} credits this semester to land at ${target.toFixed(2)} cumulative.</div>`
        : `<div class="wi-verdict bad">${icon('alert', 16)} Not reachable this semester — even a 4.0 term gets you to ${projectedCumulative(past, { credits: termCredits, qualityPoints: 4 * termCredits }).gpa.toFixed(3)}.</div>`;
  };
  container.querySelector('#goal-input').oninput = renderGoal;
  renderGoal();
}
