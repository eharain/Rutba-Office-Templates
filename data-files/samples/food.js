// Food and beverages: Bramblegate Wine and Deli, an invented independent
// food and drink shop. Wines, beers, ciders, spirits and soft drinks, a deli
// counter of cheese, cured meats and salads, fresh bread and fine foods.
// Much of what it sells has a use-by or best-before date, so its heart is
// stock that expires: every delivery comes in as batches with their dates,
// the till sells the batch with the earliest date first, a date check each
// morning marks down what is near its date (the yellow-sticker price) and
// takes off sale what has passed it, and each write-off is costed. Alcohol
// is sold under a premises licence: anyone who looks under 25 is asked for
// ID, and every refusal goes in a register kept month by month.
//
// Its records are a year of trading a day at a time: busier on Friday and
// Saturday evenings and in December, rose and cider in summer, orders to
// each supplier timed for its delivery days, and the waste that comes from
// selling fresh food. Prices on the shelf include VAT: deli, bakery and
// fine foods are zero-rated, while drinks, sweets and crisps carry the
// standard rate.

import { address, BUSINESS_ABOUT, BUSINESS_TABLE, businessRecord, companies, person, phoneFor, PLACES } from './util.js';

// These print templates need Data Files 2.16: an older Office is told to update.
export const minOffice = '2.16.0';

const ref = (table) => ({ type: 'integer', points: table });
const LINE = 'Round([Quantity] * [Unit Price] * (1 - Nz([Discount])), 2)';
// The VAT inside a price that includes it, as the till works it out for each line.
const LINE_VAT = `Round(${LINE} - ${LINE} / (1 + [Sale Lines].[Tax Rate]), 2)`;
const SAVED = `Round(Round([Quantity] * [Full Price], 2) - ${LINE}, 2)`;
const DAYS_AGO = 'DateDiff("d", Format([When], "yyyy-mm-dd"), Date())';
// The shop's own details at the head of what it prints.
const LETTERHEAD = { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'Tax Number'] };

