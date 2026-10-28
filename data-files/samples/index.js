// Rutba Office Sample Databases Licence, not the AGPL: see LICENSE in this folder.
//
// Data Files' sample businesses: a whole working database for each kind of
// business Office is made for, to learn from with its records or to start
// from empty. This is their content: each sample's design (tables, queries,
// forms, reports, print templates), its invented records (`fill`), its
// documentation (`about`) and the Start Here guide made from it. Office's
// engine builds a database from them (@rutba/database buildSample), through
// the same calls a person's own design goes through.

import * as shop from './shop.js';
import * as food from './food.js';
import * as cafe from './cafe.js';
import * as takeaway from './takeaway.js';
import * as florist from './florist.js';
import * as pharmacy from './pharmacy.js';
import * as trading from './trading.js';
import * as workshop from './workshop.js';
import * as builder from './builder.js';
import * as cars from './cars.js';
import * as salon from './salon.js';
import * as barber from './barber.js';
import * as repairs from './repairs.js';
import * as garage from './garage.js';
import * as cleaning from './cleaning.js';
import * as agency from './agency.js';
import * as gym from './gym.js';
import * as clinic from './clinic.js';
import * as school from './school.js';
import * as charity from './charity.js';
import * as rentals from './rentals.js';
import * as agent from './agent.js';
import * as guesthouse from './guesthouse.js';
import * as visitors from './visitors.js';
import * as payroll from './payroll.js';

const SAMPLES = { shop, food, cafe, takeaway, florist, pharmacy, trading, workshop, builder, cars, salon, barber, repairs, garage, cleaning, agency, gym, clinic, school, charity, rentals, agent, guesthouse, visitors, payroll };

/** The samples, in the order a window offers them. */
export const SAMPLE_IDS = Object.keys(SAMPLES);

/**
 * The guide inside each sample, as Northwind's start-up form is: a Start
 * Here table with the tutorial's tasks a step at a time, each step naming
 * the table, form, query, report or print template to open, and a report
 * to print it. It is there whether the sample is made with its records or
 * empty, made from the sample's `about.tutorial`.
 */
const GUIDE = { name: 'Start Here', fields: [
  { name: 'Order', type: 'integer' }, { name: 'Task', type: 'text', required: true }, { name: 'Step', type: 'integer' }, { name: 'What To Do', type: 'longtext' },
] };
const GUIDE_REPORT = { name: 'Start Here', title: 'Start here: the everyday tasks, step by step', table: 'Start Here', group: 'Task', sort: 'Order', columns: [{ field: 'Step', type: 'integer' }, 'What To Do'] };
const GUIDE_ABOUT = { about: 'The guide to this database: the everyday tasks a step at a time, each step saying which table, form, query, report or print template to open. Open its report, Start Here, to read or print it. Delete the table when you no longer need it; nothing else uses it.', fields: {
  Order: 'The order the steps are read in.', Task: 'The everyday task the step belongs to.', Step: 'The step\'s number within its task.', 'What To Do': 'What to open and what to do there.',
} };

/** A sample's own name as a web address: Northbank Trading is northbank-trading. */
const slugOf = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** A summary written as one string holds its paragraphs between blank lines. */
const paragraphs = (summary) => (Array.isArray(summary) ? summary : String(summary).split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean));

const abouts = new WeakMap();
/** A sample module's documentation, the guide's table and report described with its own. */
function aboutOf(s) {
  if (abouts.has(s)) return abouts.get(s);
  const a = s.about;
  const guided = Boolean(a.tutorial?.length);
  const about = {
    ...a,
    summary: paragraphs(a.summary),
    tables: guided ? { 'Start Here': GUIDE_ABOUT, ...a.tables } : a.tables,
    reports: guided ? { ...a.reports, 'Start Here': 'The guide to this database printed: each everyday task and its steps, from the Start Here table.' } : a.reports,
  };
  abouts.set(s, about);
  return about;
}

const designs = new WeakMap();
/** A sample module's design: its own, with the guide first when it has a tutorial. */
function designOf(s) {
  if (designs.has(s)) return designs.get(s);
  const guided = Boolean(s.about?.tutorial?.length);
  const design = guided ? { ...s.spec, tables: [GUIDE, ...s.spec.tables], reports: [...(s.spec.reports || []), GUIDE_REPORT] } : s.spec;
  designs.set(s, design);
  return design;
}

/** The guide's steps for a sample module, as Start Here records. */
function guideRows(s) {
  const a = s.about;
  const rows = [];
  let order = 0;
  const step = (task, n, text) => rows.push({ Order: ++order, Task: task, Step: n, 'What To Do': text });
  const first = '0. About this database';
  step(first, 1, `${a.name}: ${a.line} Everything in it is invented: the business, the people, the addresses and the figures. The dates count back from the day it was made.`);
  step(first, 2, 'Every table has a form of the same name: open it from Forms to see one record at a time and to add one. Queries answer the questions the business asks; reports and print templates are what it prints.');
  step(first, 3, `The full guide, with every table, field, query and report explained, is at https://office.rutba.io/samples/${slugOf(a.name)}`);
  step(first, 4, 'Keep a copy before you change things: File, Save As makes one. Delete this Start Here table when you no longer need it.');
  a.tutorial.forEach((t, i) => t.steps.forEach((text, j) => step(`${i + 1}. ${t.title}`, j + 1, text)));
  return rows;
}

/** The oldest Office a sample needs (its module's `minOffice`), or null when any Office that has samples can make it. */
export const sampleNeeds = (id) => sampleModule(id).minOffice || null;

/** A sample's documentation: what the business is, each table, field, query and report in words. */
export function sampleAbout(id) {
  const s = SAMPLES[id];
  if (!s) throw new Error(`There is no sample database called ${id}.`);
  return aboutOf(s);
}

/** A sample's design, as buildFromSpec takes it: tables, queries, reports and print templates. */
export function sampleSpec(id) {
  const s = SAMPLES[id];
  if (!s) throw new Error(`There is no sample database called ${id}.`);
  return designOf(s);
}

/** A sample's module: { spec, fill, about } for the engine to build from. */
export function sampleModule(id) {
  const s = SAMPLES[id];
  if (!s) throw new Error(`There is no sample database called ${id}.`);
  return s;
}

/** A sample's design with its guide: the tables, queries, reports and print templates the engine makes. */
export const designOfModule = (s) => designOf(s);

/** The Start Here records for a sample module, or none when it has no tutorial. */
export const guideOf = (s) => (s.about?.tutorial?.length ? guideRows(s) : []);

/** The guide's table name: its records are written first, made empty or not. */
export const GUIDE_TABLE = GUIDE.name;
