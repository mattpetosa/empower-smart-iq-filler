import * as PDFLib from '../vendor/pdf-lib.esm.min.js';
import { decodeText, isPdf, classifyPdfText, detectText } from './detect.js';
import { readPdfFields, fillPdf } from './pdfform.js';
import { pdfText } from './pdftext.js';
import { buildFromInputs, finalize } from './pipeline.js';
import { TEMPLATE } from './templates/servers-715002791.js';
import { SOURCE_LABEL } from './facts.js';
import { VERSION } from './version.js';

const $ = id => document.getElementById(id);
const KIND_LABEL = { ...SOURCE_LABEL, wizard: 'Licensing Wizard' };
const state = { iq: null, sources: [], edits: {}, rows: [] };

$('version').textContent = VERSION;

function showError(msg) { $('error').textContent = msg || ''; $('error').hidden = !msg; }

function wireDrop(zone, input, onFiles) {
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('over'); onFiles([...e.dataTransfer.files]); });
  input.addEventListener('change', () => { onFiles([...input.files]); input.value = ''; });
}

async function loadIq(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) throw new Error(`${file.name} is not a PDF.`);
  const text = await pdfText(bytes, 2);
  if (classifyPdfText(text, TEMPLATE.partNumber) === 'wizard') throw new Error(`${file.name} is a Licensing Wizard printout — drop it in step 2.`);
  const { fields } = await readPdfFields(PDFLib, bytes);
  const problem = TEMPLATE.validate(text, fields);
  if (problem) throw new Error(problem);
  state.iq = { name: file.name, bytes, fields };
  state.edits = {};
  $('iq-status').textContent = `✓ ${file.name} — ${TEMPLATE.title}`;
  $('iq-status').className = 'status';
  $('iq-status').hidden = false;
}

async function addSource(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (isPdf(bytes)) {
    const text = await pdfText(bytes);
    const kind = classifyPdfText(text, TEMPLATE.partNumber);
    if (kind === 'iq') {
      if (!state.iq) return loadIq(file);
      throw new Error(`${file.name} is an IQ workbook — it belongs in step 1.`);
    }
    state.sources.push({ name: file.name, pdf: true, text, kind: kind === 'wizard' ? 'wizard' : null });
    return;
  }
  state.sources.push({ name: file.name, pdf: false, text: decodeText(bytes), kind: undefined });
}

function recompute() {
  if (!state.iq) {
    // No workbook yet: still show what each dropped file was recognized as.
    for (const s of state.sources) if (!s.pdf) s.kind = detectText(s.text);
    renderSources();
    $('review').hidden = true;
    return;
  }
  const texts = state.sources.filter(s => !s.pdf);
  const wizards = state.sources.filter(s => s.pdf && s.kind === 'wizard');
  const { rows, warnings, sources } = buildFromInputs({ fields: state.iq.fields, texts: texts.map(s => s.text), wizardTexts: wizards.map(s => s.text) });
  [...texts, ...wizards].forEach((s, i) => { s.kind = sources[i].kind; });
  state.rows = rows;
  renderSources();
  renderWarnings(warnings);
  renderRows();
  $('review').hidden = false;
}

function renderSources() {
  const ul = $('src-list');
  ul.replaceChildren(...state.sources.map((s, i) => {
    const li = document.createElement('li');
    if (!s.kind) li.className = 'unknown';
    const kind = document.createElement('span');
    kind.className = 'kind';
    kind.textContent = s.kind ? KIND_LABEL[s.kind] : 'not recognized';
    const name = document.createElement('span');
    name.textContent = s.name;
    const rm = document.createElement('button');
    rm.type = 'button'; rm.title = 'Remove'; rm.textContent = '×';
    rm.addEventListener('click', () => { state.sources.splice(i, 1); recompute(); });
    li.append(kind, name, rm);
    return li;
  }));
}

function renderWarnings(list) {
  const ul = $('warnings');
  ul.replaceChildren(...list.map(w => { const li = document.createElement('li'); li.textContent = `⚠ ${w}`; return li; }));
  ul.hidden = !list.length;
}

function chip(source) {
  const s = document.createElement('span');
  s.className = `src ${source === 'pdf' ? '' : source === 'typed' ? 'typed' : 'file'}`;
  s.textContent = SOURCE_LABEL[source] || source;
  return s;
}

function renderRows() {
  const groups = new Map();
  for (const r of state.rows) { if (!groups.has(r.group)) groups.set(r.group, []); groups.get(r.group).push(r); }
  const out = [];
  for (const [title, rows] of groups) {
    const g = document.createElement('div'); g.className = 'group';
    const h = document.createElement('h3'); h.textContent = title; g.append(h);
    for (const r of rows) {
      const edited = r.field in state.edits;
      const value = edited ? state.edits[r.field] : r.value;
      const row = document.createElement('div');
      row.className = 'row' + (r.changed && !edited ? ' changed' : '');
      const id = `f-${btoa(unescape(encodeURIComponent(r.field))).replace(/=/g, '')}`;
      const label = document.createElement('label'); label.htmlFor = id; label.textContent = r.label;
      const long = /^Comments|List other activated/.test(r.field);
      const input = document.createElement(long ? 'textarea' : 'input');
      input.id = id; input.value = value;
      let src = chip(edited ? 'typed' : r.source);
      input.addEventListener('input', () => { state.edits[r.field] = input.value; row.classList.remove('changed'); src.replaceWith(src = chip('typed')); });
      row.append(label, input, src);
      if (r.changed && !edited) { const was = document.createElement('div'); was.className = 'was'; was.textContent = `Was “${r.original.trim()}” in your PDF`; row.append(was); }
      if (r.alternatives.length) { const alt = document.createElement('div'); alt.className = 'alt'; alt.textContent = 'Also seen: ' + r.alternatives.map(a => `${Array.isArray(a.value) ? a.value.join(', ') : a.value} (${SOURCE_LABEL[a.source]})`).join(' · '); row.append(alt); }
      if (r.note) { const n = document.createElement('div'); n.className = `note ${r.note.kind}`; n.textContent = r.note.text; row.append(n); }
      g.append(row);
    }
    out.push(g);
  }
  $('groups').replaceChildren(...out);
}

async function handle(files, fn) {
  showError('');
  for (const f of files) {
    try { await fn(f); } catch (e) { showError(e.message || String(e)); }
  }
  recompute();
}

wireDrop($('iq-drop'), $('iq-file'), files => handle(files.slice(0, 1), loadIq));
wireDrop($('src-drop'), $('src-file'), files => handle(files, addSource));

$('download').addEventListener('click', async () => {
  showError('');
  try {
    const { values, stamps } = finalize(state.rows, state.edits);
    const out = await fillPdf(PDFLib, state.iq.bytes, values, stamps);
    const host = state.edits['@host'] ?? state.rows.find(r => r.field === '@host')?.value;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
    a.download = TEMPLATE.downloadName(host, state.iq.name);
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  } catch (e) { showError(`Could not build the PDF: ${e.message || e}`); }
});

$('reset').addEventListener('click', () => {
  state.iq = null; state.sources = []; state.edits = {}; state.rows = [];
  $('iq-status').hidden = true; $('src-list').replaceChildren(); renderWarnings([]); showError(''); $('review').hidden = true;
});