export const spec = {
  tables: [
    BUSINESS_TABLE,
    { name: 'Suppliers', fields: [
      { name: 'Name', type: 'text', required: true }, { name: 'Contact', type: 'text' }, { name: 'Address', type: 'text' },
      { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' }, { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' },
      { name: 'Account Number', type: 'text' }, { name: 'Delivers On', type: 'text' }, { name: 'Lead Days', type: 'integer', default: 2 },
    ] },
    { name: 'Staff', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Role', type: 'text' },
      { name: 'Phone', type: 'text' }, { name: 'Started', type: 'date' }, { name: 'Personal Licence', type: 'yesno' },
      { name: 'Age Check Training', type: 'date' },
    ] },
    { name: 'Categories', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'VAT Code', type: 'text', default: 'Z' }, { name: 'Tax Rate', type: 'number', default: 0 },
      { name: 'Age Restricted', type: 'yesno' }, { name: 'Case Quantity', type: 'integer', default: 0 }, { name: 'Case Discount', type: 'number', default: 0 },
    ] },
    { name: 'Products', fields: [
      { name: 'Code', type: 'text', unique: true }, { name: 'Name', type: 'text', required: true }, { name: 'Category', ...ref('Categories') },
      { name: 'Supplier', ...ref('Suppliers') }, { name: 'Unit', type: 'text' }, { name: 'Date Kind', type: 'text', default: 'Best before' },
      { name: 'Shelf Life', type: 'integer' }, { name: 'Cost Price', type: 'currency' }, { name: 'Sale Price', type: 'currency' },
      { name: 'In Stock', type: 'integer', default: 0 }, { name: 'Reorder Level', type: 'integer', default: 6 }, { name: 'Pack Size', type: 'integer', default: 1 },
      { name: 'Active', type: 'yesno', default: true },
    ] },
    { name: 'Purchase Orders', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Supplier', ...ref('Suppliers'), required: true }, { name: 'Staff', ...ref('Staff') },
      { name: 'Ordered On', type: 'date' }, { name: 'Expected', type: 'date' }, { name: 'Received On', type: 'date' },
      { name: 'Status', type: 'text', default: 'Submitted' }, { name: 'Supplier Invoice', type: 'text' }, { name: 'Paid', type: 'yesno' },
    ] },
    { name: 'Purchase Lines', fields: [
      { name: 'Purchase Order', ...ref('Purchase Orders'), required: true }, { name: 'Product', ...ref('Products'), required: true },
      { name: 'Quantity', type: 'integer' }, { name: 'Unit Cost', type: 'currency' },
    ] },
    { name: 'Batches', fields: [
      { name: 'Product', ...ref('Products'), required: true }, { name: 'Purchase Order', ...ref('Purchase Orders') }, { name: 'Batch Code', type: 'text' },
      { name: 'Received', type: 'date' }, { name: 'Expiry Date', type: 'date' }, { name: 'Quantity', type: 'integer' },
      { name: 'Unit Cost', type: 'currency' }, { name: 'Remaining', type: 'integer' }, { name: 'Marked Down To', type: 'currency' },
    ] },
    { name: 'Sales', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'When', type: 'datetime' }, { name: 'Staff', ...ref('Staff') },
      { name: 'Payment', type: 'text', default: 'Card' }, { name: 'Total', type: 'currency' }, { name: 'VAT', type: 'currency' },
      { name: 'Standard Rated', type: 'currency' }, { name: 'Saved', type: 'currency', default: 0 },
      { name: 'Tendered', type: 'currency' }, { name: 'Change', type: 'currency' },
      { name: 'Age Check', type: 'text', default: 'Not needed' }, { name: 'ID Seen', type: 'text' },
    ] },
    { name: 'Sale Lines', fields: [
      { name: 'Sale', ...ref('Sales'), required: true }, { name: 'Product', ...ref('Products'), required: true }, { name: 'Batch', ...ref('Batches') },
      { name: 'Quantity', type: 'integer', default: 1 }, { name: 'Full Price', type: 'currency' }, { name: 'Unit Price', type: 'currency' },
      { name: 'Discount', type: 'number', default: 0 }, { name: 'Tax Rate', type: 'number', default: 0 }, { name: 'Unit Cost', type: 'currency' },
    ] },
    { name: 'Date Checks', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Date', type: 'date' }, { name: 'Staff', ...ref('Staff') },
      { name: 'Fridge Temperatures', type: 'text' },
    ] },
    { name: 'Markdowns', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Check', ...ref('Date Checks') }, { name: 'Batch', ...ref('Batches'), required: true },
      { name: 'Date', type: 'date' }, { name: 'Was', type: 'currency' }, { name: 'Now', type: 'currency' },
      { name: 'Labels', type: 'integer' }, { name: 'Reason', type: 'text' },
    ] },
    { name: 'Write-offs', fields: [
      { name: 'Check', ...ref('Date Checks') }, { name: 'Batch', ...ref('Batches'), required: true }, { name: 'Date', type: 'date' },
      { name: 'Quantity', type: 'integer' }, { name: 'Reason', type: 'text' }, { name: 'Cost', type: 'currency' }, { name: 'Staff', ...ref('Staff') },
    ] },
    { name: 'Refusal Registers', fields: [
      { name: 'Month', type: 'text', required: true, unique: true },
      { name: 'Reviewed By', ...ref('Staff') }, { name: 'Reviewed On', type: 'date' },
    ] },
    { name: 'Refusals', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Register', ...ref('Refusal Registers') }, { name: 'When', type: 'datetime' },
      { name: 'Staff', ...ref('Staff') }, { name: 'Product', ...ref('Products') }, { name: 'Reason', type: 'text' },
      { name: 'Approx Age', type: 'integer' }, { name: 'ID Shown', type: 'text' }, { name: 'Description', type: 'text' },
    ] },
  ],
  queries: {
    'Expiring in the next 7 days': { tables: ['Batches', 'Products', 'Categories'], columns: [
      { table: 'Categories', field: 'Name', as: 'Category', sort: 'asc' }, { table: 'Batches', field: 'Expiry Date', sort: 'asc' },
      { table: 'Products', field: 'Name', as: 'Product' }, { table: 'Batches', field: 'Batch Code' }, { table: 'Products', field: 'Date Kind' },
      { expr: 'DateDiff("d", Date(), [Expiry Date])', as: 'Days Left', criteria: ['Between 0 And 7'] },
      { table: 'Batches', field: 'Remaining', criteria: ['> 0'] }, { table: 'Products', field: 'Sale Price' }, { table: 'Batches', field: 'Marked Down To' },
    ] },
    'Marked down, last 30 days': { tables: ['Markdowns', 'Batches', 'Products'], columns: [
      { table: 'Markdowns', field: 'Date', sort: 'desc' }, { table: 'Markdowns', field: 'Number', sort: 'desc' }, { table: 'Products', field: 'Name', as: 'Product' },
      { table: 'Batches', field: 'Batch Code' }, { table: 'Batches', field: 'Expiry Date' }, { table: 'Markdowns', field: 'Was' },
      { table: 'Markdowns', field: 'Now' }, { table: 'Markdowns', field: 'Labels' }, { table: 'Markdowns', field: 'Reason' },
      { expr: 'DateDiff("d", [Markdowns].[Date], Date())', as: 'Days Ago', criteria: ['Between 0 And 30'], show: false },
    ] },
    'Written off by month': { tables: ['Write-offs'], columns: [
      { expr: 'Format([Date], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Write-offs', field: 'Reason', total: 'group', sort: 'asc' },
      { table: 'Write-offs', field: 'Quantity', as: 'Units', total: 'sum' }, { table: 'Write-offs', field: 'Cost', as: 'Cost', total: 'sum' },
    ] },
    'Write-offs by product': { tables: ['Write-offs', 'Batches', 'Products', 'Categories'], columns: [
      { table: 'Categories', field: 'Name', as: 'Category', total: 'group' }, { table: 'Products', field: 'Name', as: 'Product', total: 'group' },
      { table: 'Write-offs', field: 'Quantity', as: 'Units', total: 'sum' }, { table: 'Write-offs', field: 'Cost', as: 'Cost', total: 'sum', sort: 'desc' },
      { expr: 'DateDiff("d", [Write-offs].[Date], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 90'] },
    ] },
    'Refusals, last 30 days': { tables: ['Refusals', 'Products', 'Staff'], columns: [
      { table: 'Refusals', field: 'When', sort: 'desc' }, { table: 'Refusals', field: 'Number' }, { table: 'Products', field: 'Name', as: 'Asked For' },
      { table: 'Refusals', field: 'Reason' }, { table: 'Refusals', field: 'Approx Age' }, { table: 'Refusals', field: 'ID Shown' },
      { expr: '[First Name] & " " & [Last Name]', as: 'Refused By' },
      { expr: DAYS_AGO, as: 'Days Ago', criteria: ['Between 0 And 30'], show: false },
    ] },
    'Age checks by month': { tables: ['Sales'], columns: [
      { expr: 'Format([When], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Sales', field: 'Age Check', total: 'group', sort: 'asc' },
      { table: 'Sales', field: 'ID', as: 'Sales', total: 'count' },
      { table: 'Sales', field: 'Age Check', as: 'Checked', total: 'where', criteria: ['<> "Not needed"'] },
    ] },
    'Best sellers': { tables: ['Sale Lines', 'Products', 'Sales'], columns: [
      { table: 'Products', field: 'Name', as: 'Product', total: 'group' }, { table: 'Sale Lines', field: 'Quantity', as: 'Sold', total: 'sum', sort: 'desc' },
      { expr: LINE, as: 'Takings', total: 'sum' }, { expr: DAYS_AGO, as: 'Days Ago', total: 'where', criteria: ['Between 0 And 30'] },
    ] },
    // Margin is worked out on the price without its VAT, against what each batch actually cost.
    'Margin by category': { tables: ['Sale Lines', 'Products', 'Categories'], columns: [
      { table: 'Categories', field: 'Name', as: 'Category', total: 'group' }, { expr: LINE, as: 'Takings', total: 'sum' },
      { expr: LINE_VAT, as: 'VAT', total: 'sum' }, { expr: 'Round([Quantity] * [Sale Lines].[Unit Cost], 2)', as: 'Cost', total: 'sum' },
      { expr: `Round(${LINE} - ${LINE_VAT} - [Quantity] * [Sale Lines].[Unit Cost], 2)`, as: 'Margin', total: 'sum', sort: 'desc' },
    ] },
    'Stock to reorder': { tables: ['Products', 'Suppliers'], columns: [
      { table: 'Suppliers', field: 'Name', as: 'Supplier', sort: 'asc' }, { table: 'Products', field: 'Code', sort: 'asc' }, { table: 'Products', field: 'Name', as: 'Product' },
      { table: 'Products', field: 'In Stock' }, { table: 'Products', field: 'Reorder Level' }, { table: 'Products', field: 'Pack Size' },
      { expr: '[In Stock] - [Reorder Level]', as: 'Spare', criteria: ['<= 0'], show: false }, { table: 'Products', field: 'Active', criteria: ['Yes'], show: false },
    ] },
    'Stock by batch': { tables: ['Batches', 'Products', 'Categories'], columns: [
      { table: 'Categories', field: 'Name', as: 'Category', sort: 'asc' }, { table: 'Products', field: 'Name', as: 'Product', sort: 'asc' },
      { table: 'Batches', field: 'Batch Code' }, { table: 'Batches', field: 'Received' }, { table: 'Batches', field: 'Expiry Date', sort: 'asc' },
      { table: 'Batches', field: 'Remaining', criteria: ['> 0'] }, { expr: 'Round([Remaining] * [Batches].[Unit Cost], 2)', as: 'Value at Cost' },
    ] },
    'Daily takings': { tables: ['Sales'], columns: [
      { expr: 'Format([When], "yyyy-mm-dd")', as: 'Day', total: 'group', sort: 'desc' }, { table: 'Sales', field: 'ID', as: 'Sales', total: 'count' },
      { table: 'Sales', field: 'Total', as: 'Takings', total: 'sum' }, { expr: DAYS_AGO, as: 'Days Ago', total: 'where', criteria: ['Between 0 And 30'] },
    ] },
    'Monthly takings': { tables: ['Sales'], columns: [
      { expr: 'Format([When], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Sales', field: 'ID', as: 'Sales', total: 'count' },
      { table: 'Sales', field: 'Total', as: 'Takings', total: 'sum' },
    ] },
    'VAT on sales by month': { tables: ['Sales'], columns: [
      { expr: 'Format([When], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Sales', field: 'Total', as: 'Takings', total: 'sum' },
      { table: 'Sales', field: 'Standard Rated', as: 'At 20%', total: 'sum' }, { table: 'Sales', field: 'VAT', as: 'VAT', total: 'sum' },
      { expr: 'Round([Total] - [Standard Rated], 2)', as: 'At 0%', total: 'sum' },
    ] },
    'Deliveries to pay': { tables: ['Purchase Orders', 'Suppliers', 'Purchase Lines'], columns: [
      { table: 'Purchase Orders', field: 'Number', total: 'group' }, { table: 'Suppliers', field: 'Name', as: 'Supplier', total: 'group', sort: 'asc' },
      { table: 'Purchase Orders', field: 'Received On', total: 'group', sort: 'asc' }, { table: 'Purchase Orders', field: 'Supplier Invoice', total: 'group' },
      { expr: 'Round([Quantity] * [Unit Cost], 2)', as: 'Owed', total: 'sum' },
      { table: 'Purchase Orders', field: 'Status', total: 'where', criteria: ['Received'] }, { table: 'Purchase Orders', field: 'Paid', total: 'where', criteria: ['No'] },
    ] },
    'Purchase orders open': { tables: ['Purchase Orders', 'Suppliers'], columns: [
      { table: 'Purchase Orders', field: 'Number' }, { table: 'Suppliers', field: 'Name', as: 'Supplier' }, { table: 'Purchase Orders', field: 'Ordered On' },
      { table: 'Purchase Orders', field: 'Expected', sort: 'asc' }, { table: 'Purchase Orders', field: 'Status', criteria: ['Submitted'], show: false },
    ] },
    // The totals a receipt prints, worked out from its lines: what to type into a sale entered by hand.
    'Receipt totals': { tables: ['Sales', 'Sale Lines'], columns: [
      { table: 'Sales', field: 'Number', as: 'Receipt', total: 'group', sort: 'desc' }, { table: 'Sales', field: 'When', total: 'group' },
      { expr: LINE, as: 'Total', total: 'sum' }, { expr: LINE_VAT, as: 'VAT', total: 'sum' },
      { expr: `IIf([Sale Lines].[Tax Rate] > 0, ${LINE}, 0)`, as: 'Standard Rated', total: 'sum' },
      { expr: SAVED, as: 'Saved', total: 'sum' },
      { expr: DAYS_AGO, as: 'Days Ago', total: 'where', criteria: ['Between 0 And 1'] },
    ] },
  },
  reports: [
    { name: 'Date check list', title: 'Use first: dates in the next 7 days', query: 'Expiring in the next 7 days', group: 'Category', columns: ['Product', 'Batch Code', 'Date Kind', { field: 'Expiry Date', type: 'date' }, { field: 'Days Left', type: 'integer' }, { field: 'Remaining', type: 'integer' }, { field: 'Marked Down To', type: 'currency' }], totals: [{ field: 'Remaining', fn: 'sum' }] },
    { name: 'Write-offs by month', query: 'Written off by month', group: 'Month', columns: ['Reason', { field: 'Units', type: 'integer' }, { field: 'Cost', type: 'currency' }], totals: [{ field: 'Units', fn: 'sum' }, { field: 'Cost', fn: 'sum' }] },
    { name: 'Margin by category', query: 'Margin by category', columns: ['Category', { field: 'Takings', type: 'currency' }, { field: 'VAT', type: 'currency' }, { field: 'Cost', type: 'currency' }, { field: 'Margin', type: 'currency' }], totals: [{ field: 'Takings', fn: 'sum' }, { field: 'VAT', fn: 'sum' }, { field: 'Cost', fn: 'sum' }, { field: 'Margin', fn: 'sum' }] },
    { name: 'Stock to reorder', query: 'Stock to reorder', group: 'Supplier', columns: ['Code', 'Product', { field: 'In Stock', type: 'integer' }, { field: 'Reorder Level', type: 'integer' }, { field: 'Pack Size', type: 'integer' }] },
    { name: 'Takings by month', query: 'Monthly takings', columns: ['Month', { field: 'Sales', type: 'integer' }, { field: 'Takings', type: 'currency' }], totals: [{ field: 'Sales', fn: 'sum' }, { field: 'Takings', fn: 'sum' }] },
    { name: 'Stock by batch', query: 'Stock by batch', group: 'Category', columns: ['Product', 'Batch Code', { field: 'Expiry Date', type: 'date' }, { field: 'Remaining', type: 'integer' }, { field: 'Value at Cost', type: 'currency' }], totals: [{ field: 'Value at Cost', fn: 'sum' }] },
    { name: 'VAT on sales', title: 'VAT on sales, by month', query: 'VAT on sales by month', columns: ['Month', { field: 'Takings', type: 'currency' }, { field: 'At 20%', type: 'currency' }, { field: 'VAT', type: 'currency' }, { field: 'At 0%', type: 'currency' }], totals: [{ field: 'Takings', fn: 'sum' }, { field: 'VAT', fn: 'sum' }] },
  ],
  documents: [
    { name: 'Till receipt', table: 'Sales', paper: 'receipt-80', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'Receipt {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'When', label: 'Date and time', format: 'dd/mm/yyyy hh:nn' }, { field: 'Staff.First Name', label: 'Served by' },
        { field: 'Payment', label: 'Paid by' }, { field: 'Age Check', label: 'Age check', if: '[Age Check] <> "Not needed"' },
        { field: 'ID Seen', label: 'ID seen', if: '[ID Seen]' },
      ] },
      { type: 'lines', table: 'Sale Lines', link: 'Sale', columns: [
        { field: 'Product.Name', label: 'Item' }, { field: 'Quantity', label: 'Qty', type: 'integer' },
        { field: 'Unit Price', label: 'Price', type: 'currency' }, { expr: LINE, as: 'Amount', type: 'currency' },
        { field: 'Product.Category.VAT Code', label: 'VAT' },
      ] },
      { type: 'totals', rows: [
        { label: 'Total', expr: '[Total]', strong: true },
        { label: 'You saved', expr: '[Saved]', if: '[Saved] > 0' },
        { label: 'Cash tendered', expr: '[Tendered]', if: '[Payment] = "Cash"' }, { label: 'Change', expr: '[Change]', if: '[Payment] = "Cash"' },
        { label: 'S: sales at 20% VAT', expr: '[Standard Rated]', if: '[Standard Rated] > 0' }, { label: 'VAT at 20% included', expr: '[VAT]', if: '[VAT] > 0' },
        { label: 'Z: sales at 0% VAT', expr: 'Round([Total] - [Standard Rated], 2)', if: 'Round([Total] - [Standard Rated], 2) > 0' },
      ] },
      { type: 'text', text: 'Mixed cases: 10% off six or more bottles of wine, and 10% off twelve or more beers and ciders. Reduced items are sold as seen. VAT number {Business.Tax Number}.', small: true },
      { type: 'text', text: '{Business.Document Footer}', small: true },
    ] },
    // For the orders still to come: a received one prints when it is chosen on its form, to check an invoice against.
    { name: 'Purchase order', table: 'Purchase Orders', paper: 'a4', where: '[Status] = "Submitted"', letterhead: { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'E-mail', 'Tax Number'] }, blocks: [
      { type: 'heading', text: 'Purchase order {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Supplier.Name', label: 'To' }, { field: 'Number', label: 'Order number' },
        { field: 'Supplier.Contact', label: 'For the attention of' }, { field: 'Ordered On', label: 'Date', format: 'dd/mm/yyyy' },
        { field: 'Supplier.Address', label: 'Address' }, { field: 'Expected', label: 'Deliver on', format: 'dddd dd/mm/yyyy' },
        { field: 'Supplier.City', label: 'City' }, { field: 'Supplier.Account Number', label: 'Our account' },
        { field: 'Supplier.Postcode', label: 'Postcode' }, { field: 'Staff', label: 'Ordered by', type: 'text', if: '[Staff]' },
      ] },
      { type: 'lines', table: 'Purchase Lines', link: 'Purchase Order', columns: [
        { field: 'Product.Code', label: 'Code' }, { field: 'Product.Name', label: 'Product' }, { field: 'Product.Unit', label: 'Unit' },
        { field: 'Quantity', type: 'integer' }, { field: 'Unit Cost', type: 'currency' },
        { expr: 'Round([Quantity] * [Unit Cost], 2)', as: 'Line Total', label: 'Total', type: 'currency' },
      ] },
      { type: 'totals', rows: [{ label: 'Lines', expr: '[Purchase Lines count]', type: 'integer' }, { label: 'Units', expr: '[Quantity]', type: 'integer' }, { label: 'Total before VAT', expr: '[Line Total]', strong: true }] },
      { type: 'text', text: 'Please deliver on the day above to {Business.Name}, {Business.Address}, {Business.City} {Business.Postcode}, and quote {Number} on your delivery note and invoice.', small: true },
      { type: 'text', text: 'Every case and pack must carry its batch code and its use-by or best-before date. Chilled and deli lines must arrive with at least two thirds of their life left, or they will be refused at the door. All alcohol must be duty paid.', small: true },
    ] },
    { name: 'Markdown label sheet', table: 'Date Checks', paper: 'a4', letterhead: { table: 'Business', fields: ['Name'] }, blocks: [
      { type: 'heading', text: 'Date check {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Date', label: 'Date', format: 'dddd dd/mm/yyyy' }, { field: 'Staff', label: 'Checked by', type: 'text' }, { field: 'Fridge Temperatures', label: 'Fridges', if: '[Fridge Temperatures]' },
      ] },
      { type: 'text', text: 'Reduce to clear: print a label for each, stick it over the shelf price on the pack, and put the packs at the front.' },
      { type: 'lines', table: 'Markdowns', link: 'Check', columns: [
        { field: 'Number', label: 'Label' }, { field: 'Batch.Product.Name', label: 'Product' }, { field: 'Batch.Batch Code', label: 'Batch' },
        { field: 'Batch.Product.Date Kind', label: 'Date kind' }, { field: 'Batch.Expiry Date', label: 'Date', format: 'dd/mm/yyyy' },
        { field: 'Was', type: 'currency' }, { field: 'Now', type: 'currency' }, { field: 'Labels', type: 'integer' },
      ] },
      { type: 'text', text: 'Nothing to reduce today.', if: '[Markdowns count] = 0' },
      { type: 'text', text: 'Taken off sale: past their date, broken or damaged. Put them in the waste bin, not back on the shelf.' },
      { type: 'lines', table: 'Write-offs', link: 'Check', columns: [
        { field: 'Batch.Product.Name', label: 'Product' }, { field: 'Batch.Batch Code', label: 'Batch' }, { field: 'Batch.Expiry Date', label: 'Date', format: 'dd/mm/yyyy' },
        { field: 'Reason' }, { field: 'Quantity', label: 'Units', type: 'integer' }, { field: 'Cost', type: 'currency' },
      ] },
      { type: 'text', text: 'Nothing taken off sale today.', if: '[Write-offs count] = 0' },
      { type: 'totals', rows: [
        { label: 'Labels to print', expr: '[Labels]', type: 'integer', if: '[Markdowns count] > 0' },
        { label: 'Units taken off sale', expr: '[Quantity]', type: 'integer', if: '[Write-offs count] > 0' },
        { label: 'Cost written off', expr: '[Cost]', strong: true, if: '[Write-offs count] > 0' },
      ] },
      { type: 'signatures', labels: ['Checked by', 'Manager'] },
    ] },
    { name: 'Reduced label', table: 'Markdowns', paper: 'receipt-58', letterhead: { table: 'Business', fields: ['Name'] }, blocks: [
      { type: 'heading', text: 'REDUCED' },
      { type: 'fields', columns: 1, items: [
        { field: 'Batch.Product.Name', label: 'Product' }, { field: 'Batch.Product.Date Kind', label: 'Date kind' },
        { field: 'Batch.Expiry Date', label: 'Date', format: 'dd/mm/yyyy' }, { field: 'Batch.Batch Code', label: 'Batch' },
      ] },
      { type: 'totals', rows: [{ label: 'Was', expr: '[Was]' }, { label: 'Now', expr: '[Now]', strong: true }] },
      { type: 'fields', columns: 1, items: [{ field: 'Number', label: 'Label' }, { field: 'Date', label: 'Reduced on', format: 'dd/mm/yyyy' }] },
    ] },
    { name: 'Refusals register', table: 'Refusal Registers', paper: 'a4', letterhead: { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone'] }, blocks: [
      { type: 'heading', text: 'Refusals register {Month}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Month', label: 'Month' },
        { field: 'Reviewed By', label: 'Reviewed by', if: '[Reviewed On]' }, { field: 'Reviewed On', label: 'Reviewed on', format: 'dd/mm/yyyy', if: '[Reviewed On]' },
      ] },
      { type: 'text', text: 'The shop asks anyone who looks under 25 to show photo ID with a date of birth: a photo driving licence, a passport or a proof-of-age card. When none is shown, when the ID does not fit the person, when the drink seems to be bought for someone under 18, or when the customer is drunk, the sale is refused and written down here at the time.' },
      { type: 'lines', table: 'Refusals', link: 'Register', sort: 'When', columns: [
        { field: 'Number', label: 'No' }, { field: 'When', label: 'Date and time', format: 'dd/mm/yyyy hh:nn' }, { field: 'Product.Name', label: 'Asked for' },
        { field: 'Reason' }, { field: 'Approx Age', label: 'Age (about)', type: 'text' }, { field: 'ID Shown', label: 'ID shown' },
        { field: 'Description', label: 'What happened' }, { field: 'Staff', label: 'Refused by', type: 'text' },
      ] },
      { type: 'text', text: 'No sales were refused this month.', if: '[Refusals count] = 0' },
      { type: 'totals', rows: [{ label: 'Refusals this month', expr: '[Refusals count]', type: 'integer', strong: true }] },
      { type: 'text', text: 'Not reviewed yet: the personal licence holder reviews and signs the register once the month is over.', if: 'Nz([Reviewed On], "") = ""' },
      { type: 'text', text: 'Kept on the premises for the licensing authority, trading standards and the police to see on request.', small: true },
      { type: 'spacer', size: 24 },
      { type: 'signatures', labels: ['Reviewed by the personal licence holder', 'Date'] },
    ] },
  ],
};

