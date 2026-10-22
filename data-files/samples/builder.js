// The builder: Kilnside Builders, an invented small building firm in
// Bristol that builds extensions and loft conversions, refits kitchens and
// bathrooms, and does repairs. It employs four small crews of its own (two
// for extensions and lofts, one for kitchens and bathrooms, one builder on
// repairs) and brings in subcontractors for scaffolding, roofing, steel,
// electrics, plumbing, plastering, tiling and drains.
//
// Its records run from an enquiry to a closed job: the enquiry, the site
// visit, a quote in sections and lines (labour, materials, subcontract and a
// contingency), the accepted quote becoming a job with stages, the deposit
// and stage invoices with retention held back, variations agreed on site,
// the retention released after the defects period, every cost charged to
// the job (each week's labour, merchants' and subcontractors' invoices,
// skips), and the site diary kept each working day.
//
// About eighteen months are made, with enquiries coming in faster in the
// spring and slower over Christmas, when the firm shuts. The file is made
// first thing in the morning: today's site work has not happened yet, but
// visits, starts and stage payments are booked for the weeks ahead.

import { address, BUSINESS_ABOUT, BUSINESS_TABLE, businessRecord, money, person, phoneFor } from './util.js';

const ref = (table) => ({ type: 'integer', points: table });
// VAT on building work to an existing home: the standard rate.
const STANDARD_RATE = 0.2;
const LETTERHEAD = { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'E-mail', 'Website', 'Tax Number'] };
const QUOTE_AMOUNT = 'Round([Quantity] * [Rate], 2)';
// The job ledger's two sides: what a job is worth (the contract, its
// variations and the contingency credited back) and what it costs.
const VALUE = '([Kind] = "Contract" Or [Kind] = "Variation" Or [Kind] = "Contingency")';
const OVERDUE = (field) => ({ expr: `DateDiff("d", [${field}], Date())`, as: 'Days Overdue' });
const STAFF_NAME = '[First Name] & " " & [Last Name]';
// Dates as the firm writes them: 22/10/2026 on invoices and statements, 22 October 2026 in a contract.
const DATE = 'dd/mm/yyyy';
const LONG_DATE = 'd mmmm yyyy';
const MONEY = '#,##0.00';

// The print templates need the 2.16 engine: records chosen by a condition, blocks shown when they apply, formats.
export const minOffice = '2.16.0';

