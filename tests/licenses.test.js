import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './helpers/load-eslc.js';
import { parseWizard } from '../www/js/parsers/licenses.js';
import { parseChecksum } from '../www/js/parsers/checksum.js';

test('wizard: option rows and the "other options" list', () => {
  const { kind, facts } = parseWizard(fs.readFileSync('tests/fixtures/wizard.txt', 'utf8'));
  assert.equal(kind, 'wizard');
  assert.deepEqual(facts.licenses.options, {
    base: true, agilentGc: true, agilentLc: false, suitability: true, sqtSoftware: true, sqtSystems: true, edm2: true,
  });
  assert.deepEqual(facts.licenses.others, ['Empower 3 GPC Option']);
  assert.equal(facts.licenses.origin, 'wizard');
});

test('checksum option lines become a license source', () => {
  const { facts } = parseChecksum(fs.readFileSync('tests/fixtures/checksum-fail-options.txt', 'utf8'));
  assert.equal(facts.licenses.origin, 'checksum');
  assert.deepEqual(facts.licenses.options, {
    base: true, agilentGc: true, agilentLc: false, suitability: true, sqtSoftware: false, sqtSystems: false, edm2: false,
  });
  assert.deepEqual(facts.licenses.others, ['GPC/SEC Option']);
});

test('checksum without options is not a license source', () => {
  const { facts, warnings } = parseChecksum(fs.readFileSync('tests/fixtures/checksum-pass.txt', 'utf8'));
  assert.equal(facts.licenses, undefined);
  assert.match(warnings.join(' '), /no license options listed/);
});

test('options sharing a serial with the base or with each other still count as activated', () => {
  const wiz = [
    '[Empower 3 Enterprise Base License] User licenses: 5 Serial No: AAAAA11111',
    '[Empower 3 System Suitability] Serial No: AAAAA11111',
    '[Empower 3 Agilent GC] Instrument control licenses: 1 Serial No: BBBBB22222',
    '[Empower 3 Agilent LC] Instrument control licenses: 1 Serial No: BBBBB22222',
    '[Empower 3 GPC Option] Serial No: AAAAA11111',
  ].join('\n');
  const { options, others } = parseWizard(wiz).facts.licenses;
  assert.equal(options.suitability, true);
  assert.equal(options.agilentGc, true);
  assert.equal(options.agilentLc, true);
  assert.deepEqual(others, ['Empower 3 GPC Option']);
});

test('checksum option lines sharing the base serial still count', () => {
  const text = fs.readFileSync('tests/fixtures/checksum-fail-options.txt', 'utf8')
    .replace('System Suitability               Serial Number - CCCCC33333', 'System Suitability               Serial Number - AAAAA11111');
  assert.equal(parseChecksum(text).facts.licenses.options.suitability, true);
});
