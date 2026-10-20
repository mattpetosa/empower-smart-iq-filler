# Empower Smart IQ Filler (ESIQ) — design

Date: 2026-10-19 · Status: approved in conversation, awaiting written-spec review

## Purpose

A Waters specialist qualifying an Empower server spends a chunk of every IQ
re-typing facts that already exist in files they collect anyway (ipconfig,
msinfo32, Empower.log, Checksum.txt, tnsnames.ora, a Licensing Wizard PDF).
ESIQ takes the IQ workbook PDF plus those files, fills every form field it can
prove from them, lets the user review and correct each value, and hands back the
filled PDF — still an editable form, signatures untouched.

Success: for a typical single-server install, the only things the user types are
the answers no file contains (backup schedule, DB version/instance, doc
revisions) and the signatures they add later by hand.

## Scope

- **One workbook:** *Empower Enterprise or Workgroup Servers — Installation
  Qualification*, Waters part number **715002791** (Revision E, Sept 2025; 16
  pages, 116 AcroForm fields). Other workbooks (Client IQ, Citrix, other
  revisions) are out of scope; the field-map module is structured so each could
  be added later as its own map file.
- **In-browser only.** Static site; every file is read with the File API and
  never leaves the user's machine. No backend, no storage, no login, no logging
  beyond nginx's access log of static GETs.
- **Never fills:** signatures, initials, any Date field in Form 1 or the
  certification block, the reviewer's name/title.

## User flow (single page)

1. **IQ workbook** — drop the blank Waters PDF or the user's own pre-filled copy.
   Validated by the `715002791` part number in the text *and* the presence of the
   expected field names; anything else is rejected with a clear message.
2. **System files** — drop any number, any order. Each is identified by
   content, not filename (see *Parsers*). Unknown files are listed as "not
   recognized" and ignored. A file may be removed again.
3. **Review** — a form grouped by workbook form (Form 1–9). Every row shows:
   field label · value (editable) · source chip (`ipconfig`, `MSInfo`,
   `Empower.log`, `Checksum`, `tnsnames`, `Licenses`, `your PDF`, `typed`).
   Rows where a file **changed** a value already in the uploaded PDF are
   highlighted and show the old value ("Server 2025 → 2022"). Conflicts
   between two files are shown with both values; the precedence winner is
   pre-selected.
4. **Download** — `Empower_3.10.0_IQ_for_Servers_<HOSTNAME>.pdf` (hostname
   sanitized; falls back to the uploaded file's name).

## Parsers (each: text in → plain facts out)

| File | Recognised by | Facts |
|---|---|---|
| `ipconfig /all` | `Windows IP Configuration` | hostname, primary DNS suffix (domain), IPv4 (strip `(Preferred)`), subnet, default gateway, DNS servers (continuation lines). First adapter with an IPv4 wins; others listed in a warning. |
| msinfo32 export `.nfo` | XML root `<MsInfo>` (UTF-16 LE, BOM-sniffed) | OS name, system name, manufacturer, model, processor lines (count identical lines → "2 x …"), installed RAM, drives (letter, description, size, volume name). Also accept the `.txt` export (`System Information report`) — same facts. |
| Empower.log | `Empower Deployment Manager` / `Machine Name:` | first `Logging started` date (= installation start date), machine name, Windows edition, processor, total physical memory, installed version (later `Empower x.y.z.w` installer section wins over the base version), success status. |
| Checksum.txt | `Waters File Verification` | computer name, installation type, software version, OS name, company, support plan ID, per-directory `found changed` / `missing` totals → **pass** only if every block is 0/0; `Option Properly Installed` lines → licenses (via ESLC). |
| tnsnames.ora | `(DESCRIPTION` + `HOST =` | net service name(s) = entry aliases (e.g. `WAT19`), host, service name. If several aliases, the first whose HOST matches the server hostname. |
| Licensing Wizard PDF | `Serial No:` in pdf.js text | licenses via ESLC `parseWizardText`. |

Licence parsing reuses the License Cleaner's `core.js` (`window.ESLC`:
`parseWizardText`, `parseChecksumText`, plus its pdf.js text-items → layout-lines
helper). It is **vendored** into `vendor/eslc/core.js` by `scripts/sync-eslc.sh`
(copies from `~/licenses-site/offline/core.js`, records the source commit in
`vendor/eslc/SOURCE`), so ESLC fixes flow in deliberately, not silently.

