// msinfo32 export: .nfo (XML; nested <Category name=...>, rows are
// <Data><Item/><Value/></Data>) or .txt ([Section] headers, Item<TAB>Value rows).
// Both are reduced to Map<sectionName, [item, value][]>.
const VIRTUAL = /vmware|virtual machine|virtualbox|innotek|qemu|kvm|xen|parallels|amazon ec2|google compute/i;

function nfoSections(text) {
  const sections = new Map(), stack = [];
  const re = /<Category name="([^"]*)">|<\/Category>|<Data>\s*<Item><!\[CDATA\[([\s\S]*?)\]\]><\/Item>\s*<Value><!\[CDATA\[([\s\S]*?)\]\]><\/Value>\s*<\/Data>/g;
  for (const m of text.matchAll(re)) {
    if (m[1] !== undefined) { stack.push(m[1]); if (!sections.has(m[1])) sections.set(m[1], []); }
    else if (m[0] === '</Category>') stack.pop();
    else if (stack.length) sections.get(stack[stack.length - 1]).push([m[2], m[3]]);
  }
  return sections;
}

function txtSections(text) {
  const sections = new Map();
  let cur = null;
  for (const line of text.split(/\r\n|\r|\n/)) {
    const h = /^\[(.+)\]\s*$/.exec(line);
    if (h) { cur = []; sections.set(h[1], cur); continue; }
    if (!cur || !line.includes('\t')) continue;
    const [item, value = ''] = line.split('\t');
    if (item === 'Item' && value === 'Value') continue;
    cur.push([item, value]);
  }
  return sections;
}

function sizeGB(s) {
  const m = /([\d.,]+)\s*(TB|GB|MB)/i.exec(s || '');
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ''));
  const unit = m[2].toUpperCase();
  return Math.round(unit === 'TB' ? n * 1024 : unit === 'MB' ? n / 1024 : n);
}

function processorText(lines) {
  if (!lines.length) return undefined;
  const name = lines[0].split(',')[0].trim();
  const cores = /(\d+)\s*Core\(s\)/i.exec(lines[0])?.[1];
  if (lines.length > 1) return `${lines.length} x ${name}${cores ? ` (${cores} cores each)` : ''}`;
  return `${name}${cores ? ` (${cores} cores)` : ''}`;
}

export function parseMsinfo(text) {
  const sections = text.includes('<MsInfo>') ? nfoSections(text) : txtSections(text);
  const summary = sections.get('System Summary') || [];
  const one = item => summary.find(([k]) => k === item)?.[1]?.trim() || undefined;
  const facts = {};
  const set = (k, v) => { if (v) facts[k] = v; };
  set('hostname', one('System Name'));
  set('os', one('OS Name'));
  set('manufacturer', one('System Manufacturer'));
  set('model', one('System Model'));
  set('systemType', one('System Type'));
  set('processor', processorText(summary.filter(([k]) => k === 'Processor').map(([, v]) => v)));
  const ram = one('Installed Physical Memory (RAM)');
  if (ram) set('ram', ram.replace(/(\d+)\.0+\s*/, '$1 '));
  if (facts.manufacturer || facts.model) facts.virtual = VIRTUAL.test(`${facts.manufacturer || ''} ${facts.model || ''}`);

  const drives = [];
  let d = null;
  for (const [item, value] of sections.get('Drives') || []) {
    if (item === 'Drive') { d = { letter: value.trim(), description: '', size: '', label: '' }; drives.push(d); continue; }
    if (!d) continue;
    if (item === 'Description') d.description = value.trim();
    else if (item === 'Size') d.size = value;
    else if (item === 'Volume Name') d.label = value.trim();
  }
  const fixed = drives
    .filter(x => /fixed/i.test(x.description) && sizeGB(x.size) !== null)
    .map(x => ({ letter: x.letter, sizeGB: sizeGB(x.size), label: x.label }))
    .sort((a, b) => a.letter.localeCompare(b.letter));
  if (fixed.length) facts.drives = fixed;

  const warnings = Object.keys(facts).length ? [] : ['MSInfo: no System Summary or Drives section found.'];
  return { kind: 'msinfo', facts, warnings };
}
