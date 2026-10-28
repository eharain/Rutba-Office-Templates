// Rutba Office Sample Databases Licence, not the AGPL: see LICENSE in this folder.
//
// The garage: Quarrybank Motors, an invented independent garage and MOT
// test centre with four bays, three technicians, a workshop manager who also
// tests, and a service desk. Customers and their vehicles, the businesses
// that run a few vans or cars on a trade account, bookings, job cards with
// the labour and parts on each, MOT tests with their failures and
// advisories, service history, the reminders sent when an MOT or service
// falls due, estimates, invoices, the parts on the shelf and the motor
// factors they come from.
//
// Its records come from about thirteen months of work, run a day at a time.
// Four weeks before a vehicle's MOT or service is due the garage sends a
// reminder, and most customers book in. Repairs come in from phone calls
// and from estimates; MOT failures are put right and retested; some
// advisories are fixed there and then, most are left for later. Parts come
// off the shelf, or from the motor factor the same day; clutches and timing
// belts take a day or two. Private customers pay on collection; trade
// accounts are invoiced and pay within thirty days, a few of them late.
//
// Every registration in it is invented and has a Q among its last three
// letters, which current British plates never use, so none is a real car's.
// The makes and models are invented too. The MOT test numbers are in a
// sample format of the garage's own (MT-2026-00042), not the national one.

import { BUSINESS_ABOUT, BUSINESS_TABLE, businessRecord, companies, money, person, phoneFor } from './util.js';

// Its print templates need Office 2.16.0 or later: they say which records they print and when a line shows.
export const minOffice = '2.16.0';

const ref = (table) => ({ type: 'integer', points: table });
const CUSTOMER = '[Customers].[First Name] & " " & [Customers].[Last Name]';
const TECHNICIAN = '[Staff].[First Name] & " " & [Staff].[Last Name]';
const VEHICLE = '[Make] & " " & [Model]';
// A line's net amount and its VAT, each rounded to the penny, as the documents add them up.
const NET = 'Round([Quantity] * [Unit Price], 2)';
const VAT = `Round(${NET} * [Tax Rate], 2)`;
const OVERDUE = 'IIf(DateDiff("d", [Due Date], Date()) > 0, DateDiff("d", [Due Date], Date()), 0)';
const FOOT = { type: 'text', text: '{Business.Document Footer}', small: true };
const LETTERHEAD = { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'E-mail', 'Tax Number'] };