## Field map (Servers IQ 715002791)

Facts → AcroForm field names (exact names from the PDF):

- **Form 2** — `Installation start dateRow1/Row2` ← Empower.log date.
  Role rows (`Server role…Row1/Row2`) are left as the PDF has them.
- **Form 4** — `Operating system and versionRow1/Row2` ← OS (MSInfo > Empower.log > Checksum).
- **Form 5** — `DescriptionManufacturer`, `DescriptionModel`,
  `DescriptionProcessor`, `DescriptionRAM` ← MSInfo (Empower.log fallback for
  CPU/RAM). `DescriptionDisk storage type` ← "Virtual Disks" when the model/disk
  model says VMware / Hyper-V / virtual, else left as PDF. `DescriptionOther` ←
  system type (`x64-based PC`).
  Drive table `Drive letterRowN` / `Size GBRowN` / `DescriptionRowN` (8 rows):
  fixed disks only, sorted by letter, size rounded to whole GB; description from
  volume label — `OS`→OS, `Programs`/`Program*`/`App*`→Application,
  `Database`/`DB`→Database, `RawData`/`Raw*`/`Projects`→Raw Data and Projects,
  `Backup*`/`DR*`→DR Backups, `EmpowerSetup`/`Setup`/`Install*`→ *comment*,
  anything else → the label verbatim. Installation-media drives and any drives
  beyond the rows the template leaves usable go to `Comments_2` as
  "Additional drive: I: (30 GB) - Empower Setup (installation media)." The
  template prints an N/A strike-through over its last rows, so the usable row
  count is taken from the PDF (rows whose existing value is `N/A` stay `N/A`;
  in the 715002791 Rev E template rows 1–5 are clear, row 6+ is struck).
- **Form 6** — `Network information` ← domain; `ValueIPV4 address of server`,
  `ValueSubnet mask`, `ValueGateway`, `ValueDNS servers` (comma-joined).
- **Form 7** — `Empower version` ← installed version (`3.10.0.1` if the update
  was installed); `Empower installation type` ← Checksum (`Enterprise` /
  `Workgroup`, mapped from "Enterprise Client Installed on a Server" etc.).
  Option rows (`Empower Enterprise or Workgroup base software`, `Agilent GC
  control option`, `Agilent LC control option`, `Empower system suitability
  option`, `Empower SystemsQT™ for software`, `Empower SystemsQT for systems`,
  `Empower Enterprise Data Manager 2 option`) ← Yes/No **only when a license
  source was parsed**; `List other activated options…` ← remaining *Options*
  category licenses, comma-joined, or `None.`. Instrument-control and user-count
  licenses are not listed. Wizard PDF beats Checksum on disagreement. A
  Checksum with zero option lines is reported as "no options in this Checksum",
  never as all-No.
- **Form 8** — the "Verify that no files are missing or changed" row (`2_4`)
  ← `Yes` when the Checksum passes (every block 0 changed / 0 missing) and
  `No` plus a red warning when it fails; with no Checksum it keeps the PDF's
  value. The other verify-files rows (`YesNo`, `1_4`, the Pass/Fail-initial row,
  `Insert the printout…`) record things the user does by hand and keep the
  PDF's values. `3_3` (net service name) ← tnsnames alias. `1_3` (DB version)
  and `2_3` (instance) are typed.
- **Form 9** — backup rows are typed.

**Host name, server type and application server name** (amended during the
build, 2026-10-19). These are real fields with widgets on several pages, so
filling one field fills every form; nothing is drawn into page content:

| Field | Widgets on |
|---|---|
| `Server host nameRow1/2`, `Server type physical virtual or cloudbasedRow1/2` | Form 2 (p5) and Form 4 (p7) |
| `Application server name` | Forms 3, 5, 6, 7, 8, 9 (p6–p11) |

