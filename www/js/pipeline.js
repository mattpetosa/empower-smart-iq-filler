import { parseText } from './parsers/index.js';
import { parseWizard } from './parsers/licenses.js';
import { mergeFacts } from './facts.js';
import { TEMPLATE } from './templates/servers-715002791.js';

/** System-file texts + Wizard PDF texts → review rows. Same path in browser and tests. */
export function buildFromInputs({ fields, texts = [], wizardTexts = [] }) {
  // Parse once without a hostname to learn it, then again so tnsnames can match it.
  const first = texts.map(t => parseText(t));
  const host = mergeFacts(first.filter(Boolean)).facts.hostname?.value;
  const results = texts.map(t => parseText(t, { hostname: host }));
  const wizards = wizardTexts.map(t => parseWizard(t));
  const ok = [...results, ...wizards].filter(Boolean);
  const merged = mergeFacts(ok);
  const { rows, warnings } = TEMPLATE.buildRows(merged, fields);
  return { rows, warnings, sources: [...results, ...wizards].map(r => ({ kind: r ? r.kind : null })) };
}

/** Apply review edits; return what fillPdf needs. */
export function finalize(rows, edits = {}) {
  const final = rows.map(r => (r.field in edits ? { ...r, value: edits[r.field] } : r));
  const all = Object.fromEntries(final.map(r => [r.field, r.value]));
  return { values: TEMPLATE.writableValues(final), stamps: TEMPLATE.stampsFor(all) };
}