export const about = {
  name: 'Bramblegate Wine and Deli',
  kind: 'Food and beverages',
  line: 'Batches with their dates, markdowns, write-offs, the till, age checks and refusals, suppliers and purchase orders for a food and drink shop.',
  summary: [
    'Bramblegate Wine and Deli is an invented independent food and drink shop. It sells wines, beers, ciders, spirits and soft drinks, has a deli counter of cheese, cured and cooked meats, olives and salads, takes fresh bread from a bakery every morning, and keeps a shelf of fine foods: oils, pasta, preserves, crackers, coffee and chocolate. It is open from nine to eight, Monday to Saturday, and from ten to four on Sunday, and holds a premises licence to sell alcohol.',
    'Much of what it sells has a date on it. Every delivery comes in as batches, each with its batch code and its use-by or best-before date, and the till takes each sale from the batch with the earliest date. Each morning a date check marks down what is close to its date, printing a reduced label for each pack, and takes off sale what has passed it, writing it off at what it cost. So the records show the waste that selling fresh food brings, by month and by product, and what each category earns once the markdowns are paid for.',
    'Anyone who looks under 25 is asked for ID before an alcohol sale; the till records the check on each sale, and each refusal goes into a register kept month by month and signed by the personal licence holder. Six or more bottles of wine, or twelve or more beers and ciders, earn ten percent off as a mixed case.',
    'The sample holds a year of trading, made up a day at a time: busier on Friday and Saturday evenings and in December, rose, beer and cider in summer, whisky, sparkling wine and chocolates at Christmas. Prices on the shelf include VAT; deli, bakery and fine foods are zero-rated, while drinks, crisps and sweets carry the standard rate.',
  ],
  suits: ['An off-licence or liquor store', 'A delicatessen', 'A farm shop', 'A health food shop', 'A cheese shop or butcher with a counter', 'A village shop selling fresh food'],
  tables: {
    Business: BUSINESS_ABOUT,
    Suppliers: { about: 'The merchants, brewers, bakers and wholesalers the shop buys from.', fields: {
      Name: 'The supplier\'s name.', Contact: 'The person you deal with there.', Address: 'The supplier\'s street address, printed on purchase orders.',
      City: 'The town or city.', Postcode: 'The postcode.', Phone: 'Their phone number.', 'E-mail': 'Where orders go.',
      'Account Number': 'The shop\'s account number with the supplier, quoted on every order.', 'Delivers On': 'The days the supplier delivers.',
      'Lead Days': 'How many days before a delivery the order must reach them: 1 means the day before.',
    } },
    Staff: { about: 'The people who work in the shop, on the till and on the deli counter.', fields: {
      'First Name': 'Their first name, printed on the receipts they ring up.', 'Last Name': 'Their family name.',
      Role: 'Owner, Deli Manager, Shop Assistant or Weekend Assistant.', Phone: 'A number to reach them.', Started: 'The day they started.',
      'Personal Licence': 'Ticked for someone who holds a personal licence to sell alcohol; the owner is the premises supervisor.',
      'Age Check Training': 'The day they were last trained to ask for ID and to refuse a sale. Train everyone at least once a year.',
    } },
    Categories: { about: 'The groups the shop sells in, with the VAT and age rules that go with each.', fields: {
      Name: 'The group, such as Wine or Deli Counter. Each name is used once.',
      'VAT Code': 'The letter printed on receipts: S for the standard rate, Z for zero-rated.',
      'Tax Rate': 'The VAT rate as a fraction: 0.2 for the standard rate, 0 for zero-rated food. The till copies it to each sale line.',
      'Age Restricted': 'Ticked for alcohol: the till asks for an age check when a sale has any of it.',
      'Case Quantity': 'How many units of this group in one sale make a mixed case: 6 for wine, 12 for beer and cider, 0 for none.',
      'Case Discount': 'The discount a mixed case earns, as a fraction: 0.1 is ten percent.',
    } },
    Products: { about: 'Everything the shop sells, one record for each line.', fields: {
      Code: 'The shop\'s own code for the line. Each code is used once.', Name: 'The product as it shows on the till, the receipt and the labels.',
      Category: 'The group it is sold in.', Supplier: 'Who you buy it from.', Unit: 'How it is sold, such as a 75 cl bottle or a 200 g pack.',
      'Date Kind': 'Use by for chilled food that must not be sold after its date, Best before for food that keeps, None for wine and spirits.',
      'Shelf Life': 'About how many days a new delivery lasts before its date; empty for wine and spirits.',
      'Cost Price': 'What one costs you, before VAT.', 'Sale Price': 'The shelf price, VAT included.',
      'In Stock': 'How many are in the shop now: all its batches added up.', 'Reorder Level': 'When stock falls to this number or below, it shows in Stock to reorder.',
      'Pack Size': 'How many come in the supplier\'s case or pack; orders are in whole packs.', Active: 'Untick a line you no longer sell; old sales keep it.',
    } },
    'Purchase Orders': { about: 'The orders sent to suppliers, and the delivery that answers each.', fields: {
      Number: 'The order\'s number, given in date order and once only: PO-2026-0042, a new run each year.', Supplier: 'Who the order goes to.',
      Staff: 'Who placed it.', 'Ordered On': 'The day it was sent.', Expected: 'The delivery day it was ordered for.',
      'Received On': 'The day the goods came; empty until then.', Status: 'Submitted (not delivered yet) or Received.',
      'Supplier Invoice': 'The number on the supplier\'s invoice that came with the goods.', Paid: 'Ticked once that invoice is paid.',
    } },
    'Purchase Lines': { about: 'The products on each purchase order.', fields: {
      'Purchase Order': 'The order the line belongs to.', Product: 'What was ordered.', Quantity: 'How many units, in whole packs.', 'Unit Cost': 'What one unit costs, before VAT.',
    } },
    Batches: { about: 'Stock as it really sits on the shelf: each delivery of each product is a batch with its own code and date. Stock by batch is what tells you what to sell first.', fields: {
      Product: 'What the batch is.', 'Purchase Order': 'The order it came in on.', 'Batch Code': 'The lot code printed on the pack, for tracing a batch if a supplier recalls it.',
      Received: 'The day it came in.', 'Expiry Date': 'The use-by or best-before date on the packs; empty for wine and spirits.',
      Quantity: 'How many came in.', 'Unit Cost': 'What one cost on that delivery.', Remaining: 'How many are left: what came in, less what was sold and written off.',
      'Marked Down To': 'The reduced price on the batch\'s labels, once it has been marked down; empty while it sells at the shelf price.',
    } },
    Sales: { about: 'Each time the till is rung up: one record per receipt, with the totals the receipt prints.', fields: {
      Number: 'The receipt number, given in time order and once only: RCP-2026-01234, a new run each year.', When: 'The date and time of the sale.',
      Staff: 'Who was on the till.', Payment: 'Card, Cash or Mobile.', Total: 'What the customer paid, VAT included.',
      VAT: 'The VAT inside the total: each line\'s VAT rounded to the penny, then added up.',
      'Standard Rated': 'The part of the total, VAT included, at the standard rate. The rest is zero-rated.',
      Saved: 'What the customer saved on reduced items and mixed cases.', Tendered: 'For a cash sale, the cash handed over; empty for card and mobile.',
      Change: 'For a cash sale, the change given back.',
      'Age Check': 'For a sale with alcohol: Looked over 25 (no ID needed) or ID checked. Not needed for a sale with none.',
      'ID Seen': 'When ID was checked, what was shown: a driving licence, a passport or a proof-of-age card.',
    } },
    'Sale Lines': { about: 'The items on each receipt, each taken from one batch.', fields: {
      Sale: 'The receipt the line belongs to.', Product: 'What was sold.', Batch: 'The batch it came from: the one with the earliest date.',
      Quantity: 'How many.', 'Full Price': 'The shelf price at the time.', 'Unit Price': 'The price charged for one: the shelf price, or the reduced price of a marked-down batch.',
      Discount: 'The mixed-case discount as a fraction: 0.1 is ten percent off. Never on top of a reduced price.',
      'Tax Rate': 'The VAT rate of the line, copied from its category.', 'Unit Cost': 'What one cost, from its batch, for the margin.',
    } },
    'Date Checks': { about: 'The check made each morning before opening: what is near its date is marked down, what has passed it is taken off sale, and the fridges are read.', fields: {
      Number: 'The check\'s number, one a day: DC-2026-0042, a new run each year.', Date: 'The day of the check.', Staff: 'Who did it.',
      'Fridge Temperatures': 'What the chiller and the deli counter read, in degrees: both should be 5 or below.',
    } },
    Markdowns: { about: 'Each time a batch is reduced: the yellow-sticker price and the labels printed for it.', fields: {
      Number: 'The label\'s number, printed on it: MD-2026-00042, a new run each year.', Check: 'The date check it was made at.',
      Batch: 'The batch reduced.', Date: 'The day it was reduced.', Was: 'The price before.', Now: 'The reduced price.',
      Labels: 'How many labels to print: one for each pack left in the batch.',
      Reason: 'One day left, Last day (a use-by or bread date that is today) or Short date (food that keeps, within two weeks of its date).',
    } },
    'Write-offs': { about: 'Stock taken off sale and thrown away or returned, with what it cost.', fields: {
      Check: 'The date check that found it; empty for a breakage during the day.', Batch: 'The batch it came from.', Date: 'The day it was written off.',
      Quantity: 'How many units.', Reason: 'Out of date, Broken or Damaged.', Cost: 'What the units cost: the quantity at the batch\'s unit cost.',
      Staff: 'Who wrote it off.',
    } },
    'Refusal Registers': { about: 'The refusals register, one record a month, reviewed and signed by the personal licence holder when the month ends.', fields: {
      Month: 'The month the register covers, as 2026-10. Each month is used once.',
      'Reviewed By': 'Who reviewed it: a personal licence holder.', 'Reviewed On': 'The day it was reviewed; empty for the month still running.',
    } },
    Refusals: { about: 'Each sale of alcohol refused, written down at the time, as a licensed shop keeps them.', fields: {
      Number: 'The refusal\'s number: REF-2026-0042, a new run each year.', Register: 'The month\'s register it is written in.',
      When: 'The date and time.', Staff: 'Who refused the sale.', Product: 'What the customer tried to buy.',
      Reason: 'No ID shown, ID not acceptable, Under 18 on ID, Suspected proxy sale (buying for someone under age) or Customer drunk.',
      'Approx Age': 'How old the customer looked, in years.', 'ID Shown': 'What ID was offered, if any.',
      Description: 'What happened, in a few words, so the person could be recognised if they come back. No names.',
    } },
  },
  queries: {
    'Expiring in the next 7 days': 'Batches still on the shelf whose date is in the next week, by category and date, with how many days are left, what is left and any reduced price. This is the list for the morning date check.',
    'Marked down, last 30 days': 'Every markdown of the last month, the newest first, with the price before and after and how many labels were printed.',
    'Written off by month': 'Units and cost written off each month, by reason: out of date, broken or damaged.',
    'Write-offs by product': 'Which lines were written off most over the last 90 days, by cost: the ones to order less of.',
    'Refusals, last 30 days': 'The refusals of the last month, the newest first, with what was asked for, why and who refused.',
    'Age checks by month': 'How many alcohol sales each month were to customers who looked over 25 and how many had their ID checked.',
    'Best sellers': 'What sold most in the last 30 days, with what it took.',
    'Margin by category': 'For each category, the takings, the VAT within them, what the goods cost by batch and the margin left, the best earner first. Markdowns lower the margin; write-offs are counted in their own queries.',
    'Stock to reorder': 'Lines at or below their reorder level, by supplier, with the pack size they are ordered in.',
    'Stock by batch': 'Every batch with stock left, by category and product, earliest date first, with its value at cost.',
    'Daily takings': 'Sales and takings on each of the last 30 days, the newest first.',
    'Monthly takings': 'Sales and takings each month.',
    'VAT on sales by month': 'For each month, the takings, the part at 20%, the VAT within it and the part at 0%: the output VAT for the VAT return.',
    'Deliveries to pay': 'Deliveries in whose supplier invoice is not yet paid, by supplier, with what each comes to before VAT.',
    'Purchase orders open': 'Orders sent and not yet delivered, by the day they are expected.',
    'Receipt totals': 'Today\'s and yesterday\'s receipts with their total, VAT, standard-rated part and saving worked out from their lines. When you enter a sale by hand, read its figures here and type them into the sale.',
  },
  reports: {
    'Date check list': 'The batches with a date in the next seven days, on a page for each category, to walk the shelves with each morning.',
    'Write-offs by month': 'Each month\'s write-offs by reason, with the units and their cost, and the totals.',
    'Margin by category': 'Takings, VAT, cost and margin by category, with totals.',
    'Stock to reorder': 'What is low, on a page for each supplier.',
    'Takings by month': 'Sales and takings month by month, with the totals.',
    'Stock by batch': 'Every batch in stock by category, with its date and value at cost: the stock take sheet for a shop that sells by date.',
    'VAT on sales': 'The VAT on sales month by month, for the accountant or the VAT return.',
  },
  documents: {
    'Till receipt': 'The receipt on an 80 mm till roll: the shop\'s name, address and VAT number, the receipt number, time and who served, each item with its price and VAT code, the total, the VAT included by rate, and the returns policy. What was saved shows only when something was, the cash tendered and change only for cash, and the age check and the ID seen only for a sale with alcohol. Print it from the Sales form for the sale on screen.',
    'Purchase order': 'The order sent to a supplier: the shop\'s account with them, the delivery day, each product with its code, unit, quantity and cost, the number of lines, the total before VAT, and the shop\'s rules for dates and batch codes on what arrives. It is for the orders still to come, Status Submitted; a received order prints when you choose it on the Purchase Orders form.',
    'Markdown label sheet': 'The sheet from each morning\'s date check: what to reduce, with the label number, batch, date, the old and new price and how many labels to print, then what was taken off sale and what it cost, signed by whoever did the check. A day with nothing to reduce or nothing taken off says so, and leaves out the totals that do not apply. Print it from the Date Checks form for the day on screen.',
    'Reduced label': 'The yellow-sticker label for one markdown, on a 58 mm label roll: the product, its date and batch, the old price and the reduced price, and the label number and the day it was reduced. Print it from the Markdowns form, once for each pack.',
    'Refusals register': 'The month\'s refusals register, kept for the licensing authority: every refusal with its time, what was asked for, why, the ID shown and who refused, the number of refusals counted from them, and the review signature of the personal licence holder. A month not reviewed yet says so. Print it from the Refusal Registers form for the month on screen.',
  },
  tutorial: [
    { title: 'Do the morning date check', steps: [
      'Before opening, run the report Date check list. It lists by category every batch on the shelf with a date in the next seven days.',
      'Open the Date Checks form and press New. Type the next number in Number (DC-2026-0042 is followed by DC-2026-0043), today in Date, choose yourself in Staff, and type the two fridge readings in Fridge Temperatures.',
      'For each batch to reduce, open the Markdowns form and press New: choose the date check in Check and the batch in Batch, type today in Date, the shelf price in Was, the reduced price in Now, how many packs are left in Labels, and the reason. Type the reduced price into the batch\'s Marked Down To in the Batches form.',
      'For each batch past its date, open the Write-offs form and press New: choose the check and the batch, type the units, Out of date in Reason and the units at the batch\'s Unit Cost in Cost. Take the same number off the batch\'s Remaining.',
      'Open the print template Markdown label sheet, choose today\'s check and press Print. Print a Reduced label from the Markdowns form for each pack, and stick them over the shelf price.',
    ] },
    { title: 'Sell from the till, with an age check', steps: [
      'Open the Sales form and press New. Type the next receipt number in Number, the date and time in When, and choose who is on the till in Staff and how the customer paid in Payment.',
      'In the Sale Lines below, choose each Product and the Batch it came from (the one with the earliest date: the query Stock by batch shows them in order), and type the Quantity, the shelf price in Full Price and the price charged in Unit Price. Copy the category\'s Tax Rate and the batch\'s Unit Cost.',
      'If the sale has six or more bottles of wine, or twelve or more beers and ciders, type 0.1 in Discount on those lines, except any already reduced.',
      'If there is alcohol, type Looked over 25 or ID checked in Age Check, and what was shown in ID Seen.',
      'Run the query Receipt totals and type the sale\'s Total, VAT, Standard Rated and Saved from it. For cash, type the money handed over in Tendered and the difference in Change.',
      'Open the print template Till receipt, choose the sale and press Print. Take each line\'s units off its batch\'s Remaining.',
    ] },
    { title: 'Refuse a sale and keep the register', steps: [
      'When you refuse to sell alcohol, open the Refusals form straight away and press New. Type the next number in Number and the date and time in When.',
      'Choose this month\'s register in Register (if the month has none yet, add it in the Refusal Registers form first, with the month as 2026-10), yourself in Staff and what was asked for in Product.',
      'Type the Reason, how old the customer looked in Approx Age, the ID shown, and a few words in Description. No names.',
      'At the month end the licence holder runs the query Refusals, last 30 days to read the month through, types their name and the day in Reviewed By and Reviewed On, then prints the print template Refusals register for the month and signs it.',
    ] },
    { title: 'Order from your suppliers', steps: [
      'Run the report Stock to reorder. It shows, on a page for each supplier, what is at or below its reorder level and the pack size it comes in.',
      'Open the Purchase Orders form and press New. Type the next number in Number (PO-2026-0042 is followed by PO-2026-0043), choose the Supplier and yourself in Staff, and type today in Ordered On and the delivery day in Expected. Status stays Submitted.',
      'In the Purchase Lines below, choose each product and type how many to order, in whole packs, and the Unit Cost.',
      'Open the print template Purchase order, choose the order and press Save as PDF to e-mail it to the supplier.',
    ] },
    { title: 'Take in a delivery as batches', steps: [
      'When the goods come, check each case\'s date and batch code. Open the order in the Purchase Orders form, type the day in Received On, Received in Status and the number on the supplier\'s invoice in Supplier Invoice.',
      'For each line, open the Batches form and press New: choose the Product and the Purchase Order, type the Batch Code and the date from the pack in Expiry Date (leave it empty for wine and spirits), the day in Received, how many came in Quantity and again in Remaining, and the Unit Cost.',
      'Add the units to the product\'s In Stock in the Products form.',
      'When you pay the supplier, tick Paid on the order. The query Deliveries to pay lists what is still owed.',
    ] },
    { title: 'Look at the month', steps: [
      'Open the report Takings by month and the report Margin by category to see what each category took and earned after VAT and the cost of the goods.',
      'Open the report Write-offs by month for what was thrown away, and run the query Write-offs by product for the lines to order less of.',
      'Run the query Age checks by month to see how often the till asked for ID.',
      'For the VAT return, open the report VAT on sales and take the VAT for the months of the quarter.',
    ] },
  ],
  notes: [
    'Stock lives in Batches. A product\'s In Stock is all its batches\' Remaining added up; in the sample\'s records the till takes each sale from the batch with the earliest date, and the date check takes what has passed its date off sale. When you enter sales or deliveries by hand, change Remaining on the batch and In Stock on the product yourself.',
    'Use by and best before are not the same. A use-by line (chilled meats, cheese, salads, fresh juice) must not be sold after its date, so it is written off the next morning. A best-before line may be sold after its date, but this shop marks it down within two weeks of it and writes it off once the date has passed. Wine and spirits carry no date, only a batch code.',
    'The markdown rules in the sample: a use-by line is reduced by a quarter the day before its date and by half on the day; bread is reduced by half on its date; food that keeps is reduced by 30 percent within two weeks of its date and by half in its last three days. Change them to your own.',
    'A sale\'s Total, VAT, Standard Rated and Saved are what the till worked out and printed: each line\'s VAT rounded to the penny, then added up. They are stored so a receipt reprints exactly as it was. The query Receipt totals works them out from the lines.',
    'Prices include VAT. Cost Price, Unit Cost and purchase orders are before VAT, as suppliers invoice them. The margin queries take the VAT off the takings before they take off the cost.',
    'The refusals register keeps no names, only what is needed to recognise someone: an age, what they looked like, what happened. Keep it on the premises and show it when the licensing authority or the police ask.',
    'The print template Purchase order prints the orders still to come (Status Submitted); the others print every record of their table. Print one from its form for the record on screen: a receipt from the Sales form, a received order from the Purchase Orders form, a day\'s sheet from the Date Checks form, a month\'s register from the Refusal Registers form.',
    'The refusals register counts its own refusals as it prints, and says when a month has none or is not reviewed yet; nobody types the count.',
  ],
  faq: [
    { q: 'How do I see what is going out of date?', a: 'Run the query Expiring in the next 7 days, or print the report Date check list, which puts it on a page for each category. Days Left 0 means the date is today.' },
    { q: 'Why does the till sell a reduced pack before a full-price one?', a: 'It sells the batch with the earliest date first, which is the one most likely to have been reduced. On the shelf, reduced packs go at the front for the same reason.' },
    { q: 'How much do we throw away?', a: 'Open the report Write-offs by month for units and cost each month by reason. Set it against the takings in Takings by month: a few percent of the takings of a deli counter is usual. The query Write-offs by product shows which lines to order less of.' },
    { q: 'What do I need to show the licensing officer?', a: 'Print the print template Refusals register for each month asked about, signed by the personal licence holder, and the Staff table with each person\'s Age Check Training date.' },
    { q: 'How does the mixed-case discount work?', a: 'Each category has a Case Quantity and a Case Discount. When a sale has that many units of the category, its lines at the shelf price get the discount: ten percent off six bottles of wine, or twelve beers and ciders. It is not given on top of a reduced price.' },
    { q: 'Why does a batch of wine have no expiry date?', a: 'Wine and spirits do not go off on a shelf, so their Date Kind is None and their batches carry only a batch code, for tracing a bad case back to its delivery.' },
    { q: 'A supplier has recalled a batch. How do I find it?', a: 'Open the Batches form and find the Batch Code. Its Sale Lines show every sale it went into, and the query Stock by batch shows how many are still on the shelf to take off sale.' },
  ],
  empty: 'Start with Business, the shop\'s name, address and VAT number and the returns policy in Document Footer, which the receipts print. Then Categories (with their VAT, age rule and case discount), Suppliers, Staff and Products with their date kind, prices, reorder levels and pack sizes. Enter what you hold now as one batch per product with its date, and set In Stock to match. Purchase orders, batches, sales, date checks and refusals come in as you trade; add a Refusal Registers record at the start of each month.',
  adapt: [
    'Sell cheese and meat by weight: add a Weight field to Sale Lines in kilograms, make the price per kilogram, and change the line amount to Round([Weight] * [Unit Price], 2).',
    'Keep a wine list for the trade: add a Customers table for restaurants and offices, an Invoices table pointing at it, and a print template that invoices them monthly.',
    'Record temperatures properly: add a Temperature Readings table (date, time, fridge, reading, staff) in place of the text on Date Checks, and a query for readings above 5 degrees.',
    'Run a loyalty or wine club: add a Members table, point Sales at it, and give members their own case discount in a calculated column.',
    'Track supplier credits for what arrives short-dated: add a Credits table pointing at Batches, with the units refused and the credit note number.',
    'Sell tobacco or other age-restricted goods: add a category with Age Restricted ticked; the age check and the refusals register work for it as they do for alcohol.',
    'Order to a plan: add a Par Level field to Products for each weekday and make Stock to reorder compare In Stock with it.',
  ],
};

