// Backwards study-plan generator for upcoming tests/exams.
// Pure function of (exam.dueAt, now) — deterministic, nothing stored,
// so it regenerates automatically whenever the exam date changes.

const MS_DAY = 86400000;

function dayStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysUntil(dueAt, now = new Date()) {
  return Math.round((dayStart(dueAt) - dayStart(now)) / MS_DAY);
}

// Returns [{date: Date, label, focus, examId}] or [] if exam is past / > horizon.
export function studyPlan(exam, now = new Date(), horizonDays = 21) {
  if (!exam.dueAt) return [];
  const days = daysUntil(exam.dueAt, now);
  if (days < 0 || days > horizonDays) return [];

  // Pick which days (counting back from the exam) get a session:
  // last 3 days daily, earlier every other day, capped at 8 sessions.
  const offsets = [];
  for (let back = 1; back <= days && offsets.length < 8; back++) {
    if (back <= 3 || (back % 2 === 1)) offsets.push(back);
  }
  if (days === 0) offsets.push(0); // exam today: final review
  offsets.sort((a, b) => b - a); // chronological (furthest out first)

  const examDay = dayStart(exam.dueAt);
  const n = offsets.length;
  return offsets.map((back, idx) => {
    const date = new Date(examDay.getTime() - back * MS_DAY);
    let focus;
    if (back === 0) focus = 'Final once-over before the exam';
    else if (back === 1) focus = 'Final review — weak spots & formula sheet';
    else if (back <= 3) focus = 'Practice problems & self-test';
    else if (idx === 0) focus = 'Read through notes & linked materials';
    else focus = 'Work examples, summarize each topic';
    return {
      examId: exam.id,
      date,
      label: `Study ${idx + 1}/${n} — ${exam.title}`,
      focus,
    };
  });
}

// All study blocks for a set of items, keyed for calendar/dashboard rendering.
export function allStudyBlocks(items, now = new Date()) {
  return items
    .filter(i => i.type === 'test' && i.status !== 'graded')
    .flatMap(exam => studyPlan(exam, now));
}
