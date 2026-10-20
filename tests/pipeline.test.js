import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as PDFLib from 'pdf-lib';
import './helpers/load-eslc.js';
import { decodeText } from '../www/js/detect.js';
import { readPdfFields, fillPdf } from '../www/js/pdfform.js';
import { buildFromInputs, finalize } from '../www/js/pipeline.js';
import { makeTemplate } from './helpers/make-template.js';

const read = p => fs.readFileSync(`tests/fixtures/${p}`, 'utf8');
const nfo = decodeText(new Uint8Array([0xff, 0xfe, ...Buffer.from(read('msinfo.nfo.xml'), 'utf16le')]));

test('all fixtures → filled PDF with every expected value', async () => {
  const template = await makeTemplate(PDFLib, { values: {
    'Server role or roles application database file server or Waters servicesRow1': 'Database',
    'Server role or roles application database file server or Waters servicesRow2': 'Application',
  } });
  const { fields } = await readPdfFields(PDFLib, template);
  const { rows, warnings, sources } = buildFromInputs({
    fields,
    texts: [read('ipconfig.txt'), nfo, read('empower.log.txt'), read('checksum-pass.txt'), read('tnsnames.ora'), 'random notes'],
    wizardTexts: [read('wizard.txt')],
  });
  assert.deepEqual(sources.map(s => s.kind), ['ipconfig', 'msinfo', 'empowerlog', 'checksum', 'tnsnames', null, 'wizard']);
  assert.ok(!warnings.some(w => /different servers/.test(w)), warnings.join('\n'));
  const { values, stamps } = finalize(rows, { '1_3': '7.91.00.00' });
  const out = await fillPdf(PDFLib, template, values, stamps);
  const got = Object.fromEntries((await readPdfFields(PDFLib, out)).fields.map(f => [f.name, f.value]));
  assert.equal(got['ValueIPV4 address of server'], '10.0.0.11');
  assert.equal(got['DescriptionProcessor'], '2 x Intel(R) Xeon(R) Gold 6226R CPU @ 2.90GHz (4 cores each)');
  assert.equal(got['Size GBRow5'], '1198');
  assert.equal(got['Installation start dateRow2'], '10/14/2026');
  assert.equal(got['Empower version'], '3.10.0.1');
  assert.equal(got['3_3'], 'WAT19');
  assert.equal(got['Agilent GC control option'], 'Yes');
  assert.equal(got['2_4'], 'Yes');
  assert.equal(got['1_3'], '7.91.00.00', 'user edit applied');
  assert.equal(got['Initials'], '', 'never-fill field untouched');
  assert.equal(got['Server host nameRow1'], 'LABSVR01');
  assert.equal(got['Application server name'], 'LABSVR01');
  assert.deepEqual(stamps, []);
});
