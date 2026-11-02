# Sites archive preparation

The production project remains `appgprj_6ad7885e92708191a9ed6016b15c91ba`.
Preserve its audience, D1 binding, source provenance and existing materials.

1. Run the official Sites source/build workflow. Package the built Site using the
   repository command below, passing the installed official helper path:

   ```sh
   npm run release:package -- /absolute/path/sites-plugin/scripts/package-site.mjs /absolute/path/new-site.tar.gz
   ```

   This runs the official packager with `COPYFILE_DISABLE=1`, preserves its result
   at `new-site.tar.gz.official.tar.gz`, normalizes/verifies the upload archive,
   enforces expanded size, and writes `new-site.tar.gz.check.json`. Any failure
   exits nonzero before native upload. Use a fresh destination for every attempt.
2. If an official workflow has already produced the archive, use this equivalent
   verification step before native save/upload:

   ```sh
   python3 scripts/prepare-sites-archive.py /absolute/path/site.tar.gz /absolute/path/site-portable.tar.gz > /absolute/path/archive-check.json
   ```

3. Proceed only on exit 0. Pass the report's **archive** and matching source SHA
   to Sites. Keep the report with the release receipt. Never upload the original
   archive after a failed check or retry the same rejected bytes.
4. Save and deploy through native Sites tools. Record the terminal result;
   source push, archive eligibility and public interaction checks are separate facts.

The script uses portable GNU TAR headers instead of macOS extended metadata,
without extracting files or deleting application content. It verifies every path,
type, mode, link target, size and regular-file SHA-256 against the original.
Existing input/output files are never overwritten. AppleDouble files are rejected
so the official package can be recreated with metadata disabled.

The Sites ceiling is **268,435,456 bytes of expanded TAR**, including headers and
padding. Compressed `.tar.gz` size is not the eligibility check. The script measures
the actual expanded result and stops before upload if it is too large. Less than
32 MiB remaining produces a capacity warning in the report.

This fixes the repeatable metadata packaging defect; it does not increase hosting
capacity. PDF/audio growth requires separate file delivery/storage, verified before
removing anything from the application bundle. Never drop existing assets, reduce
workbook quality, or change learner records merely to fit an archive.
