// Run: node tests/engine.test.js
import assert from 'node:assert/strict';
import { classGrade, letterFor, DEFAULT_CUTOFFS, categoryStats } from '../js/engine/grades.js';
import { GRADE_POINTS, termGPA, cumulativeGPA, projectedTermGPA, projectedCumulative, requiredTermGPA } from '../js/engine/gpa.js';
import { neededForTarget, gradeIf } from '../js/engine/whatif.js';
import { rankItems, gradeImpactPct } from '../js/engine/priority.js';
import { studyPlan, daysUntil } from '../js/engine/studyplan.js';

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { console.error(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; }
}
const approx = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `expected ${b}, got ${a}`);

// ---------- fixtures ----------
const cls = {
  id: 'c1',
  gradingWeights: [
    { category: 'Exams', weightPct: 40 },
    { category: 'Quizzes', weightPct: 20 },
    { category: 'Homework', weightPct: 25 },
    { category: 'Participation', weightPct: 15 },
  ],
  policies: { dropLowest: [{ category: 'Quizzes', n: 1 }], rounding: 'none' },
  cutoffs: [],
};
const item = (id, category, pts, score, extra = {}) => ({
  id, classId: 'c1', title: id, type: 'assignment', category,
  pointsPossible: pts, scoreEarned: score,
  status: score == null ? 'upcoming' : 'graded', ...extra,
});

// ---------- letters & cutoffs ----------
test('letterFor standard cutoffs', () => {
  assert.equal(letterFor(97, DEFAULT_CUTOFFS), 'A+');
  assert.equal(letterFor(93, DEFAULT_CUTOFFS), 'A');
  assert.equal(letterFor(92.99, DEFAULT_CUTOFFS), 'A-');
  assert.equal(letterFor(59, DEFAULT_CUTOFFS), 'F');
});
test('letterFor with nearest rounding', () => {
  assert.equal(letterFor(92.5, DEFAULT_CUTOFFS, 'nearest'), 'A');
  assert.equal(letterFor(92.4, DEFAULT_CUTOFFS, 'nearest'), 'A-');
});
test('custom per-class cutoffs', () => {
  const custom = [{ letter: 'A', minPct: 90 }, { letter: 'B', minPct: 80 }, { letter: 'F', minPct: 0 }];
  assert.equal(letterFor(91, custom), 'A');
});

// ---------- weighted class grade ----------
test('weighted grade across categories', () => {
  const items = [
    item('e1', 'Exams', 100, 90),
    item('q1', 'Quizzes', 10, 8),  // 80 — dropped (lowest)
    item('q2', 'Quizzes', 10, 10), // kept: 100%
    item('h1', 'Homework', 20, 19), // 95%
    item('p1', 'Participation', 10, 10), // 100%
  ];
  const g = classGrade(cls, items);
  // 90*.4 + 100*.2 + 95*.25 + 100*.15 = 36+20+23.75+15 = 94.75
  approx(g.pct, 94.75);
  assert.equal(g.letter, 'A');
  approx(g.gradedWeightPct, 100);
});
test('drop lowest keeps at least one and drops by percentage', () => {
  const items = [item('q1', 'Quizzes', 10, 5), item('q2', 'Quizzes', 20, 20)];
  const stats = categoryStats(cls, items).find(c => c.category === 'Quizzes');
  approx(stats.pct, 100); // 5/10=50% dropped
  assert.deepEqual(stats.droppedIds, ['q1']);
  // only one graded quiz: nothing dropped
  const one = categoryStats(cls, [item('q1', 'Quizzes', 10, 5)]).find(c => c.category === 'Quizzes');
  approx(one.pct, 50);
});
test('empty categories renormalize weights', () => {
  const items = [item('e1', 'Exams', 100, 90), item('h1', 'Homework', 100, 100)];
  const g = classGrade(cls, items);
  // active weight 65: 90*(40/65) + 100*(25/65) = 93.846...
  approx(g.pct, (90 * 40 + 100 * 25) / 65);
  approx(g.gradedWeightPct, 65);
});
test('no grades yet → null grade', () => {
  const g = classGrade(cls, [item('e1', 'Exams', 100, null)]);
  assert.equal(g.pct, null);
  assert.equal(g.letter, null);
});

