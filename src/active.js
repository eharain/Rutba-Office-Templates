// The gallery in use: this package's own, or a newer signed set Office
// downloaded (apps/desktop/main/template-sets.js), named by the folder in
// RUTBA_TEMPLATES_DIR, which Office sets before anything reads templates.
// The same names as ./index.js, from whichever set it is.

import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = process.env.RUTBA_TEMPLATES_DIR || null;
const gallery = dir ? await import(pathToFileURL(path.join(dir, 'src', 'index.js')).href) : await import('./index.js');

export const { TEMPLATES, CATEGORIES, templateById, templateForLegacy, templatesOf, templatePath, thumbPath, readTemplate, FILES_DIR, THUMBS_DIR } = gallery;
/** The folder of the set in use, or null for this package's own. */
export const ACTIVE_DIR = dir;
