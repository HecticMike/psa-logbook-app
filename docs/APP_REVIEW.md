# PsA Logbook: review and redesign

Reviewed 10 September 2026. The goal is a diary that is easy to use with painful hands, useful between appointments, and clear enough to share with a care team. The user primarily uses a phone and prefers tapping a body diagram followed by a hand or foot close-up.

## Main finding

The original app could store symptom events, but asked for too many choices in one long page and offered little help understanding either a location or the resulting history. More consequentially, defaults and time conversion could distort the records. The redesign treats accurate, low-effort logging and understandable records as one workflow.

## Findings and implemented changes

| Area               | Finding in the existing working copy                                                                                                         | Implemented response                                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Navigation         | Logging, history, and backup competed on one long screen. The header exposed implementation terminology.                                     | Four clear views: Overview, Log, History, Export & backup. Persistent bottom navigation on phones; sidebar on larger screens.                                                                    |
| Visual design      | Weak distinction between primary actions, data, and supporting copy; dense uniform controls.                                                 | Consistent sage/green palette, quieter surfaces, stronger type hierarchy, focused cards, readable status and empty states.                                                                       |
| Location selection | Fingers/toes were generic choices; shoulders and elbows were missing; side and legacy knee labels could conflict.                            | Tappable body guide, hand/foot close-ups, individual digits, base/middle/near-nail positions, explicit body side, plain-language lists, broad-area and unsure choices. Legacy keys are retained. |
| Logging burden     | Pain 5, Stress, and Medication were selected without a user decision. Every optional field was equally prominent.                            | Explicit symptoms and pain score (including zero); unrecorded trigger/action by default; optional context disclosed on demand; recent-location shortcuts.                                        |
| Symptoms           | Only one symptom per entry.                                                                                                                  | Multiple symptoms for one location, while retaining the legacy primary-symptom field.                                                                                                            |
| Time accuracy      | datetime-local fields were populated from UTC ISO text. Editing during British Summer Time could shift times.                                | Local wall-time formatting, original timestamps retained, calendar-day filters with DST checks, invalid/reversed times rejected.                                                                 |
| Edit lifecycle     | Cancel reset the form but did not clear the editing ID.                                                                                      | Explicit edit identity reset; same record updated when saving an edit; navigation preserves an unfinished draft within the open app.                                                             |
| Overview           | No actual in-app trend or area breakdown.                                                                                                    | Recorded-entry average/peak pain, logged-day count, daily chart, accessible data table, area and symptom counts, latest entries.                                                                 |
| Report consistency | History and export used different timeframes, and export silently omitted the minimum-pain filter.                                           | One shared filter state drives overview, history, and Excel/CSV export, with scope shown above the export action.                                                                                |
| Excel usability    | Only CSV, with technical keys and no appointment summary.                                                                                    | Actual XLSX workbook with five sheets, readable labels, numeric values, timestamps, timezone, notes, stable keys, frozen headers, and filters. CSV remains available.                            |
| Backup integrity   | JSON import existed in the library but was absent from the UI; raw incoming rows were not validated.                                         | File selection and merge confirmation, full-file validation before a transaction, newest-edit merge semantics, explicit success/failure messages.                                                |
| Drive reliability  | Restore could create a missing file, tokens did not expire locally, popup cancellation could leave a pending action, PATCH included parents. | Read-only lookup on restore, expiry tracking and 401 handling, popup-error callback, account-specific ID reset, valid update metadata.                                                           |
| Install/offline    | Manifest icons used root paths despite a repository subpath deployment.                                                                      | Relative manifest icon paths, restored Apple touch link, safe-area viewport, matching theme colors, production offline regression test.                                                          |
| Maintainability    | Most behavior lived in one large component and there were no repeatable behavior tests.                                                      | Separate views, reusable location picker and filters, pure summary/report utilities, unit/browser/offline tests, formatting, CI checks and build artifacts.                                      |

## What the overview means