export const spec = {
  // Where a value below nought is right: work taken out of a contract, the
  // contingency credited back, retention taken off an invoice, a job
  // running at a loss so far, a date already passed.
  negative: {
    Variations: ['Amount'], 'Invoice Lines': ['Amount'], 'Job Ledger': ['Net'],
    'Variations by job': ['Amount'], 'Variations awaiting agreement': ['Amount'], 'Jobs by stage': ['Days to Finish'],
    'Stage payments due': ['Days Left'], 'Unpaid invoices': ['Days Overdue'], 'Subcontractors unpaid bills': ['Days Overdue'],
    'Retentions due for release': ['Days to Release'], 'Job profit': ['Margin'], 'Job costs to date': ['Margin So Far'],
  },
  tables: [
    BUSINESS_TABLE,
    { name: 'Clients', fields: [
      { name: 'Name', type: 'text', required: true }, { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' },
      { name: 'Address', type: 'text' }, { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' },
      { name: 'Payment Days', type: 'integer', default: 7 }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Staff', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Trade', type: 'text' },
      { name: 'Crew', type: 'text' }, { name: 'Hourly Cost', type: 'currency' }, { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' },
      { name: 'Started', type: 'date' },
    ] },
    { name: 'Suppliers', fields: [
      { name: 'Name', type: 'text', required: true }, { name: 'Kind', type: 'text', default: 'Merchant' }, { name: 'Trade', type: 'text' },
      { name: 'Contact', type: 'text' }, { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Address', type: 'text' },
      { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' }, { name: 'Payment Days', type: 'integer', default: 30 },
      { name: 'VAT Registered', type: 'yesno', default: true },
    ] },
    { name: 'Enquiries', fields: [
      { name: 'Client', ...ref('Clients'), required: true }, { name: 'Received On', type: 'date' }, { name: 'Work', type: 'text' },
      { name: 'Description', type: 'longtext' }, { name: 'Source', type: 'text' }, { name: 'Status', type: 'text', default: 'New' },
      { name: 'Visit Date', type: 'date' }, { name: 'Visited By', ...ref('Staff') }, { name: 'Visit Notes', type: 'longtext' },
    ] },
    { name: 'Quotes', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Enquiry', ...ref('Enquiries') }, { name: 'Client', ...ref('Clients'), required: true },
      { name: 'Title', type: 'text' }, { name: 'Quote Date', type: 'date' }, { name: 'Valid Until', type: 'date' }, { name: 'Status', type: 'text', default: 'Sent' },
      { name: 'Weeks on Site', type: 'integer' }, { name: 'Net', type: 'currency' }, { name: 'VAT', type: 'currency' }, { name: 'Total', type: 'currency' },
      { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Quote Lines', fields: [
      { name: 'Quote', ...ref('Quotes'), required: true }, { name: 'Line', type: 'integer' }, { name: 'Section', type: 'text' },
      { name: 'Kind', type: 'text' }, { name: 'Description', type: 'text' }, { name: 'Quantity', type: 'number', default: 1 },
      { name: 'Unit', type: 'text' }, { name: 'Rate', type: 'currency' }, { name: 'Tax Rate', type: 'number', default: STANDARD_RATE },
    ] },
    // Jobs comes before Invoices and the Job Ledger: a query joins two tables
    // by the first relationship between them, so with Jobs, Invoices and
    // Clients together the client is the job's.
    { name: 'Jobs', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Quote', ...ref('Quotes') }, { name: 'Client', ...ref('Clients'), required: true },
      { name: 'Title', type: 'text' }, { name: 'Work', type: 'text' }, { name: 'Site Manager', ...ref('Staff') }, { name: 'Signed On', type: 'date' },
      { name: 'Contract Sum', type: 'currency' }, { name: 'Contingency', type: 'currency', default: 0 }, { name: 'Start Date', type: 'date' },
      { name: 'Finish Date', type: 'date' }, { name: 'Completed On', type: 'date' }, { name: 'Status', type: 'text', default: 'Booked' },
      { name: 'Current Stage', type: 'text' }, { name: 'Retention Percent', type: 'number', default: 5 }, { name: 'Defects Months', type: 'integer', default: 6 },
      { name: 'Retention Due', type: 'date' }, { name: 'Retention Released On', type: 'date' }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Job Stages', fields: [
      { name: 'Job', ...ref('Jobs'), required: true }, { name: 'Stage', type: 'integer' }, { name: 'Name', type: 'text' },
      { name: 'Payment Percent', type: 'number' }, { name: 'Amount', type: 'currency' }, { name: 'Planned Finish', type: 'date' }, { name: 'Done On', type: 'date' },
    ] },
    { name: 'Variations', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Job', ...ref('Jobs'), required: true }, { name: 'Raised On', type: 'date' },
      { name: 'Description', type: 'longtext' }, { name: 'Reason', type: 'text' }, { name: 'Amount', type: 'currency' }, { name: 'Extra Days', type: 'integer', default: 0 },
      { name: 'Status', type: 'text', default: 'Proposed' }, { name: 'Agreed On', type: 'date' }, { name: 'Invoice', ...ref('Invoices') },
    ] },
    { name: 'Invoices', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Job', ...ref('Jobs'), required: true }, { name: 'Client', ...ref('Clients'), required: true },
      { name: 'Stage', ...ref('Job Stages') }, { name: 'Kind', type: 'text' }, { name: 'Invoice Date', type: 'date' }, { name: 'Due Date', type: 'date' },
      { name: 'Gross', type: 'currency' }, { name: 'Retention', type: 'currency', default: 0 }, { name: 'Net', type: 'currency' },
      { name: 'VAT', type: 'currency' }, { name: 'Total', type: 'currency' }, { name: 'Paid On', type: 'date' },
    ] },
    { name: 'Invoice Lines', fields: [
      { name: 'Invoice', ...ref('Invoices'), required: true }, { name: 'Line', type: 'integer' }, { name: 'Description', type: 'text' },
      { name: 'Amount', type: 'currency' }, { name: 'Tax Rate', type: 'number', default: STANDARD_RATE },
    ] },
    { name: 'Job Ledger', fields: [
      { name: 'Job', ...ref('Jobs'), required: true }, { name: 'Entry Date', type: 'date' }, { name: 'Kind', type: 'text' },
      { name: 'Supplier', ...ref('Suppliers') }, { name: 'Staff', ...ref('Staff') }, { name: 'Description', type: 'text' },
      { name: 'Their Ref', type: 'text' }, { name: 'Hours', type: 'number' }, { name: 'Net', type: 'currency' }, { name: 'VAT', type: 'currency' },
      { name: 'Due Date', type: 'date' }, { name: 'Paid On', type: 'date' },
    ] },
    { name: 'Site Diary', fields: [
      { name: 'Job', ...ref('Jobs'), required: true }, { name: 'Diary Date', type: 'date' }, { name: 'Weather', type: 'text' },
      { name: 'On Site', type: 'text' }, { name: 'Work Done', type: 'longtext' }, { name: 'Problems', type: 'text' }, { name: 'Visitors', type: 'text' },
    ] },
  ],
  queries: {
    'Enquiries to follow up': { tables: ['Enquiries', 'Clients'], columns: [
      { table: 'Enquiries', field: 'Received On', sort: 'asc' }, { table: 'Clients', field: 'Name', as: 'Client' }, { table: 'Clients', field: 'Phone' },
      { table: 'Enquiries', field: 'Work' }, { table: 'Enquiries', field: 'Description' }, { table: 'Enquiries', field: 'Status', criteria: ['In ("New", "Visit booked", "Visited")'] },
      { table: 'Enquiries', field: 'Visit Date' }, { expr: 'DateDiff("d", [Received On], Date())', as: 'Days Waiting' },
    ] },
    'Site visits, next 14 days': { tables: ['Enquiries', 'Clients', 'Staff'], columns: [
      { table: 'Enquiries', field: 'Visit Date', sort: 'asc' }, { expr: STAFF_NAME, as: 'Visiting' }, { table: 'Clients', field: 'Name', as: 'Client' },
      { table: 'Clients', field: 'Address' }, { table: 'Clients', field: 'City' }, { table: 'Clients', field: 'Postcode' }, { table: 'Clients', field: 'Phone' },
      { table: 'Enquiries', field: 'Work' }, { table: 'Enquiries', field: 'Description' },
      { expr: 'DateDiff("d", Date(), [Visit Date])', as: 'Days Ahead', criteria: ['Between 0 And 14'] },
      { table: 'Enquiries', field: 'Status', criteria: ['Visit booked'], show: false },
    ] },
    'Quotes awaiting an answer': { tables: ['Quotes', 'Clients'], columns: [
      { table: 'Quotes', field: 'Number', as: 'Quote No' }, { table: 'Clients', field: 'Name', as: 'Client' }, { table: 'Clients', field: 'Phone' },
      { table: 'Quotes', field: 'Title' }, { table: 'Quotes', field: 'Quote Date', sort: 'asc' }, { table: 'Quotes', field: 'Valid Until' },
      { expr: 'DateDiff("d", [Quote Date], Date())', as: 'Days Since' }, { table: 'Quotes', field: 'Total' },
      { table: 'Quotes', field: 'Status', criteria: ['Sent'], show: false },
    ] },
    'Quote success by work': { tables: ['Quotes', 'Enquiries'], columns: [
      { table: 'Enquiries', field: 'Work', total: 'group', sort: 'asc' }, { table: 'Quotes', field: 'Status', total: 'group', sort: 'asc' },
      { table: 'Quotes', field: 'ID', as: 'Quotes', total: 'count' }, { table: 'Quotes', field: 'Net', as: 'Value', total: 'sum' },
    ] },
    'Jobs by stage': { tables: ['Jobs', 'Clients', 'Staff'], columns: [
      { table: 'Jobs', field: 'Number', as: 'Job' }, { table: 'Clients', field: 'Name', as: 'Client' }, { table: 'Jobs', field: 'Title' },
      { table: 'Jobs', field: 'Status', criteria: ['In ("Booked", "On site")'] }, { table: 'Jobs', field: 'Current Stage' }, { expr: STAFF_NAME, as: 'Site Manager' },
      { table: 'Jobs', field: 'Start Date', sort: 'asc' }, { table: 'Jobs', field: 'Finish Date' }, { expr: 'DateDiff("d", Date(), [Finish Date])', as: 'Days to Finish' },
    ] },
    'Stage payments due': { tables: ['Job Stages', 'Jobs', 'Clients'], columns: [
      { table: 'Jobs', field: 'Number', as: 'Job' }, { table: 'Clients', field: 'Name', as: 'Client' }, { table: 'Job Stages', field: 'Name', as: 'Stage' },
      { table: 'Job Stages', field: 'Planned Finish', sort: 'asc' }, { expr: 'DateDiff("d", Date(), [Planned Finish])', as: 'Days Left', criteria: ['<= 30'] },
      { table: 'Job Stages', field: 'Amount' }, { table: 'Job Stages', field: 'Done On', criteria: ['Is Null'], show: false },
    ] },
    'Invoiced against contract': { tables: ['Jobs', 'Invoices'], columns: [
      { table: 'Jobs', field: 'Number', as: 'Job', total: 'group', sort: 'asc' }, { table: 'Jobs', field: 'Title', total: 'group' },
      { table: 'Jobs', field: 'Status', total: 'group' }, { table: 'Jobs', field: 'Contract Sum', total: 'group' },
      { expr: 'IIf([Kind] = "Retention", 0, [Gross])', as: 'Work Invoiced', total: 'sum' },
      { expr: 'IIf(Nz([Retention Released On], "") = "", [Retention], 0)', as: 'Retention Held', total: 'sum' },
      { table: 'Invoices', field: 'Total', as: 'Billed with VAT', total: 'sum' },
      { expr: 'IIf(Nz([Paid On], "") = "", 0, [Total])', as: 'Paid', total: 'sum' },
      { expr: 'IIf(Nz([Paid On], "") = "", [Total], 0)', as: 'Owing', total: 'sum' },
    ] },
    'Unpaid invoices': { tables: ['Invoices', 'Jobs', 'Clients'], columns: [
      { table: 'Invoices', field: 'Number', as: 'Invoice No' }, { table: 'Clients', field: 'Name', as: 'Client' }, { table: 'Jobs', field: 'Number', as: 'Job' },
      { table: 'Invoices', field: 'Kind' }, { table: 'Invoices', field: 'Invoice Date' }, { table: 'Invoices', field: 'Due Date', sort: 'asc' },
      { table: 'Invoices', field: 'Total' }, OVERDUE('Due Date'), { table: 'Invoices', field: 'Paid On', criteria: ['Is Null'], show: false },
    ] },
    'Variations by job': { tables: ['Variations', 'Jobs', 'Clients'], columns: [
      { table: 'Jobs', field: 'Number', as: 'Job', sort: 'asc' }, { table: 'Clients', field: 'Name', as: 'Client' }, { table: 'Variations', field: 'Number', as: 'Variation' },
      { table: 'Variations', field: 'Raised On', sort: 'asc' }, { table: 'Variations', field: 'Description' }, { table: 'Variations', field: 'Reason' },
      { table: 'Variations', field: 'Amount' }, { table: 'Variations', field: 'Extra Days' }, { table: 'Variations', field: 'Status' }, { table: 'Variations', field: 'Agreed On' },
    ] },
    'Variations awaiting agreement': { tables: ['Variations', 'Jobs', 'Clients'], columns: [
      { table: 'Variations', field: 'Number', as: 'Variation' }, { table: 'Jobs', field: 'Number', as: 'Job' }, { table: 'Clients', field: 'Name', as: 'Client' },
      { table: 'Clients', field: 'Phone' }, { table: 'Variations', field: 'Raised On', sort: 'asc' }, { table: 'Variations', field: 'Description' },
      { table: 'Variations', field: 'Amount' }, { table: 'Variations', field: 'Extra Days' }, { expr: 'DateDiff("d", [Raised On], Date())', as: 'Days Waiting' },
      { table: 'Variations', field: 'Status', criteria: ['Proposed'], show: false },
    ] },
    'Job profit': { tables: ['Jobs', 'Job Ledger'], columns: [
      { table: 'Jobs', field: 'Number', as: 'Job', total: 'group' }, { table: 'Jobs', field: 'Title', total: 'group' }, { table: 'Jobs', field: 'Work', total: 'group' },
      { table: 'Jobs', field: 'Completed On', total: 'group', sort: 'desc' },
      { expr: `IIf(${VALUE}, [Net], 0)`, as: 'Value', total: 'sum' }, { expr: 'IIf([Kind] = "Labour", [Net], 0)', as: 'Labour', total: 'sum' },
      { expr: 'IIf([Kind] = "Materials" Or [Kind] = "Plant", [Net], 0)', as: 'Materials', total: 'sum' },
      { expr: 'IIf([Kind] = "Subcontract", [Net], 0)', as: 'Subcontract', total: 'sum' },
      { expr: `IIf(${VALUE}, 0, [Net])`, as: 'Costs', total: 'sum' }, { expr: `IIf(${VALUE}, [Net], 0 - [Net])`, as: 'Margin', total: 'sum' },
      { table: 'Jobs', field: 'Status', total: 'where', criteria: ['In ("Defects period", "Closed")'] },
    ] },
    'Job costs to date': { tables: ['Jobs', 'Job Ledger'], columns: [
      { table: 'Jobs', field: 'Number', as: 'Job', total: 'group', sort: 'asc' }, { table: 'Jobs', field: 'Title', total: 'group' }, { table: 'Jobs', field: 'Current Stage', total: 'group' },
      { expr: `IIf(${VALUE}, [Net], 0)`, as: 'Value', total: 'sum' }, { expr: 'IIf([Kind] = "Labour", [Net], 0)', as: 'Labour', total: 'sum' },
      { expr: 'IIf([Kind] = "Materials" Or [Kind] = "Plant", [Net], 0)', as: 'Materials', total: 'sum' },
      { expr: 'IIf([Kind] = "Subcontract", [Net], 0)', as: 'Subcontract', total: 'sum' },
      { expr: `IIf(${VALUE}, [Net], 0 - [Net])`, as: 'Margin So Far', total: 'sum' },
      { table: 'Jobs', field: 'Status', total: 'where', criteria: ['On site'] },
    ] },
    'Retentions due for release': { tables: ['Jobs', 'Clients', 'Invoices'], columns: [
      { table: 'Jobs', field: 'Number', as: 'Job', total: 'group' }, { table: 'Clients', field: 'Name', as: 'Client', total: 'group' }, { table: 'Jobs', field: 'Title', total: 'group' },
      { table: 'Jobs', field: 'Completed On', total: 'group' }, { table: 'Jobs', field: 'Retention Due', total: 'group', sort: 'asc' },
      { expr: 'DateDiff("d", Date(), [Retention Due])', as: 'Days to Release', total: 'group' },
      { table: 'Invoices', field: 'Retention', as: 'Retention Held', total: 'sum' },
      { table: 'Jobs', field: 'Status', total: 'where', criteria: ['Defects period'] },
    ] },
    'Subcontractors unpaid bills': { tables: ['Job Ledger', 'Suppliers', 'Jobs'], columns: [
      { table: 'Suppliers', field: 'Name', as: 'Subcontractor', sort: 'asc' }, { table: 'Suppliers', field: 'Trade' }, { table: 'Jobs', field: 'Number', as: 'Job' },
      { table: 'Job Ledger', field: 'Their Ref' }, { table: 'Job Ledger', field: 'Entry Date', as: 'Bill Date' }, { table: 'Job Ledger', field: 'Due Date', sort: 'asc' },
      { table: 'Job Ledger', field: 'Net' }, { table: 'Job Ledger', field: 'VAT' }, { expr: 'Round([Net] + Nz([VAT]), 2)', as: 'To Pay' }, OVERDUE('Due Date'),
      { table: 'Job Ledger', field: 'Kind', criteria: ['Subcontract'], show: false }, { table: 'Job Ledger', field: 'Paid On', criteria: ['Is Null'], show: false },
    ] },
    'Labour by person, last 4 weeks': { tables: ['Job Ledger', 'Staff'], columns: [
      { expr: STAFF_NAME, as: 'Name', total: 'group', sort: 'asc' }, { table: 'Staff', field: 'Trade', total: 'group' }, { table: 'Staff', field: 'Crew', total: 'group' },
      { table: 'Job Ledger', field: 'Hours', as: 'Hours', total: 'sum' }, { table: 'Job Ledger', field: 'Net', as: 'Cost', total: 'sum' },
      { table: 'Job Ledger', field: 'Kind', total: 'where', criteria: ['Labour'] },
      { expr: 'DateDiff("d", [Entry Date], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 27'] },
    ] },
    'Site diary, last 3 weeks': { tables: ['Site Diary', 'Jobs'], columns: [
      { table: 'Jobs', field: 'Number', as: 'Job', sort: 'asc' }, { table: 'Jobs', field: 'Title' }, { table: 'Site Diary', field: 'Diary Date', sort: 'desc' },
      { table: 'Site Diary', field: 'Weather' }, { table: 'Site Diary', field: 'On Site' }, { table: 'Site Diary', field: 'Work Done' },
      { table: 'Site Diary', field: 'Problems' }, { table: 'Site Diary', field: 'Visitors' },
      { expr: 'DateDiff("d", [Diary Date], Date())', as: 'Days Ago', criteria: ['Between 0 And 20'], show: false },
    ] },
    'Invoiced by month': { tables: ['Invoices'], columns: [
      { expr: 'Format([Invoice Date], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Invoices', field: 'ID', as: 'Invoices', total: 'count' },
      { table: 'Invoices', field: 'Gross', as: 'Work Invoiced', total: 'sum' }, { table: 'Invoices', field: 'Retention', as: 'Retention Held', total: 'sum' },
      { table: 'Invoices', field: 'VAT', as: 'VAT', total: 'sum' }, { table: 'Invoices', field: 'Kind', total: 'where', criteria: ['<> "Retention"'] },
    ] },
    'Costs by month': { tables: ['Job Ledger'], columns: [
      { expr: 'Format([Entry Date], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Job Ledger', field: 'Kind', total: 'group', sort: 'asc' },
      { table: 'Job Ledger', field: 'Net', as: 'Cost', total: 'sum' },
      { table: 'Job Ledger', field: 'Kind', as: 'Cost Kind', total: 'where', criteria: ['In ("Labour", "Materials", "Plant", "Subcontract")'] },
    ] },
  },
  reports: [
    { name: 'Jobs on the go', query: 'Jobs by stage', columns: ['Job', 'Client', 'Title', 'Status', 'Current Stage', 'Site Manager', { field: 'Start Date', type: 'date' }, { field: 'Finish Date', type: 'date' }, { field: 'Days to Finish', type: 'integer' }], totals: [{ field: 'Job', fn: 'count' }] },
    { name: 'Quotes to chase', query: 'Quotes awaiting an answer', columns: ['Quote No', 'Client', 'Phone', 'Title', { field: 'Quote Date', type: 'date' }, { field: 'Valid Until', type: 'date' }, { field: 'Days Since', type: 'integer' }, { field: 'Total', type: 'currency' }], totals: [{ field: 'Total', fn: 'sum' }] },
    { name: 'Stage payments coming up', query: 'Stage payments due', columns: ['Job', 'Client', 'Stage', { field: 'Planned Finish', type: 'date' }, { field: 'Days Left', type: 'integer' }, { field: 'Amount', type: 'currency' }], totals: [{ field: 'Amount', fn: 'sum' }] },
    { name: 'Invoices due', query: 'Unpaid invoices', group: 'Client', columns: ['Invoice No', 'Job', 'Kind', { field: 'Invoice Date', type: 'date' }, { field: 'Due Date', type: 'date' }, { field: 'Days Overdue', type: 'integer' }, { field: 'Total', type: 'currency' }], totals: [{ field: 'Total', fn: 'sum' }] },
    { name: 'Contract account', query: 'Invoiced against contract', columns: ['Job', 'Title', 'Status', { field: 'Contract Sum', type: 'currency' }, { field: 'Work Invoiced', type: 'currency' }, { field: 'Retention Held', type: 'currency' }, { field: 'Billed with VAT', type: 'currency' }, { field: 'Paid', type: 'currency' }, { field: 'Owing', type: 'currency' }], totals: [{ field: 'Work Invoiced', fn: 'sum' }, { field: 'Retention Held', fn: 'sum' }, { field: 'Owing', fn: 'sum' }] },
    { name: 'Job profit', query: 'Job profit', columns: ['Job', 'Title', { field: 'Completed On', type: 'date' }, { field: 'Value', type: 'currency' }, { field: 'Labour', type: 'currency' }, { field: 'Materials', type: 'currency' }, { field: 'Subcontract', type: 'currency' }, { field: 'Margin', type: 'currency' }], totals: [{ field: 'Value', fn: 'sum' }, { field: 'Costs', fn: 'sum' }, { field: 'Margin', fn: 'sum' }] },
    { name: 'Variations register', query: 'Variations by job', group: 'Job', columns: ['Variation', { field: 'Raised On', type: 'date' }, 'Description', 'Reason', 'Status', { field: 'Extra Days', type: 'integer' }, { field: 'Amount', type: 'currency' }], totals: [{ field: 'Amount', fn: 'sum' }] },
    { name: 'Retentions held', query: 'Retentions due for release', columns: ['Job', 'Client', 'Title', { field: 'Completed On', type: 'date' }, { field: 'Retention Due', type: 'date' }, { field: 'Days to Release', type: 'integer' }, { field: 'Retention Held', type: 'currency' }], totals: [{ field: 'Retention Held', fn: 'sum' }] },
    { name: 'Subcontractors to pay', query: 'Subcontractors unpaid bills', group: 'Subcontractor', columns: ['Job', 'Their Ref', { field: 'Bill Date', type: 'date' }, { field: 'Due Date', type: 'date' }, { field: 'Days Overdue', type: 'integer' }, { field: 'To Pay', type: 'currency' }], totals: [{ field: 'To Pay', fn: 'sum' }] },
    { name: 'Site diary', query: 'Site diary, last 3 weeks', group: 'Job', columns: [{ field: 'Diary Date', type: 'date' }, 'Weather', 'On Site', 'Work Done', 'Problems', 'Visitors'], totals: [{ field: 'Diary Date', fn: 'count' }] },
    { name: 'Monthly invoicing', query: 'Invoiced by month', columns: ['Month', { field: 'Invoices', type: 'integer' }, { field: 'Work Invoiced', type: 'currency' }, { field: 'Retention Held', type: 'currency' }, { field: 'VAT', type: 'currency' }], totals: [{ field: 'Work Invoiced', fn: 'sum' }, { field: 'VAT', fn: 'sum' }] },
  ],
  // The print templates: one document for each record of a table, its lines
  // from the records that point at it, the firm's details at the head.
  documents: [
    // For quotes waiting for an answer; one already answered prints from the Quotes form.
    { name: 'Quotation', table: 'Quotes', paper: 'a4', letterhead: LETTERHEAD, where: '[Status] = "Sent"', blocks: [
      { type: 'heading', text: 'Quotation {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Client.Name', label: 'Prepared for' }, { field: 'Number', label: 'Quote number' },
        { field: 'Client.Address', label: 'Address of the work' }, { field: 'Quote Date', label: 'Date', format: DATE },
        { field: 'Client.City', label: 'Town' }, { field: 'Valid Until', label: 'Price holds until', format: DATE },
        { field: 'Client.Postcode', label: 'Postcode' }, { field: 'Weeks on Site', label: 'Weeks on site, about' },
        { field: 'Title', label: 'The work' },
      ] },
      { type: 'text', text: 'Thank you for having us round. This is our price for the work below, as we discussed on site.', if: 'Nz([Notes], "") = ""' },
      { type: 'text', text: 'Thank you for having us round. This is our price for the work below, as we discussed on site. {Notes}', if: 'Nz([Notes], "") <> ""' },
      // The work section by section, each with what it comes to.
      { type: 'lines', table: 'Quote Lines', sort: 'Line', group: 'Section', subtotals: ['Amount', 'VAT'], columns: [
        { field: 'Section' }, { field: 'Description' }, { field: 'Quantity', label: 'Qty', type: 'number' }, { field: 'Unit' },
        { field: 'Rate', type: 'currency' }, { expr: QUOTE_AMOUNT, as: 'Amount', type: 'currency' },
        { expr: `Round(${QUOTE_AMOUNT} * Nz([Tax Rate]), 2)`, as: 'VAT', type: 'currency' },
      ] },
      { type: 'totals', rows: [
        { label: 'Price before VAT', expr: '[Amount]' }, { label: 'VAT', expr: '[VAT]' }, { label: 'Price with VAT', expr: '[Price before VAT] + [VAT]', strong: true },
      ] },
      { type: 'text', text: 'The price is fixed for the work described. Where there is a contingency line, it is a sum held for work nobody can see before we start, such as rotten timber or a drain in the way; any such work is priced and agreed with you first as a variation, and the contingency is credited back on the final invoice. Larger work is paid by stages as it goes, a deposit when the contract is signed and then a payment as each stage is reached, as the contract sets out. Repairs are invoiced when they are finished.' },
      { type: 'text', text: 'Not included unless listed: planning and building control fees, the party wall surveyor, floor coverings, decorating, and moving gas or electricity meters. To go ahead, sign below and send it back, and we will draw up the contract with a start date.', small: true },
      { type: 'spacer', size: 20 },
      { type: 'signatures', labels: ['Accepted by the client', 'For the builder'] },
    ] },
    // For live contracts: jobs booked, on site or in their defects period. A closed job's prints from the Jobs form.
    { name: 'Contract', table: 'Jobs', paper: 'a4', letterhead: LETTERHEAD, where: '[Status] <> "Closed"', blocks: [
      { type: 'heading', text: 'Building contract {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Client.Name', label: 'The client' }, { field: 'Number', label: 'Contract number' },
        { field: 'Client.Address', label: 'Address of the works' }, { field: 'Signed On', label: 'Date of this contract', format: LONG_DATE },
        { field: 'Client.City', label: 'Town' }, { field: 'Quote.Number', label: 'Our quotation' },
        { field: 'Client.Postcode', label: 'Postcode' }, { field: 'Contract Sum', label: 'Contract sum, before VAT', format: MONEY },
        { field: 'Start Date', label: 'Start', format: LONG_DATE }, { field: 'Finish Date', label: 'Finish, about', format: LONG_DATE },
      ] },
      { type: 'text', text: 'THIS CONTRACT is made on {Signed On} between {Business.Name} of {Business.Address}, {Business.City} {Business.Postcode} ("the Builder") and {Client.Name} of {Client.Address}, {Client.City} {Client.Postcode} ("the Client").' },
      { type: 'text', text: '1. The works. The Builder will carry out the works described in quotation {Quote.Number}, {Title}, at the Client\'s property above. The work will be done with care and skill, with materials of the kind described in the quotation, and to meet the building regulations and any planning permission for it.' },
      // The contingency sentence only where the contract holds one.
      { type: 'text', text: '2. The price. The contract sum is {Contract Sum} plus VAT at the rate in force when each invoice is raised. It includes a contingency of {Contingency} for work that cannot be seen before the works start. The contingency is not spent by the Builder on its own account: work it was meant for is agreed as a variation under clause 5, and the whole contingency is credited to the Client on the final invoice.', if: 'Nz([Contingency]) > 0' },
      { type: 'text', text: '2. The price. The contract sum is {Contract Sum} plus VAT at the rate in force when each invoice is raised. It holds no contingency: any work found once the works start is agreed as a variation under clause 5.', if: 'Nz([Contingency]) <= 0' },
      { type: 'text', text: '3. Stage payments. The Builder will invoice the payments below as each stage is reached. Each invoice after the deposit carries any variations agreed since the last one, less the retention in clause 6. The Client will pay each invoice within {Client.Payment Days} days of its date. If a payment is late the Builder may stop work, after giving seven days\' notice in writing, until it is paid.' },
      { type: 'lines', table: 'Job Stages', sort: 'Stage', columns: [
        { field: 'Stage', type: 'integer' }, { field: 'Name', label: 'Payment due when' }, { field: 'Payment Percent', label: 'Percent', type: 'number' },
        { field: 'Amount', label: 'Amount before VAT', type: 'currency' }, { field: 'Planned Finish', label: 'Expected', format: LONG_DATE },
      ] },
      { type: 'totals', rows: [{ label: 'Contract sum, before VAT', expr: '[Amount]', strong: true }] },
      { type: 'text', text: '4. Start and finish. The Builder will start on {Start Date} and expects to finish by {Finish Date}. The Builder will tell the Client as soon as anything will hold the work up, such as bad weather, a change asked for by the Client, a problem found once work has started, or materials that cannot be had. The finish date moves by the time lost.' },
      { type: 'text', text: '5. Variations. Any change to the works, whether the Client asks for it or it is found to be needed once work has started, is written on a variation order with its price and any change to the finish date, and signed by both before the work is done. Only work needed at once to keep the building safe or dry may be done first, and it is then written up within two working days.' },
      { type: 'text', text: '6. Retention. The Client may hold back {Retention Percent} percent of each invoice after the deposit. The amount held is released {Defects Months} months after the works are finished, once any defects reported in that time have been put right.', if: 'Nz([Retention Percent]) > 0' },
      { type: 'text', text: '6. Retention. Nothing is held back from the invoices under this contract.', if: 'Nz([Retention Percent]) <= 0' },
      { type: 'text', text: '7. Defects. For {Defects Months} months after the works are finished the Builder will come back and put right, free of charge, any fault in the work or in materials the Builder supplied, when the Client reports it in writing. This does not cover fair wear and tear, damage done by others, or the hairline cracks of new plaster and timber drying out, which are filled at the end of the period.' },
      { type: 'text', text: '8. The site. The Client will give access during working hours, 8 until 5 on weekdays, and the use of water and electricity. The Builder will protect the parts of the house not being worked on, keep the site tidy and safe, and take away the waste.' },
      { type: 'text', text: '9. Insurance and permissions. The Builder holds public liability insurance and insures the works until they are handed over. The Client will tell their home insurer about the works before they start, and is responsible for planning permission and any party wall notices unless the quotation says otherwise.' },
      { type: 'text', text: '10. Ending the contract. If either side seriously breaks this contract and does not put it right within fourteen days of being asked in writing, the other may end it. The Builder is then paid for the work properly done and the materials bought for the works up to that day.' },
      { type: 'text', text: '11. Changing your mind. Where this contract is signed at the Client\'s home, the Client may cancel it within fourteen days of signing, without giving a reason, and any deposit is repaid in full, unless the Client asked for work to start within those fourteen days.' },
      { type: 'spacer', size: 24 },
      { type: 'signatures', labels: ['Signed for the Client', 'Signed for the Builder'] },
    ] },
    { name: 'Stage invoice', table: 'Invoices', paper: 'a4', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'VAT invoice {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Client.Name', label: 'Invoice to' }, { field: 'Number', label: 'Invoice number' },
        { field: 'Client.Address', label: 'Address' }, { field: 'Invoice Date', label: 'Invoice date (tax point)', format: DATE },
        { field: 'Client.City', label: 'Town' }, { field: 'Due Date', label: 'Payment due', format: DATE },
        { field: 'Client.Postcode', label: 'Postcode' }, { field: 'Kind', label: 'Invoice for' },
        { field: 'Job.Number', label: 'Contract' }, { field: 'Job.Contract Sum', label: 'Contract sum', format: MONEY },
        { field: 'Job.Title', label: 'The works' },
      ] },
      { type: 'lines', table: 'Invoice Lines', sort: 'Line', columns: [
        { field: 'Line', label: 'No', type: 'integer' }, { field: 'Description' }, { field: 'Amount', type: 'currency' },
        { expr: 'Round([Tax Rate] * 100, 0)', as: 'VAT %', type: 'integer' }, { expr: 'Round([Amount] * Nz([Tax Rate]), 2)', as: 'VAT', type: 'currency' },
      ] },
      { type: 'totals', rows: [
        { label: 'Amount before VAT', expr: '[Amount]' }, { label: 'VAT', expr: '[VAT]' }, { label: 'Total due', expr: '[Amount before VAT] + [VAT]', strong: true },
      ] },
      // The retention line only where some is held; how to pay while it is owed, the day it was paid once it is.
      { type: 'text', text: 'Retention held on this invoice: {Retention}, released after the defects period.', small: true, if: 'Nz([Retention]) <> 0' },
      { type: 'text', text: '{Business.Payment Terms} Please quote {Number} with your payment, by bank transfer to {Business.Bank Details}. VAT number {Business.Tax Number}.', small: true, if: 'Nz([Paid On], "") = ""' },
      { type: 'text', text: 'Paid in full on {Paid On}. Thank you. VAT number {Business.Tax Number}.', small: true, if: 'Nz([Paid On], "") <> ""' },
      { type: 'text', text: '{Business.Document Footer}', small: true },
    ] },
    // For variations waiting for the client to sign; one agreed or rejected prints from the Variations form.
    { name: 'Variation order', table: 'Variations', paper: 'a4', letterhead: LETTERHEAD, where: '[Status] = "Proposed"', blocks: [
      { type: 'heading', text: 'Variation order {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Job.Client.Name', label: 'Client' }, { field: 'Number', label: 'Variation number' },
        { field: 'Job.Client.Address', label: 'Address of the works' }, { field: 'Raised On', label: 'Date raised', format: DATE },
        { field: 'Job.Number', label: 'Contract' }, { field: 'Reason' },
        { field: 'Job.Title', label: 'The works' }, { field: 'Status', if: '[Status] <> "Proposed"' },
        { field: 'Agreed On', label: 'Agreed', format: DATE, if: 'Nz([Agreed On], "") <> ""' },
      ] },
      { type: 'text', text: 'Under clause 5 of contract {Job.Number}, the works are changed as follows:' },
      { type: 'text', text: '{Description}' },
      { type: 'totals', rows: [
        { label: 'Change to the contract sum, before VAT', expr: '[Amount]' }, { label: 'VAT', expr: 'Round([Amount] * [Business].[Tax Rate], 2)' },
        { label: 'Change with VAT', expr: '[Change to the contract sum, before VAT] + [VAT]', strong: true },
        { label: 'Extra working days', expr: 'Nz([Extra Days])', type: 'integer', if: 'Nz([Extra Days]) <> 0' },
      ] },
      // Worded for work added or work taken out, and for a finish date that moves or stays.
      { type: 'text', text: 'Once both sides have signed, the work goes ahead and the amount is added to the next stage invoice.', if: '[Amount] >= 0' },
      { type: 'text', text: 'This takes work out of the contract: once both sides have signed, the amount comes off the next stage invoice.', if: '[Amount] < 0' },
      { type: 'text', text: 'The finish date moves by the extra working days shown. Everything else in the contract stays as it was.', if: 'Nz([Extra Days]) <> 0' },
      { type: 'text', text: 'The finish date does not change. Everything else in the contract stays as it was.', if: 'Nz([Extra Days]) = 0' },
      { type: 'spacer', size: 24 },
      { type: 'signatures', labels: ['Agreed by the Client', 'For the Builder'] },
    ] },
    { name: 'Statement', table: 'Clients', paper: 'a4', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'Statement of account' },
      { type: 'fields', columns: 2, items: [
        { field: 'Name', label: 'Client' }, { field: 'Payment Days', label: 'Days to pay' },
        { field: 'Address' }, { field: 'City', label: 'Town' }, { field: 'Postcode' },
      ] },
      // What the client owes: the invoices not yet paid, oldest first, with the balance as it builds up.
      { type: 'lines', table: 'Invoices', sort: 'Invoice Date', where: 'Nz([Paid On], "") = ""', columns: [
        { field: 'Number', label: 'Invoice' }, { field: 'Invoice Date', label: 'Date', format: DATE }, { field: 'Due Date', label: 'Due', format: DATE },
        { field: 'Job.Number', label: 'Contract' }, { field: 'Kind', label: 'For' },
        { field: 'Total', label: 'Amount', type: 'currency' }, { running: 'Total', as: 'Balance' },
      ] },
      { type: 'totals', rows: [
        { label: 'Statement date', expr: 'Date()', format: DATE }, { label: 'Invoices unpaid', expr: '[Invoices count]', type: 'integer' },
        { label: 'Balance owing', expr: '[Balance]', strong: true },
      ] },
      { type: 'text', text: 'Retention held under your contract is not shown as owing until it is invoiced at the end of the defects period. If you have paid in the last few days, thank you, and please ignore this.', small: true, if: '[Balance] > 0' },
      { type: 'text', text: 'Bank transfer to {Business.Bank Details}.', small: true, if: '[Balance] > 0' },
      { type: 'text', text: 'Nothing is owed on your account today. Retention held under a contract is invoiced at the end of its defects period. Thank you.', small: true, if: '[Balance] <= 0' },
    ] },
  ],
};

