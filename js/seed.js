// First-run seed — Mark's REAL transcript data, confirmed against the
// unofficial transcript screenshots (Fall 2025, Spring 2026, Fall 2026).
// v2 adds initial 0-point "Review Syllabus" assignments (worth 0 pts so they
// don't affect grading) for every Fall 2026 class, due on the semester start
// date (Aug 17). These are non-graded planning items to encourage early review.
// Guarded by settings.seedVersion so it never re-runs on existing installs.
import { db, uid } from './db.js';

const SEED_VERSION = 2;

// Calendar color-coding from the approved UM supplementary palette.
const COLORS = { sky: '#4A9BD1', gold: '#C2A44D', sea: '#7AB08F', olive: '#9CA635', red: '#C8102E', taupe: '#B8A87E' };

function pastClass(semesterId, code, name, creditHours, finalLetterGrade) {
  return {
    id: uid(), semesterId, code, name, creditHours, finalLetterGrade,
    professor: '', color: COLORS.sea, targetGrade: 'A',
    gradingWeights: [], policies: {}, cutoffs: [],
  };
}

function currentClass(semesterId, code, name, creditHours, color) {
  return {
    id: uid(), semesterId, code, name, creditHours, finalLetterGrade: null,
    professor: '', color, targetGrade: 'A', // Protect the 4.0
    gradingWeights: [], policies: { dropLowest: [], rounding: 'none', extraCredit: '', latePolicy: '' },
    cutoffs: [],
  };
}
export async function seedIfNeeded() {
  const seeded = await db.settings.get('seedVersion');
  if (seeded && seeded.value >= SEED_VERSION) return;

  const f25 = { id: uid(), name: 'Fall 2025', startDate: '2025-08-18', endDate: '2025-12-17', status: 'past' };
  const s26 = { id: uid(), name: 'Spring 2026', startDate: '2026-01-12', endDate: '2026-05-06', status: 'past' };
  const f26 = { id: uid(), name: 'Fall 2026', startDate: '2026-08-17', endDate: '2026-12-16', status: 'current' };

  const classes = [
    // Fall 2025 — term GPA 4.000, 15 GPA credits
    pastClass(f25.id, 'ECO 211', 'Principles of Microeconomics', 3, 'A+'),
    pastClass(f25.id, 'MAS 201', 'Intro Business Statistics', 3, 'A+'),
    pastClass(f25.id, 'MGT 100', 'Managing for Success in the Global Environment', 3, 'A'),
    pastClass(f25.id, 'MKT 201', 'Foundations of Marketing', 3, 'A+'),
    pastClass(f25.id, 'UMX 100', 'UM Experience', 0, 'A'), // 0 credits — excluded from GPA
    pastClass(f25.id, 'WRS 106', 'First-Year Writing II', 3, 'A+'),
    // Spring 2026 — term GPA 4.000, cumulative 30 credits / 4.000
    pastClass(s26.id, 'ACC 211', 'Principles of Financial Accounting', 3, 'A+'),
    pastClass(s26.id, 'BSL 212', 'Intro to Business Law & Ethics', 3, 'A'),
    pastClass(s26.id, 'BUS 150', 'Business Analytics', 3, 'A+'),
    pastClass(s26.id, 'ECO 212', 'Principles of Macroeconomics', 3, 'A+'),
    pastClass(s26.id, 'MAS 202', 'Intermediate Business Statistics', 3, 'A+'),
    // Fall 2026 — current, 16 credits, ready for syllabus import
    currentClass(f26.id, 'ACC 212', 'Managerial Accounting', 3, COLORS.sky),
    currentClass(f26.id, 'BTE 210', 'Business Tech & Innovation', 3, COLORS.gold),
    currentClass(f26.id, 'BUS 211', 'Professional Development: Finance & Accounting', 1, COLORS.taupe),
    currentClass(f26.id, 'BUS 300', 'Critical Thinking & Persuasion', 3, COLORS.olive),
    currentClass(f26.id, 'FIN 302', 'Fundamentals of Finance', 3, COLORS.sea),
    currentClass(f26.id, 'MGT 304', 'Organizational Behavior', 3, COLORS.red),
  ];

  // Initial 0-point syllabus review items for every Fall 2026 class.
  // Due on semester start date (Aug 17). pointsPossible=0 so they are ignored
  // in all grade calculations (see isGraded in grades.js). Category will show
  // as custom "Syllabus".
  const syllabusItems = classes
    .filter(c => c.semesterId === f26.id)
    .map(c => ({
      id: uid(),
      classId: c.id,
      title: 'Review Syllabus',
      type: 'assignment',
      category: 'Syllabus',
      dueAt: `${f26.startDate}T23:59`,
      pointsPossible: 0,
      scoreEarned: null,
      status: 'upcoming',
      priority: false,
      materials: [],
      notes: 'Review the full syllabus before class begins. Note grading weights, late policies, important dates, office hours, participation expectations, and all instructor policies.',
    }));

  await db.transaction('rw', db.semesters, db.classes, db.settings, db.todos, db.items, async () => {
    await db.semesters.bulkPut([f25, s26, f26]);
    await db.classes.bulkPut(classes);
    await db.items.bulkPut(syllabusItems);
    await db.settings.bulkPut([
      { key: 'seedVersion', value: SEED_VERSION },
      { key: 'gpaTargetMode', value: 'protect4' },
      { key: 'lastBackupAt', value: null },
    ]);
  });
}
