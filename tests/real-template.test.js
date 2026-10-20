import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as PDFLib from 'pdf-lib';
import { readPdfFields, fillPdf } from '../www/js/pdfform.js';

const TEMPLATE = process.env.IQ_TEMPLATE || '/mnt/empower-backend/EmpowerSmartIQFiller/templates/Empower_3.10.0_IQ_for_Servers_715002791_RevE.pdf';
const have = fs.existsSync(TEMPLATE);

test('fills the real Waters template', { skip: !have && 'real template not available' }, async () => {
  const bytes = new Uint8Array(fs.readFileSync(TEMPLATE));
  const out = await fillPdf(PDFLib, bytes, { DescriptionRAM: '24 GB', 'Size GBRow1': '150' }, [{ page: 5, x: 94, y: 231, text: 'LABSVR01' }]);
  const { fields } = await readPdfFields(PDFLib, out);
  assert.equal(fields.find(f => f.name === 'DescriptionRAM').value, '24 GB');
  const dir = fs.mkdtempSync('/tmp/esiq-');
  fs.writeFileSync(`${dir}/out.local.pdf`, out);
  execFileSync('pdftoppm', ['-r', '60', '-f', '5', '-l', '7', '-png', `${dir}/out.local.pdf`, `${dir}/p`]);
  console.log(`rendered pages for a visual check: ${dir}`);
});
