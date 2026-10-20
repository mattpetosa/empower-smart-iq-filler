import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodeText } from '../www/js/detect.js';
import { parseMsinfo } from '../www/js/parsers/msinfo.js';

const xml = fs.readFileSync('tests/fixtures/msinfo.nfo.xml', 'utf8');
const nfoBytes = new Uint8Array([0xff, 0xfe, ...Buffer.from(xml, 'utf16le')]);

test('.nfo: hardware facts', () => {
  const { kind, facts } = parseMsinfo(decodeText(nfoBytes));
  assert.equal(kind, 'msinfo');
  assert.equal(facts.hostname, 'LABSVR01');
  assert.equal(facts.os, 'Microsoft Windows Server 2022 Standard');
  assert.equal(facts.manufacturer, 'VMware, Inc.');
  assert.equal(facts.model, 'VMware7,1');
  assert.equal(facts.systemType, 'x64-based PC');
  assert.equal(facts.processor, '2 x Intel(R) Xeon(R) Gold 6226R CPU @ 2.90GHz (4 cores each)');
  assert.equal(facts.ram, '24 GB');
  assert.equal(facts.virtual, true);
});

test('.nfo: fixed drives only, sorted, sizes rounded, TB converted', () => {
  const { facts } = parseMsinfo(decodeText(nfoBytes));
  assert.deepEqual(facts.drives, [
    { letter: 'C:', sizeGB: 150, label: 'OS' },
    { letter: 'E:', sizeGB: 500, label: 'Programs' },
    { letter: 'F:', sizeGB: 500, label: 'Database' },
    { letter: 'G:', sizeGB: 500, label: 'RawData' },
    { letter: 'H:', sizeGB: 1198, label: 'Backup' },
    { letter: 'I:', sizeGB: 30, label: 'EmpowerSetup' },
  ]);
});

test('.txt export: same facts from the tab layout; Hyper-V is virtual; one CPU', () => {
  const { facts } = parseMsinfo(fs.readFileSync('tests/fixtures/msinfo.txt', 'utf8'));
  assert.equal(facts.hostname, 'LABSVR01');
  assert.equal(facts.manufacturer, 'Microsoft Corporation');
  assert.equal(facts.virtual, true);
  assert.equal(facts.processor, 'Intel(R) Xeon(R) Silver 4210 CPU @ 2.20GHz (8 cores)');
  assert.equal(facts.ram, '32 GB');
  assert.deepEqual(facts.drives, [{ letter: 'C:', sizeGB: 126, label: '' }, { letter: 'E:', sizeGB: 300, label: 'Empower' }]);
});

test('physical hardware is not virtual', () => {
  const { facts } = parseMsinfo(xml.replace('VMware, Inc.', 'Dell Inc.').replace('VMware7,1', 'PowerEdge R750'));
  assert.equal(facts.virtual, false);
});

test('unknown structure yields no facts and a warning, not a crash', () => {
  const { facts, warnings } = parseMsinfo('<MsInfo></MsInfo>');
  assert.deepEqual(facts, {});
  assert.equal(warnings.length, 1);
});