export const spec = {
  // Where a value below nought is right: nothing in this garage.
  negative: {},
  tables: [
    BUSINESS_TABLE,
    { name: 'Accounts', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Contact', type: 'text' }, { name: 'Phone', type: 'text' },
      { name: 'E-mail', type: 'text' }, { name: 'Address', type: 'text' }, { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' },
      { name: 'Payment Days', type: 'integer', default: 30 }, { name: 'Credit Limit', type: 'currency' }, { name: 'Opened', type: 'date' },
    ] },
    { name: 'Customers', show: ['First Name', 'Last Name', 'Postcode'], fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Account', ...ref('Accounts') },
      { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Address', type: 'text' }, { name: 'City', type: 'text' },
      { name: 'Postcode', type: 'text' }, { name: 'Remind By', type: 'text', default: 'Letter' }, { name: 'Joined', type: 'date' },
    ] },
    { name: 'Staff', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Role', type: 'text' },
      { name: 'MOT Tester', type: 'yesno' }, { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Started', type: 'date' },
      { name: 'Active', type: 'yesno', default: true },
    ] },
    { name: 'Suppliers', fields: [
      { name: 'Name', type: 'text', required: true }, { name: 'Contact', type: 'text' }, { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' },
      { name: 'Supplies', type: 'text' }, { name: 'Deliveries', type: 'text' }, { name: 'Our Account', type: 'text' },
    ] },
    { name: 'Parts', fields: [
      { name: 'Code', type: 'text', unique: true }, { name: 'Name', type: 'text', required: true }, { name: 'Category', type: 'text' },
      { name: 'Supplier', ...ref('Suppliers') }, { name: 'Unit', type: 'text' }, { name: 'Cost', type: 'currency' }, { name: 'Price', type: 'currency' },
      { name: 'In Stock', type: 'integer', default: 0 }, { name: 'Reorder Level', type: 'integer', default: 2 },
      { name: 'Reorder Quantity', type: 'integer', default: 6 }, { name: 'Stocked', type: 'yesno', default: true }, { name: 'Bin', type: 'text' },
    ] },
    // Registration is the first text field, so a document that names a vehicle alone prints its registration.
    { name: 'Vehicles', show: ['Registration'], fields: [
      { name: 'Registration', type: 'text', required: true, unique: true }, { name: 'Customer', ...ref('Customers'), required: true },
      { name: 'Make', type: 'text' }, { name: 'Model', type: 'text' }, { name: 'Body', type: 'text' }, { name: 'Fuel', type: 'text' },
      { name: 'Year', type: 'integer' }, { name: 'Colour', type: 'text' }, { name: 'Tyre Size', type: 'text' }, { name: 'Mileage', type: 'integer' },
      { name: 'MOT Due', type: 'date' }, { name: 'Service Due', type: 'date' }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Bookings', show: ['Date', 'Time', 'Vehicle'], fields: [
      { name: 'Vehicle', ...ref('Vehicles'), required: true }, { name: 'Date', type: 'date', required: true }, { name: 'Time', type: 'text' },
      { name: 'Work', type: 'text' }, { name: 'Booked On', type: 'date' }, { name: 'Status', type: 'text', default: 'Booked' },
      { name: 'Courtesy Car', type: 'yesno' }, { name: 'Notes', type: 'text' },
    ] },
    // Number is the first text field, so a document that names a job card alone prints its number.
    { name: 'Job Cards', show: ['Number'], fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Vehicle', ...ref('Vehicles'), required: true }, { name: 'Booking', ...ref('Bookings') },
      { name: 'Technician', ...ref('Staff') }, { name: 'Opened', type: 'date' }, { name: 'Mileage In', type: 'integer' },
      { name: 'Work Requested', type: 'text' }, { name: 'Status', type: 'text', default: 'Open' }, { name: 'Closed', type: 'date' },
      { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Part Orders', fields: [
      { name: 'Supplier', ...ref('Suppliers'), required: true }, { name: 'Part', ...ref('Parts'), required: true }, { name: 'Job Card', ...ref('Job Cards') },
      { name: 'Quantity', type: 'integer', default: 1 }, { name: 'Unit Cost', type: 'currency' }, { name: 'Ordered On', type: 'date' },
      { name: 'Expected', type: 'date' }, { name: 'Received On', type: 'date' }, { name: 'Status', type: 'text', default: 'On order' },
    ] },
    // The labour, parts and MOT fee on each job card; once invoiced, a line also points at its invoice.
    { name: 'Job Lines', fields: [
      { name: 'Job Card', ...ref('Job Cards'), required: true }, { name: 'Technician', ...ref('Staff') },
      { name: 'Part', ...ref('Parts') }, { name: 'Kind', type: 'text', default: 'Labour' }, { name: 'Description', type: 'text' },
      { name: 'Quantity', type: 'number', default: 1 }, { name: 'Unit Price', type: 'currency' }, { name: 'Unit Cost', type: 'currency' },
      { name: 'Tax Rate', type: 'number', default: 0.2 }, { name: 'Done On', type: 'date' },
    ] },
    { name: 'MOT Tests', show: ['Test Number'], fields: [
      { name: 'Test Number', type: 'text', unique: true }, { name: 'Vehicle', ...ref('Vehicles'), required: true }, { name: 'Job Card', ...ref('Job Cards') },
      { name: 'Tester', ...ref('Staff') }, { name: 'Test Date', type: 'date' }, { name: 'Mileage', type: 'integer' }, { name: 'Result', type: 'text' },
      { name: 'Expires', type: 'date' }, { name: 'Retest Of', ...ref('MOT Tests') }, { name: 'Fee', type: 'currency' },
    ] },
    { name: 'MOT Items', fields: [
      { name: 'MOT Test', ...ref('MOT Tests'), required: true }, { name: 'Kind', type: 'text', default: 'Advisory' }, { name: 'Item', type: 'text' },
      { name: 'Fixed', type: 'yesno' }, { name: 'Fixed On', type: 'date' },
    ] },
    { name: 'Services', fields: [
      { name: 'Vehicle', ...ref('Vehicles'), required: true }, { name: 'Job Card', ...ref('Job Cards') }, { name: 'Service Date', type: 'date' },
      { name: 'Kind', type: 'text' }, { name: 'Mileage', type: 'integer' }, { name: 'Next Due', type: 'date' }, { name: 'Next Due Mileage', type: 'integer' },
    ] },
    { name: 'Reminders', fields: [
      { name: 'Vehicle', ...ref('Vehicles'), required: true }, { name: 'Kind', type: 'text' }, { name: 'Due', type: 'date' },
      { name: 'Method', type: 'text', default: 'Letter' }, { name: 'Sent On', type: 'date' }, { name: 'Booked', type: 'yesno' },
    ] },
    { name: 'Estimates', show: ['Number'], fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Vehicle', ...ref('Vehicles'), required: true }, { name: 'Estimate Date', type: 'date' },
      { name: 'Valid Until', type: 'date' }, { name: 'Work', type: 'text' }, { name: 'Net', type: 'currency' }, { name: 'Tax', type: 'currency' },
      { name: 'Total', type: 'currency' }, { name: 'Answer', type: 'text' }, { name: 'Answered On', type: 'date' }, { name: 'Job Card', ...ref('Job Cards') },
    ] },
    { name: 'Estimate Lines', fields: [
      { name: 'Estimate', ...ref('Estimates'), required: true }, { name: 'Kind', type: 'text', default: 'Labour' }, { name: 'Description', type: 'text' },
      { name: 'Quantity', type: 'number', default: 1 }, { name: 'Unit Price', type: 'currency' }, { name: 'Tax Rate', type: 'number', default: 0.2 },
    ] },
    { name: 'Invoices', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Job Card', ...ref('Job Cards'), required: true }, { name: 'Account', ...ref('Accounts') },
      { name: 'Invoice Date', type: 'date' }, { name: 'Due Date', type: 'date' }, { name: 'Net', type: 'currency' }, { name: 'Tax', type: 'currency' },
      { name: 'Total', type: 'currency' }, { name: 'Paid On', type: 'date' }, { name: 'Method', type: 'text' },
    ] },
  ],
  queries: {
    'Bookings today and tomorrow': { tables: ['Bookings', 'Vehicles', 'Customers'], columns: [
      { table: 'Bookings', field: 'Date', sort: 'asc' }, { table: 'Bookings', field: 'Time', sort: 'asc' }, { table: 'Vehicles', field: 'Registration' },
      { expr: VEHICLE, as: 'Vehicle' }, { expr: CUSTOMER, as: 'Customer' }, { table: 'Customers', field: 'Phone' }, { table: 'Bookings', field: 'Work' },
      { table: 'Bookings', field: 'Courtesy Car' }, { table: 'Bookings', field: 'Status' },
      { expr: 'DateDiff("d", Date(), [Date])', as: 'Days Ahead', criteria: ['Between 0 And 1'], show: false },
      { table: 'Bookings', field: 'Status', criteria: ['<> "Cancelled"'], show: false },
    ] },
    'Bookings next 7 days': { tables: ['Bookings', 'Vehicles', 'Customers'], columns: [
      { table: 'Bookings', field: 'Date', total: 'group', sort: 'asc' }, { table: 'Bookings', field: 'ID', as: 'Bookings', total: 'count' },
      { expr: 'IIf(Left([Work], 3) = "MOT", 1, 0)', as: 'MOTs', total: 'sum' }, { expr: 'IIf([Courtesy Car], 1, 0)', as: 'Courtesy Cars', total: 'sum' },
      { expr: 'DateDiff("d", Date(), [Date])', as: 'Days Ahead', total: 'where', criteria: ['Between 0 And 7'] },
      { table: 'Bookings', field: 'Status', total: 'where', criteria: ['<> "Cancelled"'] },
    ] },
    'MOTs due next month': { tables: ['Vehicles', 'Customers'], columns: [
      { table: 'Vehicles', field: 'MOT Due', sort: 'asc' }, { table: 'Vehicles', field: 'Registration' }, { expr: VEHICLE, as: 'Vehicle' },
      { expr: CUSTOMER, as: 'Customer' }, { table: 'Customers', field: 'Address' }, { table: 'Customers', field: 'City' }, { table: 'Customers', field: 'Postcode' },
      { table: 'Customers', field: 'Phone' }, { table: 'Customers', field: 'Remind By' },
      { expr: 'DateDiff("m", Date(), [MOT Due])', as: 'Months Ahead', criteria: ['1'], show: false },
    ] },
    'Services due next 30 days': { tables: ['Vehicles', 'Customers'], columns: [
      { table: 'Vehicles', field: 'Service Due', sort: 'asc' }, { table: 'Vehicles', field: 'Registration' }, { expr: VEHICLE, as: 'Vehicle' },
      { table: 'Vehicles', field: 'Mileage' }, { expr: CUSTOMER, as: 'Customer' }, { table: 'Customers', field: 'Phone' }, { table: 'Customers', field: 'Remind By' },
      { expr: 'DateDiff("d", Date(), [Service Due])', as: 'Days Left', criteria: ['Between 0 And 30'] },
    ] },
    'Reminders to send': { tables: ['Reminders', 'Vehicles', 'Customers'], columns: [
      { table: 'Reminders', field: 'Due', sort: 'asc' }, { table: 'Reminders', field: 'Kind' }, { table: 'Vehicles', field: 'Registration' },
      { expr: CUSTOMER, as: 'Customer' }, { table: 'Reminders', field: 'Method' }, { table: 'Customers', field: 'E-mail' }, { table: 'Customers', field: 'Phone' },
      { table: 'Reminders', field: 'Sent On', criteria: ['Is Null'], show: false },
    ] },
    'Advisories not fixed': { tables: ['MOT Items', 'MOT Tests', 'Vehicles', 'Customers'], columns: [
      { table: 'Vehicles', field: 'Registration', sort: 'asc' }, { expr: VEHICLE, as: 'Vehicle' }, { expr: CUSTOMER, as: 'Customer' },
      { table: 'Customers', field: 'Phone' }, { table: 'MOT Tests', field: 'Test Date', sort: 'desc' }, { table: 'MOT Items', field: 'Item', as: 'Advisory' },
      { table: 'MOT Items', field: 'Kind', criteria: ['Advisory'], show: false }, { table: 'MOT Items', field: 'Fixed', criteria: ['No'], show: false },
      { expr: 'DateDiff("d", [Test Date], Date())', as: 'Days Ago', criteria: ['Between 0 And 365'], show: false },
    ] },
    'Open job cards': { tables: ['Job Cards', 'Vehicles', 'Customers', 'Staff'], columns: [
      { table: 'Job Cards', field: 'Number', as: 'Job Card' }, { table: 'Job Cards', field: 'Opened', sort: 'asc' }, { table: 'Vehicles', field: 'Registration' },
      { expr: VEHICLE, as: 'Vehicle' }, { expr: CUSTOMER, as: 'Customer' }, { table: 'Customers', field: 'Phone' }, { table: 'Job Cards', field: 'Work Requested' },
      { expr: TECHNICIAN, as: 'Technician' }, { table: 'Job Cards', field: 'Status' }, { expr: 'DateDiff("d", [Opened], Date())', as: 'Days Open' },
      { table: 'Job Cards', field: 'Closed', criteria: ['Is Null'], show: false },
    ] },
    'Technician hours last 30 days': { tables: ['Job Lines', 'Staff'], columns: [
      { expr: TECHNICIAN, as: 'Technician', total: 'group', sort: 'asc' }, { table: 'Job Lines', field: 'Quantity', as: 'Hours Sold', total: 'sum' },
      { expr: NET, as: 'Labour Sold', total: 'sum' }, { table: 'Job Lines', field: 'Job Card', as: 'Lines', total: 'count' },
      { table: 'Job Lines', field: 'Kind', total: 'where', criteria: ['Labour'] },
      { expr: 'DateDiff("d", [Done On], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 30'] },
    ] },
    'Technician hours by month': { tables: ['Job Lines', 'Staff'], columns: [
      { expr: 'Format([Done On], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { expr: TECHNICIAN, as: 'Technician', total: 'group', sort: 'asc' },
      { table: 'Job Lines', field: 'Quantity', as: 'Hours Sold', total: 'sum' }, { expr: NET, as: 'Labour Sold', total: 'sum' },
      { table: 'Job Lines', field: 'Kind', total: 'where', criteria: ['Labour'] }, { table: 'Job Lines', field: 'Done On', total: 'where', criteria: ['Is Not Null'] },
    ] },
    'Parts margin': { tables: ['Job Lines', 'Parts'], columns: [
      { table: 'Parts', field: 'Category', total: 'group', sort: 'asc' }, { table: 'Job Lines', field: 'Quantity', as: 'Units', total: 'sum' },
      { expr: NET, as: 'Sales', total: 'sum' }, { expr: 'Round([Quantity] * [Unit Cost], 2)', as: 'Cost of Parts', total: 'sum' },
      { expr: 'Round([Quantity] * ([Unit Price] - [Unit Cost]), 2)', as: 'Margin', total: 'sum', sort: 'desc' },
      { table: 'Job Lines', field: 'Done On', total: 'where', criteria: ['Is Not Null'] },
    ] },
    'Takings by month': { tables: ['Invoices'], columns: [
      { expr: 'Format([Paid On], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Invoices', field: 'ID', as: 'Invoices Paid', total: 'count' },
      { table: 'Invoices', field: 'Total', as: 'Takings', total: 'sum' }, { table: 'Invoices', field: 'Paid On', total: 'where', criteria: ['Is Not Null'] },
    ] },
    'VAT by month': { tables: ['Invoices'], columns: [
      { expr: 'Format([Invoice Date], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Invoices', field: 'ID', as: 'Invoices', total: 'count' },
      { table: 'Invoices', field: 'Net', as: 'Net Sales', total: 'sum' }, { table: 'Invoices', field: 'Tax', as: 'VAT', total: 'sum' },
      { table: 'Invoices', field: 'Total', as: 'Invoiced', total: 'sum' },
    ] },
    'MOT results by month': { tables: ['MOT Tests'], columns: [
      { expr: 'Format([Test Date], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'MOT Tests', field: 'ID', as: 'Tests', total: 'count' },
      { expr: 'IIf([Result] = "Pass", 1, 0)', as: 'Passed', total: 'sum' }, { expr: 'IIf([Result] = "Fail", 1, 0)', as: 'Failed', total: 'sum' },
      { expr: 'IIf(Nz([Retest Of], 0) > 0, 1, 0)', as: 'Retests', total: 'sum' },
    ] },
    'Service history': { tables: ['Services', 'Job Cards', 'Vehicles'], columns: [
      { table: 'Vehicles', field: 'Registration', sort: 'asc' }, { expr: VEHICLE, as: 'Vehicle' }, { table: 'Services', field: 'Service Date', sort: 'desc' },
      { table: 'Services', field: 'Kind' }, { table: 'Services', field: 'Mileage' }, { table: 'Job Cards', field: 'Number', as: 'Job Card' },
      { table: 'Services', field: 'Next Due' }, { table: 'Services', field: 'Next Due Mileage' },
    ] },
    'Estimates awaiting answer': { tables: ['Estimates', 'Vehicles', 'Customers'], columns: [
      { table: 'Estimates', field: 'Number', as: 'Estimate' }, { table: 'Estimates', field: 'Estimate Date', sort: 'asc' }, { table: 'Vehicles', field: 'Registration' },
      { expr: CUSTOMER, as: 'Customer' }, { table: 'Customers', field: 'Phone' }, { table: 'Estimates', field: 'Work' }, { table: 'Estimates', field: 'Total' },
      { table: 'Estimates', field: 'Valid Until' }, { table: 'Estimates', field: 'Answer', criteria: ['Is Null'], show: false },
    ] },
    'Parts to reorder': { tables: ['Parts', 'Suppliers'], columns: [
      { table: 'Suppliers', field: 'Name', as: 'Supplier', sort: 'asc' }, { table: 'Parts', field: 'Code', sort: 'asc' }, { table: 'Parts', field: 'Name', as: 'Part' },
      { table: 'Parts', field: 'In Stock' }, { table: 'Parts', field: 'Reorder Level' }, { table: 'Parts', field: 'Reorder Quantity' }, { table: 'Parts', field: 'Cost' },
      { expr: 'Round([Reorder Quantity] * [Cost], 2)', as: 'Order Value' },
      { expr: '[In Stock] - [Reorder Level]', as: 'Spare', criteria: ['<= 0'], show: false }, { table: 'Parts', field: 'Stocked', criteria: ['Yes'], show: false },
    ] },
    'Trade accounts to chase': { tables: ['Invoices', 'Accounts', 'Job Cards', 'Vehicles'], columns: [
      { table: 'Accounts', field: 'Name', as: 'Account', sort: 'asc' }, { table: 'Accounts', field: 'Contact' }, { table: 'Accounts', field: 'Phone' },
      { table: 'Invoices', field: 'Number', as: 'Invoice' }, { table: 'Vehicles', field: 'Registration' }, { table: 'Invoices', field: 'Invoice Date' },
      { table: 'Invoices', field: 'Due Date', sort: 'asc' }, { table: 'Invoices', field: 'Total' }, { expr: OVERDUE, as: 'Days Overdue' },
      { table: 'Invoices', field: 'Paid On', criteria: ['Is Null'], show: false },
    ] },
  },
  reports: [
    { name: 'Day sheet', title: 'Bookings: today and tomorrow', query: 'Bookings today and tomorrow', group: 'Date', sort: 'Time', columns: ['Time', 'Registration', 'Vehicle', 'Customer', 'Phone', 'Work', 'Courtesy Car', 'Status'], totals: [{ field: 'Registration', fn: 'count' }] },
    { name: 'MOT reminder list', title: 'MOTs due next month', query: 'MOTs due next month', columns: [{ field: 'MOT Due', type: 'date' }, 'Registration', 'Vehicle', 'Customer', 'Address', 'City', 'Postcode', 'Remind By'], totals: [{ field: 'Registration', fn: 'count' }] },
    { name: 'Advisories to follow up', query: 'Advisories not fixed', group: 'Registration', columns: [{ field: 'Test Date', type: 'date' }, 'Advisory', 'Customer', 'Phone'], totals: [{ field: 'Advisory', fn: 'count' }] },
    { name: 'Work in progress', query: 'Open job cards', group: 'Status', columns: ['Job Card', { field: 'Opened', type: 'date' }, 'Registration', 'Vehicle', 'Work Requested', 'Technician', { field: 'Days Open', type: 'integer' }], totals: [{ field: 'Job Card', fn: 'count' }] },
    { name: 'Technician hours', title: 'Hours sold by technician, by month', query: 'Technician hours by month', group: 'Month', columns: ['Technician', { field: 'Hours Sold', type: 'number' }, { field: 'Labour Sold', type: 'currency' }], totals: [{ field: 'Hours Sold', fn: 'sum' }, { field: 'Labour Sold', fn: 'sum' }] },
    { name: 'Takings by month', query: 'Takings by month', columns: ['Month', { field: 'Invoices Paid', type: 'integer' }, { field: 'Takings', type: 'currency' }], totals: [{ field: 'Invoices Paid', fn: 'sum' }, { field: 'Takings', fn: 'sum' }] },
    { name: 'VAT by month', title: 'VAT by month, from the invoices', query: 'VAT by month', columns: ['Month', { field: 'Invoices', type: 'integer' }, { field: 'Net Sales', type: 'currency' }, { field: 'VAT', type: 'currency' }, { field: 'Invoiced', type: 'currency' }], totals: [{ field: 'Net Sales', fn: 'sum' }, { field: 'VAT', fn: 'sum' }, { field: 'Invoiced', fn: 'sum' }] },
    { name: 'Parts to order', query: 'Parts to reorder', group: 'Supplier', columns: ['Code', 'Part', { field: 'In Stock', type: 'integer' }, { field: 'Reorder Level', type: 'integer' }, { field: 'Reorder Quantity', type: 'integer' }, { field: 'Cost', type: 'currency' }, { field: 'Order Value', type: 'currency' }], totals: [{ field: 'Order Value', fn: 'sum' }] },
    { name: 'Trade invoices due', query: 'Trade accounts to chase', group: 'Account', sort: 'Due Date', columns: ['Invoice', 'Registration', { field: 'Invoice Date', type: 'date' }, { field: 'Due Date', type: 'date' }, { field: 'Days Overdue', type: 'integer' }, { field: 'Total', type: 'currency' }], totals: [{ field: 'Total', fn: 'sum' }] },
  ],
  // The print templates: one document for each record of the table named.
  documents: [
    // The written estimate: for estimates not yet answered or still in date. One answered says so.
    { name: 'Estimate', table: 'Estimates', paper: 'a4', where: 'Nz([Answer], "") = "" Or DateDiff("d", Date(), [Valid Until]) >= 0', letterhead: LETTERHEAD,
      blocks: [
        { type: 'heading', text: 'Estimate {Number}' },
        { type: 'fields', columns: 2, items: [
          { field: 'Number', label: 'Estimate' }, { field: 'Estimate Date', label: 'Date', format: 'dd/mm/yyyy' }, { field: 'Valid Until', label: 'Valid until', format: 'dd/mm/yyyy' },
          { field: 'Vehicle.Customer', label: 'For' }, { field: 'Vehicle.Customer.Address', label: 'Address' }, { field: 'Vehicle.Customer.Postcode', label: 'Postcode' },
          { field: 'Vehicle', label: 'Registration' }, { field: 'Vehicle.Make', label: 'Make' }, { field: 'Vehicle.Model', label: 'Model' }, { field: 'Vehicle.Mileage', label: 'Mileage' },
        ] },
        { type: 'fields', columns: 1, items: [{ field: 'Work', label: 'Work to be done' }] },
        { type: 'lines', table: 'Estimate Lines', columns: [
          { field: 'Kind', label: 'Item' }, { field: 'Description' }, { field: 'Quantity', label: 'Qty or hours', type: 'number' }, { field: 'Unit Price', label: 'Price', type: 'currency' },
          { expr: NET, as: 'Net', type: 'currency' }, { expr: 'Nz([Tax Rate]) * 100', as: 'VAT Rate', label: 'VAT %', type: 'number', format: '0' }, { expr: VAT, as: 'VAT', type: 'currency' },
        ] },
        { type: 'totals', rows: [{ label: 'Net', expr: '[Net]' }, { label: 'VAT', expr: '[VAT]' }, { label: 'Estimated total', expr: '[Net] + [VAT]', strong: true }] },
        { type: 'text', text: '{Answer} on {Answered On}.', if: '[Answer]' },
        { type: 'text', text: 'This estimate is our price for the work above, and holds until {Valid Until}. If we find anything else once the work starts, we will ring you before we do it: nothing more is done without your say-so.' },
        { type: 'text', text: 'To book the work in, call us on {Business.Phone} quoting {Number}.', if: 'Nz([Answer], "") = ""' },
        FOOT,
      ] },
    // Kept with the keys while the vehicle is in: for job cards not yet invoiced.
    { name: 'Job card', table: 'Job Cards', paper: 'a4', where: '[Status] <> "Invoiced"', letterhead: { table: 'Business', fields: ['Name', 'Phone'] },
      blocks: [
        { type: 'heading', text: 'Job card {Number}' },
        { type: 'fields', columns: 3, items: [
          { field: 'Number', label: 'Job card' }, { field: 'Opened', label: 'Opened', format: 'dd/mm/yyyy' }, { field: 'Technician', label: 'Technician', type: 'text' },
          { field: 'Vehicle', label: 'Registration' }, { field: 'Vehicle.Make', label: 'Make' }, { field: 'Vehicle.Model', label: 'Model' },
          { field: 'Vehicle.Fuel', label: 'Fuel' }, { field: 'Vehicle.Year', label: 'Year' }, { field: 'Mileage In', label: 'Mileage in' },
          { field: 'Vehicle.Customer', label: 'Customer' }, { field: 'Vehicle.Customer.Phone', label: 'Phone' }, { field: 'Vehicle.Tyre Size', label: 'Tyres' },
          { field: 'Status', label: 'Status' }, { field: 'Closed', label: 'Closed', format: 'dd/mm/yyyy', if: '[Closed]' },
          { field: 'Booking.Courtesy Car', label: 'Courtesy car', if: '[Booking]' },
        ] },
        { type: 'fields', columns: 1, items: [{ field: 'Work Requested', label: 'Work requested' }, { field: 'Notes', label: 'Notes', if: '[Notes]' }] },
        { type: 'lines', table: 'Job Lines', link: 'Job Card', columns: [
          { field: 'Kind' }, { field: 'Description', label: 'Work done or part fitted' }, { field: 'Part.Code', label: 'Part' },
          { field: 'Quantity', label: 'Qty or hours', type: 'number' }, { field: 'Technician', label: 'By', type: 'text' }, { field: 'Done On', label: 'Date', format: 'dd/mm/yyyy' },
        ] },
        { type: 'text', text: 'Before work starts: check the mileage, note any damage and warning lights, and fit seat and floor covers. Any work beyond what is asked for above is authorised by the customer first, and the call is noted here.', small: true },
        { type: 'spacer', size: 24 },
        { type: 'signatures', labels: ['Technician', 'Road test and quality check'] },
      ] },
    // Every invoice, with the job card's own lines, found through the job card.
    { name: 'Invoice', table: 'Invoices', paper: 'a4', letterhead: LETTERHEAD,
      blocks: [
        { type: 'heading', text: 'VAT invoice {Number}' },
        { type: 'fields', columns: 2, items: [
          { field: 'Number', label: 'Invoice' }, { field: 'Invoice Date', label: 'Date and tax point', format: 'dd/mm/yyyy' }, { field: 'Due Date', label: 'Due', format: 'dd/mm/yyyy', if: '[Account]' },
          { field: 'Job Card', label: 'Job card' }, { field: 'Job Card.Vehicle.Customer', label: 'Customer' }, { field: 'Account.Name', label: 'Trade account', if: '[Account]' },
          { field: 'Job Card.Vehicle.Customer.Address', label: 'Address' }, { field: 'Job Card.Vehicle.Customer.Postcode', label: 'Postcode' },
          { field: 'Job Card.Vehicle', label: 'Registration' }, { field: 'Job Card.Vehicle.Make', label: 'Make' }, { field: 'Job Card.Vehicle.Model', label: 'Model' },
          { field: 'Job Card.Mileage In', label: 'Mileage' },
        ] },
        { type: 'lines', table: 'Job Lines', on: { 'Job Card': 'Job Card' }, columns: [
          { field: 'Kind', label: 'Item' }, { field: 'Description' }, { field: 'Quantity', label: 'Qty or hours', type: 'number' }, { field: 'Unit Price', label: 'Price', type: 'currency' },
          { expr: NET, as: 'Net', type: 'currency' }, { expr: 'Nz([Tax Rate]) * 100', as: 'VAT Rate', label: 'VAT %', type: 'number', format: '0' }, { expr: VAT, as: 'VAT', type: 'currency' },
        ] },
        { type: 'totals', rows: [{ label: 'Net', expr: '[Net]' }, { label: 'VAT', expr: '[VAT]' }, { label: 'Total', expr: '[Net] + [VAT]', strong: true }] },
        // A line at a lower rate than the business's own is the MOT fee, which carries no VAT.
        { type: 'text', text: 'The MOT test fee carries no VAT.', small: true, if: '[VAT Rate] < [Job Lines count] * Nz([Business.Tax Rate]) * 100' },
        { type: 'text', text: 'Paid on {Paid On} by {Method}, thank you.', small: true, if: '[Paid On]' },
        { type: 'text', text: '{Business.Payment Terms} By bank transfer to {Business.Bank Details}, quoting {Number}.', small: true, if: 'Nz([Paid On], "") = ""' },
        FOOT,
      ] },
    // The letter four weeks before an MOT or service: for reminders not yet sent.
    { name: 'Reminder letter', table: 'Reminders', paper: 'a4', where: 'Nz([Sent On], "") = ""', letterhead: { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'E-mail', 'Website'] },
      blocks: [
        { type: 'fields', columns: 1, items: [
          { field: 'Vehicle.Customer', label: 'To' }, { field: 'Vehicle.Customer.Address', label: 'Address' }, { field: 'Vehicle.Customer.City', label: 'Town' },
          { field: 'Vehicle.Customer.Postcode', label: 'Postcode' },
        ] },
        { type: 'heading', text: '{Vehicle}: {Kind} due on {Due}' },
        { type: 'text', text: 'Dear {Vehicle.Customer.First Name} {Vehicle.Customer.Last Name},' },
        { type: 'text', text: 'Our records show that your {Vehicle.Make} {Vehicle.Model}, registration {Vehicle}, is due its {Kind} on {Due}. We are writing in good time so that you can book a day that suits you.' },
        { type: 'text', text: 'An MOT can be done up to a month before the due date without losing any time on the certificate, and if your service is due too we can do both on the same visit. A courtesy car can be booked if you need one, and we can collect the car from a local address.', if: 'Left([Kind], 3) = "MOT"' },
        { type: 'text', text: 'A service on time keeps the warranty and the service history in order, and we will tell you about anything else we find before doing it. A courtesy car can be booked if you need one, and we can collect the car from a local address.', if: 'Left([Kind], 3) <> "MOT"' },
        { type: 'text', text: 'To book, ring us on {Business.Phone}, write to {Business.E-mail}, or call in. If the car has been sold, or the work done elsewhere, just let us know and we will update our records.' },
        { type: 'text', text: 'Yours sincerely,' },
        { type: 'spacer', size: 24 },
        { type: 'signatures', labels: ['Service desk'] },
        FOOT,
      ] },
    // Each trade account's unpaid invoices, oldest first, with what is owed so far and what is overdue.
    { name: 'Trade statement', table: 'Accounts', paper: 'a4', letterhead: LETTERHEAD,
      blocks: [
        { type: 'heading', text: 'Statement of account' },
        { type: 'fields', columns: 2, items: [
          { field: 'Name', label: 'Account' }, { field: 'Contact', label: 'For the attention of' }, { field: 'Address' }, { field: 'City' },
          { field: 'Postcode' }, { field: 'Payment Days', label: 'Days to pay' }, { field: 'Credit Limit', label: 'Credit limit', format: '#,##0.00', if: '[Credit Limit]' },
        ] },
        { type: 'lines', table: 'Invoices', link: 'Account', sort: 'Invoice Date', where: 'Nz([Paid On], "") = ""', columns: [
          { field: 'Number', label: 'Invoice' }, { field: 'Job Card.Vehicle', label: 'Registration' }, { field: 'Invoice Date', label: 'Date', format: 'dd/mm/yyyy' }, { field: 'Due Date', label: 'Due', format: 'dd/mm/yyyy' },
          { expr: OVERDUE, as: 'Days Over', label: 'Days overdue', type: 'integer' },
          { field: 'Total', label: 'Owing', type: 'currency' }, { running: 'Total', as: 'Owed So Far', label: 'Owed so far' },
          { expr: 'IIf([Due Date] < Date(), [Total], 0)', as: 'Overdue', type: 'currency' },
        ] },
        { type: 'totals', rows: [
          { label: 'Statement date', expr: 'Date()', format: 'dd/mm/yyyy' },
          { label: 'Of which overdue', expr: '[Overdue]', if: '[Overdue]' }, { label: 'Balance owing', expr: '[Total]', strong: true },
        ] },
        { type: 'text', text: 'Nothing is owing on this account today. Thank you.', if: '[Invoices count] = 0' },
        { type: 'text', text: 'Invoices are due {Payment Days} days from their date. Please pay by bank transfer to {Business.Bank Details}, quoting the invoice numbers. If you have paid in the last few days, thank you, and please ignore what is shown as owing.', small: true, if: '[Invoices count]' },
        FOOT,
      ] },
  ],
};

