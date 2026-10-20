import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseTnsnames } from '../www/js/parsers/tnsnames.js';

const text = fs.readFileSync('tests/fixtures/tnsnames.ora', 'utf8');

test('alias is the net service name; commented entries ignored', () => {
  assert.deepEqual(parseTnsnames(text), { kind: 'tnsnames', facts: { netServiceName: 'WAT19', tnsHost: 'LABSVR01' }, warnings: [] });
});

test('with several aliases, the one pointing at this server wins', () => {
  const two = 'OTHER =\n (DESCRIPTION = (ADDRESS = (PROTOCOL = TCP)(HOST = elsewhere.example.com)(PORT = 1521)))\n' + text;
  const r = parseTnsnames(two, 'labsvr01');
  assert.equal(r.facts.netServiceName, 'WAT19');
  assert.match(r.warnings[0], /OTHER/);
});

test('listener.ora is not mistaken for tnsnames.ora', async () => {
  const { detectText } = await import('../www/js/detect.js');
  assert.equal(detectText(fs.readFileSync('tests/fixtures/listener.ora', 'utf8')), null);
});

test('a LISTENER entry never becomes the net service name', () => {
  const mixed = 'LISTENER =\n (DESCRIPTION = (ADDRESS = (PROTOCOL = TCP)(HOST = LABSVR01)(PORT = 1521)))\n' + text;
  assert.equal(parseTnsnames(mixed, 'LABSVR01').facts.netServiceName, 'WAT19');
});
