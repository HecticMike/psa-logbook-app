# Personal GitHub handover

## Standalone repository

The user chose to keep PsA Logbook separate from the Our Health application.

- Repository: [HecticMike/psa-logbook-app](https://github.com/HecticMike/psa-logbook-app), private.
- Local folder: `psa-logbook-app`, alongside the original `psa-logbook` folder.
- Feature branch: `enhance/logbook-experience`.
- Main starts with an empty initialization commit so the complete application can be reviewed in one pull request.
- The original [HecticMike/psa-logbook](https://github.com/HecticMike/psa-logbook) repository and its Our Health main branch remain unchanged.
- Git attribution uses HecticMike's GitHub no-reply email, scoped to this repository.

The source includes the local PsA work present at the start of the review. Existing IndexedDB and backup formats remain compatible. The newer Our Health models are not part of this separate application.

## Review and checks

Run `npm ci` and `npm run dev`, then open http://localhost:5175/psa-logbook-app/.

Unit tests, desktop/phone browser tests, and the production offline test run in GitHub Actions for pull requests and main. Pull requests upload a review build. A successful main build publishes to GitHub Pages once Pages is enabled.

Physical iPhone/Safari and real Google Drive consent, backup, and restore checks still need manual verification. Use a PsA JSON backup to load representative personal records locally; keep that backup outside Git.

## Hosting

The prepared deployment URL is https://hecticmike.github.io/psa-logbook-app/. The existing https://hecticmike.github.io/psa-logbook/ address and any Home Screen icon installed from it still open the previous app.

The repository is currently private. GitHub rejected enabling Pages with HTTP 422: the current account plan does not support Pages for this private repository. Publishing through Pages requires explicit permission to make this repository public, or an account plan that supports private repositories. Another host can be configured if the source should remain private.

The deployment workflow is prepared and gated on a successful main build. After the hosting decision: enable Pages with a workflow source, merge the reviewed PR, wait for deployment, and verify the new URL before using it on a phone. The original Our Health repository remains unchanged.

On a phone, open the new URL in Safari and use Share → Add to Home Screen to create a shortcut for the redesigned app. Export a backup before changing shortcuts. GitHub Pages projects on the same hostname share a browser origin, so the existing PsA IndexedDB records may already appear; a separate installed app context can still require importing the backup. Do not clear browser storage to force an update.
