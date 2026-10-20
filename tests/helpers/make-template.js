import fs from 'node:fs';
const FIELDS = JSON.parse(fs.readFileSync(new URL('./fields-715002791.json', import.meta.url), 'utf8'));
export { FIELDS };

/** A synthetic stand-in for the Waters template: same field names, pages and rects. */
export async function makeTemplate(PDFLib, { values = {}, partNumber = '715002791' } = {}) {
  const { PDFDocument, StandardFonts } = PDFLib;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 16; i++) doc.addPage([612, 792]);
  doc.getPage(0).drawText(`Workbook Part Number: ${partNumber} Revision E`, { x: 72, y: 600, size: 12, font });
  const form = doc.getForm();
  for (const f of FIELDS) {
    if (f.type !== 'text') continue;
    const tf = form.createTextField(f.name);
    if (f.multiline) tf.enableMultiline();
    tf.addToPage(doc.getPage(f.page - 1), { x: f.rect[0], y: f.rect[1], width: f.rect[2], height: f.rect[3], font });
    if (values[f.name] != null) tf.setText(values[f.name]);
  }
  return doc.save();
}
