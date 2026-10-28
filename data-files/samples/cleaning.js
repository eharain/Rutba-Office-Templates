// Rutba Office Sample Databases Licence, not the AGPL: see LICENSE in this folder.
//
// The cleaning company: Fernhollow Cleaning, an invented commercial and
// domestic cleaning business in Leeds with a dozen cleaners. Its clients
// (offices, surgeries, nurseries and showrooms, and households) and their
// sites, a contract for each site (visits a week, hours a visit, the rate,
// the term and the notice), what is to be done there, the rota of visits by
// cleaner, each visit as it went (hours worked and charged, signed off or
// not), extra one-off jobs quoted and done (end of tenancy cleans, carpets,
// ovens), the supplies bought and used, a payslip a month for each cleaner,
// and an invoice a month for each contract.
//
// Its records are fifteen months of cleaning, run a day at a time: visits
// fall on their contract's days and are done, done short, covered by another
// cleaner when the regular one is off, or now and then missed; contracts
// start, renew each year at a new rate, and some end on notice; quotes for
// one-off jobs go out, most are taken, and the job is invoiced when done;
// supplies are used each week and bought when they run low; on the first
// working day of the month each contract is invoiced for the month before,
// and at the month's end each cleaner gets a payslip. The questions a
// cleaning company asks are its saved queries; its reports and print
// templates print them.

import { BUSINESS_ABOUT, BUSINESS_TABLE, businessRecord, companies, money, person, phoneFor } from './util.js';

// Its print templates need Office 2.16.0 or later: they say which records they print and when a line shows.
export const minOffice = '2.16.0';

const ref = (table) => ({ type: 'integer', points: table });
const CLEANER = '[Cleaners].[First Name] & " " & [Cleaners].[Last Name]';
const CHARGE = 'Round(Nz([Hours Charged]) * [Charge Rate], 2)';
// A cleaner's hours at their rate, with the holiday pay of 12.07 percent their payslip adds.
const WAGES = 'Round(Nz([Hours Worked]) * [Pay Rate] * 1.1207, 2)';
const LINE = 'Round([Quantity] * [Unit Price], 2)';
const LINE_VAT = 'Round(Round([Quantity] * [Unit Price], 2) * Nz([Tax Rate]), 2)';
const LETTERHEAD = { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'E-mail', 'Website'] };
const HOLIDAY_PAY = 0.1207;

