// The barber shop: Copper Pole Barbers, an invented shop with five chairs,
// open seven days, that takes walk-ins and bookings. Three chairs are the
// shop's own, worked by the owner and the barbers he employs; the other two
// are rented by the week to self-employed barbers who keep their own takings
// and pay chair rent. Its clients, the queue of every visit with when each
// person arrived, sat down and left, what was done and sold in each, the
// loyalty cards (a stamp a cut, the tenth cut free), the products on the
// shelf, the chair rental agreements and the weekly rent invoices.
//
// Its records are a year of the queue board, run a day at a time, and two
// weeks of bookings ahead. Saturdays are busy from opening, weekdays peak at
// lunch and after work, December is the busiest month and January the
// quietest. Regulars come back every few weeks, some book and some walk in;
// a walk-in waits for the first free chair, or for their own barber, and
// leaves if the wait is longer than they will stand. Prices are shown with
// VAT in them; the shop is registered for VAT and the two chair renters are
// not, so their cuts carry none. The questions a barber shop asks over the
// day and at the week's end are its saved queries; its reports print them.

import { address, BUSINESS_ABOUT, BUSINESS_TABLE, businessRecord, companies, FIRST, LAST, money } from './util.js';

// Its print templates need Office 2.16.0 or later: they say which records they print and when a line shows.
export const minOffice = '2.16.0';

const ref = (table) => ({ type: 'integer', points: table });
const BARBER = '[Barbers].[First Name] & " " & [Barbers].[Last Name]';
const CLIENT = '[Clients].[First Name] & " " & [Clients].[Last Name]';
// Minutes a walk-in stood waiting: from arriving to sitting down, both on the same day.
const WAIT = '(Mid([Started], 12, 2) * 60 + Mid([Started], 15, 2)) - (Mid([Arrived], 12, 2) * 60 + Mid([Arrived], 15, 2))';
const LETTERHEAD = { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'E-mail', 'Website', 'Tax Number'] };

