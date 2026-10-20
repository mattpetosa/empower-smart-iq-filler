// Empower Deployment Manager log. Several sessions may be appended; the first
// session's start date is the installation start. A later "Empower x.y.z.w"
// installer section (service pack / update) supersedes the base version.
export function parseEmpowerLog(text) {
  const facts = {};
  const grab = re => re.exec(text)?.[1]?.trim();
  const set = (k, v) => { if (v) facts[k] = v; };
  set('hostname', grab(/Machine Name:\s*(.+)/));
  set('os', grab(/Windows Edition:\s*(.+)/));
  set('processor', grab(/\*+\s*Processor:\s*(.+)/));
  const ram = grab(/Total Physical Memory:\s*(.+)/);
  if (ram) set('ram', ram.replace(/(\d+)\.0+\s*/, '$1 '));
  set('installDate', grab(/Logging started:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i));
  const updates = [...text.matchAll(/completed installing Empower (\d+(?:\.\d+)+)/g)].map(m => m[1]);
  set('empowerVersion', updates.length ? updates[updates.length - 1] : grab(/Installing Software Version:\s*(\S+)/));
  const warnings = Object.keys(facts).length ? [] : ['Empower.log: no installation details found.'];
  return { kind: 'empowerlog', facts, warnings };
}
