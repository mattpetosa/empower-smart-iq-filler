// Dump the IQ template's field layout (names, pages, rectangles) - structure
// only, no content - so tests can build a synthetic look-alike PDF without
// committing the copyrighted Waters workbook.
//   node scripts/dump-fields.mjs <template.pdf> > tests/helpers/fields-715002791.json
import fs from 'node:fs';
import * as PDFLib from 'pdf-lib';
import { readPdfFields } from '../www/js/pdfform.js';

const bytes = new Uint8Array(fs.readFileSync(process.argv[2]));
const { fields } = await readPdfFields(PDFLib, bytes);
const out = fields.map(({ name, type, page, rect, multiline }) => ({
  name, type, page, rect: rect.map(n => Math.round(n * 100) / 100), multiline,
}));
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
