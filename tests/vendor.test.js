import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ESLC } from './helpers/load-eslc.js';

test('ESLC core loads as a global with the functions ESIQ uses', () => {
  for (const fn of ['parseWizardText', 'parseChecksumText', 'itemsToLines']) assert.equal(typeof ESLC[fn], 'function', fn);
});

test('vendored browser files exist and pdf.js is renamed to .js', () => {
  for (const p of ['www/vendor/pdf-lib.esm.min.js', 'www/vendor/pdfjs/pdf.min.js', 'www/vendor/pdfjs/pdf.worker.min.js', 'www/vendor/eslc/SOURCE']) assert.ok(fs.existsSync(p), p);
  assert.ok(!fs.readdirSync('www/vendor/pdfjs').some(f => f.endsWith('.mjs')));
});

test('field dump has every field on a page and no values', () => {
  const fields = JSON.parse(fs.readFileSync('tests/helpers/fields-715002791.json', 'utf8'));
  assert.ok(fields.length > 100);
  assert.ok(fields.every(f => Number.isInteger(f.page)));
  assert.ok(fields.every(f => !('value' in f)), 'dump must not carry template values');
});
