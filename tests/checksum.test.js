import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './helpers/load-eslc.js';
import { parseChecksum } from '../www/js/parsers/checksum.js';

const pass = fs.readFileSync('tests/fixtures/checksum-pass.txt', 'utf8');
const fail = fs.readFileSync('tests/fixtures/checksum-fail-options.txt', 'utf8');

test('passing checksum', () => {
  const { kind, facts } = parseChecksum(pass);
  assert.equal(kind, 'checksum');
  assert.equal(facts.hostname, 'Labsvr01');
  assert.equal(facts.os, 'Microsoft Windows Server 2022 Standard');
  assert.equal(facts.empowerVersion, '3.10.0.1');
  assert.equal(facts.installType, 'Enterprise');
  assert.deepEqual(facts.verify, { pass: true, changed: 0, missing: 0, blocks: 2 });
});

test('a changed file fails verification; Workgroup install type', () => {
  const { facts, warnings } = parseChecksum(fail);
  assert.deepEqual(facts.verify, { pass: false, changed: 1, missing: 0, blocks: 2 });
  assert.equal(facts.installType, 'Workgroup');
  assert.match(warnings.join(' '), /1 changed/);
});

test('CR-only line endings parse the same', () => {
  assert.deepEqual(parseChecksum(pass.replace(/\n/g, '\r')).facts.verify, { pass: true, changed: 0, missing: 0, blocks: 2 });
});
