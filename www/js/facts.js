export const SOURCE_LABEL = {
  ipconfig: 'ipconfig', msinfo: 'MSInfo', empowerlog: 'Empower.log', checksum: 'Checksum',
  tnsnames: 'tnsnames', wizard: 'Licenses', pdf: 'your PDF', typed: 'typed',
};

// Which parser kinds may supply each fact, best first.
const PRECEDENCE = {
  hostname: ['ipconfig', 'msinfo', 'empowerlog', 'checksum'],
  domain: ['ipconfig'], ipv4: ['ipconfig'], subnet: ['ipconfig'], gateway: ['ipconfig'], dns: ['ipconfig'],
  os: ['msinfo', 'empowerlog', 'checksum'],
  manufacturer: ['msinfo'], model: ['msinfo'], systemType: ['msinfo'], drives: ['msinfo'],
  processor: ['msinfo', 'empowerlog'], ram: ['msinfo', 'empowerlog'],
  virtual: ['msinfo', 'ipconfig'],
  installDate: ['empowerlog'],
  empowerVersion: ['checksum', 'empowerlog'],
  installType: ['checksum'],
  verify: ['checksum'],
  netServiceName: ['tnsnames'],
  licenses: ['wizard', 'checksum'],
};
const VIRTUAL_NIC = /vmxnet|hyper-v|virtio|xen|virtual/i;
const same = (a, b) => JSON.stringify(a).toLowerCase() === JSON.stringify(b).toLowerCase();
const shortHost = h => String(h).split('.')[0].toUpperCase();

export function mergeFacts(results) {
  const warnings = results.flatMap(r => r.warnings || []);
  const derived = results.map(r => {
    if (r.kind === 'ipconfig' && r.facts.nic && !('virtual' in r.facts) && VIRTUAL_NIC.test(r.facts.nic)) return { ...r, facts: { ...r.facts, virtual: true } };
    return r;
  });
  const facts = {};
  for (const [key, kinds] of Object.entries(PRECEDENCE)) {
    const cands = [];
    for (const kind of kinds) for (const r of derived) if (r.kind === kind && r.facts[key] !== undefined) cands.push({ value: r.facts[key], source: kind });
    if (!cands.length) continue;
    const [win, ...rest] = cands;
    const alternatives = [];
    for (const c of rest) {
      const dup = key === 'hostname' ? shortHost(c.value) === shortHost(win.value) : same(c.value, win.value);
      if (!dup && !alternatives.some(a => same(a.value, c.value))) alternatives.push(c);
    }
    facts[key] = { value: win.value, source: win.source, alternatives };
  }
  if (facts.licenses?.source === 'wizard') {
    const i = warnings.findIndex(w => /^Checksum: no license options listed/.test(w));
    if (i >= 0) warnings.splice(i, 1);
  }
  if (facts.hostname?.alternatives.length) {
    const all = [facts.hostname, ...facts.hostname.alternatives].map(c => `${SOURCE_LABEL[c.source]}: ${c.value}`).join(', ');
    warnings.unshift(`The files name different servers (${all}). Check you uploaded files from one server.`);
  }
  return { facts, warnings };
}
