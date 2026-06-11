// Grade math engine — pure functions, no DOM, no DB.
// All percentages are 0–100 floats unless noted.

export const DEFAULT_CUTOFFS = [
  { letter: 'A+', minPct: 97 },
  { letter: 'A',  minPct: 93 },
  { letter: 'A-', minPct: 90 },
  { letter: 'B+', minPct: 87 },
  { letter: 'B',  minPct: 83 },
  { letter: 'B-', minPct: 80 },
  { letter: 'C+', minPct: 77 },
  { letter: 'C',  minPct: 73 },
  { letter: 'C-', minPct: 70 },
  { letter: 'D+', minPct: 67 },
  { letter: 'D',  minPct: 63 },
  { letter: 'F',  minPct: 0 },
];

export function isGraded(item) {
  return item.scoreEarned !== null && item.scoreEarned !== undefined &&
         item.pointsPossible > 0;
}

function dropCountFor(cls, category) {
  const drops = cls.policies?.dropLowest || [];
  const rule = drops.find(d => d.category === category);
  return rule ? rule.n : 0;
}

// Graded items in a category with the n lowest percentage scores dropped.
export function gradedAfterDrops(cls, items, category) {
  const graded = items
    .filter(i => i.classId === cls.id && i.category === category && isGraded(i))
    .sort((a, b) => (a.scoreEarned / a.pointsPossible) - (b.scoreEarned / b.pointsPossible));
  const n = Math.min(dropCountFor(cls, category), Math.max(0, graded.length - 1));
  return { kept: graded.slice(n), dropped: graded.slice(0, n) };
}

// Per-category stats for one class.
export function categoryStats(cls, items) {
  return (cls.gradingWeights || []).map(({ category, weightPct }) => {
    const { kept, dropped } = gradedAfterDrops(cls, items, category);
    const earned = kept.reduce((s, i) => s + i.scoreEarned, 0);
    const possible = kept.reduce((s, i) => s + i.pointsPossible, 0);
    const allItems = items.filter(i => i.classId === cls.id && i.category === category);
    return {
      category, weightPct,
      earned, possible,
      pct: possible > 0 ? (earned / possible) * 100 : null,
      gradedCount: kept.length + dropped.length,
      itemCount: allItems.length,
      droppedIds: dropped.map(i => i.id),
    };
  });
}

export function letterFor(pct, cutoffs = DEFAULT_CUTOFFS, rounding = 'none') {
  if (pct === null || pct === undefined) return null;
  const p = rounding === 'nearest' ? Math.round(pct) : pct;
  const sorted = [...cutoffs].sort((a, b) => b.minPct - a.minPct);
  for (const c of sorted) if (p >= c.minPct) return c.letter;
  return sorted[sorted.length - 1]?.letter ?? 'F';
}

export function cutoffFor(letter, cutoffs = DEFAULT_CUTOFFS) {
  const c = cutoffs.find(c => c.letter === letter);
  return c ? c.minPct : null;
}

// Current weighted class grade.
// Empty categories (nothing graded) are excluded and the remaining
// category weights are renormalized to 100%.
export function classGrade(cls, items) {
  const cats = categoryStats(cls, items);
  const active = cats.filter(c => c.pct !== null);
  const activeWeight = active.reduce((s, c) => s + c.weightPct, 0);
  const totalWeight = cats.reduce((s, c) => s + c.weightPct, 0);
  let pct = null;
  if (activeWeight > 0) {
    pct = active.reduce((s, c) => s + c.pct * (c.weightPct / activeWeight), 0);
  }
  const cutoffs = cls.cutoffs?.length ? cls.cutoffs : DEFAULT_CUTOFFS;
  return {
    pct,
    letter: letterFor(pct, cutoffs, cls.policies?.rounding),
    perCategory: cats,
    gradedWeightPct: totalWeight > 0 ? (activeWeight / totalWeight) * 100 : 0,
  };
}
