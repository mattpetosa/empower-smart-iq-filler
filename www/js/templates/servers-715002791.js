// Field map for the Waters "Empower Enterprise or Workgroup Servers -
// Installation Qualification" workbook, part number 715002791 (Rev E).
// Field names are exactly as they appear in the PDF's AcroForm.

const ROLE = n => `Server role or roles application database file server or Waters servicesRow${n}`;
const NEVER = new Set(['Initials', 'Date', 'Name_2', 'Initials_2', 'Date_2', 'Date_3', 'Date_4',
  'Trained and qualified to perform qualification procedures2']);
const REQUIRED = ['DescriptionManufacturer', 'ValueIPV4 address of server', 'Empower version', 'Drive letterRow1', '3_3', ROLE(1)];
const DRIVE_ROWS = 5;               // rows 6-8 sit under the template's printed N/A strike-through
const SERVER_ROWS = [1, 2];         // rows whose host/type fields are filled when their role is filled
const HOST_FIELD = n => `Server host nameRow${n}`;
const TYPE_FIELD = n => `Server type physical virtual or cloudbasedRow${n}`;
const APP_SERVER = 'Application server name';
// Filled from the @host/@type review rows, never shown as rows of their own.
const DERIVED = new Set([...SERVER_ROWS.flatMap(n => [HOST_FIELD(n), TYPE_FIELD(n)]), APP_SERVER]);
const OPTION_FIELDS = {
  base: 'Empower Enterprise or Workgroup base software',
  agilentGc: 'Agilent GC control option',
  agilentLc: 'Agilent LC control option',
  suitability: 'Empower system suitability option',
  sqtSoftware: 'Empower SystemsQT™ for software',
  sqtSystems: 'Empower SystemsQT for systems',
  edm2: 'Empower Enterprise Data Manager 2 option',
};
const OTHER_OPTIONS = 'List other activated options or write None in the following field';
const GROUPS = { 5: 'Form 1–2 · Performer & computer components', 6: 'Form 3 · Documentation', 7: 'Form 4–5 · OS & server configuration',
  8: 'Form 5–6 · Comments & network', 9: 'Form 7 · Licenses & options', 10: 'Form 8 · Verify files & Oracle', 11: 'Form 9 · Backup' };