/** The groups: [name, VAT code, age restricted, case quantity, case discount, code prefix]. */
const GROUPS = [
  ['Wine', 'S', true, 6, 0.1, 'WI'],
  ['Beer and Cider', 'S', true, 12, 0.1, 'BE'],
  ['Spirits', 'S', true, 0, 0, 'SP'],
  ['Soft Drinks', 'S', false, 0, 0, 'SD'],
  ['Deli Counter', 'Z', false, 0, 0, 'DE'],
  ['Bakery', 'Z', false, 0, 0, 'BA'],
  ['Fine Foods', 'Z', false, 0, 0, 'FF'],
  ['Snacks and Sweets', 'S', false, 0, 0, 'SN'],
];
const RATE = { S: 0.2, Z: 0 };
// The shop's size: the units a day below are for a busy shop; this one sells a little less.
const SIZE = 0.85;

/**
 * What is sold: [group, name, unit, cost, price, units a day, date kind, shelf life, pack, season].
 * Generic goods, no brand. Prices include VAT; a season makes a line sell more at its time of year.
 */
const RANGE = [
  ['Wine', 'Merlot, Chile', '75 cl bottle', 4.6, 8.99, 2.5, 'None', null, 6, null],
  ['Wine', 'Malbec, Argentina', '75 cl bottle', 5.8, 11.5, 1.5, 'None', null, 6, 'winter'],
  ['Wine', 'Tempranillo, Spain', '75 cl bottle', 5.2, 10.5, 1.5, 'None', null, 6, null],
  ['Wine', 'Pinot Noir, New Zealand', '75 cl bottle', 8.4, 15.99, 0.8, 'None', null, 6, null],
  ['Wine', 'Sauvignon Blanc, New Zealand', '75 cl bottle', 6.1, 11.99, 2.5, 'None', null, 6, 'summer'],
  ['Wine', 'Pinot Grigio, Italy', '75 cl bottle', 4.4, 8.5, 2, 'None', null, 6, null],
  ['Wine', 'Chardonnay, Australia', '75 cl bottle', 5.3, 10.25, 1, 'None', null, 6, null],
  ['Wine', 'Dry rose, southern France', '75 cl bottle', 5.9, 11.5, 1.5, 'None', null, 6, 'summer'],
  ['Wine', 'Sparkling wine, brut', '75 cl bottle', 6.2, 12.5, 1, 'None', null, 6, 'xmas'],
  ['Wine', 'House red', '75 cl bottle', 3.6, 6.99, 2, 'None', null, 6, null],
  ['Beer and Cider', 'Pale ale', '500 ml bottle', 1.35, 2.8, 3, 'Best before', 240, 12, 'summer'],
  ['Beer and Cider', 'India pale ale', '330 ml can', 1.25, 2.6, 3, 'Best before', 270, 12, null],
  ['Beer and Cider', 'Oatmeal stout', '500 ml bottle', 1.4, 2.9, 1.2, 'Best before', 300, 12, 'winter'],
  ['Beer and Cider', 'Lager', '440 ml can', 0.85, 1.85, 4, 'Best before', 270, 12, 'summer'],
  ['Beer and Cider', 'Wheat beer', '500 ml bottle', 1.45, 2.95, 1, 'Best before', 200, 12, 'summer'],
  ['Beer and Cider', 'Dry cider', '500 ml bottle', 1.2, 2.6, 2, 'Best before', 300, 12, 'summer'],
  ['Beer and Cider', 'Fruit cider', '500 ml bottle', 1.25, 2.7, 1.5, 'Best before', 300, 12, 'summer'],
  ['Spirits', 'London dry gin', '70 cl bottle', 13.5, 26, 0.7, 'None', null, 3, null],
  ['Spirits', 'Blended whisky', '70 cl bottle', 14, 25.5, 0.5, 'None', null, 3, 'xmas'],
  ['Spirits', 'Single malt whisky, 12 years', '70 cl bottle', 24, 42, 0.25, 'None', null, 3, 'xmas'],
  ['Spirits', 'Vodka', '70 cl bottle', 11.5, 21, 0.5, 'None', null, 3, null],
  ['Spirits', 'Dark rum', '70 cl bottle', 13, 24, 0.35, 'None', null, 3, null],
  ['Spirits', 'Gin, small bottle', '20 cl bottle', 4.3, 8.5, 0.4, 'None', null, 6, null],
  ['Soft Drinks', 'Sparkling elderflower', '750 ml bottle', 1.6, 3.25, 1.2, 'Best before', 270, 6, 'summer'],
  ['Soft Drinks', 'Tonic water', '4 x 200 ml', 1.5, 3.1, 1.5, 'Best before', 240, 6, null],
  ['Soft Drinks', 'Cloudy apple juice', '1 litre', 1.5, 3.2, 1.2, 'Best before', 150, 6, null],
  ['Soft Drinks', 'Sparkling spring water', '750 ml bottle', 0.6, 1.5, 2, 'Best before', 360, 12, 'summer'],
  ['Soft Drinks', 'Ginger beer', '275 ml bottle', 0.75, 1.75, 1.2, 'Best before', 270, 12, null],
  ['Soft Drinks', 'Cola, cane sugar', '330 ml bottle', 0.7, 1.6, 1.5, 'Best before', 270, 12, null],
  ['Soft Drinks', 'Fresh orange juice', '1 litre', 1.9, 3.75, 1.2, 'Use by', 10, 6, null],
  ['Deli Counter', 'Air-dried ham, sliced', '100 g pack', 2.1, 4.5, 1.5, 'Use by', 10, 4, null],
  ['Deli Counter', 'Salami, sliced', '100 g pack', 1.7, 3.75, 1.2, 'Use by', 14, 4, null],
  ['Deli Counter', 'Cooked ham, sliced', '150 g pack', 1.6, 3.5, 1.8, 'Use by', 7, 4, null],
  ['Deli Counter', 'Mature cheddar', '200 g piece', 2, 4.25, 1.8, 'Use by', 21, 4, null],
  ['Deli Counter', 'Soft goat\'s cheese', '125 g', 1.9, 4, 0.9, 'Use by', 12, 3, null],
  ['Deli Counter', 'Blue cheese', '150 g piece', 2.4, 4.95, 0.7, 'Use by', 18, 2, 'xmas'],
  ['Deli Counter', 'Soft white rind cheese', '200 g', 2.2, 4.5, 0.9, 'Use by', 14, 3, null],
  ['Deli Counter', 'Marinated olives', '200 g tub', 1.4, 3.25, 1.5, 'Use by', 14, 4, 'summer'],
  ['Deli Counter', 'Hummus', '250 g tub', 1, 2.75, 1.5, 'Use by', 6, 4, 'summer'],
  ['Deli Counter', 'Stuffed vine leaves', '200 g tub', 1.5, 3.5, 0.6, 'Use by', 10, 2, null],
  ['Deli Counter', 'Pork pie', '300 g', 1.8, 3.95, 0.9, 'Use by', 6, 3, null],
  ['Deli Counter', 'Spinach and feta quiche', '400 g', 2.4, 5.25, 0.6, 'Use by', 4, 2, null],
  ['Deli Counter', 'Fresh egg pasta', '250 g pack', 1.2, 2.95, 0.9, 'Use by', 9, 3, null],
  ['Deli Counter', 'Smoked salmon, sliced', '100 g pack', 2.8, 5.75, 0.9, 'Use by', 10, 3, 'xmas'],
  ['Bakery', 'Sourdough loaf', '800 g', 1.6, 4.25, 3, 'Best before', 3, 1, null],
  ['Bakery', 'Baguette', 'each', 0.55, 1.6, 3, 'Best before', 1, 1, null],
  ['Bakery', 'Seeded rye loaf', '600 g', 1.5, 3.95, 1, 'Best before', 5, 1, null],
  ['Bakery', 'Rosemary focaccia', 'each', 1.1, 3.25, 1, 'Best before', 2, 1, 'summer'],
  ['Bakery', 'Butter croissant', 'each', 0.45, 1.4, 3, 'Best before', 2, 1, null],
  ['Fine Foods', 'Extra virgin olive oil', '500 ml bottle', 4.2, 8.5, 0.5, 'Best before', 540, 6, null],
  ['Fine Foods', 'Balsamic vinegar', '250 ml bottle', 3.1, 6.5, 0.3, 'Best before', 720, 6, null],
  ['Fine Foods', 'Bronze-cut dried pasta', '500 g', 1.1, 2.75, 1, 'Best before', 540, 6, null],
  ['Fine Foods', 'Tomato and basil sauce', '350 g jar', 1.3, 3.25, 0.8, 'Best before', 360, 6, null],
  ['Fine Foods', 'Oatcakes', '200 g', 0.9, 2.25, 0.6, 'Best before', 240, 6, null],
  ['Fine Foods', 'Water crackers', '150 g', 0.8, 2.1, 0.8, 'Best before', 270, 6, 'xmas'],
  ['Fine Foods', 'Caramelised onion chutney', '300 g jar', 1.5, 3.5, 0.7, 'Best before', 360, 6, 'xmas'],
  ['Fine Foods', 'Wildflower honey', '340 g jar', 2.8, 5.95, 0.4, 'Best before', 720, 6, null],
  ['Fine Foods', 'Raspberry jam', '340 g jar', 1.6, 3.5, 0.5, 'Best before', 360, 6, null],
  ['Fine Foods', 'Ground coffee, medium roast', '227 g bag', 2.9, 5.95, 0.6, 'Best before', 240, 6, null],
  ['Fine Foods', 'Loose leaf breakfast tea', '125 g caddy', 2.4, 4.95, 0.4, 'Best before', 540, 6, null],
  ['Snacks and Sweets', 'Hand-cooked crisps, sea salt', '150 g bag', 0.95, 2.4, 2, 'Best before', 120, 12, null],
  ['Snacks and Sweets', 'Roasted salted almonds', '150 g bag', 1.6, 3.5, 0.7, 'Best before', 180, 6, null],
  ['Snacks and Sweets', 'Dark chocolate, 70 percent', '100 g bar', 1.1, 2.75, 1.2, 'Best before', 300, 12, null],
  ['Snacks and Sweets', 'Chocolate truffles', 'box of 12', 3.8, 8.5, 0.4, 'Best before', 150, 6, 'xmas'],
  ['Snacks and Sweets', 'Butter fudge', '150 g bag', 1.2, 3.25, 0.5, 'Best before', 180, 6, null],
];