export const spec = {
  // Where a value below nought is right: supplies going out of the store.
  negative: { 'Supply Movements': ['Quantity'] },
  tables: [
    BUSINESS_TABLE,
    { name: 'Clients', fields: [
      { name: 'Name', type: 'text', required: true }, { name: 'Kind', type: 'text', default: 'Commercial' }, { name: 'Contact Name', type: 'text' },
      { name: 'Address', type: 'text' }, { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' },
      { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Payment Days', type: 'integer', default: 30 },
      { name: 'Client Since', type: 'date' }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Sites', show: ['Name', 'Postcode'], fields: [
      { name: 'Client', ...ref('Clients'), required: true }, { name: 'Name', type: 'text', required: true }, { name: 'Site Type', type: 'text' },
      { name: 'Address', type: 'text' }, { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' },
      { name: 'Site Contact', type: 'text' }, { name: 'Access Notes', type: 'longtext' },
    ] },
    { name: 'Cleaners', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Payroll Ref', type: 'text', unique: true },
      { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Hourly Pay', type: 'currency' },
      { name: 'Most Hours', type: 'number' }, { name: 'Started', type: 'date' }, { name: 'Vetted On', type: 'date' },
      { name: 'Left On', type: 'date' }, { name: 'Active', type: 'yesno', default: true },
    ] },
    // Visits come before Contracts: a query joins two tables by the first relationship between them,
    // so a visit's Cleaners record is the cleaner who went, not the contract's regular cleaner.
    { name: 'Visits', fields: [
      { name: 'Contract', ...ref('Contracts'), required: true }, { name: 'Cleaner', ...ref('Cleaners') }, { name: 'Date', type: 'date', required: true },
      { name: 'Start Time', type: 'text' }, { name: 'Planned Hours', type: 'number' }, { name: 'Hours Worked', type: 'number' },
      { name: 'Hours Charged', type: 'number' }, { name: 'Charge Rate', type: 'currency' }, { name: 'Pay Rate', type: 'currency' },
      { name: 'Status', type: 'text', default: 'Booked' }, { name: 'Signed Off', type: 'yesno' }, { name: 'Signed Off By', type: 'text' },
      { name: 'Notes', type: 'text' }, { name: 'Invoice', ...ref('Invoices') },
    ] },
    { name: 'Contracts', show: ['Number'], fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Client', ...ref('Clients'), required: true }, { name: 'Site', ...ref('Sites'), required: true },
      { name: 'Cleaner', ...ref('Cleaners') }, { name: 'Start Date', type: 'date' }, { name: 'End Date', type: 'date' }, { name: 'Last Renewed', type: 'date' },
      { name: 'Visits per Week', type: 'number' }, { name: 'Days', type: 'text' }, { name: 'Start Time', type: 'text' },
      { name: 'Hours per Visit', type: 'number' }, { name: 'Rate', type: 'currency' }, { name: 'Monthly Estimate', type: 'currency' },
      { name: 'Notice Days', type: 'integer', default: 30 }, { name: 'Status', type: 'text', default: 'Pending' },
      { name: 'Notice Given On', type: 'date' }, { name: 'Ended On', type: 'date' }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Contract Tasks', fields: [
      { name: 'Contract', ...ref('Contracts'), required: true }, { name: 'Order', type: 'integer' }, { name: 'Area', type: 'text' },
      { name: 'Task', type: 'text', required: true }, { name: 'How Often', type: 'text', default: 'Every visit' },
    ] },
    { name: 'Jobs', show: ['Number'], fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Client', ...ref('Clients'), required: true }, { name: 'Site', ...ref('Sites') },
      { name: 'Kind', type: 'text' }, { name: 'Quoted On', type: 'date' }, { name: 'Valid Until', type: 'date' }, { name: 'Booked For', type: 'date' },
      { name: 'Cleaner', ...ref('Cleaners') }, { name: 'Estimated Hours', type: 'number' }, { name: 'Hours Worked', type: 'number' },
      { name: 'Net', type: 'currency' }, { name: 'VAT', type: 'currency' }, { name: 'Total', type: 'currency' },
      { name: 'Status', type: 'text', default: 'Quoted' }, { name: 'Signed Off By', type: 'text' }, { name: 'Notes', type: 'text' },
    ] },
    { name: 'Job Items', fields: [
      { name: 'Job', ...ref('Jobs'), required: true }, { name: 'Description', type: 'text' }, { name: 'Quantity', type: 'number', default: 1 },
      { name: 'Unit Price', type: 'currency' }, { name: 'Tax Rate', type: 'number', default: 0.2 },
    ] },
    { name: 'Invoices', show: ['Number'], fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Client', ...ref('Clients'), required: true }, { name: 'Site', ...ref('Sites') },
      { name: 'Contract', ...ref('Contracts') }, { name: 'Job', ...ref('Jobs') }, { name: 'Period', type: 'text' }, { name: 'Invoice Date', type: 'date' }, { name: 'Due Date', type: 'date' },
      { name: 'Net', type: 'currency' }, { name: 'VAT', type: 'currency' }, { name: 'Total', type: 'currency' },
      { name: 'Paid On', type: 'date' }, { name: 'Status', type: 'text', default: 'Sent' },
    ] },
    { name: 'Invoice Lines', fields: [
      { name: 'Invoice', ...ref('Invoices'), required: true }, { name: 'Date', type: 'date' }, { name: 'Kind', type: 'text' },
      { name: 'Description', type: 'text' }, { name: 'Quantity', type: 'number', default: 1 }, { name: 'Unit Price', type: 'currency' },
      { name: 'Tax Rate', type: 'number', default: 0.2 },
    ] },
    { name: 'Supplies', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Unit', type: 'text' }, { name: 'Unit Cost', type: 'currency' },
      { name: 'Rechargeable', type: 'yesno' }, { name: 'Sell Price', type: 'currency' }, { name: 'In Stock', type: 'integer', default: 0 },
      { name: 'Reorder Level', type: 'integer' }, { name: 'Reorder Quantity', type: 'integer' },
    ] },
    { name: 'Supply Movements', fields: [
      { name: 'Supply', ...ref('Supplies'), required: true }, { name: 'Date', type: 'date' }, { name: 'Kind', type: 'text' },
      { name: 'Quantity', type: 'integer' }, { name: 'Unit Cost', type: 'currency' }, { name: 'Contract', ...ref('Contracts') }, { name: 'Reference', type: 'text' },
    ] },
    { name: 'Payslips', show: ['Number'], fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Cleaner', ...ref('Cleaners'), required: true }, { name: 'Period', type: 'text' },
      { name: 'Period Start', type: 'date' }, { name: 'Period End', type: 'date' }, { name: 'Pay Date', type: 'date' },
      { name: 'Contract Hours', type: 'number' }, { name: 'Job Hours', type: 'number' }, { name: 'Hours', type: 'number' }, { name: 'Gross', type: 'currency' },
    ] },
    { name: 'Payslip Lines', fields: [
      { name: 'Payslip', ...ref('Payslips'), required: true }, { name: 'Description', type: 'text' }, { name: 'Hours', type: 'number' },
      { name: 'Rate', type: 'currency' }, { name: 'Amount', type: 'currency' },
    ] },
  ],
  queries: {
    // Visits, Cleaners, Contracts, then Sites and Clients: each visit joins the cleaner who goes and its own site.
    'Rota, next 7 days': { tables: ['Visits', 'Cleaners', 'Contracts', 'Sites', 'Clients'], columns: [
      { expr: CLEANER, as: 'Cleaner', sort: 'asc' }, { table: 'Visits', field: 'Date', sort: 'asc' }, { table: 'Visits', field: 'Start Time', sort: 'asc' },
      { table: 'Visits', field: 'Planned Hours', as: 'Hours' }, { table: 'Clients', field: 'Name', as: 'Client' }, { table: 'Sites', field: 'Name', as: 'Site' },
      { table: 'Sites', field: 'Address' }, { table: 'Sites', field: 'Postcode' }, { table: 'Visits', field: 'Notes' },
      { table: 'Visits', field: 'Status', criteria: ['Booked'], show: false },
      { expr: 'DateDiff("d", Date(), [Date])', as: 'Days Ahead', criteria: ['Between 0 And 6'], show: false },
    ] },
    'Missed or short visits': { tables: ['Visits', 'Cleaners', 'Contracts', 'Sites', 'Clients'], columns: [
      { table: 'Visits', field: 'Date', sort: 'desc' }, { table: 'Clients', field: 'Name', as: 'Client' }, { table: 'Sites', field: 'Name', as: 'Site' },
      { expr: CLEANER, as: 'Cleaner' }, { table: 'Visits', field: 'Status' }, { table: 'Visits', field: 'Planned Hours' },
      { table: 'Visits', field: 'Hours Worked' }, { table: 'Visits', field: 'Notes', as: 'Reason' },
      { table: 'Visits', field: 'Status', as: 'Outcome', criteria: ['In ("Missed", "Short")'], show: false },
      { expr: 'DateDiff("d", [Date], Date())', as: 'Days Ago', criteria: ['Between 0 And 60'], show: false },
    ] },
    'Hours and pay by cleaner, last month': { tables: ['Payslips', 'Cleaners'], columns: [
      { expr: CLEANER, as: 'Cleaner', sort: 'asc' }, { table: 'Cleaners', field: 'Payroll Ref' }, { table: 'Payslips', field: 'Period' },
      { table: 'Payslips', field: 'Contract Hours' }, { table: 'Payslips', field: 'Job Hours' }, { table: 'Payslips', field: 'Hours' },
      { table: 'Payslips', field: 'Gross' }, { table: 'Payslips', field: 'Pay Date' },
      { expr: 'DateDiff("m", [Period Start], Date())', as: 'Months Ago', criteria: ['1'], show: false },
    ] },
    'Hours by cleaner, last 30 days': { tables: ['Visits', 'Cleaners'], columns: [
      { expr: CLEANER, as: 'Cleaner', total: 'group', sort: 'asc' }, { table: 'Visits', field: 'ID', as: 'Visits', total: 'count' },
      { table: 'Visits', field: 'Planned Hours', as: 'Planned', total: 'sum' }, { table: 'Visits', field: 'Hours Worked', as: 'Worked', total: 'sum' },
      { expr: 'IIf([Status] = "Short", 1, 0)', as: 'Short Visits', total: 'sum' },
      { table: 'Visits', field: 'Status', total: 'where', criteria: ['In ("Done", "Short")'] },
      { expr: 'DateDiff("d", [Date], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 1 And 30'] },
    ] },
    'Contract profitability': { tables: ['Visits', 'Contracts', 'Sites', 'Clients'], columns: [
      { table: 'Clients', field: 'Name', as: 'Client', total: 'group', sort: 'asc' }, { table: 'Sites', field: 'Name', as: 'Site', total: 'group' },
      { table: 'Clients', field: 'Kind', total: 'group' }, { table: 'Visits', field: 'ID', as: 'Visits', total: 'count' },
      { table: 'Visits', field: 'Hours Worked', as: 'Hours', total: 'sum' }, { expr: CHARGE, as: 'Charged', total: 'sum' },
      { expr: WAGES, as: 'Wage Cost', total: 'sum' }, { expr: `${CHARGE} - ${WAGES}`, as: 'Margin', total: 'sum' },
      { table: 'Visits', field: 'Status', total: 'where', criteria: ['In ("Done", "Short")'] },
      { expr: 'DateDiff("d", [Date], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 1 And 90'] },
    ] },
    'Supplies used, last 90 days': { tables: ['Supply Movements', 'Supplies', 'Contracts', 'Sites', 'Clients'], columns: [
      { table: 'Clients', field: 'Name', as: 'Client', total: 'group', sort: 'asc' }, { table: 'Sites', field: 'Name', as: 'Site', total: 'group' },
      { expr: 'Round(-[Quantity] * [Supply Movements].[Unit Cost], 2)', as: 'Cost', total: 'sum' },
      { expr: 'Round(IIf([Rechargeable], -[Quantity] * [Sell Price], 0), 2)', as: 'Recharged', total: 'sum' },
      { table: 'Supply Movements', field: 'Kind', total: 'where', criteria: ['Used'] },
      { expr: 'DateDiff("d", [Date], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 90'] },
    ] },
    'Supplies to reorder': { tables: ['Supplies'], columns: [
      { table: 'Supplies', field: 'Name', as: 'Supply', sort: 'asc' }, { table: 'Supplies', field: 'Unit' }, { table: 'Supplies', field: 'In Stock' },
      { table: 'Supplies', field: 'Reorder Level' }, { table: 'Supplies', field: 'Reorder Quantity' }, { table: 'Supplies', field: 'Unit Cost' },
      { expr: '[In Stock] - [Reorder Level]', as: 'Above Reorder Level', criteria: ['<= 0'], show: false },
    ] },
    'Invoices overdue': { tables: ['Invoices', 'Clients'], columns: [
      { table: 'Invoices', field: 'Number', as: 'Invoice' }, { table: 'Clients', field: 'Name', as: 'Client' }, { table: 'Clients', field: 'Phone' },
      { table: 'Invoices', field: 'Period' }, { table: 'Invoices', field: 'Invoice Date' }, { table: 'Invoices', field: 'Due Date' }, { table: 'Invoices', field: 'Total' },
      { expr: 'DateDiff("d", [Due Date], Date())', as: 'Days Overdue', criteria: ['> 0'], sort: 'desc' },
      { table: 'Invoices', field: 'Paid On', criteria: ['Is Null'], show: false },
    ] },
    'Contracts up for renewal': { tables: ['Contracts', 'Sites', 'Clients'], columns: [
      { table: 'Contracts', field: 'End Date', sort: 'asc' }, { expr: 'DateDiff("d", Date(), [End Date])', as: 'Days Left', criteria: ['Between 0 And 60'] },
      { table: 'Contracts', field: 'Number', as: 'Contract' }, { table: 'Clients', field: 'Name', as: 'Client' }, { table: 'Sites', field: 'Name', as: 'Site' },
      { table: 'Contracts', field: 'Visits per Week' }, { table: 'Contracts', field: 'Hours per Visit' }, { table: 'Contracts', field: 'Rate' },
      { table: 'Contracts', field: 'Monthly Estimate' }, { table: 'Contracts', field: 'Notice Days' },
      { table: 'Contracts', field: 'Status', criteria: ['Active'], show: false },
    ] },
    'Work to invoice': { tables: ['Visits', 'Contracts', 'Clients'], columns: [
      { table: 'Clients', field: 'Name', as: 'Client', total: 'group', sort: 'asc' }, { table: 'Contracts', field: 'Number', as: 'Contract', total: 'group' },
      { table: 'Visits', field: 'Date', as: 'From', total: 'min' }, { table: 'Visits', field: 'ID', as: 'Visits', total: 'count' },
      { table: 'Visits', field: 'Hours Charged', as: 'Hours', total: 'sum' }, { expr: CHARGE, as: 'Value', total: 'sum' },
      { table: 'Visits', field: 'Status', total: 'where', criteria: ['In ("Done", "Short")'] }, { table: 'Visits', field: 'Invoice', total: 'where', criteria: ['Is Null'] },
    ] },
    'Quotes waiting': { tables: ['Jobs', 'Sites', 'Clients'], columns: [
      { table: 'Jobs', field: 'Quoted On', sort: 'asc' }, { table: 'Jobs', field: 'Number', as: 'Quote' }, { table: 'Clients', field: 'Name', as: 'Client' },
      { table: 'Jobs', field: 'Kind' }, { table: 'Sites', field: 'Address' }, { table: 'Jobs', field: 'Total' }, { table: 'Jobs', field: 'Valid Until' },
      { expr: 'DateDiff("d", [Quoted On], Date())', as: 'Days Waiting' }, { table: 'Jobs', field: 'Status', criteria: ['Quoted'], show: false },
    ] },
    'Jobs booked, next 14 days': { tables: ['Jobs', 'Sites', 'Clients', 'Cleaners'], columns: [
      { table: 'Jobs', field: 'Booked For', sort: 'asc' }, { table: 'Jobs', field: 'Number', as: 'Job' }, { table: 'Jobs', field: 'Kind' },
      { table: 'Clients', field: 'Name', as: 'Client' }, { table: 'Sites', field: 'Address' }, { table: 'Sites', field: 'Postcode' },
      { expr: CLEANER, as: 'Cleaner' }, { table: 'Jobs', field: 'Estimated Hours' },
      { table: 'Jobs', field: 'Status', criteria: ['Booked'], show: false },
      { expr: 'DateDiff("d", Date(), [Booked For])', as: 'Days Ahead', criteria: ['Between 0 And 13'], show: false },
    ] },
    'Revenue by month': { tables: ['Invoices'], columns: [
      { expr: 'Format([Invoice Date], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Invoices', field: 'ID', as: 'Invoices', total: 'count' },
      { expr: 'IIf(Nz([Job]) = 0, [Net], 0)', as: 'Contracts', total: 'sum' }, { expr: 'IIf(Nz([Job]) = 0, 0, [Net])', as: 'One-off Jobs', total: 'sum' },
      { table: 'Invoices', field: 'Net', as: 'Net', total: 'sum' }, { table: 'Invoices', field: 'VAT', as: 'VAT', total: 'sum' }, { table: 'Invoices', field: 'Total', as: 'Total', total: 'sum' },
    ] },
    'Active contracts': { tables: ['Contracts', 'Sites', 'Clients', 'Cleaners'], columns: [
      { table: 'Clients', field: 'Kind', sort: 'asc' }, { table: 'Clients', field: 'Name', as: 'Client', sort: 'asc' }, { table: 'Sites', field: 'Name', as: 'Site' },
      { table: 'Contracts', field: 'Number', as: 'Contract' }, { table: 'Contracts', field: 'Days' }, { table: 'Contracts', field: 'Start Time' },
      { table: 'Contracts', field: 'Hours per Visit' }, { table: 'Contracts', field: 'Rate' }, { table: 'Contracts', field: 'Monthly Estimate' },
      { expr: CLEANER, as: 'Regular Cleaner' }, { table: 'Contracts', field: 'Status', criteria: ['In ("Active", "Notice given", "Pending")'] },
    ] },
  },
  reports: [
    { name: 'Rota', title: 'Rota, next 7 days', query: 'Rota, next 7 days', group: 'Cleaner', columns: [{ field: 'Date', type: 'date' }, 'Start Time', { field: 'Hours', type: 'number' }, 'Client', 'Site', 'Address', 'Postcode', 'Notes'], totals: [{ field: 'Hours', fn: 'sum' }] },
    { name: 'Missed and short visits', title: 'Missed and short visits, last 60 days', query: 'Missed or short visits', group: 'Client', columns: [{ field: 'Date', type: 'date' }, 'Site', 'Cleaner', 'Status', { field: 'Planned Hours', type: 'number' }, { field: 'Hours Worked', type: 'number' }, 'Reason'], totals: [{ field: 'Planned Hours', fn: 'sum' }, { field: 'Hours Worked', fn: 'sum' }] },
    { name: 'Pay summary', title: 'Hours and pay, last month', query: 'Hours and pay by cleaner, last month', columns: ['Cleaner', 'Payroll Ref', 'Period', { field: 'Contract Hours', type: 'number' }, { field: 'Job Hours', type: 'number' }, { field: 'Hours', type: 'number' }, { field: 'Gross', type: 'currency' }], totals: [{ field: 'Hours', fn: 'sum' }, { field: 'Gross', fn: 'sum' }] },
    { name: 'Contract profitability', title: 'Contract profitability, last 90 days', query: 'Contract profitability', group: 'Kind', columns: ['Client', 'Site', { field: 'Visits', type: 'integer' }, { field: 'Hours', type: 'number' }, { field: 'Charged', type: 'currency' }, { field: 'Wage Cost', type: 'currency' }, { field: 'Margin', type: 'currency' }], totals: [{ field: 'Charged', fn: 'sum' }, { field: 'Wage Cost', fn: 'sum' }, { field: 'Margin', fn: 'sum' }] },
    { name: 'Overdue invoices', query: 'Invoices overdue', group: 'Client', columns: ['Invoice', 'Period', { field: 'Invoice Date', type: 'date' }, { field: 'Due Date', type: 'date' }, { field: 'Days Overdue', type: 'integer' }, { field: 'Total', type: 'currency' }], totals: [{ field: 'Total', fn: 'sum' }] },
    { name: 'Renewals due', title: 'Contracts up for renewal, next 60 days', query: 'Contracts up for renewal', columns: [{ field: 'End Date', type: 'date' }, 'Contract', 'Client', 'Site', { field: 'Rate', type: 'currency' }, { field: 'Monthly Estimate', type: 'currency' }, { field: 'Notice Days', type: 'integer' }], totals: [{ field: 'Monthly Estimate', fn: 'sum' }] },
    { name: 'Monthly revenue', query: 'Revenue by month', columns: ['Month', { field: 'Invoices', type: 'integer' }, { field: 'Contracts', type: 'currency' }, { field: 'One-off Jobs', type: 'currency' }, { field: 'Net', type: 'currency' }, { field: 'Total', type: 'currency' }], totals: [{ field: 'Net', fn: 'sum' }, { field: 'Total', fn: 'sum' }] },
  ],
  // What the company prints: one document per record of the table named, its lines from the records that point at it.
  documents: [
    // For contracts in force; an ended one prints from the Contracts form and says when it ended.
    { name: 'Cleaning contract', table: 'Contracts', paper: 'a4', where: '[Status] = "Active"', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'Cleaning contract {Number}' },
      { type: 'text', text: 'This contract ended on {Ended On}.', if: '[Ended On]' },
      { type: 'text', text: 'Notice to end this contract was given on {Notice Given On}.', if: '[Notice Given On] And Nz([Ended On], "") = ""' },
      { type: 'fields', columns: 2, items: [
        { field: 'Client.Name', label: 'Client' }, { field: 'Site.Name', label: 'Site' },
        { field: 'Client.Contact Name', label: 'Contact' }, { field: 'Site.Address', label: 'Site address' },
        { field: 'Client.Address', label: 'Client address' }, { field: 'Site.Postcode', label: 'Site postcode' },
        { field: 'Start Date', label: 'Starts', format: 'd mmmm yyyy' }, { field: 'End Date', label: 'Runs to', format: 'd mmmm yyyy' },
        { field: 'Days', label: 'Visit days' }, { field: 'Start Time', label: 'Starting at' },
        { field: 'Hours per Visit', label: 'Hours a visit' }, { field: 'Rate', label: 'Rate an hour, before VAT', format: '#,##0.00' },
        { field: 'Monthly Estimate', label: 'About a month, before VAT', format: '#,##0.00' }, { field: 'Notice Days', label: 'Notice, days' },
      ] },
      { type: 'text', text: 'THIS CONTRACT is between {Business.Name} of {Business.Address}, {Business.City} ("we", "us") and {Client.Name} of {Client.Address}, {Client.City} ("you"), for the cleaning of {Site.Name}, {Site.Address}, {Site.City} {Site.Postcode} ("the site").' },
      { type: 'text', text: '1. The cleaning. We will clean the site on {Days}, starting at about {Start Time}, for {Hours per Visit} hours each visit ({Visits per Week} visits a week, where 0.5 means every other week), doing the work in the schedule below. If you want something added or changed, tell us and we will agree it with you in writing, with any change to the hours.' },
      { type: 'lines', table: 'Contract Tasks', sort: 'Order', columns: [{ field: 'Area' }, { field: 'Task', label: 'What we do' }, { field: 'How Often', label: 'How often' }] },
      { type: 'text', text: '2. What it costs. We charge {Rate} an hour plus VAT for the hours of each visit, which comes to about {Monthly Estimate} plus VAT in an average month. A visit we do not make is not charged. If a visit is cut short at our end, we charge only the time worked. The rate is reviewed once a year, when the contract renews, and we will tell you of any change at least 30 days before.' },
      { type: 'text', text: '3. Invoices and payment. We invoice on the first working day of each month for the visits made in the month before, listing each visit. Each invoice is due {Client.Payment Days} days after its date, by bank transfer to {Business.Bank Details}. If an invoice is more than 30 days overdue we may stop the visits until it is paid.' },
      { type: 'text', text: '4. Equipment and supplies. We bring the cleaning products, cloths, mops and machines. Toilet rolls, hand towels, soap and bin liners can be supplied by us and charged on the monthly invoice at our list price, or you may supply your own.' },
      { type: 'text', text: '5. Our cleaners. Every cleaner we send has been vetted and is trained for the work. We aim to send the same cleaner each time and will send another if they are on holiday or ill. If we cannot cover a visit we will tell you before the time it was due.' },
      { type: 'text', text: '6. Keys and access. Keys and alarm codes you give us are held securely, labelled with a reference and never with your address, and given back when the contract ends. Please tell us of any change to the site that affects access or safety.' },
      { type: 'text', text: '7. If something is not right. Tell us within two working days and we will come back and put it right without charge. A cleaner\'s visit is signed off in the site book or on the visit sheet; if you sign it off, we take it that the work was done.' },
      { type: 'text', text: '8. Damage and insurance. We carry public liability insurance. Report any breakage or damage to us in writing within seven days and we will deal with it fairly, putting right damage our cleaners caused.' },
      { type: 'text', text: '9. How long it runs. This contract starts on {Start Date} and runs to {End Date}. It then renews for a further twelve months each time unless either of us gives notice. Either of us may end it at any time by giving {Notice Days} days\' notice in writing. Visits up to the end of the notice are charged as usual.' },
      { type: 'text', text: '10. Your details. We keep your details only to run this contract and do not pass them to anyone else except as the law requires.' },
      { type: 'spacer', size: 24 },
      { type: 'signatures', labels: ['For the cleaning company', 'For the client'] },
    ] },
    { name: 'Invoice', table: 'Invoices', paper: 'a4', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'Invoice {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Client.Name', label: 'Bill to' }, { field: 'Number', label: 'Invoice' },
        { field: 'Client.Contact Name', label: 'For the attention of' }, { field: 'Invoice Date', label: 'Date', format: 'dd/mm/yyyy' },
        { field: 'Client.Address', label: 'Address' }, { field: 'Due Date', label: 'Payment due', format: 'dd/mm/yyyy' },
        { field: 'Client.City', label: 'City' }, { field: 'Period', label: 'For', if: '[Period]' },
        { field: 'Client.Postcode', label: 'Postcode' }, { field: 'Site.Name', label: 'Site', if: '[Site]' },
        { field: 'Contract.Number', label: 'Contract', if: '[Contract]' }, { field: 'Job.Number', label: 'Job', if: '[Job]' },
        { field: 'Site.Address', label: 'Site address', if: '[Site]' },
      ] },
      { type: 'lines', table: 'Invoice Lines', columns: [
        { field: 'Date', format: 'dd/mm/yyyy' }, { field: 'Description' }, { field: 'Quantity', label: 'Hours or qty', type: 'number' }, { field: 'Unit Price', label: 'Rate', type: 'currency' },
        { expr: LINE, as: 'Amount', type: 'currency' }, { expr: LINE_VAT, as: 'VAT', type: 'currency' },
      ] },
      { type: 'totals', rows: [{ label: 'Net', expr: '[Amount]' }, { label: 'VAT at 20%', expr: '[VAT]' }, { label: 'Total due', expr: '[Net] + [VAT at 20%]', strong: true }] },
      { type: 'text', text: 'Please pay by {Due Date}. {Business.Payment Terms} Pay to {Business.Bank Details}, quoting {Number}. VAT registration {Business.Tax Number}.', small: true, if: 'Nz([Paid On], "") = ""' },
      { type: 'text', text: 'Paid on {Paid On}, thank you. VAT registration {Business.Tax Number}.', small: true, if: '[Paid On]' },
      { type: 'text', text: '{Business.Document Footer}', small: true },
    ] },
    // For one-off jobs quoted and waiting for an answer, or booked and still to do.
    { name: 'Quote', table: 'Jobs', paper: 'a4', where: '[Status] = "Quoted" Or [Status] = "Booked"', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'Quote {Number}: {Kind}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Client.Name', label: 'For' }, { field: 'Number', label: 'Quote' },
        { field: 'Site.Address', label: 'Address of the job' }, { field: 'Quoted On', label: 'Date', format: 'dd/mm/yyyy' },
        { field: 'Site.City', label: 'City' }, { field: 'Valid Until', label: 'Price holds until', format: 'dd/mm/yyyy' },
        { field: 'Site.Postcode', label: 'Postcode' }, { field: 'Estimated Hours', label: 'Time on site, hours' },
        { field: 'Booked For', label: 'Booked for', format: 'dddd d mmmm yyyy', if: '[Booked For]' },
      ] },
      { type: 'lines', table: 'Job Items', columns: [
        { field: 'Description' }, { field: 'Quantity', type: 'number' }, { field: 'Unit Price', label: 'Price', type: 'currency' },
        { expr: LINE, as: 'Amount', type: 'currency' }, { expr: LINE_VAT, as: 'VAT', type: 'currency' },
      ] },
      { type: 'totals', rows: [{ label: 'Net', expr: '[Amount]' }, { label: 'VAT at 20%', expr: '[VAT]' }, { label: 'Total', expr: '[Net] + [VAT at 20%]', strong: true }] },
      { type: 'text', text: 'The price covers our cleaners, products and machines. Please make sure there is water and power at the property and that it is empty of furniture where the job says so. To book, call us on {Business.Phone} or reply to this quote with the day you would like. We invoice when the job is done; payment is due within seven days.', if: '[Status] = "Quoted"' },
      { type: 'text', text: 'Thank you for booking. The price covers our cleaners, products and machines. Please make sure there is water and power at the property on the day and that it is empty of furniture where the job says so. We invoice when the job is done; payment is due within seven days.', if: '[Status] <> "Quoted"' },
      { type: 'text', text: '{Business.Document Footer}', small: true },
    ] },
    { name: 'Payslip', table: 'Payslips', paper: 'a4', letterhead: { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode'] }, blocks: [
      { type: 'heading', text: 'Payslip {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Cleaner', label: 'Name' }, { field: 'Period', label: 'Pay period' },
        { field: 'Cleaner.Payroll Ref', label: 'Payroll reference' }, { field: 'Pay Date', label: 'Paid on', format: 'dd/mm/yyyy' },
        { field: 'Period Start', label: 'From', format: 'dd/mm/yyyy' }, { field: 'Period End', label: 'To', format: 'dd/mm/yyyy' },
      ] },
      { type: 'lines', table: 'Payslip Lines', columns: [{ field: 'Description' }, { field: 'Hours', type: 'number' }, { field: 'Rate', type: 'currency' }, { field: 'Amount', type: 'currency' }] },
      { type: 'totals', rows: [{ label: 'Hours worked', expr: '[Hours]', type: 'number' }, { label: 'Gross pay', expr: '[Amount]', strong: true }] },
      { type: 'text', text: 'This shows your hours and gross pay for the period. Income tax, National Insurance and any pension are worked out by payroll from the gross pay and shown on the payroll\'s own payslip, with your pay after deductions.', small: true },
      { type: 'text', text: 'Holiday pay is paid as 12.07 percent of the pay for the hours you work, with each month\'s pay. Questions about your hours: call the office on {Business.Phone}.', small: true },
    ] },
    // For the sites of contracts in force.
    { name: 'Site visit sheet', table: 'Contracts', paper: 'a4', where: '[Status] = "Active"', letterhead: { table: 'Business', fields: ['Name', 'Phone'] }, blocks: [
      { type: 'heading', text: 'Visit sheet: {Site.Name}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Client.Name', label: 'Client' }, { field: 'Number', label: 'Contract' },
        { field: 'Site.Address', label: 'Address' }, { field: 'Days', label: 'Visit days' },
        { field: 'Site.Postcode', label: 'Postcode' }, { field: 'Start Time', label: 'Start at' },
        { field: 'Site.Site Contact', label: 'On site' }, { field: 'Hours per Visit', label: 'Hours a visit' },
        { field: 'Cleaner', label: 'Regular cleaner' }, { field: 'Site.Access Notes', label: 'Access' },
      ] },
      { type: 'lines', table: 'Contract Tasks', sort: 'Order', columns: [{ field: 'Area' }, { field: 'Task' }, { field: 'How Often', label: 'How often' }, { expr: '"[   ]"', as: 'Done' }] },
      { type: 'text', text: 'Date: ....................   Time in: ..............   Time out: ..............   Hours: ........' },
      { type: 'text', text: 'Anything not done, and why, or anything the client should know (a breakage, supplies running low):' },
      { type: 'text', text: '..........................................................................................................................' },
      { type: 'spacer', size: 16 },
      { type: 'signatures', labels: ['Cleaner', 'Signed off for the client'] },
    ] },
  ],
};

