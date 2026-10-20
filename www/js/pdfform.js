// pdf-lib is passed in (PDFLib namespace) so the same module runs in the
// browser (vendor/pdf-lib.esm.min.js) and in Node tests (npm 'pdf-lib').

/** Read every AcroForm field: name, kind, 1-based page, rect, current value. */
export async function readPdfFields(PDFLib, bytes) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const pageOf = new Map();
  doc.getPages().forEach((page, i) => {
    const annots = page.node.Annots();
    if (!annots) return;
    for (let k = 0; k < annots.size(); k++) pageOf.set(String(annots.get(k)), i + 1);
  });
  const fields = [];
  for (const f of doc.getForm().getFields()) {
    const widget = f.acroField.getWidgets()[0];
    const ref = widget ? doc.context.getObjectRef(widget.dict) : undefined;
    const r = widget ? widget.getRectangle() : { x: 0, y: 0, width: 0, height: 0 };
    const isText = f instanceof PDFLib.PDFTextField;
    fields.push({
      name: f.getName(),
      type: isText ? 'text' : 'other',
      page: ref ? (pageOf.get(String(ref)) ?? null) : null,
      rect: [r.x, r.y, r.width, r.height],
      value: isText ? (f.getText() ?? '') : '',
      multiline: isText ? f.isMultiline() : false,
    });
  }
  return { doc, fields };
}

/**
 * Write `values` into the matching text fields and draw `stamps` into page
 * content. Only written fields get a regenerated appearance: untouched fields
 * keep the look the template author's PDF editor gave them. The Waters
 * template's fields carry no /DA, which pdf-lib needs before it can size text,
 * so one is added to each field we write.
 */
// 10 pt unless that overruns a single-line box (e.g. the OS column on Form 4).
function fitSize(font, text, widgets) {
  // A field can have a widget on several pages; size for the narrowest one.
  const room = Math.min(...widgets.map(w => w.getRectangle().width)) - 4;
  const w = font.widthOfTextAtSize(text, 10);
  return w <= room ? 10 : Math.max(5, Math.floor((10 * room / w) * 4) / 4);
}

export async function fillPdf(PDFLib, bytes, values, stamps) {
  const { PDFDocument, StandardFonts, PDFName, PDFTextField } = PDFLib;
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const byName = new Map(form.getFields().map(f => [f.getName(), f]));
  const charset = new Set(font.getCharacterSet());
  for (const [name, value] of Object.entries(values)) {
    const f = byName.get(name);
    if (!(f instanceof PDFTextField)) continue;
    const text = String(value ?? '').replace(/\t/g, ' ');
    const bad = [...text].find(ch => ch !== '\n' && ch !== '\r' && !charset.has(ch.codePointAt(0)));
    if (bad) throw new Error(`"${name}" contains “${bad}”, which the PDF's font cannot show. Edit that value and try again.`);
    f.setText(text);
    if (!f.acroField.getDefaultAppearance()) f.acroField.setDefaultAppearance('/Helv 0 Tf 0 g');
    f.setFontSize(f.isMultiline() ? 10 : fitSize(font, text, f.acroField.getWidgets()));
    f.defaultUpdateAppearances(font);
  }
  form.acroForm.dict.delete(PDFName.of('NeedAppearances'));
  for (const s of stamps) doc.getPage(s.page - 1).drawText(s.text, { x: s.x, y: s.y, size: 9, font });
  return doc.save({ updateFieldAppearances: false });
}
