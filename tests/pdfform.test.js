import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as PDFLib from 'pdf-lib';
import { readPdfFields, fillPdf } from '../www/js/pdfform.js';
import { makeTemplate } from './helpers/make-template.js';

test('readPdfFields returns names, pages and current values', async () => {
  const bytes = await makeTemplate(PDFLib, { values: { DescriptionRAM: '16 GB' } });
  const { fields } = await readPdfFields(PDFLib, bytes);
  const ram = fields.find(f => f.name === 'DescriptionRAM');
  assert.equal(ram.page, 7);
  assert.equal(ram.value, '16 GB');
});

test('fillPdf writes only the given fields and keeps the form editable', async () => {
  const bytes = await makeTemplate(PDFLib, { values: { DescriptionRAM: '16 GB', 'Comments_2': 'None.' } });
  const out = await fillPdf(PDFLib, bytes, { DescriptionRAM: '24 GB', 'ValueIPV4 address of server': '10.0.0.11' }, []);
  const { fields } = await readPdfFields(PDFLib, out);
  const get = n => fields.find(f => f.name === n).value;
  assert.equal(get('DescriptionRAM'), '24 GB');
  assert.equal(get('ValueIPV4 address of server'), '10.0.0.11');
  assert.equal(get('Comments_2'), 'None.');
  const doc = await PDFLib.PDFDocument.load(out);
  assert.ok(doc.getForm().getFields().length > 100, 'form not flattened');
});

test('fillPdf stamps text into page content', async () => {
  const bytes = await makeTemplate(PDFLib);
  const out = await fillPdf(PDFLib, bytes, {}, [{ page: 5, x: 94, y: 231, text: 'LABSVR01' }]);
  const doc = await PDFLib.PDFDocument.load(out);
  assert.ok(doc.getPage(4).node.Contents(), 'page 5 has content');
  assert.ok(out.length > bytes.length);
});

test('fillPdf ignores unknown field names instead of throwing', async () => {
  const bytes = await makeTemplate(PDFLib);
  await assert.doesNotReject(fillPdf(PDFLib, bytes, { NoSuchField: 'x' }, []));
});

test('long single-line values shrink to fit their field', async () => {
  const os = 'Microsoft Windows Server 2022 Standard';
  const out = await fillPdf(PDFLib, await makeTemplate(PDFLib), { 'Operating system and versionRow1': os, DescriptionRAM: '24 GB' }, []);
  const doc = await PDFLib.PDFDocument.load(out);
  const helv = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const size = name => +/([\d.]+) Tf/.exec(doc.getForm().getTextField(name).acroField.getDefaultAppearance())[1];
  const width = doc.getForm().getTextField('Operating system and versionRow1').acroField.getWidgets()[0].getRectangle().width;
  assert.ok(helv.widthOfTextAtSize(os, size('Operating system and versionRow1')) <= width - 4, 'OS text fits');
  assert.equal(size('DescriptionRAM'), 10, 'short text keeps the normal size');
});

test('a field shown on several pages is sized for its narrowest box', async () => {
  const { PDFDocument, StandardFonts } = PDFLib;
  const doc = await PDFDocument.create();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const [p1, p2] = [doc.addPage(), doc.addPage()];
  const tf = doc.getForm().createTextField('Application server name');
  tf.addToPage(p1, { x: 50, y: 700, width: 300, height: 14, font: helv });
  tf.addToPage(p2, { x: 50, y: 700, width: 70, height: 14, font: helv });
  const host = 'LABSVR01.lab.example.com';
  const out = await PDFDocument.load(await fillPdf(PDFLib, await doc.save(), { 'Application server name': host }, []));
  const size = +/([\d.]+) Tf/.exec(out.getForm().getTextField('Application server name').acroField.getDefaultAppearance())[1];
  assert.ok(helv.widthOfTextAtSize(host, size) <= 70 - 4, `fits the 70pt box at ${size}pt`);
});

test('pasted tabs become spaces instead of failing the download', async () => {
  const out = await fillPdf(PDFLib, await makeTemplate(PDFLib), { DescriptionRAM: '24\tGB' }, []);
  const { fields } = await readPdfFields(PDFLib, out);
  assert.equal(fields.find(f => f.name === 'DescriptionRAM').value, '24 GB');
});

test('a character the PDF font cannot draw fails with the field named', async () => {
  await assert.rejects(fillPdf(PDFLib, await makeTemplate(PDFLib), { DescriptionRAM: '≥ 24 GB' }, []), /DescriptionRAM.*≥/);
});