export const about = {
  name: 'Quarrybank Motors',
  kind: 'Garage and MOT centre',
  line: 'Customers, vehicles, bookings, job cards, MOT tests, services, reminders, parts and invoices for an independent garage.',
  summary: 'Quarrybank Motors is an invented independent garage and MOT test centre in Leeds, with four bays. Three technicians and a workshop manager do the work, two of them as MOT testers, and a service advisor runs the desk: the phone, the diary, the estimates and the customers waiting for their keys. A few local firms run their vans and cars on a trade account and pay by transfer within thirty days.\n\n'
    + 'Each vehicle is one record, known by its registration, with the dates its MOT and its service fall due. Four weeks before either, the garage sends a reminder, and most customers book in. A booking becomes a job card when the vehicle arrives; the labour (hours at the bench rate), the parts and the MOT fee go on it as lines, and when the work is done those lines are the invoice. An MOT test is recorded with its result, its own test number, and its failures and advisories; failures are put right and the car is retested, while most advisories wait for another day, so the garage can ring about them later.\n\n'
    + 'Prices are kept without VAT, as a garage quotes its trade customers, and VAT is added line by line. The MOT fee carries no VAT. The records cover about thirteen months up to the day the file is made, with bookings in the diary for the weeks ahead, reminders ready for next month, cars waiting on parts, a few estimates not yet answered, and trade invoices not yet paid.\n\n'
    + 'Every registration is invented and has a Q among its last three letters, which current British plates never use, and the makes and models are made up.',
  suits: [
    'A tyre and exhaust centre',
    'A van and light commercial workshop',
    'A motorcycle workshop, with bikes as the vehicles',
    'A mobile mechanic, with bookings at the customer\'s address',
    'A body shop or smart repair business, with estimates for every job',
    'An agricultural or plant repairer servicing machines by the hour',
  ],
  tables: {
    Business: BUSINESS_ABOUT,
    'Accounts': { about: 'The businesses with a trade account: their vehicles are invoiced to the account, and the account pays within its payment days.', fields: {
      'Name': 'The business\'s name, printed on its invoices and statement. Each name is used once.',
      'Contact': 'The person who looks after the vehicles there, printed on the statement.',
      'Phone': 'The business\'s main number.',
      'E-mail': 'Where invoices and statements are sent.',
      'Address': 'The street address.',
      'City': 'The town or city.',
      'Postcode': 'The postcode.',
      'Payment Days': 'How many days after the invoice date payment is due: 30 means thirty days.',
      'Credit Limit': 'The most the account may owe at once.',
      'Opened': 'The day the account was opened.',
    } },
    'Customers': { about: 'The people whose vehicles the garage looks after. A fleet manager or driver at a business on a trade account is linked to that account; everyone else pays when they collect.', fields: {
      'First Name': 'First name.',
      'Last Name': 'Family name. Needed for every customer.',
      'Account': 'The trade account the customer\'s vehicles are invoiced to. Empty for private customers.',
      'Phone': 'The number the desk rings when the car is ready or a part is needed.',
      'E-mail': 'Where invoices and reminders go, when the customer gave one.',
      'Address': 'The postal address, used for reminder letters.',
      'City': 'The town or city.',
      'Postcode': 'The postcode.',
      'Remind By': 'How the customer wants their MOT and service reminders: Letter, E-mail, Text message, or None for someone who would rather not have them.',
      'Joined': 'The day the customer first came in.',
    } },
    'Staff': { about: 'The people at the garage: the workshop manager, the technicians and the service advisor.', fields: {
      'First Name': 'First name.',
      'Last Name': 'Family name.',
      'Role': 'Workshop Manager, Technician or Service Advisor.',
      'MOT Tester': 'Yes for someone who may carry out MOT tests at this centre.',
      'Phone': 'Work mobile.',
      'E-mail': 'Work e-mail address.',
      'Started': 'The day they joined.',
      'Active': 'No once someone has left, so they stop appearing in lists of who can take a job.',
    } },
    'Suppliers': { about: 'The motor factors and wholesalers parts come from.', fields: {
      'Name': 'The supplier\'s name.',
      'Contact': 'The person at their counter the garage deals with.',
      'Phone': 'Their trade counter number.',
      'E-mail': 'Where orders are sent.',
      'Supplies': 'What the garage buys from them.',
      'Deliveries': 'How often they deliver, such as twice a day.',
      'Our Account': 'The garage\'s account reference with them (an invented reference here).',
    } },
    'Parts': { about: 'Every part and fluid the garage fits, whether kept on the shelf or ordered in for a job.', fields: {
      'Code': 'The garage\'s own code for the part, printed on the job card.',
      'Name': 'What the part is, in plain words, as the invoice prints it.',
      'Category': 'Service parts, Brakes, Suspension and steering, Exhaust, Tyres, Electrical, Engine, Clutch or Fluids.',
      'Supplier': 'Who it is usually bought from.',
      'Unit': 'How it is counted: each, pair, set or litre.',
      'Cost': 'What one unit costs the garage, without VAT.',
      'Price': 'What one unit is charged at, without VAT.',
      'In Stock': 'How many are on the shelf now.',
      'Reorder Level': 'When stock falls to this number it is ordered again.',
      'Reorder Quantity': 'How many to order at a time.',
      'Stocked': 'Yes for parts kept on the shelf. No for parts ordered in for each job, such as clutch kits.',
      'Bin': 'Where it is kept in the stores.',
    } },
    'Vehicles': { about: 'One record for each vehicle the garage looks after, known by its registration, with when its MOT and service fall due. Its job cards, MOT tests and services are its history.', fields: {
      'Registration': 'The number plate. Each is used once. In this sample every one is invented, with a Q among the last three letters.',
      'Customer': 'Who the vehicle belongs to, or who runs it for a trade account.',
      'Make': 'The maker (invented makes in this sample).',
      'Model': 'The model.',
      'Body': 'Hatchback, Estate, SUV, Saloon or Van.',
      'Fuel': 'Petrol, Diesel, Hybrid or Electric.',
      'Year': 'The year it was first registered.',
      'Colour': 'Its colour, which helps find it in the yard.',
      'Tyre Size': 'The size of its tyres, so the right ones are ordered.',
      'Mileage': 'The mileage when it last came in.',
      'MOT Due': 'The day its MOT certificate runs out. A test passed up to a month early keeps this date and adds a year.',
      'Service Due': 'The day its next yearly service is due.',
      'Notes': 'Anything worth knowing: a locking wheel nut in the glovebox, a customer who wants the old parts back.',
    } },
    'Bookings': { about: 'The diary: each vehicle booked in, the day and time and what for. A booking becomes a job card when the vehicle arrives.', fields: {
      'Vehicle': 'The vehicle booked in.',
      'Date': 'The day it is booked for.',
      'Time': 'The time it is due in, such as 08:30.',
      'Work': 'What it is booked in for: MOT, Service, MOT and service, or a repair in a few words.',
      'Booked On': 'The day the booking was made.',
      'Status': 'Booked, Arrived, Done, Cancelled or No show.',
      'Courtesy Car': 'Yes when the customer needs the courtesy car that day.',
      'Notes': 'Anything the desk needs to know, such as how the booking came about.',
    } },
    'Job Cards': { about: 'One record for each visit: the work asked for, the technician, and, in Job Lines, the labour and parts. The Job card print template prints from it for the workshop.', fields: {
      'Number': 'The job card number, in the order cards are opened, a new run each year: JC-2026-0042.',
      'Vehicle': 'The vehicle worked on.',
      'Booking': 'The booking it came from. Empty for a vehicle that came in without one.',
      'Technician': 'Who the job is given to.',
      'Opened': 'The day the vehicle arrived and the card was opened.',
      'Mileage In': 'The mileage when it arrived, printed on the invoice.',
      'Work Requested': 'What the customer asked for, in their words.',
      'Status': 'Open, Awaiting parts, Awaiting authority (extra work found and the customer not yet asked) or Invoiced.',
      'Closed': 'The day the work was finished and invoiced. Empty while the job is open.',
      'Notes': 'What the technician found, and any call to the customer about extra work.',
    } },
    'Part Orders': { about: 'Parts ordered from suppliers: stock for the shelf each Monday, or a part for one job when the shelf has none.', fields: {
      'Supplier': 'Who the order went to.',
      'Part': 'The part ordered.',
      'Job Card': 'The job the part is for, when it was ordered for one. Empty for shelf stock.',
      'Quantity': 'How many.',
      'Unit Cost': 'The price paid for each, without VAT.',
      'Ordered On': 'The day it was ordered.',
      'Expected': 'The day it should arrive.',
      'Received On': 'The day it arrived. Empty while it is on its way.',
      'Status': 'On order or Received.',
    } },
    'Job Lines': { about: 'The labour, parts and MOT fee on each job card, without VAT. When the job is invoiced, each line points at the invoice, and they are its lines.', fields: {
      'Job Card': 'The job card the line belongs to.',
      'Technician': 'Who did the work, on a labour or MOT line; it is what the technician hours are counted from.',
      'Part': 'The part fitted, on a part line.',
      'Kind': 'Labour, Part or MOT.',
      'Description': 'What the line is, as the invoice prints it.',
      'Quantity': 'For labour, the hours (1.5 is an hour and a half); for parts, how many, or the litres of oil.',
      'Unit Price': 'The price of one hour or one part, without VAT.',
      'Unit Cost': 'What one part cost the garage, kept so the margin does not change when prices do.',
      'Tax Rate': 'The VAT rate of the line, as a fraction: 0.2 is twenty percent, 0 for the MOT fee.',
      'Done On': 'The day the work was done or the part fitted.',
    } },
    'MOT Tests': { about: 'Every MOT test carried out, with its result. A failed test is followed by a retest once the failures are put right.', fields: {
      'Test Number': 'The test\'s own number, in a sample format of the garage\'s own: MT-2026-00042. A real centre records the national test number here.',
      'Vehicle': 'The vehicle tested.',
      'Job Card': 'The job card the test was done on.',
      'Tester': 'Who carried out the test.',
      'Test Date': 'The day of the test.',
      'Mileage': 'The mileage read at the test.',
      'Result': 'Pass or Fail.',
      'Expires': 'For a pass, the day the new certificate runs out.',
      'Retest Of': 'For a retest, the failed test it follows.',
      'Fee': 'What the test was charged at: nothing for a retest within ten working days.',
    } },
    'MOT Items': { about: 'The failures and advisories found at each MOT test.', fields: {
      'MOT Test': 'The test the item was found at.',
      'Kind': 'Fail (it must be put right before the vehicle passes) or Advisory (it will need doing soon).',
      'Item': 'What the tester found, in plain words.',
      'Fixed': 'Yes once the garage has put it right.',
      'Fixed On': 'The day it was put right.',
    } },
    'Services': { about: 'Each service carried out: its kind, the mileage and when the next is due. Together with the job cards it is the vehicle\'s service history.', fields: {
      'Vehicle': 'The vehicle serviced.',
      'Job Card': 'The job card it was done on.',
      'Service Date': 'The day of the service.',
      'Kind': 'Interim service, Full service or Electric vehicle service.',
      'Mileage': 'The mileage at the service.',
      'Next Due': 'When the next service is due: a year on.',
      'Next Due Mileage': 'Or at this mileage, whichever comes first.',
    } },
    'Reminders': { about: 'The reminders the garage sends four weeks before an MOT or service is due, and those ready to send. The Reminder letter print template prints from it.', fields: {
      'Vehicle': 'The vehicle the reminder is about.',
      'Kind': 'MOT, service, or MOT and service when both fall due together.',
      'Due': 'The day the MOT or service is due.',
      'Method': 'Letter, E-mail or Text message, from the customer\'s Remind By.',
      'Sent On': 'The day it was sent. Empty for a reminder not yet sent.',
      'Booked': 'Yes once the customer has booked in.',
    } },
    'Estimates': { about: 'Written estimates for repairs, given before the work is booked. The Estimate print template prints from it.', fields: {
      'Number': 'The estimate\'s number, in date order, a new run each year: EST-2026-0042.',
      'Vehicle': 'The vehicle, and through it the customer.',
      'Estimate Date': 'The day it was given.',
      'Valid Until': 'The last day the price holds: thirty days on.',
      'Work': 'The work in a few words.',
      'Net': 'The parts and labour without VAT.',
      'Tax': 'The VAT, each line\'s rounded to the penny and added up.',
      'Total': 'The estimated total with VAT.',
      'Answer': 'Accepted or Declined; empty while the customer is thinking about it.',
      'Answered On': 'The day the customer answered.',
      'Job Card': 'The job card the work was done on, once accepted and booked in.',
    } },
    'Estimate Lines': { about: 'The labour and parts on each estimate.', fields: {
      'Estimate': 'The estimate the line belongs to.',
      'Kind': 'Labour or Part.',
      'Description': 'The work or the part.',
      'Quantity': 'Hours of labour, or how many parts.',
      'Unit Price': 'The price of one hour or one part, without VAT.',
      'Tax Rate': 'The VAT rate, as a fraction.',
    } },
    'Invoices': { about: 'An invoice for every job card when the work is done. Private customers pay when they collect; trade accounts pay within their payment days.', fields: {
      'Number': 'The invoice\'s number, given in date order and once only, a new run each year: INV-2026-0042.',
      'Job Card': 'The job invoiced; its lines are the invoice\'s lines.',
      'Account': 'The trade account billed. Empty for a private customer.',
      'Invoice Date': 'The day it was raised, the day the work was finished. It is the tax point for VAT.',
      'Due Date': 'When payment is due: on collection for private customers, or the account\'s payment days on.',
      'Net': 'The parts, labour and fees without VAT.',
      'Tax': 'The VAT: each line\'s rounded to the penny, then added up, as the invoice prints it.',
      'Total': 'What the invoice comes to with VAT.',
      'Paid On': 'The day it was paid; empty while it is owed.',
      'Method': 'Card, Cash or Bank transfer.',
    } },
  },
  queries: {
    'Bookings today and tomorrow': 'The diary for today and tomorrow, in time order, with the registration, the customer\'s number, the work and whether they need the courtesy car. Cancelled bookings are left out. Open it first thing.',
    'Bookings next 7 days': 'How many vehicles are booked in for each of the next seven days, how many are MOTs and how many need the courtesy car, to see where there is room.',
    'MOTs due next month': 'Every vehicle whose MOT runs out next month, with the customer\'s address and how they like reminders: the list to send reminder letters from.',
    'Services due next 30 days': 'Vehicles whose yearly service falls due in the next thirty days, with their last mileage.',
    'Reminders to send': 'Reminders made ready and not yet sent, by due date, with how each customer wants them. Print the Reminder letter for the letters, then fill in Sent On.',
    'Advisories not fixed': 'Advisories from MOT tests in the last year that have not been put right, by registration: worn tyres, thin brake pads, a little corrosion. Ring the customer, or bring it up at the next visit.',
    'Open job cards': 'Every job card not yet closed, oldest first, with the vehicle, the technician, its status and how many days it has been open.',
    'Technician hours last 30 days': 'Hours of labour each technician has sold in the last thirty days, and what they came to without VAT.',
    'Technician hours by month': 'Hours of labour sold by each technician in each month, for the workshop manager\'s month-end look.',
    'Parts margin': 'For each kind of part, what was sold without VAT, what it cost and the margin, the biggest first.',
    'Takings by month': 'Money received each month from invoices paid, private and trade together.',
    'VAT by month': 'For each month, the invoices raised, their net value, the VAT and the total: the figures for the VAT return.',
    'MOT results by month': 'How many MOT tests were done each month, how many passed and failed, and how many were retests.',
    'Service history': 'Every service carried out, vehicle by vehicle, newest first, with the mileage, the job card and when the next is due.',
    'Estimates awaiting answer': 'Estimates the customer has not yet said yes or no to, oldest first, with the phone number to follow up.',
    'Parts to reorder': 'Shelf parts at or below their reorder level, by supplier, with what a full reorder would cost.',
    'Trade accounts to chase': 'Every trade invoice not yet paid, by account and due date, with the registration and how many days overdue it is (nought when it is not due yet).',
  },
  reports: {
    'Day sheet': 'The diary for today and tomorrow, one section a day in time order: pin it up in the workshop and keep one at the desk.',
    'MOT reminder list': 'Every vehicle with its MOT due next month and the address to write to, for checking the reminder letters before they go.',
    'Advisories to follow up': 'Unfixed advisories, a section for each vehicle, with the customer\'s number: the list for a quiet afternoon on the phone.',
    'Work in progress': 'Open job cards, a section for each status, with the technician and how long each has been open.',
    'Technician hours': 'Hours and labour sold by each technician, a section for each month, with the totals.',
    'Takings by month': 'Money received each month with a grand total.',
    'VAT by month': 'Net sales, VAT and invoiced totals for each month, with the grand totals, for the VAT return or the accountant.',
    'Parts to order': 'The parts to reorder, a page for each supplier, with the value of each order.',
    'Trade invoices due': 'Unpaid trade invoices, a section for each account, with days overdue and the total owed.',
  },
  documents: {
    'Estimate': 'The written estimate for a repair: the vehicle, the work, the labour and parts with VAT, the total and how long it holds. It prints for estimates not yet answered or still in date; an answered one says the answer and when.',
    'Job card': 'Printed when a vehicle arrives and kept with its keys: the vehicle, mileage and work asked for, then the work done and parts fitted with who did them, and two lines to sign. Prices are left off, as the workshop does not need them. It prints for job cards not yet invoiced, the vehicles in the workshop; a closed one prints from the Job Cards form.',
    'Invoice': 'The VAT invoice for a job card: the labour, parts and MOT fee with the VAT on each line, the net, VAT and total, and how to pay, or when it was paid. The note that the MOT fee carries no VAT prints only when there is one. One for each record in Invoices, its lines found through its job card.',
    'Reminder letter': 'The letter sent four weeks before an MOT or service is due: short and friendly, with the registration, the due date and how to book. It prints for reminders not yet sent, with a paragraph for an MOT or for a service. Have the wording checked for your own country.',
    'Trade statement': 'Sent to each trade account at the month end: the invoices still unpaid, oldest first, with the days each is overdue, a running total of what is owed, how much of it is overdue and the day of the statement. One for each record in Accounts.',
  },
  tutorial: [
    { title: 'Take a booking', steps: [
      'Open the Vehicles form and find the registration. If the vehicle is new to you, first add the owner on the Customers form (choose their trade account in Account if they have one), then press New on Vehicles and fill in Registration, Customer, Make, Model, Fuel, Year and Tyre Size.',
      'Open the query Bookings next 7 days to find a day with room.',
      'Open the Bookings form and press New. Choose the vehicle, type the Date and Time, say what for in Work (MOT, Service, MOT and service, or the repair), tick Courtesy Car if it is needed, and set Booked On to today.',
    ] },
    { title: 'Start the day and open the job cards', steps: [
      'Open the report Day sheet: today\'s and tomorrow\'s bookings in time order.',
      'When a vehicle arrives, set its booking\'s Status to Arrived. Open the Job Cards form, press New, type the next number (JC-2026- and the next in the run), choose the vehicle and the booking, the technician, today in Opened, the mileage in Mileage In and the work in Work Requested.',
      'With the job card on screen, open the print template Job card from Print templates and press Print. It goes on the dashboard with the keys; the technician writes on it what was done.',
      'During the day, the query Open job cards shows what is in, who has it and what each is waiting for.',
    ] },
    { title: 'Record an MOT test', steps: [
      'Open the MOT Tests form and press New. Type the test number, choose the vehicle, the job card and the tester, and fill in Test Date, Mileage, Result and Fee.',
      'In MOT Items below, add each failure (Kind Fail) and each advisory (Kind Advisory) in the tester\'s words.',
      'On a pass, type the new expiry in Expires and the same date in the vehicle\'s MOT Due. On a fail, ring the customer, put the failures right on the job card, then add a retest with Retest Of set to the failed test and Fee 0, and tick Fixed on each failure.',
      'Add the MOT fee to the job card\'s Job Lines as Kind MOT, with Tax Rate 0.',
    ] },
    { title: 'Record a service, then invoice the job', steps: [
      'On the job card, add a line in Job Lines for each part fitted (Kind Part, the part, its name, how many, its price and cost) and for the labour (Kind Labour, the technician, the hours and the rate). Fill in Done On on each.',
      'Open the Services form and press New: choose the vehicle and job card, the kind of service and the mileage, and when the next is due. Put the same date in the vehicle\'s Service Due.',
      'Open the Invoices form and press New. Type the next number (INV-2026-...), choose the job card and the trade account if there is one, and fill in Invoice Date, Due Date, Net, Tax and Total. The invoice lists the job card\'s lines on its own. Close the job card: Status Invoiced and Closed today.',
      'Open the print template Invoice, choose the invoice, and press Print or Save as PDF. When the customer pays, fill in Paid On and Method.',
    ] },
    { title: 'Give an estimate', steps: [
      'Open the Estimates form and press New. Type the next number (EST-2026-...), choose the vehicle, today in Estimate Date, thirty days on in Valid Until, and the work in a few words.',
      'In Estimate Lines, add the labour (hours and rate) and each part, without VAT. Put the totals in Net, Tax and Total.',
      'Open the print template Estimate, choose it, and press Save as PDF to e-mail it, or Print.',
      'The query Estimates awaiting answer lists those not yet answered. When the customer says yes, fill in Answer and Answered On, take a booking, and later choose the job card in Job Card.',
    ] },
    { title: 'Send next month\'s reminders', steps: [
      'Near the end of each month, open the query MOTs due next month and the query Services due next 30 days.',
      'For each vehicle, add a record on the Reminders form: the vehicle, the Kind (MOT, service, or MOT and service), the Due date and the Method from the customer\'s Remind By.',
      'Open the query Reminders to send to check them, then open the print template Reminder letter, which holds the reminders not yet sent, and press Print. Fill in Sent On on each.',
      'When a customer books from a reminder, tick Booked on it.',
    ] },
    { title: 'Month end: trade statements, hours and VAT', steps: [
      'Open the report Trade invoices due to see what each trade account owes.',
      'Open the print template Trade statement, choose the accounts that owe something, and press Save as PDF to e-mail each one.',
      'Open the report Technician hours for the hours each technician sold, and the report VAT by month for the VAT return.',
      'Every Monday, open the report Parts to order and place the orders; record them on the Part Orders form.',
    ] },
  ],
  notes: [
    'Prices are kept without VAT and VAT is added on each line and rounded to the penny, then the lines are added up. An invoice\'s Tax is that sum, so it can differ by a penny from 20 percent of the net worked out once.',
    'The MOT fee is a line of its own with a Tax Rate of 0: the test carries no VAT. Repairs to put a failure right are ordinary labour and part lines at the full rate.',
    'An invoice\'s lines are the job card\'s own lines, found through the job card it is for. Add all the work to the job card before you invoice it; there is one invoice for each job card.',
    'The numbers on job cards, invoices, estimates and MOT tests (JC-, INV-, EST-, MT-) are typed, not made by Data Files. Keep each run in date order and start again at 0001 each January. A real test centre records the national MOT test number in Test Number.',
    'MOT Due and Service Due on a vehicle are kept by hand when a test or service is done here. A test passed up to a month before the due date keeps the same date and adds a year; a later test starts a new year from the test.',
    'Each print template prints only the records it is for: job cards not yet invoiced, estimates not answered or still in date, reminders not yet sent, every invoice and every trade account. A Trade statement lists only unpaid invoices. Printed from a form, the record on screen prints whatever its state.',
    'Every registration in this sample is invented, with a Q among its last three letters so it cannot be a real car\'s. Your own records will have real registrations: keep the file safe, as they identify your customers\' vehicles.',
  ],
  faq: [
    { q: 'How do I see everything done to one car?', a: 'Open the Vehicles form and find the registration: its job cards, MOT tests and services are its history. The query Service history lists every service by registration.' },
    { q: 'How do I find whose MOT is due so I can send reminders?', a: 'Open the query MOTs due next month, or the report MOT reminder list to print it. Add a Reminders record for each, and print the Reminder letter.' },
    { q: 'A car failed its MOT. What do I record?', a: 'The failed test with its failures as MOT Items of Kind Fail. Put the work on the job card, then add a retest with Retest Of pointing at the failed test, and tick Fixed on each failure. Advisories stay unticked until they are done; the query Advisories not fixed lists them.' },
    { q: 'Why is there no VAT on the MOT line?', a: 'The MOT test fee carries no VAT, so its line has a Tax Rate of 0. Everything else on the invoice is at the standard rate.' },
    { q: 'How do I print an older invoice or job card?', a: 'Open the print template Invoice and choose the invoice by its number; every invoice ever made is there. The Job card template holds only cards still open, so print a closed one from the Job Cards form with it on screen.' },
    { q: 'How do I see how busy each technician is?', a: 'Open the query Technician hours last 30 days for hours sold, or the query Open job cards for what each has in the workshop now.' },
    { q: 'Can I start with my own garage instead of Quarrybank?', a: 'Yes. Make the database empty from the sample, fill in the Business record with your own name, address, VAT number and bank details, then add your parts and staff. Every document prints with your details.' },
  ],
  empty: 'Start with Business, your own name, address, VAT number and payment details, which every document prints. Then Staff (tick MOT Tester for your testers), Suppliers and Parts (each part pointing at its supplier, with its cost and price without VAT), and Accounts for any trade customers. Customers and their Vehicles come in as people ring; add each vehicle\'s MOT Due and Service Due so reminders work from the start. Then the diary: Bookings, Job Cards with their Job Lines, MOT Tests with their items, Services, Invoices, Estimates and Reminders as the work goes on.',
  adapt: [
    'For a tyre centre, add a Tyre Brand and Load Rating to Parts and a Tread Depth field to Job Lines, and a query of vehicles with tread below 3 mm.',
    'Add a Courtesy Cars table (registration, insurance, next service) and point Bookings at it instead of the Yes/No, so two cars can be booked separately.',
    'For a mobile mechanic, add a Visit Address and a Travel line to Job Cards, and sort the day sheet by postcode.',
    'Add a Labour Rate to Accounts for trade customers on a lower rate, and use it on their labour lines.',
    'Add a Warranty Until to Job Lines for parts with a maker\'s warranty, and a query of parts still covered.',
    'Record what technicians clock on in a Time Sheets table (technician, day, hours attended) and compare it with Technician hours by month to see efficiency.',
  ],
};

