# Codex instructions — Moja Siłownia

## Project and deployment
- This is a **Polish-language, mobile-first static PWA** published on GitHub Pages: https://durart.github.io/moja-silownia/
- The `main` branch can be deployed automatically. Make meaningful code changes in a separate branch/PR and leave releases to an explicit decision. No Netlify deployment.
- Preserve compatibility with existing installed PWAs and previously saved browser data. Use relative paths, never a root-relative asset path that ignores the GitHub Pages subdirectory.
- Inspect current files before editing; do not rely on outdated version labels in comments or old README text.
- Avoid new external dependencies, CDNs, background requests, telemetry or data export unless explicitly requested and justified.

## Relevant code
Main HTML/CSS/JS: `index.html` (large single-page file). Supporting runtime: `ui-enhancements.css`, `ui-enhancements.js`, `plan-importer.js`, `assets/` and `preview/`.

## Data integrity (critical)
App uses localStorage key `moja-silownia-v01` for exercises, plans, active workout and history. Preserve the structure and save timing. A workout must survive tab closing/reopening; do not assume a reload is safe without testing. Exercise imports (PDF/DOCX) use remote parsing libraries, so do not claim that import works offline.

## Product-specific behavior
Important flows: selecting muscle groups and exercises; editing, deleting and completing sets; adding extra exercises outside a plan; finishing partial workouts; plan imports; rest timer and sound feedback; offline-friendly PWA use. Existing rest-end pattern A is five short countdown beeps in the last five seconds and a longer beep at the end—keep it unless asked to change it.

## Using local Codex skills
Relevant tasks may activate these repo-local skills under `.agents/skills/`:
- `pwa-design` — UI, responsive layout, accessibility, visual hierarchy.
- `pwa-motion` — animations, timer/sound cues and microinteractions.
- `pwa-data-safety` — persistence, imports/exports, offline/cache and migration.
Use the following **only when explicitly requested**, for example with a `$` skill reference:
- `$prototype` — compare multiple UI variants in isolation.
- `$pick-ui-library` — compare dependencies before adoption.
- `$review-animations` — structured critique without automatic edits.
Skills are guidance, not authorization to override the user's requested scope. If guidance conflicts with working data preservation, prioritize data preservation.

## Verification and communication
There is no package.json or automated test suite in the inspected root. Run syntax checks on changed standalone JS with `node --check`, and perform realistic manual checks for the modified flow on desktop and narrow mobile. Do not report tests you did not run.
- For UI changes, review at 320-390px wide and desktop, check focus/keyboard, text contrast, scroll and touch target size. Honor reduced-motion preferences.
- Use synthetic test data only. Do not publish the user's diary, workouts, identifiers or backups.
- Before finalizing, summarize files modified, actual tests performed, behavior preserved, risks and manual checks remaining.
- A UI polish task is not permission to change nutrition/fitness formulas or user data.
