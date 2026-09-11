# Personal GitHub handover

## Standalone repository

The user chose to keep PsA Logbook separate from the Our Health application.

- Repository: [HecticMike/psa-logbook-app](https://github.com/HecticMike/psa-logbook-app), public with owner authorization.
- Local folder: `psa-logbook-app`, alongside the original `psa-logbook` folder.
- PR #1 from `enhance/logbook-experience` is merged into `main`.
- Main contains the complete application, originally reviewed in one pull request.
- The original [HecticMike/psa-logbook](https://github.com/HecticMike/psa-logbook) repository and its Our Health main branch remain unchanged.
- Git attribution uses HecticMike's GitHub no-reply email, scoped to this repository.

The source includes the local PsA work present at the start of the review. Existing IndexedDB and backup formats remain compatible. The newer Our Health models are not part of this separate application.

## Review and checks

Run `npm ci` and `npm run dev`, then open http://localhost:5175/psa-logbook-app/.

Unit tests, desktop/phone browser tests, and the production offline test run in GitHub Actions for pull requests and main. Pull requests upload a review build. A successful main build publishes to GitHub Pages once Pages is enabled.

Physical iPhone/Safari and real Google Drive consent, backup, and restore checks still need manual verification. Use a PsA JSON backup to load representative personal records locally; keep that backup outside Git.

## Hosting

The GitHub Pages URL is https://hecticmike.github.io/psa-logbook-app/. The existing https://hecticmike.github.io/psa-logbook/ address and any Home Screen icon installed from it still open the previous app.

The owner authorized making this repository public so GitHub Pages can host it on the current account plan. Pages is enabled with a workflow source and HTTPS enforced. Source code is public; browser records and exported personal backups are not uploaded as part of deployment.

Deployment is gated on a successful main build, including unit, browser, and offline tests. Pull requests never deploy. The original Our Health repository remains unchanged.

On a phone, open the new URL in Safari and use Share → Add to Home Screen to create a shortcut for the redesigned app. Export a backup before changing shortcuts. GitHub Pages projects on the same hostname share a browser origin, so the existing PsA IndexedDB records may already appear; a separate installed app context can still require importing the backup. Do not clear browser storage to force an update.
