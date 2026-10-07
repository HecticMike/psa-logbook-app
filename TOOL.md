---
name: PsA Logbook
purpose: Phone-first psoriatic arthritis symptom diary with Excel reports for appointments
status: In use
superseded_by:
launch: https://hecticmike.github.io/psa-logbook-app/
updated: 2026-10-07
---

## What it does
A symptom diary for psoriatic arthritis, designed to be used on a phone. You tap marked areas on a front or back body guide (with mirrored hand and foot close-ups), pick symptoms and score pain 0-10, with optional fatigue and morning-stiffness values. The dedicated Stats view, History and Export views summarise recorded entries and produce a seven-sheet Excel workbook or CSV to share with the care team. It is a React + TypeScript web app (Vite) that installs to the iPhone Home Screen, works offline, stores records on the device, and can optionally back up to Google Drive.

## Plan
- [x] Review and redesign of the original app (10 Sep 2026): four views, visual location picker, multiple symptoms per entry
- [x] Fixed time accuracy (summer-time shifts when editing) and forced default values (pain 5, stress, medication)
- [x] Seven-sheet Excel report and CSV, driven by the same filters as the Overview, Stats and History
- [x] Validated JSON backup/merge and more reliable Google Drive backup/restore
- [x] Offline use after first load, with a tested offline save and Excel export
- [x] Unit, desktop/phone browser and offline tests run in GitHub Actions before deploy
- [x] Standalone repository HecticMike/psa-logbook-app published on GitHub Pages
- [x] Crisp blue mobile redesign (PR #2, 11 Sep 2026)
- [x] Check on a physical iPhone in Safari / Home Screen
- [x] Check real Google Drive sign-in, backup and restore with your own account
- [x] Add quick start from recent entries, with a fresh pain score for each new entry
- [x] Keep unfinished new-entry drafts across reloads on the same device
- [x] Add exact inclusive date ranges shared by Overview, History and reports
- [x] Show pain-score distribution in the app and Excel report
- [x] Save several locations in one session while keeping the time and symptoms and requiring a new pain score
- [x] Replace the body, hand, foot, finger and toe guides with generated artwork; add a rear view for Back and spaced toe callouts; mirror close-ups for the selected side
- [x] Add a dedicated Stats view and equal-length period comparison in the app and Excel
- [x] Add optional fatigue scores and morning-stiffness minutes to logging, history, stats and exports
- [ ] Review the optional measures with the care team and decide whether any others, such as medication dose, would help
- [ ] If automatic sync is wanted, design conflict handling and deletion tracking first

## Inbox

## Notes
- Run locally: `npm ci`, then `npm run dev`, and open http://localhost:5175/psa-logbook-app/. Tests: `npm test`, `npm run test:e2e`, `npm run test:pwa`.
- Records stay in the browser that created them; there is no automatic sync. Deleting an entry is local only, so restoring an older backup can bring it back.
- New-entry drafts are stored separately on the same browser and are cleared after save or Clear & close; backups contain saved entries only.
- The score spread and workbook pain-score sheet count entries at each score, not calendar days; missing days remain unknown.
- Period comparison uses the immediately preceding equal number of calendar days and shows logging coverage. Averages use only entries with the value recorded, so different logging frequency can affect them.
- Saving the next area keeps the start time and symptom choices but clears location, pain, notes and optional measures for the new entry.
- Anatomy artwork is in `public/anatomy/`; location targets are calibrated in `src/components/LocationPicker.tsx` and PWA-cached for offline logging.
- The hand illustration is a left palm (thumb at image left) and mirrors for Right; the foot illustration is a right foot from above (big toe at image left) and mirrors for Left.
- An unlogged day is missing data, not a symptom-free day; pain averages are per entry, not per day.
- The old address https://hecticmike.github.io/psa-logbook/ still opens the previous app. Export a backup before switching Home Screen shortcuts, and do not clear browser storage to force an update.
- Google Drive needs the OAuth client ID in `src/config.ts` (scope `drive.file`, file `PsA-Logbook/psa-logbook-data.json`).
- Background: docs/APP_REVIEW.md and docs/GITHUB_HANDOVER.md (historical detail; TOOL.md is the live plan).
