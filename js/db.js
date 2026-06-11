import { Dexie } from 'https://cdn.jsdelivr.net/npm/dexie@4.0.11/dist/dexie.min.mjs';

export const db = new Dexie('herbert-hq');

db.version(1).stores({
  semesters: 'id, status',
  classes: 'id, semesterId, code',
  items: 'id, classId, dueAt, status, type',
  todos: 'id, listName, done',
  settings: 'key',
});

// crypto.randomUUID needs a secure context (https/localhost); fall back so the
// app still works over plain http on a LAN (e.g. phone hitting a laptop server).
export const uid = () => (crypto.randomUUID
  ? crypto.randomUUID()
  : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
