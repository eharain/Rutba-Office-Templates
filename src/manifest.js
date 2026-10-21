// The set's manifest (manifest.json at the repository's root): the set's own
// version, the oldest Office the set needs, and each part's.

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const MANIFEST_PATH = fileURLToPath(new URL('../manifest.json', import.meta.url));

/** The manifest of the set at `path` (this one by default). */
export function readManifest(path = MANIFEST_PATH) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}
