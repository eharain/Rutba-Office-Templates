// Rutba Data Files' ready-made databases: the simple templates and the
// sample businesses, their designs, invented records and documentation.
// Office's engine (@rutba/database) builds a database from them.

export { TEMPLATE_IDS, templateTables, templateSpec, templateNeeds } from './simple.js';
export { SAMPLE_IDS, sampleSpec, sampleAbout, sampleModule, sampleNeeds, designOfModule, guideOf, GUIDE_TABLE } from './samples/index.js';
export { checkSample } from './samples/check.js';
export { random, calendar } from './samples/util.js';
