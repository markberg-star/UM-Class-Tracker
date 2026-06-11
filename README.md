# Herbert HQ

Assignment tracker, grade calculator, and study planner for the University of Miami Herbert Business School — built as a static PWA. All data lives in your browser (IndexedDB); there is no server and no account.

**Seeded with real data:** Fall 2025 and Spring 2026 transcripts (cumulative 4.000 / 30 credits) and the six registered Fall 2026 classes, ready for grading weights and assignments.

## Run it locally

```bash
cd "UM class tracker deliverable"
python3 -m http.server 8080
# open http://localhost:8080
```

(Any static file server works. Opening `index.html` directly from Finder will NOT work — ES modules need http://.)

## Deploy to GitHub Pages

1. Create a GitHub repository (e.g. `herbert-hq`) and push this folder's contents to the `main` branch:
   ```bash
   git init && git add -A && git commit -m "Herbert HQ"
   git remote add origin https://github.com/<you>/herbert-hq.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / root → Save.**
3. Visit `https://<you>.github.io/herbert-hq/` (all asset paths are relative, so a subpath works).

## Install on iPhone

Open the deployed URL in Safari → Share → **Add to Home Screen**. It runs standalone and works offline (service worker caches the whole app). In Chrome on desktop/Android use the install icon in the address bar.

> Heads-up: iOS can evict IndexedDB for sites you haven't visited in a while. The installed-app version is much safer than a Safari tab — and either way, **export a backup** (Settings → Export All Data) every couple of weeks. The app reminds you.

## Daily use

- **Dashboard** — next 7 days, priority-ranked work (due date × grade weight × how borderline the class is), exam countdowns, live class grades.
- **Add anything** with the orange **+** button. Enter a score the moment you get it back — class grade, GPA projection, what-if math, and priorities all update instantly.
- **Syllabus Import** — copy the built-in prompt, give it to Claude with a syllabus attached, paste back the JSON. Weights, policies, cutoffs, and every dated item are set up in one shot.
- **What-If** — "what do I need to average to keep the A?" and "if I get an 84 on this exam, what happens?"
- **Per-class page** — category breakdown, drop-lowest policies, custom cutoff scales, study plans, and linked notes/materials per item.
- **End of semester** — enter final letter grades on each class (edit class → Final grade), flip the semester to "past" in Settings, add the next one, export a backup.

## Tests

Grade math (weights, drop-lowest, renormalization, cutoffs, what-if solver, GPA, priorities, study plans):

```bash
node tests/engine.test.js
```

## Stack

No build step. Vanilla ES modules, [Dexie 4](https://dexie.org) (CDN, pinned) for IndexedDB, inline [Lucide](https://lucide.dev) icons, branding from the Miami Herbert design system (`css/tokens.css`, see `brand/DESIGN-SYSTEM.md`). After editing any file, bump `CACHE_VERSION` in `sw.js` so installed apps pick up the change.