// The bench rate per hour and the MOT fee, both without VAT; the VAT rate as a fraction.
const RATE = 72;
const MOT_FEE = 45;
const VAT_RATE = 0.2;

// Suppliers: [name, what they supply, deliveries, days a special order takes].
const SUPPLIERS = [
  ['Northgate Motor Factors', 'Service parts, brakes, suspension, steering and electrical', 'Twice a day', 0],
  ['Granite Tyre Wholesale', 'Tyres', 'Next morning', 1],
  ['Crescent Auto Parts', 'Exhaust, engine and clutch parts, oils and fluids', 'Daily', 1],
];

// Parts: [code, name, category, supplier, unit, cost, price, reorder level, reorder quantity, bin].
// A reorder level of 0 is a part ordered in for each job and not kept on the shelf.
const PARTS = [
  ['OIL-530', 'Engine oil 5W-30', 'Fluids', 2, 'litre', 4.2, 9.5, 40, 80, 'F1'],
  ['FLT-OIL', 'Oil filter', 'Service parts', 0, 'each', 3.8, 9.5, 8, 20, 'S1'],
  ['FLT-AIR', 'Air filter', 'Service parts', 0, 'each', 6.5, 16, 5, 12, 'S1'],
  ['FLT-POL', 'Pollen filter', 'Service parts', 0, 'each', 5.9, 15, 5, 12, 'S2'],
  ['FLT-FUEL', 'Fuel filter, diesel', 'Service parts', 0, 'each', 9.8, 24, 3, 8, 'S2'],
  ['PLG-SET', 'Spark plugs, set of four', 'Service parts', 0, 'set', 14, 32, 3, 8, 'S3'],
  ['WIP-PR', 'Wiper blades', 'Electrical', 0, 'pair', 8, 19.5, 4, 10, 'E1'],
  ['BLB-H7', 'Headlamp bulb H7', 'Electrical', 0, 'each', 2.1, 7.5, 6, 20, 'E1'],
  ['BLB-SML', 'Bulb, side or brake light', 'Electrical', 0, 'each', 0.4, 2.5, 10, 30, 'E1'],
  ['BAT-075', 'Battery, 075 size', 'Electrical', 0, 'each', 58, 112, 2, 4, 'E2'],
  ['BRK-PDF', 'Brake pads, front axle set', 'Brakes', 0, 'set', 18, 45, 4, 10, 'B1'],
  ['BRK-PDR', 'Brake pads, rear axle set', 'Brakes', 0, 'set', 15, 39, 3, 8, 'B1'],
  ['BRK-DSF', 'Brake discs, front pair', 'Brakes', 0, 'pair', 38, 89, 2, 4, 'B2'],
  ['BRK-FLD', 'Brake fluid', 'Fluids', 2, 'litre', 4, 11, 6, 12, 'F2'],
  ['SUS-DLK', 'Anti-roll bar drop link', 'Suspension and steering', 0, 'each', 9, 24, 4, 10, 'U1'],
  ['SUS-SPR', 'Coil spring, front', 'Suspension and steering', 0, 'each', 28, 65, 1, 2, 'U2'],
  ['STR-TRE', 'Track rod end', 'Suspension and steering', 0, 'each', 12, 32, 2, 6, 'U1'],
  ['EXH-RBX', 'Rear exhaust box', 'Exhaust', 2, 'each', 45, 105, 1, 3, 'X1'],
  ['EXH-CLP', 'Exhaust clamp and gasket', 'Exhaust', 2, 'each', 4, 12, 4, 10, 'X1'],
  ['TYR-16', 'Tyre 205/55 R16, mid range', 'Tyres', 1, 'each', 52, 82, 4, 12, 'T1'],
  ['TYR-17', 'Tyre 225/45 R17, mid range', 'Tyres', 1, 'each', 66, 104, 2, 8, 'T2'],
  ['ENG-AUX', 'Auxiliary drive belt', 'Engine', 2, 'each', 14, 34, 2, 4, 'N1'],
  ['ENG-COIL', 'Ignition coil', 'Engine', 2, 'each', 24, 58, 1, 3, 'N1'],
  ['ENG-TBK', 'Timing belt kit with water pump', 'Engine', 2, 'kit', 95, 210, 0, 0, null],
  ['CLT-KIT', 'Clutch kit, three piece', 'Clutch', 2, 'kit', 120, 245, 0, 0, null],
  ['FLD-COOL', 'Coolant', 'Fluids', 2, 'litre', 3.5, 9, 10, 20, 'F2'],
];

