# PsA Logbook

A phone-first psoriatic arthritis diary with a visual location picker, an overview of recorded symptoms, and Excel reports for appointments. Records are stored locally in IndexedDB; Google Drive backup is optional.

## What you can do

- **Overview:** entry counts, days with entries, average and highest pain, a daily pain chart, affected areas, symptoms, and recent entries.
- **Log:** tap a body area, open a hand or foot guide, choose a side and location, select multiple symptoms, and explicitly score pain from 0 to 10. Recent locations make repeat logging quicker.
- **History:** filter by period, body area, joint, symptom, minimum pain, or text; edit entries or confirm deletion.
- **Export & backup:** download a real Excel workbook or CSV of the current filtered view; download a complete JSON backup; merge a backup from a file or Google Drive.

The charts describe **recorded entries**. An unlogged day is missing data, not a symptom-free day. Pain averages are per entry, not per calendar day. Multiple symptoms can belong to one entry. Unknown end times are not assigned a duration.

See [the review and redesign decisions](docs/APP_REVIEW.md) and [GitHub handover](docs/GITHUB_HANDOVER.md).

## Development

Use Node.js 24 LTS (or the supported versions declared in package.json).

```sh
npm ci
npm run dev
```

Open http://localhost:5175/psa-logbook-app/.

```sh
npm test
npm run build
npm run test:e2e
npm run test:pwa
```

- Unit tests cover local time and daylight saving, summary calculations, filters, import validation/merging, Excel/CSV, and mocked Drive operations.
- Browser tests use an isolated browser context, synthetic entries, and desktop/phone viewports. Local tests use installed Microsoft Edge; CI installs Chromium.
- The PWA test requires a build, starts a production preview, disconnects its browser context, reloads, saves an entry, and downloads Excel offline.
- `npm run format` formats the source and documentation.

## Data compatibility

The database name remains `psa-logbook-db`, with the existing stores and schema version. Older IDs, timestamps, lookup keys, notes, and single-symptom records are retained.

New entries optionally add `symptomKeys` and `jointCustom`. `symptomKey` retains the first selected symptom for compatibility. Reports and the app prefer the multi-symptom list when present. Lookup keys are stable; labels can be made friendlier without rekeying records.

Imports validate the entire file before any writes and merge in a transaction. The newest `updatedAt` wins for the same ID; older backups can use `createdAt` when `updatedAt` is absent. Unsupported schema versions and invalid records are rejected. Existing unrelated records stay.

Deleting entries is local deletion, not synchronized deletion. An older backup can restore a deleted entry. Full JSON backups always contain all entries, independent of report filters.

## Reports

Excel has five sheets: Summary, Entries, Daily summary, Body areas, and Symptoms. It includes the filter scope, exporting time zone, local and UTC timestamps, original keys, numeric pain and duration values, and notes. CSV has readable labels, UTF-8 BOM, quoting, line breaks, and formula-prefix escaping.

ExcelJS is loaded separately from the main application and cached by the service worker for offline export. Its compressed bundle adds roughly 270 KB to the install cache. Its compatible CommonJS UUID dependency is overridden to a patched version.

## Phone and offline use

On iPhone, open the deployed site in Safari and choose Share → Add to Home Screen. The layout has bottom navigation, safe-area padding, large logging controls, keyboard focus styles, text alternatives to diagrams, and a table alternative to the chart.

After the first successful load and service-worker installation, the built app works offline. The development server does not enable a service worker. Drafts survive switching views within the open app; an unsaved draft does not survive reloading or closing it.

Browser storage belongs to the device, browser, and site origin. The local development preview does not automatically contain records from the deployed site. Download a JSON backup from the existing app and import it into the preview if you want to review your own data locally.

## Google Drive setup

1. Enable the Google Drive API in your Google Cloud project.
2. Create a Web application OAuth client and configure its consent screen.
3. Add the deployed origin `https://hecticmike.github.io` and any local development origin you use, such as `http://localhost:5175`.
4. Put the OAuth client ID in `src/config.ts` as `GOOGLE_CLIENT_ID`. A browser OAuth client ID is public configuration; do not put a client secret in this app.
5. If consent is in Testing, add your Google account as a test user.

The scope is `drive.file`. Backups use the visible `PsA-Logbook/psa-logbook-data.json` file. Authorization tokens remain in memory, expire, and are never stored in backups. A restore only reads an existing backup; it does not create an empty one.

Real Google consent and account operations still require a manual check with your account. Automated tests mock Google responses.

## Deployment

The repository is [HecticMike/psa-logbook-app](https://github.com/HecticMike/psa-logbook-app). Vite's default base is `/psa-logbook-app/`; override `VITE_BASE` only if the deployment path changes.

The private standalone repository runs Node 24 unit tests, a production build, browser tests, and an offline PWA test on pull requests and main. The workflow uploads the production build as an artifact. Hosting is not configured and no site is automatically deployed. The existing Our Health repository is unchanged.

No health records are included in repository code or test fixtures. Keep downloaded personal backups and reports outside the repository.