export const spec = {
  // Where a value below nought is right: a loyalty credit taken off a week's chair rent.
  negative: { 'Rent Lines': ['Unit Price'] },
  tables: [
    BUSINESS_TABLE,
    { name: 'Chairs', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Position', type: 'text' },
      { name: 'Kind', type: 'text', default: 'Shop' }, { name: 'Notes', type: 'text' },
    ] },
    { name: 'Barbers', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Role', type: 'text' },
      { name: 'Basis', type: 'text', default: 'Employed' }, { name: 'Chair', ...ref('Chairs') }, { name: 'Phone', type: 'text' },
      { name: 'E-mail', type: 'text' }, { name: 'Works', type: 'text' }, { name: 'Started', type: 'date' }, { name: 'Left', type: 'date' },
      { name: 'Active', type: 'yesno', default: true }, { name: 'Trading Name', type: 'text' }, { name: 'Address', type: 'text' },
      { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' }, { name: 'Insurance Policy', type: 'text' },
      { name: 'Insurance Expires', type: 'date' }, { name: 'Receipt Note', type: 'text' },
    ] },
    { name: 'Clients', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Phone', type: 'text' },
      { name: 'E-mail', type: 'text' }, { name: 'Joined', type: 'date' }, { name: 'Usual Cut', type: 'text' },
      { name: 'Marketing Consent', type: 'yesno' }, { name: 'Notes', type: 'text' },
    ] },
    { name: 'Services', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Minutes', type: 'integer' }, { name: 'Price', type: 'currency' },
      { name: 'Tax Rate', type: 'number', default: 0.2 }, { name: 'Stamp', type: 'yesno' }, { name: 'Active', type: 'yesno', default: true },
    ] },
    { name: 'Products', fields: [
      { name: 'Name', type: 'text', required: true }, { name: 'Size', type: 'text' }, { name: 'Supplier', type: 'text' },
      { name: 'Cost Price', type: 'currency' }, { name: 'Sale Price', type: 'currency' }, { name: 'Tax Rate', type: 'number', default: 0.2 },
      { name: 'In Stock', type: 'integer', default: 0 }, { name: 'Reorder Level', type: 'integer', default: 3 },
      { name: 'Reorder Quantity', type: 'integer', default: 10 }, { name: 'Active', type: 'yesno', default: true },
    ] },
    { name: 'Loyalty Cards', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Client', ...ref('Clients'), required: true }, { name: 'Started', type: 'date' },
      { name: 'Stamps', type: 'integer', default: 0 }, { name: 'Status', type: 'text', default: 'Open' },
      { name: 'Full On', type: 'date' }, { name: 'Free Cut On', type: 'date' },
    ] },
    // Every visit on the queue board, booked or walked in, and its receipt once paid.
    { name: 'Visits', fields: [
      { name: 'Receipt No', type: 'text', unique: true }, { name: 'Client', ...ref('Clients') }, { name: 'Name', type: 'text' },
      { name: 'Barber', ...ref('Barbers'), required: true }, { name: 'Kind', type: 'text', default: 'Walk-in' },
      { name: 'Booked On', type: 'date' }, { name: 'Booked For', type: 'datetime' }, { name: 'Arrived', type: 'datetime' },
      { name: 'Started', type: 'datetime' }, { name: 'Finished', type: 'datetime' }, { name: 'Status', type: 'text', default: 'Waiting' },
      { name: 'Free Cut', type: 'yesno' }, { name: 'Card', ...ref('Loyalty Cards') }, { name: 'Net', type: 'currency' },
      { name: 'VAT', type: 'currency' }, { name: 'Total', type: 'currency' }, { name: 'Paid By', type: 'text' },
    ] },
    { name: 'Visit Lines', fields: [
      { name: 'Visit', ...ref('Visits'), required: true }, { name: 'Service', ...ref('Services') }, { name: 'Product', ...ref('Products') },
      { name: 'Item', type: 'text' }, { name: 'Quantity', type: 'integer', default: 1 }, { name: 'Unit Price', type: 'currency' },
      { name: 'Tax Rate', type: 'number', default: 0.2 },
    ] },
    { name: 'Stock Deliveries', fields: [
      { name: 'Product', ...ref('Products'), required: true }, { name: 'Received', type: 'date' }, { name: 'Quantity', type: 'integer' },
      { name: 'Unit Cost', type: 'currency' }, { name: 'Invoice Number', type: 'text' },
    ] },
    { name: 'Chair Rentals', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Barber', ...ref('Barbers'), required: true }, { name: 'Chair', ...ref('Chairs'), required: true },
      { name: 'Signed On', type: 'date' }, { name: 'Start Date', type: 'date' }, { name: 'End Date', type: 'date' },
      { name: 'Weekly Rent', type: 'currency' }, { name: 'Rent Day', type: 'text', default: 'Monday' }, { name: 'Deposit', type: 'currency' },
      { name: 'Notice Weeks', type: 'integer', default: 4 }, { name: 'Hours', type: 'text' }, { name: 'Included', type: 'longtext' },
      { name: 'Insurance Cover', type: 'currency' }, { name: 'Status', type: 'text', default: 'Active' },
    ] },
    { name: 'Rent Charges', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Rental', ...ref('Chair Rentals'), required: true }, { name: 'Invoice Date', type: 'date' },
      { name: 'Week Starting', type: 'date' }, { name: 'Due On', type: 'date' }, { name: 'Net', type: 'currency' }, { name: 'VAT', type: 'currency' },
      { name: 'Total', type: 'currency' }, { name: 'Paid On', type: 'date' }, { name: 'Paid By', type: 'text' },
    ] },
    { name: 'Rent Lines', fields: [
      { name: 'Charge', ...ref('Rent Charges'), required: true }, { name: 'Line', type: 'integer' }, { name: 'Description', type: 'text' },
      { name: 'Quantity', type: 'integer', default: 1 }, { name: 'Unit Price', type: 'currency' }, { name: 'Tax Rate', type: 'number', default: 0.2 },
    ] },
  ],
  queries: {
    'Queue board': { tables: ['Visits', 'Barbers'], columns: [
      { expr: 'Format(Nz([Booked For], [Arrived]), "yyyy-mm-dd")', as: 'Day' }, { expr: 'Mid(Nz([Booked For], [Arrived]), 12, 5)', as: 'Time' },
      { expr: 'Nz([Booked For], [Arrived])', as: 'Due', sort: 'asc', show: false }, { table: 'Visits', field: 'Name' },
      { table: 'Visits', field: 'Kind' }, { expr: BARBER, as: 'Barber' }, { table: 'Visits', field: 'Status' },
      { expr: 'DateDiff("d", Date(), Nz([Booked For], [Arrived]))', as: 'Days Away', criteria: ['Between 0 And 2'], show: false },
      { table: 'Visits', field: 'Status', criteria: ['In ("Waiting", "In chair", "Booked")'], show: false },
    ] },
    'Bookings next 7 days': { tables: ['Visits', 'Barbers'], columns: [
      { expr: 'Left([Booked For], 10) & " " & Mid([Booked For], 12, 5)', as: 'When' }, { table: 'Visits', field: 'Booked For', sort: 'asc', show: false },
      { expr: BARBER, as: 'Barber' }, { table: 'Visits', field: 'Name' }, { table: 'Visits', field: 'Booked On' },
      { expr: 'DateDiff("d", Date(), [Booked For])', as: 'Days Away', criteria: ['Between 0 And 7'], show: false },
      { table: 'Visits', field: 'Status', criteria: ['Booked'], show: false },
    ] },
    'Takings by barber, last 7 days': { tables: ['Visits', 'Barbers'], columns: [
      { expr: BARBER, as: 'Barber', total: 'group' }, { table: 'Barbers', field: 'Basis', total: 'group' },
      { table: 'Visits', field: 'ID', as: 'Visits', total: 'count' },
      { expr: 'IIf([Kind] = "Walk-in", 1, 0)', as: 'Walk-ins', total: 'sum' }, { expr: 'IIf([Free Cut], 1, 0)', as: 'Free Cuts', total: 'sum' },
      { table: 'Visits', field: 'Total', as: 'Takings', total: 'sum', sort: 'desc' },
      { table: 'Visits', field: 'Status', total: 'where', criteria: ['Done'] },
      { expr: 'DateDiff("d", [Arrived], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 6'] },
    ] },
    'Takings by barber by day': { tables: ['Visits', 'Barbers'], columns: [
      { expr: 'Format([Arrived], "yyyy-mm-dd")', as: 'Day', total: 'group', sort: 'desc' }, { expr: BARBER, as: 'Barber', total: 'group', sort: 'asc' },
      { table: 'Visits', field: 'ID', as: 'Visits', total: 'count' }, { table: 'Visits', field: 'Total', as: 'Takings', total: 'sum' },
      { table: 'Visits', field: 'Status', total: 'where', criteria: ['Done'] },
      { expr: 'DateDiff("d", [Arrived], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 6'] },
    ] },
    'Takings by barber by month': { tables: ['Visits', 'Barbers'], columns: [
      { expr: 'Format([Arrived], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { expr: BARBER, as: 'Barber', total: 'group', sort: 'asc' },
      { table: 'Barbers', field: 'Basis', total: 'group' }, { table: 'Visits', field: 'ID', as: 'Visits', total: 'count' },
      { table: 'Visits', field: 'Total', as: 'Takings', total: 'sum' }, { table: 'Visits', field: 'Status', total: 'where', criteria: ['Done'] },
    ] },
    'Shop takings and VAT by month': { tables: ['Visits', 'Barbers'], columns: [
      { expr: 'Format([Arrived], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Visits', field: 'ID', as: 'Visits', total: 'count' },
      { table: 'Visits', field: 'Total', as: 'Takings', total: 'sum' }, { table: 'Visits', field: 'Net', as: 'Net', total: 'sum' },
      { table: 'Visits', field: 'VAT', as: 'VAT', total: 'sum' },
      { table: 'Visits', field: 'Status', total: 'where', criteria: ['Done'] }, { table: 'Barbers', field: 'Basis', total: 'where', criteria: ['Employed'] },
    ] },
    'Chair rent due': { tables: ['Rent Charges', 'Chair Rentals', 'Barbers'], columns: [
      { table: 'Rent Charges', field: 'Number', as: 'Invoice' }, { expr: BARBER, as: 'Renter' }, { table: 'Rent Charges', field: 'Week Starting' },
      { table: 'Rent Charges', field: 'Due On', sort: 'asc' }, { table: 'Rent Charges', field: 'Total' },
      { expr: 'IIf(DateDiff("d", [Due On], Date()) > 0, DateDiff("d", [Due On], Date()), 0)', as: 'Days Overdue' },
      { table: 'Rent Charges', field: 'Paid On', criteria: ['Is Null'], show: false },
    ] },
    'Chair rent by month': { tables: ['Rent Charges', 'Chair Rentals', 'Barbers'], columns: [
      { expr: 'Format([Week Starting], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { expr: BARBER, as: 'Renter', total: 'group', sort: 'asc' },
      { table: 'Rent Charges', field: 'ID', as: 'Weeks', total: 'count' }, { table: 'Rent Charges', field: 'Net', as: 'Rent', total: 'sum' },
      { table: 'Rent Charges', field: 'Total', as: 'Invoiced', total: 'sum' },
      { expr: 'IIf(Nz([Paid On], "") = "", 0, [Total])', as: 'Paid', total: 'sum' }, { expr: 'IIf(Nz([Paid On], "") = "", [Total], 0)', as: 'Owing', total: 'sum' },
    ] },
    'Walk-in waits by hour': { tables: ['Visits'], columns: [
      { expr: 'Mid([Arrived], 12, 2)', as: 'Hour', total: 'group', sort: 'asc' }, { table: 'Visits', field: 'ID', as: 'Walk-ins', total: 'count' },
      { expr: WAIT, as: 'Average Wait', total: 'avg' }, { expr: WAIT, as: 'Longest Wait', total: 'max' },
      { expr: 'IIf([Status] = "Walked out", 1, 0)', as: 'Walked Out', total: 'sum' },
      { table: 'Visits', field: 'Kind', total: 'where', criteria: ['Walk-in'] }, { table: 'Visits', field: 'Status', total: 'where', criteria: ['In ("Done", "Walked out")'] },
      { expr: 'DateDiff("d", [Arrived], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 28'] },
    ] },
    'Walk-in waits by day': { tables: ['Visits'], columns: [
      { expr: 'Format([Arrived], "yyyy-mm-dd")', as: 'Day', total: 'group', sort: 'desc' }, { table: 'Visits', field: 'ID', as: 'Walk-ins', total: 'count' },
      { expr: WAIT, as: 'Average Wait', total: 'avg' }, { expr: WAIT, as: 'Longest Wait', total: 'max' },
      { expr: 'IIf([Status] = "Walked out", 1, 0)', as: 'Walked Out', total: 'sum' },
      { table: 'Visits', field: 'Kind', total: 'where', criteria: ['Walk-in'] }, { table: 'Visits', field: 'Status', total: 'where', criteria: ['In ("Done", "Walked out")'] },
      { expr: 'DateDiff("d", [Arrived], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 14'] },
    ] },
    'Busiest hours': { tables: ['Visits'], columns: [
      { expr: 'Mid([Arrived], 12, 2)', as: 'Hour', total: 'group', sort: 'asc' }, { table: 'Visits', field: 'ID', as: 'Visits', total: 'count' },
      { expr: 'IIf([Kind] = "Walk-in", 1, 0)', as: 'Walk-ins', total: 'sum' }, { expr: 'IIf([Kind] = "Booked", 1, 0)', as: 'Booked', total: 'sum' },
      { table: 'Visits', field: 'Status', total: 'where', criteria: ['In ("Done", "Walked out")'] },
      { expr: 'DateDiff("d", [Arrived], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 91'] },
    ] },
    'Due a free cut': { tables: ['Loyalty Cards', 'Clients'], columns: [
      { table: 'Loyalty Cards', field: 'Number', as: 'Card' }, { expr: CLIENT, as: 'Client' }, { table: 'Clients', field: 'Phone' },
      { table: 'Loyalty Cards', field: 'Started' }, { table: 'Loyalty Cards', field: 'Full On', sort: 'asc' },
      { expr: 'DateDiff("d", [Full On], Date())', as: 'Days Waiting' },
      { table: 'Loyalty Cards', field: 'Status', criteria: ['Due a free cut'], show: false },
    ] },
    'Loyalty cards nearly full': { tables: ['Loyalty Cards', 'Clients'], columns: [
      { table: 'Loyalty Cards', field: 'Number', as: 'Card' }, { expr: CLIENT, as: 'Client' }, { table: 'Clients', field: 'Phone' },
      { table: 'Loyalty Cards', field: 'Stamps', sort: 'desc', criteria: ['Between 7 And 8'] }, { table: 'Loyalty Cards', field: 'Started', sort: 'asc' },
      { table: 'Loyalty Cards', field: 'Status', criteria: ['Open'], show: false },
    ] },
    'Products low': { tables: ['Products'], columns: [
      { table: 'Products', field: 'Supplier', sort: 'asc' }, { table: 'Products', field: 'Name', as: 'Product', sort: 'asc' }, { table: 'Products', field: 'Size' },
      { table: 'Products', field: 'In Stock' }, { table: 'Products', field: 'Reorder Level' }, { table: 'Products', field: 'Reorder Quantity' },
      { expr: 'Round([Reorder Quantity] * [Cost Price], 2)', as: 'Order Cost' },
      { expr: '[In Stock] - [Reorder Level]', as: 'Above Reorder Level', criteria: ['<= 0'], show: false },
      { table: 'Products', field: 'Active', criteria: ['Yes'], show: false },
    ] },
    'Product sales by month': { tables: ['Visit Lines', 'Visits', 'Products'], columns: [
      { expr: 'Format([Arrived], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Visit Lines', field: 'Quantity', as: 'Items', total: 'sum' },
      { expr: 'Round([Quantity] * [Unit Price], 2)', as: 'Sales', total: 'sum' },
      { expr: 'Round([Quantity] * ([Unit Price] / (1 + [Visit Lines].[Tax Rate]) - [Cost Price]), 2)', as: 'Profit', total: 'sum' },
      { table: 'Visits', field: 'Status', total: 'where', criteria: ['Done'] },
    ] },
    'Popular services': { tables: ['Visit Lines', 'Services', 'Visits'], columns: [
      { table: 'Services', field: 'Name', as: 'Service', total: 'group' }, { table: 'Visit Lines', field: 'ID', as: 'Times', total: 'count', sort: 'desc' },
      { expr: 'Round([Quantity] * [Unit Price], 2)', as: 'Takings', total: 'sum' },
      { table: 'Visits', field: 'Status', total: 'where', criteria: ['Done'] },
      { expr: 'DateDiff("d", [Arrived], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 91'] },
    ] },
    'Regulars not seen lately': { tables: ['Clients', 'Visits'], columns: [
      { table: 'Clients', field: 'ID', total: 'group', show: false }, { expr: CLIENT, as: 'Client', total: 'group' },
      { table: 'Clients', field: 'Phone', total: 'group' }, { table: 'Clients', field: 'Usual Cut', total: 'group' },
      { expr: 'Format(Nz([Booked For], [Arrived]), "yyyy-mm-dd")', as: 'Last Visit', total: 'max' }, { table: 'Visits', field: 'ID', as: 'Visits', total: 'count' },
      { expr: 'DateDiff("d", Nz([Booked For], [Arrived]), Date())', as: 'Days Since', total: 'min', criteria: ['Between 56 And 365'], sort: 'asc' },
      { table: 'Visits', field: 'Status', total: 'where', criteria: ['In ("Done", "Booked")'] },
      { table: 'Clients', field: 'Marketing Consent', total: 'where', criteria: ['Yes'] },
    ] },
    'Service menu': { tables: ['Services'], columns: [
      { table: 'Services', field: 'Name', as: 'Service' }, { table: 'Services', field: 'Minutes' }, { table: 'Services', field: 'Price', sort: 'desc' },
      { table: 'Services', field: 'Stamp', as: 'Earns a Stamp' }, { table: 'Services', field: 'Active', criteria: ['Yes'], show: false },
    ] },
  },
  documents: [
    // The receipt from the till, on the 80 mm roll, for a visit paid for. On a rented chair it says whose takings it is.
    { name: 'Receipt', table: 'Visits', paper: 'receipt-80', where: 'Nz([Receipt No], "") <> ""', letterhead: { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'Website', 'Tax Number'] }, blocks: [
      { type: 'heading', text: 'Receipt {Receipt No}' },
      { type: 'fields', columns: 1, items: [
        { field: 'Finished', label: 'Date', format: 'dd/mm/yyyy hh:nn' }, { field: 'Barber', label: 'Barber' }, { field: 'Barber.Chair.Name', label: 'Chair' }, { field: 'Name', label: 'Client' },
        { field: 'Card.Number', label: 'Loyalty card', if: '[Card]' }, { field: 'Card.Stamps', label: 'Stamps on the card', if: '[Card]' },
      ] },
      { type: 'lines', table: 'Visit Lines', columns: [
        { field: 'Item' }, { field: 'Quantity', label: 'Qty', type: 'integer' }, { field: 'Unit Price', label: 'Price', type: 'currency' },
        { expr: 'Round([Quantity] * [Unit Price], 2)', as: 'Amount', type: 'currency' }, { expr: 'Nz([Tax Rate]) * 100', as: 'VAT %', type: 'number', format: '0' },
        { expr: 'Round(Round([Quantity] * [Unit Price], 2) - Round([Quantity] * [Unit Price], 2) / (1 + [Tax Rate]), 2)', as: 'VAT In', label: 'VAT', type: 'currency' },
      ] },
      // A rented chair's cut carries no VAT: the VAT row shows only when there is some.
      { type: 'totals', rows: [{ label: 'Total paid', expr: '[Amount]', strong: true }, { label: 'Of which VAT', expr: '[VAT In]', if: '[VAT In]' }] },
      { type: 'text', text: 'Your tenth cut, free on your loyalty card.', small: true, if: '[Free Cut]' },
      { type: 'text', text: 'Paid by {Paid By}.', small: true, if: '[Paid By]' },
      { type: 'text', text: '{Barber.Receipt Note}', small: true },
      { type: 'text', text: 'Loyalty card: a stamp for every paid cut, on any chair, and the tenth cut is free. Ask at the desk for a card.', small: true, if: 'Nz([Card], 0) = 0' },
      { type: 'text', text: '{Business.Document Footer}', small: true },
    ] },
    // The agreement a chair renter signs, its blanks filled from the renter's record and the rental's.
    // For the agreements in force; an ended one prints from its form, saying when it ended.
    { name: 'Chair rental agreement', table: 'Chair Rentals', paper: 'a4', where: '[Status] = "Active"', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'Chair rental agreement {Number}' },
      { type: 'text', text: 'This agreement ended on {End Date}.', if: '[End Date]' },
      { type: 'fields', columns: 2, items: [
        { field: 'Barber', label: 'Chair renter' }, { field: 'Chair.Name', label: 'Chair' },
        { field: 'Barber.Trading Name', label: 'Trading as' }, { field: 'Start Date', label: 'Starts', format: 'd mmmm yyyy' },
        { field: 'Barber.Address', label: 'Address' }, { field: 'Weekly Rent', label: 'Weekly rent (plus VAT)', format: '#,##0.00' },
        { field: 'Barber.City', label: 'City' }, { field: 'Rent Day', label: 'Rent due each' },
        { field: 'Barber.Postcode', label: 'Postcode' }, { field: 'Deposit', label: 'Deposit', format: '#,##0.00', if: '[Deposit]' },
      ] },
      { type: 'text', text: 'This agreement is made on {Signed On} between {Business.Name} of {Business.Address}, {Business.City} {Business.Postcode} ("the Shop") and {Barber.First Name} {Barber.Last Name}, trading as {Barber.Trading Name}, of {Barber.Address}, {Barber.City} {Barber.Postcode} ("the Barber").' },
      { type: 'text', text: '1. The chair. The Shop lets the Barber use {Chair.Name} ({Chair.Position}) in the shop, with its mirror, station, drawer and the shared basin, from {Start Date} until either side ends this agreement. The Barber runs their own business from the chair as a self-employed person. The Barber is not an employee or a partner of the Shop.' },
      { type: 'text', text: '2. Rent. The Barber pays {Weekly Rent} a week plus VAT, in advance, on each {Rent Day}. The Shop sends a numbered invoice for each week on the Friday before. Rent is due for every week of the agreement, including weeks the Barber is on holiday or chooses not to work. Rent more than 14 days late may end the agreement under clause 10.' },
      { type: 'text', text: '3. Deposit. The Barber has paid a deposit of {Deposit}. The Shop returns it within 14 days of the agreement ending, less any rent still owed and the cost of putting right any damage beyond fair wear.' },
      { type: 'text', text: '4. What the rent includes. {Included}' },
      { type: 'text', text: '5. Hours. The Barber may work at the chair during the shop\'s opening hours: {Hours}. The Barber chooses their own days and hours within these and tells the Shop by Friday which days they will work the next week, so the queue board is right.' },
      { type: 'text', text: '6. Clients, prices and payment. The Barber keeps their own clients and their own takings, and takes payment for their own work. Walk-ins are offered the first free chair, the Barber\'s included. The Barber may set their own prices but shows them on the shop\'s price board. The Barber honours the shop\'s loyalty card: a stamp for each cut, and the tenth cut free; each free cut the Barber gives is credited at the shop\'s menu price against the next week\'s rent.' },
      { type: 'text', text: '7. Products. The Barber buys their own tools and the products used in their work. Retail products are sold by the Shop; the Barber does not sell products from the chair without the Shop\'s agreement.' },
      { type: 'text', text: '8. Insurance and standards. The Barber holds public liability insurance cover of at least {Insurance Cover} and shows the Shop the certificate each year (policy {Barber.Insurance Policy}, renewed by {Barber.Insurance Expires}). The Barber cleans and disinfects tools between clients, keeps the station tidy, and follows the shop\'s health and safety rules and its rules on behaviour towards clients and colleagues.' },
      { type: 'text', text: '9. Tax. The Barber is responsible for their own income tax and National Insurance, and for VAT if they become registered for it. The Shop makes no deductions from the Barber\'s takings and pays the Barber no wages, holiday pay or sick pay.' },
      { type: 'text', text: '10. Ending the agreement. Either side may end this agreement by giving {Notice Weeks} weeks\' notice in writing. The Shop may end it at once if rent is more than 14 days late after a written reminder, or for serious misconduct. On the last day the Barber clears the station, returns the keys, and pays any rent owed up to the end of the notice.' },
      { type: 'text', text: '11. Changes. Any change to this agreement is made in writing and signed by both sides.' },
      { type: 'spacer', size: 24 },
      { type: 'signatures', labels: ['Signed for the Shop', 'Signed by the Barber', 'Date'] },
    ] },
    // The weekly invoice for a rented chair, numbered, with any loyalty credit taken off.
    { name: 'Chair rent invoice', table: 'Rent Charges', paper: 'a4', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'Invoice {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Rental.Barber', label: 'Invoice to' }, { field: 'Number', label: 'Invoice number' },
        { field: 'Rental.Barber.Trading Name', label: 'Trading as' }, { field: 'Invoice Date', label: 'Date', format: 'dd/mm/yyyy' },
        { field: 'Rental.Barber.Address', label: 'Address' }, { field: 'Week Starting', label: 'Week starting', format: 'dd/mm/yyyy' },
        { field: 'Rental.Barber.City', label: 'City' }, { field: 'Due On', label: 'Payment due', format: 'dd/mm/yyyy' },
        { field: 'Rental.Barber.Postcode', label: 'Postcode' }, { field: 'Rental.Number', label: 'Agreement' },
      ] },
      { type: 'lines', table: 'Rent Lines', sort: 'Line', columns: [
        { field: 'Description' }, { field: 'Quantity', label: 'Qty', type: 'integer' }, { field: 'Unit Price', type: 'currency' },
        { expr: 'Round([Quantity] * [Unit Price], 2)', as: 'Line Net', label: 'Net', type: 'currency' }, { expr: 'Nz([Tax Rate]) * 100', as: 'VAT %', type: 'number', format: '0' },
        { expr: 'Round(Round([Quantity] * [Unit Price], 2) * [Tax Rate], 2)', as: 'Line VAT', label: 'VAT', type: 'currency' },
      ] },
      { type: 'totals', rows: [{ label: 'Net', expr: '[Line Net]' }, { label: 'VAT', expr: '[Line VAT]' }, { label: 'Total due', expr: '[Line Net] + [Line VAT]', strong: true }] },
      { type: 'text', text: '{Business.Payment Terms} Please pay to {Business.Bank Details}, quoting {Number}, or in cash at the desk.', small: true, if: 'Nz([Paid On], "") = ""' },
      { type: 'text', text: 'Paid with thanks on {Paid On} by {Paid By}.', small: true, if: '[Paid On]' },
    ] },
    // The loyalty card, on the narrow roll to fold into a wallet: each stamp is a visit. For cards still in use.
    { name: 'Loyalty card', table: 'Loyalty Cards', paper: 'receipt-58', where: '[Status] <> "Used"', letterhead: { table: 'Business', fields: ['Name', 'Phone', 'Website'] }, blocks: [
      { type: 'heading', text: 'Loyalty card {Number}' },
      { type: 'fields', columns: 1, items: [{ field: 'Client', label: 'For' }, { field: 'Started', label: 'Started', format: 'dd/mm/yyyy' }, { field: 'Status', label: 'Card' }] },
      { type: 'lines', table: 'Visits', link: 'Card', sort: 'Finished', columns: [
        { field: 'Finished', as: 'Day', format: 'dd/mm/yyyy' }, { field: 'Barber.First Name', label: 'Barber' },
        { expr: 'IIf([Free Cut], 0, 1)', as: 'Stamp', type: 'integer' }, { expr: 'IIf([Free Cut], "Free cut", "")', as: 'Free' },
      ] },
      { type: 'totals', rows: [
        { label: 'Stamps', expr: '[Stamps]', type: 'integer', strong: true },
        { label: 'Cuts to your free one', expr: '9 - [Stamps]', type: 'integer', if: '[Stamps] < 9' },
      ] },
      { type: 'text', text: 'Your free cut is waiting: tell us when you come in.', if: '[Stamps] >= 9' },
      { type: 'text', text: 'One stamp for every paid cut, on any chair. Nine stamps and your tenth cut is free. Show your card or give your name at the desk.', small: true },
    ] },
  ],
  reports: [
    { name: 'Queue board', title: 'Queue board: today and the next two days', query: 'Queue board', group: 'Day', columns: ['Time', 'Name', 'Kind', 'Barber', 'Status'], totals: [{ field: 'Name', fn: 'count' }] },
    { name: 'Week ahead', title: 'Bookings: the next 7 days by barber', query: 'Bookings next 7 days', group: 'Barber', columns: ['When', 'Name', { field: 'Booked On', type: 'date' }], totals: [{ field: 'Name', fn: 'count' }] },
    { name: 'Barber takings', title: 'Takings by barber: the last 7 days', query: 'Takings by barber, last 7 days', columns: ['Barber', 'Basis', { field: 'Visits', type: 'integer' }, { field: 'Walk-ins', type: 'integer' }, { field: 'Free Cuts', type: 'integer' }, { field: 'Takings', type: 'currency' }], totals: [{ field: 'Visits', fn: 'sum' }, { field: 'Takings', fn: 'sum' }] },
    { name: 'Daily takings', title: 'Takings by day and barber: the last 7 days', query: 'Takings by barber by day', group: 'Day', columns: ['Barber', { field: 'Visits', type: 'integer' }, { field: 'Takings', type: 'currency' }], totals: [{ field: 'Visits', fn: 'sum' }, { field: 'Takings', fn: 'sum' }] },
    { name: 'Monthly takings', title: 'Takings by month and barber', query: 'Takings by barber by month', group: 'Month', columns: ['Barber', 'Basis', { field: 'Visits', type: 'integer' }, { field: 'Takings', type: 'currency' }], totals: [{ field: 'Takings', fn: 'sum' }] },
    { name: 'VAT by month', title: 'Shop takings and VAT by month', query: 'Shop takings and VAT by month', columns: ['Month', { field: 'Visits', type: 'integer' }, { field: 'Takings', type: 'currency' }, { field: 'Net', type: 'currency' }, { field: 'VAT', type: 'currency' }], totals: [{ field: 'Takings', fn: 'sum' }, { field: 'Net', fn: 'sum' }, { field: 'VAT', fn: 'sum' }] },
    { name: 'Rent owed', title: 'Chair rent not yet paid', query: 'Chair rent due', group: 'Renter', columns: ['Invoice', { field: 'Week Starting', type: 'date' }, { field: 'Due On', type: 'date' }, { field: 'Days Overdue', type: 'integer' }, { field: 'Total', type: 'currency' }], totals: [{ field: 'Total', fn: 'sum' }] },
    { name: 'Walk-in waits', title: 'Walk-in waits by hour: the last 4 weeks', query: 'Walk-in waits by hour', columns: ['Hour', { field: 'Walk-ins', type: 'integer' }, { field: 'Average Wait', type: 'number' }, { field: 'Longest Wait', type: 'integer' }, { field: 'Walked Out', type: 'integer' }], totals: [{ field: 'Walk-ins', fn: 'sum' }, { field: 'Walked Out', fn: 'sum' }] },
    { name: 'Free cuts due', query: 'Due a free cut', columns: ['Card', 'Client', 'Phone', { field: 'Full On', type: 'date' }, { field: 'Days Waiting', type: 'integer' }], totals: [{ field: 'Card', fn: 'count' }] },
    { name: 'Products to order', query: 'Products low', group: 'Supplier', columns: ['Product', 'Size', { field: 'In Stock', type: 'integer' }, { field: 'Reorder Level', type: 'integer' }, { field: 'Reorder Quantity', type: 'integer' }, { field: 'Order Cost', type: 'currency' }], totals: [{ field: 'Order Cost', fn: 'sum' }] },
    { name: 'Price list', query: 'Service menu', columns: ['Service', { field: 'Minutes', type: 'integer' }, { field: 'Price', type: 'currency' }] },
  ],
};