const LABELS = {
  Name: 'Performer name', 'Trained and qualified to perform qualification procedures': 'Performer title',
  [ROLE(1)]: 'Server 1 role', [ROLE(2)]: 'Server 2 role', [ROLE(3)]: 'Server 3 role', [ROLE(4)]: 'Server 4 role',
  'Installation start dateRow1': 'Server 1 installation start date', 'Installation start dateRow2': 'Server 2 installation start date',
  'Installation start dateRow3': 'Server 3 installation start date', 'Installation start dateRow4': 'Server 4 installation start date',
  Comments: 'Form 2 comments', '1': 'Release Notes part number', '1_2': 'Release Notes revision', 'Yes No or NA 1': 'Release Notes received',
  '2': 'Sys Admin Guide part number', '2_2': 'Sys Admin Guide revision', 'Yes No or NA 2': 'Sys Admin Guide received',
  '3': 'Install Guide part number', '3_2': 'Install Guide revision', 'Yes No or NA 3': 'Install Guide received',
  'Operating system and versionRow1': 'Server 1 OS', 'Operating system and versionRow2': 'Server 2 OS',
  'Operating system and versionRow3': 'Server 3 OS', 'Operating system and versionRow4': 'Server 4 OS',
  DescriptionManufacturer: 'Manufacturer', DescriptionModel: 'Model', DescriptionProcessor: 'Processor', DescriptionRAM: 'RAM',
  'DescriptionDisk storage type': 'Disk storage type', DescriptionOther: 'Other',
  Comments_2: 'Form 5 comments', 'Network information': 'Domain name', 'ValueIPV4 address of server': 'IPv4 address',
  'ValueSubnet mask': 'Subnet mask', ValueGateway: 'Gateway', 'ValueDNS servers': 'DNS servers', Comments_3: 'Form 6 comments',
  undefined_2: 'Server software installed', undefined_3: 'Options and licenses activated',
  'Empower version': 'Empower version', 'Empower installation type': 'Installation type',
  [OPTION_FIELDS.base]: 'Base software', [OPTION_FIELDS.agilentGc]: 'Agilent GC control', [OPTION_FIELDS.agilentLc]: 'Agilent LC control',
  [OPTION_FIELDS.suitability]: 'System suitability', [OPTION_FIELDS.sqtSoftware]: 'SystemsQT for Software',
  [OPTION_FIELDS.sqtSystems]: 'SystemsQT for Systems', [OPTION_FIELDS.edm2]: 'Enterprise Data Manager 2', [OTHER_OPTIONS]: 'Other activated options',
  'Yes No or NA': 'Empower.log included', 'YesNo or NA': 'Certificates root CA password given',
  YesNo: 'Ran Verify Files', '1_4': 'Printed Checksum.txt', '2_4': 'No files missing or changed',
  'In the Summary section at the end of the printout initial either the Pass or Fail line': 'Initialed Pass/Fail',
  'Insert the printout at the end of this IQ workbook after the performer and reviewer': 'Printout inserted',
  'YesNo 1': 'Created/restored test project', 'YesNo 2': 'Batch processing & reports', 'YesNo 3': 'Opened and reviewed data',
  'YesNo 4': 'Backed up a project', 'YesNo 5': 'Deleted test project', 'Yes No or NA_2': 'Database installed',
  '1_3': 'Database version', '2_3': 'Instance name', '3_3': 'Net service name',
  'Yes No or NA 1_2': 'Backup jobs scheduled and verified', 'Yes No or NA 2_2': 'Corporate backup strategy discussed', Comments_4: 'Form 9 comments',
};
for (let n = 1; n <= 8; n++) Object.assign(LABELS, { [`Drive letterRow${n}`]: `Drive ${n} letter`, [`Size GBRow${n}`]: `Drive ${n} size (GB)`, [`DescriptionRow${n}`]: `Drive ${n} description` });
for (let n = 1; n <= 3; n++) Object.assign(LABELS, { [`Backup typeRow${n}`]: `Backup ${n} type`, [`Includes raw data files YesNoRow${n}`]: `Backup ${n} includes raw data`, [`Day and time of backupRow${n}`]: `Backup ${n} day/time`, [`DestinationRow${n}`]: `Backup ${n} destination` });