/** Who brings what: [groups, delivery days (0 Sunday), days of notice an order needs, the end of the supplier's name]. */
const ROUNDS = [
  [['Wine', 'Spirits'], [2], 2, 'Merchants'],
  [['Beer and Cider'], [4], 3, 'Supplies'],
  [['Soft Drinks', 'Snacks and Sweets'], [3], 2, 'Wholesale'],
  [['Deli Counter'], [2, 5], 1, 'Provisions'],
  [['Bakery'], [1, 2, 3, 4, 5, 6], 1, 'Foods'],
  [['Fine Foods'], [1], 3, 'Imports'],
];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** How the week goes, Sunday first: a quiet start, the weekend's wine on Friday and Saturday. */
const DAY_FACTOR = [0.75, 0.8, 0.85, 0.9, 1, 1.3, 1.4];
/** Sales an hour, Monday to Saturday 9 to 8 and Sunday 10 to 4: lunch, and the evening rush for a bottle. */
const HOURLY = { 9: 0.5, 10: 0.7, 11: 0.9, 12: 1.2, 13: 1.1, 14: 0.8, 15: 0.8, 16: 1, 17: 1.5, 18: 1.7, 19: 1.3 };
const SUNDAY_HOURS = [10, 11, 12, 13, 14, 15];
const WEEK_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
/** How many of a line one customer takes. */
const QTY = { Wine: [[1, 75], [2, 20], [3, 5]], 'Beer and Cider': [[1, 30], [2, 25], [4, 30], [6, 15]], other: [[1, 86], [2, 14]] };
const LINES = [[1, 40], [2, 30], [3, 17], [4, 9], [5, 4]];
const mean = (pairs) => pairs.reduce((n, [v, w]) => n + v * w, 0) / pairs.reduce((n, [, w]) => n + w, 0);