export const about = {
  name: 'Copper Pole Barbers',
  kind: 'Barber shop',
  line: 'The queue board, walk-ins and bookings, takings by barber, loyalty cards, chair rent and stock for a barber shop.',
  summary: [
    'For a barber shop that takes walk-ins as well as bookings, with some barbers on the payroll and some renting a chair. Copper Pole Barbers is an invented shop with five chairs, open seven days: Monday to Friday 9am to 7pm, Thursday until 8pm, Saturday 8am to 6pm and Sunday 10am to 4pm. The owner and two employed barbers work the shop\'s three chairs, with a part-time barber on Sundays and Mondays. Chairs 4 and 5 are rented by the week to self-employed barbers, who keep their own takings and pay chair rent plus VAT each Monday.',
    'The records cover the last year of the queue board and the bookings for the next two weeks. Every visit is kept: when the client arrived, when they sat down and when they left, so the waits of walk-ins can be measured. Saturdays are the busiest day, weekdays peak at lunchtime and after work, December is the busiest month and January the quietest. Most visits are regulars who come back every two to six weeks, some booked and some walking in; a walk-in who would wait longer than they will stand leaves, and is counted. A few bookings are cancelled or not kept.',
    'Prices have VAT in them. The shop is registered for VAT; the chair renters are not, so their cuts carry none, and their receipts say whose takings they are. The loyalty card gives a stamp for each paid cut on any chair, and the tenth cut is free; a free cut given on a rented chair is credited against that barber\'s next week of rent. The shop sells styling and beard products at the desk and orders them each Monday. One chair renter left part way through the year and another took the chair after two weeks.',
  ].join('\n\n'),
  suits: ['A barber shop with or without rented chairs', 'A hair salon that rents chairs to self-employed stylists', 'A nail bar that takes walk-ins', 'A tattoo or piercing studio with resident artists', 'A walk-in clinic or repair counter that measures waiting times', 'A beauty room that rents rooms to therapists'],
  tables: {
    Business: BUSINESS_ABOUT,
    Chairs: { about: 'The chairs in the shop, one record each.', fields: {
      Name: 'The chair as the shop calls it: Chair 1 to Chair 5. Each name is used once.', Position: 'Where it is in the shop, as written in a rental agreement.',
      Kind: 'Shop (worked by the shop\'s own barbers) or Rented (let to a self-employed barber).', Notes: 'Anything about the chair, such as a new pump or a basin beside it.',
    } },
    Barbers: { about: 'Everyone who cuts hair in the shop, past and present: the employed barbers and the chair renters.', fields: {
      'First Name': 'The name clients know them by.', 'Last Name': 'Their family name.', Role: 'Their job, such as Senior Barber or Barber (chair renter).',
      Basis: 'Employed, on the shop\'s payroll and taking the shop\'s money, or Chair renter, self-employed and taking their own.',
      Chair: 'The chair they work at.', Phone: 'Their mobile.', 'E-mail': 'Their e-mail address.', Works: 'The days they usually work.',
      Started: 'The day they started in the shop.', Left: 'The day they left; empty while they are here.', Active: 'Yes while they work here; No keeps their history.',
      'Trading Name': 'A chair renter\'s business name, printed on their agreement and rent invoices.',
      Address: 'A chair renter\'s address, for the agreement and invoices.', City: 'The town or city of that address.', Postcode: 'Its postcode.',
      'Insurance Policy': 'The number of a chair renter\'s public liability insurance policy. The sample has invented ones.',
      'Insurance Expires': 'When that insurance runs out, so the shop can ask for the new certificate.',
      'Receipt Note': 'A line printed at the foot of each receipt for their visits: for a chair renter, that the takings and the receipt are theirs and carry no VAT.',
    } },
    Clients: { about: 'Clients who have given their name, mostly regulars and anyone with a loyalty card. A walk-in who gives only a first name is on the queue board without a record here.', fields: {
      'First Name': 'Their first name, called out from the queue.', 'Last Name': 'Their family name.', Phone: 'Their mobile, for bookings and a text when a free cut is due.',
      'E-mail': 'Their e-mail address.', Joined: 'The day they first gave their details.', 'Usual Cut': 'What they usually have, so any barber can do it: grade on the sides, length on top.',
      'Marketing Consent': 'Yes if they agreed to hear from the shop. Only these go on the list of regulars not seen lately.', Notes: 'Anything else worth knowing.',
    } },
    Services: { about: 'The price list: every service the shop offers.', fields: {
      Name: 'The service as it is on the board.', Minutes: 'How long it takes, for booking and for working out the queue.', Price: 'The price, VAT included.',
      'Tax Rate': 'The VAT within the price, as a fraction: 0.2 is twenty per cent. A chair renter\'s visits carry 0.',
      Stamp: 'Yes if it earns a loyalty stamp (the haircuts); a beard trim or line-up alone does not.', Active: 'No takes it off the board without losing its history.',
    } },
    Products: { about: 'The styling and beard products the shop sells at the desk.', fields: {
      Name: 'The product, described plainly.', Size: 'The size of one.', Supplier: 'Who it is ordered from.', 'Cost Price': 'What one costs the shop, before VAT.',
      'Sale Price': 'The price at the desk, VAT included.', 'Tax Rate': 'The VAT within the sale price, as a fraction.',
      'In Stock': 'How many are on the shelf now.', 'Reorder Level': 'At or below this many, it goes on Monday\'s order.',
      'Reorder Quantity': 'How many to order each time.', Active: 'No for a product the shop no longer stocks.',
    } },
    'Loyalty Cards': { about: 'Each loyalty card a client has had: a stamp for each paid cut, and once there are nine, the next cut is free and the card is done.', fields: {
      Number: 'The number on the card: LC-00042.', Client: 'Whose card it is.', Started: 'The day of its first stamp.',
      Stamps: 'How many stamps it has, nought to nine.', Status: 'Open, Due a free cut (nine stamps) or Used (the free cut has been given).',
      'Full On': 'The day it reached nine stamps.', 'Free Cut On': 'The day the free cut was given.',
    } },
    Visits: { about: 'The queue board: every visit, booked or walked in, past, today and to come. A visit that was paid for is also its receipt.', fields: {
      'Receipt No': 'The receipt number, given when the visit is paid for, in the order of the till, a new run each year: RCP-2026-00042. Empty until then.',
      Client: 'The client\'s record, when they have one. Empty for a walk-in who gave only a name.', Name: 'The name called from the queue.',
      Barber: 'Who did the cut, or who it is booked with.', Kind: 'Walk-in or Booked.', 'Booked On': 'The day a booking was made.',
      'Booked For': 'The day and time booked; empty for a walk-in.', Arrived: 'When the client came through the door, or the booked time for a booking not yet kept.',
      Started: 'When they sat in the chair.', Finished: 'When they paid and left.',
      Status: 'Booked, Waiting, In chair, Done, Walked out (left before their turn), No-show or Cancelled.',
      'Free Cut': 'Yes for the tenth cut, given free on a full loyalty card.', Card: 'The loyalty card the visit stamped, or the full card it used.',
      Net: 'The total less the VAT within it.', VAT: 'The VAT within the total: each line\'s rounded to the penny, then added up.',
      Total: 'What the client paid, VAT included.', 'Paid By': 'Card, Cash, or Loyalty card for a free cut with nothing else.',
    } },
    'Visit Lines': { about: 'What was done and sold in each visit: a line for each service and each product.', fields: {
      Visit: 'The visit the line belongs to.', Service: 'The service, for a service line.', Product: 'The product, for a product sold at the desk.',
      Item: 'The service or product as printed on the receipt.', Quantity: 'How many: one for a service.', 'Unit Price': 'The price of one, VAT included, as charged.',
      'Tax Rate': 'The VAT within the price, as a fraction: 0.2 on the shop\'s chairs, 0 on a renter\'s chair.',
    } },
    'Stock Deliveries': { about: 'What came in from the supplier, one record per product per delivery.', fields: {
      Product: 'What came in.', Received: 'The day it arrived.', Quantity: 'How many.', 'Unit Cost': 'What each cost, before VAT.',
      'Invoice Number': 'The supplier\'s invoice, to match against the bill.',
    } },
    'Chair Rentals': { about: 'Each chair rental agreement, current and ended: who rents which chair, for what rent and on what terms. The Chair rental agreement prints from it.', fields: {
      Number: 'The agreement\'s number: CRA-2025-0002.', Barber: 'The self-employed barber renting the chair.', Chair: 'The chair rented.',
      'Signed On': 'The day both sides signed.', 'Start Date': 'The first day of the rental.', 'End Date': 'The last day, once notice has been given; empty while it runs.',
      'Weekly Rent': 'The rent for a week, before VAT.', 'Rent Day': 'The day of the week the rent is due, in advance.', Deposit: 'The deposit paid when signing.',
      'Notice Weeks': 'How many weeks of notice either side gives to end it.', Hours: 'The hours the chair may be used, printed in the agreement.',
      Included: 'What the rent covers, printed in the agreement.', 'Insurance Cover': 'The least public liability cover the renter must hold.',
      Status: 'Active or Ended.',
    } },
    'Rent Charges': { about: 'The weekly chair rent invoices, one per rental per week, sent on the Friday before the week.', fields: {
      Number: 'The invoice number, a new run each year: RENT-2026-0042.', Rental: 'The agreement it is charged under.', 'Invoice Date': 'The day it was sent: the Friday before the week.',
      'Week Starting': 'The Monday of the week the rent is for.', 'Due On': 'When it is due: the rent day.', Net: 'The rent less any loyalty credit, before VAT.',
      VAT: 'The VAT on it: each line\'s rounded to the penny, then added up.', Total: 'What is due: net and VAT together.',
      'Paid On': 'The day it was paid; empty while it is owed.', 'Paid By': 'Bank transfer or Cash.',
    } },
    'Rent Lines': { about: 'The lines of each rent invoice: the week\'s rent, and a credit for any free loyalty cuts the renter gave the week before (up to five a week; any more are credited the week after).', fields: {
      Charge: 'The invoice the line is on.', Line: 'Its place on the invoice.', Description: 'What it is for, as printed.', Quantity: 'How many: one week, or the number of free cuts.',
      'Unit Price': 'The price of one before VAT; below nought for a credit.', 'Tax Rate': 'The VAT rate as a fraction: 0.2.',
    } },
  },
  queries: {
    'Queue board': 'Who is waiting, who is in the chair and who is booked, today and the next two days, in time order. The board by the door.',
    'Bookings next 7 days': 'Every booking from today to a week ahead, by time, with the barber.',
    'Takings by barber, last 7 days': 'For each barber over the last seven days: visits, how many were walk-ins, free cuts given and the takings. A chair renter\'s takings are their own.',
    'Takings by barber by day': 'Each day of the last week, each barber\'s visits and takings, the newest day first.',
    'Takings by barber by month': 'Visits and takings for each barber each month, with whether they are employed or renting.',
    'Shop takings and VAT by month': 'The shop\'s own takings each month (the employed barbers\' visits and the products), with the net and VAT within them, for the VAT return.',
    'Chair rent due': 'Rent invoices not yet paid, by due date, with how many days each is overdue (nought when not yet due).',
    'Chair rent by month': 'For each renter each month: the weeks invoiced, the rent, the total with VAT, what has been paid and what is owed.',
    'Walk-in waits by hour': 'For walk-ins over the last four weeks, by the hour they arrived: how many came, the average and longest wait in minutes, and how many walked out. Use it to plan who works when.',
    'Walk-in waits by day': 'The same for each of the last fourteen days, to see which days the queue got long.',
    'Busiest hours': 'Visits by the hour they arrived over the last thirteen weeks, walk-ins and bookings apart.',
    'Due a free cut': 'Loyalty cards with nine stamps whose free cut has not been given yet, the longest waiting first. Text them, or have it ready when they come in.',
    'Loyalty cards nearly full': 'Open cards with seven or eight stamps.',
    'Products low': 'Products at or below their reorder level, with what the order will cost. The Monday order list.',
    'Product sales by month': 'Products sold each month, the sales with VAT in, and the profit after VAT and cost.',
    'Popular services': 'The services done over the last thirteen weeks, the most done first, with what each took.',
    'Regulars not seen lately': 'Clients who agreed to hear from the shop, last in between eight weeks and a year ago, with nothing booked.',
    'Service menu': 'The price list, the dearest first, with the minutes each takes and whether it earns a stamp.',
  },
  reports: {
    'Queue board': 'Today\'s queue and the next two days\' bookings, a section a day, to pin up or check at the desk.',
    'Week ahead': 'The next seven days of bookings, a section for each barber.',
    'Barber takings': 'The last seven days\' visits and takings by barber, with totals.',
    'Daily takings': 'The last seven days, a section a day, with each barber\'s visits and takings: to check against the till and the card machine.',
    'Monthly takings': 'Each month\'s takings by barber, with a total for the month.',
    'VAT by month': 'The shop\'s takings, net and VAT month by month, with totals, for the bookkeeper.',
    'Rent owed': 'Chair rent not yet paid, a section for each renter, with the total owed.',
    'Walk-in waits': 'The average and longest waits by hour over the last four weeks, and how many walked out.',
    'Free cuts due': 'The list of clients due a free cut.',
    'Products to order': 'Monday\'s order, with the cost of each line and the total.',
    'Price list': 'The services and prices, for the board in the window.',
  },
  documents: {
    Receipt: 'The receipt from the till for a visit, on an 80 mm roll: the barber and chair, each service and product with the VAT within it, the total, how it was paid and the loyalty stamps so far. On a rented chair it says the takings are the renter\'s and carry no VAT, and leaves out the VAT line. It prints for visits paid for, those with a receipt number; the loyalty card lines print only when the visit was on a card.',
    'Chair rental agreement': 'The agreement a self-employed barber signs to rent a chair: the parties, the chair, the weekly rent and the day it is due, the deposit, what the rent covers, the hours, clients and payment, insurance, tax, notice and signatures. It prints for agreements in force; an ended one prints from the Chair Rentals form and says when it ended. Plain words of our own: have it checked for your own country before you use it.',
    'Chair rent invoice': 'The weekly invoice for a rented chair, numbered RENT-2026-0042, with the week\'s rent, any credit for free loyalty cuts, the VAT and the total due on the rent day. An unpaid invoice says how to pay; a paid one says when and how it was paid.',
    'Loyalty card': 'A client\'s loyalty card on the narrow roll: the days of each stamped cut and who did it, the stamps so far and how many to the free cut, or that the free cut is waiting. It prints for cards still in use, not ones whose free cut has been given.',
  },
  tutorial: [
    { title: 'Put a walk-in on the queue board and take payment', steps: [
      'Open the Visits form and press New. Type the client\'s first name in Name; if they have a record, choose them in Client. Kind is Walk-in, Arrived is now, and Status is Waiting.',
      'Run the query Queue board to see who is next. When they sit down, type the time in Started, choose the barber in Barber and set Status to In chair.',
      'When the cut is done, add the services in Visit Lines below, with Item, Unit Price and Tax Rate (0.2 on the shop\'s chairs, 0 on a renter\'s). Add any product sold as a line with Product chosen, and take one off its In Stock on the Products form.',
      'Type Finished, the Total, the VAT (the price less the price divided by 1.2, line by line) and Net, Paid By, and the next Receipt No. Set Status to Done.',
      'Open the print template Receipt from Print templates, choose the visit and press Print.',
    ] },
    { title: 'Book a cut', steps: [
      'Open the Visits form and press New. Choose the client, set Kind to Booked, type the day and time in Booked For and today in Booked On, choose the barber, and set Status to Booked.',
      'Add the service booked in Visit Lines so the barber knows how long to allow.',
      'Print the report Week ahead each evening to see every barber\'s bookings, or run Bookings next 7 days.',
    ] },
    { title: 'Stamp a loyalty card and give the free cut', steps: [
      'After a paid cut, open the Loyalty Cards form and find the client\'s open card, or press New to start one with the next Number, the client and today in Started.',
      'Add one to Stamps, and choose that card in Card on the visit. At nine stamps, set Status to Due a free cut and type the day in Full On.',
      'Run Due a free cut to see who has one waiting. On the free visit, tick Free Cut, put the cut in Visit Lines at a price of nought, set the card\'s Status to Used and type Free Cut On.',
      'To give a client a printed card, open the print template Loyalty card and choose their card.',
    ] },
    { title: 'Rent a chair to a self-employed barber', steps: [
      'Add the barber to the Barbers form with Basis set to Chair renter, their Chair, Trading Name, address, insurance policy and the Receipt Note for their receipts.',
      'Open the Chair Rentals form and press New. Type the next Number, choose the barber and the chair, and fill in Signed On, Start Date, Weekly Rent, Rent Day, Deposit, Notice Weeks, Hours, Included and Insurance Cover.',
      'Open the print template Chair rental agreement, choose the agreement and print two copies to sign, one for each side.',
    ] },
    { title: 'Raise the week\'s chair rent and record payment', steps: [
      'Each Friday, open the Rent Charges form and press New for each active rental: the next Number, the rental, today in Invoice Date, the coming Monday in Week Starting and Due On.',
      'In Rent Lines below, add the week\'s rent (quantity 1, the weekly rent, Tax Rate 0.2). If the renter gave free loyalty cuts last week, add a line for them at the menu price below nought. Type the Net, VAT and Total.',
      'Open the print template Chair rent invoice, choose the invoice and print or save it as a PDF to send.',
      'When the money comes in, type the day in Paid On and how in Paid By. The query Chair rent due, or the report Rent owed, shows what is still unpaid.',
    ] },
    { title: 'Close the week', steps: [
      'Print the report Daily takings and check each day against the card machine and the cash in the till.',
      'Print Barber takings for the week\'s figures by barber, and Walk-in waits to see when the queue was longest.',
      'On Monday, print Products to order, send it to the supplier, and when the delivery comes add it to Stock Deliveries and to In Stock.',
    ] },
    { title: 'Do the VAT return', steps: [
      'Print the report VAT by month and add up the three months of the quarter. It counts the shop\'s own visits and products only; the chair renters\' takings are not the shop\'s.',
      'Add the VAT on chair rent from the Rent Charges of the same months: open the query Chair rent by month and take the VAT as the Invoiced less the Rent.',
    ] },
  ],
  notes: [
    'A visit is also its receipt: the Receipt No, Total and VAT are filled in when it is paid for. A booking still to come, a no-show or a walk-out has no receipt number, so the Receipt template leaves it out.',
    'Chair renters keep their own takings. Their visits are on the queue board so the queue, the waits and the loyalty cards are right, and their totals show in Takings by barber, but they are left out of the shop\'s VAT. Their lines carry a Tax Rate of 0.',
    'Waiting times are worked out from Arrived and Started, which must be on the same day. A walk-in who leaves before their turn is kept, as Walked out, with no Started time, so the queries can count them.',
    'Stock is not counted by Data Files on its own: take a product off In Stock when you sell it, and add a delivery when it comes. In the sample this was done while the records were made.',
    'A free cut on a rented chair costs the renter their price, so the shop credits it against the next week\'s rent: that is the line below nought on a Chair rent invoice.',
    'Each print template prints only the records it is for: receipts for paid visits, agreements in force, loyalty cards still in use, and every rent invoice. Printed from a form, the record on screen prints whatever its state.',
  ],
  faq: [
    { q: 'How do I see who is next?', a: 'Run the query Queue board. It lists everyone waiting, in the chair and booked, today and for the next two days, in time order.' },
    { q: 'How long are walk-ins waiting?', a: 'Run Walk-in waits by hour for the last four weeks by hour of the day, or Walk-in waits by day for each of the last fourteen days. The waits are in minutes; Walked Out counts those who left.' },
    { q: 'Why is there no VAT on some receipts?', a: 'Those visits were on a rented chair. The renter is a separate business, not registered for VAT, so their cuts carry none. The note at the foot of the receipt, from the barber\'s Receipt Note, says so.' },
    { q: 'How do I print last week\'s rent invoices?', a: 'Open the print template Chair rent invoice and choose the invoices for that week; the query Chair rent by month and the Rent Charges form show their numbers.' },
    { q: 'A renter is behind with the rent. Where do I see it?', a: 'Run Chair rent due or print Rent owed. Each unpaid invoice is listed with the days overdue. The agreement says rent more than 14 days late after a reminder can end it.' },
    { q: 'Can I change the loyalty card to a stamp every visit, beard trims too?', a: 'Yes: tick Stamp on those services in the Services form. To make the eighth cut free instead of the tenth, change the 9 on the Loyalty card template and in your own counting.' },
    { q: 'How do I start with my own shop?', a: 'Open the sample empty. Fill in Business, then Chairs, then Barbers, Services and Products. Add Chair Rentals for any renters, and clients as they come in.' },
  ],
  empty: 'Start with Business, your shop\'s name, address, VAT number and bank details, which every receipt and invoice prints. Then Chairs, then Barbers on each chair (with Basis, and a renter\'s trading name, address and insurance), then the Services price list and the Products you sell. If you rent chairs, add a Chair Rentals record for each renter and print the agreement. Clients can be added as they give their details. Visits, their lines, loyalty cards, stock deliveries and rent charges come in as you trade.',
  adapt: [
    'Pay employed barbers commission: add a Commission Rate to Barbers and a query that takes it off each barber\'s takings by month.',
    'Take a deposit for long bookings, such as a cut, beard and hot towel shave: add a Deposit field to Visits and take it off the receipt\'s total.',
    'If a chair renter uses the shop\'s card machine, add a Paid Over field to Visits and a weekly query of what is owed to each renter, less their rent.',
    'Send a text when a free cut is due: the query Due a free cut has the phone numbers to copy into a message.',
    'Rent a chair by the day instead of the week: add a Days field to Rent Lines and a daily rate to Chair Rentals.',
    'For a salon or studio that rents rooms, rename Chairs to Rooms; the agreement and invoices work the same.',
    'Show the wait on the board: add a calculated column to Queue board with the minutes from Arrived to now, using Now().',
  ],
};