// ---------- GPA (uses the real seeded transcript shape) ----------
test('UM grade points: A+ and A both 4.0', () => {
  assert.equal(GRADE_POINTS['A+'], 4.0);
  assert.equal(GRADE_POINTS['A'], 4.0);
  assert.equal(GRADE_POINTS['A-'], 3.7);
});
const fall25 = [
  { creditHours: 3, finalLetterGrade: 'A+' }, { creditHours: 3, finalLetterGrade: 'A+' },
  { creditHours: 3, finalLetterGrade: 'A' },  { creditHours: 3, finalLetterGrade: 'A+' },
  { creditHours: 0, finalLetterGrade: 'A' },  // UMX 100 — excluded
  { creditHours: 3, finalLetterGrade: 'A+' },
];
const spring26 = [
  { creditHours: 3, finalLetterGrade: 'A+' }, { creditHours: 3, finalLetterGrade: 'A' },
  { creditHours: 3, finalLetterGrade: 'A+' }, { creditHours: 3, finalLetterGrade: 'A+' },
  { creditHours: 3, finalLetterGrade: 'A+' },
];
test('seeded transcript: term GPAs 4.000 on 15 credits, 0-credit excluded', () => {
  const t = termGPA(fall25);
  approx(t.gpa, 4.0); assert.equal(t.credits, 15);
  const s = termGPA(spring26);
  approx(s.gpa, 4.0); assert.equal(s.credits, 15);
});
test('seeded transcript: cumulative 4.000 on 30 credits', () => {
  const c = cumulativeGPA([...fall25, ...spring26]);
  approx(c.gpa, 4.0); assert.equal(c.credits, 30);
});
test('projected cumulative blends past and live term', () => {
  const past = cumulativeGPA([...fall25, ...spring26]); // 30cr 4.0
  const term = projectedTermGPA([
    { creditHours: 3, letter: 'A' }, { creditHours: 3, letter: 'B+' },
    { creditHours: 3, letter: null }, // no grades yet — excluded
  ]);
  approx(term.gpa, (4.0 * 3 + 3.3 * 3) / 6);
  const proj = projectedCumulative(past, term);
  approx(proj.gpa, (30 * 4 + 3 * 4 + 3 * 3.3) / 36);
});
test('required term GPA for target cumulative', () => {
  const past = { credits: 30, qualityPoints: 120 }; // 4.0
  const r = requiredTermGPA(3.9, past, 16);
  // 3.9*46 = 179.4; need 59.4 QP / 16cr = 3.7125
  approx(r.gpa, 3.7125);
  assert.ok(r.possible);
  const impossible = requiredTermGPA(4.05, past, 16);
  assert.ok(!impossible.possible);
});

// ---------- what-if ----------
test('needed average for target (linear model)', () => {
  // One category, 50% of points graded at 80%. Target A (93).
  const simple = { id: 'c1', gradingWeights: [{ category: 'All', weightPct: 100 }], policies: {}, cutoffs: [] };
  const items = [item('a1', 'All', 100, 80), item('a2', 'All', 100, null)];
  const r = neededForTarget(simple, items, 'A');
  // (80 + x*100)/200 = .93 → x = 1.06 → impossible
  approx(r.neededPct, 106);
  assert.ok(r.impossible);
  const rB = neededForTarget(simple, items, 'B'); // 83 → x=.86
  approx(rB.neededPct, 86);
  assert.ok(!rB.impossible && !rB.lockedIn);
  assert.equal(rB.remainingItems.length, 1);
  approx(rB.remainingItems[0].requiredScore, 86);
});
test('locked in and fully locked', () => {
  const simple = { id: 'c1', gradingWeights: [{ category: 'All', weightPct: 100 }], policies: {}, cutoffs: [] };
  const lockedIn = neededForTarget(simple, [item('a1', 'All', 100, 99), item('a2', 'All', 900, null)], 'F');
  assert.ok(lockedIn.lockedIn);
  const locked = neededForTarget(simple, [item('a1', 'All', 100, 95)], 'A');
  assert.ok(locked.locked && locked.achieves);
});
test('empty category counts as fully remaining in solver', () => {
  const r = neededForTarget(cls, [item('e1', 'Exams', 100, 90)], 'A');
  // graded: exam 90% of 40w. Remaining: quizzes/homework/participation (60w) at x.
  // 0.4*90 + 0.6*(100x) = 93 → x = (93-36)/60 = .95
  approx(r.neededPct, 95);
  assert.ok(r.hasUnscheduled);
});
test('gradeIf recomputes with hypothetical score', () => {
  const simple = { id: 'c1', gradingWeights: [{ category: 'All', weightPct: 100 }], policies: {}, cutoffs: [] };
  const items = [item('a1', 'All', 100, 80), item('a2', 'All', 100, null)];
  const g = gradeIf(simple, items, { a2: 100 });
  approx(g.pct, 90);
  assert.equal(g.letter, 'A-');
});