/** The shop over the year: busier in December, quieter in January. */
const shopSeason = (m) => (m === 11 ? 1.3 : m === 0 ? 0.8 : m >= 5 && m <= 7 ? 1.05 : 1);
/** A line's own season: summer drinks, winter reds and stouts, Christmas treats. */
function lineSeason(s, m) {
  if (s === 'summer') return m >= 5 && m <= 7 ? 1.8 : m >= 10 || m <= 1 ? 0.6 : 1;
  if (s === 'winter') return m >= 10 || m <= 1 ? 1.4 : m >= 5 && m <= 7 ? 0.7 : 1;
  if (s === 'xmas') return m === 11 ? 3 : m === 10 ? 1.3 : 0.8;
  return 1;
}

/** Pence as SQLite's Round(x, 2) gives them; near a half penny toFixed rounds the exact value as SQLite does. */
const cents = (n) => {
  const y = n * 100;
  const k = Math.round(y);
  return Math.abs(Math.abs(y - k) - 0.5) < 1e-6 ? Number(n.toFixed(2)) : k / 100;
};
/** A yellow-sticker price: the reduced price rounded down to 5p, in the customer's favour. */
const yellow = (x) => cents(Math.max(0.05, Math.floor(x * 20 + 1e-9) / 20));

/** What a customer hands over for `total` in cash: the exact money, or the next note up. */
function tendered(r, total) {
  const up = [Math.ceil(total), Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, total <= 20 ? 20 : Math.ceil(total / 20) * 20].filter((x) => x >= total);
  return r.chance(0.2) ? total : r.pick(up);
}