export const about = {
  name: 'Kilnside Builders',
  kind: 'Builder',
  line: 'Enquiries, site visits, quotes, contracts, stage payments, variations, retentions, job costs and the site diary for a small building firm.',
  summary: [
    'Kilnside Builders is an invented building firm in Bristol with eleven people on its own books: a contracts manager who visits and prices the work, an office manager, two crews of three who build extensions and loft conversions, a joiner and an apprentice who refit kitchens and bathrooms, and a maintenance builder on repairs. Scaffolders, roofers, a steel fabricator, an electrician, a plumber, a plasterer, a tiler, a drainage firm and a damp specialist come in as subcontractors.',
    'Every piece of work starts as an enquiry. The contracts manager visits, measures up and sends a quote set out in sections (preliminaries, groundworks, roof, finishes and so on), each line marked as labour, materials or subcontract, with a contingency for what cannot be seen. About a third of the bigger quotes are accepted. An accepted quote becomes a job with a contract, a start date given by when a crew is free, and stages: a deposit on signing, a payment as each stage is reached, and the last on completion. Changes agreed on site are variations, priced and signed before the work is done, and charged on the next stage invoice. Five percent of each stage payment is held back as retention and released when the defects period, three or six months, is over.',
    'Every cost is charged to its job in the Job Ledger: each week\'s labour of the crew, every merchant\'s and subcontractor\'s invoice, and the skips. The contract sum and each agreed variation go in the same ledger as the job\'s value, so the profit on a job is the ledger added up. The crew keeps a site diary every working day: the weather, who was on site, what was done, anything that held the work up.',
    'The records cover about eighteen months up to the morning the file is made, with more enquiries in the spring and fewer over Christmas, when the firm shuts. Visits, starts and stage payments are booked for the weeks ahead, some quotes are waiting for an answer, a variation is waiting for a signature, and a few clients and subcontractors are behind with what they owe or are owed.',
  ],
  suits: ['An extension and loft conversion builder', 'A kitchen and bathroom fitter', 'A roofing contractor', 'A landscaper or groundworks firm', 'A shopfitter or joinery contractor', 'An electrical or plumbing contractor working to contract', 'A property maintenance firm'],
  tables: {
    Business: BUSINESS_ABOUT,
    Clients: { about: 'The people the firm works for, mostly householders, with a few landlords.', fields: {
      Name: 'The client\'s name, as it goes on the quote and the contract.', Phone: 'Their phone number.', 'E-mail': 'Where quotes and invoices go.',
      Address: 'The street address, which is also the address of the work.', City: 'The town.', Postcode: 'The postcode.',
      'Payment Days': 'Days the client has to pay an invoice: 7 for householders, 14 for landlords. Printed in the contract.',
      Notes: 'Anything to remember, such as a tenant to warn before a visit.',
    } },
    Staff: { about: 'The firm\'s own people, and the crew each works in.', fields: {
      'First Name': 'Their first name.', 'Last Name': 'Their family name.', Trade: 'What they do: Site Foreman, Carpenter, Labourer and so on.',
      Crew: 'A and B build extensions and lofts, C refits kitchens and bathrooms, D does repairs. Empty for office staff.',
      'Hourly Cost': 'What an hour of their time costs the firm, with holiday pay and insurance. Each week\'s labour in the Job Ledger is costed at it.',
      Phone: 'Their work mobile.', 'E-mail': 'Their work e-mail.', Started: 'The day they joined.',
    } },
    Suppliers: { about: 'Everyone the firm buys from: builders\' merchants, hire firms and subcontractors.', fields: {
      Name: 'The business\'s name.', Kind: 'Merchant, Hire or Subcontractor.', Trade: 'What they supply or do, such as Timber and joinery or Plastering.',
      Contact: 'The person you deal with.', Phone: 'Their phone number.', 'E-mail': 'Where orders and remittances go.',
      Address: 'Their street address.', City: 'The town.', Postcode: 'The postcode.',
      'Payment Days': 'Days you have to pay their invoices: 30 for merchants, 7 to 30 for subcontractors.',
      'VAT Registered': 'Ticked if they charge VAT. Some sole-trader subcontractors are not registered and charge none.',
    } },
    Enquiries: { about: 'Every call, e-mail or web form asking for a price, from the first contact to the job won or lost.', fields: {
      Client: 'Who asked.', 'Received On': 'The day it came in.', Work: 'Extension, Loft conversion, Kitchen, Bathroom or Repair.',
      Description: 'What they want, in their words.', Source: 'How they heard of the firm.',
      Status: 'New (not yet rung back), Visit booked, Visited (quote being written), Quoted, Won, Lost or Not for us.',
      'Visit Date': 'The day of the site visit, booked or made.', 'Visited By': 'Who went to look.', 'Visit Notes': 'What was found and measured on the visit.',
    } },
    Quotes: { about: 'A price for the work, written after the site visit. The Quotation print template prints one with its lines.', fields: {
      Number: 'The quote\'s number, in date order with a new run each year: QUO-2026-0042.', Enquiry: 'The enquiry it answers.', Client: 'Who it is for.',
      Title: 'The work in a few words, such as Single-storey rear extension.', 'Quote Date': 'The day it was sent.',
      'Valid Until': 'The last day the price holds: 60 days for extensions and lofts, 30 for the rest.',
      Status: 'Sent (waiting for an answer), Accepted, Declined or Expired.', 'Weeks on Site': 'About how long the work takes once started.',
      Net: 'The price before VAT: the lines added up.', VAT: 'The VAT: each line\'s VAT rounded to the penny and added up.', Total: 'The price with VAT.',
      Notes: 'What the price assumes and leaves out, printed on the quote.',
    } },
    'Quote Lines': { about: 'The lines of each quote, in sections.', fields: {
      Quote: 'The quote the line belongs to.', Line: 'Its place in the quote: lines print in this order.', Section: 'The part of the work, such as Groundworks or Roof.',
      Kind: 'Labour, Materials, Subcontract or Contingency: what the money is for, so you can compare the quote with the costs later.',
      Description: 'The work or the goods, as the client reads it.', Quantity: 'How many, in the unit.', Unit: 'm2, m3, m, each or item.',
      Rate: 'The price of one unit, before VAT.', 'Tax Rate': 'The VAT rate as a fraction: 0.2 is twenty percent.',
    } },
    Jobs: { about: 'An accepted quote, now a contract. The Contract print template prints it with its stage payments.', fields: {
      Number: 'The contract\'s number, in the order contracts were signed: JOB-2026-0042.', Quote: 'The quote that was accepted.', Client: 'Who the work is for.',
      Title: 'The work in a few words.', Work: 'Extension, Loft conversion, Kitchen, Bathroom or Repair.', 'Site Manager': 'The crew lead in charge on site.',
      'Signed On': 'The day the contract was signed and the deposit invoiced.', 'Contract Sum': 'The agreed price before VAT, the same as the quote\'s.',
      Contingency: 'The contingency inside the contract sum, credited back on the final invoice.', 'Start Date': 'The day work starts, when the crew is free.',
      'Finish Date': 'The day the work should be finished, as planned at signing.', 'Completed On': 'The day the work was actually finished; empty until then.',
      Status: 'Booked (not started), On site, Defects period (finished, retention still held) or Closed.',
      'Current Stage': 'Where the work has got to, kept up to date as stages are reached.',
      'Retention Percent': 'The percent held back from each stage invoice, 5 for most work and nought for repairs.',
      'Defects Months': 'How long after completion the firm puts defects right before the retention is released.',
      'Retention Due': 'The day the defects period ends.', 'Retention Released On': 'The day the retention was invoiced back; empty while it is held.',
      Notes: 'What the price assumed, copied from the quote.',
    } },
    'Job Stages': { about: 'The stage payments of each contract: what is paid when, from the deposit to completion.', fields: {
      Job: 'The contract.', Stage: 'Its number: nought is the deposit.', Name: 'The point reached, such as Roof on and watertight.',
      'Payment Percent': 'The share of the contract sum paid at this stage.', Amount: 'That share in money, before VAT.',
      'Planned Finish': 'When the stage should be reached.', 'Done On': 'The day it was reached and invoiced; empty until then.',
    } },
    Variations: { about: 'Changes to a contract once it is signed: extra work the client asks for, work found on site, or work taken out. The Variation order print template prints one to sign.', fields: {
      Number: 'The variation\'s number, in the order raised: VAR-2026-0042.', Job: 'The contract it changes.', 'Raised On': 'The day it was written up.',
      Description: 'What changes, in plain words.', Reason: 'Asked for by the client, or Found on site.',
      Amount: 'What it adds to the contract sum, before VAT. Below nought for work taken out.', 'Extra Days': 'Working days it adds to the finish date.',
      Status: 'Proposed (waiting for the client to sign), Agreed or Rejected.', 'Agreed On': 'The day the client signed it.',
      Invoice: 'The stage invoice it was charged on; empty until then.',
    } },
    Invoices: { about: 'Every invoice to a client: the deposit, each stage, completion, and the release of retention. The Stage invoice print template prints one.', fields: {
      Number: 'The invoice\'s number, in date order with a new run each year: INV-2026-0042.', Job: 'The contract it is for.', Client: 'Who pays it.',
      Stage: 'The stage it is for; empty for a retention release.', Kind: 'Deposit, Stage, Completion or Retention.',
      'Invoice Date': 'The day it was raised: the tax point.', 'Due Date': 'The day it should be paid.',
      Gross: 'The work invoiced: the stage, any variations and, on completion, the contingency credited back. Before retention and VAT.',
      Retention: 'What is held back from this invoice.', Net: 'What is charged before VAT: gross less retention. Its lines add up to it.',
      VAT: 'The VAT: each line\'s VAT rounded to the penny and added up.', Total: 'What the client pays.', 'Paid On': 'The day it was paid; empty while it is owed.',
    } },
    'Invoice Lines': { about: 'The lines of each invoice: the stage payment, each variation, the contingency credit, and the retention taken off.', fields: {
      Invoice: 'The invoice.', Line: 'Its place on the invoice.', Description: 'What it is for.', Amount: 'Before VAT. Below nought for retention held back or the contingency credited.',
      'Tax Rate': 'The VAT rate as a fraction.',
    } },
    'Job Ledger': { about: 'Every amount that goes to a job\'s account. Its value: the contract sum when signed, each variation when agreed, and the contingency credited back. Its costs: each week\'s labour of each person on the crew, every merchant\'s invoice, every subcontractor\'s invoice and the skips. Added up, it gives the job\'s profit.', fields: {
      Job: 'The job.', 'Entry Date': 'The day of the cost or the bill; for labour, the Friday of the week.',
      Kind: 'Contract, Variation or Contingency (the job\'s value); Labour, Materials, Plant or Subcontract (its costs).',
      Supplier: 'The merchant, hire firm or subcontractor who sent the bill.', Staff: 'For labour, the person whose week it is.',
      Description: 'What the cost is for.', 'Their Ref': 'The supplier\'s own invoice number.', Hours: 'For labour, the hours worked on the job that week.',
      Net: 'The amount before VAT. Below nought for work taken out or the contingency credited back.', VAT: 'The VAT on a bill, nought if the supplier is not registered.',
      'Due Date': 'When a bill must be paid.', 'Paid On': 'The day a bill was paid; empty while it is owed.',
    } },
    'Site Diary': { about: 'One entry per job for each working day on site, written by the crew lead.', fields: {
      Job: 'The job.', 'Diary Date': 'The day.', Weather: 'The weather, which explains many delays.', 'On Site': 'The crew and subcontractors there that day.',
      'Work Done': 'What was done.', Problems: 'Anything that held the work up.', Visitors: 'Building control, the engineer, the client or anyone else who came.',
    } },
  },
  queries: {
    'Enquiries to follow up': 'Enquiries not yet rung back, waiting for a visit, or visited and waiting for a quote, the oldest first, with how many days each has waited.',
    'Site visits, next 14 days': 'Visits booked for the next fortnight, with the address, phone number and who is going.',
    'Quotes awaiting an answer': 'Quotes sent and not yet accepted or declined, the oldest first, with the days since they went.',
    'Quote success by work': 'For each kind of work, how many quotes were accepted, declined, expired or are still out, and their value: where the firm wins work.',
    'Jobs by stage': 'Jobs booked and on site, with the stage each has reached, its site manager and the days left to the planned finish (below nought means late).',
    'Stage payments due': 'Stages not yet reached that should be in the next 30 days, or are late, with the payment each brings: the money coming in.',
    'Invoiced against contract': 'For each job, the contract sum beside the work invoiced so far before VAT (variations included, retention not taken off), the retention still held, and what has been billed with VAT, paid and is owed.',
    'Unpaid invoices': 'Invoices not yet paid, by due date, with the days overdue (below nought means not due yet).',
    'Variations by job': 'Every variation, job by job, with its reason, amount, extra days and whether it was agreed.',
    'Variations awaiting agreement': 'Variations written up and not yet signed by the client. Get these signed before the work is done.',
    'Job profit': 'Each finished job\'s value (contract, variations, contingency credited back) beside its labour, materials and subcontract costs, and the margin.',
    'Job costs to date': 'The same for jobs on site: the value so far against the costs so far. The margin is only fair once the job is near its end.',
    'Retentions due for release': 'Finished jobs still in their defects period, with when the retention can be released and how much is held. Book the snagging visit before the date.',
    'Subcontractors unpaid bills': 'Subcontractors\' invoices not yet paid, by subcontractor and due date, with what to pay and the days overdue.',
    'Labour by person, last 4 weeks': 'The hours each person was costed to jobs over the last four weeks, and what that cost.',
    'Site diary, last 3 weeks': 'The diary for every job over the last three weeks, newest first.',
    'Invoiced by month': 'Work invoiced each month, with the retention held and the VAT, retention releases left out.',
    'Costs by month': 'Costs charged to jobs each month by kind: labour, materials, plant and subcontract.',
  },
  reports: {
    'Jobs on the go': 'The jobs booked and on site with their stage and finish date, for the Monday meeting.',
    'Quotes to chase': 'Quotes waiting for an answer, with phone numbers, for a round of calls.',
    'Stage payments coming up': 'Stage payments due in the next month, with a total: the cash coming in.',
    'Invoices due': 'Unpaid invoices by client, with days overdue and a total for each.',
    'Contract account': 'Each job\'s contract sum, what has been invoiced, the retention held, paid and owing.',
    'Job profit': 'Finished jobs with their value, costs and margin, and the totals.',
    'Variations register': 'Every variation by job, with the total each job has moved by.',
    'Retentions held': 'The retention held on each job in its defects period, and when it is due.',
    'Subcontractors to pay': 'Subcontractors\' unpaid bills, a section for each, for the payment run.',
    'Site diary': 'The last three weeks\' diary, a section for each job.',
    'Monthly invoicing': 'Work invoiced each month with retention and VAT, and the totals.',
  },
  documents: {
    Quotation: 'The quote sent after a site visit: the work in sections with each line\'s quantity, rate and amount, the price before and with VAT, how long it holds, what it leaves out, and a place for the client to sign. The lines come in their sections, each with its subtotal. It prints for quotes still Sent; any other prints from the Quotes form.',
    Contract: 'The building contract for a job, in plain words: the parties, the works, the price and the contingency, the stage payments as a table, start and finish, variations, retention, defects, the site, insurance, ending the contract and the right to cancel, with signatures. The contingency and retention clauses are worded for what the contract holds. It prints for live contracts (every job not yet Closed), repairs included. It is a starting point: have it checked by someone who knows the law where you work.',
    'Stage invoice': 'The VAT invoice for a deposit, a stage, completion or the retention release: the stage payment, the variations agreed since the last invoice, the contingency credited at the end, the retention taken off, the VAT and the total due, with how to pay while it is owed or the day it was paid.',
    'Variation order': 'A change to a contract for the client to sign before the work is done: what changes, why, what it adds to or takes off the price, and the extra working days when there are any. It prints for variations still Proposed; one agreed prints from the Variations form.',
    Statement: 'Each client\'s unpaid invoices, oldest first, with the balance as it builds up to what is owed. A client who owes nothing gets a statement that says so.',
  },
  tutorial: [
    { title: 'Take an enquiry and book a visit', steps: [
      'Open the Clients form. If the caller is new, press New and type their Name, Phone, E-mail and the address of the work.',
      'Open the Enquiries form and press New. Choose the client, type Received On, choose the Work, write what they want in Description and how they heard of you in Source.',
      'Agree a day to visit. Type it in Visit Date, choose who is going in Visited By and set Status to Visit booked.',
      'Each morning open the Site visits, next 14 days query for the visits coming up, with addresses and phone numbers.',
      'After the visit, write what you found in Visit Notes and set Status to Visited.',
    ] },
    { title: 'Price the work and send the quotation', steps: [
      'Open the Quotes form and press New. Type the next Number (QUO-2026-0043 after QUO-2026-0042), choose the Enquiry and the Client, type a Title, the Quote Date and Valid Until, and set Status to Sent.',
      'In Quote Lines add each line: Line (1, 2, 3 in order), Section, Kind (Labour, Materials or Subcontract), Description, Quantity, Unit, Rate and Tax Rate 0.2. End with a Contingency line of about five percent.',
      'Add the lines up into Net, the VAT of each line into VAT, and type Total and Weeks on Site. Write what the price leaves out in Notes.',
      'Open Print templates, choose Quotation, pick the quote and press Print or Save as PDF. Send it, and set the enquiry\'s Status to Quoted.',
      'On Friday open the Quotes to chase report and ring round.',
    ] },
    { title: 'Turn an accepted quote into a contract', steps: [
      'Open the quote in the Quotes form and set Status to Accepted; set the enquiry to Won.',
      'Open the Jobs form and press New. Type the next Number, choose the Quote, Client and Site Manager, copy the Title and Work, and type Signed On, Contract Sum (the quote\'s Net), Contingency, Start Date and Finish Date. Set Status to Booked, Retention Percent and Defects Months.',
      'In Job Stages add the deposit as Stage 0, then each stage with its Name, Payment Percent, Amount and Planned Finish. The amounts must add up to the contract sum.',
      'Open Job Ledger and add a Contract entry for the job with the contract sum as Net.',
      'Open Print templates, choose Contract, pick the job and press Print. Both sign two copies.',
      'Raise the deposit invoice as the next task describes, with Kind Deposit.',
    ] },
    { title: 'Invoice a stage payment', steps: [
      'Each Monday open the Stage payments coming up report to see which stages fall due.',
      'When a stage is reached, open the job in the Jobs form, type Done On on the stage and change Current Stage.',
      'Open the Invoices form and press New. Type the next Number, choose the Job, Client and Stage, set Kind to Stage, and type Invoice Date and Due Date (the date plus the client\'s Payment Days).',
      'In Invoice Lines add the stage payment, then each variation agreed since the last invoice, then a line taking off the retention (a minus amount). On the completion invoice, add a minus line crediting back the contingency.',
      'Type Gross, Retention, Net, VAT and Total on the invoice, and choose this invoice in Invoice on each variation charged.',
      'Open Print templates, choose Stage invoice, pick the invoice and press Print or Save as PDF.',
    ] },
    { title: 'Agree a variation on site', steps: [
      'Open the Variations form and press New. Type the next Number, choose the Job, type Raised On, the Description, Reason, Amount (a minus amount for work taken out) and Extra Days, and leave Status as Proposed.',
      'Open Print templates, choose Variation order, pick it and press Print. The client signs before the work is done.',
      'When it is signed, set Status to Agreed and type Agreed On. Add a Variation entry in Job Ledger with the amount as Net.',
      'The Variations awaiting agreement query shows any still waiting for a signature.',
    ] },
    { title: 'Book costs and keep the diary', steps: [
      'When a merchant\'s or subcontractor\'s invoice comes in, open the Job Ledger form, press New, choose the Job, the Supplier and the Kind (Materials, Plant or Subcontract), and type Entry Date, Description, Their Ref, Net, VAT and Due Date.',
      'On Friday add a Labour entry for each person on each job: the Staff, Hours, and Net at their Hourly Cost.',
      'At the end of each day the crew lead opens the Site Diary form, presses New, chooses the Job and types the Weather, On Site, Work Done, Problems and Visitors.',
      'When you pay a bill, type Paid On. Before each payment run open the Subcontractors to pay report.',
      'Open the Job costs to date query to see how a job on site is doing against its price.',
    ] },
    { title: 'Finish a job and release the retention', steps: [
      'On the last day type Completed On on the job, set Status to Defects period and Current Stage to Finished, and type Retention Due (the completion date plus the defects months).',
      'Raise the completion invoice with the contingency credit, and add a Contingency entry in Job Ledger with the contingency as a minus Net.',
      'Each month open the Retentions held report. Before a retention is due, visit, put right anything on the snagging list, then raise an invoice with Kind Retention for the total held.',
      'Type Retention Released On on the job and set Status to Closed. The Job profit report then shows the job\'s final margin.',
    ] },
    { title: 'See who owes what and send statements', steps: [
      'Open the Invoices due report: every unpaid invoice by client, with days overdue.',
      'When money comes in, open the invoice in the Invoices form and type Paid On.',
      'At the month end open Print templates and choose Statement: each lists the client\'s unpaid invoices and what they owe. Choose the clients who owe something and press Print or Save as PDF.',
      'The Contract account report shows each job\'s contract sum, invoiced, retention held, paid and owing.',
    ] },
  ],
  notes: [
    'Prices and amounts are before VAT throughout, and VAT is charged at the standard rate, 0.2, as it is on work to an existing home in the UK. New-build homes and some other work are charged at a different rate: change Tax Rate on those lines.',
    'The contract sum includes a contingency, but the firm does not keep it: work found on site is charged as variations, and the whole contingency is credited back on the completion invoice. So a job\'s value is the contract sum, plus variations, less the contingency.',
    'Retention is taken off every invoice except the deposit, and released with one invoice of Kind Retention once the defects period is over. Repairs have none.',
    'The Job Ledger holds a job\'s value as well as its costs, so that the Job profit query can add them up in one go. Contract, Variation and Contingency entries are value; Labour, Materials, Plant and Subcontract are costs.',
    'Labour is costed once a week, on Friday, from who was on site; this week\'s labour is not in the ledger until then. Office staff are not costed to jobs.',
    'Stage amounts are worked out when the contract is signed and must add up to the contract sum. Variations do not change them: they are charged on their own lines.',
    'Each print template prints only the records it is for: quotes still Sent, contracts for jobs not yet Closed, variations still Proposed. Invoices and statements print for all. Any record prints from its own form, whatever it is.',
    'Document numbers run in date order with a new run each year. When you type a new one, look at the last number in that table and add one.',
  ],
  faq: [
    { q: 'How do I print the contract for a new job?', a: 'Open Print templates, choose Contract, pick the job and press Print or Save as PDF. Its stage payments come from Job Stages, so add those first.' },
    { q: 'How much is a job really making?', a: 'Open the Job profit query for finished jobs, or Job costs to date for jobs on site. Both add up the Job Ledger: the value (contract, variations, contingency credited back) less labour, materials, plant and subcontract.' },
    { q: 'Why is the completion invoice smaller than the stage payment?', a: 'It credits back the contingency held in the contract sum, and takes off the retention. The variations agreed during the job are charged above those lines.' },
    { q: 'What is the difference between Finish Date and Completed On?', a: 'Finish Date is the date planned when the contract was signed. Completed On is the day the work was actually finished. The Site Diary usually says why they differ.' },
    { q: 'How do I see what we owe subcontractors?', a: 'Open the Subcontractors unpaid bills query, or print the Subcontractors to pay report before the payment run. Type Paid On in the Job Ledger as you pay.' },
    { q: 'Can I keep several sites for one client?', a: 'As it stands the address of the work is the client\'s address. Add Site Address, Site City and Site Postcode fields to Jobs for clients with more than one property, and print those in the Contract.' },
    { q: 'How do I start with my own firm?', a: 'Make the sample empty and fill in the Business record with your name, address, VAT number and bank details. Then add your Staff, your Suppliers and subcontractors, and take enquiries as they come.' },
  ],
  empty: 'Start with Business: your firm\'s name, address, VAT number, bank details and payment terms, which every document prints. Then Staff with their crews and hourly costs, and Suppliers: your merchants, hire firms and subcontractors. Clients and Enquiries come in as people ring; Quotes and their lines follow the site visits; Jobs, their stages, invoices, variations, ledger entries and the site diary follow when a quote is accepted.',
  adapt: [
    'Hold retention on the deposit too, or release half of it at completion: add a second Retention invoice and change the contract\'s clause 6 to match.',
    'Keep the subcontractors\' own retention: add a Retention field to Job Ledger for what you hold back from them, and a query of what you owe them later.',
    'Value work by applications for payment instead of fixed stages: add a Valuations table (job, date, value of work done) and invoice the difference from the last one.',
    'Track plant and tools: add a Plant table and a Plant field to Job Ledger for hired or owned machines, with a day rate.',
    'Record snags: add a Snags table pointing at Jobs, with what, when reported and when put right, and print it for the defects visit.',
    'Work on new builds: give those lines a Tax Rate of nought, and add a Plot field to Jobs.',
    'Plan the crews: add a Crew field to Jobs and a query of start and finish dates by crew to see who is free when.',
  ],
};

