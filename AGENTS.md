# PsA Logbook development guidance

- Preserve existing health records. Keep the `psa-logbook-db` database, existing stores, schema compatibility, stable lookup keys, timestamps, and older single-symptom records usable. Treat absent optional measures and unlogged days as missing data, never as zero.
- Validate an entire imported backup before writing; merge transactionally and leave unrelated records intact. Keep personal backups and reports outside this repository and use synthetic test data.
- Treat offline use and the installed iPhone Home Screen app as normal execution paths. A local preview has a different storage origin from the deployed app.
- For record, time, import, report, or offline changes, run the relevant unit tests and browser/PWA checks from `README.md`; check real Google account behavior manually when it is involved.
- `main` deploys to GitHub Pages after CI. Prepare and review production changes before merging or pushing to `main`.
