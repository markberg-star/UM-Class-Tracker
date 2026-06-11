// Two-way what-if calculator. Pure functions.
import { gradedAfterDrops, classGrade, cutoffFor, letterFor, DEFAULT_CUTOFFS, isGraded } from './grades.js';

// Build the linear model final(x) = A + B·x where x ∈ [0,1] is the uniform
// fraction scored on every remaining (ungraded) item.
// Categories with no items yet are modeled as fully remaining.
// Drop-lowest is applied to the graded portion only.
export function gradeModel(cls, items, scopeCategory = null) {
  const weights = cls.gradingWeights || [];
  const totalWeight = weights.reduce((s, w) => s + w.weightPct, 0);
  if (totalWeight === 0) return null;

  // Scoped solve: remaining items OUTSIDE the scope hold at their category's
  // current average; categories outside the scope with no grades are excluded
  // and weights renormalized.
  let A = 0, B = 0, usedWeight = 0;
  const parts = [];

  for (const { category, weightPct } of weights) {
    const { kept } = gradedAfterDrops(cls, items, category);
    const earned = kept.reduce((s, i) => s + i.scoreEarned, 0);
    const possible = kept.reduce((s, i) => s + i.pointsPossible, 0);
    const classItems = items.filter(i => i.classId === cls.id && i.category === category);
    const remaining = classItems.filter(i => !isGraded(i));
    let remPossible = remaining.reduce((s, i) => s + (i.pointsPossible || 100), 0);
    if (classItems.length === 0) remPossible = 100; // empty category: all future

    const inScope = scopeCategory === null || category === scopeCategory;

    if (inScope && remPossible > 0) {
      const tot = possible + remPossible;
      A += weightPct * (earned / tot) * 100;
      B += weightPct * (remPossible / tot) * 100;
      usedWeight += weightPct;
      parts.push({ category, remaining, remPossible });
    } else if (possible > 0) {
      A += weightPct * (earned / possible) * 100;
      usedWeight += weightPct;
    }
    // out-of-scope category with no grades: excluded (renormalized below)
  }
  if (usedWeight === 0) return null;
  return { A: A / usedWeight, B: B / usedWeight, parts };
}

// Direction 1: needed average on remaining items to hit targetLetter.
export function neededForTarget(cls, items, targetLetter, scopeCategory = null) {
  const cutoffs = cls.cutoffs?.length ? cls.cutoffs : DEFAULT_CUTOFFS;
  let target = cutoffFor(targetLetter, cutoffs);
  if (target === null) return { error: `No cutoff defined for ${targetLetter}` };
  if (cls.policies?.rounding === 'nearest') target = target - 0.5;

  const model = gradeModel(cls, items, scopeCategory);
  if (!model) return { error: 'Set up grading weights for this class first.' };
  const { A, B, parts } = model;

  if (B === 0) {
    return { locked: true, finalPct: A, achieves: A >= target };
  }
  const neededPct = ((target - A) / B) * 100;
  const remainingItems = parts.flatMap(p => p.remaining.map(i => ({
    item: i,
    requiredScore: (neededPct / 100) * (i.pointsPossible || 100),
  })));
  return {
    neededPct,
    lockedIn: neededPct <= 0,
    impossible: neededPct > 100,
    bestCase: A + B,        // 100% on everything remaining
    worstCase: A,           // 0% on everything remaining
    remainingItems,
    hasUnscheduled: parts.some(p => p.remaining.length === 0 && p.remPossible > 0),
  };
}

// Direction 2: "if I score X on this item, my grade becomes Y".
// overrides: { [itemId]: scoreEarned }
export function gradeIf(cls, items, overrides) {
  const patched = items.map(i => {
    if (overrides[i.id] !== undefined) {
      return { ...i, scoreEarned: overrides[i.id], status: 'graded' };
    }
    return i;
  });
  return classGrade(cls, patched);
}

export { letterFor };