They are filled from two review rows (host name, server type), only on rows
whose role field is filled (rows 1–2 in the standard pre-fill), and fall back
to the PDF's existing values when no file supplies them. Server type =
`Virtual` when manufacturer is VMware / Microsoft Hyper-V / QEMU / etc., else
`Physical`. Single-line text shrinks below 10 pt to fit its narrowest widget.
(The original design assumed these had no fields and stamped text at fixed
coordinates; the first browser render showed doubled text.)

## Precedence rules

1. A value already in the uploaded PDF is **kept** unless a system file
   provides a technical fact for that field (OS, version, hardware, network,
   sizes) — then the file wins and the row is flagged "changed".
2. Between files: MSInfo > Empower.log > Checksum for OS/hardware; ipconfig is
   the only network source; Wizard PDF > Checksum for licenses.
3. Anything the user edits in review wins over everything.

## Components

```
www/
  index.html, style.css, app.js     page, drop zones, review form, download
  logo.svg, favicon.svg             gold Smart Tools tile #FDE68A→#CA8A04
  vendor/pdf-lib.min.js             fill (pinned version)
  vendor/pdfjs/                     text extraction (IQ validation, Wizard PDF)
  vendor/eslc/core.js, SOURCE       vendored License Cleaner parser
src/ (served as ES modules from www/js/)
  detect.js                         content sniffing → parser
  parsers/{ipconfig,msinfo,empowerlog,checksum,tnsnames,licenses}.js
  facts.js                          merge per-file facts with precedence + provenance
  templates/servers-715002791.js    field map, drive-row rules, derived host/type fields
  fill.js                           pdf-lib: set fields, update appearances
tests/                              node:test
  fixtures/                         SYNTHETIC files only (fake host LABSVR01,
                                    example.com, 10.0.0.x, fake company)
scripts/sync-eslc.sh, deploy.sh
```

All JS is external files (site CSP forbids inline `<script>`). Modules are pure
functions so Node tests import them directly.

## Testing

- **Parser unit tests** on synthetic fixtures shaped exactly like the real
  formats (UTF-16 `.nfo`, CRLF/CR mixes in Checksum, multi-line DNS in ipconfig,
  two install sessions + update in Empower.log, commented blocks in tnsnames).
- **Merge tests** for every precedence rule, the virtual/physical decision, the
  drive-label mapping, extra-drive → comment, Checksum-without-options.
- **End-to-end fill test**: a synthetic AcroForm PDF with the same 116 field
  names (generated by a test helper) → fill → re-read every field value.
- **Real-template test** (skipped when absent): the Waters 715002791 PDF is
  copyrighted and customer-adjacent, so it lives **outside the repo** at
  `/mnt/empower-backend/EmpowerSmartIQFiller/templates/` and is used only locally; the test
  fills it and renders pages 5–11 with `pdftoppm` for a visual check.
- Manual browser check in Firefox (headless-screenshot recipe) before deploy.

## Deployment

- Static files to `/var/www/iq.mhpwebserver.com` via `scripts/deploy.sh`
  (cache-busting query stamp on app.js/style.css like the empower site).
- nginx vhost `iq.mhpwebserver.com` with Cloudflare Origin CA cert (zone is
  Full (strict)), `conf.d/csp.conf` CSP, Cloudflare Web Analytics beacon off for
  the host (disable_rum rule) unless CSP is extended for it.
- Cloudflare DNS record (proxied).
- empower.mhpwebserver.com home page: new **Empower Smart IQ Filler** card next
  to License Cleaner / License Audit, logo `assets/logo-iq.svg`.
- Projects dashboard: add to `projects-admin/projects.json`.
- Public GitHub repo `mattpetosa/empower-smart-iq-filler`, MIT, noreply author
  identity. **Never commit real customer files or the Waters template.** Push
  only with Matt's go-ahead.

## Error handling

- Wrong/unknown IQ PDF → rejected before anything else is shown.
- Encrypted/unreadable PDF, malformed `.nfo` → per-file error chip; other files
  still used.
- Hostname disagreement between files (e.g. ipconfig vs MSInfo) → warning
  banner listing each source's hostname; nothing is silently picked.
- Checksum with any changed/missing file → red warning and `2_4` set to `No`.

## Out of scope (for now)

Other IQ workbooks, OQ/PQ workbooks, multi-server installs in one workbook
(rows 3+), offline single-file build, saving profiles/defaults, signatures.