// What is on the road: [make, model, body, fuels, tyre size]. The makes and models are invented; no real one is meant.
const MODELS = [
  ['Corvane', 'Lune', 'Hatchback', ['Petrol', 'Petrol', 'Hybrid'], '205/55 R16'],
  ['Corvane', 'Strand', 'Estate', ['Diesel', 'Petrol'], '225/45 R17'],
  ['Pellam', 'Civet', 'Hatchback', ['Petrol'], '205/55 R16'],
  ['Pellam', 'Tarn', 'SUV', ['Diesel', 'Hybrid'], '225/45 R17'],
  ['Tessaro', 'Vela', 'Saloon', ['Petrol', 'Diesel'], '205/55 R16'],
  ['Vantor', 'Kite', 'Hatchback', ['Petrol', 'Petrol', 'Electric'], '205/55 R16'],
  ['Vantor', 'Ridge', 'SUV', ['Diesel', 'Hybrid', 'Electric'], '225/45 R17'],
  ['Halwick', 'Brook', 'Estate', ['Diesel'], '205/55 R16'],
  ['Halwick', 'Fennel', 'Hatchback', ['Petrol'], '205/55 R16'],
  ['Brenna', 'Pico', 'Hatchback', ['Petrol', 'Electric'], '205/55 R16'],
];
const VANS = [['Tessaro', 'Duna', 'Van', ['Diesel'], '205/55 R16'], ['Brenna', 'Tolva', 'Van', ['Diesel', 'Diesel', 'Electric'], '205/55 R16']];
const COLOURS = ['Black', 'Silver', 'Grey', 'White', 'Blue', 'Red', 'Green'];

