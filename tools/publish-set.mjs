// A template set published for Offices to fetch (the owner, 2026-10-21:
// "the templates should have min version check so that the outdate software
// or templates can easily be upgraded to new set").
//
//   node tools/publish-set.mjs --key <private key .pem> [--dry-run] [--out <dir>]
//
// Packs what an Office reads at run time (the manifest, the gallery's list,
// files and pictures, and Data Files' content) into one bundle, and signs a
// short description of it: the set's version, the Office it needs, each
// part's, and the bundle's size and SHA-256. Office fetches the description
// at its update check, verifies the signature with the public key it was
// built with, and only then downloads the bundle and checks its digest. The
// samples are code (each fills its records), so nothing unsigned is used.
//
// Without --dry-run it makes the GitHub release set-<version> on
// eharain/Rutba-Office-Templates with the two files, using this machine's
// git credential for github.com. The key never leaves the machine.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'eharain/Rutba-Office-Templates';
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const dryRun = process.argv.includes('--dry-run');
const keyPath = arg('--key');
const outDir = path.resolve(arg('--out') || path.join(ROOT, 'dist', 'set'));
if (!keyPath) throw new Error('Say which private key signs the set: --key <file>.');

/** What an Office reads at run time; the rest (the makers, the docs, the tools) stays here. */
const SHIPPED = ['manifest.json', 'package.json', 'LICENSE', 'src/index.js', 'src/catalogue.js', 'src/versions.js', 'src/manifest.js', 'files', 'thumbs', 'data-files'];

function walk(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) throw new Error(`${rel} is not in the set.`);
  if (fs.statSync(abs).isFile()) return [rel];
  return fs.readdirSync(abs).sort().flatMap((n) => walk(path.posix.join(rel.replace(/\\/g, '/'), n)));
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const files = {};
for (const rel of SHIPPED.flatMap(walk)) files[rel] = fs.readFileSync(path.join(ROOT, rel)).toString('base64');
const bundleText = JSON.stringify({ set: manifest.set, files });
const bundleName = `templates-${manifest.set}.bundle.json`;
const digest = crypto.createHash('sha256').update(bundleText).digest('hex');

// The description, signed as the exact text it is.
const description = JSON.stringify({
  set: manifest.set,
  minOffice: manifest.minOffice,
  parts: manifest.parts,
  bundle: { name: bundleName, size: Buffer.byteLength(bundleText), sha256: digest, files: Object.keys(files).length },
  signedAt: new Date().toISOString(),
});
const key = crypto.createPrivateKey(fs.readFileSync(keyPath));
const signature = crypto.sign(null, Buffer.from(description), key).toString('base64');
const signed = JSON.stringify({ description, signature }, null, 2);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, bundleName), bundleText);
fs.writeFileSync(path.join(outDir, 'templates-set.json'), signed);
console.log(`set ${manifest.set}: ${Object.keys(files).length} files, ${Math.round(Buffer.byteLength(bundleText) / 1024)} KB, sha256 ${digest.slice(0, 12)}..., signed`);
console.log(`written to ${outDir}`);
if (dryRun) process.exit(0);

// The release, through the API.
const token = execFileSync('git', ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n', env: { ...process.env, GCM_INTERACTIVE: 'never', GIT_TERMINAL_PROMPT: '0' } }).toString().match(/^password=(.*)$/m)?.[1];
if (!token) throw new Error('No GitHub credential on this machine for github.com.');
const api = async (url, init = {}) => {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'rutba-templates-publish', ...(init.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${url}: ${res.status} ${body.message || ''}`);
  return body;
};
const tag = `set-${manifest.set}`;
const release = await api(`https://api.github.com/repos/${REPO}/releases`, {
  method: 'POST',
  body: JSON.stringify({ tag_name: tag, name: `Templates ${manifest.set}`, body: `Rutba Office templates ${manifest.set}. Needs Rutba Office ${manifest.minOffice} or newer${Object.entries(manifest.parts || {}).map(([k, p]) => `; ${k} ${p.minOffice}`).join('')}.`, draft: false, prerelease: false }),
});
for (const [name, type] of [[bundleName, 'application/json'], ['templates-set.json', 'application/json']]) {
  const upload = release.upload_url.replace(/\{.*$/, `?name=${encodeURIComponent(name)}`);
  await api(upload, { method: 'POST', headers: { 'Content-Type': type }, body: fs.readFileSync(path.join(outDir, name)) });
  console.log(`uploaded ${name}`);
}
console.log(release.html_url);