export const about = {
  name: 'Fernhollow Cleaning',
  kind: 'Cleaning company',
  line: 'Clients, sites, contracts, the rota, visits, one-off jobs, supplies, payslips and invoices for a cleaning company.',
  summary: [
    'For a cleaning business that cleans the same places week after week under contract and takes on one-off jobs as well: an office cleaning company, a domestic cleaning agency, or one that does both. It answers what such a business asks every week: who is going where in the next seven days, which visits were missed or cut short, what each cleaner earned, which contracts pay their way, who has not paid and which contracts come up for renewal.',
    'Fernhollow Cleaning is invented. It works in and around Leeds with a dozen cleaners paid by the hour. It cleans offices, a dental surgery, a nursery, showrooms and shops early in the morning or in the evening, and homes during the day, weekly or every other week. It also quotes for end of tenancy cleans, carpet and upholstery cleaning, oven cleans and cleans after the builders.',
    'The records cover the last fifteen months, counted back from the day the file is made, with the rota booked two weeks ahead. Each visit is done, done short, covered by another cleaner when the regular one is on holiday or ill, or now and then missed. Contracts renew each year at a slightly higher rate and a few end on notice; new clients start through the year. One-off work is busier in the summer, when tenancies end. Every contract is invoiced on the first working day of the month for the month before, with each visit a line, and each cleaner gets a payslip at the end of the month.',
    'It prints the documents such a business uses: the cleaning contract with its schedule of work for the client to sign, the monthly invoice, a quote for a one-off job, each cleaner\'s payslip showing hours and gross pay, and a visit sheet for the site with the tasks to tick off and a line for the client to sign.',
  ],
  suits: [
    'An office or commercial cleaning contractor', 'A domestic cleaning agency', 'A window cleaning round', 'A carpet and upholstery cleaner',
    'A gardening or grounds maintenance business', 'A pest control or hygiene service', 'A home care or befriending service that visits on a rota',
  ],
  tables: {
    'Business': BUSINESS_ABOUT,
    'Clients': { about: 'Everyone the company cleans for: businesses on contract, households, and people who have had a one-off job.', fields: {
      'Name': 'The business name, or for a household the person\'s name, as it goes on an invoice.',
      'Kind': 'Commercial, Domestic, or One-off for someone who has only had a single job.',
      'Contact Name': 'The person to deal with: the office manager, the practice manager, or the householder.',
      'Address': 'Where invoices are sent.', 'City': 'The town or city.', 'Postcode': 'The postcode.',
      'Phone': 'The client\'s phone number.', 'E-mail': 'Where invoices and quotes are sent.',
      'Payment Days': 'How many days after the invoice date payment is due: 30 for most businesses, 7 for households.',
      'Client Since': 'When they first became a client.', 'Notes': 'Anything worth knowing, such as a client who pays late.',
    } },
    'Sites': { about: 'The places that are cleaned. A client can have more than one: two offices, or a home and a flat they let out.', fields: {
      'Client': 'Whose site it is.', 'Name': 'What the site is called, such as Head office or the householder\'s street.',
      'Site Type': 'Office, Surgery, Nursery, Showroom, Shop or Home, which decides the usual schedule of tasks.',
      'Address': 'The street address of the site.', 'City': 'The town or city.', 'Postcode': 'The postcode, for planning the rota.',
      'Site Contact': 'The person on site who lets the cleaner in or signs off the visit.',
      'Access Notes': 'How the cleaner gets in: who holds the key, where to park, the alarm (the code itself is never written here).',
    } },
    'Cleaners': { about: 'The cleaners, each paid by the hour.', fields: {
      'First Name': 'Their first name.', 'Last Name': 'Their family name.', 'Payroll Ref': 'Their reference with payroll, printed on the payslip: CL-0007.',
      'Phone': 'Their mobile, for the rota.', 'E-mail': 'Their e-mail address.', 'Hourly Pay': 'What they are paid an hour now. Each visit keeps the rate it was paid at.',
      'Most Hours': 'The most hours a week they want to work, for planning the rota.', 'Started': 'The day they joined.',
      'Vetted On': 'When their background check was done.', 'Left On': 'The day they left; empty while they work here.',
      'Active': 'No once they have left; their visits and payslips stay in the records.',
    } },
    'Visits': { about: 'Every visit on the rota, booked ahead and then recorded as it went: the heart of the database.', fields: {
      'Contract': 'The contract the visit is for, which gives the client and the site.', 'Cleaner': 'Who goes, or went. A cover cleaner when the regular one is away.',
      'Date': 'The day of the visit.', 'Start Time': 'When the cleaner starts, such as 06:00 or 17:30.',
      'Planned Hours': 'The hours the contract allows for the visit.', 'Hours Worked': 'The hours the cleaner actually worked; empty until the visit is done.',
      'Hours Charged': 'The hours the client is charged: the planned hours, or only those worked when the visit was cut short; nought when it was missed.',
      'Charge Rate': 'The contract\'s rate an hour at the time of the visit.', 'Pay Rate': 'The cleaner\'s pay an hour at the time of the visit.',
      'Status': 'Booked (still to come), Done, Short (done, but for fewer hours), Missed or Cancelled (by the client).',
      'Signed Off': 'Yes when the client signed the site book or the visit sheet.', 'Signed Off By': 'Who signed it off.',
      'Notes': 'Why a visit was short, missed or covered.', 'Invoice': 'The invoice the visit was charged on. Empty means not invoiced yet.',
    } },
    'Contracts': { about: 'One for each site cleaned under contract: how often, how long, at what rate, from when and on what notice. A contract renews each year until either side gives notice.', fields: {
      'Number': 'The contract\'s number, given in the order contracts start, a new run each year: CON-2026-0012.', 'Client': 'Who the contract is with.',
      'Site': 'The site it covers.', 'Cleaner': 'The regular cleaner.', 'Start Date': 'When the contract first started.',
      'End Date': 'When the current year of the contract ends; it then renews for another year unless notice is given.', 'Last Renewed': 'When it last renewed, at the rate it has now.',
      'Visits per Week': 'How many visits a week: 0.5 for every other week.', 'Days': 'The days of the week the visits fall on.',
      'Start Time': 'When each visit starts.', 'Hours per Visit': 'The hours each visit is booked and charged for.',
      'Rate': 'What an hour is charged at, before VAT. Reviewed at each renewal.', 'Monthly Estimate': 'What the contract comes to in an average month, before VAT: visits a week, times hours, times the rate, times 52, divided by 12.',
      'Notice Days': 'The notice either side must give to end it.', 'Status': 'Pending (signed, not started), Active, Notice given or Ended.',
      'Notice Given On': 'The day notice was given.', 'Ended On': 'The last day of cleaning under it.', 'Notes': 'Why it ended, or anything agreed beyond the schedule.',
    } },
    'Contract Tasks': { about: 'The schedule of work for each contract: what is done in each area and how often. It prints on the contract and on the site visit sheet.', fields: {
      'Contract': 'The contract the task belongs to.', 'Order': 'Where it comes in the list.', 'Area': 'The part of the site, such as Kitchen or Washrooms.',
      'Task': 'What is done there.', 'How Often': 'Every visit, Weekly or Monthly.',
    } },
    'Jobs': { about: 'One-off work: end of tenancy cleans, carpets, ovens, deep cleans. A job starts as a quote and is booked, done and invoiced, or declined.', fields: {
      'Number': 'The quote and job number, given in the order quotes go out, a new run each year: JOB-2026-0031.', 'Client': 'Who asked for it.',
      'Site': 'Where the job is.', 'Kind': 'What kind of job it is.', 'Quoted On': 'When the quote went out.', 'Valid Until': 'The last day the quoted price holds.',
      'Booked For': 'The day the job is booked for.', 'Cleaner': 'Who does it.', 'Estimated Hours': 'The time on site the quote was worked out on.',
      'Hours Worked': 'The time it actually took, paid at the job rate.', 'Net': 'The quote before VAT: its items added up.', 'VAT': 'The VAT on the items, each rounded to the penny, added up.',
      'Total': 'The quoted price with VAT.', 'Status': 'Quoted, Booked, Done or Declined.', 'Signed Off By': 'Who checked the work at the end.', 'Notes': 'Anything about the job.',
    } },
    'Job Items': { about: 'The priced parts of a job\'s quote, which become the lines of its invoice.', fields: {
      'Job': 'The job the item belongs to.', 'Description': 'What is done, such as Oven clean or Carpet clean, one room.',
      'Quantity': 'How many: rooms, items or hours.', 'Unit Price': 'The price of one, before VAT.', 'Tax Rate': 'The VAT rate as a fraction: 0.2.',
    } },
    'Invoices': { about: 'A monthly invoice for each contract, listing its visits and any supplies, and an invoice for each one-off job when it is done.', fields: {
      'Number': 'The invoice number, given in date order and once only, a new run each year: INV-2026-0042.', 'Client': 'Who is invoiced.', 'Site': 'The site the work was done at, printed on the invoice.',
      'Contract': 'The contract invoiced, for a monthly invoice.', 'Job': 'The job invoiced, for a one-off job.',
      'Period': 'The month invoiced, or the job and its date.', 'Invoice Date': 'The date on the invoice.', 'Due Date': 'When payment is due, from the client\'s payment days.',
      'Net': 'The lines added up before VAT.', 'VAT': 'Each line\'s VAT, rounded to the penny, added up: the figure the printed invoice shows.',
      'Total': 'Net and VAT together: what the client owes.', 'Paid On': 'The day it was paid; empty while it is owed.', 'Status': 'Sent or Paid.',
    } },
    'Invoice Lines': { about: 'The lines of each invoice: a line for each visit, a line for each kind of supply recharged, or the items of a job.', fields: {
      'Invoice': 'The invoice the line is on.', 'Date': 'The day of the visit, or of the job.', 'Kind': 'Visit, Supplies or Job.',
      'Description': 'What the line says, as printed.', 'Quantity': 'Hours for a visit; how many for supplies or a job item.',
      'Unit Price': 'The rate an hour, or the price of one.', 'Tax Rate': 'The VAT rate of the line as a fraction: 0.2.',
    } },
    'Supplies': { about: 'What the company buys and keeps in its store: cleaning products, cloths and mops, and washroom supplies some clients are charged for.', fields: {
      'Name': 'The supply. Each name is used once.', 'Unit': 'How it is bought and used, such as a 5 l can or a case of 36.',
      'Unit Cost': 'What one unit costs to buy.', 'Rechargeable': 'Yes for washroom supplies charged to commercial clients on their monthly invoice.',
      'Sell Price': 'What one unit is charged at, for a rechargeable supply.', 'In Stock': 'How many are in the store now: the movements added up.',
      'Reorder Level': 'When stock falls to this, more is bought.', 'Reorder Quantity': 'How many to buy each time.',
    } },
    'Supply Movements': { about: 'Every supply bought, taken out to a site, or corrected at a stock count. Added up, they give what is in the store.', fields: {
      'Supply': 'The supply that moved.', 'Date': 'The day it moved.', 'Kind': 'Bought, Used or Adjusted.',
      'Quantity': 'How many: above nought coming in, below nought going out.', 'Unit Cost': 'What one unit cost.',
      'Contract': 'The contract it was used on, for supplies used.', 'Reference': 'The order or what the movement was for.',
    } },
    'Payslips': { about: 'One for each cleaner for each month they worked: their hours and gross pay. Tax and deductions are left to payroll.', fields: {
      'Number': 'The payslip number, a new run each year: PAY-2026-0042.', 'Cleaner': 'Whose pay it is.', 'Period': 'The month it covers.',
      'Period Start': 'The first day of the month.', 'Period End': 'The last day of the month.', 'Pay Date': 'The day the pay goes into their account.',
      'Contract Hours': 'Hours on contract visits.', 'Job Hours': 'Hours on one-off jobs, paid at the job rate.', 'Hours': 'All the hours of the month.',
      'Gross': 'The pay before deductions: the lines added up.',
    } },
    'Payslip Lines': { about: 'The parts of each payslip: contract hours, job hours and the holiday pay on them.', fields: {
      'Payslip': 'The payslip the line is on.', 'Description': 'What the line is for.', 'Hours': 'The hours, where the line is for hours.',
      'Rate': 'The rate an hour.', 'Amount': 'What the line comes to.',
    } },
  },
  queries: {
    'Rota, next 7 days': 'Every visit booked from today for the next seven days, by cleaner, day and start time, with the client, the site and its address. Print it each week for the cleaners.',
    'Missed or short visits': 'Visits of the last 60 days that were missed or cut short, the newest first, with the reason. For putting things right with the client and spotting a pattern.',
    'Hours and pay by cleaner, last month': 'Each cleaner\'s payslip for last month: contract hours, job hours and gross pay. Send it to payroll.',
    'Hours by cleaner, last 30 days': 'Each cleaner\'s visits of the last 30 days: how many, the hours planned and worked, and how many were short.',
    'Contract profitability': 'For each site over the last 90 days: what was charged for the visits against the wage cost of the hours worked (with holiday pay), and the margin left to pay for supplies, travel and the office.',
    'Supplies used, last 90 days': 'What each site has used from the store over the last 90 days at cost, and what of it was charged on.',
    'Supplies to reorder': 'Supplies at or below their reorder level, with how many to buy.',
    'Invoices overdue': 'Invoices past their due date and not paid, the longest overdue first, with the client\'s phone number for chasing.',
    'Contracts up for renewal': 'Active contracts whose year ends in the next 60 days, with their rate, monthly value and notice. Time to review the price and talk to the client.',
    'Work to invoice': 'Visits done and not yet invoiced, by client and contract, with their hours and value: what next month\'s invoices will bring in.',
    'Quotes waiting': 'Quotes for one-off jobs sent and not yet answered, the oldest first. For a follow-up call.',
    'Jobs booked, next 14 days': 'One-off jobs booked for the next two weeks, with the address and the cleaner.',
    'Revenue by month': 'What was invoiced each month, split between contracts and one-off jobs, with VAT and totals.',
    'Active contracts': 'Every contract in force, about to start or under notice, with its days, times, hours, rate and regular cleaner.',
  },
  reports: {
    'Rota': 'The coming week\'s visits, a section for each cleaner with their hours. Give each cleaner their page.',
    'Missed and short visits': 'The last 60 days\' missed and short visits by client, with the hours lost.',
    'Pay summary': 'Last month\'s hours and gross pay for each cleaner, with the totals, for payroll.',
    'Contract profitability': 'Charge, wage cost and margin for each site over the last 90 days, commercial and domestic apart, with totals.',
    'Overdue invoices': 'Unpaid invoices past their due date by client, with a total owed.',
    'Renewals due': 'Contracts coming up for renewal in the next 60 days, with their monthly value.',
    'Monthly revenue': 'One line a month with the invoiced contracts, jobs and totals.',
  },
  documents: {
    'Cleaning contract': 'The contract for a record in Contracts, for the client to sign. It prints for contracts in force; an ended one prints from the Contracts form and says when it ended. In it: the parties and the site, the days, times and hours, the rate and an average month, the schedule of tasks, invoicing and payment, supplies, cleaners, keys, complaints, insurance, renewal and notice. It is a plain starting point written for this sample, not legal advice: have it checked for your own country before you use it.',
    'Invoice': 'The VAT invoice for a record in Invoices: for a contract, every visit of the month with its date, hours and rate, and any washroom supplies; for a one-off job, its items. Then the net, VAT and total due, and how to pay, or the day it was paid. Numbered INV-2026-0042.',
    'Quote': 'The quote for a one-off job, for a record in Jobs: the address, each priced item, the net, VAT and total, how long the price holds and how to book. It prints for jobs quoted and not yet answered, and for jobs booked and still to do, which say the day booked. Numbered JOB-2026-0031.',
    'Payslip': 'A cleaner\'s monthly payslip from Payslips: contract hours and job hours at their rates, holiday pay, and the gross pay. Deductions are left to payroll, which issues its own payslip with the pay after tax.',
    'Site visit sheet': 'A sheet for each contract\'s site, printed for the cleaner to take: the address, access notes, the days and hours, every task with a box to tick, room for times and notes, and lines for the cleaner and the client to sign. It prints for contracts in force.',
  },
  tutorial: [
    { title: 'Take on a new contract client', steps: [
      'Open the Clients form and press New. Type the Name, set Kind to Commercial or Domestic, and fill in the Contact Name, address, Phone, E-mail and Payment Days.',
      'Open the Sites form and press New. Choose the Client, type the site\'s Name, Site Type, address, Site Contact and Access Notes (who holds the key; never the alarm code).',
      'Open the Contracts form and press New. Type the next Number (such as CON-2026-0019), choose the Client, Site and regular Cleaner, and type the Start Date, End Date (a year on), Visits per Week, Days, Start Time, Hours per Visit, Rate, Monthly Estimate and Notice Days. Set Status to Pending.',
      'In the Contract Tasks below, add each task with its Area, Order and How Often.',
      'Open the print template Cleaning contract from Print templates, choose the contract, and press Print or Save as PDF for the client to sign.',
      'On the first day of cleaning, set the contract\'s Status to Active.',
    ] },
    { title: 'Plan the week\'s rota', steps: [
      'Open the Visits form and press New for each visit of the coming weeks: choose the Contract and the Cleaner, type the Date, Start Time and Planned Hours, and the contract\'s Rate in Charge Rate and the cleaner\'s Hourly Pay in Pay Rate. Status is Booked.',
      'When a cleaner is on holiday, change the Cleaner on their visits to the one covering, and say so in Notes.',
      'Print the report Rota: a page for each cleaner with where they go each day of the next seven days.',
      'For a new site, open the print template Site visit sheet, choose the contract, and print a sheet for the cleaner to take.',
    ] },
    { title: 'Record the visits as they are done', steps: [
      'Each day, open the Visits form at each of yesterday\'s visits. Type the Hours Worked, set Status to Done, and Hours Charged to the Planned Hours.',
      'If the visit was cut short, set Status to Short, Hours Charged to the hours worked, and give the reason in Notes. If nobody went, set Status to Missed and Hours Charged to 0.',
      'When the client signed the site book or the visit sheet, tick Signed Off and type who in Signed Off By.',
      'Run the query Missed or short visits each week to see what needs putting right.',
    ] },
    { title: 'Invoice the month\'s contracts', steps: [
      'On the first working day of the month, run the query Work to invoice to see the visits done and not yet invoiced.',
      'Open the Invoices form and press New for each contract: type the next Number (INV-2026-0144), choose the Client and Contract, type the Period (such as September 2026), the Invoice Date and the Due Date.',
      'In the Invoice Lines, add a line for each visit (Date, Kind Visit, Description, Quantity the hours charged, Unit Price the charge rate, Tax Rate 0.2) and a line for each rechargeable supply used.',
      'Type the invoice\'s Net, VAT (each line\'s VAT added up) and Total. Put the invoice in the Invoice field of each visit it covers.',
      'Open the print template Invoice, choose the invoice, and press Print or Save as PDF. When it is paid, type Paid On and set Status to Paid; the query Invoices overdue lists what has not been.',
    ] },
    { title: 'Quote for a one-off job, then do it', steps: [
      'Open the Jobs form and press New. Type the next Number (JOB-2026-0080), choose the Client (add them first in Clients, Kind One-off, with a Site, if they are new), the Site and the Kind, and type Quoted On and Valid Until.',
      'In the Job Items below, add each priced part: Description, Quantity, Unit Price. Type the job\'s Net, VAT and Total and the Estimated Hours.',
      'Open the print template Quote, choose the job, and send it. The query Quotes waiting lists those not yet answered.',
      'When the client says yes, set Status to Booked, type Booked For and choose the Cleaner. After the job, type the Hours Worked and Signed Off By, set Status to Done, and add an Invoice for it with the job\'s items as its lines.',
    ] },
    { title: 'Run the month\'s pay', steps: [
      'At the month\'s end, run the query Hours by cleaner, last 30 days, to check each cleaner\'s visits and hours against their own record.',
      'Open the Payslips form and press New for each cleaner: the next Number, the Cleaner, the Period, Period Start and End, the Pay Date, and their Contract Hours, Job Hours and Hours.',
      'In the Payslip Lines, add the contract hours at their pay rate, the job hours at the job rate, and holiday pay at 12.07 percent of those two. Type the Gross.',
      'Open the print template Payslip, choose the payslip, and print it for the cleaner. Send the report Pay summary to payroll, who work out tax and National Insurance.',
    ] },
    { title: 'Keep the store stocked and review contracts', steps: [
      'When supplies go out to a site, open the Supply Movements form and press New: the Supply, the Date, Kind Used, the Quantity below nought, and the Contract. Bring In Stock on the Supplies form down to match.',
      'Each Monday run the query Supplies to reorder; when an order arrives, add a Bought movement for it and bring In Stock up.',
      'Each month run Contracts up for renewal and Contract profitability: a contract with a thin margin is one to re-price when it renews.',
    ] },
  ],
  notes: [
    'Visits come before Contracts in the design, so that a query with both joins each visit to the cleaner who went rather than to the contract\'s regular cleaner. Keep that order if you add tables.',
    'Each visit keeps its own Charge Rate and Pay Rate, so a rate change at renewal or a pay rise in April does not alter what past visits were charged or paid.',
    'Hours Charged, not Hours Worked, is what goes on the invoice: a cleaner who stays longer does not cost the client more, and a short visit is charged only for the time worked.',
    'Numbers are typed, not made for you: contracts CON-, invoices INV-, jobs JOB- and payslips PAY-, each a new run each year and each used once.',
    'Payslips show hours and gross pay only. Tax, National Insurance and pension depend on each person\'s own position, so they are left to payroll.',
    'In Stock on Supplies is what the Supply Movements add up to. Change stock by adding a movement and then bringing In Stock to match, never by typing over it alone.',
    'Each print template prints only the records it is for: contracts and visit sheets for contracts in force, quotes for jobs waiting for an answer or booked, and every invoice and payslip. Printed from a form, the record on screen prints whatever its state, an ended contract or a declined quote too.',
  ],
  faq: [
    { q: 'How do I see who is cleaning where tomorrow?', a: 'Run the query Rota, next 7 days, or print the report Rota. Both list the booked visits of the next seven days by cleaner, day and start time, with the address.' },
    { q: 'A cleaner is off sick. How do I cover their visits?', a: 'Open each of their booked visits in the Visits form and choose another cleaner in Cleaner, with a word in Notes. If nobody can go, set Status to Missed once the day has passed, and Hours Charged to 0, so the client is not charged.' },
    { q: 'Why is a contract\'s invoice less than its Monthly Estimate?', a: 'The estimate is an average month. The invoice charges the visits actually made: a month with four Mondays has fewer than one with five, missed visits are not charged, and short ones are charged for the time worked.' },
    { q: 'How do I put the price up when a contract renews?', a: 'Open the contract in the Contracts form, type the new Rate and Monthly Estimate, move End Date on a year and type the day in Last Renewed. Visits booked from then on take the new rate in Charge Rate.' },
    { q: 'How do I print last month\'s invoices again?', a: 'Open the print template Invoice and choose the invoices by number, or open an invoice in the Invoices form and print it from there.' },
    { q: 'Which contracts make money?', a: 'Run Contract profitability. It sets what each site was charged over the last 90 days against the wage cost of the hours worked, with holiday pay. Supplies used are in Supplies used, last 90 days.' },
    { q: 'Can I use the cleaning contract as it is?', a: 'Treat it as a draft. It is written plainly for this sample and is not legal advice; have it checked for your own country, then change the words in the print template Cleaning contract.' },
  ],
  empty: 'Start with Business: your own name, address, VAT number, bank details and the words for the foot of your documents. Then Cleaners and Supplies. Then each client in Clients with their Sites, and a contract in Contracts for each site cleaned regularly, with its Contract Tasks. From then on, book and record Visits, add Jobs as they are quoted, Supply Movements as stock comes and goes, and at each month\'s end the Payslips and the Invoices.',
  adapt: [
    'Pay travel time between sites: add a Travel Minutes field to Visits and a payslip line for it at the cleaner\'s rate.',
    'Charge a fixed monthly price instead of by the hour: add a Monthly Price field to Contracts and invoice one line for the month, with the visits listed for information only.',
    'Keep a key register: add a Keys table (site, key reference, held by, signed out, signed in) so you know where every key is.',
    'Record a quality check: add an Inspections table (site, date, inspector, score, notes) and a query of the lowest scores.',
    'Clean windows or gardens on a round: rename Contracts to Rounds and set Visits per Week to 0.25 for every four weeks.',
    'Track the cleaners\' training and checks: add a Training table pointing at Cleaners with what was done and when it falls due again.',
  ],
};

