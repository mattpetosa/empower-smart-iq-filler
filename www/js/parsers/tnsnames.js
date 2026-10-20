// tnsnames.ora: the net service name is the entry alias ("WAT19 = (DESCRIPTION ...").
export function parseTnsnames(text, hostname) {
  const clean = text.split(/\r\n|\r|\n/).filter(l => !/^\s*#/.test(l)).join('\n');
  const entries = [];
  const re = /^([A-Za-z][\w.\-]*)\s*=\s*\(/gm;
  const starts = [...clean.matchAll(re)];
  starts.forEach((m, i) => {
    const body = clean.slice(m.index, starts[i + 1]?.index ?? clean.length);
    const host = /HOST\s*=\s*([^)\s]+)/i.exec(body)?.[1];
    if (!/^LISTENER/i.test(m[1])) entries.push({ alias: m[1], host });   // listener entries are not service names
  });
  const short = h => (h || '').split('.')[0].toUpperCase();
  const mine = hostname ? entries.find(e => short(e.host) === short(hostname)) : undefined;
  const pick = mine || entries[0];
  const warnings = entries.filter(e => e !== pick).map(e => `tnsnames: also has ${e.alias} (HOST ${e.host}); using ${pick.alias}.`);
  const facts = {};
  if (pick) { facts.netServiceName = pick.alias; if (pick.host) facts.tnsHost = pick.host; }
  else warnings.push('tnsnames: no entries found.');
  return { kind: 'tnsnames', facts, warnings };
}
