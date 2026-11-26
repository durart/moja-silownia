# Security Update 3.7.1

Status: draft; do not merge or deploy before explicit approval.

- PDF.js 6.5.438 and Mammoth 1.9.0 are pinned; the current importer still uses CDN URLs.
- Candidate local libraries: Actions artifact 15118252510, archive SHA-256 `5caef8ba7be7f17c0bead6f0a233d5d5dc6752331e6cc6f21ef685d8c6a9667f`. Preserve upstream licenses and verify individual hashes before integration.
- PDF evaluation disabled; DOCX parsed in an inert template, with external file access disabled and ZIP metadata preflight. Metadata checks do not guarantee bounded actual decompression.
- Import limits: PDF/DOCX 10 MiB, TXT 1 MiB, PDF 100 pages, 50 plans, 100 rows per plan, 1 Mi characters of parsed text.
- Separate production and preview cache prefixes and existing storage keys remain unchanged.
- Release gates: real PDF/DOCX browser imports, dynamic XSS checks, offline update, full CI and user acceptance. No production deployment authorized.