const REFUSALS = [
  ['No ID shown', 45, [15, 22], ['None'], ['Said they had left their ID at home', 'Came in with a group of friends; one asked for the drink', 'Wearing a school blazer', 'Had no ID and said they were 19', 'Came back the next day, still with no ID']],
  ['ID not acceptable', 15, [16, 21], ['A photo of a licence on a phone', 'A passport that had run out', 'A student card with no date of birth', 'Someone else\'s licence'], ['The photo did not look like the customer', 'Would not take the ID out of its wallet to be checked']],
  ['Under 18 on ID', 10, [16, 17], ['Provisional driving licence', 'Proof-of-age card'], ['ID showed the customer was 17', 'Showed ID without seeming to know it gave their age']],
  ['Suspected proxy sale', 18, [25, 45], ['Not asked'], ['Young people outside were seen handing over money', 'Took a list of drinks from a group waiting by the door', 'Said the drink was for a younger brother']],
  ['Customer drunk', 12, [25, 60], ['Not asked'], ['Unsteady and slurring; asked to leave and did', 'Had been drinking and became loud when refused']],
];

/** Fill a Bramblegate Wine and Deli database made from `spec`. `r` is random(), `cal` calendar(). Answers counts. */
export function fill(base, { r, cal, days = 365 }) {
  const counts = {};
  const add = (table, values) => { counts[table] = (counts[table] || 0) + 1; return base.insert(table, values); };

  add('Business', businessRecord({
    name: 'Bramblegate Wine and Deli', domain: 'bramblegate.example', phone: '020 7946 0730',
    address: { Address: '8 Market Square', City: 'Bristol', Postcode: 'BS3 4QR', Country: 'United Kingdom' },
    terms: 'Paid at the till by card, cash or phone.',
    footer: 'Thank you for shopping at Bramblegate. Open Monday to Saturday 9am to 8pm, Sunday 10am to 4pm. We ask anyone who looks under 25 for photo ID before we sell alcohol. Unopened bottles can be returned with this receipt within 14 days; deli and fresh food only if it is faulty. Your legal rights are not affected.',
  }));

  // Staff: the owner holds the premises licence; the deli manager holds a personal licence too.
  const roles = [['Owner', true], ['Deli Manager', true], ['Shop Assistant', false], ['Shop Assistant', false], ['Weekend Assistant', false]];
  const staff = roles.map(([role, licence], i) => {
    const p = person(r);
    return add('Staff', { 'First Name': p['First Name'], 'Last Name': p['Last Name'], Role: role, Phone: `07700 900${String(610 + i).padStart(3, '0')}`, Started: cal.day(-r.int(420, 3000)), 'Personal Licence': licence, 'Age Check Training': cal.day(-r.int(20, 330)) });
  });
  const [owner, deli, shop1, shop2, weekender] = staff;

  // Suppliers, each on its own days.
  const taken = new Set(['Bramblegate']);
  const suppliers = ROUNDS.map(([groups, on, lead, tail], i) => {
    let name;
    do name = companies(r, 1, [tail])[0]; while (taken.has(name.split(' ')[0]));
    taken.add(name.split(' ')[0]);
    const a = address(r, PLACES.slice(0, 1));
    const id = add('Suppliers', {
      Name: name, Contact: (({ 'First Name': f, 'Last Name': l }) => `${f} ${l}`)(person(r)), Address: a.Address, City: a.City, Postcode: a.Postcode,
      Phone: phoneFor(r, 'United Kingdom'), 'E-mail': `orders@${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`,
      'Account Number': `BWD-${String(2001 + i * 53).padStart(5, '0')}`,
      'Delivers On': on.length === 6 ? 'Monday to Saturday' : on.map((d) => DAY_NAMES[d]).join(', '), 'Lead Days': lead,
    });
    return { id, groups, on, lead };
  });

  // Categories and products.
  const groups = new Map();
  for (const [name, vat, restricted, caseQty, caseOff, prefix] of GROUPS) {
    const id = add('Categories', { Name: name, 'VAT Code': vat, 'Tax Rate': RATE[vat], 'Age Restricted': restricted, 'Case Quantity': caseQty, 'Case Discount': caseOff });
    groups.set(name, { id, name, rate: RATE[vat], restricted, caseQty, caseOff, prefix, n: 100 });
  }
  const products = RANGE.map(([group, name, unit, cost, price, perDay, kind, life, pack, season]) => {
    const demand = perDay * SIZE;
    const g = groups.get(group);
    // Fresh juice keeps only ten days, so it comes with the deli's twice-weekly round.
    const s = name === 'Fresh orange juice' ? suppliers[3] : suppliers.find((x) => x.groups.includes(group));
    const qty = QTY[group] || QTY.other;
    const p = { g, name, unit, cost, price, demand, kind, life, pack, season, s, qty, w: demand / mean(qty), batches: [], stock: 0, pending: 0 };
    p.code = `${g.prefix}${++g.n}`;
    // The longest wait between two deliveries, and the stock that must cover it.
    const gap = Math.max(...s.on.map((d, k) => ((s.on[(k + 1) % s.on.length] - d + 7) % 7) || 7));
    p.level = Math.max(1, Math.ceil(demand * (s.lead + gap) * (life && life <= 30 ? 0.6 : 1)));
    p.id = add('Products', {
      Code: p.code, Name: name, Category: g.id, Supplier: s.id, Unit: unit, 'Date Kind': kind, 'Shelf Life': life,
      'Cost Price': cost, 'Sale Price': price, 'Reorder Level': p.level, 'Pack Size': pack,
    });
    return p;
  });
  const restricted = products.filter((p) => p.g.restricted);

  // A year from the first of a month, so every month in the takings is a whole one.
  let start = -days;
  while (cal.at(start).getDate() !== 1) start++;
  // Each day's month, weekday and whether the shop is shut (Christmas Day and New Year's Day).
  const info = new Map();
  const dayOf = (d) => {
    if (!info.has(d)) {
      const at = cal.at(d);
      const m = at.getMonth();
      info.set(d, { m, wd: at.getDay(), closed: (m === 11 && at.getDate() === 25) || (m === 0 && at.getDate() === 1), y: at.getFullYear(), iso: cal.day(d) });
      const x = info.get(d);
      // How busy the shop is that day: its month and weekday, nought when it is shut.
      x.f = x.closed ? 0 : shopSeason(m) * DAY_FACTOR[x.wd];
    }
    return info.get(d);
  };
  /** Units of `p` the shop expects to sell over `n` days from day `from`. */
  const expected = (p, from, n) => {
    let units = 0;
    for (let k = 0; k < n; k++) {
      const x = dayOf(from + k);
      if (x.f) units += p.demand * lineSeason(p.season, x.m) * x.f;
    }
    return units;
  };

  // Numbers that run in date order, a new run each year: RCP-2026-01234, PO-2026-0042.
  const runs = {};
  const numberFor = (prefix, d, width) => { const y = dayOf(d).y; const k = `${prefix}${y}`; runs[k] = (runs[k] || 0) + 1; return `${prefix}-${y}-${String(runs[k]).padStart(width, '0')}`; };

  // Purchase orders: placed, then received as batches.
  const pending = []; // { id, at, lines: [{ p, n }] }
  const allBatches = [];
  const placeOrder = (s, d, at, lines, who) => {
    const id = add('Purchase Orders', { Number: numberFor('PO', d, 4), Supplier: s.id, Staff: who, 'Ordered On': dayOf(d).iso, Expected: dayOf(at).iso, Status: 'Submitted' });
    for (const l of lines) {
      add('Purchase Lines', { 'Purchase Order': id, Product: l.p.id, Quantity: l.n, 'Unit Cost': l.p.cost });
      l.p.pending += l.n;
    }
    pending.push({ id, at, lines });
  };
  const receive = (po, d) => {
    base.update('Purchase Orders', po.id, { 'Received On': dayOf(d).iso, Status: 'Received', 'Supplier Invoice': `SI-${r.int(100000, 999999)}`, Paid: d < -21 || r.chance(0.4) });
    for (const { p, n } of po.lines) {
      p.pending -= n;
      // The date on the packs: a short-lived line about its shelf life away, one that keeps a little less.
      const exp = p.life == null ? null : d + (p.life <= 30 ? p.life - r.int(0, p.life > 5 ? 1 : 0) : Math.round(p.life * (0.8 + r.next() * 0.2)));
      const code = `L${dayOf(d).iso.slice(2).replace(/-/g, '')}-${p.code.slice(-3)}`;
      const b = { p, exp, received: d, cost: p.cost, n, left: n, price: null, pct: 0 };
      b.id = add('Batches', { Product: p.id, 'Purchase Order': po.id, 'Batch Code': code, Received: dayOf(d).iso, 'Expiry Date': exp == null ? null : dayOf(exp).iso, Quantity: n, 'Unit Cost': p.cost, Remaining: n });
      p.batches.push(b);
      allBatches.push(b);
      // The batch with the earliest date first; wine and spirits, with none, oldest first.
      p.batches.sort((x, y) => (x.exp ?? 1e9) - (y.exp ?? 1e9) || x.received - y.received);
      p.stock += n;
    }
  };
  const nextDelivery = (s, after) => { let k = 1; while (!s.on.includes(dayOf(after + k).wd)) k++; return k; };
  /** What a supplier should bring on day `at`: enough to last to its next delivery, in whole packs. */
  const orderFor = (s, d, at) => {
    const gap = nextDelivery(s, at);
    const lines = [];
    for (const p of products.filter((x) => x.s === s)) {
      // Stock still good after the delivery, plus what is on order, less what sells before it comes.
      const good = p.batches.reduce((n, b) => n + (b.exp == null || b.exp > at ? b.left : 0), 0);
      const have = good + p.pending - expected(p, d + 1, at - d - 1);
      const fresh = p.life != null && p.life <= 30;
      const cover = expected(p, at, gap) * (fresh ? 1.3 : 1) + (fresh ? 0 : expected(p, at + gap, 7));
      const need = cover - have;
      if (need <= 0.25) continue;
      lines.push({ p, n: Math.max(1, Math.ceil(need / p.pack)) * p.pack });
    }
    return lines;
  };

  // Opening stock, in before the first day: an order to each supplier.
  for (const s of suppliers) {
    const lines = orderFor(s, start - 4, start - 1);
    if (!lines.length) continue;
    placeOrder(s, start - 4, start - 1, lines, owner);
    receive(pending.pop(), start - 1);
  }

  const registers = new Map(); // 'yyyy-mm' -> { id, n }
  const registerFor = (d) => {
    const key = dayOf(d).iso.slice(0, 7);
    if (!registers.has(key)) registers.set(key, { id: add('Refusal Registers', { Month: key }), n: 0, first: d });
    return registers.get(key);
  };
  let lastRefusal = -1e9;

  const writeOff = (b, d, n, reason, check, who) => {
    b.left -= n;
    b.p.stock -= n;
    add('Write-offs', { Check: check, Batch: b.id, Date: dayOf(d).iso, Quantity: n, Reason: reason, Cost: cents(n * b.cost), Staff: who });
  };

  for (let d = start; d <= 0; d++) {
    const x = dayOf(d);
    if (x.closed) continue;
    const weekend = x.wd === 0 || x.wd === 6;

    // Deliveries due today, or due on a day the shop was shut.
    for (let i = pending.length - 1; i >= 0; i--) if (pending[i].at <= d) receive(pending.splice(i, 1)[0], d);

    // The morning date check: past its date off sale, near its date marked down, the fridges read.
    const checker = weekend ? r.pick([owner, weekender]) : r.weighted([[owner, 3], [deli, 2]]);
    const check = add('Date Checks', { Number: numberFor('DC', d, 4), Date: x.iso, Staff: checker, 'Fridge Temperatures': `Chiller ${r.int(2, 5)} C, deli counter ${r.int(2, 5)} C` });
    for (const p of products) {
      for (const b of p.batches) {
        if (!b.left || b.exp == null) continue;
        const left = b.exp - d;
        if (left < 0) { writeOff(b, d, b.left, 'Out of date', check, checker); continue; }
        let pct = 0;
        let reason = '';
        if (p.kind === 'Use by') { if (left === 0) { pct = 0.5; reason = 'Last day'; } else if (left === 1) { pct = 0.25; reason = 'One day left'; } }
        else if (p.life <= 7) { if (left === 0) { pct = 0.5; reason = 'Last day'; } else if (left === 1 && p.life >= 4) { pct = 0.25; reason = 'One day left'; } }
        else if (left <= 3) { pct = 0.5; reason = 'Short date'; }
        else if (left <= 14) { pct = 0.3; reason = 'Short date'; }
        if (pct <= b.pct) continue;
        const was = b.price ?? p.price;
        const now = yellow(p.price * (1 - pct));
        if (now >= was) continue;
        add('Markdowns', { Number: numberFor('MD', d, 5), Check: check, Batch: b.id, Date: x.iso, Was: was, Now: now, Labels: b.left, Reason: reason });
        b.price = now;
        b.pct = pct;
      }
      p.batches = p.batches.filter((b) => b.left > 0);
      p.reduced = p.batches.some((b) => b.price != null);
    }

    // The till.
    const hours = x.wd === 0 ? SUNDAY_HOURS : WEEK_HOURS;
    const closeAt = d === 0 ? Math.min(hours.at(-1) + 1, Math.max(hours[0] + 1, cal.hour + 1)) : hours.at(-1) + 1;
    const weights = products.map((p) => p.w * lineSeason(p.season, x.m));
    const perDay = weights.reduce((a, b) => a + b, 0) * shopSeason(x.m) * DAY_FACTOR[x.wd] / mean(LINES);
    const share = hours.reduce((a, h) => a + HOURLY[h], 0);
    for (const h of hours) {
      if (h >= closeAt) break;
      const n = Math.floor(r.next() * 2 * perDay * HOURLY[h] / share + 0.5);
      const minutes = Array.from({ length: n }, () => r.int(0, 59)).sort((a, b) => a - b);
      for (const minute of minutes) {
        // The basket: now and then a mixed case of wine or of beer, otherwise a few things.
        const want = new Map();
        const caseOf = r.chance(0.014) ? 'Wine' : r.chance(0.008) ? 'Beer and Cider' : null;
        if (caseOf) {
          const g = groups.get(caseOf);
          const pool = products.filter((p) => p.g === g && p.stock > 0);
          const kinds = r.some(pool, r.int(1, 3));
          for (let k = 0; k < g.caseQty && kinds.length; k++) { const p = r.pick(kinds); want.set(p, (want.get(p) || 0) + 1); }
        } else {
          const shelf = products.map((p, i) => [p, p.stock > 0 ? weights[i] * (p.reduced ? 1.8 : 1) : 0]).filter(([, w]) => w > 0);
          const k = r.weighted(LINES);
          for (let j = 0; j < k && shelf.length; j++) {
            const p = r.weighted(shelf);
            shelf.splice(shelf.findIndex(([q]) => q === p), 1);
            want.set(p, r.weighted(p.qty));
          }
        }
        // Taken batch by batch, earliest date first; nothing is sold that is not on the shelf.
        const lines = [];
        const units = new Map();
        for (const [p, q] of want) {
          let need = Math.min(q, p.stock);
          for (const b of p.batches) {
            if (!need) break;
            const take = Math.min(need, b.left);
            if (!take) continue;
            lines.push({ p, b, q: take });
            need -= take;
            units.set(p.g, (units.get(p.g) || 0) + take);
          }
        }
        if (!lines.length) continue;
        let total = 0;
        let vat = 0;
        let standard = 0;
        let saved = 0;
        for (const l of lines) {
          l.unit = l.b.price ?? l.p.price;
          // A mixed case earns its discount, but never on top of a reduced price.
          l.discount = l.p.g.caseQty && units.get(l.p.g) >= l.p.g.caseQty && l.b.price == null ? l.p.g.caseOff : 0;
          const amount = cents(l.q * l.unit * (1 - l.discount));
          total += amount;
          vat += cents(amount - amount / (1 + l.p.g.rate));
          if (l.p.g.rate > 0) standard += amount;
          saved += cents(cents(l.q * l.p.price) - amount);
        }
        total = cents(total);
        const payment = r.weighted([['Card', 7], ['Cash', 2], ['Mobile', 2]]);
        const paid = payment === 'Cash' ? tendered(r, total) : null;
        const alcohol = lines.some((l) => l.p.g.restricted);
        const checked = alcohol && r.chance(0.22);
        const who = weekend ? r.pick([owner, weekender, shop2]) : h >= 17 ? r.pick([shop1, shop2, owner]) : r.pick([owner, deli, shop1]);
        const sale = add('Sales', {
          Number: numberFor('RCP', d, 5), When: cal.time(d, h, minute), Staff: who, Payment: payment,
          Total: total, VAT: cents(vat), 'Standard Rated': cents(standard), Saved: cents(saved),
          Tendered: paid, Change: paid === null ? null : cents(paid - total),
          'Age Check': !alcohol ? 'Not needed' : checked ? 'ID checked' : 'Looked over 25',
          'ID Seen': checked ? r.weighted([['Driving licence', 50], ['Passport', 20], ['Proof-of-age card', 30]]) : null,
        });
        for (const l of lines) {
          add('Sale Lines', { Sale: sale, Product: l.p.id, Batch: l.b.id, Quantity: l.q, 'Full Price': l.p.price, 'Unit Price': l.unit, Discount: l.discount, 'Tax Rate': l.p.g.rate, 'Unit Cost': l.b.cost });
          l.b.left -= l.q;
          if (l.b.price != null && !l.b.left) l.p.reduced = l.p.batches.some((b) => b.left > 0 && b.price != null);
          l.p.stock -= l.q;
        }
      }
    }
    for (const p of products) p.batches = p.batches.filter((b) => b.left > 0);

    // Refusals, more on Friday and Saturday evenings; never a month without one for long.
    const tries = (x.wd === 5 || x.wd === 6 ? 0.42 : 0.2) + (x.m === 11 ? 0.1 : 0);
    if ((r.chance(tries) || (d === -2 && lastRefusal < -25)) && d < 0) {
      const [reason, , ages, shown, what] = r.weighted(REFUSALS.map((k) => [k, k[1]]));
      const reg = registerFor(d);
      reg.n++;
      const h = r.weighted(hours.map((hh) => [hh, hh >= 17 ? 3 : 1]));
      add('Refusals', {
        Number: numberFor('REF', d, 4), Register: reg.id, When: cal.time(d, h, r.int(0, 59)), Staff: weekend ? r.pick([owner, weekender, shop2]) : h >= 17 ? r.pick([shop1, shop2, owner]) : r.pick([owner, deli, shop1]),
        Product: r.weighted(restricted.map((p) => [p, p.demand * (p.g.name === 'Spirits' ? 4 : p.g.name === 'Beer and Cider' ? 2 : 1)])).id,
        Reason: reason, 'Approx Age': r.int(ages[0], ages[1]), 'ID Shown': r.pick(shown), Description: r.pick(what),
      });
      lastRefusal = d;
    } else registerFor(d);

    // Now and then a bottle dropped or a pack split.
    if (r.chance(0.07)) {
      const pool = products.filter((p) => p.stock > 0 && ['Wine', 'Beer and Cider', 'Spirits', 'Soft Drinks'].includes(p.g.name));
      if (pool.length) { const p = r.pick(pool); writeOff(p.batches[0], d, 1, 'Broken', null, r.pick(staff)); }
    }
    if (r.chance(0.03)) {
      const pool = products.filter((p) => p.stock > 0 && p.g.name === 'Deli Counter');
      if (pool.length) { const p = r.pick(pool); writeOff(p.batches[0], d, 1, 'Damaged', null, deli); }
    }
    for (const p of products) p.batches = p.batches.filter((b) => b.left > 0);

    // At closing, the orders for the deliveries that need this much notice; before a day the
    // shop is shut, tomorrow's orders as well.
    for (const s of suppliers) {
      for (const at of dayOf(d + 1).closed ? [d + s.lead, d + s.lead + 1] : [d + s.lead]) {
        if (!s.on.includes(dayOf(at).wd)) continue;
        const lines = orderFor(s, d, at);
        if (lines.length) placeOrder(s, d, at, lines, s.groups.includes('Deli Counter') || s.groups.includes('Bakery') ? deli : owner);
      }
    }
  }

  // Each month's register signed off by the owner once the month is over.
  for (const [, reg] of registers) {
    let end = reg.first;
    while (dayOf(end + 1).iso.slice(0, 7) === dayOf(reg.first).iso.slice(0, 7)) end++;
    const reviewed = end + 1 + (dayOf(end + 1).closed ? 1 : 0) + r.int(0, 2);
    if (reviewed <= 0) base.update('Refusal Registers', reg.id, { 'Reviewed By': owner, 'Reviewed On': dayOf(reviewed).iso });
  }
  for (const b of allBatches) if (b.left !== b.n || b.price != null) base.update('Batches', b.id, { Remaining: b.left, 'Marked Down To': b.price });
  for (const p of products) base.update('Products', p.id, { 'In Stock': p.stock });
  return counts;
}