- Average pain is the arithmetic mean of the pain scores in the selected entries.
- The chart has one point per local calendar day with data. Its vertical marker reaches the highest pain score recorded that day.
- Days without entries stay empty. Neither zero pain nor recovery is inferred.
- Days with entries are logging coverage, not a count of flare days.
- Multiple symptoms can occur in one record, so symptom counts may exceed the number of entries.
- Possible triggers are user observations. The app does not infer causation, treatment efficacy, disease activity scores, or a diagnosis.
- Durations only use explicit end times; unknown end times remain unknown.
- Report and overview scope match, including search and minimum-pain filters.
- Date grouping uses the exporting/viewing device's time zone. UTC timestamps are retained in reports for later analysis.

The basic symptom vocabulary is consistent with the [NHS description of psoriatic arthritis](https://www.nhs.uk/conditions/psoriatic-arthritis/). This source informed language, not a scoring system. The diagrams are simplified location guides for logging; they do not identify a cause of pain or establish an anatomical diagnosis.

## Compatibility and privacy

The existing IndexedDB database, stores, IDs, and lookup keys remain. No existing records were reclassified or bulk-migrated. New metadata fields are optional; legacy single-symptom entries still display and export.

Existing working-tree modifications were retained as the starting point. A binary Git diff snapshot was saved to the local temporary directory before edits, and work moved to the local branch `enhance/logbook-experience`. No user health data was read from a browser profile; browser tests use isolated contexts and synthetic entries.

Entries stay in the current browser until the user exports or backs them up. There is no automatic cross-device synchronization. JSON backup and restore is the portable path. The standalone repository is public with the owner?s authorization. Personal reports and backups should still stay outside source control.

## Validation and practical limits

Final local results: **21 unit tests passed, 8 desktop/phone browser tests passed, 1 production offline test passed, and the production build passed.** The dependency audit reported **0 vulnerabilities** after compatible updates. Browser screenshots and generated sample workbooks are in the ignored `test-results/` folder; they contain synthetic data only.

Automated checks cover calendar-day/DST behavior, simultaneous symptoms, filtering, invalid imports without partial writes, newest-edit merging, legacy restore, CSV formula escaping, actual XLSX serialization/readback, and mocked Drive failure paths. Browser checks cover phone/desktop logging, editing/cancelling, reload persistence, drafts while navigating, filtering, Excel download, import, delete cancellation, and overflow. A production test checks offline reload, save, and Excel download.

The phone tests run Chromium at an iPhone-sized viewport; they are not a physical iPhone or Safari test. A short Safari/Home Screen review with the user's device is still needed. Google Drive OAuth needs the user's account for a real consent/backup/restore check. Personal GitHub access is verified. The user chose a separate repository, HecticMike/psa-logbook-app, and authorized public source visibility and Pages deployment; the existing Our Health repository remains unchanged. GitHub Actions checks and deploys the separate app.

Excel export is a separate approximately 270 KB compressed library chunk. It is cached for offline access, increasing the initial PWA cache. Drafts are kept while navigating the app but are not durable across a reload. Old backups may restore deleted records because deletion is not synchronized.

## Next priorities after using this version

1. **Refine the diagram with real logging feedback.** Check whether locating a painful finger/toe is now fast enough and whether the guide needs a mirrored view or more specific landmarks.
2. **Appointment-specific measures.** Agree with the care team whether morning-stiffness duration, function, fatigue scores, medication name/dose, skin/nail detail, or patient-global scores would add value. Avoid expanding the required daily form without that purpose.
3. **Custom appointment date ranges and comparison.** Add explicit start/end dates and comparable periods once the core summary has been used with actual records. Keep missing-data coverage visible.
4. **Durable drafts and multi-location sessions.** Consider a saved draft or adding several separately scored locations in one session if repeat-entry effort is still high.
5. **Backup evolution.** If automatic synchronization is wanted, design conflict handling and deletion tombstones first; manual backup is not sync.

Google integration changes were checked against the [Google OAuth JavaScript reference](https://developers.google.com/identity/oauth2/web/reference/js-reference) and [Drive files.update reference](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/update). Workbook generation follows the [ExcelJS project documentation](https://github.com/exceljs/exceljs).
