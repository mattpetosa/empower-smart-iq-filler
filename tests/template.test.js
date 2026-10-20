import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATE } from '../www/js/templates/servers-715002791.js';
import { FIELDS } from './helpers/make-template.js';

// PDF fields as readPdfFields returns them, with optional pre-filled values.
const pdf = (values = {}) => FIELDS.map(f => ({ ...f, value: values[f.name] ?? '' }));
const F = (value, source = 'msinfo', alternatives = []) => ({ value, source, alternatives });
const PREFILL = {
  'Server role or roles application database file server or Waters servicesRow1': 'Database',
  'Server role or roles application database file server or Waters servicesRow2': 'Application',
  'Server role or roles application database file server or Waters servicesRow4': 'N/A ',
  'Operating system and versionRow1': 'Microsoft Windows Server 2025 Standard',
  'DescriptionDisk storage type': 'Raid',
  'Drive letterRow1': 'C:', DescriptionRow1: 'OS', 'Drive letterRow2': 'D:', DescriptionRow2: 'Application',
  'Drive letterRow3': 'E:', DescriptionRow3: 'Database', 'Drive letterRow4': 'F:', DescriptionRow4: 'Raw Data and Projects',
  DescriptionRow8: 'N/A ', Comments_2: 'None.', 'Empower SystemsQT™ for software': 'Yes', '2_4': 'Yes', Name: 'Pat Performer',
};
const merged = {
  facts: {
    hostname: F('LABSVR01', 'ipconfig'), domain: F('example.com', 'ipconfig'), ipv4: F('10.0.0.11', 'ipconfig'),
    subnet: F('255.255.255.0', 'ipconfig'), gateway: F('10.0.0.1', 'ipconfig'), dns: F(['10.0.2.11', '10.0.2.12'], 'ipconfig'),
    os: F('Microsoft Windows Server 2022 Standard'), manufacturer: F('VMware, Inc.'), model: F('VMware7,1'),
    systemType: F('x64-based PC'), processor: F('2 x Xeon (4 cores each)'), ram: F('24 GB'), virtual: F(true),
    drives: F([
      { letter: 'C:', sizeGB: 150, label: 'OS' }, { letter: 'E:', sizeGB: 500, label: 'Programs' },
      { letter: 'F:', sizeGB: 500, label: 'Database' }, { letter: 'G:', sizeGB: 500, label: 'RawData' },
      { letter: 'H:', sizeGB: 600, label: 'Backup' }, { letter: 'I:', sizeGB: 30, label: 'EmpowerSetup' },
    ]),
    installDate: F('10/14/2026', 'empowerlog'), empowerVersion: F('3.10.0.1', 'checksum'), installType: F('Enterprise', 'checksum'),
    verify: F({ pass: true, changed: 0, missing: 0, blocks: 46 }, 'checksum'), netServiceName: F('WAT19', 'tnsnames'),
  },
  warnings: [],
};
const rowsOf = (m = merged, values = PREFILL) => Object.fromEntries(TEMPLATE.buildRows(m, pdf(values)).rows.map(r => [r.field, r]));

test('validate accepts the workbook and rejects other PDFs', () => {
  assert.equal(TEMPLATE.validate('Workbook Part Number: 715002791 Revision E', pdf()), null);
  assert.match(TEMPLATE.validate('Some other workbook', pdf()), /715002791/);
  assert.match(TEMPLATE.validate('715002791', pdf().slice(0, 10)), /form fields/);
});

test('network, hardware, version and dates fill from facts', () => {
  const R = rowsOf();
  assert.equal(R['Network information'].value, 'example.com');
  assert.equal(R['ValueDNS servers'].value, '10.0.2.11, 10.0.2.12');
  assert.equal(R['DescriptionManufacturer'].value, 'VMware, Inc.');
  assert.equal(R['DescriptionDisk storage type'].value, 'Virtual Disks');
  assert.equal(R['Empower version'].value, '3.10.0.1');
  assert.equal(R['Installation start dateRow1'].value, '10/14/2026');
  assert.equal(R['Installation start dateRow2'].value, '10/14/2026');
  assert.equal(R['Installation start dateRow4'], undefined, 'N/A role row gets no date');
  assert.equal(R['3_3'].value, 'WAT19');
});

test('a fact that contradicts the pre-filled PDF is flagged as changed', () => {
  const os = rowsOf()['Operating system and versionRow1'];
  assert.equal(os.value, 'Microsoft Windows Server 2022 Standard');
  assert.equal(os.original, 'Microsoft Windows Server 2025 Standard');
  assert.equal(os.changed, true);
  assert.equal(os.source, 'msinfo');
});

