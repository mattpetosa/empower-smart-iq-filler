import { detectText } from '../detect.js';
import { parseIpconfig } from './ipconfig.js';
import { parseMsinfo } from './msinfo.js';
import { parseEmpowerLog } from './empowerlog.js';
import { parseChecksum } from './checksum.js';
import { parseTnsnames } from './tnsnames.js';

export function parseText(text, { hostname } = {}) {
  switch (detectText(text)) {
    case 'ipconfig': return parseIpconfig(text);
    case 'msinfo': return parseMsinfo(text);
    case 'empowerlog': return parseEmpowerLog(text);
    case 'checksum': return parseChecksum(text);
    case 'tnsnames': return parseTnsnames(text, hostname);
    default: return null;
  }
}