/**
 * What each kind of work is quoted from. Stages: [name, share of the time on
 * site when it is reached, percent of the contract sum paid then]; the first
 * is the deposit, paid on signing. Lines: [stage, section, kind, description,
 * unit, quantity from the size, rate]. Sizes are floor areas in square metres.
 */
const WORK = {
  Extension: {
    size: [12, 32], crews: ['A', 'B'], span: 1.6, retention: 5, defects: 6, accept: 0.4, answer: [5, 25], valid: 60,
    title: (s) => `Single-storey rear extension, about ${s} m2`,
    notes: 'Price assumes planning permission is in place or not needed. Building control fees are paid by the client. Floor finishes and decorating are not included.',
    describe: () => 'Wants a single-storey extension across the back of the house for a bigger kitchen and dining room.',
    visit: (s) => `Measured the back of the house: about ${s} m2 of extension. Access down the side for a dumper. Soil pipe and a gully on the back wall to move.`,
    stages: [['Deposit on signing', 0, 10], ['Foundations and slab', 0.22, 20], ['Walls to wall plate', 0.45, 20], ['Roof on and watertight', 0.65, 20], ['First fix and plastering', 0.85, 15], ['Completion', 1, 15]],
    lines: [
      [1, 'Preliminaries', 'Labour', 'Set up site, hoarding, protection and welfare', 'item', () => 1, 850],
      [1, 'Preliminaries', 'Materials', 'Skips, 8 yard, delivered and taken away', 'each', (s) => Math.ceil(s / 7), 320],
      [1, 'Preliminaries', 'Subcontract', 'Scaffolding, erect, adapt and strike', 'item', () => 1, (s) => 900 + 25 * s],
      [1, 'Groundworks', 'Labour', 'Dig foundations and cart away the spoil', 'm3', (s) => Math.round(s * 0.8), 140],
      [1, 'Groundworks', 'Materials', 'Ready-mix concrete to foundations', 'm3', (s) => Math.round(s * 0.5), 150],
      [1, 'Groundworks', 'Labour', 'Blockwork below ground, oversite and slab', 'm2', (s) => s, 120],
      [1, 'Groundworks', 'Materials', 'Blocks, hardcore, insulation, membrane and screed', 'm2', (s) => s, 95],
      [1, 'Groundworks', 'Subcontract', 'Drainage: new gully, rainwater connected, camera survey', 'item', () => 1, 1150],
      [2, 'Walls and structure', 'Labour', 'Cavity walls in brick and block, to wall plate', 'm2', (s) => Math.round(s * 1.5), 115],
      [2, 'Walls and structure', 'Materials', 'Facing bricks, blocks, cavity insulation, ties and lintels', 'm2', (s) => Math.round(s * 1.5), 88],
      [2, 'Walls and structure', 'Labour', 'Form the opening into the house, with temporary support', 'item', () => 1, 1400],
      [2, 'Walls and structure', 'Subcontract', 'Steel beam over the opening, supplied and fitted, with calculations', 'item', () => 1, 2100],
      [3, 'Roof', 'Labour', 'Flat roof joists, deck, fascia and soffit', 'm2', (s) => s, 85],
      [3, 'Roof', 'Materials', 'Roof timbers, insulation and deck boards', 'm2', (s) => s, 70],
      [3, 'Roof', 'Subcontract', 'Warm roof covering, single-ply membrane, with guarantee', 'm2', (s) => s, 105],
      [3, 'Roof', 'Materials', 'Rooflight, 1000 x 1000, triple glazed', 'each', (s) => (s > 20 ? 2 : 1), 950],
      [3, 'Windows and doors', 'Materials', 'Aluminium folding doors, 3 m, supplied', 'item', () => 1, 4600],
      [3, 'Windows and doors', 'Labour', 'Fit doors and windows, seal and make good', 'item', () => 1, 650],
      [4, 'Services and finishes', 'Subcontract', 'Electrics: first and second fix, lights, sockets, certificate', 'item', () => 1, (s) => 1300 + 45 * s],
      [4, 'Services and finishes', 'Subcontract', 'Heating: two radiators and pipework', 'item', () => 1, 1450],
      [4, 'Services and finishes', 'Subcontract', 'Plastering: board and skim walls and ceiling', 'm2', (s) => Math.round(s * 3), 26],
      [4, 'Services and finishes', 'Materials', 'Plasterboard, timber, fixings and sundries', 'item', () => 1, (s) => 450 + 18 * s],
      [5, 'Services and finishes', 'Labour', 'Second fix carpentry: skirting, architraves, internal door', 'item', () => 1, 1100],
      [5, 'Services and finishes', 'Labour', 'Knock through, clean, snag and hand over', 'item', () => 1, 650],
    ],
    variations: [
      ['Two extra double sockets and an outside light on the back wall.', 'Asked for by the client', [240, 380], 0, 'Electrics'],
      ['Folding doors changed to slim-frame glazing, as the client chose at the showroom.', 'Asked for by the client', [900, 1600], 0, 'Materials'],
      ['Soft ground found at 1 m: foundations taken down to 1.6 m as building control asked.', 'Found on site', [1200, 2400], 3, 'Materials'],
      ['A second rooflight over the dining table.', 'Asked for by the client', [950, 1150], 1, 'Materials'],
      ['Old clay drain found across the foundation: cut out and re-laid in plastic around it.', 'Found on site', [450, 850], 1, 'Drains'],
      ['Underfloor heating in place of the two radiators.', 'Asked for by the client', [650, 1100], 0, 'Plumbing'],
      ['Client will lay their own floor tiles: tile adhesive and levelling taken out.', 'Asked for by the client', [-600, -300], 0, null],
    ],
  },
  'Loft conversion': {
    size: [18, 34], crews: ['A', 'B'], span: 1.6, retention: 5, defects: 6, accept: 0.4, answer: [5, 25], valid: 60,
    title: () => 'Loft conversion with rear dormer and shower room',
    notes: 'Price includes the structural calculations and a made-to-measure staircase. Building control fees and any party wall surveyor are paid by the client.',
    describe: () => 'Loft conversion with a dormer at the back for a bedroom and a small shower room.',
    visit: (s) => `Went up into the loft: about ${s} m2 usable once converted. Head height fine at the ridge. Water tank to move. Neighbour shares the chimney.`,
    stages: [['Deposit on signing', 0, 10], ['Steels, floor and stairs opening', 0.25, 25], ['Dormer framed and roof watertight', 0.5, 25], ['First fix and insulation', 0.7, 15], ['Plastered, stairs fitted', 0.85, 15], ['Completion', 1, 10]],
    lines: [
      [1, 'Preliminaries', 'Subcontract', 'Scaffolding with a roof cover, erect and strike', 'item', () => 1, (s) => 1800 + 20 * s],
      [1, 'Preliminaries', 'Materials', 'Skips, 8 yard, delivered and taken away', 'each', (s) => Math.ceil(s / 9), 320],
      [1, 'Preliminaries', 'Labour', 'Protect the house, set up and clear the loft', 'item', () => 1, 1100],
      [1, 'Structure', 'Subcontract', 'Steel beams, supplied and fitted, with calculations', 'item', () => 1, 2400],
      [1, 'Structure', 'Labour', 'New floor joists, boarding and stairs opening', 'm2', (s) => s, 95],
      [1, 'Structure', 'Materials', 'Floor joists, boards, hangers and fixings', 'm2', (s) => s, 55],
      [2, 'Dormer and roof', 'Labour', 'Open the roof, frame and sheath the dormer', 'm2', (s) => Math.round(s * 0.6), 260],
      [2, 'Dormer and roof', 'Materials', 'Dormer timbers, sheathing, felt and battens', 'm2', (s) => Math.round(s * 0.6), 95],
      [2, 'Dormer and roof', 'Subcontract', 'Dormer roof covering, tile hanging and lead work', 'item', () => 1, (s) => 1600 + 30 * s],
      [2, 'Dormer and roof', 'Materials', 'Dormer windows and two rooflights', 'item', () => 1, 2200],
      [3, 'Services', 'Subcontract', 'Electrics: first and second fix, smoke alarms, certificate', 'item', () => 1, (s) => 1400 + 40 * s],
      [3, 'Services', 'Subcontract', 'Plumbing and heating: radiators and shower room', 'item', () => 1, 2600],
      [3, 'Insulation and boarding', 'Materials', 'Insulation boards, plasterboard and fire doors', 'm2', (s) => Math.round(s * 2.5), 32],
      [3, 'Insulation and boarding', 'Labour', 'Insulate and board walls and ceilings', 'm2', (s) => Math.round(s * 2.5), 30],
      [4, 'Finishes', 'Subcontract', 'Plastering: board and skim', 'm2', (s) => Math.round(s * 3), 26],
      [4, 'Finishes', 'Materials', 'Staircase, made to measure', 'item', () => 1, 2100],
      [4, 'Finishes', 'Labour', 'Fit staircase, balustrade and fire doors', 'item', () => 1, 1600],
      [4, 'Finishes', 'Subcontract', 'Shower room tiling', 'm2', () => 12, 62],
      [5, 'Finishes', 'Labour', 'Second fix carpentry, snag and clean', 'item', () => 1, 1300],
    ],
    variations: [
      ['Extra rooflight over the landing.', 'Asked for by the client', [900, 1100], 1, 'Materials'],
      ['Rotten rafters found by the chimney: cut out and replaced.', 'Found on site', [380, 900], 1, 'Materials'],
      ['Built-in wardrobes in the eaves on both sides.', 'Asked for by the client', [1400, 2200], 3, 'Materials'],
      ['Water tank moved and new feeds run, as it sat where the stairs land.', 'Found on site', [420, 700], 1, 'Plumbing'],
      ['Client will decorate: mist coat and paint taken out.', 'Asked for by the client', [-800, -500], 0, null],
    ],
  },
  Kitchen: {
    size: [9, 20], crews: ['C'], span: 1.4, retention: 5, defects: 3, accept: 0.36, answer: [3, 15], valid: 30,
    title: (s, knock) => (knock ? 'Kitchen knock-through and refit' : 'Kitchen refit'),
    notes: 'Kitchen units, worktops and appliances are supplied by the client; we fit them. Tiles at up to 30 a square metre.',
    describe: () => 'New kitchen going in, and perhaps the wall to the dining room taken out. Units bought already.',
    visit: (s) => `Kitchen about ${s} m2. Looked at the wall to the dining room: load bearing, will need a steel. Old wiring in the kitchen.`,
    stages: [['Deposit on signing', 0, 25], ['Strip out and first fix', 0.4, 35], ['Completion', 1, 40]],
    lines: [
      [1, 'Strip out', 'Labour', 'Strip out the old kitchen, protect floors', 'item', () => 1, 650],
      [1, 'Strip out', 'Materials', 'Skip, 6 yard', 'each', () => 1, 320],
      [1, 'Structure', 'Labour', 'Take out the wall to the dining room, form the opening, make good', 'item', () => 1, 1900, 'knock'],
      [1, 'Structure', 'Subcontract', 'Steel beam over the opening, with calculations', 'item', () => 1, 1650, 'knock'],
      [1, 'Services', 'Subcontract', 'Electrics: new circuits, sockets and lighting', 'item', () => 1, (s) => 950 + 40 * s],
      [1, 'Services', 'Subcontract', 'Plumbing: sink, dishwasher and washing machine feeds', 'item', () => 1, 680],
      [2, 'Walls and floor', 'Subcontract', 'Plastering: skim walls and ceiling', 'm2', (s) => Math.round(s * 2.6), 24],
      [2, 'Walls and floor', 'Labour', 'Level the floor and lay engineered oak', 'm2', (s) => s, 42],
      [2, 'Walls and floor', 'Materials', 'Engineered oak flooring, underlay and beads', 'm2', (s) => s, 58],
      [2, 'Fitting', 'Labour', 'Fit units, worktops, appliances and sink', 'item', () => 1, (s) => 1400 + 60 * s],
      [2, 'Fitting', 'Materials', 'Fixings, sealants, trims and sundries', 'item', () => 1, 380],
      [2, 'Fitting', 'Subcontract', 'Wall tiling between units', 'm2', () => 7, 60],
      [2, 'Finishes', 'Labour', 'Decorate, snag and clean', 'item', () => 1, 650],
    ],
    variations: [
      ['Three pendant lights over the island on their own switch.', 'Asked for by the client', [180, 320], 0, 'Electrics'],
      ['Rotten joists found under the old sink: replaced before the floor went down.', 'Found on site', [350, 650], 1, 'Materials'],
      ['Lights under the wall cupboards.', 'Asked for by the client', [220, 380], 0, 'Electrics'],
      ['Client supplies own flooring: flooring material taken out, fitting kept.', 'Asked for by the client', [-700, -400], 0, null],
    ],
  },
  Bathroom: {
    size: [4, 8], crews: ['C'], span: 1.4, retention: 5, defects: 3, accept: 0.3, answer: [3, 15], valid: 30,
    title: (s) => (s <= 5 ? 'En-suite shower room' : 'Bathroom refit with walk-in shower'),
    notes: 'Price includes the bathroom suite listed and tiles at up to 30 a square metre. The client chooses the tiles and suite at the merchant\'s showroom.',
    describe: () => 'Bathroom refit: bath out, a walk-in shower in, new tiles.',
    visit: (s) => `Bathroom about ${s} m2. Floor bounces by the bath, boards may be rotten. Combi boiler, pressure good for a shower.`,
    stages: [['Deposit on signing', 0, 25], ['Strip out and first fix', 0.45, 35], ['Completion', 1, 40]],
    lines: [
      [1, 'Strip out', 'Labour', 'Strip out the bathroom, protect the stairs and landing', 'item', () => 1, 550],
      [1, 'Strip out', 'Materials', 'Skip, 4 yard', 'each', () => 1, 260],
      [1, 'First fix', 'Subcontract', 'Plumbing first fix: new waste and supplies', 'item', () => 1, 950],
      [1, 'First fix', 'Subcontract', 'Electrics: extractor fan, lights and shaver point', 'item', () => 1, 520],
      [1, 'First fix', 'Labour', 'Board and tank walls, box in pipes, level the floor', 'm2', (s) => Math.round(s * 3), 45],
      [1, 'First fix', 'Materials', 'Waterproof board, tanking kit and timber', 'm2', (s) => Math.round(s * 3), 28],
      [2, 'Fitting', 'Materials', 'Shower tray and screen, basin, WC, taps and shower valve', 'item', () => 1, (s) => 1800 + 120 * s],
      [2, 'Fitting', 'Subcontract', 'Plumbing second fix and testing', 'item', () => 1, 750],
      [2, 'Fitting', 'Subcontract', 'Tiling walls and floor', 'm2', (s) => Math.round(s * 4), 62],
      [2, 'Fitting', 'Materials', 'Tiles, adhesive, grout and trims', 'm2', (s) => Math.round(s * 4), 42],
      [2, 'Fitting', 'Labour', 'Fit the suite, boxing, door and skirting', 'item', () => 1, 600],
      [2, 'Finishes', 'Labour', 'Decorate, seal, snag and clean', 'item', () => 1, 400],
    ],
    variations: [
      ['Heated towel rail on its own fused spur.', 'Asked for by the client', [260, 420], 0, 'Electrics'],
      ['Rotten floorboards found under the bath: replaced with ply.', 'Found on site', [220, 420], 1, 'Materials'],
      ['A tiled niche in the shower wall for bottles.', 'Asked for by the client', [180, 300], 0, 'Tiling'],
    ],
  },
  Repair: {
    crews: ['D'], span: 1, retention: 0, defects: 3, accept: 0.6, answer: [1, 7], valid: 30,
    notes: 'Price for the work described. Anything else we find is priced and agreed with you before it is done.',
    stages: [['Completion', 1, 100]],
  },
};
// Repairs: [title, lines: [kind, description, unit, quantity, rate]].
const REPAIRS = [
  ['Chimney repointed and new lead flashings', [['Subcontract', 'Scaffold to the chimney', 'item', 1, 650], ['Labour', 'Rake out and repoint the stack, reset the pots', 'item', 1, 780], ['Materials', 'Lead flashing, mortar and sundries', 'item', 1, 240]]],
  ['Rotten window sill replaced', [['Labour', 'Cut out and replace the sill, make good', 'item', 1, 380], ['Materials', 'Hardwood sill, resin and paint', 'item', 1, 120]]],
  ['Garden wall rebuilt', [['Labour', 'Take down and rebuild the wall', 'm', 6, 160], ['Materials', 'Bricks, coping and mortar', 'm', 6, 70], ['Materials', 'Skip, 4 yard', 'each', 1, 260]]],
  ['Damp treatment to the front room', [['Subcontract', 'Injected damp proof course', 'item', 1, 780], ['Labour', 'Hack off and replaster', 'm2', 12, 38], ['Materials', 'Renovating plaster and beads', 'item', 1, 160]]],
  ['Garage flat roof re-covered', [['Subcontract', 'Strip and re-cover in single-ply membrane', 'm2', 18, 85], ['Labour', 'Renew the fascia board', 'item', 1, 260], ['Materials', 'Fascia board and trims', 'item', 1, 140]]],
  ['Back door and frame replaced', [['Materials', 'Composite door and frame, supplied', 'item', 1, 1150], ['Labour', 'Fit the door and frame, make good', 'item', 1, 420]]],
  ['Storm damage: slipped tiles and ridge', [['Subcontract', 'Scaffold tower', 'item', 1, 280], ['Labour', 'Replace slipped tiles, re-bed the ridge', 'item', 1, 540], ['Materials', 'Tiles, ridge mortar and sundries', 'item', 1, 110]]],
  ['Three internal doors hung', [['Materials', 'Oak-veneer doors, linings and handles', 'each', 3, 190], ['Labour', 'Fit linings and hang doors', 'each', 3, 160]]],
  ['Side wall re-rendered', [['Subcontract', 'Scaffold to the side wall', 'item', 1, 620], ['Labour', 'Hack off and re-render', 'm2', 20, 58], ['Materials', 'Render, beads and mesh', 'm2', 20, 18]]],
];