// Repairs asked for: [weight, what the customer says, parts [code, quantity], hours, the work as invoiced].
// 'TYRE' is the tyre that fits the vehicle.
const REPAIRS = [
  [12, 'Grinding noise when braking', [['BRK-PDF', 1], ['BRK-DSF', 1]], 1.5, 'Replace front brake discs and pads'],
  [10, 'Brake pads worn, warning light on', [['BRK-PDF', 1]], 0.8, 'Replace front brake pads'],
  [6, 'Squeal from the rear brakes', [['BRK-PDR', 1]], 0.8, 'Replace rear brake pads'],
  [8, 'Knocking from the front over bumps', [['SUS-DLK', 2]], 1, 'Replace both front drop links'],
  [4, 'Car sits low on one corner', [['SUS-SPR', 1]], 1.5, 'Replace front coil spring'],
  [6, 'Exhaust blowing and noisy', [['EXH-RBX', 1], ['EXH-CLP', 1]], 1, 'Replace rear exhaust box'],
  [9, 'Two new front tyres', [['TYRE', 2]], 0.5, 'Fit and balance two tyres'],
  [7, 'Slow to start in the mornings', [['BAT-075', 1]], 0.5, 'Test and replace battery'],
  [4, 'Clutch slipping under load', [['CLT-KIT', 1]], 5, 'Replace clutch kit'],
  [4, 'Timing belt due by age', [['ENG-TBK', 1]], 4, 'Replace timing belt and water pump'],
  [6, 'Engine misfire, warning light on', [['ENG-COIL', 1]], 1, 'Diagnose misfire and replace ignition coil'],
  [5, 'Squealing from the engine bay', [['ENG-AUX', 1]], 0.8, 'Replace auxiliary drive belt'],
  [4, 'Steering knocks on full lock', [['STR-TRE', 1]], 1, 'Replace track rod end and set the tracking'],
  [7, 'Warning light on the dashboard', [], 1, 'Diagnostic check and report'],
  [4, 'Coolant level keeps dropping', [['FLD-COOL', 2]], 1, 'Pressure test cooling system and top up'],
];
const NO_ICE = new Set(['Exhaust blowing and noisy', 'Clutch slipping under load', 'Timing belt due by age', 'Engine misfire, warning light on', 'Squealing from the engine bay']);
// MOT failures: [what the tester found, part, quantity, hours, the work to put it right].
const FAILS = [
  ['Nearside front brake pad less than 1.5 mm thick', 'BRK-PDF', 1, 0.8, 'Replace front brake pads'],
  ['Offside rear tyre tread depth below the legal limit', 'TYRE', 1, 0.3, 'Supply and fit one tyre'],
  ['Nearside headlamp not working', 'BLB-H7', 1, 0.2, 'Replace headlamp bulb'],
  ['Offside brake light not working', 'BLB-SML', 1, 0.2, 'Replace brake light bulb'],
  ['Anti-roll bar linkage ball joint excessively worn', 'SUS-DLK', 1, 0.6, 'Replace drop link'],
  ['Exhaust leaking at the rear box', 'EXH-RBX', 1, 0.8, 'Replace rear exhaust box'],
  ['Wiper blade does not clear the windscreen', 'WIP-PR', 1, 0.1, 'Replace wiper blades'],
  ['Front coil spring fractured', 'SUS-SPR', 1, 1.2, 'Replace front coil spring'],
  ['Track rod end ball joint has excessive play', 'STR-TRE', 1, 0.8, 'Replace track rod end'],
  ['Registration plate lamp not working', 'BLB-SML', 1, 0.2, 'Replace number plate bulb'],
];
// MOT advisories: [what the tester noted, part, quantity, hours, the work]. One with no work cannot be put right by a repair.
const ADVISORIES = [
  ['Nearside front tyre worn close to the legal limit', 'TYRE', 1, 0.3, 'Supply and fit one tyre'],
  ['Front brake discs worn, pitted or scored', 'BRK-DSF', 1, 1, 'Replace front brake discs'],
  ['Front brake pads wearing thin', 'BRK-PDF', 1, 0.8, 'Replace front brake pads'],
  ['Exhaust corroded but not leaking', 'EXH-RBX', 1, 0.8, 'Replace rear exhaust box'],
  ['Oil leak, but not excessive', null, 0, 1, 'Trace and seal oil leak'],
  ['Underside corroded, but not seriously weakened', null, 0, 0, null],
  ['Drop link ball joint has slight play', 'SUS-DLK', 1, 0.6, 'Replace drop link'],
  ['Wiper blades deteriorated', 'WIP-PR', 1, 0.1, 'Replace wiper blades'],
  ['Rear brake pads wearing thin', 'BRK-PDR', 1, 0.8, 'Replace rear brake pads'],
];
const SLOTS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00'];
const SATURDAY = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30'];
// More MOTs fall due in March and September, when most new cars were first registered.
const PLATE_MONTHS = [3, 9];

