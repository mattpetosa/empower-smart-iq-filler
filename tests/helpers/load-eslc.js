// core.js is a classic script that sets globalThis.ESLC when there is no
// CommonJS `module` (true under "type": "module"). Importing it for its side
// effect gives tests the same global the browser gets from <script src>.
import '../../www/vendor/eslc/core.js';
export const ESLC = globalThis.ESLC;