/** The firm's own people: [trade, hourly cost with holiday and insurance, crew]. */
const STAFF = [
  ['Contracts Manager', 32, null], ['Office Manager', 17, null],
  ['Site Foreman', 24, 'A'], ['Carpenter', 22, 'A'], ['Labourer', 15, 'A'],
  ['Bricklayer', 22.5, 'B'], ['General Builder', 20, 'B'], ['Labourer', 14.5, 'B'],
  ['Joiner and Fitter', 21, 'C'], ['Apprentice', 10.5, 'C'],
  ['Maintenance Builder', 19, 'D'],
];
/** Merchants, hire firms and subcontractors: [key, name, kind, trade, payment days, VAT registered]. Invented names. */
const SUPPLIERS = [
  ['merchant', 'Avonside Builders Merchants', 'Merchant', 'Building materials', 30, true],
  ['timber', 'Fernhill Timber and Joinery', 'Merchant', 'Timber and joinery', 30, true],
  ['bathroom', 'Coldharbour Plumbing and Bathrooms', 'Merchant', 'Plumbing and bathrooms', 30, true],
  ['skips', 'Downs Skip Hire', 'Hire', 'Skips', 14, true],
  ['Scaffolding', 'Harbourside Scaffolding', 'Subcontractor', 'Scaffolding', 30, true],
  ['Roofing', 'Kestrel Roofing', 'Subcontractor', 'Roofing', 30, true],
  ['Steel', 'Novak Steel Fabrication', 'Subcontractor', 'Structural steel', 30, true],
  ['Electrics', 'Okafor Electrical', 'Subcontractor', 'Electrics', 14, true],
  ['Plumbing', 'Lindqvist Plumbing and Heating', 'Subcontractor', 'Plumbing and heating', 14, true],
  ['Plastering', 'Marchetti Plastering', 'Subcontractor', 'Plastering', 7, false],
  ['Tiling', 'Tanaka Tiling', 'Subcontractor', 'Tiling', 7, false],
  ['Drains', 'Mensah Groundworks and Drainage', 'Subcontractor', 'Groundworks and drains', 30, true],
  ['Damp', 'Fraser Damp Proofing', 'Subcontractor', 'Damp proofing', 30, true],
];
/** Which subcontractor a quote line goes to, by its words. */
const TRADE_OF = [[/scaffold/i, 'Scaffolding'], [/steel/i, 'Steel'], [/electric/i, 'Electrics'], [/plumb|heating/i, 'Plumbing'], [/plaster/i, 'Plastering'],
  [/tiling/i, 'Tiling'], [/drain/i, 'Drains'], [/damp/i, 'Damp'], [/roof|lead work|tile hanging/i, 'Roofing']];
