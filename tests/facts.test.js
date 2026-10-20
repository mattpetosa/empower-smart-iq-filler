import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeFacts } from '../www/js/facts.js';
import { parseText } from '../www/js/parsers/index.js';
import './helpers/load-eslc.js';
import fs from 'node:fs';

const r = (kind, facts, warnings = []) => ({ kind, facts, warnings });

test('higher-precedence source wins and the loser is kept as an alternative', () => {
  const { facts } = mergeFacts([
    r('checksum', { os: 'Microsoft Windows Server 2019 Standard' }),
    r('msinfo', { os: 'Microsoft Windows Server 2022 Standard' }),
  ]);
  assert.equal(facts.os.value, 'Microsoft Windows Server 2022 Standard');
  assert.equal(facts.os.source, 'msinfo');
  assert.deepEqual(facts.os.alternatives, [{ value: 'Microsoft Windows Server 2019 Standard', source: 'checksum' }]);
});

test('agreeing sources produce no alternatives', () => {
  const { facts } = mergeFacts([r('empowerlog', { ram: '24 GB' }), r('msinfo', { ram: '24 GB' })]);
  assert.deepEqual(facts.ram.alternatives, []);
});

test('hostname case differences do not warn', () => {
  const { warnings } = mergeFacts([r('ipconfig', { hostname: 'LABSVR01' }), r('checksum', { hostname: 'Labsvr01' })]);
  assert.deepEqual(warnings, []);
});

test('real hostname disagreement warns and names every source', () => {
  const { facts, warnings } = mergeFacts([r('ipconfig', { hostname: 'LABSVR01' }), r('msinfo', { hostname: 'OTHERHOST' })]);
  assert.equal(facts.hostname.value, 'LABSVR01');
  assert.match(warnings[0], /ipconfig: LABSVR01.*MSInfo: OTHERHOST/);
});

test('wizard beats checksum for licenses', () => {
  const lic = origin => ({ origin, count: 1, options: { base: origin === 'wizard' }, others: [] });
  const { facts } = mergeFacts([r('checksum', { licenses: lic('checksum') }), r('wizard', { licenses: lic('wizard') })]);
  assert.equal(facts.licenses.source, 'wizard');
});

test('virtual falls back to the ipconfig NIC when MSInfo is absent', () => {
  const { facts } = mergeFacts([r('ipconfig', { nic: 'vmxnet3 Ethernet Adapter' })]);
  assert.equal(facts.virtual.value, true);
  assert.equal(facts.virtual.source, 'ipconfig');
});

test('parser warnings are carried through', () => {
  assert.deepEqual(mergeFacts([r('ipconfig', {}, ['x'])]).warnings, ['x']);
});

test('parseText dispatches by content and returns null for unknown text', () => {
  assert.equal(parseText(fs.readFileSync('tests/fixtures/tnsnames.ora', 'utf8')).kind, 'tnsnames');
  assert.equal(parseText('hello'), null);
});

test('the checksum "no license options" warning is dropped once a Wizard supplies licenses', () => {
  const warn = 'Checksum: no license options listed (normal when run before activation).';
  const lic = { origin: 'wizard', count: 1, options: { base: true }, others: [] };
  assert.deepEqual(mergeFacts([r('checksum', {}, [warn]), r('wizard', { licenses: lic })]).warnings, []);
  assert.deepEqual(mergeFacts([r('checksum', {}, [warn])]).warnings, [warn]);
});