// The place: invented streets in and around Leeds, with postcodes of the right shape.
const STREETS = ['Mill Lane', 'Station Road', 'Orchard Way', 'Church Street', 'Canal Walk', 'Beech Grove', 'Linden Close', 'Cedar Avenue', 'Larkfield Road', 'Hawthorn Rise', 'Weaver Street', 'Kirkstall Row', 'Elmwood Terrace', 'Granary Court', 'Foundry Lane', 'Chapel Yard'];
const TOWNS = [['Leeds', 'LS', 28, 6], ['Wakefield', 'WF', 17, 1], ['Bradford', 'BD', 22, 1], ['Harrogate', 'HG', 3, 1]];
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The kinds of commercial client: name ending, site type, sizes of the job. */
const COMMERCIAL = [
  { tail: 'Partners', type: 'Office', weight: 3 }, { tail: 'Accountants', type: 'Office', weight: 2 }, { tail: 'Architects', type: 'Office', weight: 1 },
  { tail: 'Lettings', type: 'Office', weight: 2 }, { tail: 'Dental', type: 'Surgery', weight: 1 }, { tail: 'Physio', type: 'Surgery', weight: 1 },
  { tail: 'Nursery', type: 'Nursery', weight: 1 }, { tail: 'Motors', type: 'Showroom', weight: 1 }, { tail: 'Interiors', type: 'Shop', weight: 1 },
  { tail: 'Opticians', type: 'Shop', weight: 1 },
];
/** The schedule of work for each type of site: [area, task, how often]. */
const TASKS = {
  Office: [['Entrance and reception', 'Vacuum carpets, mop hard floors, wipe the reception desk', 'Every visit'], ['Offices', 'Wipe clear desk surfaces and phones, vacuum floors', 'Every visit'], ['Kitchen', 'Clean worktops, sink and microwave; load and run the dishwasher', 'Every visit'], ['Washrooms', 'Clean and disinfect toilets, basins and mirrors; refill soap and paper', 'Every visit'], ['Throughout', 'Empty bins and recycling, replace liners', 'Every visit'], ['Throughout', 'Dust skirting, sills and high ledges', 'Weekly'], ['Throughout', 'Clean internal glass and door handles', 'Weekly'], ['Kitchen', 'Clean the fridge inside and out', 'Monthly']],
  Surgery: [['Waiting room', 'Vacuum and mop, wipe chairs and the reception desk', 'Every visit'], ['Treatment rooms', 'Damp-wipe all surfaces and handles with disinfectant', 'Every visit'], ['Treatment rooms', 'Mop floors with the colour-coded mop for clinical areas', 'Every visit'], ['Washrooms', 'Clean and disinfect toilets, basins and mirrors; refill soap and paper', 'Every visit'], ['Throughout', 'Empty general bins (clinical waste is left for the collection)', 'Every visit'], ['Staff room', 'Clean worktops, sink and microwave', 'Every visit'], ['Throughout', 'Dust high ledges, vents and light switches', 'Weekly']],
  Nursery: [['Playrooms', 'Vacuum and mop floors, wipe tables and chairs', 'Every visit'], ['Toilets and changing area', 'Clean and disinfect toilets, basins and changing mats', 'Every visit'], ['Kitchen', 'Clean worktops, sink and the outside of appliances', 'Every visit'], ['Throughout', 'Empty bins and nappy bins, replace liners', 'Every visit'], ['Entrance', 'Clean the door glass and mop the entrance', 'Every visit'], ['Playrooms', 'Wipe low shelves and window sills', 'Weekly']],
  Showroom: [['Showroom floor', 'Mop the showroom floor and buff the entrance', 'Every visit'], ['Customer area', 'Wipe tables, the coffee point and the sales desks', 'Every visit'], ['Washrooms', 'Clean and disinfect toilets and basins; refill soap and paper', 'Every visit'], ['Throughout', 'Empty bins, replace liners', 'Every visit'], ['Showroom', 'Clean the inside of the glass frontage', 'Weekly'], ['Offices', 'Vacuum and dust the offices', 'Weekly']],
  Shop: [['Shop floor', 'Vacuum and mop the shop floor', 'Every visit'], ['Counter', 'Wipe the counter, the card machine and glass cabinets', 'Every visit'], ['Washroom', 'Clean the staff toilet and basin', 'Every visit'], ['Back room', 'Sweep the stock room, empty bins', 'Every visit'], ['Shop', 'Dust shelves and displays', 'Weekly'], ['Shop', 'Clean the inside of the shop window', 'Weekly']],
  Home: [['Kitchen', 'Wipe worktops and cupboard fronts, clean the hob and sink', 'Every visit'], ['Bathrooms', 'Clean the bath, shower, toilet and basin; polish taps and mirrors', 'Every visit'], ['Throughout', 'Vacuum carpets and mop hard floors', 'Every visit'], ['Living areas', 'Dust surfaces, shelves and ornaments', 'Every visit'], ['Bedrooms', 'Make beds, change linen when it is left out', 'Every visit'], ['Kitchen', 'Clean inside the microwave and wipe the fridge', 'Weekly'], ['Throughout', 'Dust skirting boards and door frames', 'Monthly']],
};
/** One-off work: [kind, weight, items [description, price, hours each, how many lo, hi], extras]. Prices before VAT. */
const JOB_KINDS = [
  ['End of tenancy clean', 4, [['End of tenancy clean, one-bedroom flat', 165, 5, 1, 1], ['End of tenancy clean, two-bedroom flat or house', 225, 7, 1, 1], ['End of tenancy clean, three-bedroom house', 295, 9, 1, 1]]],
  ['Carpet and upholstery cleaning', 3, [['Carpet clean, one room', 32, 0.75, 2, 5], ['Stairs and landing carpet clean', 30, 0.75, 1, 1], ['Sofa clean, three-seater', 55, 1, 1, 1], ['Rug clean', 22, 0.5, 1, 2]]],
  ['Oven clean', 2, [['Oven clean, single oven', 65, 2, 1, 1], ['Oven clean, double oven or range', 95, 3, 1, 1], ['Hob and extractor clean', 25, 0.75, 1, 1]]],
  ['Deep clean', 2, [['Deep clean, by the hour', 24, 1, 5, 10]]],
  ['After builders clean', 1, [['After builders clean, by the hour', 26, 1, 6, 12]]],
];
const EXTRAS = [['Oven clean, single oven', 60, 2], ['Fridge freezer clean', 25, 0.75], ['Inside windows', 35, 1], ['Carpet clean, one room', 30, 0.75], ['Hob and extractor clean', 25, 0.75]];
/** The store: [name, unit, cost, charged on, used per visit-hour on commercial sites]. */
const SUPPLIES = [
  ['Multi-surface cleaner', '5 l can', 7.4, false, 0.035], ['Washroom cleaner and descaler', '5 l can', 8.9, false, 0.03], ['Floor cleaner', '5 l can', 7.9, false, 0.025],
  ['Glass cleaner', 'box of 6 x 750 ml', 9.6, false, 0.015], ['Microfibre cloths', 'pack of 10', 6.2, false, 0.02], ['Mop heads', 'pack of 5', 11.5, false, 0.01],
  ['Disposable gloves', 'box of 100', 5.4, false, 0.025], ['Bin liners', 'roll of 200', 8.6, true, 0.025], ['Toilet rolls', 'case of 36', 17.8, true, 0.04],
  ['Hand towels', 'case of 3000', 22.4, true, 0.025], ['Hand soap', '5 l can', 9.2, true, 0.015], ['Air freshener refills', 'box of 6', 10.5, true, 0.008],
];
const SHORT = ['Late start: the previous site overran.', 'Meeting room in use, left out.', 'Building alarm fault, started late.', 'Left early: cleaner unwell.', 'Locked out of the first floor.'];
const MISSED = ['Cleaner off sick, no cover available.', 'No access: keys not left out.', 'Building closed without notice.'];
const ENDED = ['Moving to new premises.', 'Taking cleaning in house.', 'Found a cheaper quote.', 'Moving house.', 'Business closed.'];

