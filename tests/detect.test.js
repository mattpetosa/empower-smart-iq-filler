import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeText, isPdf, detectText, classifyPdfText } from '../www/js/detect.js';

test('decodeText handles UTF-16LE with BOM, UTF-16BE with BOM, and UTF-8', () => {
  const le = new Uint8Array([0xff, 0xfe, ...Buffer.from('<MsInfo>', 'utf16le')]);
  assert.equal(decodeText(le), '<MsInfo>');
  const be = Buffer.from('<MsInfo>', 'utf16le'); be.swap16();
  assert.equal(decodeText(new Uint8Array([0xfe, 0xff, ...be])), '<MsInfo>');
  assert.equal(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...Buffer.from('héllo')])), 'héllo');
});

test('isPdf finds the header', () => {
  assert.ok(isPdf(new Uint8Array(Buffer.from('%PDF-1.7\n...'))));
  assert.ok(!isPdf(new Uint8Array(Buffer.from('Windows IP Configuration'))));
});

test('detectText recognizes each file type by content', () => {
  assert.equal(detectText('\r\nWindows IP Configuration\r\n'), 'ipconfig');
  assert.equal(detectText('<?xml version="1.0"?>\n<MsInfo>'), 'msinfo');
  assert.equal(detectText('System Information report written at: 10/14/2026'), 'msinfo');
  assert.equal(detectText('=== Logging started: 10/14/2026 - Empower Deployment Manager ==='), 'empowerlog');
  assert.equal(detectText('Waters File Verification Utility - V 4.02'), 'checksum');
  assert.equal(detectText('WAT19 =\n  (DESCRIPTION =\n (ADDRESS = (PROTOCOL = TCP)(HOST = X)(PORT = 1521))'), 'tnsnames');
  assert.equal(detectText('just some notes'), null);
});

test('classifyPdfText tells the IQ workbook from a Licensing Wizard printout', () => {
  assert.equal(classifyPdfText('Workbook Part Number: 715002791 Revision E', '715002791'), 'iq');
  assert.equal(classifyPdfText('[Empower 3 Agilent GC] Instrument control licenses: 1 Serial No: X', '715002791'), 'wizard');
  assert.equal(classifyPdfText('a random pdf', '715002791'), null);
});
