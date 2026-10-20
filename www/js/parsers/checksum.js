// Waters File Verification report (Checksum*.txt). Each directory block ends
// with "N file(s) found changed" / "N file(s) missing"; the install passes only
// when every block reports 0 / 0. Option lines are handled by licenses.js.
import { licensesFromChecksum } from './licenses.js';

export function parseChecksum(text) {
  text = text.replace(/\r\n?/g, '\n');
  const facts = {}, warnings = [];
  const grab = re => re.exec(text)?.[1]?.trim();
  const set = (k, v) => { if (v) facts[k] = v; };
  set('hostname', grab(/^\s*Computer Name\s*-\s*(.+)$/m));
  const os = grab(/^\s*Operating System Name\s*-\s*(.+)$/m);
  if (os) set('os', /^Windows/i.test(os) ? `Microsoft ${os}` : os);
  set('empowerVersion', grab(/^\s*Software Version\s*-\s*(?:Empower\s+)?(\S+)/m));
  const type = grab(/^\s*Installation Type\s*-\s*(.+)$/m);
  if (type) set('installType', /workgroup/i.test(type) ? 'Workgroup' : /enterprise/i.test(type) ? 'Enterprise' : undefined);
  const changed = [...text.matchAll(/(\d+)\s+file\(s\) found changed/g)].map(m => +m[1]);
  const missing = [...text.matchAll(/(\d+)\s+file\(s\) missing/g)].map(m => +m[1]);
  if (changed.length) {
    const c = changed.reduce((a, b) => a + b, 0), m = missing.reduce((a, b) => a + b, 0);
    facts.verify = { pass: c === 0 && m === 0, changed: c, missing: m, blocks: changed.length };
    if (!facts.verify.pass) warnings.push(`Checksum: verification FAILED (${c} changed, ${m} missing).`);
  }
  const licenses = licensesFromChecksum(text);
  if (licenses) facts.licenses = licenses;
  else warnings.push('Checksum: no license options listed (normal when run before activation).');
  return { kind: 'checksum', facts, warnings };
}