/** Fill a Quarrybank Motors database made from `spec`. `r` is random(), `cal` calendar(). Answers counts. */
export function fill(base, { r, cal, days = 400 }) {
  const counts = {};
  const add = (table, values) => { counts[table] = (counts[table] || 0) + 1; return base.insert(table, values); };
  // Records written once at the end, in this order, so that what is pointed at is in first.
  // A value that is a record kept here (or a vehicle) becomes its record number.
  const later = { Vehicles: [], Bookings: [], 'Job Cards': [], 'Part Orders': [], Invoices: [], 'Job Lines': [], 'MOT Tests': [], 'MOT Items': [], Services: [], Reminders: [], Estimates: [], 'Estimate Lines': [] };
  const keep = (table, values) => { later[table].push(values); return values; };
  const ids = new WeakMap();
  const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '');
  const day = (d) => (d == null ? null : cal.day(d));
  // Open Monday to Saturday (Saturday mornings); a day that falls on a Sunday moves to the Monday.
  const open = (d) => (cal.weekday(d) === 0 ? d + 1 : d);
  const runs = {};
  const numberFor = (prefix, d, width = 4) => { const y = cal.at(d).getFullYear(); const k = `${prefix}${y}`; runs[k] = (runs[k] || 0) + 1; return `${prefix}-${y}-${String(runs[k]).padStart(width, '0')}`; };
  // A year on from day `d`, the same date next year.
  const plusYear = (d) => { const a = cal.at(d); const b = new Date(a.getFullYear() + 1, a.getMonth(), a.getDate()); return d + Math.round((b - a) / 864e5); };
  // A line's net and VAT, rounded as the print templates round them (by SQLite, not JavaScript).
  const roundings = new Map();
  const vatSql = base.db.prepare('SELECT ROUND(? * ?, 2) AS net, ROUND(ROUND(? * ?, 2) * ?, 2) AS vat');
  const amounts = (qty, price, rate) => {
    const k = `${qty}|${price}|${rate}`;
    if (!roundings.has(k)) { const v = vatSql.get(qty, price, qty, price, rate); roundings.set(k, { net: v.net, vat: v.vat }); }
    return roundings.get(k);
  };
  const totalsOf = (lines) => {
    let net = 0; let tax = 0;
    for (const l of lines) { const a = amounts(l.Quantity, l['Unit Price'], l['Tax Rate']); net += a.net; tax += a.vat; }
    net = money(net); tax = money(tax);
    return { Net: net, Tax: tax, Total: money(net + tax) };
  };

  add('Business', businessRecord({
    name: 'Quarrybank Motors', domain: 'quarrybank.example', phone: '07700 900420',
    address: { Address: '7 Quarry Road', City: 'Leeds', Postcode: 'LS11 5QR', Country: 'United Kingdom' },
    terms: 'Private customers: payment on collection, by card or cash. Trade accounts: payment within 30 days of the invoice date.',
    taxRate: VAT_RATE,
    footer: 'Our repairs are guaranteed for 12 months or 12,000 miles, parts and labour. Open Monday to Friday 8 am to 5.30 pm, Saturday 8 am to noon.',
  }));

  // Staff: the workshop manager and one technician test MOTs; the service advisor runs the desk.
  const staff = [['Workshop Manager', true], ['Technician', true], ['Technician', false], ['Technician', false], ['Service Advisor', false]].map(([role, tester], i) => {
    const p = person(r, { domain: 'quarrybank.example' });
    return { tester, role, id: add('Staff', { ...p, Role: role, 'MOT Tester': tester, Phone: `07700 900${String(421 + i).padStart(3, '0')}`, Started: cal.day(-r.int(300, 4000)), Active: true }) };
  });
  const testers = staff.filter((s) => s.tester).map((s) => s.id);
  const benches = staff.filter((s) => s.role !== 'Service Advisor').map((s) => s.id);

  const suppliers = SUPPLIERS.map(([name, supplies, deliveries, lead]) => {
    const c = person(r);
    return { lead, id: add('Suppliers', { Name: name, Contact: `${c['First Name']} ${c['Last Name']}`, Phone: phoneFor(r, 'United Kingdom'), 'E-mail': `trade@${slug(name)}.example`, Supplies: supplies, Deliveries: deliveries, 'Our Account': `QBM-${r.int(1000, 9999)}` }) };
  });
  const parts = new Map();
  for (const [code, name, category, s, unit, cost, price, level, qty, bin] of PARTS) {
    const p = { code, name, cost, price, level, qty, stocked: level > 0, supplier: suppliers[s], stock: 0, onOrder: false };
    p.id = add('Parts', { Code: code, Name: name, Category: category, Supplier: p.supplier.id, Unit: unit, Cost: cost, Price: price, 'In Stock': 0, 'Reorder Level': level, 'Reorder Quantity': qty, Stocked: p.stocked, Bin: bin });
    parts.set(code, p);
  }

  // Shelf stock: the opening stock, then a reorder each Monday that arrives a day or two later.
  const arriving = [];
  for (const p of parts.values()) {
    if (!p.stocked) continue;
    const n = p.qty + p.level;
    keep('Part Orders', { Supplier: p.supplier.id, Part: p.id, 'Job Card': null, Quantity: n, 'Unit Cost': p.cost, 'Ordered On': day(-days - 10), Expected: day(-days - 7), 'Received On': day(-days - 7), Status: 'Received' });
    p.stock = n;
  }
  const restock = (p, d) => {
    // The battery supplier has had the 075 size on back order for three weeks.
    const back = p.code === 'BAT-075' && d >= -21;
    const at = back ? Infinity : open(d + 1 + r.weighted([[0, 8], [1, 2]]));
    const row = keep('Part Orders', { Supplier: p.supplier.id, Part: p.id, 'Job Card': null, Quantity: p.qty, 'Unit Cost': p.cost, 'Ordered On': day(d), Expected: day(open(d + 1)), Status: 'On order' });
    arriving.push({ p, at, row });
    p.onOrder = true;
  };

  // Registrations: an area, the plate's age and three letters, one of them Q, which current plates never use.
  const LETTERS = 'ABCDEFGHJKLMNOPRSTUVWXYZ';
  const AREAS = ['YA', 'YB', 'YC', 'YD', 'YE', 'YF', 'YG', 'YH', 'YJ', 'YK', 'YL', 'YM', 'SA', 'MW', 'LK', 'BN', 'FD'];
  const plates = new Set();
  const plate = (year) => {
    for (;;) {
      const age = String(r.chance(0.5) ? year % 100 : (year % 100) + 50).padStart(2, '0');
      const tail = [r.pick(LETTERS), r.pick(LETTERS), r.pick(LETTERS)];
      tail[r.int(0, 2)] = 'Q';
      const reg = `${r.pick(AREAS)}${age} ${tail.join('')}`;
      if (!plates.has(reg)) { plates.add(reg); return reg; }
    }
  };
  const thisYear = cal.at(0).getFullYear();
  // Every vehicle's next MOT and service, by the day they fall due, for the reminders.
  const motOn = new Map();
  const svcOn = new Map();
  const index = (map, d, v) => { if (!map.has(d)) map.set(d, []); map.get(d).push(v); };
  const vehicles = [];
  /** A vehicle for customer `c`, its MOT and service falling due between `from` and a year on. */
  const newVehicle = (c, from, van = false) => {
    const [make, model, body, fuels, tyre] = r.pick(van ? VANS : MODELS);
    const year = r.int(thisYear - 17, thisYear - 3);
    const fuel = r.pick(fuels);
    // An MOT date near the month the car was first registered.
    let mot = from + r.int(0, 364);
    if (r.chance(0.2)) { while (!PLATE_MONTHS.includes(cal.at(mot).getMonth() + 1)) mot++; mot += r.int(0, 27); if (mot > from + 364) mot -= 365; }
    const v = {
      customer: c, make, model, body, fuel, year, tyre, reg: plate(year), colour: r.pick(COLOURS),
      mileage: (thisYear - year) * r.int(5000, 11000) + r.int(0, 3000), perDay: r.int(10, 40) * (van ? 1.8 : 1), seen: from,
      mot, svc: from + r.int(0, 364), loyal: c.account ? 0.97 : 0.55 + r.next() * 0.4, advisories: [], lastKind: null, notes: null,
    };
    if (r.chance(0.03)) v.notes = r.pick(['Locking wheel nut key in the glovebox.', 'Customer wants the old parts back.', 'Keys left at the desk, not in the key safe.', 'Spare key held here for the fleet.']);
    index(motOn, v.mot, v);
    index(svcOn, v.svc, v);
    vehicles.push(v);
    c.vehicles.push(v);
    return keep('Vehicles', v);
  };

  // Customers: those already on the books, the trade accounts, and new ones as they come.
  const area = () => ({ Address: `${r.int(1, 240)} ${r.pick(['Mill Lane', 'Station Road', 'Orchard Way', 'Church Street', 'Canal Walk', 'Beech Grove', 'Riverside Drive', 'Cedar Avenue', 'Linden Close', 'Harbour Street'])}`, City: 'Leeds', Postcode: `LS${r.int(1, 28)} ${r.int(1, 9)}${r.pick(['AB', 'DE', 'FG', 'HJ', 'NP', 'QR', 'TU'])}` });
  const privates = [];
  const newCustomer = (d) => {
    const p = person(r, { domain: r.pick(['mail.example', 'post.example', 'mail.example']) });
    const email = r.chance(0.65);
    const c = { vehicles: [], account: null };
    c.remind = r.weighted([['Letter', 5], ['Text message', 3], ...(email ? [['E-mail', 3]] : []), ['None', 0.4]]);
    c.id = add('Customers', { 'First Name': p['First Name'], 'Last Name': p['Last Name'], Phone: phoneFor(r, 'United Kingdom'), 'E-mail': email ? p['E-mail'] : null, ...area(), 'Remind By': c.remind, Joined: day(d) });
    privates.push(c);
    return c;
  };
  for (let i = 0; i < 640; i++) {
    const c = newCustomer(-days - r.int(1, 2400));
    newVehicle(c, -days);
    if (r.chance(0.14)) newVehicle(c, -days);
  }
  const accounts = companies(r, 4, ['Taxis', 'Couriers', 'Builders', 'Plumbing', 'Care', 'Florists']).map((name) => {
    const domain = `${slug(name)}.example`;
    const lead = person(r, { domain });
    const where = area();
    const since = -days - r.int(60, 1500);
    const a = { payDays: 30, slow: r.chance(0.35) };
    a.id = add('Accounts', { Name: name, Contact: `${lead['First Name']} ${lead['Last Name']}`, Phone: phoneFor(r, 'United Kingdom'), 'E-mail': `accounts@${domain}`, ...where, 'Payment Days': 30, 'Credit Limit': r.pick([2000, 3000, 5000]), Opened: day(since) });
    const c = { vehicles: [], account: a, remind: 'E-mail' };
    c.id = add('Customers', { 'First Name': lead['First Name'], 'Last Name': lead['Last Name'], Account: a.id, Phone: phoneFor(r, 'United Kingdom'), 'E-mail': lead['E-mail'], ...where, 'Remind By': 'E-mail', Joined: day(since) });
    const vans = /Couriers|Builders|Plumbing|Florists/.test(name);
    for (let k = 0; k < r.int(4, 8); k++) newVehicle(c, -days, vans && r.chance(0.8));
    return a;
  });

  // The diary. A booking on day `d` (`time` from the slots), made on day `on`.
  const bookings = new Map();
  const booked = new Set();
  const book = (v, d, work, on, extra = {}) => {
    d = open(d);
    const slots = cal.weekday(d) === 6 ? SATURDAY : SLOTS;
    const b = keep('Bookings', { Vehicle: v, Date: day(d), Time: r.pick(slots), Work: work, 'Booked On': day(Math.min(on, d)), Status: 'Booked', 'Courtesy Car': /Clutch|Timing|service/i.test(work) && r.chance(0.3), Notes: extra.note || null });
    const item = { b, v, d, work, ...extra };
    if (!bookings.has(d)) bookings.set(d, []);
    bookings.get(d).push(item);
    booked.add(v);
    return item;
  };
  const partFor = (code, v) => parts.get(code === 'TYRE' ? (v.tyre === '225/45 R17' ? 'TYR-17' : 'TYR-16') : code);

  const estimates = [];
  const invoices = [];
  const tests = [];
  /**
   * A visit: the job card and its lines, the MOT test and the service, the
   * parts it takes, and the day it is finished, invoiced and paid. Work on
   * a day after today is not done yet, so its job card is still open.
   */
  const visit = (item, d) => {
    const { v, work } = item;
    v.mileage += Math.round(v.perDay * Math.max(0, d - v.seen));
    v.seen = d;
    const mot = /MOT/.test(work);
    const service = /service/i.test(work);
    const tech = mot ? r.pick(testers) : r.pick(benches);
    const card = keep('Job Cards', { Number: numberFor('JC', d), Vehicle: v, Booking: item.b, Technician: tech, Opened: day(d), 'Mileage In': v.mileage, 'Work Requested': item.request || work, Status: 'Open', Closed: null, Notes: null });
    if (item.estimate) item.estimate['Job Card'] = card;
    item.b.Status = 'Arrived';
    const lines = [];
    let finish = d;
    let hold = null;
    const notes = [];
    const labour = (description, hours, at = d, who = tech) => lines.push({ 'Job Card': card, Technician: who, Part: null, Kind: 'Labour', Description: description, Quantity: hours, 'Unit Price': RATE, 'Unit Cost': null, 'Tax Rate': VAT_RATE, at });
    /** A part for the job: off the shelf, from the factor the same day, or ordered in (a day or two). Answers the day it is here. */
    const fit = (code, qty, at = d) => {
      const p = partFor(code, v);
      let here = at;
      if (p.stocked && p.stock >= qty) p.stock -= qty;
      else {
        const lead = p.stocked ? p.supplier.lead : 1 + r.weighted([[0, 6], [1, 3]]);
        // Clutch kits ordered in the last week are on back order with the factor.
        const back = p.code === 'CLT-KIT' && at >= -6;
        here = back ? at + 9 : lead ? open(at + lead) : at;
        keep('Part Orders', { Supplier: p.supplier.id, Part: p.id, 'Job Card': card, Quantity: qty, 'Unit Cost': p.cost, 'Ordered On': day(at), Expected: day(back ? open(at + lead) : here), 'Received On': here <= 0 ? day(here) : null, Status: here <= 0 ? 'Received' : 'On order' });
      }
      lines.push({ 'Job Card': card, Technician: null, Part: p.id, Kind: 'Part', Description: p.name, Quantity: qty, 'Unit Price': p.price, 'Unit Cost': p.cost, 'Tax Rate': VAT_RATE, at: here });
      if (here > finish) { finish = here; hold = 'Awaiting parts'; }
      return here;
    };

    if (mot) {
      const age = thisYear - v.year;
      const failed = r.chance(Math.min(0.45, 0.1 + 0.02 * age));
      const test = { v, card, tester: tech, d, mileage: v.mileage, result: failed ? 'Fail' : 'Pass', fee: MOT_FEE, items: [] };
      tests.push(test);
      // A pass up to a month early keeps the due date and adds a year; otherwise a year from the test.
      const pass = (t) => { t.expires = t.d >= v.mot - 30 && t.d <= v.mot ? plusYear(v.mot) : plusYear(t.d) - 1; moveMot(v, t.expires); };
      if (!failed) pass(test);
      lines.push({ 'Job Card': card, Technician: tech, Part: null, Kind: 'MOT', Description: 'MOT test', Quantity: 1, 'Unit Price': MOT_FEE, 'Unit Cost': null, 'Tax Rate': 0, at: d });
      const electric = v.fuel === 'Electric';
      for (const a of r.some(ADVISORIES.filter((x) => !electric || x[1] !== 'EXH-RBX'), r.weighted([[0, 4], [1, 4], [2, 2], [3, 1]]))) {
        const row = keep('MOT Items', { 'MOT Test': test, Kind: 'Advisory', Item: a[0], Fixed: false, 'Fixed On': null });
        test.items.push(row);
        // Now and then the customer has an advisory put right there and then; most wait.
        if (a[4] && r.chance(0.2)) { row.fixedAt = a[1] ? fit(a[1], a[2]) : d; labour(a[4], a[3]); } else if (a[4]) v.advisories.push({ row, a, d });
      }
      if (failed) {
        const fails = r.some(FAILS.filter((x) => !electric || x[1] !== 'EXH-RBX'), r.weighted([[1, 5], [2, 3], [3, 1]]));
        const go = r.chance(0.92);
        let ready = d;
        for (const f of fails) {
          const row = keep('MOT Items', { 'MOT Test': test, Kind: 'Fail', Item: f[0], Fixed: false, 'Fixed On': null });
          test.items.push(row);
          if (go) { row.fixedAt = f[1] ? fit(f[1], f[2]) : d; ready = Math.max(ready, row.fixedAt); labour(f[4], f[3]); }
        }
        if (go) {
          // The retest, free within ten working days, once the failures are put right.
          const at = r.chance(0.75) ? ready : open(ready + 1);
          test.retest = { v, card, tester: tech, d: at, mileage: v.mileage, result: 'Pass', fee: 0, items: [], of: test };
          tests.push(test.retest);
          if (at <= 0) pass(test.retest);
          if (at > finish) finish = at;
          notes.push('Failed its MOT; failures put right with the customer\'s say-so and retested.');
        } else {
          notes.push('Failed its MOT. Customer declined the repairs and took the car away.');
          // Put right and passed elsewhere: a year on from then.
          moveMot(v, plusYear(Math.max(v.mot, d)));
        }
      }
    }
    if (service) {
      const ev = v.fuel === 'Electric';
      const full = !ev && (v.lastKind === 'Interim service' || r.chance(0.5));
      const kind = ev ? 'Electric vehicle service' : full ? 'Full service' : 'Interim service';
      labour(kind, ev ? 1 : full ? 2 : 1);
      if (!ev) { fit('OIL-530', full ? 5 : 4); fit('FLT-OIL', 1); }
      if (full) { fit('FLT-AIR', 1); fit('FLT-POL', 1); fit(v.fuel === 'Diesel' ? 'FLT-FUEL' : 'PLG-SET', 1); }
      if (ev) { fit('FLT-POL', 1); fit('BRK-FLD', 1); }
      v.lastKind = kind;
      item.service = { kind };
    }
    if (item.repair && !item.hold) {
      const [, , need, hours, job] = item.repair;
      for (const [code, qty] of need) fit(code, qty);
      labour(job, hours);
    }
    // Advisories left from an earlier test, now and then put right on this visit.
    for (const x of item.hold ? [] : v.advisories.splice(0)) {
      if (x.d >= d || !r.chance(0.18)) { v.advisories.push(x); continue; }
      x.row.fixedAt = x.a[1] ? fit(x.a[1], x.a[2]) : d;
      labour(x.a[4], x.a[3]);
      notes.push(`Advisory from the last MOT put right: ${x.a[0].toLowerCase()}.`);
    }
    // Extra work found on the ramp: the customer is rung, and says yes or no.
    if (!mot && !item.hold && r.chance(0.08)) {
      const extra = r.pick(ADVISORIES.filter((a) => a[4]));
      const answer = d + r.weighted([[0, 6], [1, 3], [2, 1]]);
      if (answer > 0) { hold = 'Awaiting authority'; finish = Math.max(finish, answer); notes.push(`Found: ${extra[0].toLowerCase()}. Customer rung for authority.`); }
      else if (r.chance(0.7)) { if (extra[1]) fit(extra[1], extra[2], answer); labour(extra[4], extra[3], answer); finish = Math.max(finish, answer); notes.push(`Found: ${extra[0].toLowerCase()}. Customer agreed by phone.`); }
      else notes.push(`Found: ${extra[0].toLowerCase()}. Customer declined for now.`);
    }
    // This week's held jobs: a clutch kit on back order, a misfire diagnosed and waiting for the customer's yes.
    if (item.hold) {
      hold = item.hold; finish = Math.max(finish, 2);
      if (hold === 'Awaiting authority') { labour('Diagnostic check and report', 0.5); notes.push('Ignition coil on cylinder 2 failed, plugs worn. Estimate given by phone; waiting for the customer to ring back.'); }
      else { const p = parts.get('CLT-KIT'); keep('Part Orders', { Supplier: p.supplier.id, Part: p.id, 'Job Card': card, Quantity: 1, 'Unit Cost': p.cost, 'Ordered On': day(d), Expected: day(open(d + 1)), 'Received On': null, Status: 'On order' }); notes.push('Clutch kit on back order with the factor; customer has the courtesy car.'); }
    }
    card.Notes = notes.length ? notes.join(' ') : null;
    // Work not yet done stays off the card until it is.
    const done = lines.filter((l) => Math.max(l.at, d) <= 0 && Math.max(l.at, d) <= finish);
    for (const l of done) { const at = Math.max(l.at, d); delete l.at; l['Done On'] = day(at); keep('Job Lines', l); }
    if (finish > 0) { card.Status = hold || 'Open'; return; }
    // Finished: MOT and service dates move on, the job card is invoiced and closed.
    item.b.Status = 'Done';
    card.Status = 'Invoiced'; card.Closed = day(finish);
    if (item.service) {
      const next = plusYear(finish);
      keep('Services', { Vehicle: v, 'Job Card': card, 'Service Date': day(finish), Kind: item.service.kind, Mileage: v.mileage, 'Next Due': day(next), 'Next Due Mileage': Math.round((v.mileage + 10000) / 1000) * 1000 });
      moveSvc(v, next);
    }
    const a = v.customer.account;
    const paid = a ? finish + (a.slow ? r.int(28, 60) : r.int(12, 34)) : finish + r.weighted([[0, 8], [1, 2]]);
    invoices.push({ card, lines: done, a, d: finish, seq: invoices.length, paid: paid <= 0 ? paid : null, method: a ? 'Bank transfer' : r.weighted([['Card', 8], ['Cash', 1.5], ['Bank transfer', 0.5]]) });
  };
  const moveMot = (v, to) => { v.mot = to; index(motOn, to, v); };
  const moveSvc = (v, to) => { v.svc = to; index(svcOn, to, v); };

  // The day loop runs a few weeks past today for the reminders made ready in advance.
  const pendingEstimates = [];
  const present = [
    { at: -3, repair: REPAIRS.find((x) => x[1] === 'Clutch slipping under load'), hold: 'Awaiting parts' },
    { at: -1, repair: REPAIRS.find((x) => x[1] === 'Engine misfire, warning light on'), hold: 'Awaiting authority' },
  ];
  // Those due in the first weeks were reminded before the records start, and most have booked.
  for (const v of [...vehicles]) {
    const due = Math.min(v.mot, v.svc);
    if (due > -days + 30 || !r.chance(v.loyal)) continue;
    const both = Math.abs(v.mot - v.svc) <= 40;
    book(v, Math.max(-days, due - r.int(1, 20)), both ? 'MOT and service' : v.mot < v.svc ? 'MOT' : 'Service', -days - r.int(1, 12));
  }
  for (let d = -days; d <= 21; d++) {
    const wd = cal.weekday(d);
    // Reminders four weeks ahead: an MOT and a service close together go in one letter.
    for (const [map, kind] of [[motOn, 'MOT'], [svcOn, 'service']]) {
      for (const v of map.get(d + 28) || []) {
        const due = d + 28;
        if ((kind === 'MOT' ? v.mot : v.svc) !== due || v.remindedFor === `${kind}${due}`) continue;
        const both = kind === 'MOT' ? Math.abs(v.svc - due) <= 40 : Math.abs(v.mot - due) <= 40;
        if (both && kind === 'service') continue;
        v.remindedFor = `${kind}${due}`;
        if (v.customer.remind === 'None') continue;
        const rem = keep('Reminders', { Vehicle: v, Kind: both ? 'MOT and service' : kind, Due: day(due), Method: v.customer.remind, 'Sent On': d <= 0 ? day(d) : null, Booked: false });
        if (d > 0) continue;
        // Most book within a week or so; some take their car elsewhere.
        const on = d + r.weighted([[0, 2], [1, 3], [2, 3], [3, 2], [5, 2], [8, 1], [12, 1]]);
        if (on <= 0 && r.chance(v.loyal) && !booked.has(v)) {
          const at = Math.max(on + 1, due - r.int(1, 26));
          book(v, at, both ? 'MOT and service' : kind === 'MOT' ? 'MOT' : 'Service', on);
          rem.Booked = true;
        }
      }
    }
    // A vehicle not seen here by its MOT date was tested elsewhere: a year on.
    for (const v of motOn.get(d) || []) if (v.mot === d && !booked.has(v)) moveMot(v, plusYear(d));
    for (const v of svcOn.get(d) || []) if (v.svc === d && !booked.has(v)) moveSvc(v, plusYear(d));
    if (d > 0) continue;

    // Shelf stock arriving.
    for (let i = arriving.length - 1; i >= 0; i--) {
      const o = arriving[i];
      if (o.at > d) continue;
      arriving.splice(i, 1);
      o.p.stock += o.p.qty; o.p.onOrder = false;
      o.row['Received On'] = day(d); o.row.Status = 'Received';
    }
    if (wd === 0) continue;

    // Estimates answered today: a yes is booked in a few days on.
    for (let i = pendingEstimates.length - 1; i >= 0; i--) {
      const e = pendingEstimates[i];
      if (e.at > d) continue;
      pendingEstimates.splice(i, 1);
      e.row.Answer = e.yes ? 'Accepted' : 'Declined'; e.row['Answered On'] = day(d);
      if (e.yes && !booked.has(e.v)) book(e.v, d + r.int(1, 8), e.repair[4], d, { repair: e.repair, request: e.repair[1], estimate: e.row, note: `From estimate ${e.row.Number}.` });
    }

    // Repairs rung in today, some after an estimate; a few new customers too.
    const calls = wd === 6 ? r.int(0, 1) : r.int(1, 4);
    // On the last working day, one estimate is still with the customer, whatever day the file is made.
    const lastCall = d === (cal.weekday(0) === 0 ? -1 : 0);
    for (let k = 0; k < (lastCall ? calls + 1 : calls); k++) {
      const fresh = r.chance(0.12);
      const c = fresh ? newCustomer(d) : null;
      const forced = lastCall && k === 0;
      let veh = fresh ? newVehicleNow(c, d) : r.pick(vehicles);
      while (forced && booked.has(veh)) veh = r.pick(vehicles);
      if (booked.has(veh)) continue;
      const repair = forced ? REPAIRS[0] : r.weighted(REPAIRS.filter((x) => veh.fuel !== 'Electric' || !NO_ICE.has(x[1])).map((x) => [x, x[0]]));
      const need = repair[2].reduce((n, [code, q]) => n + partFor(code, veh).price * q, 0) + repair[3] * RATE;
      if (forced || (need > 180 && r.chance(0.7))) {
        const row = keep('Estimates', { Number: numberFor('EST', d), Vehicle: veh, 'Estimate Date': day(d), 'Valid Until': day(d + 30), Work: repair[4], Net: 0, Tax: 0, Total: 0, Answer: null, 'Answered On': null, 'Job Card': null });
        const elines = repair[2].map(([code, q]) => { const p = partFor(code, veh); return keep('Estimate Lines', { Estimate: row, Kind: 'Part', Description: p.name, Quantity: q, 'Unit Price': p.price, 'Tax Rate': VAT_RATE }); });
        elines.push(keep('Estimate Lines', { Estimate: row, Kind: 'Labour', Description: repair[4], Quantity: repair[3], 'Unit Price': RATE, 'Tax Rate': VAT_RATE }));
        Object.assign(row, totalsOf(elines));
        estimates.push(row);
        pendingEstimates.push({ row, v: veh, repair, yes: r.chance(0.72), at: forced ? d + 3 : d + r.weighted([[0, 2], [1, 3], [2, 3], [3, 2], [5, 2], [9, 1]]) });
      } else book(veh, d + r.weighted([[0, 2], [1, 4], [2, 4], [3, 3], [5, 2], [7, 2], [10, 1]]), repair[4], d, { repair, request: repair[1] });
    }
    // A walk-in MOT now and then, from a driver new to the garage.
    if (wd !== 6 && r.chance(0.35)) { const c = newCustomer(d); const v = newVehicleNow(c, d); book(v, d + r.int(0, 3), 'MOT', d, { note: 'New customer.' }); }

    // The vehicles booked in today.
    for (const item of (bookings.get(d) || []).sort((a, b) => (a.b.Time < b.b.Time ? -1 : 1))) {
      booked.delete(item.v);
      if (d === 0 && Number(item.b.Time.slice(0, 2)) >= cal.hour) continue;
      if (r.chance(0.03)) { item.b.Status = 'Cancelled'; continue; }
      if (r.chance(0.02)) { item.b.Status = 'No show'; continue; }
      if (d === 0) { item.b.Status = 'Arrived'; keep('Job Cards', { Number: numberFor('JC', d), Vehicle: item.v, Booking: item.b, Technician: /MOT/.test(item.work) ? r.pick(testers) : r.pick(benches), Opened: day(d), 'Mileage In': item.v.mileage + Math.round(item.v.perDay * (d - item.v.seen)), 'Work Requested': item.request || item.work, Status: 'Open', Closed: null, Notes: null }); continue; }
      visit(item, d);
    }

    // This week's jobs, whatever day the file is made: a clutch on back order, and extra work waiting for the customer's say-so.
    for (const x of present) {
      if (x.done || d < x.at) continue;
      x.done = true;
      const v = vehicles.find((y) => !booked.has(y) && y.fuel !== 'Electric' && !y.customer.account && y.seen < d - 30);
      const item = book(v, d, x.repair[4], d - 2, { repair: x.repair, request: x.repair[1], hold: x.hold });
      bookings.get(open(d)).pop();
      booked.delete(v);
      visit(item, d);
    }

    // Each Monday, shelf parts at or below their level are ordered.
    if (wd === 1) for (const p of parts.values()) if (p.stocked && !p.onOrder && p.stock <= p.level) restock(p, d);
  }

  /** A vehicle that arrives with a new customer on day `d`: its MOT and service fall due within the year. */
  function newVehicleNow(c, d) {
    const v = newVehicle(c, d);
    v.seen = d;
    return v;
  }

  // A vehicle whose due date went by without a visit here (a booking cancelled, a failure taken
  // elsewhere) was seen to elsewhere: its dates move on a year at a time.
  for (const v of vehicles) {
    while (v.mot < -30) v.mot = plusYear(v.mot);
    while (v.svc < -30) v.svc = plusYear(v.svc);
  }

  // Invoices, numbered in date order once every job is known.
  invoices.sort((a, b) => a.d - b.d || a.seq - b.seq);
  for (const inv of invoices) {
    const t = totalsOf(inv.lines);
    inv.row = keep('Invoices', { Number: numberFor('INV', inv.d), 'Job Card': inv.card, Account: inv.a, 'Invoice Date': day(inv.d), 'Due Date': day(inv.a ? inv.d + inv.a.payDays : inv.d), ...t, 'Paid On': day(inv.paid), Method: inv.paid == null ? null : inv.method });
  }
  // MOT tests, numbered in date order; only the tests done by today.
  tests.sort((a, b) => a.d - b.d);
  for (const t of tests) {
    if (t.d > 0) continue;
    t.row = { 'Test Number': numberFor('MT', t.d, 5), Vehicle: t.v, 'Job Card': t.card, Tester: t.tester, 'Test Date': day(t.d), Mileage: t.mileage, Result: t.result, Expires: day(t.expires), 'Retest Of': t.of ? t.of.row : null, Fee: t.fee };
    later['MOT Tests'].push(t.row);
  }
  // A test's items point at the test's record; a failure not yet retested is not fixed yet.
  for (const row of later['MOT Items']) {
    const t = row['MOT Test'];
    row['MOT Test'] = t.row;
    if (row.fixedAt != null) { if (row.fixedAt <= 0) { row.Fixed = true; row['Fixed On'] = day(row.fixedAt); } delete row.fixedAt; }
  }
  later['MOT Items'] = later['MOT Items'].filter((row) => row['MOT Test']);

  // Then everything, in order: each value that is a kept record becomes its record number.
  const VEHICLE_ROW = (v) => ({ Registration: v.reg, Customer: v.customer.id, Make: v.make, Model: v.model, Body: v.body, Fuel: v.fuel, Year: v.year, Colour: v.colour, 'Tyre Size': v.tyre, Mileage: v.mileage, 'MOT Due': day(v.mot), 'Service Due': day(v.svc), Notes: v.notes });
  for (const [table, rows] of Object.entries(later)) {
    for (const row of rows) {
      const source = table === 'Vehicles' ? VEHICLE_ROW(row) : row;
      const values = {};
      for (const [k, v] of Object.entries(source)) values[k] = v !== null && typeof v === 'object' ? (ids.get(v) ?? v.id) : v;
      const id = add(table, values);
      ids.set(row, id);
      if (table === 'Vehicles') row.id = id;
    }
  }
  for (const p of parts.values()) base.update('Parts', p.id, { 'In Stock': p.stock });
  return counts;
}
