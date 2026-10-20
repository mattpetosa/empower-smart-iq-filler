import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseIpconfig } from '../www/js/parsers/ipconfig.js';

const text = fs.readFileSync('tests/fixtures/ipconfig.txt', 'utf8');

test('parses host, domain and the IPv4 adapter', () => {
  const { kind, facts, warnings } = parseIpconfig(text);
  assert.equal(kind, 'ipconfig');
  assert.deepEqual(facts, {
    hostname: 'LABSVR01', domain: 'example.com', ipv4: '10.0.0.11', subnet: '255.255.255.0',
    gateway: '10.0.0.1', dns: ['10.0.2.11', '10.0.2.12', '10.0.2.13'], nic: 'vmxnet3 Ethernet Adapter',
  });
  assert.deepEqual(warnings, []);
});

test('domain falls back to the adapter suffix when there is no primary suffix', () => {
  const { facts } = parseIpconfig(text.replace(/Primary Dns Suffix[^\r\n]*/, 'Primary Dns Suffix  . . . . . . . : '));
  assert.equal(facts.domain, 'example.com');
});

test('a second IPv4 adapter produces a warning, first one wins', () => {
  const extra = '\r\nEthernet adapter Ethernet1:\r\n\r\n   IPv4 Address. . . . . . . . . . . : 10.9.9.9(Preferred)\r\n   Subnet Mask . . . . . . . . . . . : 255.255.0.0\r\n';
  const { facts, warnings } = parseIpconfig(text + extra);
  assert.equal(facts.ipv4, '10.0.0.11');
  assert.match(warnings[0], /Ethernet1/);
});

test('old "IP Address" label (Server 2003-style) still parses', () => {
  const { facts } = parseIpconfig(text.replace('IPv4 Address. . . . . . . . . . . : 10.0.0.11(Preferred)', 'IP Address. . . . . . . . . . . . : 10.0.0.11'));
  assert.equal(facts.ipv4, '10.0.0.11');
});
