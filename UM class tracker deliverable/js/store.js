// Reactive store: in-memory state hydrated from Dexie. Every mutation writes
// to IndexedDB, reloads state, and notifies subscribers — this is what makes
// each change propagate instantly to every view with no recalculate button.
import { db, uid } from './db.js';
import { seedIfNeeded } from './seed.js';

const listeners = new Set();

export const state = {
  semesters: [],
  classes: [],
  items: [],
  todos: [],
  settings: {},
  ready: false,
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(state);
}

export async function refresh() {
  const [semesters, classes, items, todos, settingsRows] = await Promise.all([
    db.semesters.toArray(), db.classes.toArray(), db.items.toArray(),
    db.todos.toArray(), db.settings.toArray(),
  ]);
  state.semesters = semesters.sort((a, b) => a.startDate < b.startDate ? -1 : 1);
  state.classes = classes.sort((a, b) => a.code.localeCompare(b.code));
  state.items = items;
  state.todos = todos;
  state.settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));
  state.ready = true;
  emit();
}

export async function init() {
  await seedIfNeeded();
  await refresh();
}

// ---------- generic mutations ----------
export async function put(table, obj) {
  if (!obj.id) obj.id = uid();
  await db[table].put(obj);
  await refresh();
  return obj;
}

export async function bulkPut(table, objs) {
  for (const o of objs) if (!o.id) o.id = uid();
  await db[table].bulkPut(objs);
  await refresh();
  return objs;
}

export async function remove(table, id) {
  if (table === 'classes') {
    // deleting a class removes its items too
    await db.transaction('rw', db.classes, db.items, async () => {
      await db.items.where('classId').equals(id).delete();
      await db.classes.delete(id);
    });
  } else if (table === 'semesters') {
    const classIds = (await db.classes.where('semesterId').equals(id).toArray()).map(c => c.id);
    await db.transaction('rw', db.semesters, db.classes, db.items, async () => {
      await db.items.where('classId').anyOf(classIds).delete();
      await db.classes.where('semesterId').equals(id).delete();
      await db.semesters.delete(id);
    });
  } else {
    await db[table].delete(id);
  }
  await refresh();
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value });
  await refresh();
}

// ---------- selectors ----------
export const currentSemester = () => state.semesters.find(s => s.status === 'current') || null;
export const classesFor = (semesterId) => state.classes.filter(c => c.semesterId === semesterId);
export const itemsFor = (classId) => state.items.filter(i => i.classId === classId);
export const classById = (id) => state.classes.find(c => c.id === id) || null;
export const currentClasses = () => {
  const sem = currentSemester();
  return sem ? classesFor(sem.id) : [];
};
export const currentItems = () => {
  const ids = new Set(currentClasses().map(c => c.id));
  return state.items.filter(i => ids.has(i.classId));
};
export const pastClasses = () =>
  state.semesters.filter(s => s.status === 'past')
    .flatMap(s => classesFor(s.id));

// ---------- backup / restore ----------
export async function exportData() {
  const [semesters, classes, items, todos, settings] = await Promise.all([
    db.semesters.toArray(), db.classes.toArray(), db.items.toArray(),
    db.todos.toArray(), db.settings.toArray(),
  ]);
  return { app: 'herbert-hq', exportedAt: new Date().toISOString(), version: 1,
           data: { semesters, classes, items, todos, settings } };
}

export async function importData(payload) {
  if (!payload || payload.app !== 'herbert-hq' || !payload.data) {
    throw new Error('Not a Herbert HQ backup file.');
  }
  const d = payload.data;
  for (const key of ['semesters', 'classes', 'items', 'todos', 'settings']) {
    if (!Array.isArray(d[key])) throw new Error(`Backup is missing "${key}".`);
  }
  await db.transaction('rw', db.semesters, db.classes, db.items, db.todos, db.settings, async () => {
    await Promise.all([db.semesters.clear(), db.classes.clear(), db.items.clear(), db.todos.clear(), db.settings.clear()]);
    await db.semesters.bulkPut(d.semesters);
    await db.classes.bulkPut(d.classes);
    await db.items.bulkPut(d.items);
    await db.todos.bulkPut(d.todos);
    await db.settings.bulkPut(d.settings);
  });
  await refresh();
}

export { uid };
