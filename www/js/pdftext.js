// pdf.js text extraction (browser only). Lines are rebuilt with the License
// Cleaner's itemsToLines so Wizard PDFs read exactly as ESLC reads them.
let lib;
async function pdfjs() {
  if (!lib) {
    lib = await import('../vendor/pdfjs/pdf.min.js');
    lib.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.js', import.meta.url).href;
  }
  return lib;
}

export async function pdfText(bytes, maxPages = Infinity) {
  const { getDocument } = await pdfjs();
  // pdf.js 6 dropped PDFDocumentProxy.destroy(); the loading task owns cleanup.
  const task = getDocument({ data: bytes.slice(), isEvalSupported: false });
  const lines = [];
  try {
    const doc = await task.promise;
    for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
      const page = await doc.getPage(p);
      lines.push(...globalThis.ESLC.itemsToLines((await page.getTextContent()).items));
    }
  } finally { await task.destroy(); }
  return lines.join('\n');
}