/** The price list: [name, minutes, price, earns a stamp]. Prices include VAT. */
const MENU = [
  ['Haircut', 30, 22, true], ['Skin fade', 40, 26, true], ['Scissor cut', 40, 26, true], ['Cut and beard', 45, 32, true],
  ['Buzz cut', 15, 14, true], ["Kids cut (under 12)", 25, 16, true], ['Senior cut (over 65)', 30, 16, true],
  ['Beard trim', 15, 12, false], ['Hot towel shave', 30, 25, false], ['Line-up', 10, 8, false], ['Hair design', 15, 6, false],
];
/** What a client has, by weight; and how often an extra goes with it. */
const CUTS = [['Haircut', 30], ['Skin fade', 26], ['Scissor cut', 11], ['Cut and beard', 13], ['Buzz cut', 5], ['Kids cut (under 12)', 9], ['Senior cut (over 65)', 6]];
const USUAL = {
  Haircut: ['Number 2 on the sides, a little off the top', 'Number 3 back and sides, scissors on top', 'Short back and sides, side parting'],
  'Skin fade': ['Skin fade, number 1 blend, textured top', 'Mid skin fade, 2 inches on top', 'Low fade, beard blended in'],
  'Scissor cut': ['Scissors all over, keep the length', 'Tidy up, thin out the top'], 'Cut and beard': ['Number 2 sides, beard shaped and lined'],
  'Buzz cut': ['Number 1 all over', 'Number 3 all over'], 'Kids cut (under 12)': ['Short and neat for school', 'Number 4 sides, longer top'],
  'Senior cut (over 65)': ['Short back and sides, neat neckline'],
};
/** The shelf: [name, size, cost, price, reorder level, order quantity, how often it sells]. Generic goods; no brand. */
const SHELF = [
  ['Matt clay', '75 g', 5.2, 14, 4, 12, 3], ['Water-based pomade', '100 ml', 4.8, 13, 4, 12, 2.6], ['Texture powder', '20 g', 3.9, 11, 3, 10, 1.4],
  ['Sea salt spray', '200 ml', 4.4, 12, 3, 10, 1.2], ['Beard oil', '30 ml', 4.1, 12, 4, 12, 2.4], ['Beard balm', '60 g', 4.6, 13, 3, 10, 1.4],
  ['Shampoo for men', '250 ml', 3.6, 10, 3, 10, 1.1], ['Aftershave balm', '100 ml', 4.9, 14, 2, 6, 0.8], ['Pocket comb', 'each', 0.6, 3, 5, 20, 1],
  ['Beard brush', 'each', 3.2, 10, 2, 6, 0.6], ['Hair wax', '100 ml', 4.2, 12, 3, 10, 1.3], ['Beard oil and balm gift set', 'box', 8.5, 24, 2, 6, 0.4],
];
/** Opening hours by weekday (0 Sunday), in minutes from midnight. */
const OPEN = { 0: [600, 960], 1: [540, 1140], 2: [540, 1140], 3: [540, 1140], 4: [540, 1200], 5: [540, 1140], 6: [480, 1080] };
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** When walk-ins come through the door, by hour: lunch and after work on weekdays, all morning on Saturday. */
const ARRIVALS = {
  week: [[9, 0.8], [10, 1], [11, 1.1], [12, 1.9], [13, 1.8], [14, 1], [15, 1.1], [16, 1.4], [17, 2.1], [18, 1.6], [19, 0.6]],
  sat: [[8, 1.4], [9, 2.2], [10, 2.6], [11, 2.6], [12, 2.2], [13, 1.8], [14, 1.6], [15, 1.3], [16, 1], [17, 0.5]],
  sun: [[10, 1.2], [11, 1.6], [12, 1.6], [13, 1.4], [14, 1.1], [15, 0.7]],
};
// Names a barber's clients mostly have; a few women and girls come in for short cuts too.
const MEN = new Set(['Ben', 'Emeka', 'Giorgio', 'Ivan', 'Kofi', 'Mateo', 'Oskar', 'Rhys', 'Tariq', 'Viktor', 'Yusuf', 'Bilal', 'Dmitri', 'Farhan', 'Hamza', 'Javier', 'Lukas', 'Noah', 'Paulo', 'Samir', 'Tomasz', 'Wale', 'Zain', 'Callum', 'Eamon', 'Hiroshi', 'Chen', 'Wen', 'Olu']);
const MALE = FIRST.filter((n) => MEN.has(n));

