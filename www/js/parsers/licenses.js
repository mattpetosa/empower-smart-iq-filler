// License options for Form 7, from the License Cleaner's parser (vendored
// core.js, loaded as globalThis.ESLC). First matching rule wins, so
// "Software SQT" is never also counted as "SystemsQT for systems".
const RULES = [
  ['agilentGc', /agilent\s+gc/i],
  ['agilentLc', /agilent\s+lc/i],
  ['suitability', /system\s+suitability/i],
  ['sqtSoftware', /software\s+sqt|(?:systemsqt|sqt)\s+for\s+software/i],
  ['sqtSystems', /systemsqt/i],
  ['edm2', /enterprise\s+data\s+manager|\bedm\b/i],
];

// ESLC's cleanup (made for the licensing portal) drops lines that share the
// base license's serial or another line's serial. For the IQ every one of them
// is still an activated option, so re-parse each dropped line on its own.
const DEDUPED = /same serial|duplicate serial/i;
function activated(res, parseOne) {
  const back = res.removed.filter(r => DEDUPED.test(r.reason)).flatMap(r => parseOne(r.raw).licenses);
  return [...res.licenses, ...back];
}

export function summarizeLicenses(res, origin, parseOne = () => ({ licenses: [] })) {
  const options = { base: false, agilentGc: false, agilentLc: false, suitability: false, sqtSoftware: false, sqtSystems: false, edm2: false };
  const others = [];
  for (const l of activated(res, parseOne)) {
    if (l.category === 'Base License') { options.base = true; continue; }
    const hit = RULES.find(([, rx]) => rx.test(l.name));
    if (hit) { options[hit[0]] = true; continue; }
    if (l.category === 'Options' && !others.includes(l.name)) others.push(l.name);
  }
  return { origin, count: res.licenses.length, options, others };
}

export function parseWizard(text) {
  const res = globalThis.ESLC.parseWizardText(text);
  if (!res.licenses.length) return { kind: 'wizard', facts: {}, warnings: ['Licensing Wizard PDF: no license lines found.'] };
  return { kind: 'wizard', facts: { licenses: summarizeLicenses(res, 'wizard', globalThis.ESLC.parseWizardText) }, warnings: [] };
}

export function licensesFromChecksum(text) {
  const res = globalThis.ESLC.parseChecksumText(text);
  return res.licenses.length ? summarizeLicenses(res, 'checksum', globalThis.ESLC.parseChecksumText) : null;
}
