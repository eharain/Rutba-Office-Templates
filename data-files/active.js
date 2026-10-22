// Data Files' ready-made databases in use: this package's own, or those of
// a newer signed set Office downloaded, named by RUTBA_TEMPLATES_DIR (see
// src/active.js). The same names as ./index.js, from whichever set it is.

import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = process.env.RUTBA_TEMPLATES_DIR || null;
const content = dir ? await import(pathToFileURL(path.join(dir, 'data-files', 'index.js')).href) : await import('./index.js');

export const {
  TEMPLATE_IDS, templateTables, templateSpec, templateNeeds,
  SAMPLE_IDS, sampleSpec, sampleAbout, sampleModule, sampleNeeds, designOfModule, guideOf, GUIDE_TABLE,
  checkSample, random, calendar,
} = content;
