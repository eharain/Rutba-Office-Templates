// Data Files' sample databases (data-files/samples): the list itself. Each
// sample's own checks are in samples-checks.js, run in seven parts
// (samples-<part>.test.js, the parts in samples-parts.js: five of samples, two of the weeks) so they run side
// by side; here, the order, that every sample is in exactly one part and
// every part has its test file, and what a sample refuses.
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Base, buildSample } from '@rutba/database';
import { SAMPLE_IDS } from '../data-files/index.js';
import { ORDER, PARTS, WEEK, WEEK_PARTS } from './samples-parts.js';

test('twenty-five samples, a business of each kind Office is made for, in the start screen\'s order', () => {
  assert.deepEqual(SAMPLE_IDS, ORDER);
});

test('every sample is checked in exactly one part, and each part has its test file', () => {
  assert.deepEqual(Object.values(PARTS).flat(), ORDER, 'the parts, one after another, are the list');
  for (const id of WEEK) assert.ok(ORDER.includes(id), `${id} is a sample`);
  assert.deepEqual(Object.values(WEEK_PARTS).flat().sort(), WEEK.slice().sort(), 'each week is in exactly one week part');
  const parts = [...Object.keys(PARTS), ...Object.keys(WEEK_PARTS)];
  const files = fs.readdirSync(new URL('.', import.meta.url)).filter((n) => /^samples-.*\.test\.js$/.test(n)).sort();
  assert.deepEqual(files, parts.map((p) => `samples-${p}.test.js`).sort());
  for (const p of parts) {
    assert.ok(fs.readFileSync(new URL(`samples-${p}.test.js`, import.meta.url), 'utf8').includes(`samplePart('${p}')`), `samples-${p}.test.js runs the part ${p}`);
  }
});

test('a sample is made only in an empty database, and an unknown one is refused', () => {
  const b = Base.open(':memory:');
  try {
    assert.throws(() => buildSample(b, 'nursery'), /no sample database called nursery/);
    buildSample(b, 'shop', { withData: false });
    assert.throws(() => buildSample(b, 'shop'), /empty database/);
  } finally {
    b.close();
  }
});
