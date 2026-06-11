// Two-way what-if calculator view.
import { esc, icon, fmtPct, sectionHead, gradeBadge } from '../components/ui.js';
import { state, currentClasses, itemsFor } from '../store.js';
import { classGrade, isGraded, DEFAULT_CUTOFFS } from '../engine/grades.js';
import { neededForTarget, gradeIf } from '../engine/whatif.js';
import { GRADE_POINTS } from '../engine/gpa.js';

const LETTERS = Object.keys(GRADE_POINTS).filter(l => l !== 'F');

export function render(container, params) {
  const classes = currentClasses();
  if (!classes.length) {
    container.innerHTML = `<div class="page">${sectionHead('What-If', 'Calculator')}<p class="caption">No classes in the current semester yet.</p></div>`;
    return;
  }
  const fromQuery = (params.query || '').match(/class=([^&]+)/)?.[1];
  const clsId = fromQuery && classes.some(c => c.id === fromQuery) ? fromQuery : classes[0].id;
  const cls = classes.find(c => c.id === clsId);
  const items = itemsFor(cls.id);
  const grade = classGrade(cls, items);
  const hasWeights = (cls.gradingWeights || []).length > 0;
  const categories = (cls.gradingWeights || []).map(w => w.category);
  const upcoming = items.filter(i => !isGraded(i)).sort((a, b) => (a.dueAt || '9999') < (b.dueAt || '9999') ? -1 : 1);

  container.innerHTML = `
    <div class="page">
      ${sectionHead('What-If', 'Grade Calculator')}
      <label class="field" style="max-width:340px"><span>Class</span>
        <select id="wi-class">${classes.map(c => `<option value="${c.id}" ${c.id === cls.id ? 'selected' : ''}>${esc(c.code)} — ${esc(c.name)}</option>`).join('')}</select>
      </label>
      <div class="grade-hero" style="margin-top:12px">
        <div class="stat-block"><div class="stat-num">${grade.pct !== null ? fmtPct(grade.pct) : '—'}</div>
        <div class="stat-label">Current ${gradeBadge(grade.letter, grade.pct)}</div></div>
        <div class="caption" style="align-self:center">${grade.pct !== null ? `Based on ${grade.gradedWeightPct.toFixed(0)}% of weight graded.` : 'No grades yet — both directions work once items and weights exist.'}</div>
      </div>

      ${!hasWeights ? `<div class="setup-callout">${icon('alert', 18)}<div><strong>Set up grading weights first</strong><br>
        <span class="caption">The calculator needs this class's category weights. Set them in the <a href="#/class/${cls.id}">class page</a> or import the syllabus.</span></div></div>` : `

      <section>
        ${sectionHead('Direction 1', 'What do I need?')}
        <div class="wi-controls">
          <label class="field"><span>Target grade</span>
            <select id="wi-target">${LETTERS.map(l => `<option ${l === (cls.targetGrade || 'A') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field"><span>Scope</span>
            <select id="wi-scope"><option value="">Overall — all remaining items</option>
              ${categories.map(c => `<option value="${esc(c)}">Remaining ${esc(c)} only</option>`).join('')}</select></label>
        </div>
        <div id="wi-needed"></div>
      </section>

      <section>
        ${sectionHead('Direction 2', 'If I score X…')}
        ${upcoming.length ? `<div id="wi-sliders">
          ${upcoming.map(i => `
            <div class="wi-slider-row" data-sid="${i.id}">
              <div class="wi-slider-head"><span class="item-title">${esc(i.title)}</span>
                <span class="caption">${esc(i.category)} · ${i.pointsPossible ?? 100} pts</span></div>
              <div class="wi-slider-body">
                <input type="range" min="0" max="100" value="85" data-slider="${i.id}">
                <span class="wi-slider-val mono" data-val="${i.id}">85%</span>
              </div>
            </div>`).join('')}
          <div class="wi-result" id="wi-result"></div>
        </div>` : `<p class="caption">No upcoming items in ${esc(cls.code)} — add assignments or import the syllabus to model scores.</p>`}
      </section>`}
    </div>`;

  container.querySelector('#wi-class').onchange = e => {
    location.hash = `/whatif?class=${e.target.value}`;
  };
  if (!hasWeights) return;

  // ----- Direction 1
  const renderNeeded = () => {
    const target = container.querySelector('#wi-target').value;
    const scope = container.querySelector('#wi-scope').value || null;
    const r = neededForTarget(cls, items, target, scope);
    const box = container.querySelector('#wi-needed');
    if (r.error) { box.innerHTML = `<p class="caption">${esc(r.error)}</p>`; return; }
    if (r.locked) {
      box.innerHTML = `<div class="wi-verdict ${r.achieves ? 'ok' : 'bad'}">
        ${r.achieves ? `Locked in — you finish at ${fmtPct(r.finalPct)}, which clears ${esc(target)}.` :
        `Nothing left to grade — final is ${fmtPct(r.finalPct)}, below the ${esc(target)} cutoff. Not reachable.`}</div>`;
      return;
    }
    let verdict;
    if (r.impossible) verdict = `<div class="wi-verdict bad">${icon('alert', 16)} Mathematically out of reach${scope ? ' within this scope' : ''} — even 100% on everything remaining lands at ${fmtPct(r.bestCase)}.${cls.policies?.extraCredit ? ` Extra credit could still help: ${esc(cls.policies.extraCredit)}.` : ''}</div>`;
    else if (r.lockedIn) verdict = `<div class="wi-verdict ok">${icon('check', 16)} Already locked in — even 0% on the rest keeps you at ${fmtPct(r.worstCase)} or better.</div>`;
    else verdict = `<div class="wi-verdict ${r.neededPct > 92 ? 'warn' : 'ok'}">You need to average <strong>${fmtPct(r.neededPct)}</strong> on ${scope ? `remaining ${esc(scope)}` : 'everything remaining'} to finish with ${gradeBadge(target)}.</div>`;
    box.innerHTML = `${verdict}
      <div class="caption" style="margin:6px 0 10px">Best case ${fmtPct(r.bestCase)} · worst case ${fmtPct(r.worstCase)}${scope ? ' · other categories held at current averages' : ''}${r.hasUnscheduled ? ' · includes categories with no items scheduled yet' : ''}</div>
      ${(!r.impossible && !r.lockedIn && r.remainingItems.length) ? `
        <div class="eyebrow" style="margin-bottom:6px">Per Remaining Item</div>
        ${r.remainingItems.map(x => `<div class="wi-item-need"><span>${esc(x.item.title)}</span>
          <span class="mono">${x.requiredScore.toFixed(1)} / ${x.item.pointsPossible ?? 100}</span></div>`).join('')}` : ''}`;
  };
  container.querySelector('#wi-target').onchange = renderNeeded;
  container.querySelector('#wi-scope').onchange = renderNeeded;
  renderNeeded();

  // ----- Direction 2
  if (!upcoming.length) return;
  const overrides = {};
  const renderResult = () => {
    const g = gradeIf(cls, items, overrides);
    const n = Object.keys(overrides).length;
    container.querySelector('#wi-result').innerHTML = n
      ? `With ${n === 1 ? 'that score' : 'those scores'}: <strong class="mono">${fmtPct(g.pct)}</strong> ${gradeBadge(g.letter, g.pct)}
         <span class="caption">(${g.gradedWeightPct.toFixed(0)}% of weight would be graded)</span>`
      : `<span class="caption">Drag a slider to model a score.</span>`;
  };
  container.querySelectorAll('[data-slider]').forEach(s => {
    s.addEventListener('input', () => {
      const id = s.dataset.slider;
      const item = upcoming.find(i => i.id === id);
      const pct = parseInt(s.value, 10);
      overrides[id] = (pct / 100) * (item.pointsPossible ?? 100);
      container.querySelector(`[data-val="${id}"]`).textContent = `${pct}%`;
      renderResult();
    });
  });
  renderResult();
}