test('fields with no fact keep the PDF value with source "pdf"', () => {
  const R = rowsOf();
  assert.equal(R['Empower SystemsQT™ for software'].value, 'Yes');
  assert.equal(R['Empower SystemsQT™ for software'].source, 'pdf');
  assert.equal(R['Name'].value, 'Pat Performer');
});

test('never-fill fields are not offered for review', () => {
  const R = rowsOf();
  for (const f of ['Initials', 'Date', 'Name_2', 'Date_3', 'Date_4', 'Trained and qualified to perform qualification procedures2']) assert.equal(R[f], undefined, f);
});

test('drives map labels to roles; install media goes to the comment', () => {
  const R = rowsOf();
  const row = n => [R[`Drive letterRow${n}`].value, R[`Size GBRow${n}`].value, R[`DescriptionRow${n}`].value];
  assert.deepEqual(row(1), ['C:', '150', 'OS']);
  assert.deepEqual(row(2), ['E:', '500', 'Application']);
  assert.deepEqual(row(3), ['F:', '500', 'Database']);
  assert.deepEqual(row(4), ['G:', '500', 'Raw Data and Projects']);
  assert.deepEqual(row(5), ['H:', '600', 'DR Backups']);
  assert.equal(R.Comments_2.value, 'Additional drive: I: (30 GB) - Empower Setup (installation media).');
  assert.equal(R.DescriptionRow8.value, 'N/A ', 'struck rows untouched');
});

test('stale drive rows are cleared', () => {
  const two = { ...merged, facts: { ...merged.facts, drives: F([{ letter: 'C:', sizeGB: 100, label: 'OS' }, { letter: 'D:', sizeGB: 200, label: 'Data' }]) } };
  const R = rowsOf(two);
  assert.deepEqual([R['Drive letterRow3'].value, R['DescriptionRow3'].value, R['Drive letterRow4'].value], ['', '', '']);
  assert.equal(R['DescriptionRow2'].value, 'Data', 'unknown labels kept verbatim');
  assert.equal(R.Comments_2.value, 'None.', 'no extra drives → comment untouched');
});

test('more fixed drives than usable rows overflow into the comment', () => {
  const many = 'CDEFGHJ'.split('').map(l => ({ letter: `${l}:`, sizeGB: 10, label: 'Data' }));
  const R = rowsOf({ ...merged, facts: { ...merged.facts, drives: F(many) } });
  assert.match(R.Comments_2.value, /Additional drives: H: \(10 GB\) - Data; J: \(10 GB\) - Data\./);
});

test('existing comment text is kept and the drive note appended', () => {
  const R = rowsOf(merged, { ...PREFILL, Comments_2: 'Server patched to Oct CU.' });
  assert.equal(R.Comments_2.value, 'Server patched to Oct CU. Additional drive: I: (30 GB) - Empower Setup (installation media).');
});

test('option rows only change when a license source exists', () => {
  assert.equal(rowsOf()['Agilent GC control option'].source, 'pdf');
  const lic = F({ origin: 'wizard', count: 5, options: { base: true, agilentGc: true, agilentLc: false, suitability: true, sqtSoftware: false, sqtSystems: false, edm2: false }, others: ['Empower 3 GPC Option'] }, 'wizard');
  const R = rowsOf({ ...merged, facts: { ...merged.facts, licenses: lic } });
  assert.equal(R['Empower Enterprise or Workgroup base software'].value, 'Yes');
  assert.equal(R['Agilent GC control option'].value, 'Yes');
  assert.equal(R['Empower SystemsQT™ for software'].value, 'No');
  assert.equal(R['Empower SystemsQT™ for software'].changed, true);
  assert.equal(R['List other activated options or write None in the following field'].value, 'Empower 3 GPC Option');
});

test('checksum verify answers the "no files missing or changed" row', () => {
  assert.deepEqual([rowsOf()['2_4'].value, rowsOf()['2_4'].note.kind], ['Yes', 'ok']);
  const bad = { ...merged, facts: { ...merged.facts, verify: F({ pass: false, changed: 1, missing: 0, blocks: 46 }, 'checksum') } };
  const R = rowsOf(bad);
  assert.equal(R['2_4'].value, 'No');
  assert.equal(R['2_4'].note.kind, 'bad');
});

test('pseudo rows carry host and server type; nothing is stamped because every place has a field', () => {
  const R = rowsOf();
  assert.equal(R['@host'].value, 'LABSVR01');
  assert.equal(R['@type'].value, 'Virtual');
  const values = Object.fromEntries(Object.values(R).map(r => [r.field, r.value]));
  assert.deepEqual(TEMPLATE.stampsFor(values), []);
});