/** Which merchant a material comes from, by its words. */
const MERCHANT_OF = (desc) => (/skip/i.test(desc) ? 'skips' : /timber|joist|board|stair|door|sill|floor|fascia/i.test(desc) ? 'timber' : /shower|basin|tiles|tanking|bath/i.test(desc) ? 'bathroom' : 'merchant');

// What the diary says was done, stage by stage, in the order it happens.
const DIARY = {
  'Foundations and slab': ['Set up site, hoarding and welfare', 'Marked out and dug the foundations', 'Building control passed the trenches; concrete poured', 'Blockwork below ground', 'Drainage laid and tested', 'Hardcore, membrane and insulation laid', 'Slab poured and screeded'],
  'Walls to wall plate': ['Brick and block up to damp course', 'Walls coming up, cavity insulation going in', 'Lintels set over the openings', 'Walls up to wall plate', 'Steel lifted in over the opening into the house'],
  'Roof on and watertight': ['Roof joists in', 'Deck boarded, fascias fixed', 'Roofers laid the membrane', 'Rooflights fitted', 'Folding doors fitted; building watertight'],
  'First fix and plastering': ['Electrician first fix', 'Heating pipework in', 'Plasterboard up', 'Plasterers skimming', 'Plaster drying'],
  'Steels, floor and stairs opening': ['Scaffold and roof cover up', 'Loft cleared, steels lifted in', 'New floor joists fitted', 'Stairs opening cut and trimmed'],
  'Dormer framed and roof watertight': ['Roof opened up for the dormer', 'Dormer framed', 'Dormer sheathed and felted', 'Roofers tile hanging and lead work', 'Windows in, watertight'],
  'First fix and insulation': ['Electrics first fix', 'Plumbing first fix to the shower room', 'Insulation boards in', 'Walls and ceilings boarded'],
  'Plastered, stairs fitted': ['Plasterers in', 'Staircase fitted', 'Shower room tiled', 'Fire doors hung'],
  'Kitchen|Strip out and first fix': ['Old kitchen stripped out, skip filled', 'Wall propped and taken out, steel in', 'Electrics and plumbing first fix', 'Walls boarded and patched'],
  'Kitchen|Completion': ['Plasterers skimmed the walls', 'Floor levelled and oak laid', 'Units going in', 'Worktops fitted', 'Tiler in between the units', 'Appliances connected', 'Decorated, snagged and handed over'],
  'Bathroom|Strip out and first fix': ['Bathroom stripped out, stairs protected', 'Plumbing first fix', 'Walls boarded and tanked'],
  'Bathroom|Completion': ['Shower tray and screen in', 'Tiler on the walls', 'Tiler on the floor', 'Plumbing second fix, all tested', 'Sealed, snagged and handed over'],
  Completion: ['Second fix electrics and heating', 'Skirting and architraves fitted', 'Opening to the house knocked through and made good', 'Snagging list worked through', 'Cleaned through and handed over to the client'],
};
const WEATHER = [
  ['Cold and dry', 'Frost first thing, dry later', 'Rain most of the day', 'Wet and windy', 'Grey and damp'],
  ['Bright and dry', 'Showers', 'Mild and cloudy', 'Rain in the afternoon', 'Dry, windy'],
  ['Hot and dry', 'Warm, light cloud', 'Thundery showers', 'Dry and bright', 'Muggy'],
  ['Dry and mild', 'Rain on and off', 'Windy with heavy showers', 'Fog first thing', 'Cool and bright'],
];
const PROBLEMS = ['Rain stopped work outside after lunch', 'Merchant delivery came a day late', 'Skip not swapped on time, had to wait', 'One of the crew off sick', 'Neighbour asked about the noise; spoke to them and gave the finish date', 'Concrete lorry an hour late', 'Waiting on the client to choose the tiles'];
const VISITORS = ['Building control officer', 'The client walked round with us', 'Structural engineer', 'Neighbour', 'Contracts manager'];
const SOURCES = [['Recommended by a past client', 5], ['Website', 4], ['Saw our board on a job', 2], ['Came back to us', 2], ['Local directory', 1]];
// Towns the firm works in, with the postcode districts there.
const TOWNS = [['Bristol', ['BS3', 'BS4', 'BS5', 'BS6', 'BS7', 'BS9', 'BS16']], ['Bath', ['BA1', 'BA2']], ['Keynsham', ['BS31']], ['Portishead', ['BS20']], ['Clevedon', ['BS21']], ['Thornbury', ['BS35']]];

