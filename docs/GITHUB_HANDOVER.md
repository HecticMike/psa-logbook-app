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

Unit tests, desktop/phone browser tests, and the production offline test run in GitHub Actions for pull requests and main. The workflow uploads a production build artifact; it does not deploy a site.

Physical iPhone/Safari and real Google Drive consent, backup, and restore checks still need manual verification. Use a PsA JSON backup to load representative personal records locally; keep that backup outside Git.

## Hosting

Hosting has not been configured, and the repository is private. The build base is `/psa-logbook-app/`; set `VITE_BASE` to the intended path if another hosting arrangement is chosen.

Before publishing, choose the hosting service and repository visibility, configure the Google OAuth authorized origin, and verify backup/restore with the deployed origin. No production deployment or change to the existing Our Health site is part of this pull request.