const norm = v => String(v ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const isNA = v => /^n\/?a$/i.test(String(v ?? '').trim());
const filledRole = v => String(v ?? '').trim() !== '' && !isNA(v);

function driveRole(label) {
  const l = (label || '').toLowerCase();
  if (/^(os|system|windows)$/.test(l)) return 'OS';
  if (/setup|install|media/.test(l)) return null;                  // installation media → comment
  if (/^(programs?|app|application|empower)/.test(l)) return 'Application';
  if (/^(database|db|oracle)/.test(l)) return 'Database';
  if (/^(raw|project)/.test(l)) return 'Raw Data and Projects';
  if (/^(backup|dr)/.test(l)) return 'DR Backups';
  return label || '';
}

const DRIVE_NOTE = /\s*Additional drives?: [A-Z]: \(\d+ GB\) - [^;]*?(?:; [A-Z]: \(\d+ GB\) - [^;]*?)*\.(?=\s|$)/g;

function planDrives(drives) {
  const rows = [], extra = [];
  for (const d of drives) {
    const role = driveRole(d.label);
    if (role === null) { extra.push(`${d.letter} (${d.sizeGB} GB) - Empower Setup (installation media)`); continue; }
    if (rows.length < DRIVE_ROWS) rows.push({ ...d, role });
    else extra.push(`${d.letter} (${d.sizeGB} GB) - ${role || 'unlabeled'}`);
  }
  const note = extra.length ? `Additional drive${extra.length > 1 ? 's' : ''}: ${extra.join('; ')}.` : '';
  return { rows, note };
}

/** Field → proposed { value, source, note? } from merged facts (undefined = no proposal). */
function proposals(facts, pdfValue) {
  const p = {};
  const put = (field, fact, fmt = v => v) => { if (facts[fact]) p[field] = { value: fmt(facts[fact].value), source: facts[fact].source, alternatives: facts[fact].alternatives.map(a => ({ value: fmt(a.value), source: a.source })) }; };
  for (const n of SERVER_ROWS) if (filledRole(pdfValue(ROLE(n)))) { put(`Installation start dateRow${n}`, 'installDate'); put(`Operating system and versionRow${n}`, 'os'); }
  put('DescriptionManufacturer', 'manufacturer'); put('DescriptionModel', 'model');
  put('DescriptionProcessor', 'processor'); put('DescriptionRAM', 'ram'); put('DescriptionOther', 'systemType');
  if (facts.virtual?.value === true) p['DescriptionDisk storage type'] = { value: 'Virtual Disks', source: facts.virtual.source, alternatives: [] };
  put('Network information', 'domain'); put('ValueIPV4 address of server', 'ipv4'); put('ValueSubnet mask', 'subnet');
  put('ValueGateway', 'gateway'); put('ValueDNS servers', 'dns', v => v.join(', '));
  put('Empower version', 'empowerVersion'); put('Empower installation type', 'installType'); put('3_3', 'netServiceName');
  if (facts.drives) {
    const { rows, note } = planDrives(facts.drives.value);
    const src = facts.drives.source;
    for (let n = 1; n <= DRIVE_ROWS; n++) {
      const d = rows[n - 1];
      p[`Drive letterRow${n}`] = { value: d ? d.letter : '', source: src, alternatives: [] };
      p[`Size GBRow${n}`] = { value: d ? String(d.sizeGB) : '', source: src, alternatives: [] };
      p[`DescriptionRow${n}`] = { value: d ? d.role : '', source: src, alternatives: [] };
    }
    // Recompute our own note every time, so a re-filled PDF neither repeats it
    // nor keeps one that no longer matches the drive table.
    const cur = String(pdfValue('Comments_2') ?? '').trim();
    const base = cur.replace(DRIVE_NOTE, '').trim();
    if (note) p.Comments_2 = { value: !base || /^none\.?$/i.test(base) ? note : `${base} ${note}`, source: src, alternatives: [] };
    else if (base !== cur) p.Comments_2 = { value: base || 'None.', source: src, alternatives: [] };
  }
  if (facts.licenses) {
    const { options, others } = facts.licenses.value;
    for (const [k, field] of Object.entries(OPTION_FIELDS)) p[field] = { value: options[k] ? 'Yes' : 'No', source: facts.licenses.source, alternatives: [] };
    p[OTHER_OPTIONS] = { value: others.length ? others.join(', ') : 'None.', source: facts.licenses.source, alternatives: [] };
  }
  if (facts.verify) {
    const v = facts.verify.value;
    p['2_4'] = { value: v.pass ? 'Yes' : 'No', source: 'checksum', alternatives: [],
      note: v.pass ? { kind: 'ok', text: `Checksum: ${v.changed} changed / ${v.missing} missing across ${v.blocks} folders` }
                   : { kind: 'bad', text: `Checksum FAILED: ${v.changed} changed / ${v.missing} missing — investigate before signing` } };
  }
  return p;
}

export const TEMPLATE = {
  partNumber: '715002791',
  title: 'Empower Enterprise or Workgroup Servers IQ (715002791)',

  validate(pdfText, fields) {
    if (!pdfText.includes(this.partNumber)) return `This PDF is not the Servers IQ workbook (part number ${this.partNumber}).`;
    const names = new Set(fields.map(f => f.name));
    const missing = REQUIRED.filter(n => !names.has(n));
    if (missing.length) return `This looks like the ${this.partNumber} workbook but its form fields are missing (${missing.join(', ')}). Use an unflattened copy.`;
    return null;
  },

  buildRows(merged, fields) {
    const text = fields.filter(f => f.type === 'text' && !NEVER.has(f.name) && !DERIVED.has(f.name));
    const pdfValue = name => fields.find(f => f.name === name)?.value ?? '';
    const prop = proposals(merged.facts, pdfValue);
    const rows = [];
    const host = merged.facts.hostname;
    const virt = merged.facts.virtual;
    const firstOf = (...names) => names.map(pdfValue).map(v => String(v).trim()).find(v => v && !isNA(v)) || '';
    const pdfHost = firstOf(HOST_FIELD(1), HOST_FIELD(2), APP_SERVER);
    const pdfType = firstOf(TYPE_FIELD(1), TYPE_FIELD(2));
    const pseudo = (field, label, fact, pdfVal) => {
      const value = fact ? fact.value : pdfVal;
      return { field, page: 5, group: GROUPS[5], label, value, original: pdfVal, source: fact ? fact.source : 'pdf',
        changed: Boolean(fact) && norm(pdfVal) !== '' && norm(pdfVal) !== norm(value), alternatives: fact ? fact.alternatives : [] };
    };
    rows.push(pseudo('@host', 'Server host name (Forms 2–9)', host && { ...host, value: String(host.value) }, pdfHost));
    rows.push(pseudo('@type', 'Server type (Forms 2 and 4)', virt && { value: virt.value ? 'Virtual' : 'Physical', source: virt.source, alternatives: [] }, pdfType));
    for (const f of text) {
      if (/^Installation start dateRow[34]$/.test(f.name) && !filledRole(pdfValue(ROLE(+f.name.slice(-1))))) continue;
      const original = f.value ?? '';
      const pr = prop[f.name];
      const value = pr ? pr.value : original;
      rows.push({
        field: f.name, page: f.page, group: GROUPS[f.page] || `Page ${f.page}`, label: LABELS[f.name] || f.name,
        value, original, source: pr ? pr.source : 'pdf',
        changed: Boolean(pr) && norm(original) !== '' && norm(original) !== norm(value),
        alternatives: pr ? pr.alternatives : [], ...(pr?.note ? { note: pr.note } : {}),
      });
    }
    return { rows, warnings: merged.warnings };
  },

  // Every place the host name / server type appears in this workbook is a form
  // field (Form 2/4 host+type share fields; "Application server name" has a
  // widget on each of Forms 3-9), so nothing needs drawing into page content.
  stampsFor() { return []; },

  writableValues(rows) {
    const out = {};
    for (const r of rows) if (!r.field.startsWith('@') && r.value !== r.original) out[r.field] = r.value;
    const v = Object.fromEntries(rows.map(r => [r.field, r.value]));
    const host = String(v['@host'] ?? '').trim();
    const type = String(v['@type'] ?? '').trim();
    for (const n of SERVER_ROWS) {
      const on = filledRole(v[ROLE(n)]);
      out[HOST_FIELD(n)] = on ? host : '';
      out[TYPE_FIELD(n)] = on ? type : '';
    }
    out[APP_SERVER] = host;
    return out;
  },

  downloadName(host, uploadedName) {
    const safe = s => String(s || '').trim().replace(/[^A-Za-z0-9.-]+/g, '_').replace(/^_+|_+$/g, '');
    if (safe(host)) return `Empower_3.10.0_IQ_for_Servers_${safe(host)}.pdf`;
    return `${safe(String(uploadedName || 'IQ').replace(/\.pdf$/i, '')) || 'IQ'}_filled.pdf`;
  },
};
