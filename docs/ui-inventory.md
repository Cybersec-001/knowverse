# UI inventory and redesign plan

Baseline: main, f3a6109. Review branch only. Backend overhaul excluded.

## Actual routes
- `/`: public landing, Brand and interactive StudyScene.
- `/dashboard`: authenticated notebook collection; live GET/POST /notebooks. Offline sample mode exists.
- `/notebook?id=...`: collection, link/file input, live processing subscription.
- `/study?notebook=...&video=...`: LiveWorkspace, YouTube player, editable summary, generated notes/exam notes, MCQ, source-grounded tutor, own notes, semantic search, PDF/Word exports, caption fallback.
- `/login`, `/signup`: existing email/password auth.
- `/privacy`, `/terms`: existing legal text, preserve wording.
- Not-found: missing route recovery.
- Legacy static sample routes: `/notebook/[id]` (biology, physics, history) and `/notebook/biology/video/cell-biology`, all reuse existing components.
- Settings and profile: no existing routes. Add local appearance preferences and real backend-derived account overview, not invented statistics.

## Functional boundaries
No backend edits. Existing auth and generated materials remain at their original endpoints. Existing API contracts, token storage, websocket subscriptions, uploads, queues and exports retained. No fake production data or progress. APIs absent for translation, transcript streaming, notifications, storage quotas, note tags/pins and tutor token streaming: do not represent these as working services.

## Phases
1 inventory; 2 tokens; 3 shell; 4 landing; 5 dashboard; 6 workspace; 7 source search; 8 tutor; 9 study materials; 10 account; 11 mobile; 12 motion; 13 keyboard/focus; 14 lint/build/tests and desktop/mobile screenshots.
