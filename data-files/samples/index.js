// Data Files' sample businesses: a whole working database for each kind of
// business Office is made for, to learn from with its records or to start
// from empty. This is their content: each sample's design (tables, queries,
// forms, reports, print templates), its invented records (`fill`) and its
// documentation (`about`). Office's engine builds a database from them
// (@rutba/database buildSample), through the same calls a person's own
// design goes through.

import * as trading from './trading.js';
import * as shop from './shop.js';
import * as clinic from './clinic.js';
import * as salon from './salon.js';
import * as repairs from './repairs.js';
import * as agency from './agency.js';
import * as cafe from './cafe.js';
import * as rentals from './rentals.js';
import * as school from './school.js';
import * as charity from './charity.js';
import * as workshop from './workshop.js';

const SAMPLES = { trading, shop, clinic, salon, repairs, agency, cafe, rentals, school, charity, workshop };

/** The samples, in the order a window offers them. */
export const SAMPLE_IDS = Object.keys(SAMPLES);

/** A sample's module: { spec, fill, about } for the engine to build from. */
export function sampleModule(id) {
  const s = SAMPLES[id];
  if (!s) throw new Error(`There is no sample database called ${id}.`);
  return s;
}

/** The oldest Office a sample needs (its module's `minOffice`), or null when any Office that has samples can make it. */
export const sampleNeeds = (id) => sampleModule(id).minOffice || null;

/** A sample's documentation: what the business is, each table, field, query and report in words. */
export function sampleAbout(id) {
  const s = sampleModule(id);
  // A summary written as one string holds its paragraphs between blank lines.
  const summary = Array.isArray(s.about.summary) ? s.about.summary : String(s.about.summary).split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return { ...s.about, summary };
}

/** A sample module's design, as the engine's buildFromSpec takes it. */
export const designOfModule = (s) => s.spec;

/** A sample's design, as buildFromSpec takes it. */
export const sampleSpec = (id) => designOfModule(sampleModule(id));

/** The Start Here records a sample module brings: none in this set yet. */
export const guideOf = () => [];

/** The guide's table, when a sample has one. */
export const GUIDE_TABLE = 'Start Here';
