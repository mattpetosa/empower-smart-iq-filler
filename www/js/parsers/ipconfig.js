// `ipconfig /all` output. Keys use dot leaders ("Host Name . . . : X");
// multi-valued keys (DNS servers, gateway, suffix list) continue on lines
// that are only deep indentation + a value.
const KV = /^\s+(\S.*?)(?:\s*\.)+\s*:\s?(.*?)\s*$/;
const CONT = /^\s{10,}(\S.*?)\s*$/;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export function parseIpconfig(text) {
  const sections = [{ name: 'global', kv: new Map() }];
  let lastKey = null;
  for (const line of text.split(/\r\n|\r|\n/)) {
    if (!line.trim()) continue;
    if (/^\S/.test(line)) {                       // section header
      // The banner opens the global section (Host Name, Primary Dns Suffix).
      if (/^Windows IP Configuration/i.test(line)) { lastKey = null; continue; }
      sections.push({ name: line.replace(/:\s*$/, '').trim(), kv: new Map() });
      lastKey = null;
      continue;
    }
    const sec = sections[sections.length - 1];
    const m = KV.exec(line);
    if (m) {
      lastKey = m[1].trim();
      sec.kv.set(lastKey, m[2] ? [m[2].trim()] : []);
      continue;
    }
    const c = CONT.exec(line);
    if (c && lastKey) sec.kv.get(lastKey).push(c[1]);
  }
  const first = (sec, ...keys) => { for (const k of keys) { const v = sec.kv.get(k)?.find(Boolean); if (v) return v; } return undefined; };
  const strip = v => v?.replace(/\(.*\)$/, '').trim();
  const global = sections[0];
  const adapters = sections.slice(1).filter(s => / adapter /i.test(s.name) && first(s, 'IPv4 Address', 'IP Address'));
  const warnings = [];
  const facts = {};
  const host = first(global, 'Host Name');
  if (host) facts.hostname = host;
  const a = adapters[0];
  const domain = first(global, 'Primary Dns Suffix') || (a && first(a, 'Connection-specific DNS Suffix'));
  if (domain) facts.domain = domain;
  if (a) {
    facts.ipv4 = strip(first(a, 'IPv4 Address', 'IP Address'));
    const subnet = first(a, 'Subnet Mask'); if (subnet) facts.subnet = subnet;
    const gw = (a.kv.get('Default Gateway') || []).map(strip).find(v => IPV4.test(v)); if (gw) facts.gateway = gw;
    const dns = (a.kv.get('DNS Servers') || []).map(strip).filter(Boolean); if (dns.length) facts.dns = dns;
    const nic = first(a, 'Description'); if (nic) facts.nic = nic;
    for (const other of adapters.slice(1)) warnings.push(`ipconfig: also found ${other.name} (${strip(first(other, 'IPv4 Address', 'IP Address'))}); using ${a.name}.`);
  } else {
    warnings.push('ipconfig: no adapter with an IPv4 address.');
  }
  return { kind: 'ipconfig', facts, warnings };
}
