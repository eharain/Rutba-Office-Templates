// Rutba Data Files' ready-made databases: the simple templates and the
// sample businesses, their designs, invented records and documentation.
// Office's engine (@rutba/database) builds a database from them.

export { TEMPLATE_IDS, templateTables, templateSpec, templateNeeds } from './simple.js';
export { TEMPLATE_ABOUT } from './simple-about.js';
export { SAMPLE_IDS, sampleSpec, sampleAbout, sampleModule, sampleNeeds, designOfModule, guideOf, GUIDE_TABLE } from './samples/index.js';
export { checkSample } from './samples/check.js';
export { random, calendar } from './samples/util.js';

import { TEMPLATE_ABOUT } from './simple-about.js';
import { sampleAbout } from './samples/index.js';

/**
 * The page about a ready-made database or a sample business on office.rutba.io,
 * which Office links to from its lists and from a database made from it
 * (D-2026-10-22-03). Named as the site names it: its name in lower case, words
 * joined by hyphens (tools/make-samples.mjs slug).
 */
export function pageOf(id) {
  const about = TEMPLATE_ABOUT[id] || sampleAbout(id);
  return `https://office.rutba.io/samples/${about.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}
