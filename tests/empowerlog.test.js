import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseEmpowerLog } from '../www/js/parsers/empowerlog.js';

const text = fs.readFileSync('tests/fixtures/empower.log.txt', 'utf8');

test('first session date is the install start; later update wins the version', () => {
  const { kind, facts } = parseEmpowerLog(text);
  assert.equal(kind, 'empowerlog');
  assert.deepEqual(facts, {
    hostname: 'LABSVR01', os: 'Microsoft Windows Server 2022 Standard',
    processor: 'Intel(R) Xeon(R) Gold 6226R CPU @ 2.90GHz', ram: '24 GB',
    installDate: '10/14/2026', empowerVersion: '3.10.0.1',
  });
});

test('without the update section the base version is used', () => {
  const base = text.slice(0, text.indexOf('=== Logging Started: 10-14-2026 16:46:55'));
  assert.equal(parseEmpowerLog(base).facts.empowerVersion, '3.10.0');
});
