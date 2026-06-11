// Priority ranking: urgency × grade impact × how borderline the class grade is.
import { classGrade, cutoffFor, DEFAULT_CUTOFFS, isGraded } from './grades.js';

const MS_DAY = 86400000;

// Share of the final grade this item represents (0–100).
export function gradeImpactPct(cls, items, item) {
  const w = (cls.gradingWeights || []).find(w => w.category === item.category);
  if (!w) return null;
  const catItems = items.filter(i => i.classId === cls.id && i.category === item.category);
  const totPts = catItems.reduce((s, i) => s + (i.pointsPossible || 100), 0);
  const share = totPts > 0 ? (item.pointsPossible || 100) / totPts : 1 / Math.max(1, catItems.length);
  return w.weightPct * share;
}

// > 1 when the class grade is at or below the target cutoff, < 1 when comfortably above.
export function borderlineFactor(cls, items, targetLetter = 'A') {
  const grade = classGrade(cls, items);
  if (grade.pct === null) return 1; // nothing graded yet
  const cutoffs = cls.cutoffs?.length ? cls.cutoffs : DEFAULT_CUTOFFS;
  const cutoff = cutoffFor(cls.targetGrade || targetLetter, cutoffs);
  if (cutoff === null) return 1;
  const margin = grade.pct - cutoff; // negative = below target
  return Math.min(3, Math.max(0.4, 1.4 - margin * 0.15));
}

export function urgency(item, now) {
  if (!item.dueAt) return 0.3;
  const days = (new Date(item.dueAt) - now) / MS_DAY;
  if (days < 0) return 20 + Math.min(10, -days); // overdue pins to top
  return 10 / (days + 1);
}

// Rank all open items across current classes. Returns sorted descending.
export function rankItems(classes, items, now = new Date()) {
  const open = items.filter(i => i.status !== 'graded' && i.status !== 'submitted');
  const byClass = Object.fromEntries(classes.map(c => [c.id, c]));
  const ranked = open.map(item => {
    const cls = byClass[item.classId];
    if (!cls) return null;
    const impact = gradeImpactPct(cls, items, item);
    const border = borderlineFactor(cls, items);
    const urg = urgency(item, now);
    const grade = classGrade(cls, items);
    const overdue = item.dueAt && new Date(item.dueAt) < now;
    const score = urg * ((impact ?? 2) + 0.5) * border * (item.priority ? 2 : 1);
    return { item, cls, score, impact, border, urg, overdue, classPct: grade.pct };
  }).filter(Boolean);
  // Overdue work always pins above everything else, then by weighted score.
  return ranked.sort((a, b) => (b.overdue - a.overdue) || (b.score - a.score));
}