/** Fill a Fernhollow Cleaning database made from `spec`. `r` is random(), `cal` calendar(). Answers counts. */
export function fill(base, { r, cal, days = 430 }) {
  const counts = {};
  const add = (table, values) => { counts[table] = (counts[table] || 0) + 1; return base.insert(table, values); };
  const quarter = (h) => Math.round(h * 4) / 4;
  const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '');
  // Each day's date made once: the fill asks for the same days many times.
  const dates = new Map();
  const at = (d) => { let x = dates.get(d); if (!x) { x = cal.at(d); dates.set(d, x); } return x; };
  // Closed on Christmas Day, Boxing Day and New Year's Day; open every other day but Sunday.
  const holiday = (d) => { const a = at(d); return (a.getMonth() === 11 && (a.getDate() === 25 || a.getDate() === 26)) || (a.getMonth() === 0 && a.getDate() === 1); };
  const working = (d) => cal.weekday(d) >= 1 && cal.weekday(d) <= 5 && !holiday(d);
  const nextWorking = (d) => { let x = d; while (!working(x)) x++; return x; };
  /** The same date a year on, as an offset. */
  const plusYear = (d) => { const a = at(d); return d + Math.round((Date.UTC(a.getFullYear() + 1, a.getMonth(), a.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5); };
  const monthName = (d) => `${MONTHS[at(d).getMonth()]} ${at(d).getFullYear()}`;
  const longDate = (d) => `${at(d).getDate()} ${monthName(d)}`;
  const SITE_NAME = { Office: 'Main office', Surgery: 'Surgery', Nursery: 'Nursery', Showroom: 'Showroom', Shop: 'Shop' };
  const place = () => {
    const [city, area, top, w] = r.weighted(TOWNS.map((t) => [t, t[3]]));
    void w;
    return { Address: `${r.int(1, 180)} ${r.pick(STREETS)}`, City: city, Postcode: `${area}${r.int(1, top)} ${r.int(1, 9)}${r.pick(['AB', 'DE', 'FG', 'HJ', 'NP', 'QR', 'TU', 'WX'])}` };
  };
  /** Numbers in a run for each year: PREFIX-2026-0042. */
  const runs = {};
  const numberFor = (prefix, d) => { const y = at(d).getFullYear(); const k = `${prefix}${y}`; runs[k] = (runs[k] || 0) + 1; return `${prefix}-${y}-${String(runs[k]).padStart(4, '0')}`; };

  add('Business', businessRecord({
    name: 'Fernhollow Cleaning', domain: 'fernhollow.example', phone: '020 7946 0230',
    address: { Address: '7 Foundry Lane', City: 'Leeds', Postcode: 'LS12 4HJ', Country: 'United Kingdom' },
    terms: 'Payment by the due date shown, by bank transfer.',
    footer: 'Thank you for choosing Fernhollow Cleaning. Every cleaner of ours is vetted and insured. Office open Monday to Friday, 8 to 5; for anything urgent out of hours, call the number above.',
  }));

  let start = -days;
  while (at(start).getDate() !== 1) start++;
  const END = 13; // the rota is booked two weeks ahead

  // Pay goes up each April, as the minimum wage does.
  const aprils = (d) => { let n = 0; for (let y = at(start).getFullYear(); y <= at(d).getFullYear(); y++) { const o = Math.round((Date.UTC(y, 3, 1) - Date.UTC(at(0).getFullYear(), at(0).getMonth(), at(0).getDate())) / 864e5); if (o > start && o <= d) n++; } return n; };

  // The cleaners. Each has days off: two weeks between June and September (taken in turns), a week at another time, and the odd day ill.
  const cleaners = [];
  const usedNames = new Set();
  for (let i = 0; i < 12; i++) {
    let p;
    do p = person(r, { domain: 'fernhollow.example' }); while (usedNames.has(p['Last Name']));
    usedNames.add(p['Last Name']);
    const joins = i === 10 ? start + r.int(150, 220) : i === 11 ? start + r.int(280, 340) : start - r.int(60, 1500);
    const c = { i, base: money(12.25 + r.int(0, 16) * 0.05), most: r.pick([16, 20, 25, 30, 30, 35]), joins, leaves: i === 3 ? start + r.int(200, 260) : null, slots: {}, off: new Set(), hours: 0 };
    const rates = new Map();
    c.payAt = (d) => { if (!rates.has(d)) rates.set(d, money(c.base * 1.041 ** aprils(d))); return rates.get(d); };
    for (let y = at(start).getFullYear(); y <= at(END).getFullYear(); y++) {
      const summer = Math.round((Date.UTC(y, 5, 1) - Date.UTC(at(0).getFullYear(), at(0).getMonth(), at(0).getDate())) / 864e5) + i * 9 + r.int(0, 4);
      for (let k = 0; k < 14; k++) c.off.add(summer + k);
      const other = summer - 120 - i * 7 + r.int(0, 3);
      for (let k = 0; k < 7; k++) c.off.add(other + k);
    }
    for (let d = start; d <= END; d++) if (r.chance(0.012)) c.off.add(d);
    c.id = add('Cleaners', {
      ...p, 'Payroll Ref': `CL-${String(i + 1).padStart(4, '0')}`, Phone: `07700 900${String(300 + i * 11).padStart(3, '0')}`, 'Hourly Pay': c.payAt(0),
      'Most Hours': c.most, Started: cal.day(joins), 'Vetted On': cal.day(joins - r.int(10, 30)), 'Left On': c.leaves == null ? null : cal.day(c.leaves), Active: c.leaves == null,
    });
    c.name = `${p['First Name']} ${p['Last Name']}`;
    cleaners.push(c);
  }
  const working_ = (c, d) => c.joins <= d && (c.leaves == null || d <= c.leaves);
  const slotKey = (wd, slot) => `${wd}|${slot}`;

  // Clients, their sites and contracts.
  const contracts = [];
  const clientsAll = [];
  const newClient = (kind, d) => {
    let name;
    let contact;
    let email;
    if (kind === 'Commercial') {
      const k = r.weighted(COMMERCIAL.map((x) => [x, x.weight]));
      do name = companies(r, 1, [k.tail])[0]; while (clientsAll.some((c) => c.name === name));
      const p = person(r, { domain: `${slug(name)}.example` });
      contact = `${p['First Name']} ${p['Last Name']}`;
      email = `accounts@${slug(name)}.example`;
      const a = place();
      const terms = r.weighted([[30, 5], [14, 2]]);
      const id = add('Clients', { Name: name, Kind: kind, 'Contact Name': contact, ...a, Phone: phoneFor(r, 'United Kingdom'), 'E-mail': email, 'Payment Days': terms, 'Client Since': cal.day(d) });
      const c = { id, name, kind, type: k.type, contact, address: a, slow: r.chance(0.15), terms, since: d };
      clientsAll.push(c);
      return c;
    }
    const p = person(r);
    name = `${p['First Name']} ${p['Last Name']}`;
    const a = place();
    const id = add('Clients', { Name: name, Kind: kind, 'Contact Name': name, ...a, Phone: phoneFor(r, 'United Kingdom'), 'E-mail': p['E-mail'], 'Payment Days': 7, 'Client Since': cal.day(d) });
    const c = { id, name, kind, type: 'Home', contact: name, address: a, slow: r.chance(0.1), terms: 7, since: d };
    clientsAll.push(c);
    return c;
  };
  const newSite = (client, name, type, a = place()) => {
    const contact = client.kind === 'Commercial' ? `${r.pick(['Reception', 'Office manager', 'Practice manager', 'Duty manager'])}: ${person(r)['First Name']}` : client.name;
    const access = client.kind === 'Commercial'
      ? r.pick(['Key and fob held at our office, ref K-', 'Key in the key safe by the side door; code from the office, ref K-', 'Let in by the security desk; sign in at reception, ref K-']) + String(r.int(100, 999))
      : r.pick(['Client is home; ring the bell.', 'Key under our care, ref K-' + String(r.int(100, 999)) + '; dog in the garden.', 'Key safe by the back door; code from the office.']);
    const id = add('Sites', { Client: client.id, Name: name, 'Site Type': type, ...a, 'Site Contact': contact, 'Access Notes': access });
    return { id, client, name, type, address: a, contact };
  };

  /** The days and time slot of a contract, and a cleaner free for all of them. */
  const SLOT_TIME = { early: '06:00', morning: '09:30', afternoon: '13:00', evening: '17:30' };
  const OTHER_SLOT = { early: 'evening', evening: 'early', morning: 'afternoon', afternoon: 'morning' };
  const pickCleaner = (k, d, except = null) => {
    // Free at the contract's time on all its days; failing that, at the other time of day the site allows.
    const one = pickAt(k, d, except);
    if (one) return one;
    k.slot = OTHER_SLOT[k.slot];
    const other = pickAt(k, d, except);
    if (!other) k.slot = OTHER_SLOT[k.slot];
    return other;
  };
  const pickAt = (k, d, except) => {
    const free = cleaners.filter((c) => c !== except && working_(c, d) && (c.leaves == null || c.leaves > d + 60) && k.days.every((wd) => !c.slots[slotKey(wd, k.slot)]));
    const room = free.filter((c) => c.hours + k.weekly <= c.most);
    const list = (room.length ? room : free).sort((a, b) => a.hours / a.most - b.hours / b.most);
    return list[0] || null;
  };
  const assign = (k, c) => {
    if (k.cleaner) { for (const wd of k.days) delete k.cleaner.slots[slotKey(wd, k.slot)]; k.cleaner.hours -= k.weekly; }
    k.cleaner = c;
    if (c) { for (const wd of k.days) c.slots[slotKey(wd, k.slot)] = k; c.hours += k.weekly; }
  };
  const makeContract = (site, d, status) => {
    const commercial = site.client.kind === 'Commercial';
    const vpw = commercial ? r.weighted([[5, 5], [3, 3], [2, 2], [6, 1]]) : r.weighted([[1, 5], [0.5, 3], [2, 1]]);
    const days = vpw >= 5 ? [1, 2, 3, 4, 5, 6].slice(0, vpw) : vpw === 3 ? [1, 3, 5] : vpw === 2 ? r.pick([[1, 4], [2, 5], [2, 4]]) : [r.int(1, 5)];
    const slot = commercial ? (site.type === 'Showroom' || site.type === 'Shop' ? 'early' : r.weighted([['early', 2], ['evening', 3]])) : r.pick(['morning', 'afternoon']);
    const hours = commercial ? r.pick(vpw >= 5 ? [1.5, 2, 2, 2.5, 3] : [2, 2.5, 3, 3.5]) : r.pick([2, 2.5, 3, 3, 3.5]);
    const rate = commercial ? money(19.5 + r.int(0, 14) * 0.25) : money(22 + r.int(0, 16) * 0.25);
    const k = { site, client: site.client, vpw, days, slot, hours, rate, weekly: hours * Math.max(1, vpw), parity: r.int(0, 1), start: d, end: plusYear(d) - 1, notice: commercial ? r.pick([30, 30, 60, 90]) : 14, status, cleaner: null, visits: [], unbilledSupplies: [] };
    while (k.end < start) { k.end = plusYear(k.end + 1) - 1; k.rate = money(Math.round(k.rate * 1.035 * 20) / 20); k.renewed = k.end - 364; }
    assign(k, pickCleaner(k, Math.max(d, start)));
    k.monthly = () => money(k.vpw * k.hours * k.rate * 52 / 12);
    k.id = add('Contracts', {
      Client: site.client.id, Site: site.id, Cleaner: k.cleaner ? k.cleaner.id : null, 'Start Date': cal.day(d), 'End Date': cal.day(k.end),
      'Last Renewed': k.renewed == null ? null : cal.day(k.renewed), 'Visits per Week': vpw, Days: days.map((x) => WEEKDAY[x]).join(', '),
      'Start Time': SLOT_TIME[slot], 'Hours per Visit': hours, Rate: k.rate, 'Monthly Estimate': k.monthly(), 'Notice Days': k.notice, Status: status,
    });
    (TASKS[site.type] || TASKS.Office).forEach(([area, task, often], n) => add('Contract Tasks', { Contract: k.id, Order: n + 1, Area: area, Task: task, 'How Often': often }));
    contracts.push(k);
    return k;
  };

  // The book when the records begin: commercial clients, a few with two sites, and households.
  for (let n = 0; n < 14; n++) {
    const c = newClient('Commercial', start - r.int(30, 1400));
    const s = newSite(c, c.type === 'Office' ? r.pick(['Head office', 'Main office']) : SITE_NAME[c.type], c.type, c.address);
    makeContract(s, c.since, 'Active');
    if (n < 3 && c.type === 'Office') makeContract(newSite(c, 'Second office', 'Office'), c.since + r.int(60, 400), 'Active');
  }
  for (let n = 0; n < 16; n++) {
    const c = newClient('Domestic', start - r.int(20, 1000));
    makeContract(newSite(c, c.address.Address.replace(/^\d+ /, ''), 'Home', c.address), c.since, 'Active');
  }
  // A household with a flat it lets out, cleaned between tenants: one-off jobs, no contract.
  const letting = clientsAll.filter((c) => c.kind === 'Commercial' && /Lettings/.test(c.name));

  const raised = []; // invoices: { id, due, total, payAt }
  const invoice = (client, d, values, lines) => {
    const net = money(lines.reduce((n, l) => n + money(l.qty * l.price), 0));
    const vat = money(lines.reduce((n, l) => n + money(money(l.qty * l.price) * 0.2), 0));
    const total = money(net + vat);
    const terms = client.terms;
    const id = add('Invoices', { Number: numberFor('INV', d), Client: client.id, ...values, 'Invoice Date': cal.day(d), 'Due Date': cal.day(d + terms), Net: net, VAT: vat, Total: total, Status: 'Sent' });
    for (const l of lines) add('Invoice Lines', { Invoice: id, Date: l.date, Kind: l.kind, Description: l.text, Quantity: l.qty, 'Unit Price': l.price, 'Tax Rate': 0.2 });
    const payAt = d + (client.slow && r.chance(0.7) ? terms + r.int(5, 40) : r.int(Math.min(3, terms), terms + 1));
    raised.push({ id, d, due: d + terms, total, payAt });
    return id;
  };

  // The store, stocked before the records begin.
  const weeklyUse = contracts.filter((k) => k.client.kind === 'Commercial').reduce((n, k) => n + k.vpw * k.hours, 0);
  const supplies = SUPPLIES.map(([name, unit, cost, recharge, use]) => {
    const level = Math.max(3, Math.ceil(use * weeklyUse * 2.5));
    const qty = Math.max(4, Math.ceil(use * weeklyUse * 4));
    const s = { name, unit, cost, recharge, use, level, qty, stock: 0, sell: recharge ? money(cost * 1.3) : null };
    s.id = add('Supplies', { Name: name, Unit: unit, 'Unit Cost': cost, Rechargeable: recharge, 'Sell Price': s.sell, 'In Stock': 0, 'Reorder Level': level, 'Reorder Quantity': qty });
    return s;
  });
  const move = (s, d, kind, n, contract, reference) => { s.stock += n; return add('Supply Movements', { Supply: s.id, Date: cal.day(d), Kind: kind, Quantity: n, 'Unit Cost': s.cost, Contract: contract ? contract.id : null, Reference: reference }); };
  for (const s of supplies) move(s, start - 3, 'Bought', s.qty + s.level, null, 'Opening stock');

  // Visits are kept here as the days run and written at the end, each with the invoice it went on.
  const visits = [];

  /** A quote for a one-off job on day `d`, answered within ten days. */
  const jobs = [];
  const jobDays = new Set(); // cleaner|day already given a job
  const quoteJob = (d) => {
    const [kind, , items] = r.weighted(JOB_KINDS.map((j) => [j, j[1]]));
    // End of tenancy work comes through the letting agents half the time; the rest from households and new people.
    let client;
    let site;
    if (kind === 'End of tenancy clean' && letting.length && r.chance(0.5)) {
      client = r.pick(letting);
      site = newSite(client, `Let property, ${place().Address}`, 'Home');
    } else {
      const k = r.chance(0.25) ? r.pick(contracts.filter((x) => x.client.kind === 'Domestic' && x.status === 'Active')) : null;
      client = k ? k.client : newClient('One-off', d);
      site = k ? k.site : newSite(client, client.address.Address.replace(/^\d+ /, ''), 'Home', client.address);
    }
    const lines = [];
    if (kind === 'End of tenancy clean') {
      const [t, p, h] = r.pick(items);
      lines.push({ text: t, qty: 1, price: p, hours: h });
      for (const [t2, p2, h2] of r.some(EXTRAS, r.int(0, 2))) lines.push({ text: t2, qty: 1, price: p2, hours: h2 });
    } else for (const [t, p, h, lo, hi] of r.some(items, Math.min(items.length, r.int(1, 2)))) lines.push({ text: t, qty: r.int(lo, hi), price: p, hours: h });
    // The quote as it prints: each line's VAT rounded, then added up.
    const net = money(lines.reduce((n, l) => n + money(l.qty * l.price), 0));
    const vat = money(lines.reduce((n, l) => n + money(money(l.qty * l.price) * 0.2), 0));
    const hours = quarter(lines.reduce((n, l) => n + l.qty * l.hours, 0));
    const job = { client, site, kind, lines, net, vat, hours, quoted: d, decide: d + r.int(1, 10), status: 'Quoted' };
    job.id = add('Jobs', { Number: numberFor('JOB', d), Client: client.id, Site: site.id, Kind: kind, 'Quoted On': cal.day(d), 'Valid Until': cal.day(d + 30), 'Estimated Hours': hours, Net: net, VAT: vat, Total: money(net + vat), Status: 'Quoted' });
    for (const l of lines) add('Job Items', { Job: job.id, Description: l.text, Quantity: l.qty, 'Unit Price': l.price, 'Tax Rate': 0.2 });
    jobs.push(job);
    return job;
  };
  /** Book `job` for day `on` with the least busy cleaner who is in that day and has no other job. */
  const book = (job, on) => {
    job.status = 'Booked';
    job.on = on;
    const free = cleaners.filter((c) => working_(c, on) && !c.off.has(on) && c.leaves == null && !jobDays.has(`${c.i}|${on}`)).sort((x, y) => x.hours / x.most - y.hours / y.most);
    job.cleaner = free[r.int(0, Math.min(2, free.length - 1))] || cleaners.find((c) => c.leaves == null);
    jobDays.add(`${job.cleaner.i}|${on}`);
  };

  for (let d = start; d <= END; d++) {
    const past = d <= -1;
    const wd = cal.weekday(d);
    const a = at(d);

    // The first working day of a month: each contract invoiced for the visits of the month before, and its supplies.
    if (past && working(d) && d > start + 3 && nextWorking(d - a.getDate() + 1) === d) {
      const monthStart = d - a.getDate() + 1;
      const period = monthName(monthStart - 1);
      for (const k of contracts) {
        const items = k.visits.filter((v) => !v.invoice && v.d < monthStart && v.charged > 0);
        const used = k.unbilledSupplies.filter((u) => u.d < monthStart);
        if (!items.length && !used.length) continue;
        const lines = items.map((v) => ({ date: cal.day(v.d), kind: 'Visit', text: `${WEEKDAY[cal.weekday(v.d)]} visit${v.status === 'Short' ? ', cut short' : ''}`, qty: v.charged, price: v.rate }));
        const bySupply = new Map();
        for (const u of used) bySupply.set(u.s, (bySupply.get(u.s) || 0) + u.n);
        for (const [s, n] of bySupply) lines.push({ date: null, kind: 'Supplies', text: `${s.name}, ${s.unit}`, qty: n, price: s.sell });
        const id = invoice(k.client, d, { Site: k.site.id, Contract: k.id, Period: period }, lines);
        for (const v of items) v.invoice = id;
        k.unbilledSupplies = k.unbilledSupplies.filter((u) => u.d >= monthStart);
      }
    }

    // Contracts: renewals at the year's end with a new rate, notice given and served, new clients signing up.
    if (past) {
      for (const k of contracts) {
        if (k.status === 'Pending' && k.start === d) k.status = 'Active';
        if ((k.status === 'Active') && d === k.end + 1) { k.end = plusYear(d) - 1; k.renewed = d; k.rate = money(Math.round(k.rate * (1.03 + r.int(0, 2) * 0.01) * 20) / 20); }
        if (k.status === 'Notice given' && d > k.endAt) {
          k.status = 'Ended'; k.ended = k.endAt; k.lastCleaner = k.cleaner ? k.cleaner.id : null;
          assign(k, null);
        }
        if (k.status === 'Active' && d - k.start > 120 && r.chance(k.client.kind === 'Commercial' ? 0.0006 : 0.0009)) {
          k.status = 'Notice given'; k.noticeOn = d; k.endAt = d + k.notice; k.why = r.pick(ENDED);
        }
      }
      // A new client about every three weeks, starting a week or three later.
      if (working(d) && r.chance(0.05)) {
        const kind = r.chance(0.4) ? 'Commercial' : 'Domestic';
        const c = newClient(kind, d);
        const s = kind === 'Commercial' ? newSite(c, SITE_NAME[c.type], c.type, c.address) : newSite(c, c.address.Address.replace(/^\d+ /, ''), 'Home', c.address);
        const k = makeContract(s, d + r.int(7, 21), 'Pending');
        k.signed = d;
      }
      // A cleaner who leaves hands their contracts to others.
      for (const c of cleaners) if (c.leaves === d) for (const k of contracts.filter((x) => x.cleaner === c)) { assign(k, null); assign(k, pickCleaner(k, d + 1, c)); }
    }

    // The day's visits, on each contract's days; done, short, covered or missed up to yesterday, booked from today.
    if (wd !== 0 && !holiday(d)) {
      const busy = new Set(); // cover taken today: cleaner|slot
      for (const k of contracts) {
        if (!k.days.includes(wd) || d < k.start || k.status === 'Ended' || (k.endAt != null && d > k.endAt)) continue;
        if (k.status === 'Pending' && d < k.start) continue;
        if (k.vpw === 0.5 && (Math.floor((d - start) / 7) % 2) !== k.parity) continue;
        if (!k.cleaner) assign(k, pickCleaner(k, d));
        let who = k.cleaner;
        let note = null;
        if (!who || who.off.has(d) || !working_(who, d)) {
          const cover = cleaners.filter((c) => c !== k.cleaner && working_(c, d) && !c.off.has(d) && !c.slots[slotKey(wd, k.slot)] && !busy.has(`${c.i}|${k.slot}`));
          who = cover.length && r.chance(0.95) ? r.pick(cover) : null;
          if (who) { busy.add(`${who.i}|${k.slot}`); note = `Covering for ${k.cleaner ? k.cleaner.name.split(' ')[0] : 'the regular cleaner'}.`; }
        }
        const v = { d, k, rate: k.rate, planned: k.hours, invoice: null };
        const values = { Contract: k.id, Cleaner: who ? who.id : (k.cleaner ? k.cleaner.id : null), Date: cal.day(d), 'Start Time': SLOT_TIME[k.slot], 'Planned Hours': k.hours, 'Charge Rate': k.rate, 'Pay Rate': who ? who.payAt(d) : null, Notes: note };
        if (!past) {
          values.Status = 'Booked';
          if (!who) values.Notes = 'Cover needed.';
        } else if (!who || r.chance(0.006)) {
          Object.assign(values, { Status: 'Missed', 'Hours Worked': 0, 'Hours Charged': 0, Notes: who ? r.pick(MISSED.slice(1)) : MISSED[0], 'Pay Rate': null });
          v.charged = 0;
        } else if (k.client.kind === 'Domestic' && r.chance(0.03)) {
          Object.assign(values, { Status: 'Cancelled', 'Hours Worked': 0, 'Hours Charged': 0, Notes: 'Client away; cancelled with notice.', 'Pay Rate': null });
          v.charged = 0;
        } else {
          const short = r.chance(0.04);
          const worked = short ? quarter(k.hours - 0.25 - r.int(0, 3) * 0.25) : r.chance(0.08) ? k.hours + 0.25 : k.hours;
          const signed = r.chance(d > -3 ? 0.5 : 0.86);
          Object.assign(values, { Status: short ? 'Short' : 'Done', 'Hours Worked': worked, 'Hours Charged': short ? worked : k.hours, 'Signed Off': signed, 'Signed Off By': signed ? k.site.contact.replace(/^.*: /, '') : null, Notes: short ? r.pick(SHORT) : note });
          v.charged = short ? worked : k.hours;
          v.status = values.Status;
          (who.worked ||= {})[d] = ((who.worked || {})[d] || 0) + worked;
        }
        v.values = values;
        visits.push(v);
        k.visits.push(v);
      }
    }

    // Supplies: taken out to the commercial sites every other Friday, bought each Monday when low.
    if (past && wd === 1) {
      for (const s of supplies) if (s.stock <= s.level) move(s, d, 'Bought', s.qty, null, numberFor('PO', d));
    }
    if (past && wd === 5 && Math.floor((d - start) / 7) % 2 === 0) {
      for (const k of contracts) {
        if (k.client.kind !== 'Commercial' || !k.visits.some((v) => v.d > d - 14 && v.charged > 0)) continue;
        for (const s of supplies) {
          const n = Math.min(s.stock, Math.floor(s.use * 2 * k.vpw * k.hours + r.next()));
          if (n <= 0) continue;
          move(s, d, 'Used', -n, k, k.site.name);
          if (s.recharge) k.unbilledSupplies.push({ d, s, n });
        }
      }
    }

    // One-off jobs: a quote every few days, more in summer when tenancies end; answered within ten days.
    const month = a.getMonth();
    if (past && working(d) && d > start + 24 && r.chance(month >= 5 && month <= 8 ? 0.5 : 0.3)) quoteJob(d);
    if (past) {
      for (const job of jobs) {
        if (job.status === 'Quoted' && job.decide === d) {
          if (r.chance(0.68)) book(job, nextWorking(d + r.int(3, 16)));
          else job.status = 'Declined';
        }
        if (job.status === 'Booked' && job.on === d) {
          job.status = 'Done';
          job.worked = quarter(job.hours * (0.85 + r.next() * 0.35));
          (job.cleaner.jobs ||= {})[d] = job.worked;
          job.invoice = invoice(job.client, d, { Site: job.site.id, Job: job.id, Period: `${job.kind} on ${longDate(d)}` }, job.lines.map((l) => ({ date: cal.day(d), kind: 'Job', text: l.text, qty: l.qty, price: l.price })));
        }
      }
    }

    // The month's end: a payslip for each cleaner who worked, paid on the seventh of the next month.
    if (past && at(d + 1).getDate() === 1) {
      const from = d - a.getDate() + 1;
      for (const c of cleaners) {
        let contractHours = 0;
        let jobHours = 0;
        for (let x = from; x <= d; x++) { contractHours += (c.worked || {})[x] || 0; jobHours += (c.jobs || {})[x] || 0; }
        if (!contractHours && !jobHours) continue;
        const rate = c.payAt(d);
        const jobRate = money(rate + 1);
        const lines = [];
        if (contractHours) lines.push({ text: `Contract cleaning, ${monthName(d)}`, hours: contractHours, rate, amount: money(contractHours * rate) });
        if (jobHours) lines.push({ text: `One-off jobs, ${monthName(d)}`, hours: jobHours, rate: jobRate, amount: money(jobHours * jobRate) });
        const pay = lines.reduce((n, l) => n + l.amount, 0);
        lines.push({ text: 'Holiday pay, 12.07 percent of the pay above', hours: null, rate: null, amount: money(pay * HOLIDAY_PAY) });
        const id = add('Payslips', {
          Number: numberFor('PAY', d), Cleaner: c.id, Period: monthName(d), 'Period Start': cal.day(from), 'Period End': cal.day(d), 'Pay Date': cal.day(nextWorking(d + 7)),
          'Contract Hours': contractHours, 'Job Hours': jobHours, Hours: contractHours + jobHours, Gross: money(lines.reduce((n, l) => n + l.amount, 0)),
        });
        for (const l of lines) add('Payslip Lines', { Payslip: id, Description: l.text, Hours: l.hours, Rate: l.rate, Amount: l.amount });
      }
    }
  }

  // Always a quote waiting and a job booked in the next fortnight.
  if (!jobs.some((j) => j.status === 'Quoted')) { let d = -1; while (!working(d)) d--; const j = quoteJob(d); j.decide = 5; }
  if (!jobs.some((j) => j.status === 'Booked' && j.on >= 0 && j.on <= 13)) {
    const j = jobs.filter((x) => x.status === 'Declined' && x.quoted > -20).pop();
    if (j) book(j, nextWorking(r.int(1, 9)));
    else { let d = -1; while (!working(d)) d--; book(quoteJob(d), nextWorking(r.int(2, 9))); }
  }
  for (const j of jobs) {
    base.update('Jobs', j.id, {
      Status: j.status, 'Booked For': j.on == null || j.status === 'Declined' ? null : cal.day(j.on), Cleaner: j.cleaner && j.status !== 'Declined' && j.status !== 'Quoted' ? j.cleaner.id : null,
      'Hours Worked': j.worked ?? null, 'Signed Off By': j.status === 'Done' ? j.client.contact : null, Notes: j.status === 'Declined' ? r.pick(['Went with another quote.', 'Did it themselves.', 'No reply after a follow-up call.']) : null,
    });
  }

  // Paid by yesterday, or not yet. If nothing is overdue, a recent client has gone quiet.
  if (!raised.some((x) => x.due < 0 && x.payAt > -1)) { const quiet = raised.filter((x) => x.due >= -40 && x.due <= -3).pop(); if (quiet) quiet.payAt = 5; }
  for (const x of raised) if (x.payAt <= -1) base.update('Invoices', x.id, { 'Paid On': cal.day(Math.max(x.d, x.payAt)), Status: 'Paid' });

  // Something always comes up for renewal in the next two months.
  const live = contracts.filter((k) => k.status === 'Active' && k.start < -30);
  if (!live.some((k) => k.end >= 0 && k.end <= 60) && live.length) { const k = live[r.int(0, live.length - 1)]; k.end = r.int(12, 50); }
  // Contracts numbered in the order they started, a run each year: CON-2026-0012.
  const order = [...contracts].sort((x, y) => x.start - y.start || x.id - y.id);
  const conRuns = {};
  for (const k of order) {
    const y = at(k.start).getFullYear();
    conRuns[y] = (conRuns[y] || 0) + 1;
    base.update('Contracts', k.id, {
      Number: `CON-${y}-${String(conRuns[y]).padStart(4, '0')}`, Status: k.status, 'Start Time': SLOT_TIME[k.slot], Cleaner: k.cleaner ? k.cleaner.id : (k.lastCleaner || null),
      'End Date': cal.day(k.endAt ?? k.end), 'Last Renewed': k.renewed == null ? null : cal.day(k.renewed), Rate: k.rate, 'Monthly Estimate': k.monthly(),
      'Notice Given On': k.noticeOn == null ? null : cal.day(k.noticeOn), 'Ended On': k.ended == null ? null : cal.day(k.ended), Notes: k.why || null,
    });
  }

  // A stock count, and a shelf always running low somewhere.
  for (const s of r.some(supplies, 2)) if (s.stock > 2) move(s, -r.int(10, 40), 'Adjusted', -1, null, 'Stock count');
  if (!supplies.some((s) => s.stock <= s.level)) { const s = [...supplies].sort((x, y) => (x.stock - x.level) - (y.stock - y.level))[0]; move(s, -1, 'Adjusted', -(s.stock - s.level), null, 'Stock count: damaged in the store'); }
  for (const s of supplies) base.update('Supplies', s.id, { 'In Stock': s.stock });
  for (const v of visits) add('Visits', { ...v.values, Invoice: v.invoice });
  return counts;
}
