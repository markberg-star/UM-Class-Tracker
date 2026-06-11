// GPA math — University of Miami 4.0 scale. Pure functions.

export const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'F': 0.0,
};

// Classes that count toward GPA: graded letter + credit hours > 0.
function gpaEligible(classes) {
  return classes.filter(c =>
    c.creditHours > 0 && c.finalLetterGrade && GRADE_POINTS[c.finalLetterGrade] !== undefined);
}

export function termGPA(classes) {
  const elig = gpaEligible(classes);
  const credits = elig.reduce((s, c) => s + c.creditHours, 0);
  if (credits === 0) return { gpa: null, credits: 0, qualityPoints: 0 };
  const qp = elig.reduce((s, c) => s + GRADE_POINTS[c.finalLetterGrade] * c.creditHours, 0);
  return { gpa: qp / credits, credits, qualityPoints: qp };
}

// Cumulative across all past (finalized) classes.
export function cumulativeGPA(allPastClasses) {
  return termGPA(allPastClasses);
}

// Projected term GPA from live letters: [{creditHours, letter}], letter may be null (excluded).
export function projectedTermGPA(liveClasses) {
  const elig = liveClasses.filter(c => c.creditHours > 0 && c.letter && GRADE_POINTS[c.letter] !== undefined);
  const credits = elig.reduce((s, c) => s + c.creditHours, 0);
  if (credits === 0) return { gpa: null, credits: 0, qualityPoints: 0 };
  const qp = elig.reduce((s, c) => s + GRADE_POINTS[c.letter] * c.creditHours, 0);
  return { gpa: qp / credits, credits, qualityPoints: qp };
}

// Combine past cumulative with a projected term.
export function projectedCumulative(past, term) {
  const credits = past.credits + term.credits;
  if (credits === 0) return { gpa: null, credits: 0 };
  return { gpa: (past.qualityPoints + term.qualityPoints) / credits, credits };
}

// What term GPA is needed this semester (termCredits) to reach targetCum overall?
export function requiredTermGPA(targetCum, past, termCredits) {
  if (termCredits <= 0) return null;
  const needed = (targetCum * (past.credits + termCredits) - past.qualityPoints) / termCredits;
  return {
    gpa: needed,
    possible: needed <= 4.0,
    alreadyMet: needed <= 0,
  };
}