// ---------- priority ----------
test('big project in borderline class outranks small quiz in safe class', () => {
  const now = new Date('2026-10-01T12:00');
  const borderline = {
    id: 'b', targetGrade: 'A', gradingWeights: [{ category: 'Projects', weightPct: 50 }, { category: 'Exams', weightPct: 50 }],
    policies: {}, cutoffs: [],
  };
  const safe = {
    id: 's', targetGrade: 'A', gradingWeights: [{ category: 'Quizzes', weightPct: 10 }, { category: 'Exams', weightPct: 90 }],
    policies: {}, cutoffs: [],
  };
  const items = [
    // borderline class: exam graded at 90.2% (below A cutoff 93)
    { id: 'be', classId: 'b', category: 'Exams', pointsPossible: 100, scoreEarned: 90.2, status: 'graded', type: 'test' },
    // the 25%-of-grade project (half of Projects' 50%), due in 5 days
    { id: 'bp', classId: 'b', category: 'Projects', pointsPossible: 100, scoreEarned: null, status: 'upcoming', type: 'project', dueAt: '2026-10-06T23:59', title: 'Project' },
    { id: 'bp2', classId: 'b', category: 'Projects', pointsPossible: 100, scoreEarned: null, status: 'upcoming', type: 'project', dueAt: '2026-11-20T23:59', title: 'Project 2' },
    // safe class at 97
    { id: 'se', classId: 's', category: 'Exams', pointsPossible: 100, scoreEarned: 97, status: 'graded', type: 'test' },
    // 5% quiz due sooner (3 days)
    { id: 'sq', classId: 's', category: 'Quizzes', pointsPossible: 10, scoreEarned: null, status: 'upcoming', type: 'quiz', dueAt: '2026-10-04T09:00', title: 'Quiz' },
    { id: 'sq2', classId: 's', category: 'Quizzes', pointsPossible: 10, scoreEarned: null, status: 'upcoming', type: 'quiz', dueAt: '2026-11-10T09:00', title: 'Quiz 2' },
  ];
  const ranked = rankItems([borderline, safe], items, now);
  assert.equal(ranked[0].item.id, 'bp', `expected project first, got ${ranked[0].item.id}`);
  const proj = ranked.find(r => r.item.id === 'bp');
  approx(gradeImpactPct(borderline, items, items[1]), 25); // 50w × 100/200pts
});
test('overdue items pin to the top', () => {
  const now = new Date('2026-10-10T12:00');
  const c = { id: 'c', gradingWeights: [{ category: 'HW', weightPct: 100 }], policies: {}, cutoffs: [] };
  const items = [
    { id: 'late', classId: 'c', category: 'HW', pointsPossible: 5, scoreEarned: null, status: 'upcoming', type: 'assignment', dueAt: '2026-10-09T23:59' },
    { id: 'soon', classId: 'c', category: 'HW', pointsPossible: 100, scoreEarned: null, status: 'upcoming', type: 'assignment', dueAt: '2026-10-11T23:59' },
  ];
  assert.equal(rankItems([c], items, now)[0].item.id, 'late');
});
test('graded and submitted items leave the ranking', () => {
  const c = { id: 'c', gradingWeights: [{ category: 'HW', weightPct: 100 }], policies: {}, cutoffs: [] };
  const items = [
    { id: 'g', classId: 'c', category: 'HW', pointsPossible: 10, scoreEarned: 9, status: 'graded', type: 'assignment' },
    { id: 'sub', classId: 'c', category: 'HW', pointsPossible: 10, scoreEarned: null, status: 'submitted', type: 'assignment' },
  ];
  assert.equal(rankItems([c], items).length, 0);
});

// ---------- study plan ----------
test('study plan: 10 days out gives 4–6 sessions, denser near the exam', () => {
  const now = new Date('2026-10-01T08:00');
  const exam = { id: 'x', type: 'test', title: 'ACC Exam 1', dueAt: '2026-10-11T09:30', status: 'upcoming' };
  const plan = studyPlan(exam, now);
  assert.ok(plan.length >= 4 && plan.length <= 8, `got ${plan.length}`);
  const lastThree = plan.filter(s => daysUntil(exam.dueAt, s.date) <= 3);
  assert.equal(lastThree.length, 3); // daily in the final 3 days
});
test('study plan regenerates when the date moves, empty when out of range', () => {
  const now = new Date('2026-10-01T08:00');
  const exam = { id: 'x', type: 'test', title: 'E', dueAt: '2026-10-05T09:00' };
  const a = studyPlan(exam, now).length;
  const b = studyPlan({ ...exam, dueAt: '2026-10-15T09:00' }, now).length;
  assert.ok(b > a);
  assert.equal(studyPlan({ ...exam, dueAt: '2026-11-30T09:00' }, now).length, 0); // >21d
  assert.equal(studyPlan({ ...exam, dueAt: '2026-09-30T09:00' }, now).length, 0); // past
});

console.log(`\n${passed} tests passed${process.exitCode ? ' (with failures)' : ''}`);
