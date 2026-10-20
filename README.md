# Empower Smart IQ Filler

Fills the Waters **Empower Enterprise or Workgroup Servers – Installation
Qualification** workbook (part number 715002791) from the files you already
collect on the server: drop the IQ PDF (blank or your own pre-filled copy),
drop the system files in any order, review every proposed value — each one
shows which file it came from, and anything that changes a value already in
your PDF is highlighted — then download the filled, still-editable PDF.

Live at **https://iq.mhpwebserver.com**.

## Privacy

Your files are read by your browser. Nothing is uploaded: the server only
serves the static page, and all parsing and PDF filling happens on your
machine (pdf.js to read, pdf-lib to fill).

## Supported inputs

| File | Recognized by | Fills |
|---|---|---|
| `ipconfig /all` output | `Windows IP Configuration` | host name, domain, IPv4, subnet, gateway, DNS servers |
| msinfo32 export (`.nfo` or `.txt`) | `<MsInfo>` / `System Information report` | OS, manufacturer, model, processor, RAM, server type, drive table |
| Empower.log | `Empower Deployment Manager` | installation start date, version, OS/hardware fallbacks |
| Checksum.txt | `Waters File Verification` | Empower version, installation type, "no files missing or changed", license options when listed |
| tnsnames.ora | `(DESCRIPTION` + `HOST =` | net service name |
| Licensing Wizard PDF | `Serial No:` lines | license/option rows (Form 7) |

Files are recognized by content, never by name.

## What you still type

Database version and instance name, the backup schedule (Form 9),
documentation part numbers/revisions if they differ, and anything the files
can't know. Signatures, initials and dates are never filled.

## Development

```bash
npm install
npm run vendor   # copies pdf-lib, pdf.js (renamed .mjs → .js) and the License Cleaner's core.js into www/vendor
npm test         # node:test, synthetic fixtures only
```

The real-template test reads the workbook from `$IQ_TEMPLATE` (or the
maintainer's NAS path) and is skipped when it isn't available.

**Never commit real customer files or the Waters template PDF.** Tests use a
synthetic look-alike built from the template's field layout
(`tests/helpers/fields-715002791.json` — names and rectangles only) and made-up
data (`LABSVR01`, `example.com`, `10.0.0.x`, `Example Pharma`).

Deploy: `scripts/deploy.sh` (runs the tests, then copies `www/` to the webroot).

## License

MIT