const slug = (name) => name.toLowerCase().replace(/[^a-z]+/g, '');
const HOURS_A_DAY = 8;

/** How many of something happen today, when on average `rate` do. */
function count(r, rate) {
  const whole = Math.floor(rate);
  return whole + (r.chance(rate - whole) ? 1 : 0);
}

/** An invented street address in one of the firm's towns. */
function place(r) {
  const [city, districts] = r.pick(TOWNS);
  const a = address(r, [{ country: 'United Kingdom', cities: [city], post: () => `${r.pick(districts)} ${r.int(1, 9)}${r.pick(['AB', 'DE', 'FG', 'HJ', 'NP', 'QR', 'TU', 'WX'])}` }]);
  return { Address: a.Address, City: a.City, Postcode: a.Postcode };
}

/** Fill a Kilnside Builders database made from `spec`. `r` is random(), `cal` calendar(). Answers counts. */
export function fill(base, { r, cal, days = 540 }) {
  const counts = {};
  const add = (table, values) => { counts[table] = (counts[table] || 0) + 1; return base.insert(table, values); };
  const update = (table, id, values) => base.update(table, id, values);

  // Working days: Monday to Friday, shut from Christmas Eve to New Year's Day.
  const opens = new Map();
  const isOpen = (d) => {
    if (!opens.has(d)) {
      const t = cal.at(d);
      const w = t.getDay();
      opens.set(d, w !== 0 && w !== 6 && !((t.getMonth() === 11 && t.getDate() >= 24) || (t.getMonth() === 0 && t.getDate() === 1)));
    }
    return opens.get(d);
  };
  const nextOpen = (d) => { let x = d; while (!isOpen(x)) x++; return x; };
  const lastOpen = (d) => { let x = d; while (!isOpen(x)) x--; return x; };
  /** The working day `n` working days after `d` (nought: `d`, or the next open day). */
  const addWork = (d, n) => { let x = nextOpen(d); for (let i = 0; i < n; i++) x = nextOpen(x + 1); return x; };
  const day = (d) => (d == null ? null : cal.day(d));
  const season = (d) => [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 0][cal.at(d).getMonth()];

  add('Business', businessRecord({
    name: 'Kilnside Builders', domain: 'kilnside.example', phone: '07700 900410',
    address: { Address: 'Yard 2, Station Road', City: 'Bristol', Postcode: 'BS5 9QR', Country: 'United Kingdom' },
    terms: 'Payment within the days set out in your contract, from the invoice date.',
    footer: 'Kilnside Builders, registered in England. Insured for public liability. Thank you for having us in your home; please tell us of anything that is not right.',
  }));

  // Staff, and the crews they work in.
  const crews = { A: [], B: [], C: [], D: [] };
  const staff = STAFF.map(([trade, rate, crew], i) => {
    const p = person(r, { domain: 'kilnside.example' });
    const s = { trade, rate, crew, name: `${p['First Name']} ${p['Last Name']}` };
    s.id = add('Staff', { ...p, Trade: trade, Crew: crew, 'Hourly Cost': rate, Phone: `07700 900${String(420 + i * 3).padStart(3, '0')}`, Started: cal.day(-days - r.int(200, 4000)) });
    if (crew) crews[crew].push(s);
    return s;
  });
  const boss = staff[0];
  const foreman = staff[2];
  const crewList = Object.entries(crews).map(([key, members]) => ({ key, members, lead: members[0], dayCost: members.reduce((t, m) => t + m.rate * HOURS_A_DAY, 0), free: -days - 60 }));
  const crewOf = Object.fromEntries(crewList.map((c) => [c.key, c]));

  // Merchants, hire firms and subcontractors.
  const suppliers = {};
  for (const [key, name, kind, trade, terms, vat] of SUPPLIERS) {
    const c = person(r, { domain: `${slug(name)}.example` });
    suppliers[key] = { name, kind, terms, vat, initials: name.split(' ').map((w) => w[0]).join('').slice(0, 3) };
    suppliers[key].id = add('Suppliers', {
      Name: name, Kind: kind, Trade: trade, Contact: `${c['First Name']} ${c['Last Name']}`, Phone: phoneFor(r, 'United Kingdom'),
      'E-mail': `${kind === 'Subcontractor' ? 'office' : 'accounts'}@${slug(name)}.example`, ...place(r), 'Payment Days': terms, 'VAT Registered': vat,
    });
  }

  // Clients come with their enquiries; some come back for more work.
  const clients = [];
  const newClient = () => {
    const p = person(r);
    const landlord = r.chance(0.08);
    const c = { name: `${p['First Name']} ${p['Last Name']}`, terms: landlord ? 14 : 7, slow: r.chance(0.3), jobs: 0 };
    c.id = add('Clients', {
      Name: c.name, Phone: phoneFor(r, 'United Kingdom'), 'E-mail': p['E-mail'], ...place(r), 'Payment Days': c.terms,
      Notes: landlord ? 'Landlord: the house is let. Tell the tenant two days before any visit.' : null,
    });
    clients.push(c);
    return c;
  };

  // A quote from the templates: its lines priced, its labour turned into days for a crew.
  const price = (work, size, knock, repair) => {
    const w = WORK[work];
    const lines = [];
    if (repair) {
      const scale = 0.8 + r.next() * 0.6;
      for (const [kind, desc, unit, qty, rate] of repair[1]) lines.push({ stage: 1, section: 'The work', kind, desc, unit, qty, rate: Math.round(rate * scale) });
    } else {
      for (const [stage, section, kind, desc, unit, qty, rate, only] of w.lines) {
        if (only === 'knock' && !knock) continue;
        lines.push({ stage, section, kind, desc, unit, qty: qty(size), rate: Math.round(typeof rate === 'function' ? rate(size) : rate) });
      }
    }
    for (const l of lines) l.amount = money(l.qty * l.rate);
    let contingency = 0;
    if (!repair) {
      contingency = Math.round(lines.reduce((t, l) => t + l.amount, 0) * 0.05 / 10) * 10;
      lines.push({ stage: null, section: 'Contingency', kind: 'Contingency', desc: 'Contingency for work that cannot be seen before we start, spent only as agreed variations', unit: 'item', qty: 1, rate: contingency, amount: contingency });
    }
    const net = money(lines.reduce((t, l) => t + l.amount, 0));
    const vat = money(lines.reduce((t, l) => t + money(l.amount * STANDARD_RATE), 0));
    // Labour is quoted at what the crew costs with about half again on top.
    const crewCost = w.crews.reduce((t, k) => t + crewOf[k].dayCost, 0) / w.crews.length;
    const labour = lines.filter((l) => l.kind === 'Labour').reduce((t, l) => t + l.amount, 0);
    const crewDays = Math.max(1, Math.round(labour / (crewCost * 1.45)));
    const span = Math.max(1, Math.ceil(crewDays * w.span));
    return { lines, net, vat, total: money(net + vat), contingency, crewDays, span, weeks: Math.max(1, Math.ceil(span / 5)) };
  };

  // Enquiries, day by day; what becomes of each is decided as it comes in.
  const enquiries = [];
  const enquiry = (d, force = null) => {
    const work = force?.work || r.weighted([['Extension', 20], ['Loft conversion', 15], ['Kitchen', 16], ['Bathroom', 17], ['Repair', 32]]);
    const w = WORK[work];
    const past = clients.filter((c) => c.jobs > 0);
    const client = past.length > 5 && r.chance(0.1) ? r.pick(past) : newClient();
    const repair = work === 'Repair' ? r.pick(REPAIRS) : null;
    const size = repair ? 0 : r.int(w.size[0], w.size[1]);
    const knock = work === 'Kitchen' && r.chance(0.45);
    const e = { d, client, work, size, knock, repair, source: client.jobs ? 'Came back to us' : r.weighted(SOURCES), status: 'New', visit: null, visitor: null, quote: null };
    e.desc = repair ? `${repair[0]}.` : w.describe();
    enquiries.push(e);
    if (force?.visit != null) {
      e.visit = force.visit;
    } else {
      if (d >= -1) return e;
      // A few are not work the firm takes on: too small, too far, or a job for a specialist.
      if (r.chance(0.07)) { e.status = 'Not for us'; return e; }
      e.visit = addWork(d + 1, r.int(1, 7));
    }
    e.visitor = repair && r.chance(0.5) ? foreman : boss;
    e.visitNotes = repair ? `Looked at it: ${repair[0].toLowerCase()}. Straightforward, two or three days.` : w.visit(size);
    if (e.visit > 0) { e.status = 'Visit booked'; return e; }
    const q = force?.quoteOn ?? addWork(e.visit + 1, repair ? r.int(0, 3) : r.int(4, 12));
    if (q > 0) { e.status = 'Visited'; return e; }
    const priced = price(work, size, knock, repair);
    const quote = { q, e, client, work, ...priced, title: repair ? repair[0] : w.title(size, knock), notes: w.notes, valid: q + w.valid, status: 'Sent', answered: null };
    e.quote = quote;
    e.status = 'Quoted';
    if (force?.sent) return e;
    const a = q + r.int(w.answer[0], w.answer[1]);
    if (r.chance(w.accept)) {
      if (a <= 0) { quote.status = 'Accepted'; quote.answered = a; e.status = 'Won'; client.jobs++; }
    } else if (r.chance(0.55)) {
      if (a <= 0) { quote.status = 'Declined'; quote.answered = a; e.status = 'Lost'; }
    } else if (quote.valid <= 0) { quote.status = 'Expired'; e.status = 'Lost'; }
    return e;
  };
  const MONTH = [0.7, 0.8, 1.2, 1.3, 1.3, 1.2, 1.0, 0.8, 1.1, 1.0, 0.8, 0.5];
  for (let d = -days - 75; d <= 0; d++) {
    const rate = 0.5 * MONTH[cal.at(d).getMonth()] * (isOpen(d) ? 1 : 0.45);
    for (let k = 0, n = count(r, rate); k < n; k++) enquiry(d);
  }
  // Always a few quotes out and visits booked, whatever the day.
  while (enquiries.filter((e) => e.quote?.status === 'Sent').length < 3) {
    const v = lastOpen(-r.int(6, 12));
    enquiry(v - r.int(2, 6), { work: r.pick(['Extension', 'Kitchen', 'Bathroom', 'Repair']), visit: v, quoteOn: lastOpen(-r.int(1, 4)), sent: true });
  }
  while (!enquiries.some((e) => e.status === 'Visit booked' && e.visit <= 14)) enquiry(-r.int(0, 2), { visit: addWork(1, r.int(0, 2)) });

  // Accepted quotes become jobs in the order they were accepted, each given
  // to the crew that is free first. A client who would wait more than about
  // four months for a start goes elsewhere.
  const jobs = [];
  for (const quote of enquiries.map((e) => e.quote).filter((x) => x?.status === 'Accepted').sort((a, b) => a.answered - b.answered)) {
    const w = WORK[quote.work];
    const a = quote.answered;
    const crew = w.crews.map((k) => crewOf[k]).reduce((x, y) => (y.free < x.free ? y : x));
    const lead = quote.work === 'Repair' ? r.int(3, 12) : quote.work === 'Kitchen' || quote.work === 'Bathroom' ? r.int(10, 25) : r.int(14, 35);
    const start = nextOpen(Math.max(a + lead, crew.free + 1));
    if (start - a > 120) { quote.status = 'Declined'; quote.e.status = 'Lost'; quote.notes += ' Declined: the client could not wait for a start date.'; continue; }
    // Weather and the unexpected stretch most jobs a little; winter more.
    const winter = [11, 0, 1].includes(cal.at(start).getMonth());
    const slip = Math.round(quote.span * r.next() * (winter ? 0.2 : 0.1)) + (r.chance(0.15) ? r.int(2, 6) : 0);
    const actual = quote.span + slip;
    const onSite = [];
    for (let i = 0, x = start; i < actual; i++, x = nextOpen(x + 1)) onSite.push(x);
    crew.free = onSite[actual - 1];
    const job = { quote, a, start, crew, onSite, plannedFinish: addWork(start, quote.span - 1), completed: onSite[actual - 1], w, variations: [] };
    // The deposit is stage nought; where there is none, the stages count from one.
    const firstIsDeposit = w.stages[0][1] === 0;
    job.stages = w.stages.map(([name, share, pct], i) => {
      const deposit = i === 0 && firstIsDeposit;
      const k = firstIsDeposit ? i : i + 1;
      return { k, name, pct, deposit, planned: deposit ? a : addWork(start, Math.max(0, Math.ceil(share * quote.span) - 1)), done: deposit ? a : onSite[Math.max(0, Math.ceil(share * actual) - 1)] };
    });
    let left = quote.net;
    for (const s of job.stages) { s.amount = s === job.stages[job.stages.length - 1] ? money(left) : money(quote.net * s.pct / 100); left -= s.amount; }
    jobs.push(job);
  }

  // Quotes, numbered in date order a year at a time: QUO-2026-0042.
  const runs = {};
  const numbered = (prefix, d) => { const k = `${prefix}-${cal.at(d).getFullYear()}`; runs[k] = (runs[k] || 0) + 1; return `${k}-${String(runs[k]).padStart(4, '0')}`; };
  for (const e of enquiries) {
    e.id = add('Enquiries', {
      Client: e.client.id, 'Received On': day(e.d), Work: e.work, Description: e.desc, Source: e.source, Status: e.status,
      'Visit Date': day(e.visit), 'Visited By': e.visitor ? e.visitor.id : null, 'Visit Notes': e.visitNotes || null,
    });
  }
  for (const quote of enquiries.map((e) => e.quote).filter(Boolean).sort((a, b) => a.q - b.q || a.e.id - b.e.id)) {
    quote.number = numbered('QUO', quote.q);
    quote.id = add('Quotes', {
      Number: quote.number, Enquiry: quote.e.id, Client: quote.client.id, Title: quote.title, 'Quote Date': day(quote.q), 'Valid Until': day(quote.valid),
      Status: quote.status, 'Weeks on Site': quote.weeks, Net: quote.net, VAT: quote.vat, Total: quote.total, Notes: quote.notes,
    });
    quote.lines.forEach((l, i) => add('Quote Lines', { Quote: quote.id, Line: i + 1, Section: l.section, Kind: l.kind, Description: l.desc, Quantity: l.qty, Unit: l.unit, Rate: l.rate, 'Tax Rate': STANDARD_RATE }));
  }

  // Each job: its contract, stages, variations, invoices, costs and diary.
  // What has happened is what falls before today; the rest is planned.
  const invoices = [];
  const ledger = [];
  const diary = [];
  const variations = [];
  const theirRef = (s) => `${s.initials}-${r.int(10000, 99999)}`;
  // When a bill or an invoice is paid: on time mostly, now and then late, not yet if that is still to come.
  const paidOn = (d, terms, slow) => {
    const at = slow && r.chance(0.7) ? d + terms + r.int(5, 60) : d + r.int(1, Math.max(1, terms + 2));
    return at <= 0 ? at : null;
  };
  const bill = (job, d, kind, s, desc, net) => {
    const due = d + s.terms;
    ledger.push({ job, d, kind, supplier: s.id, desc, ref: theirRef(s), net: money(net), vat: s.vat ? money(net * STANDARD_RATE) : 0, due, paid: paidOn(d, s.terms, r.chance(0.15)) });
  };
  for (const job of jobs.sort((x, y) => x.a - y.a)) {
    const { quote, onSite, w } = job;
    const done = (d) => d <= -1;
    job.number = numbered('JOB', job.a);
    const finished = done(job.completed);
    const retention = w.retention;
    ledger.push({ job, d: job.a, kind: 'Contract', desc: `Contract signed, quotation ${quote.number}`, net: quote.net });

    // Variations, raised while the work goes on and agreed a few days later.
    if (quote.work !== 'Repair') {
      const howMany = { Extension: r.int(1, 4), 'Loft conversion': r.int(1, 3), Kitchen: r.int(0, 2), Bathroom: r.int(0, 1) }[quote.work];
      for (const [desc, reason, [lo, hi], extra, trade] of r.some(w.variations, howMany)) {
        const at = Math.min(onSite.length - 6, r.int(1, Math.max(1, onSite.length - 6)));
        if (at < 0) continue;
        const raised = onSite[at];
        if (raised > 0) continue;
        const amount = Math.round(r.int(lo, hi) / 5) * 5;
        const answer = addWork(raised + 1, r.int(0, 3));
        const status = reason === 'Found on site' || r.chance(0.88) ? (answer <= 0 ? 'Agreed' : 'Proposed') : (answer <= 0 ? 'Rejected' : 'Proposed');
        const v = { job, raised, desc, reason, amount, extra, trade, status, agreed: status === 'Agreed' ? answer : null, invoice: null };
        variations.push(v);
        job.variations.push(v);
      }
    }

    // The deposit when the contract is signed, then each stage as it is reached.
    const held = [];
    for (const s of job.stages) {
      if (!done(s.done) && !(s.deposit && s.done <= 0)) continue;
      const lines = [];
      const what = s.deposit ? `Deposit on signing the contract, ${s.pct}% of the contract sum`
        : job.stages.length === 1 ? `The work as quoted in ${quote.number}: ${quote.title.toLowerCase()}`
          : `Stage ${s.k}: ${s.name.toLowerCase()}, ${s.pct}% of the contract sum`;
      lines.push({ desc: what, amount: s.amount });
      const last = s === job.stages[job.stages.length - 1];
      if (!s.deposit) {
        // Variations agreed since the last invoice go on this one; their numbers are filled in when they are written.
        for (const v of job.variations.filter((x) => x.status === 'Agreed' && !x.billed && x.agreed <= s.done)) {
          v.billed = true;
          lines.push({ desc: v.desc, amount: v.amount, v });
        }
        if (last && quote.contingency) lines.push({ desc: 'Contingency in the contract sum credited back: the work it was held for is charged as variations', amount: -quote.contingency });
      }
      const gross = money(lines.reduce((t, l) => t + l.amount, 0));
      const keep = s.deposit || !retention ? 0 : money(gross * retention / 100);
      if (keep) lines.push({ desc: `Less retention at ${retention}%, released after the defects period`, amount: -keep });
      held.push(keep);
      invoices.push({ job, d: s.done, kind: s.deposit ? 'Deposit' : last ? 'Completion' : 'Stage', stage: s, lines, gross, retention: keep });
      s.invoiced = true;
    }

    // The retention, released when the defects period is over and the snags are put right.
    let status = job.start > 0 ? 'Booked' : finished ? (retention ? 'Defects period' : 'Closed') : 'On site';
    if (finished && quote.contingency) ledger.push({ job, d: job.completed, kind: 'Contingency', desc: 'Contingency credited back on the final invoice', net: -quote.contingency });
    if (finished && retention) {
      const due = cal.at(job.completed);
      job.retentionDue = Math.round((new Date(due.getFullYear(), due.getMonth() + w.defects, due.getDate()) - cal.at(0)) / 86400000);
      const release = addWork(job.retentionDue, r.int(2, 18));
      if (done(release)) {
        const total = money(held.reduce((t, x) => t + x, 0));
        invoices.push({ job, d: release, kind: 'Retention', stage: null, lines: [{ desc: `Release of the retention held on contract ${job.number}: defects period over and snags put right`, amount: total }], gross: total, retention: 0 });
        job.released = release;
        status = 'Closed';
      }
    }
    job.status = status;
    const next = job.stages.find((s) => !done(s.done) && !s.deposit);
    job.current = status === 'Booked' ? 'Not started' : status === 'On site' ? (next ? next.name : 'Completion') : status === 'Defects period' ? 'Finished, in the defects period' : 'Finished';

    // Costs: the crew's labour, posted each Friday for the week; materials as
    // each stage starts; subcontractors' bills as their part is done.
    const crewDays = new Set();
    for (let i = 0; i < onSite.length; i++) if (Math.floor((i + 1) * quote.crewDays / onSite.length) > Math.floor(i * quote.crewDays / onSite.length)) crewDays.add(onSite[i]);
    const weeks = new Map();
    for (const d of crewDays) {
      if (!done(d)) continue;
      const friday = d + ((5 - cal.weekday(d) + 7) % 7);
      if (!done(friday)) continue;
      weeks.set(friday, (weeks.get(friday) || 0) + 1);
    }
    for (const [friday, n] of weeks) {
      for (const m of job.crew.members) {
        const hours = n * HOURS_A_DAY - (r.chance(0.1) ? HOURS_A_DAY : 0);
        if (hours > 0) ledger.push({ job, d: friday, kind: 'Labour', staff: m.id, desc: `Week ending ${cal.day(friday)}, ${hours / HOURS_A_DAY} days on site`, hours, net: money(hours * m.rate) });
      }
    }
    const stageStart = (s) => { const i = job.stages.indexOf(s); return i <= 0 || job.stages[i - 1].deposit ? job.start : job.stages[i - 1].done; };
    for (const l of quote.lines) {
      if (!l.stage) continue;
      const s = job.stages.find((x) => x.k === l.stage) || job.stages[job.stages.length - 1];
      if (l.kind === 'Materials') {
        const d = addWork(stageStart(s), r.int(0, 2));
        if (!done(d)) continue;
        const key = MERCHANT_OF(l.desc);
        bill(job, d, key === 'skips' ? 'Plant' : 'Materials', suppliers[key], `${l.desc}, ${l.qty} ${l.unit}`, l.amount / 1.18 * (0.9 + r.next() * 0.22));
      } else if (l.kind === 'Subcontract') {
        if (!done(s.done)) continue;
        const trade = (TRADE_OF.find(([re]) => re.test(l.desc)) || [null, 'Drains'])[1];
        bill(job, s.done, 'Subcontract', suppliers[trade], l.desc, l.amount / 1.12 * (0.94 + r.next() * 0.1));
      }
    }
    for (const v of job.variations.filter((x) => x.status === 'Agreed')) {
      ledger.push({ job, d: v.agreed, kind: 'Variation', desc: `Variation agreed: ${v.desc}`, net: v.amount });
      const d = addWork(v.agreed + 1, r.int(0, 2));
      if (v.amount <= 0 || !done(d)) continue;
      if (v.trade && suppliers[v.trade]) bill(job, d, 'Subcontract', suppliers[v.trade], `Variation: ${v.desc}`, v.amount * 0.72);
      else bill(job, d, 'Materials', suppliers.merchant, `Materials for a variation: ${v.desc}`, v.amount * 0.5);
    }

    // The site diary, each working day the job is on site.
    for (let i = 0; i < onSite.length; i++) {
      const d = onSite[i];
      if (!done(d)) break;
      const stage = job.stages.find((s) => !s.deposit && s.done >= d) || job.stages[job.stages.length - 1];
      const before = job.stages.filter((s) => !s.deposit && s.done < d);
      const from = before.length ? onSite.indexOf(before[before.length - 1].done) + 1 : 0;
      const to = Math.max(from, onSite.indexOf(stage.done));
      const words = quote.work === 'Repair' ? [`Started: ${quote.title.toLowerCase()}`, 'Work going well', 'Finished and cleared up'] : DIARY[`${quote.work}|${stage.name}`] || DIARY[stage.name] || DIARY.Completion;
      const progress = to > from ? (i - from) / (to - from + 1) : 0;
      const trades = quote.lines.filter((l) => l.kind === 'Subcontract' && l.stage === stage.k).map((l) => (TRADE_OF.find(([re]) => re.test(l.desc)) || [null, 'Drains'])[1].toLowerCase());
      const subsHere = progress > 0.6 && trades.length ? `; ${[...new Set(trades)].join(', ')}` : '';
      const crewHere = crewDays.has(d) ? job.crew.members.map((m) => m.name).join(', ') : 'Crew elsewhere; subcontractors only';
      diary.push({ job, d, weather: r.pick(WEATHER[season(d)]), onSite: `${crewHere}${subsHere}`, work: words[Math.min(words.length - 1, Math.floor(progress * words.length))], problem: r.chance(0.1) ? r.pick(PROBLEMS) : null, visitor: r.chance(0.08) ? r.pick(VISITORS) : null });
    }
  }

  // Always something waiting for the client's signature: a variation raised on a job on site.
  if (!variations.some((v) => v.status === 'Proposed')) {
    const job = jobs.find((j) => j.status === 'On site') || jobs.find((j) => j.status === 'Booked');
    const [desc, reason, [lo, hi], extra, trade] = r.pick(job.w.variations.filter((v) => v[2][0] > 0));
    const raised = Math.max(job.a, lastOpen(-r.int(1, 3)));
    const v = { job, raised, desc, reason, amount: Math.round(r.int(lo, hi) / 5) * 5, extra, trade, status: 'Proposed', agreed: null };
    variations.push(v);
    job.variations.push(v);
  }

  // Jobs, numbered in the order they were signed: JOB-2026-0042.
  for (const job of jobs) {
    job.id = add('Jobs', {
      Number: job.number, Quote: job.quote.id, Client: job.quote.client.id, Title: job.quote.title, Work: job.quote.work, 'Site Manager': job.crew.lead.id,
      'Signed On': day(job.a), 'Contract Sum': job.quote.net, Contingency: job.quote.contingency, 'Start Date': day(job.start), 'Finish Date': day(job.plannedFinish),
      'Completed On': job.completed <= -1 ? day(job.completed) : null, Status: job.status, 'Current Stage': job.current,
      'Retention Percent': job.w.retention, 'Defects Months': job.w.defects, 'Retention Due': day(job.retentionDue ?? null), 'Retention Released On': day(job.released ?? null),
      Notes: job.quote.notes,
    });
    for (const s of job.stages) {
      s.id = add('Job Stages', { Job: job.id, Stage: s.k, Name: s.name, 'Payment Percent': s.pct, Amount: s.amount, 'Planned Finish': day(s.planned), 'Done On': s.done <= -1 || (s.deposit && s.done <= 0) ? day(s.done) : null });
    }
  }
  // Variations, numbered in the order they were raised: VAR-2026-0042.
  for (const v of variations.sort((a, b) => a.raised - b.raised)) {
    v.number = numbered('VAR', v.raised);
    v.id = add('Variations', { Number: v.number, Job: v.job.id, 'Raised On': day(v.raised), Description: v.desc, Reason: v.reason, Amount: v.amount, 'Extra Days': v.extra, Status: v.status, 'Agreed On': day(v.agreed) });
  }
  // Invoices, numbered in date order, with their lines; each line's VAT rounded and added up.
  for (const inv of invoices.sort((a, b) => a.d - b.d || a.job.id - b.job.id)) {
    const net = money(inv.lines.reduce((t, l) => t + l.amount, 0));
    const vat = money(inv.lines.reduce((t, l) => t + money(l.amount * STANDARD_RATE), 0));
    const client = inv.job.quote.client;
    // A deposit is paid before the start; stage payments mostly on time.
    const paid = inv.kind === 'Deposit' ? (inv.d + 3 <= 0 ? inv.d + r.int(1, 3) : null) : paidOn(inv.d, client.terms, client.slow);
    const number = numbered('INV', inv.d);
    const id = add('Invoices', {
      Number: number, Job: inv.job.id, Client: client.id, Stage: inv.stage ? inv.stage.id : null, Kind: inv.kind, 'Invoice Date': day(inv.d),
      'Due Date': day(inv.d + client.terms), Gross: inv.gross, Retention: inv.retention, Net: net, VAT: vat, Total: money(net + vat), 'Paid On': day(paid),
    });
    inv.lines.forEach((l, i) => {
      if (l.v) update('Variations', l.v.id, { Invoice: id });
      add('Invoice Lines', { Invoice: id, Line: i + 1, Description: l.v ? `Variation ${l.v.number}: ${l.v.desc}` : l.desc, Amount: l.amount, 'Tax Rate': STANDARD_RATE });
    });
  }
  for (const x of ledger.sort((a, b) => a.d - b.d)) {
    add('Job Ledger', {
      Job: x.job.id, 'Entry Date': day(x.d), Kind: x.kind, Supplier: x.supplier ?? null, Staff: x.staff ?? null, Description: x.desc, 'Their Ref': x.ref ?? null,
      Hours: x.hours ?? null, Net: x.net, VAT: x.vat ?? null, 'Due Date': day(x.due ?? null), 'Paid On': day(x.paid ?? null),
    });
  }
  for (const x of diary.sort((a, b) => a.d - b.d)) {
    add('Site Diary', { Job: x.job.id, 'Diary Date': day(x.d), Weather: x.weather, 'On Site': x.onSite, 'Work Done': x.work, Problems: x.problem, Visitors: x.visitor });
  }
  return counts;
}

