# Project Cleanup Report - KNOWVERSE

Date: 2026-11-18. Base: main @ 5b94794 (restore point: revert the cleanup commits to return to it). Pushed to main on the owner's instruction.

## Summary
- Files scanned: 111 tracked files (frontend 25 app + 20 components + 5 lib, backend 42, docs/tests/config the rest)
- Files modified: 4 (.gitignore, backend/src/oauth.js, backend/src/worker.js, backend/test/long-video.test.js)
- Files removed: 0
- Lines removed: 3 (net 0 added besides one .gitignore line)
- Unused imports removed: 3 (jwt in oauth.js, validateTimedSegments in worker.js, parseVtt in long-video.test.js)
- Duplicate code resolved: none found that was safe to merge
- Dependencies reviewed: 14 frontend + 17 backend. No unused dependency removed (type packages and tooling are used by config/build; backend deps are all imported)

## Validation (real runs, before -> after)
- ESLint: 0 errors, 3 warnings -> 0 errors, 0 warnings
- tsc --noEmit: clean -> clean
- next build: OK, 23/23 pages -> OK, 23/23 pages
- Backend tests: 58 total, 56 pass, 2 fail -> 58 total, 56 pass, 2 fail (same 2 known OAuth redirect expectation failures: "unconfigured provider sends the user back to login with a message", "callback with a mismatched state is rejected")

## Left alone on purpose
- Server console.* calls: structured operational logs (error/progress events), no secrets logged. Kept.
- YouTube transcript guards (no cookies, no bot bypass): untouched.
- Backend source is written in long dense lines (2 lines over 2000 chars, e.g. worker.js processVideo). Reformatting would produce a huge unreviewable diff; left as is.
- Unused exports (ErrorNotice in components/UI.tsx, NotesSectionKind type, ButtonProps type): harmless, possibly intended API. Kept.
- LiveWorkspace.tsx (1441 lines) split: this is the separate unapproved de-slop patch, not included.
- No file moves, no schema or migration changes, no UI redesign.

## Security findings
- Secrets scan of tracked files: no real keys found. Only placeholder values in .env.example files (including a local dev DB URL knowverse:knowverse@localhost).
- Frontend npm audit: 17 vulnerabilities (1 critical in next 16.3.6, 10 high mostly in eslint-config-next tooling chain, 6 moderate). The critical one is fixable by next@16.4.6 + eslint-config-next@16.4.6. Tested in a scratch copy: lint, tsc and build all pass. NOT applied because it is a dependency change; recommended as a separate step.
- backend has no package-lock.json committed, so npm ci and npm audit cannot run there and installs are not reproducible. Recommend committing a lockfile (needs his go).
- dangerouslySetInnerHTML used once in app/layout.tsx for JSON-LD built from JSON.stringify of static data. Acceptable.

## Remaining issues
- Live frontend is demo mode, not connected to the backend (known).
- 2 stale OAuth tests failing (known).
- Dependency security upgrade and backend lockfile pending approval.
