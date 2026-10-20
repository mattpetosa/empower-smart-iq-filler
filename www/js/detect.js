/** Bytes → text. msinfo32 .nfo files are UTF-16LE with a BOM. */
export function decodeText(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  const start = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  return new TextDecoder('utf-8').decode(bytes.subarray(start));
}

export function isPdf(bytes) {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
  return head.includes('%PDF-');
}

/** Which parser understands this text, judged by content (never by filename). */
export function detectText(text) {
  if (text.includes('<MsInfo>') || /System Information report written at/.test(text)) return 'msinfo';
  if (text.includes('Windows IP Configuration')) return 'ipconfig';
  if (/Waters File Verification|Waters Installation Qualification - Summary|Option Properly Installed/.test(text)) return 'checksum';
  if (/Empower Deployment Manager|\*{3,} Machine Name:/.test(text)) return 'empowerlog';
  // listener.ora has the same syntax; its SID_LIST / DESCRIPTION_LIST give it away.
  if (/\(\s*DESCRIPTION\s*=/i.test(text) && /HOST\s*=/i.test(text) && !/SID_LIST|DESCRIPTION_LIST/i.test(text)) return 'tnsnames';
  return null;
}

/** A dropped PDF is either the IQ workbook or a Licensing Wizard printout. */
export function classifyPdfText(text, partNumber) {
  if (text.includes(partNumber)) return 'iq';
  if (text.includes('Serial No:')) return 'wizard';
  return null;
}