test('host and type fill the shared Form 2/4 and Forms 3-9 fields for filled role rows and are not separate review rows', () => {
  const R = rowsOf();
  for (const f of ['Server host nameRow1', 'Server host nameRow2', 'Server type physical virtual or cloudbasedRow1', 'Application server name']) assert.equal(R[f], undefined, f);
  assert.ok(R['Server host nameRow3'], 'rows without a derived value stay reviewable');
  const { rows } = TEMPLATE.buildRows(merged, pdf(PREFILL));
  const w = TEMPLATE.writableValues(rows);
  assert.equal(w['Server host nameRow1'], 'LABSVR01');
  assert.equal(w['Server host nameRow2'], 'LABSVR01');
  assert.equal(w['Server type physical virtual or cloudbasedRow1'], 'Virtual');
  assert.equal(w['Application server name'], 'LABSVR01');
  const noRole2 = rows.map(r => r.field === 'Server role or roles application database file server or Waters servicesRow2' ? { ...r, value: '' } : r);
  assert.equal(TEMPLATE.writableValues(noRole2)['Server host nameRow2'], '', 'emptied role row clears its host');
});

test('physical server type; blank host writes nothing', () => {
  const R = rowsOf({ facts: { virtual: F(false) }, warnings: [] }, PREFILL);
  assert.equal(R['@type'].value, 'Physical');
  assert.equal(R['@host'].value, '');
});

test('writableValues returns only changed real fields', () => {
  const { rows } = TEMPLATE.buildRows(merged, pdf(PREFILL));
  const w = TEMPLATE.writableValues(rows);
  assert.equal(w['DescriptionRAM'], '24 GB');
  assert.ok(!('Name' in w));
  assert.ok(!('@host' in w));
});

test('downloadName uses a sanitized host, falls back to the upload name', () => {
  assert.equal(TEMPLATE.downloadName('LABSVR01', 'x.pdf'), 'Empower_3.10.0_IQ_for_Servers_LABSVR01.pdf');
  assert.equal(TEMPLATE.downloadName('bad/name ', 'x.pdf'), 'Empower_3.10.0_IQ_for_Servers_bad_name.pdf');
  assert.equal(TEMPLATE.downloadName('', 'My IQ.pdf'), 'My_IQ_filled.pdf');
});

test('without facts, host and type fall back to what the PDF already has', () => {
  const values = { ...PREFILL, 'Server host nameRow1': 'OLDHOST', 'Server type physical virtual or cloudbasedRow1': 'Physical', 'Application server name': 'OLDHOST' };
  const { rows } = TEMPLATE.buildRows({ facts: {}, warnings: [] }, pdf(values));
  const R = Object.fromEntries(rows.map(r => [r.field, r]));
  assert.deepEqual([R['@host'].value, R['@host'].source], ['OLDHOST', 'pdf']);
  assert.deepEqual([R['@type'].value, R['@type'].source], ['Physical', 'pdf']);
  assert.equal(TEMPLATE.writableValues(rows)['Server host nameRow1'], 'OLDHOST');
});

test('a hostname fact replacing a different pre-filled host is flagged as changed', () => {
  const R = rowsOf(merged, { ...PREFILL, 'Server host nameRow1': 'OLDHOST' });
  assert.deepEqual([R['@host'].value, R['@host'].original, R['@host'].changed], ['LABSVR01', 'OLDHOST', true]);
});

test('re-filling an already-filled PDF does not repeat the drive note', () => {
  const once = rowsOf().Comments_2.value;
  const R = rowsOf(merged, { ...PREFILL, Comments_2: once });
  assert.equal(R.Comments_2.value, once);
  assert.equal(R.Comments_2.changed, false);
  const kept = rowsOf(merged, { ...PREFILL, Comments_2: `Server patched. ${once}` });
  assert.equal(kept.Comments_2.value, `Server patched. ${once}`);
});

test('a stale drive note is removed when the server has no extra drives', () => {
  const two = { ...merged, facts: { ...merged.facts, drives: F([{ letter: 'C:', sizeGB: 100, label: 'OS' }]) } };
  const note = 'Additional drives: X: (1 GB) - Data; Y: (2 GB) - Data.';
  assert.equal(rowsOf(two, { ...PREFILL, Comments_2: `Server patched. ${note}` }).Comments_2.value, 'Server patched.');
  assert.equal(rowsOf(two, { ...PREFILL, Comments_2: note }).Comments_2.value, 'None.');
});