const pad = (n, w) => String(n).padStart(w, '0');
const hhmm = (m) => [Math.floor(m / 60), m % 60];

/** Fill a Copper Pole Barbers database made from `spec`. `r` is random(), `cal` calendar(). Answers counts. */
export function fill(base, { r, cal, days = 380, ahead = 14 }) {
  const counts = {};
  const add = (table, values) => { counts[table] = (counts[table] || 0) + 1; return base.insert(table, values); };
  const ukDate = (d) => { const s = cal.day(d); return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`; };

  // Phone numbers from the fiction ranges, each given out once.
  const mobiles = r.some([...Array(1000).keys()], 1000).map((i) => `07700 900${pad(i, 3)}`);
  const landlines = r.some([...Array(1000).keys()], 1000).map((i) => `020 7946 0${pad(i, 3)}`);
  landlines.splice(landlines.indexOf('020 7946 0275'), 1);
  const phone = () => mobiles.pop() || landlines.pop() || '';
  const mails = new Set();
  const mailFor = (first, last) => {
    const domain = r.pick(['example.com', 'example.org', 'example.net']);
    let m = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '');
    for (let i = 2; mails.has(`${m}@${domain}`); i++) m = `${first}.${last}${i}`.toLowerCase().replace(/[^a-z.0-9]/g, '');
    mails.add(`${m}@${domain}`);
    return `${m}@${domain}`;
  };

  add('Business', businessRecord({
    name: 'Copper Pole Barbers', domain: 'copperpole.example', phone: '020 7946 0275',
    address: { Address: '112 Station Road', City: 'London', Postcode: 'E8 3LT', Country: 'United Kingdom' },
    terms: 'Chair rent is due each Monday, in advance, for the week.',
    footer: 'Open seven days: Monday to Friday 9am to 7pm, Thursday until 8pm, Saturday 8am to 6pm, Sunday 10am to 4pm. Walk-ins welcome, or call to book. Thank you, and see you next time.',
  }));

  // The chairs: three the shop works, two it rents out.
  const chairs = [['By the window', 'Shop'], ['Window side', 'Shop'], ['Middle', 'Shop'], ['Back left, by the basin', 'Rented'], ['Back right', 'Rented']].map(([position, kind], i) => ({
    name: `Chair ${i + 1}`, position, id: add('Chairs', { Name: `Chair ${i + 1}`, Position: position, Kind: kind, Notes: i === 3 ? 'Next to the basin, shared with chair 5' : null }),
  }));

  // The barbers. A renter left about seven months ago; another took the chair two weeks later.
  const TEAM = [
    { role: 'Owner and Head Barber', basis: 'Employed', chair: 0, days: [2, 3, 4, 5, 6], since: -4300, pull: 1.0 },
    { role: 'Senior Barber', basis: 'Employed', chair: 1, days: [1, 2, 3, 5, 6], since: -1600, pull: 1.05 },
    { role: 'Barber', basis: 'Employed', chair: 2, days: [0, 1, 4, 5, 6], since: -640, pull: 0.95 },
    { role: 'Part-time Barber', basis: 'Employed', chair: 0, days: [0, 1], since: -310, pull: 0.8 },
    { role: 'Barber (chair renter)', basis: 'Chair renter', chair: 3, days: [1, 2, 3, 4, 6], since: -990, pull: 1.1, rent: 170 },
    { role: 'Barber (chair renter)', basis: 'Chair renter', chair: 4, days: [0, 3, 4, 5, 6], since: -780, to: -232, pull: 1.0, rent: 160 },
    { role: 'Barber (chair renter)', basis: 'Chair renter', chair: 4, days: [0, 3, 4, 5, 6], since: -218, pull: 0.9, rent: 150 },
  ];
  const used = new Set();
  for (const b of TEAM) {
    let first;
    do first = r.pick(MALE); while (used.has(first));
    used.add(first);
    const last = r.pick(LAST);
    b.first = first;
    b.name = `${first} ${last}`;
    b.from = Math.max(b.since, -days - 1);
    b.to = b.to ?? Infinity;
    b.renter = b.basis === 'Chair renter';
    // Two weeks' holiday a year, never in December.
    b.off = new Set();
    for (let k = 0; k < 2; k++) {
      const start = r.int(-days, ahead);
      if (cal.at(start).getMonth() === 11) continue;
      for (let i = 0; i < 7; i++) b.off.add(start + i);
    }
    const home = b.renter ? { ...address(r), City: 'London', Country: 'United Kingdom' } : null;
    if (home) home.Postcode = `${r.pick(['E5', 'E9', 'N16', 'E2', 'N1'])} ${r.int(1, 9)}${r.pick(['AB', 'DF', 'HP', 'QT', 'RW'])}`;
    b.id = add('Barbers', {
      'First Name': first, 'Last Name': last, Role: b.role, Basis: b.basis, Chair: chairs[b.chair].id, Phone: phone(),
      'E-mail': b.renter ? `${first}.${last}@example.com`.toLowerCase() : `${first.toLowerCase()}@copperpole.example`,
      Works: b.days.map((d) => DAY_NAMES[d]).join(', '), Started: cal.day(b.since), Left: Number.isFinite(b.to) ? cal.day(b.to) : null, Active: !Number.isFinite(b.to),
      'Trading Name': b.renter ? `${first} ${last} Barbering` : null, Address: home?.Address ?? null, City: home?.City ?? null, Postcode: home?.Postcode ?? null,
      'Insurance Policy': b.renter ? `PL-${r.int(10000, 99999)}` : null, 'Insurance Expires': b.renter ? cal.day(Number.isFinite(b.to) ? b.to + r.int(20, 200) : r.int(20, 330)) : null,
      'Receipt Note': b.renter
        ? `This cut was by ${first} ${last}, a self-employed barber who rents ${chairs[b.chair].name} here and takes this payment. ${first} is not registered for VAT, so no VAT is charged.`
        : `Your barber today was ${first}. VAT is included in our prices.`,
    });
    b.owed = [];
    b.free = new Map(); // the prices of free loyalty cuts given on a rented chair, by day: the shop credits them against rent
  }
  const [, , , , , leaver, newcomer] = TEAM;

  // The price list.
  const services = new Map();
  for (const [name, minutes, price, stamp] of MENU) services.set(name, { name, minutes, price, stamp, id: add('Services', { Name: name, Minutes: minutes, Price: price, 'Tax Rate': 0.2, Stamp: stamp }) });
  const S = (name) => services.get(name);

  // The shelf, and its opening stock.
  const supplier = companies(r, 1, ['Barber Supplies', 'Grooming Wholesale', 'Trade Supplies'])[0];
  const products = SHELF.map(([name, size, cost, price, level, qty, demand]) => {
    const p = { name, size, cost, price, level, qty, demand, stock: 0, pending: false };
    p.id = add('Products', { Name: name, Size: size, Supplier: supplier, 'Cost Price': cost, 'Sale Price': price, 'Tax Rate': 0.2, 'In Stock': 0, 'Reorder Level': level, 'Reorder Quantity': qty });
    return p;
  });
  const giftSet = products[products.length - 1];
  // Two lines the supplier has been out of for the last seven weeks, so they run down.
  const backOrdered = new Set([products[0], products[4]]);
  let supplierInvoice = r.int(40000, 60000);
  const deliver = (lines, d) => {
    const no = `SI-${supplierInvoice += r.int(5, 60)}`;
    for (const { p, n } of lines) { add('Stock Deliveries', { Product: p.id, Received: cal.day(d), Quantity: n, 'Unit Cost': p.cost, 'Invoice Number': no }); p.stock += n; p.pending = false; }
  };
  deliver(products.map((p) => ({ p, n: p.level + p.qty })), -days - 2);

  // Loyalty cards, numbered as they are started.
  let cardNo = 0;
  const cards = [];

  // Clients: the regulars when the records begin, and more who give their details as the year goes on.
  const clients = [];
  const makeClient = (since, initial) => {
    const female = r.chance(0.08);
    const first = female ? r.pick(FIRST.filter((n) => !MEN.has(n))) : r.pick(MALE);
    const last = r.pick(LAST);
    const cut = r.weighted(CUTS);
    const mode = r.chance(0.38) ? 'book' : 'walk';
    // A barber who is in the shop when they start coming in the records.
    const when = Math.max(since, -days);
    const active = TEAM.filter((b) => b.since <= when && when < b.to);
    const c = {
      first, cut, mode, beard: cut === 'Cut and beard' ? 0 : r.chance(0.25) ? 0.5 : 0.06, cadence: cut === 'Skin fade' ? [14, 28] : cut.startsWith('Kids') ? [35, 56] : [21, 42],
      pref: mode === 'book' || r.chance(0.45) ? r.weighted(active.map((b) => [b, b.pull])) : null, next: 0, lapsed: false, card: null, unreliable: r.chance(0.05),
    };
    c.id = add('Clients', {
      'First Name': first, 'Last Name': last, Phone: r.chance(0.9) ? phone() : null, 'E-mail': r.chance(0.5) ? mailFor(first, last) : null, Joined: cal.day(since),
      'Usual Cut': r.pick(USUAL[cut]), 'Marketing Consent': r.chance(0.55), Notes: r.chance(0.04) ? r.pick(['Sensitive scalp', 'Prefers a quiet chair', 'Nervous of clippers near the ears', 'Always in a hurry at lunchtime']) : null,
    });
    if (initial) c.next = -days + r.int(0, c.cadence[1]);
    clients.push(c);
    // Most regulars already carry a card, part stamped before the records begin.
    if (initial && r.chance(0.8)) {
      c.card = { number: `LC-${pad(++cardNo, 5)}`, stamps: r.int(0, 8), status: 'Open', started: -days - r.int(5, 240) };
      c.card.id = add('Loyalty Cards', { Number: c.card.number, Client: c.id, Started: cal.day(c.card.started), Stamps: c.card.stamps, Status: 'Open' });
      cards.push(c.card);
    }
    return c;
  };
  for (let i = 0; i < 620; i++) makeClient(-days - r.int(10, 1500), true);

  // Receipts numbered by the year of the till, RCP-2026-00042.
  const receiptCount = {};

  /** The earliest start for `minutes` at or after `t` in a barber's day of busy intervals, or Infinity. */
  const earliest = (busy, t, minutes, close) => {
    let s = t;
    for (const [a, b] of busy) { if (s + minutes <= a) break; if (b > s) s = b; }
    return s + minutes <= close ? s : Infinity;
  };
  const occupy = (busy, a, b) => { busy.push([a, b]); busy.sort((x, y) => x[0] - y[0]); };

  for (let d = -days; d <= ahead; d++) {
    const at = cal.at(d);
    const wd = at.getDay();
    const month = at.getMonth();
    const date = cal.day(d);
    const closed = (month === 11 && (at.getDate() === 25 || at.getDate() === 26)) || (month === 0 && at.getDate() === 1);

    // The day the renter leaves: most of their regulars stay with the shop and go to whoever is free.
    if (d === leaver.to) for (const c of clients) if (c.pref === leaver) { if (r.chance(0.3)) c.lapsed = true; else c.pref = r.chance(0.5) ? newcomer : null; }
    // Once a week, anyone ten weeks overdue has gone elsewhere.
    if (wd === 1) for (const c of clients) if (!c.lapsed && d - c.next > 70) c.lapsed = true;

    // Stock, in the past only: Monday's order arrives on Wednesday.
    if (d <= 0 && !closed) {
      const due = products.filter((p) => p.pending && p.arrives <= d);
      if (due.length) deliver(due.map((p) => ({ p, n: p.qty })), d);
      if (wd === 1) {
        for (const p of products) {
          if (p.pending || p.stock > p.level || (backOrdered.has(p) && d > -50) || (p === giftSet && month < 9)) continue;
          p.pending = true;
          p.arrives = d + 2;
        }
      }
    }
    if (closed) continue;

    const [open, close] = OPEN[wd];
    const working = TEAM.filter((b) => b.days.includes(wd) && d >= b.from && d < b.to && !b.off.has(d));
    if (!working.length) continue;
    const season = month === 11 ? 1.25 : month === 0 ? 0.8 : month === 1 ? 0.9 : month === 7 ? 1.05 : 1;
    const perBarber = wd === 6 ? 12 : wd === 0 ? 6 : 7;
    const target = working.reduce((n, b) => n + perBarber * b.pull * season, 0);
    // Each barber's column for the day, with half an hour for lunch on all but a Sunday.
    const busy = new Map(working.map((b) => [b, wd === 0 ? [] : [[r.pick([750, 780, 810, 840]), 0]]]));
    for (const list of busy.values()) for (const x of list) x[1] = x[0] + 30;
    const visits = [];
    const now = d === 0 ? cal.hour * 60 : d < 0 ? Infinity : -Infinity;

    // Regulars due by today: bookers with their own barber, walkers to whoever is free.
    const bookedSoFar = d > 0 ? Math.exp(-d / 5) : 1;
    let regulars = 0;
    for (const c of clients) {
      if (c.lapsed || c.next > d || regulars >= target * 0.7) continue;
      if (!r.chance(0.55)) continue;
      const pref = c.pref && working.includes(c.pref) ? c.pref : null;
      if (c.mode === 'book' && c.pref && !pref) continue; // their barber is off today: they come another day
      if (d > 0 && (c.mode !== 'book' || !r.chance(bookedSoFar))) continue;
      const done = [S(c.cut)];
      if (c.beard && r.chance(c.beard)) done.push(S('Beard trim'));
      if (r.chance(0.02)) done.push(S(r.pick(['Hot towel shave', 'Hair design', 'Line-up'])));
      const minutes = done.reduce((n, x) => n + x.minutes, 0);
      if (c.mode === 'book') {
        // A slot on the barber's column, at the time they asked for or the nearest free one.
        const barber = pref || r.pick(working);
        let slot = Infinity;
        for (let k = 0; k < 6 && slot === Infinity; k++) {
          const hour = r.weighted(ARRIVALS[wd === 6 ? 'sat' : wd === 0 ? 'sun' : 'week']);
          const t = Math.max(open, hour * 60 + r.pick([0, 15, 30, 45]));
          const s = earliest(busy.get(barber), t, minutes, close);
          if (s - t <= 30) slot = s;
        }
        if (slot === Infinity) continue;
        occupy(busy.get(barber), slot, slot + minutes);
        visits.push({ c, barber, kind: 'Booked', booked: slot, bookedOn: Math.min(0, d - r.weighted([[0, 1], [1, 3], [r.int(2, 6), 4], [r.int(7, 20), 2]])), done, minutes });
      } else {
        const hour = r.weighted(ARRIVALS[wd === 6 ? 'sat' : wd === 0 ? 'sun' : 'week']);
        visits.push({ c, pref, kind: 'Walk-in', arrived: Math.max(open, Math.min(close - 40, hour * 60 + r.int(0, 59))), done, minutes });
      }
      regulars++;
      c.next = d + r.int(1, 4); // not again for a few days, whatever happens today
    }
    // Walk-ins off the street, a few of whom give their details and come back.
    if (d <= 0) {
      const strangers = Math.max(0, Math.round(target - regulars + r.int(-2, 2)));
      for (let k = 0; k < strangers; k++) {
        const hour = r.weighted(ARRIVALS[wd === 6 ? 'sat' : wd === 0 ? 'sun' : 'week']);
        const arrived = Math.max(open, Math.min(close - 40, hour * 60 + r.int(0, 59)));
        const cut = r.weighted(CUTS);
        const done = [S(cut)];
        if (cut !== 'Cut and beard' && r.chance(0.12)) done.push(S('Beard trim'));
        const c = r.chance(0.12) ? makeClient(d, false) : null;
        if (c) { c.cut = cut; done[0] = S(cut); }
        visits.push({ c, name: c ? c.first : r.pick(r.chance(0.9) ? MALE : FIRST), kind: 'Walk-in', arrived, done, minutes: done.reduce((n, x) => n + x.minutes, 0), stranger: true });
      }
    }

    // Bookings first: cancelled ones free their slot, the rest are kept or missed.
    for (const v of visits.filter((x) => x.kind === 'Booked')) {
      v.arrived = Math.max(open, v.booked - (r.chance(0.7) ? r.int(0, 10) : 0));
      if (d < 0 && r.chance(0.035)) { v.status = 'Cancelled'; continue; }
      if (v.booked >= now) { v.status = 'Booked'; continue; }
      if (r.chance(v.c.unreliable ? 0.15 : 0.025)) { v.status = 'No-show'; continue; }
      v.start = v.booked;
    }
    // Walk-ins in the order they came: the first free chair, or their own barber; they go if the wait is too long.
    for (const v of visits.filter((x) => x.kind === 'Walk-in').sort((a, b) => a.arrived - b.arrived)) {
      if (v.arrived >= now) { v.skip = true; continue; }
      const patience = r.int(20, 60);
      const options = (v.pref ? [v.pref] : working).map((b) => [b, earliest(busy.get(b), v.arrived, v.minutes, close)]);
      let [barber, s] = options.reduce((best, x) => (x[1] < best[1] ? x : best), [null, Infinity]);
      // Waiting for their own barber, some take the next free chair instead.
      if (v.pref && s - v.arrived > patience && r.chance(0.5)) [barber, s] = working.map((b) => [b, earliest(busy.get(b), v.arrived, v.minutes, close)]).reduce((best, x) => (x[1] < best[1] ? x : best), [null, Infinity]);
      // Too near closing for any chair to finish them: turned away at the door, not put on the board.
      if (s === Infinity && v.arrived > close - 75) { v.skip = true; continue; }
      if (s === Infinity || s - v.arrived > patience) { v.status = 'Walked out'; v.barber = barber || v.pref || working[0]; continue; }
      v.barber = barber;
      v.start = s;
      occupy(busy.get(barber), s, s + v.minutes);
    }
    for (const v of visits) {
      if (v.skip || v.status) continue;
      v.finish = v.start + v.minutes;
      v.status = v.finish <= now ? 'Done' : v.start <= now ? 'In chair' : 'Waiting';
    }

    // Paid visits in the order they left: receipts, loyalty stamps, and a product now and then.
    const paid = visits.filter((v) => v.status === 'Done').sort((a, b) => a.finish - b.finish);
    for (const v of paid) {
      const y = date.slice(0, 4);
      receiptCount[y] = (receiptCount[y] || 0) + 1;
      v.receipt = `RCP-${y}-${pad(receiptCount[y], 5)}`;
      const rate = v.barber.renter ? 0 : 0.2;
      v.lines = v.done.map((x) => ({ Service: x.id, Item: x.name, Quantity: 1, 'Unit Price': x.price, 'Tax Rate': rate }));
      const c = v.c;
      if (c && v.done[0].stamp) {
        if (c.card && c.card.stamps === 9) {
          // The tenth cut, free.
          v.free = true;
          v.card = c.card;
          v.lines[0] = { ...v.lines[0], Item: `${v.done[0].name} (tenth cut free)`, 'Unit Price': 0 };
          c.card.status = 'Used';
          c.card.freeOn = d;
          if (v.barber.renter) v.barber.free.set(d, [...(v.barber.free.get(d) || []), v.done[0].price]);
          c.card = null;
        } else {
          if (!c.card) {
            c.card = { number: `LC-${pad(++cardNo, 5)}`, stamps: 0, status: 'Open', started: d };
            c.card.id = add('Loyalty Cards', { Number: c.card.number, Client: c.id, Started: cal.day(d), Stamps: 0, Status: 'Open' });
            cards.push(c.card);
          }
          c.card.stamps++;
          v.card = c.card;
          if (c.card.stamps === 9) { c.card.status = 'Due a free cut'; c.card.fullOn = d; }
        }
      }
      if (!v.barber.renter && r.chance(month === 11 ? 0.14 : 0.1)) {
        const pool = products.filter((p) => p.stock > 0 && (p !== giftSet || month >= 10));
        if (pool.length) {
          const p = r.weighted(pool.map((x) => [x, x.demand + (x === giftSet && month === 11 ? 4 : 0)]));
          const q = Math.min(p.stock, r.chance(0.1) ? 2 : 1);
          p.stock -= q;
          v.lines.push({ Product: p.id, Item: `${p.name}, ${p.size}`, Quantity: q, 'Unit Price': p.price, 'Tax Rate': 0.2 });
        }
      }
      // The VAT within each line rounded to the penny, then added up, as the receipt prints it.
      let total = 0;
      let vat = 0;
      for (const l of v.lines) { const amount = money(l.Quantity * l['Unit Price']); total += amount; vat += money(amount - amount / (1 + l['Tax Rate'])); }
      v.total = money(total);
      v.vat = money(vat);
      v.paidBy = v.total === 0 ? 'Loyalty card' : r.weighted([['Card', 7.5], ['Cash', 2.5]]);
      if (c && r.chance(c.unreliable ? 0.06 : 0.025)) c.lapsed = true;
    }

    // On the board in the order they came or are booked.
    visits.sort((a, b) => (a.arrived ?? a.booked) - (b.arrived ?? b.booked));
    for (const v of visits) {
      if (v.skip) continue;
      const c = v.c;
      if (c) c.next = v.status === 'Cancelled' ? d + r.int(3, 10) : v.status === 'Walked out' ? d + r.int(1, 7) : d + r.int(c.cadence[0], c.cadence[1]);
      const t = (m) => (m === undefined ? null : cal.time(d, ...hhmm(m)));
      const barber = v.barber;
      const id = add('Visits', {
        'Receipt No': v.receipt || null, Client: c ? c.id : null, Name: c ? c.first : v.name, Barber: barber.id, Kind: v.kind,
        'Booked On': v.kind === 'Booked' ? cal.day(v.bookedOn) : null, 'Booked For': v.kind === 'Booked' ? t(v.booked) : null,
        Arrived: ['Cancelled', 'No-show'].includes(v.status) || v.status === 'Booked' ? t(v.booked) : t(v.arrived),
        Started: t(v.start), Finished: t(v.finish), Status: v.status, 'Free Cut': Boolean(v.free), Card: v.card ? v.card.id : null,
        Net: v.lines ? money(v.total - v.vat) : null, VAT: v.lines ? v.vat : null, Total: v.lines ? v.total : null, 'Paid By': v.paidBy || null,
      });
      // What was done and sold; a booking still to come lists what is booked, at the price it will be.
      const lines = v.lines || (['Booked', 'Waiting', 'In chair'].includes(v.status) ? v.done.map((x) => ({ Service: x.id, Item: x.name, Quantity: 1, 'Unit Price': x.price, 'Tax Rate': barber.renter ? 0 : 0.2 })) : []);
      for (const l of lines) add('Visit Lines', { Visit: id, ...l });
    }
  }

  // The cards as they stand.
  for (const k of cards) base.update('Loyalty Cards', k.id, { Stamps: k.stamps, Status: k.status, 'Full On': k.fullOn === undefined ? null : cal.day(k.fullOn), 'Free Cut On': k.freeOn === undefined ? null : cal.day(k.freeOn) });

  // The chair rental agreements, and a rent invoice for each week of each, sent on the Friday before.
  const charges = [];
  const INCLUDED = 'Use of the chair, station, mirror and drawer, and of the shared basin and the sterilising cabinet; towels and gowns, laundered by the Shop; electricity, water and heating; the shop\'s phone line, booking diary and queue board; Wi-Fi; a place on the price board and in the window; and the shop\'s loyalty card scheme.';
  const HOURS = 'Monday to Friday 9am to 7pm, Thursday until 8pm, Saturday 8am to 6pm, Sunday 10am to 4pm';
  const renters = TEAM.filter((b) => b.renter);
  const rentalCount = {};
  for (const b of renters) {
    const signed = b.since - r.int(7, 20);
    const sy = cal.at(signed).getFullYear();
    rentalCount[sy] = (rentalCount[sy] || 0) + 1;
    const ended = Number.isFinite(b.to);
    b.rental = add('Chair Rentals', {
      Number: `CRA-${sy}-${pad(rentalCount[sy], 4)}`, Barber: b.id, Chair: chairs[b.chair].id, 'Signed On': cal.day(signed), 'Start Date': cal.day(b.since),
      'End Date': ended ? cal.day(b.to - 1) : null, 'Weekly Rent': b.rent, 'Rent Day': 'Monday', Deposit: b.rent, 'Notice Weeks': 4, Hours: HOURS, Included: INCLUDED,
      'Insurance Cover': 2000000, Status: ended ? 'Ended' : 'Active',
    });
    // Each Monday of the rental within the records, and the coming one once its invoice has gone out.
    for (let m = -days; m <= 7; m++) {
      if (cal.weekday(m) !== 1 || m < b.since || m >= b.to || m - 3 > 0) continue;
      charges.push({ b, m });
    }
  }
  charges.sort((a, b) => a.m - b.m || a.b.id - b.b.id);
  const rentCount = {};
  let arrears = false;
  for (const { b, m } of charges) {
    const y = cal.at(m - 3).getFullYear();
    rentCount[y] = (rentCount[y] || 0) + 1;
    const lines = [{ Description: `Rent of ${chairs[b.chair].name}, week starting ${ukDate(m)}`, Quantity: 1, 'Unit Price': b.rent, 'Tax Rate': 0.2 }];
    // Free loyalty cuts the renter gave last week, credited at the menu price: five a week at most, the rest the week after.
    for (let k = m - 7; k < m; k++) if (b.free.has(k)) b.owed.push(...b.free.get(k));
    const given = b.owed.splice(0, 5);
    if (given.length) {
      // Each cut's credit before VAT, as the shop's menu price has VAT in it.
      const each = money(given.reduce((n, x) => n + x, 0) / given.length / 1.2);
      lines.push({ Description: `Loyalty card free cuts given for the shop, week starting ${ukDate(m - 7)}`, Quantity: given.length, 'Unit Price': -each, 'Tax Rate': 0.2 });
    }
    let net = 0;
    let vat = 0;
    for (const l of lines) { const amount = money(l.Quantity * l['Unit Price']); net += amount; vat += money(amount * l['Tax Rate']); }
    // The first renter pays by transfer on the day; the others in cash later in the week, one week left owing for a while.
    let paidAt = b === renters[0] ? m : m + (r.chance(0.75) ? 3 : r.int(4, 10));
    if (b === newcomer && !arrears && m >= -45 && m <= -21) { arrears = true; paidAt = Infinity; }
    const id = add('Rent Charges', {
      Number: `RENT-${y}-${pad(rentCount[y], 4)}`, Rental: b.rental, 'Invoice Date': cal.day(m - 3), 'Week Starting': cal.day(m), 'Due On': cal.day(m),
      Net: money(net), VAT: money(vat), Total: money(net + vat), 'Paid On': paidAt <= 0 ? cal.day(paidAt) : null, 'Paid By': paidAt <= 0 ? (b === renters[0] ? 'Bank transfer' : 'Cash') : null,
    });
    lines.forEach((l, k) => add('Rent Lines', { Charge: id, Line: k + 1, ...l }));
  }

  for (const p of products) base.update('Products', p.id, { 'In Stock': p.stock });
  return counts;
}
