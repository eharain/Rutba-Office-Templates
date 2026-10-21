// The pharmacy: Tansy Row Pharmacy, an invented independent pharmacy on a
// neighbourhood high street, and the counter and stock side of it. Over the
// counter medicines and toiletries in categories, each delivery from the
// wholesalers kept as a batch with its expiry date, the till's sales and
// their lines, the pharmacist's check on every sale of a pharmacy-only
// line, a short log of prescriptions waiting to be collected, deliveries to
// housebound customers in rounds, orders to suppliers, and stock written off
// when it runs out of date or is damaged, with the return notes that claim
// credit for it.
//
// Its records are a year of the shop run a day at a time. Coughs and colds
// sell in winter, hay fever and sun cream in summer. Sales take the batch
// nearest its expiry first; each Monday whatever runs out within the week is
// taken off the shelf, and once a month it goes back to the wholesaler for
// credit. An order to the main wholesaler each weekday keeps the shelves filled.
// Every product name is generic, never a brand. The prescription log holds
// initials, a reference and a count of items only: no medicines, no doses,
// nothing clinical. Nothing in this file is advice about any medicine.

import { BUSINESS_ABOUT, BUSINESS_TABLE, businessRecord, FIRST, LAST, money, person, phoneFor } from './util.js';

const ref = (table) => ({ type: 'integer', points: table });
const LETTERHEAD = { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'E-mail', 'Tax Number'] };
// A till line's money, as the receipt works it out: prices include VAT, and the VAT within is rounded on each line.
const GROSS = 'Round([Sale Lines].[Quantity] * [Unit Price], 2)';
const VAT_IN = `Round(${GROSS} - ${GROSS} / (1 + Nz([Sale Lines].[Tax Rate])), 2)`;
const NET = `Round(${GROSS} - ${VAT_IN}, 2)`;
const COST = 'Round([Sale Lines].[Quantity] * [Sale Lines].[Unit Cost], 2)';
// Weeks counted from Monday 1 January 2024: the same number for every day of one week.
const WEEK = '(DateDiff("d", #2024-01-01#, [When]) - (DateDiff("d", #2024-01-01#, [When]) Mod 7)) / 7';

export const spec = {
  negative: {},
  tables: [
    BUSINESS_TABLE,
    { name: 'Suppliers', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Kind', type: 'text' }, { name: 'Account No', type: 'text' },
      { name: 'Address', type: 'text' }, { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' }, { name: 'Phone', type: 'text' },
      { name: 'E-mail', type: 'text' }, { name: 'Order Days', type: 'text' }, { name: 'Lead Days', type: 'integer', default: 1 },
      { name: 'Payment Days', type: 'integer', default: 30 }, { name: 'Takes Returns', type: 'yesno' }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Categories', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Description', type: 'text' }, { name: 'Tax Rate', type: 'number', default: 0.2 },
    ] },
    { name: 'Staff', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Role', type: 'text' },
      { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Started', type: 'date' },
    ] },
    // Supplier Orders and Supplier Returns come before Products: a query joins two tables by the first
    // relationship between them, so an order's or a return's supplier is its own, not its products'.
    { name: 'Supplier Orders', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Supplier', ...ref('Suppliers'), required: true }, { name: 'Ordered By', ...ref('Staff') },
      { name: 'Ordered On', type: 'date' }, { name: 'Expected', type: 'date' }, { name: 'Received On', type: 'date' }, { name: 'Status', type: 'text', default: 'Submitted' },
    ] },
    { name: 'Supplier Returns', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Supplier', ...ref('Suppliers'), required: true }, { name: 'Raised On', type: 'date' },
      { name: 'Collected On', type: 'date' }, { name: 'Status', type: 'text', default: 'Awaiting collection' }, { name: 'Credit Claimed', type: 'currency' },
      { name: 'Credit Note', type: 'text' }, { name: 'Credited On', type: 'date' },
    ] },
    { name: 'Products', fields: [
      { name: 'Code', type: 'text', unique: true }, { name: 'Name', type: 'text', required: true }, { name: 'Category', ...ref('Categories') },
      { name: 'Supplier', ...ref('Suppliers') }, { name: 'Pack', type: 'text' }, { name: 'Cost Price', type: 'currency' }, { name: 'Retail Price', type: 'currency' },
      { name: 'Units in Stock', type: 'integer', default: 0 }, { name: 'Reorder Level', type: 'integer', default: 4 }, { name: 'Reorder Quantity', type: 'integer', default: 12 },
      { name: 'Pharmacist Check', type: 'yesno' }, { name: 'Max per Sale', type: 'integer' }, { name: 'Discontinued', type: 'yesno' },
    ] },
    { name: 'Supplier Order Lines', fields: [
      { name: 'Order', ...ref('Supplier Orders'), required: true }, { name: 'Product', ...ref('Products'), required: true },
      { name: 'Quantity', type: 'integer' }, { name: 'Unit Cost', type: 'currency' },
    ] },
    { name: 'Batches', fields: [
      { name: 'Product', ...ref('Products'), required: true }, { name: 'Batch No', type: 'text' }, { name: 'Expiry Date', type: 'date' },
      { name: 'Received On', type: 'date' }, { name: 'Quantity Received', type: 'integer' }, { name: 'Quantity Left', type: 'integer' },
    ] },
    { name: 'Waste', fields: [
      { name: 'Batch', ...ref('Batches'), required: true }, { name: 'Return', ...ref('Supplier Returns') }, { name: 'Written Off On', type: 'date' },
      { name: 'Quantity', type: 'integer' }, { name: 'Unit Cost', type: 'currency' }, { name: 'Reason', type: 'text' },
    ] },
    { name: 'Sales', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'When', type: 'datetime' }, { name: 'Till', type: 'text', default: 'Till 1' },
      { name: 'Served By', ...ref('Staff') }, { name: 'Payment', type: 'text', default: 'Card' }, { name: 'Total', type: 'currency' },
      { name: 'VAT', type: 'currency' }, { name: 'Paid', type: 'currency' }, { name: 'Change', type: 'currency', default: 0 },
    ] },
    { name: 'Sale Lines', fields: [
      { name: 'Sale', ...ref('Sales'), required: true }, { name: 'Product', ...ref('Products'), required: true }, { name: 'Quantity', type: 'integer', default: 1 },
      { name: 'Unit Price', type: 'currency' }, { name: 'Tax Rate', type: 'number', default: 0.2 }, { name: 'Unit Cost', type: 'currency' },
      { name: 'Pharmacist Check', type: 'yesno' },
    ] },
    { name: 'Pharmacist Checks', fields: [
      { name: 'When', type: 'datetime' }, { name: 'Product', ...ref('Products'), required: true }, { name: 'Quantity', type: 'integer', default: 1 },
      { name: 'Pharmacist', ...ref('Staff'), required: true }, { name: 'Sale', ...ref('Sales') }, { name: 'For Whom', type: 'text' },
      { name: 'Outcome', type: 'text' }, { name: 'Note', type: 'text' },
    ] },
    { name: 'Prescriptions', fields: [
      { name: 'Reference', type: 'text', unique: true }, { name: 'Initials', type: 'text' }, { name: 'Received On', type: 'date' },
      { name: 'Items', type: 'integer' }, { name: 'Ready On', type: 'date' }, { name: 'Collected On', type: 'date' },
      { name: 'Status', type: 'text', default: 'Being made up' }, { name: 'Shelf', type: 'text' }, { name: 'For Delivery', type: 'yesno' },
    ] },
    { name: 'Delivery Customers', fields: [
      { name: 'Customer No', type: 'text', unique: true }, { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true },
      { name: 'Address', type: 'text' }, { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' }, { name: 'Phone', type: 'text' },
      { name: 'Area', type: 'text' }, { name: 'Round Day', type: 'text' }, { name: 'Every Weeks', type: 'integer', default: 1 },
      { name: 'Access Notes', type: 'text' }, { name: 'Active', type: 'yesno', default: true }, { name: 'Since', type: 'date' },
    ] },
    { name: 'Delivery Rounds', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Delivery Date', type: 'date' }, { name: 'Driver', ...ref('Staff'), required: true },
      { name: 'Area', type: 'text' }, { name: 'Stops', type: 'integer' }, { name: 'Bags', type: 'integer' }, { name: 'Status', type: 'text', default: 'Planned' },
    ] },
    { name: 'Deliveries', fields: [
      { name: 'Round', ...ref('Delivery Rounds'), required: true }, { name: 'Stop', type: 'integer' }, { name: 'Customer', ...ref('Delivery Customers'), required: true },
      { name: 'Prescription Ref', type: 'text' }, { name: 'Bags', type: 'integer', default: 1 }, { name: 'Status', type: 'text', default: 'Planned' },
      { name: 'Delivered At', type: 'datetime' }, { name: 'Received By', type: 'text' }, { name: 'Notes', type: 'text' },
    ] },
  ],
  queries: {
    'Expiring in the next 30 days': { tables: ['Batches', 'Products', 'Suppliers'], columns: [
      { table: 'Suppliers', field: 'Name', as: 'Supplier', sort: 'asc' }, { table: 'Batches', field: 'Expiry Date', sort: 'asc' },
      { expr: 'DateDiff("d", Date(), [Expiry Date])', as: 'Days Left', criteria: ['Between 0 And 30'] },
      { table: 'Products', field: 'Code' }, { table: 'Products', field: 'Name', as: 'Product' }, { table: 'Batches', field: 'Batch No' },
      { table: 'Batches', field: 'Quantity Left', criteria: ['> 0'] }, { expr: 'Round([Quantity Left] * [Cost Price], 2)', as: 'Value at Cost' },
      { table: 'Suppliers', field: 'Takes Returns' },
    ] },
    'Prescriptions waiting over 7 days': { tables: ['Prescriptions'], columns: [
      { table: 'Prescriptions', field: 'Ready On', sort: 'asc' }, { table: 'Prescriptions', field: 'Reference' }, { table: 'Prescriptions', field: 'Initials' },
      { table: 'Prescriptions', field: 'Items' }, { expr: 'DateDiff("d", [Ready On], Date())', as: 'Days Waiting', criteria: ['> 7'] },
      { table: 'Prescriptions', field: 'Shelf' }, { table: 'Prescriptions', field: 'Status', criteria: ['Ready'], show: false },
      { table: 'Prescriptions', field: 'For Delivery', criteria: ['No'], show: false },
    ] },
    'Deliveries today and tomorrow': { tables: ['Deliveries', 'Delivery Rounds', 'Staff', 'Delivery Customers'], columns: [
      { table: 'Delivery Rounds', field: 'Delivery Date', sort: 'asc' }, { expr: '[Staff].[First Name] & " " & [Staff].[Last Name]', as: 'Driver', sort: 'asc' },
      { table: 'Delivery Rounds', field: 'Area' }, { table: 'Deliveries', field: 'Stop', sort: 'asc' },
      { expr: '[Delivery Customers].[First Name] & " " & [Delivery Customers].[Last Name]', as: 'Customer' },
      { table: 'Delivery Customers', field: 'Address' }, { table: 'Delivery Customers', field: 'Postcode' }, { table: 'Delivery Customers', field: 'Phone' },
      { table: 'Deliveries', field: 'Prescription Ref', as: 'Prescription' }, { table: 'Deliveries', field: 'Bags' }, { table: 'Deliveries', field: 'Status' },
      { expr: 'DateDiff("d", Date(), [Delivery Date])', as: 'Days Ahead', criteria: ['Between 0 And 1'], show: false },
    ] },
    'Restricted sales by week': { tables: ['Pharmacist Checks', 'Products'], columns: [
      { expr: WEEK, as: 'Week No', total: 'group', sort: 'asc', show: false }, { expr: 'Format([When], "yyyy-mm-dd")', as: 'Week Of', total: 'min' },
      { table: 'Pharmacist Checks', field: 'ID', as: 'Checks', total: 'count' }, { expr: 'IIf([Outcome] = "Sold", 1, 0)', as: 'Sold', total: 'sum' },
      { expr: 'IIf([Outcome] = "Sold", 0, 1)', as: 'Not Sold', total: 'sum' },
      { expr: 'IIf([Outcome] = "Sold", [Pharmacist Checks].[Quantity], 0)', as: 'Packs Sold', total: 'sum' },
      { expr: 'DateDiff("d", [When], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 90'] },
    ] },
    'Pharmacist check log': { tables: ['Pharmacist Checks', 'Products', 'Staff'], columns: [
      { table: 'Pharmacist Checks', field: 'When', sort: 'desc' }, { table: 'Products', field: 'Name', as: 'Product' },
      { table: 'Pharmacist Checks', field: 'Quantity' }, { table: 'Pharmacist Checks', field: 'For Whom' }, { table: 'Pharmacist Checks', field: 'Outcome' },
      { table: 'Pharmacist Checks', field: 'Note' }, { expr: '[First Name] & " " & [Last Name]', as: 'Pharmacist' },
      { expr: 'DateDiff("d", [When], Date())', as: 'Days Ago', criteria: ['Between 0 And 30'], show: false },
    ] },
    'Stock to reorder': { tables: ['Products', 'Suppliers'], columns: [
      { table: 'Suppliers', field: 'Name', as: 'Supplier', sort: 'asc' }, { table: 'Products', field: 'Code', sort: 'asc' }, { table: 'Products', field: 'Name', as: 'Product' },
      { table: 'Products', field: 'Pack' }, { table: 'Products', field: 'Units in Stock' }, { table: 'Products', field: 'Reorder Level' }, { table: 'Products', field: 'Reorder Quantity' },
      { expr: '[Units in Stock] - [Reorder Level]', as: 'Above Reorder Level', criteria: ['<= 0'], show: false },
      { table: 'Products', field: 'Discontinued', criteria: ['No'], show: false },
    ] },
    'Takings by category': { tables: ['Sale Lines', 'Sales', 'Products', 'Categories'], columns: [
      { table: 'Categories', field: 'Name', as: 'Category', total: 'group' }, { table: 'Sale Lines', field: 'Quantity', as: 'Items', total: 'sum' },
      { expr: GROSS, as: 'Takings', total: 'sum', sort: 'desc' }, { expr: VAT_IN, as: 'VAT', total: 'sum' }, { expr: NET, as: 'Net', total: 'sum' },
      { expr: 'DateDiff("d", [When], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 364'] },
    ] },
    'Margin by category': { tables: ['Sale Lines', 'Sales', 'Products', 'Categories'], columns: [
      { table: 'Categories', field: 'Name', as: 'Category', total: 'group' }, { expr: NET, as: 'Net Sales', total: 'sum' },
      { expr: COST, as: 'Cost', total: 'sum' }, { expr: `Round(${NET} - ${COST}, 2)`, as: 'Margin', total: 'sum', sort: 'desc' },
      { expr: 'DateDiff("d", [When], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 364'] },
    ] },
    'Margin by product': { tables: ['Products', 'Categories'], columns: [
      { table: 'Categories', field: 'Name', as: 'Category', sort: 'asc' }, { table: 'Products', field: 'Code', sort: 'asc' }, { table: 'Products', field: 'Name', as: 'Product' },
      { table: 'Products', field: 'Retail Price' }, { expr: 'Round([Retail Price] / (1 + [Tax Rate]), 2)', as: 'Price before VAT' }, { table: 'Products', field: 'Cost Price' },
      { expr: 'Round([Retail Price] / (1 + [Tax Rate]) - [Cost Price], 2)', as: 'Margin' },
      { expr: 'Round(100 * ([Retail Price] / (1 + [Tax Rate]) - [Cost Price]) / ([Retail Price] / (1 + [Tax Rate])), 1)', as: 'Margin %' },
      { table: 'Products', field: 'Discontinued', criteria: ['No'], show: false },
    ] },
    'Takings by day': { tables: ['Sales'], columns: [
      { expr: 'Format([When], "yyyy-mm-dd")', as: 'Day', total: 'group', sort: 'desc' }, { table: 'Sales', field: 'ID', as: 'Sales', total: 'count' },
      { expr: 'Round(IIf([Payment] = "Cash", [Total], 0), 2)', as: 'Cash', total: 'sum' }, { expr: 'Round(IIf([Payment] = "Cash", 0, [Total]), 2)', as: 'Card', total: 'sum' },
      { table: 'Sales', field: 'Total', as: 'Takings', total: 'sum' }, { table: 'Sales', field: 'VAT', as: 'VAT Included', total: 'sum' },
      { expr: 'DateDiff("d", [When], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 13'] },
    ] },
    'Waste by month': { tables: ['Waste', 'Batches', 'Products'], columns: [
      { expr: 'Format([Written Off On], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Waste', field: 'Reason', total: 'group', sort: 'asc' },
      { table: 'Waste', field: 'Quantity', as: 'Units', total: 'sum' }, { expr: 'Round([Quantity] * [Unit Cost], 2)', as: 'Cost', total: 'sum' },
    ] },
    'Supplier orders to come': { tables: ['Supplier Orders', 'Suppliers'], columns: [
      { table: 'Supplier Orders', field: 'Number' }, { table: 'Suppliers', field: 'Name', as: 'Supplier' }, { table: 'Supplier Orders', field: 'Ordered On' },
      { table: 'Supplier Orders', field: 'Expected', sort: 'asc' }, { table: 'Supplier Orders', field: 'Status', criteria: ['Submitted'] },
    ] },
    'Returns awaiting credit': { tables: ['Supplier Returns', 'Suppliers'], columns: [
      { table: 'Supplier Returns', field: 'Number' }, { table: 'Suppliers', field: 'Name', as: 'Supplier' }, { table: 'Supplier Returns', field: 'Raised On', sort: 'asc' },
      { table: 'Supplier Returns', field: 'Collected On' }, { table: 'Supplier Returns', field: 'Status', criteria: ['<> "Credited"'] },
      { table: 'Supplier Returns', field: 'Credit Claimed' },
    ] },
    'Prescriptions by month': { tables: ['Prescriptions'], columns: [
      { expr: 'Format([Received On], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Prescriptions', field: 'ID', as: 'Prescriptions', total: 'count' },
      { table: 'Prescriptions', field: 'Items', as: 'Items', total: 'sum' }, { expr: 'IIf([For Delivery], 1, 0)', as: 'Delivered', total: 'sum' },
      { expr: 'IIf([Status] = "Not collected", 1, 0)', as: 'Not Collected', total: 'sum' },
      { expr: 'DateDiff("d", [Received On], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 365'] },
    ] },
    'Stock value': { tables: ['Products', 'Categories'], columns: [
      { table: 'Categories', field: 'Name', as: 'Category', total: 'group', sort: 'asc' }, { table: 'Products', field: 'ID', as: 'Lines', total: 'count' },
      { table: 'Products', field: 'Units in Stock', as: 'Units', total: 'sum' }, { expr: 'Round([Units in Stock] * [Cost Price], 2)', as: 'Value at Cost', total: 'sum' },
      { expr: 'Round([Units in Stock] * [Retail Price], 2)', as: 'Value at Retail', total: 'sum' },
    ] },
  },
  // The print templates: one document for each record of the table named.
  documents: [
    { name: 'Till receipt', table: 'Sales', paper: 'receipt-80', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'Receipt {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'When', label: 'Date' }, { field: 'Till' }, { field: 'Served By.First Name', label: 'Served by' }, { field: 'Payment', label: 'Paid by' },
      ] },
      { type: 'lines', table: 'Sale Lines', link: 'Sale', columns: [
        { field: 'Product.Name', label: 'Item' }, { field: 'Quantity', label: 'Qty', type: 'integer' }, { field: 'Unit Price', label: 'Price', type: 'currency' },
        { expr: 'Round([Quantity] * [Unit Price], 2)', as: 'Amount', type: 'currency' },
        { expr: 'IIf(Nz([Pharmacist Check], 0) = 1, "P", "")', as: 'P', label: ' ' },
      ] },
      { type: 'totals', rows: [
        { label: 'Total', expr: '[Amount]', strong: true }, { label: 'Paid', expr: '[Paid]' }, { label: 'Change', expr: '[Change]' },
        { label: 'VAT included', expr: '[VAT]' },
      ] },
      { type: 'text', text: 'P: a pharmacy medicine, sold after a word with the pharmacist.', small: true },
      { type: 'text', text: '{Business.Document Footer}', small: true },
    ] },
    { name: 'Purchase order', table: 'Supplier Orders', paper: 'a4', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'Purchase order {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Supplier.Name', label: 'To' }, { field: 'Number', label: 'Order number' },
        { field: 'Supplier.Address', label: 'Address' }, { field: 'Ordered On', label: 'Date' },
        { field: 'Supplier.City', label: 'Town' }, { field: 'Expected', label: 'Deliver by' },
        { field: 'Supplier.Postcode', label: 'Postcode' }, { field: 'Supplier.Account No', label: 'Our account' },
        { field: 'Ordered By', label: 'Ordered by' }, { field: 'Status' },
      ] },
      { type: 'lines', table: 'Supplier Order Lines', link: 'Order', columns: [
        { field: 'Product.Code', label: 'Code' }, { field: 'Product.Name', label: 'Product' }, { field: 'Product.Pack', label: 'Pack' },
        { field: 'Quantity', type: 'integer' }, { field: 'Unit Cost', type: 'currency' },
        { expr: 'Round([Quantity] * [Unit Cost], 2)', as: 'Line Total', label: 'Total', type: 'currency' },
      ] },
      { type: 'totals', rows: [{ label: 'Units', expr: '[Quantity]', type: 'integer' }, { label: 'Order total before VAT', expr: '[Line Total]', strong: true }] },
      { type: 'text', text: 'Please quote {Number} and our account number on your delivery note and invoice. Medicines with less than six months before their expiry date by agreement only.', small: true },
      { type: 'text', text: 'Deliver to {Business.Name}, {Business.Address}, {Business.City} {Business.Postcode}.', small: true },
    ] },
    { name: 'Delivery round sheet', table: 'Delivery Rounds', paper: 'a4', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'Delivery round {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Delivery Date', label: 'Date' }, { field: 'Driver' }, { field: 'Area' }, { field: 'Stops' }, { field: 'Status' },
      ] },
      { type: 'lines', table: 'Deliveries', link: 'Round', sort: 'Stop', columns: [
        { field: 'Stop' }, { field: 'Customer' }, { field: 'Customer.Address', label: 'Address' }, { field: 'Customer.Postcode', label: 'Postcode' },
        { field: 'Customer.Phone', label: 'Phone' }, { field: 'Customer.Access Notes', label: 'At the door' }, { field: 'Prescription Ref', label: 'Prescription' },
        { field: 'Bags', type: 'integer' }, { expr: '""', as: 'Signed' },
      ] },
      { type: 'totals', rows: [{ label: 'Bags to deliver', expr: '[Bags]', type: 'integer', strong: true }] },
      { type: 'text', text: 'Hand each bag only to the customer, their carer, or someone they have named to us. If no one is in, bring the bag back to the pharmacy and leave a card: never leave medicines on a doorstep or with a neighbour who has not been named.', small: true },
      { type: 'signatures', labels: ['Driver', 'Bags checked back in by'] },
    ] },
    { name: 'Expiry return note', table: 'Supplier Returns', paper: 'a4', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'Expiry return {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Supplier.Name', label: 'To' }, { field: 'Number', label: 'Return number' },
        { field: 'Supplier.Address', label: 'Address' }, { field: 'Raised On', label: 'Date' },
        { field: 'Supplier.City', label: 'Town' }, { field: 'Supplier.Account No', label: 'Our account' },
        { field: 'Supplier.Postcode', label: 'Postcode' }, { field: 'Status' },
      ] },
      { type: 'text', text: 'The goods below have reached, or are about to reach, their expiry date, or arrived damaged. They are unopened and are returned for credit under your returns terms.' },
      { type: 'lines', table: 'Waste', link: 'Return', columns: [
        { field: 'Batch.Product.Code', label: 'Code' }, { field: 'Batch.Product.Name', label: 'Product' }, { field: 'Batch.Batch No', label: 'Batch' },
        { field: 'Batch.Expiry Date', label: 'Expiry' }, { field: 'Quantity', type: 'integer' }, { field: 'Unit Cost', type: 'currency' },
        { expr: 'Round([Quantity] * [Unit Cost], 2)', as: 'Value', type: 'currency' },
      ] },
      { type: 'totals', rows: [{ label: 'Units', expr: '[Quantity]', type: 'integer' }, { label: 'Credit claimed', expr: '[Value]', strong: true }] },
      { type: 'text', text: 'Please send a credit note quoting {Number} and our account number.', small: true },
      { type: 'signatures', labels: ['Packed by', 'Collected by'] },
    ] },
  ],
  reports: [
    { name: 'Expiry check', title: 'Stock expiring in the next 30 days', query: 'Expiring in the next 30 days', group: 'Supplier', columns: ['Code', 'Product', 'Batch No', { field: 'Expiry Date', type: 'date' }, { field: 'Days Left', type: 'integer' }, { field: 'Quantity Left', type: 'integer' }, { field: 'Value at Cost', type: 'currency' }], totals: [{ field: 'Quantity Left', fn: 'sum' }, { field: 'Value at Cost', fn: 'sum' }] },
    { name: 'Prescriptions to chase', title: 'Prescriptions waiting over 7 days', query: 'Prescriptions waiting over 7 days', columns: ['Reference', 'Initials', { field: 'Items', type: 'integer' }, { field: 'Ready On', type: 'date' }, { field: 'Days Waiting', type: 'integer' }, 'Shelf'], totals: [{ field: 'Reference', fn: 'count' }, { field: 'Items', fn: 'sum' }] },
    { name: 'Delivery list', title: 'Deliveries today and tomorrow', query: 'Deliveries today and tomorrow', group: 'Driver', columns: [{ field: 'Delivery Date', type: 'date' }, { field: 'Stop', type: 'integer' }, 'Customer', 'Address', 'Postcode', 'Phone', 'Prescription', { field: 'Bags', type: 'integer' }], totals: [{ field: 'Customer', fn: 'count' }, { field: 'Bags', fn: 'sum' }] },
    { name: 'Stock to reorder', query: 'Stock to reorder', group: 'Supplier', columns: ['Code', 'Product', 'Pack', { field: 'Units in Stock', type: 'integer' }, { field: 'Reorder Level', type: 'integer' }, { field: 'Reorder Quantity', type: 'integer' }], totals: [{ field: 'Reorder Quantity', fn: 'sum' }] },
    { name: 'Takings by category', title: 'Takings by category, last 12 months', query: 'Takings by category', columns: ['Category', { field: 'Items', type: 'integer' }, { field: 'Takings', type: 'currency' }, { field: 'VAT', type: 'currency' }, { field: 'Net', type: 'currency' }], totals: [{ field: 'Items', fn: 'sum' }, { field: 'Takings', fn: 'sum' }, { field: 'VAT', fn: 'sum' }, { field: 'Net', fn: 'sum' }] },
    { name: 'Margin by category', title: 'Margin by category, last 12 months', query: 'Margin by category', columns: ['Category', { field: 'Net Sales', type: 'currency' }, { field: 'Cost', type: 'currency' }, { field: 'Margin', type: 'currency' }], totals: [{ field: 'Net Sales', fn: 'sum' }, { field: 'Cost', fn: 'sum' }, { field: 'Margin', fn: 'sum' }] },
    { name: 'Restricted sales by week', title: 'Pharmacy medicines by week, last 13 weeks', query: 'Restricted sales by week', columns: ['Week Of', { field: 'Checks', type: 'integer' }, { field: 'Sold', type: 'integer' }, { field: 'Not Sold', type: 'integer' }, { field: 'Packs Sold', type: 'integer' }], totals: [{ field: 'Checks', fn: 'sum' }, { field: 'Sold', fn: 'sum' }, { field: 'Not Sold', fn: 'sum' }, { field: 'Packs Sold', fn: 'sum' }] },
    { name: 'Pharmacist check log', title: 'Pharmacist checks, last 30 days', query: 'Pharmacist check log', columns: [{ field: 'When', type: 'date' }, 'Product', { field: 'Quantity', type: 'integer' }, 'For Whom', 'Outcome', 'Note', 'Pharmacist'], totals: [{ field: 'Product', fn: 'count' }] },
    { name: 'Waste by month', query: 'Waste by month', group: 'Month', columns: ['Reason', { field: 'Units', type: 'integer' }, { field: 'Cost', type: 'currency' }], totals: [{ field: 'Units', fn: 'sum' }, { field: 'Cost', fn: 'sum' }] },
    { name: 'Daily takings', title: 'Takings by day, last 14 days', query: 'Takings by day', columns: ['Day', { field: 'Sales', type: 'integer' }, { field: 'Cash', type: 'currency' }, { field: 'Card', type: 'currency' }, { field: 'Takings', type: 'currency' }, { field: 'VAT Included', type: 'currency' }], totals: [{ field: 'Sales', fn: 'sum' }, { field: 'Takings', fn: 'sum' }, { field: 'VAT Included', fn: 'sum' }] },
  ],
};

export const about = {
  name: 'Tansy Row Pharmacy',
  kind: 'Pharmacy counter',
  line: 'Counter sales, stock by batch and expiry, pharmacist checks, prescription collections and home deliveries for an independent pharmacy.',
  summary: [
    'For the shop side of an independent pharmacy: the medicines and toiletries sold over the counter, the stock behind them kept batch by batch with expiry dates, the orders to the wholesalers, and the deliveries made to customers who cannot get out. Tansy Row Pharmacy is invented: two pharmacists, a pharmacy technician, two counter assistants and two delivery drivers, open every day but Christmas Day.',
    'The records cover the year up to the day the file is made, and the next two days of deliveries. Cough and cold remedies sell in winter, hay fever tablets and sun cream in summer. A sale takes the batch nearest its expiry date first. Each Monday the technician takes off the shelf anything that runs out of date within the week, and on the first Monday of the month it goes back to the wholesaler on an expiry return note for credit; what the toiletries supplier will not take back is written off for disposal. Whatever has fallen to its reorder level is ordered: from the main wholesaler every weekday, from the second on Tuesdays and Thursdays, and from the toiletries supplier on Mondays.',
    'Some lines are sold only after a word with the pharmacist. Each of those sales has a record of the check: who it was for, which pharmacist, and whether it was sold. A few are not. The prescription log is kept deliberately small: initials, a reference, how many items, and whether they were collected, so the counter can see what is waiting on the shelf. It holds no medicines, doses or anything clinical, and the dispensary\'s own records belong in its own system.',
    'Every name is generic and every person is made up. Nothing here is advice about any medicine, and the pharmacy-only lines and pack limits are only examples: check the rules where you work.',
  ],
  suits: [
    'A pharmacy\'s counter and shop',
    'A health food or vitamin shop that tracks expiry dates',
    'A chemist and toiletries shop',
    'An optician\'s or audiologist\'s shop that sells products as well',
    'A veterinary practice\'s counter, with pet medicines and food',
    'A farm or garden shop that keeps batches with dates',
  ],
  tables: {
    Business: BUSINESS_ABOUT,
    Suppliers: { about: 'The wholesalers and suppliers the pharmacy buys from, with when they take orders and whether they take back out-of-date stock.', fields: {
      Name: 'The supplier\'s name, printed on purchase orders and return notes.', Kind: 'Wholesaler for medicines, or Toiletries for the supplier of toiletries, baby care and period care.',
      'Account No': 'The pharmacy\'s account number with the supplier, quoted on every order and return.', Address: 'The street address.', City: 'The town or city.', Postcode: 'The postcode.',
      Phone: 'The order line.', 'E-mail': 'Where orders and returns are sent.', 'Order Days': 'The days the pharmacy orders from this supplier, in words.',
      'Lead Days': 'How many days after the order the goods arrive.', 'Payment Days': 'How many days after the supplier\'s invoice payment is due.',
      'Takes Returns': 'Ticked when the supplier takes back out-of-date stock for credit. Stock from the others is written off for disposal.', Notes: 'Anything worth knowing about ordering from them.',
    } },
    Categories: { about: 'The groups the products are sold in, each with its VAT rate.', fields: {
      Name: 'The group\'s name. Each is used once.', Description: 'What the group holds.',
      'Tax Rate': 'The VAT rate as a fraction, taken on to each sale line: 0.2 for most goods, 0.05 for stop smoking products, 0 for period products, which carry no VAT in the UK.',
    } },
    Staff: { about: 'Everyone who works at the pharmacy: the pharmacists, the technician, the counter assistants and the drivers.', fields: {
      'First Name': 'Their first name, printed on till receipts.', 'Last Name': 'Their family name.', Role: 'Pharmacist, Pharmacy technician, Counter assistant or Driver.',
      Phone: 'Their phone number.', 'E-mail': 'Their work e-mail address.', Started: 'The day they started.',
    } },
    'Supplier Orders': { about: 'The orders sent to suppliers, one record each, with their lines in Supplier Order Lines.', fields: {
      Number: 'The order\'s number, printed on the purchase order and quoted by the supplier: PO-2026-0042, a new run each year.', Supplier: 'Who the order went to.',
      'Ordered By': 'Who placed it.', 'Ordered On': 'The day it was sent.', Expected: 'The day the goods should arrive.', 'Received On': 'The day they arrived; empty until then.',
      Status: 'Submitted until the goods arrive, then Received.',
    } },
    'Supplier Returns': { about: 'Out-of-date stock sent back to a wholesaler for credit, one record for each expiry return note. Its lines are the Waste records that point at it.', fields: {
      Number: 'The return\'s number, printed on the note: RTN-2026-0007.', Supplier: 'The wholesaler the stock goes back to.', 'Raised On': 'The day the note was made out.',
      'Collected On': 'The day the driver took it away; empty until then.', Status: 'Awaiting collection, Awaiting credit, or Credited.',
      'Credit Claimed': 'The value of the stock returned, at cost: the total of the note.', 'Credit Note': 'The supplier\'s credit note reference, once it arrives.',
      'Credited On': 'The day the credit arrived.',
    } },
    Products: { about: 'Everything on the shelves, one record for each line, under its generic name. What is in stock is the sum of its batches.', fields: {
      Code: 'The pharmacy\'s own code for the line. Each is used once.', Name: 'The product\'s generic name and pack, as the till and the receipt show it.',
      Category: 'The group it is sold in, which gives its VAT rate.', Supplier: 'Who it is ordered from.', Pack: 'The pack size or contents.',
      'Cost Price': 'What one pack costs from the supplier, before VAT.', 'Retail Price': 'The shelf price of one pack, VAT included.',
      'Units in Stock': 'Packs on the shelf now: the sum of Quantity Left over its batches.', 'Reorder Level': 'When stock falls to this, it goes on the next order.',
      'Reorder Quantity': 'How many packs to order each time.', 'Pharmacist Check': 'Ticked for a pharmacy-only line: the pharmacist speaks to the customer before it is sold, and the check is recorded.',
      'Max per Sale': 'The most packs sold in one sale, where the pharmacy keeps a limit. Empty for no limit.', Discontinued: 'Ticked for a line no longer stocked.',
    } },
    'Supplier Order Lines': { about: 'The products on each supplier order.', fields: {
      Order: 'The order the line belongs to.', Product: 'What is ordered.', Quantity: 'How many packs.', 'Unit Cost': 'The cost of one pack on this order.',
    } },
    Batches: { about: 'Stock as it arrived: one record for each delivery of a product, with its batch number and expiry date, and how much of it is left.', fields: {
      Product: 'The product.', 'Batch No': 'The batch number printed on the pack.', 'Expiry Date': 'The date printed on the pack after which it must not be sold.',
      'Received On': 'The day it arrived.', 'Quantity Received': 'How many packs arrived.', 'Quantity Left': 'How many of them are still on the shelf. A sale takes from the batch that expires first.',
    } },
    Waste: { about: 'Stock written off: out of date, or damaged. Out-of-date stock from a supplier that takes returns points at the return note it went back on.', fields: {
      Batch: 'The batch written off, which gives the product and its expiry date.', Return: 'The expiry return note it went back to the supplier on. Empty when it was disposed of.',
      'Written Off On': 'The day it came off the shelf.', Quantity: 'How many packs.', 'Unit Cost': 'The cost of one pack, for the value of the loss or the credit.',
      Reason: 'Out of date, returned to supplier; Out of date, for disposal; Damaged in delivery, returned to supplier; or Damaged in store.',
    } },
    Sales: { about: 'The till: one record for each sale, with its lines in Sale Lines. Each prints as a till receipt.', fields: {
      Number: 'The receipt number, in time order, a new run each year: RCP-2026-00042.', When: 'The date and time of the sale.', Till: 'Which till took it.',
      'Served By': 'Who served the customer.', Payment: 'Card or Cash.', Total: 'What the customer paid for the goods, VAT included: the sum of the lines.',
      VAT: 'The VAT within the total, worked out on each line and added up.', Paid: 'What the customer handed over: the total by card, or the cash given.',
      Change: 'The change given from cash.',
    } },
    'Sale Lines': { about: 'The products on each sale.', fields: {
      Sale: 'The sale the line belongs to.', Product: 'What was sold.', Quantity: 'How many packs.', 'Unit Price': 'The shelf price of one pack at the time, VAT included.',
      'Tax Rate': 'The VAT rate of the line, taken from the product\'s group when it was sold.', 'Unit Cost': 'What one pack cost the pharmacy, kept for the margin.',
      'Pharmacist Check': 'Ticked for a pharmacy-only line, so the receipt marks it.',
    } },
    'Pharmacist Checks': { about: 'A record of every request for a pharmacy-only line: the pharmacist spoke to the customer and decided whether to sell. The words are short and practical, never clinical.', fields: {
      When: 'The date and time of the check.', Product: 'The line asked for.', Quantity: 'How many packs were asked for.', Pharmacist: 'The pharmacist who made the check.',
      Sale: 'The sale it was sold on. Empty when it was not sold.', 'For Whom': 'Self, or Someone at home.', Outcome: 'Sold, or Not sold.',
      Note: 'A few plain words where there is something to say, such as Chose a different product.',
    } },
    Prescriptions: { about: 'A minimal log of prescriptions waiting to be collected or delivered: initials, a reference and a count of items. It holds nothing clinical; the dispensary keeps its own records.', fields: {
      Reference: 'The pharmacy\'s reference for the prescription bag: RX-2026-00042.', Initials: 'The customer\'s initials, to find the bag on the shelf.',
      'Received On': 'The day the prescription came in.', Items: 'How many items are in the bag.', 'Ready On': 'The day the bag was ready.',
      'Collected On': 'The day it was collected or delivered; empty while it waits.', Status: 'Being made up, Ready, Collected, Delivered, or Not collected (back to stock after 28 days).',
      Shelf: 'Where the bag waits: the letter of the family name and a shelf number.', 'For Delivery': 'Ticked when it goes out on a delivery round instead of being collected.',
    } },
    'Delivery Customers': { about: 'Customers who cannot get to the pharmacy and have their prescriptions delivered, with the day their round comes.', fields: {
      'Customer No': 'The pharmacy\'s number for the customer: DC-0012.', 'First Name': 'Their first name.', 'Last Name': 'Their family name.',
      Address: 'Where to deliver.', City: 'The town.', Postcode: 'The postcode, which the driver plans the round by.', Phone: 'The number to ring before or if no one answers.',
      Area: 'North or South: which weekday round they are on.', 'Round Day': 'The day of the week their delivery comes.', 'Every Weeks': 'How often: 1 every week, 2 every fortnight, 4 every four weeks.',
      'Access Notes': 'What the driver should know at the door, in plain words.', Active: 'Ticked while they have deliveries.', Since: 'The day deliveries began.',
    } },
    'Delivery Rounds': { about: 'One record for each driver\'s round on each day, with its stops in Deliveries. Each prints as a round sheet.', fields: {
      Number: 'The round\'s number: RND-2026-0123.', 'Delivery Date': 'The day of the round.', Driver: 'Who drives it.', Area: 'North or South on a weekday, All at the weekend.',
      Stops: 'How many stops it has.', Bags: 'How many bags go out on it.', Status: 'Planned, or Done once the driver is back.',
    } },
    Deliveries: { about: 'Each stop on a round: who, which prescription bag, and what happened.', fields: {
      Round: 'The round the stop is on.', Stop: 'Its place in the round.', Customer: 'Who it is for.', 'Prescription Ref': 'The reference of the bag, as in Prescriptions.',
      Bags: 'How many bags.', Status: 'Planned, Delivered, or Not in, card left (it goes again the next day).', 'Delivered At': 'When it was handed over.',
      'Received By': 'Who took it: Customer, Carer or Family member.', Notes: 'Anything the driver should know about this stop.',
    } },
  },
  queries: {
    'Expiring in the next 30 days': 'Batches still on the shelf that run out of date in the next 30 days, by supplier, with how many packs and their value at cost, and whether the supplier takes them back. Use it to put short-dated stock at the front, and to plan the next return.',
    'Prescriptions waiting over 7 days': 'Bags that have been ready for collection for more than a week, oldest first, with the shelf they are on. The counter rings or texts the customer about them.',
    'Deliveries today and tomorrow': 'Every stop on today\'s and tomorrow\'s rounds, by driver and stop, with the address, phone and bag reference.',
    'Restricted sales by week': 'Pharmacist checks on pharmacy-only lines over the last 13 weeks, a line a week: how many checks, how many sold and not sold, and the packs sold. Week Of is the first day in the week a check was made.',
    'Pharmacist check log': 'Every pharmacist check in the last 30 days, newest first: the product, who it was for, which pharmacist, and the outcome.',
    'Stock to reorder': 'Lines at or below their reorder level, by supplier, with how many to order. Discontinued lines are left out.',
    'Takings by category': 'What each group of products took over the last 12 months, with the VAT within it and the takings before VAT.',
    'Margin by category': 'Sales before VAT, their cost and the margin left for each group over the last 12 months, the largest margin first.',
    'Margin by product': 'Every line\'s shelf price, its price before VAT, its cost, and the margin on one pack in money and as a percentage. Use it when setting prices.',
    'Takings by day': 'The till each day for the last fortnight: the number of sales, cash and card, the total, and the VAT within it.',
    'Waste by month': 'Stock written off each month, by reason, in packs and at cost.',
    'Supplier orders to come': 'Orders sent and not yet arrived, by the day they are expected.',
    'Returns awaiting credit': 'Return notes not yet credited, with the credit claimed. The wholesalers take six weeks or more; chase any over ten weeks old.',
    'Prescriptions by month': 'How many prescriptions came in each month over the last year, with their items, how many went out for delivery, and how many were never collected.',
    'Stock value': 'Lines, packs on the shelf, and their value at cost and at shelf price, by group.',
  },
  reports: {
    'Expiry check': 'The list for the weekly date check: every batch running out in the next 30 days, a page for each supplier, with the value at cost.',
    'Prescriptions to chase': 'Bags waiting over a week, with the shelf they are on, for the counter to ring about.',
    'Delivery list': 'Today\'s and tomorrow\'s stops for each driver, with the number of stops and bags.',
    'Stock to reorder': 'What is due on the next order, a page for each supplier.',
    'Takings by category': 'Takings, VAT and net sales by group for the last 12 months, with totals. For the owner and the accountant.',
    'Margin by category': 'Net sales, cost and margin by group for the last 12 months, with totals.',
    'Restricted sales by week': 'Pharmacy-only lines asked for, sold and not sold, week by week, for the last 13 weeks.',
    'Pharmacist check log': 'The last 30 days of pharmacist checks, for the pharmacist to look over and sign off.',
    'Waste by month': 'Stock written off, month by month and by reason, at cost.',
    'Daily takings': 'The last fortnight\'s till, a line a day, with cash and card, for cashing up and banking.',
  },
  documents: {
    'Till receipt': 'The receipt the till prints for each sale, on an 80 mm roll: each item with its price, the total, what was paid and the change, and the VAT included. Pharmacy-only lines are marked P. Numbered RCP-2026-00042.',
    'Purchase order': 'Sent to a supplier: the lines to send, the pack, quantity and cost, and the day they are wanted, with the pharmacy\'s account number. Numbered PO-2026-0042. Every order prints, received ones too; print the one on screen from the Supplier Orders form.',
    'Delivery round sheet': 'The sheet a driver takes out: one for each driver on each day, with each stop in order, the address, the phone, what to know at the door, the bag reference, and a column for the customer to sign.',
    'Expiry return note': 'Goes in the box of out-of-date stock sent back to a wholesaler: each product, batch, expiry date and quantity, and the credit claimed at cost. It is the statement the supplier\'s credit note is checked against. Numbered RTN-2026-0007.',
  },
  tutorial: [
    { title: 'Serve a customer and print the receipt', steps: [
      'Open the Sales form and press New. Type the next receipt Number, the date and time in When, choose who served in Served By, and set Payment to Card or Cash.',
      'In Sale Lines, add a line for each product: choose the Product, type the Quantity, and copy its Retail Price into Unit Price, its group\'s Tax Rate, and its Cost Price into Unit Cost. Tick Pharmacist Check for a pharmacy-only line.',
      'Type the Total (the sum of the lines), the VAT within it, what was handed over in Paid, and the Change.',
      'Take the packs off the batch that runs out first: open the Batches form, find the product\'s batch with the earliest Expiry Date, and lower its Quantity Left. Lower the product\'s Units in Stock to match.',
      'Open the print template Till receipt from Print templates, choose the sale, and press Print.',
    ] },
    { title: 'Record a pharmacist check', steps: [
      'When a customer asks for a line with Pharmacist Check ticked in Products, the pharmacist speaks to them before anything is sold.',
      'Open the Pharmacist Checks form and press New. Type When, choose the Product and the Pharmacist, type the Quantity asked for, and set For Whom.',
      'Set Outcome to Sold and choose the Sale it went on, or to Not sold, with a short Note such as Chose a different product.',
      'Print the Pharmacist check log report each month for the pharmacist to look over, and the Restricted sales by week report to see the pattern.',
    ] },
    { title: 'Order stock and book it in', steps: [
      'Print the Stock to reorder report on the supplier\'s order day.',
      'Open the Supplier Orders form and press New. Give it the next PO number, choose the Supplier and who ordered it, type Ordered On and Expected, and leave Status as Submitted. Add each product and quantity in Supplier Order Lines.',
      'Print the Purchase order template for it from Print templates, or send it to the supplier as a PDF.',
      'When the goods arrive, open the Batches form and add a batch for each product with the Batch No and Expiry Date printed on the packs and the Quantity Received; set Quantity Left to the same. Raise the product\'s Units in Stock. Then set the order\'s Received On and Status to Received.',
    ] },
    { title: 'Do the weekly date check and the monthly return', steps: [
      'Each Monday, print the Expiry check report and take off the shelf anything running out within the week.',
      'For each batch taken off, open the Waste form and press New: choose the Batch, type the date, the Quantity and the Unit Cost, and the Reason. Set the batch\'s Quantity Left to nought and lower Units in Stock.',
      'On the first Monday of the month, open the Supplier Returns form and add a return for each wholesaler that takes returns, with the next RTN number. Choose that return in Return on each of its Waste records.',
      'Type the total value in Credit Claimed, print the Expiry return note template, and put it in the box. When the credit note arrives, type its reference, Credited On, and set Status to Credited. The Returns awaiting credit query shows what is still owed.',
    ] },
    { title: 'Look after prescription collections', steps: [
      'When a prescription bag is made up, open the Prescriptions form and press New: the next RX reference, the customer\'s initials, Received On, the number of Items, Ready On and the Shelf. Status is Ready.',
      'When it is collected, type Collected On and set Status to Collected.',
      'Each morning open the Prescriptions waiting over 7 days query, or print the Prescriptions to chase report, and contact those customers.',
      'A bag not collected after 28 days goes back to the dispensary: set Status to Not collected.',
    ] },
    { title: 'Plan and run the delivery rounds', steps: [
      'Open the Delivery Customers form to see who is due: each customer\'s Round Day, Area and how often (Every Weeks).',
      'Open the Delivery Rounds form and press New for each driver\'s round: the next RND number, the Delivery Date, the Driver and the Area. Add each stop in Deliveries with the Stop number, the Customer, the Prescription Ref and the Bags. Mark those prescriptions For Delivery.',
      'Print the Delivery round sheet template for each round, or the Delivery list report for both days at once.',
      'When the driver is back, set each stop\'s Status to Delivered with Delivered At and Received By, or to Not in, card left and add it to the next day\'s round. Set the round\'s Status to Done, and the delivered prescriptions to Delivered.',
    ] },
    { title: 'Cash up and look at the month', steps: [
      'At the end of each day, print the Daily takings report and check the cash and card against the till.',
      'At the month\'s end, print Takings by category and Margin by category, and open Margin by product when reviewing prices.',
      'Print Waste by month to see what is being lost to dates and damage, and the Stock value query for the stock take.',
    ] },
  ],
  notes: [
    'Units in Stock is the sum of Quantity Left over a product\'s batches. Data Files does not work it out by itself: when you sell, receive or write off stock, change the batch and the product together.',
    'A sale takes from the batch that runs out first. Keep the shelf in that order too, so the oldest packs go first.',
    'Prices in Products and Sale Lines include VAT, as shelf prices do. The VAT on a receipt is worked out within each line, rounded to the penny, and added up. Period products carry no VAT and stop smoking products 5 percent in the UK; check the rates where you are.',
    'The Prescriptions table is a collection log, not a dispensary record. Keep it to initials, a reference and a count of items, and keep anything clinical out of this file.',
    'Which lines need a pharmacist\'s check, and any limit on packs in one sale, are set on each product. The sample\'s choices are examples only; follow the rules where you work.',
    'Each print template prints every record of its table: every sale has a receipt and every round a sheet. Print the one on screen from its form, or choose the records to print.',
    'The dispensary\'s own income, from prescriptions, is not in this file: the takings are the counter\'s.',
  ],
  faq: [
    { q: 'How do I see what is going out of date?', a: 'Open the Expiring in the next 30 days query, or print the Expiry check report. It lists batches with packs left and fewer than 31 days to their expiry date, by supplier.' },
    { q: 'Why does a product have more than one batch?', a: 'Each delivery is a batch of its own, with its own expiry date. Units in Stock is what is left over all of them.' },
    { q: 'How do I reprint a customer\'s receipt?', a: 'Open the Sales form, find the sale by its Number or its time, and print the Till receipt template for it.' },
    { q: 'Where is the VAT on a receipt?', a: 'Shelf prices include VAT, so the receipt shows the total paid and, below it, the VAT included in that total. The Takings by category query shows the same split for the year.' },
    { q: 'What happens to stock the toiletries supplier will not take back?', a: 'It is written off in Waste with the reason Out of date, for disposal, and no return note. Waste by month shows the cost.' },
    { q: 'Can I add a customer who collects for someone else?', a: 'The collection log only keeps initials. If you need more, keep it in the dispensary\'s own system rather than here.' },
    { q: 'How do I change a driver\'s round?', a: 'Change the customer\'s Area or Round Day in Delivery Customers. Rounds already made stay as they were; the next ones follow the new day.' },
  ],
  empty: 'Start with Business: the pharmacy\'s name, address, VAT number and the words at the foot of a receipt. Then Suppliers, Categories with their VAT rates, and Staff. Add Products with their supplier, prices and reorder levels, ticking Pharmacist Check where it applies. Enter the stock you hold as one Batch per product with its expiry date, and set Units in Stock to match. Add Delivery Customers if you deliver. Sales, Pharmacist Checks, Prescriptions, Supplier Orders, Waste and rounds come in as you trade.',
  adapt: [
    'Take a deposit or keep an account for a care home: add an Accounts table and an Account field on Sales, and a statement template on Accounts with its sales as lines.',
    'Add a second till: type Till 2 on its sales, and group the Takings by day query by Till as well.',
    'Run promotions: add a Promotions table (product, price, from, to) and use its price on the sale line while it runs.',
    'Track stock in a back room: add a Location field to Batches, Shelf or Store room, and show it on the Expiry check report.',
    'Count stock: add a Stock Counts table (product, date, counted) and a query comparing it with Units in Stock.',
    'Keep a fridge temperature log: add a Fridge Log table with the date, the reading and who took it, and a query for readings outside your range.',
  ],
};

/**
 * The range: [category, description, VAT rate, supplier, season, code, [name, pack, cost, retail, demand, check, max per sale]...].
 * Generic names only. Demand is packs a day across a typical week, before the season.
 */
const RANGE = [
  ['Pain relief', 'Tablets, gels and patches for everyday aches', 0.2, 'W1', null, 'PN', [
    ['Paracetamol tablets', 'pack of 16', 0.32, 0.99, 2.2, false, 2], ['Paracetamol tablets, large pack', 'pack of 32', 0.7, 1.89, 0.9, true, 2],
    ['Ibuprofen tablets', 'pack of 16', 0.38, 1.19, 1.8, false, 2], ['Ibuprofen tablets, large pack', 'pack of 24', 0.75, 2.29, 0.6, true, 2],
    ['Ibuprofen gel', '50 g tube', 1.6, 3.99, 0.45, false, null], ['Diclofenac gel', '30 g tube', 2.1, 4.99, 0.3, false, null],
    ['Heat patches', 'pack of 4', 1.7, 3.99, 0.25, false, null], ['Hot and cold gel pack', 'single', 2.2, 4.49, 0.08, false, null],
  ]],
  ['Coughs and colds', 'Syrups, lozenges, sprays and rubs', 0.2, 'W1', 'winter', 'CC', [
    ['Dry cough syrup', '150 ml bottle', 1.9, 4.49, 0.7, false, null], ['Chesty cough syrup', '150 ml bottle', 1.9, 4.49, 0.7, false, null],
    ['Simple linctus', '200 ml bottle', 0.95, 2.49, 0.35, false, null], ['Throat lozenges, honey and lemon', 'pack of 24', 1.1, 2.79, 1.1, false, null],
    ['Sore throat spray', '30 ml spray', 2.3, 5.49, 0.3, false, null], ['Decongestant nasal spray', '10 ml spray', 1.4, 3.49, 0.5, false, null],
    ['Saline nasal spray', '20 ml spray', 1.8, 4.29, 0.2, false, null], ['Menthol vapour rub', '50 g jar', 1.5, 3.69, 0.4, false, null],
    ['Cold and flu relief capsules', 'pack of 16', 1.2, 3.29, 0.8, false, 2], ['Steam inhaler capsules', 'pack of 10', 1.6, 3.79, 0.07, false, null],
    ['Ear wax drops', '10 ml bottle', 1.3, 3.29, 0.05, false, null], ['Chesty cough syrup for children', '100 ml bottle', 1.6, 3.99, 0.08, false, null],
  ]],
  ['Allergy', 'Hay fever tablets, sprays and eye drops', 0.2, 'W2', 'allergy', 'AL', [
    ['Cetirizine tablets', 'pack of 30', 0.6, 2.49, 0.9, false, null], ['Loratadine tablets', 'pack of 30', 0.65, 2.49, 0.7, false, null],
    ['Allergy nasal spray', '100 sprays', 2.4, 5.99, 0.3, true, null], ['Allergy eye drops', '10 ml bottle', 1.8, 4.49, 0.25, false, null], ['Antihistamine cream', '25 g tube', 1.3, 3.29, 0.04, false, null],
  ]],
  ['Digestive health', 'Indigestion, upset stomach and rehydration', 0.2, 'W1', null, 'DG', [
    ['Antacid tablets', 'pack of 48', 1.1, 2.99, 0.65, false, null], ['Indigestion liquid', '300 ml bottle', 1.7, 4.29, 0.35, false, null],
    ['Omeprazole tablets', 'pack of 14', 1.5, 4.99, 0.3, true, null], ['Oral rehydration sachets', 'pack of 6', 1.8, 4.49, 0.25, false, null],
    ['Loperamide capsules', 'pack of 6', 0.9, 2.79, 0.3, false, null], ['Senna tablets', 'pack of 20', 0.8, 2.19, 0.2, false, null],
    ['Peppermint oil capsules', 'pack of 20', 2.8, 6.49, 0.06, false, null], ['Glucose tablets', 'pack of 10', 0.5, 1.29, 0.04, false, null],
    ['Travel sickness tablets', 'pack of 12', 1.2, 2.99, 0.06, false, null], ['Water purification tablets', 'pack of 50', 2.2, 5.49, 0.02, false, null],
  ]],
  ['Skin and first aid', 'Creams, eye drops, plasters and dressings', 0.2, 'W2', null, 'SK', [
    ['Hydrocortisone cream', '15 g tube', 1.2, 3.49, 0.25, true, null], ['Clotrimazole cream', '20 g tube', 1.5, 3.99, 0.18, true, null],
    ['Aciclovir cold sore cream', '2 g tube', 1.0, 3.29, 0.3, false, null], ['Antiseptic cream', '30 g tube', 1.1, 2.79, 0.35, false, null],
    ['Insect bite cream', '20 g tube', 1.3, 3.29, 0.2, false, null], ['Emollient cream', '500 g tub', 3.2, 7.49, 0.25, false, null],
    ['Chloramphenicol eye drops', '10 ml bottle', 2.1, 5.49, 0.15, true, null], ['Fabric plasters, assorted', 'pack of 40', 0.9, 2.49, 0.55, false, null],
    ['Sterile dressings', 'pack of 5', 1.4, 3.49, 0.12, false, null], ['Crepe bandage', '7.5 cm x 4 m', 0.7, 1.99, 0.12, false, null],
    ['Digital thermometer', 'single', 3.5, 7.99, 0.05, false, null], ['Corn plasters', 'pack of 9', 0.9, 2.49, 0.03, false, null],
    ['Verruca gel', '5 g tube', 2.0, 4.99, 0.03, false, null], ['Burn gel', '25 g tube', 1.4, 3.49, 0.03, false, null],
  ]],
  ['Vitamins', 'Vitamins and supplements', 0.2, 'W2', null, 'VT', [
    ['Vitamin D tablets', 'pack of 90', 1.6, 4.99, 0.4, false, null], ['Multivitamin tablets', 'pack of 30', 1.4, 3.99, 0.35, false, null],
    ['Vitamin C effervescent tablets', 'tube of 20', 0.9, 2.49, 0.3, false, null], ['Folic acid tablets', 'pack of 90', 0.9, 2.99, 0.15, false, null],
    ['Cod liver oil capsules', 'pack of 60', 2.2, 5.49, 0.07, false, null], ['Magnesium tablets', 'pack of 60', 1.8, 4.49, 0.04, false, null],
  ]],
  ['Toiletries', 'Dental care, hair, body and sun care', 0.2, 'T', null, 'TL', [
    ['Toothpaste', '75 ml tube', 0.7, 1.79, 0.7, false, null], ['Toothbrush, medium', 'single', 0.45, 1.49, 0.4, false, null],
    ['Mouthwash', '500 ml bottle', 1.1, 2.99, 0.3, false, null], ['Shampoo', '250 ml bottle', 1.1, 2.99, 0.25, false, null],
    ['Shower gel', '250 ml bottle', 0.9, 2.49, 0.25, false, null], ['Roll-on deodorant', '50 ml', 0.85, 2.29, 0.35, false, null],
    ['Hand cream', '75 ml tube', 1.2, 2.99, 0.2, false, null], ['Lip balm', '4 g stick', 0.6, 1.79, 0.3, false, null],
    ['Sun cream SPF 30', '200 ml bottle', 3.4, 7.99, 0.3, false, null], ['Sun cream SPF 50 for children', '200 ml bottle', 3.9, 8.99, 0.22, false, null],
    ['Cotton buds', 'pack of 200', 0.45, 1.29, 0.2, false, null],
  ]],
  ['Baby care', 'Nappies, wipes and creams', 0.2, 'T', null, 'BB', [
    ['Nappies, size 4', 'pack of 30', 3.8, 7.99, 0.3, false, null], ['Baby wipes', 'pack of 64', 0.7, 1.79, 0.45, false, null],
    ['Nappy cream', '100 g tub', 1.4, 3.49, 0.2, false, null], ['Baby bath', '500 ml bottle', 1.5, 3.79, 0.08, false, null],
  ]],
  ['Period care', 'Sanitary towels, tampons and liners', 0, 'T', null, 'PC', [
    ['Sanitary towels', 'pack of 14', 0.9, 2.29, 0.35, false, null], ['Tampons, regular', 'pack of 20', 1.1, 2.79, 0.3, false, null],
    ['Panty liners', 'pack of 30', 0.7, 1.79, 0.2, false, null],
  ]],
  ['Stop smoking', 'Nicotine patches, gum and lozenges', 0.05, 'W1', null, 'SS', [
    ['Nicotine patches', 'pack of 7', 6.5, 14.99, 0.18, false, null], ['Nicotine gum', 'pack of 105', 7.8, 17.49, 0.12, false, null],
    ['Nicotine lozenges', 'pack of 72', 6.2, 13.99, 0.1, false, null],
  ]],
];

/** The suppliers: weekdays they take orders (0 Sunday), days to deliver, and whether they take back out-of-date stock. */
const SUPPLIERS = [
  { key: 'W1', name: 'Alder Vale Pharma Wholesale', kind: 'Wholesaler', account: 'TRP-0041', street: 'Unit 4, Quarry Road Trading Estate', city: 'Wakefield', postcode: 'WF2 7AB', words: 'Monday to Friday', days: [1, 2, 3, 4, 5], lead: 1, returns: true, pay: 30, notes: 'The main wholesaler for medicines. Orders sent by 5 pm arrive the next weekday morning. Takes back unopened out-of-date stock, and packs damaged in delivery, for credit on a return note.' },
  { key: 'W2', name: 'Brightwater Medical Distribution', kind: 'Wholesaler', account: 'TANSY-118', street: '7 Canal Walk', city: 'Bradford', postcode: 'BD1 4DE', words: 'Tuesday and Thursday', days: [2, 4], lead: 2, returns: true, pay: 30, notes: 'The second wholesaler: allergy, skin care, first aid and vitamins. Orders arrive two working days later. Credit for returns takes about six weeks.' },
  { key: 'T', name: 'Sandstone Toiletry Supplies', kind: 'Toiletries', account: 'C-20734', street: '31 Mill Lane', city: 'Manchester', postcode: 'M4 6FG', words: 'Monday', days: [1], lead: 3, returns: false, pay: 45, notes: 'Toiletries, baby care and period care, delivered weekly. Does not take back out-of-date stock.' },
];

/** How much more or less a season's lines sell in each month (January first). */
const SEASONS = {
  winter: [1.7, 1.5, 1.2, 0.9, 0.7, 0.55, 0.5, 0.55, 0.85, 1.2, 1.5, 1.75],
  allergy: [0.3, 0.35, 0.6, 1.2, 1.9, 2.3, 2.0, 1.4, 0.8, 0.45, 0.3, 0.3],
  sun: [0.15, 0.15, 0.35, 0.8, 1.6, 2.4, 2.8, 2.3, 0.8, 0.3, 0.15, 0.15],
};
const SUN = new Set(['Sun cream SPF 30', 'Sun cream SPF 50 for children', 'Insect bite cream']);
const STREETS = ['Tansy Row', 'Mill Lane', 'Chapel Street', 'Orchard Way', 'Beech Grove', 'Linden Close', 'Park View', 'Quarry Hill', 'Church Walk', 'Station Road', 'Cedar Avenue', 'Holly Bank'];
const ACCESS = [null, null, null, 'Ring and wait: slow to the door', 'Side door, round the back', 'Knock loudly, the bell does not work', 'Dog in the house, wait for it to be shut away', 'Ring the phone number from the gate', 'Ground floor flat, buzz number 2', 'Carer usually in on weekday mornings'];
const NOT_SOLD = ['Advised to speak to their doctor first', 'Chose a different product', 'Has some at home already', 'Bought the same earlier this week'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Fill a Tansy Row Pharmacy database made from `spec`. `r` is random(), `cal` calendar(). Answers counts. */
export function fill(base, { r, cal, days = 365 }) {
  const counts = {};
  const add = (table, values) => { counts[table] = (counts[table] || 0) + 1; return base.insert(table, values); };
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const weekdays = new Map();
  const wd = (d) => { if (!weekdays.has(d)) weekdays.set(d, cal.weekday(d)); return weekdays.get(d); };
  // Open every day but Christmas Day.
  const closed = (d) => { const a = cal.at(d); return a.getMonth() === 11 && a.getDate() === 25; };
  const nextOpen = (d) => { while (closed(d)) d++; return d; };
  // Suppliers deliver Monday to Friday.
  const nextDelivery = (d) => { while (closed(d) || wd(d) === 0 || wd(d) === 6) d++; return d; };
  // Numbers in date order, a new run each year: PO-2026-0042.
  const runs = {};
  const numbered = (prefix, d, width = 4) => {
    const y = cal.at(d).getFullYear();
    runs[prefix + y] = (runs[prefix + y] || 0) + 1;
    return `${prefix}-${y}-${pad(runs[prefix + y], width)}`;
  };
  const initials = (first, last) => `${first[0]}.${last[0]}.`;

  add('Business', businessRecord({
    name: 'Tansy Row Pharmacy', domain: 'tansyrow.example', phone: '020 7946 0420',
    address: { Address: '18 Tansy Row', City: 'Leeds', Postcode: 'LS6 2QR', Country: 'United Kingdom' },
    terms: 'Account customers pay within 30 days of the invoice date.',
    footer: 'Thank you for shopping with us. Medicines cannot be returned once sold unless faulty; other goods may be returned unused within 14 days with this receipt. Open Monday to Saturday 9 am to 6 pm, Sunday 10 am to 4 pm.',
  }));

  // Staff: two pharmacists (one on weekdays, one at weekends), a technician, the counter and two drivers.
  const ROLES = ['Pharmacist', 'Pharmacist', 'Pharmacy technician', 'Counter assistant', 'Counter assistant', 'Driver', 'Driver'];
  const staff = ROLES.map((role, i) => {
    const p = person(r, { domain: 'tansyrow.example' });
    return { id: add('Staff', { ...p, Role: role, Phone: `020 7946 0${430 + i}`, Started: cal.day(-r.int(200, 4000)) }), role };
  });
  const [chief, weekend, technician, counterA, counterB, driverA, driverB] = staff.map((s) => s.id);
  const pharmacistOn = (d) => (wd(d) >= 1 && wd(d) <= 5 ? chief : weekend);
  const servedBy = (d) => r.weighted([[counterA, 4], [counterB, 4], [technician, 1.5], [pharmacistOn(d), 1.5]]);

  // Suppliers.
  const suppliers = {};
  for (const s of SUPPLIERS) {
    s.id = add('Suppliers', {
      Name: s.name, Kind: s.kind, 'Account No': s.account, Address: s.street, City: s.city, Postcode: s.postcode, Phone: phoneFor(r, 'United Kingdom'),
      'E-mail': `orders@${s.name.toLowerCase().replace(/[^a-z]+/g, '')}.example`, 'Order Days': s.words, 'Lead Days': s.lead, 'Payment Days': s.pay,
      'Takes Returns': s.returns, Notes: s.notes,
    });
    suppliers[s.key] = { ...s, pending: [] };
  }

  // Categories and products. A reorder level covers the days until the supplier's next delivery
  // (longer for one that delivers weekly), and an order lasts about two or three times that.
  const COVER = { W1: [4, 10], W2: [9, 16], T: [11, 21] };
  const products = [];
  for (const [cat, desc, rate, sup, season, prefix, items] of RANGE) {
    const catId = add('Categories', { Name: cat, Description: desc, 'Tax Rate': rate });
    items.forEach(([name, pack, cost, retail, demand, check, max], k) => {
      const level = Math.max(2, Math.round(demand * COVER[sup][0]));
      // Slow lines come in outers of six, so they sit on the shelf for months.
      const qty = demand < 0.3 ? 6 * Math.max(1, Math.round((demand * COVER[sup][1]) / 6)) : Math.max(4, Math.round(demand * COVER[sup][1]));
      // Liquids, drops and sprays keep for less time than tablets once made.
      const life = /ml|spray|drops/.test(`${pack} ${name}`) ? [120, 420] : [300, 1000];
      const p = { name, pack, cost, retail, demand, check, max, rate, level, qty, life, sup: suppliers[sup], season: SUN.has(name) ? 'sun' : season, batches: [], stock: 0, onOrder: false };
      p.code = `${prefix}${pad(k + 1, 3)}`;
      p.id = add('Products', {
        Code: p.code, Name: name, Category: catId, Supplier: p.sup.id, Pack: pack, 'Cost Price': cost, 'Retail Price': retail,
        'Units in Stock': 0, 'Reorder Level': level, 'Reorder Quantity': qty, 'Pharmacist Check': check, 'Max per Sale': max,
      });
      products.push(p);
    });
  }
  // How much each line sells in each month, worked out once.
  const weightIn = (p, m) => p.demand * (p.season ? SEASONS[p.season][m] : 1);
  const choices = Array.from({ length: 12 }, (_, m) => products.map((p) => [p, weightIn(p, m)]));

  // Batches: each delivery of a line, with its expiry date. A sale takes from the one that runs out first.
  const batches = [];
  const batchNo = () => `${r.pick(['A', 'B', 'C', 'D', 'E', 'H', 'K', 'L', 'M', 'P', 'R', 'T'])}${r.int(1000, 9999)}${r.pick(['A', 'B', 'C', 'F', 'K', 'X'])}`;
  const receive = (p, d, n, exp) => {
    const b = { p, no: batchNo(), d, exp, n, left: n };
    batches.push(b);
    p.batches.push(b);
    p.batches.sort((x, y) => x.exp - y.exp);
    p.stock += n;
    return b;
  };
  const take = (p, n) => {
    let left = n;
    for (const b of p.batches) {
      if (!left) break;
      const k = Math.min(b.left, left);
      b.left -= k;
      left -= k;
    }
    p.stock -= n - left;
    p.batches = p.batches.filter((b) => b.left > 0);
    return n - left;
  };

  // A year from the first of a month.
  let start = -days;
  while (cal.at(start).getDate() !== 1) start++;

  // Opening stock, in before the first day. Slow lines also hold an older batch that will run out during the year.
  for (const p of products) {
    receive(p, start - r.int(10, 60), p.level + p.qty, start + r.int(p.life[0], p.life[1]));
    if (p.demand < 0.3) receive(p, start - r.int(100, 300), r.int(2, 6), start + r.int(20, 330));
  }

  const orders = [];
  const waste = [];
  const returns = [];
  const sales = [];
  const checks = [];
  const prescriptions = [];
  const rounds = [];

  // Delivery customers: who is housebound, which day their round comes and how often.
  const customers = [];
  for (let k = 0; k < 42; k++) {
    const p = person(r);
    const area = k < 20 ? 'North' : 'South';
    // Three come every Sunday; the rest on a weekday or Saturday.
    const day = k < 3 ? 0 : r.weighted([[1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 1]]);
    const every = k < 3 ? 1 : r.weighted([[1, 3], [2, 4], [4, 3]]);
    const c = { first: p['First Name'], last: p['Last Name'], area, day, every, phase: r.int(0, every - 1), since: -days - r.int(30, 1500), stopped: null };
    if (k >= 38) c.since = start + r.int(30, days - 60); // a few started during the year
    if (k === 10 || k === 30) c.stopped = start + r.int(60, days - 60); // and two stopped
    c.id = add('Delivery Customers', {
      'Customer No': `DC-${pad(k + 1, 4)}`, 'First Name': c.first, 'Last Name': c.last, Address: `${r.int(1, 160)} ${r.pick(STREETS)}`, City: 'Leeds',
      Postcode: `LS${area === 'North' ? r.int(6, 8) : r.int(10, 12)} ${r.int(1, 9)}${r.pick(['AB', 'DE', 'FG', 'HJ', 'NP', 'QR', 'TU'])}`, Phone: phoneFor(r, 'United Kingdom'),
      Area: area, 'Round Day': DAY_NAMES[day], 'Every Weeks': every, 'Access Notes': r.pick(ACCESS), Active: c.stopped == null, Since: cal.day(Math.max(c.since, -days - 1500)),
    });
    customers.push(c);
  }
  const weekNo = (d) => Math.floor((d + 7000) / 7);
  let carried = []; // stops not delivered, to go again on the next open day

  const hours = (d) => (wd(d) === 0 ? [10, 16] : [9, 18]);
  const BUSY = [1.15, 1.1, 1.0, 0.95, 1.0, 1.05, 1.05, 1.0, 0.95, 1.0, 1.1, 1.2];

  for (let d = start; d <= 2; d++) {
    if (closed(d)) continue;
    const w = wd(d);
    const m = cal.at(d).getMonth();
    if (d <= 0) {
      // Deliveries from suppliers arriving today, at about two in the afternoon: a batch for each line.
      for (const o of orders.filter((x) => x.at === d && (d < 0 || cal.hour >= 14))) {
        o.received = d;
        for (const l of o.lines) {
          // Now and then the wholesaler sends short-dated stock on a deal. A slow line's delivery in the
          // months before the file is made is often one, due to run out in the weeks after it.
          let exp = d + (r.chance(0.1) ? r.int(40, 120) : r.int(l.p.life[0], l.p.life[1]));
          if (l.p.demand < 0.3 && d >= -200 && d <= -20 && !l.p.dealt && r.chance(0.8)) { exp = r.int(8, 30); l.p.dealt = true; }
          l.batch = receive(l.p, d, l.n, exp);
          l.p.onOrder = false;
          // A pack damaged in delivery goes back to the wholesaler on the next return note.
          if (o.s.returns && l.n > 3 && r.chance(0.03)) {
            l.batch.left -= 1;
            l.p.stock -= 1;
            const x = { b: l.batch, d, n: 1, cost: l.p.cost, reason: 'Damaged in delivery, returned to supplier', ret: null };
            waste.push(x);
            o.s.pending.push(x);
          }
        }
      }

      // The date check on the week's first open day: anything out of date within the week comes off the shelf.
      const firstOfWeek = w === 1 || (w === 2 && closed(d - 1));
      if (firstOfWeek) {
        for (const p of products) {
          for (const b of p.batches.filter((x) => x.left > 0 && x.exp <= d + 7)) {
            const x = { b, d, n: b.left, cost: p.cost, reason: p.sup.returns ? 'Out of date, returned to supplier' : 'Out of date, for disposal', ret: null };
            waste.push(x);
            if (p.sup.returns) p.sup.pending.push(x);
            p.stock -= b.left;
            b.left = 0;
          }
          p.batches = p.batches.filter((b) => b.left > 0);
        }
        // On the first one of the month, what has come off goes back to each wholesaler on a return note.
        if (cal.at(d).getDate() <= 7) {
          for (const s of Object.values(suppliers)) {
            if (!s.pending.length) continue;
            const ret = { s, d, items: s.pending, collected: d + r.int(2, 6), credited: d + (s.key === 'W2' ? r.int(55, 80) : r.int(45, 70)) };
            for (const x of ret.items) x.ret = ret;
            ret.value = money(ret.items.reduce((t, x) => t + money(x.n * x.cost), 0));
            returns.push(ret);
            s.pending = [];
          }
        }
      }

      // Now and then a pack is dropped or damaged.
      const onShelf = products.filter((x) => x.stock > 0);
      if (onShelf.length && r.chance(0.07)) {
        const p = r.pick(onShelf);
        const b = p.batches[0];
        if (take(p, 1)) waste.push({ b, d, n: 1, cost: p.cost, reason: 'Damaged in store', ret: null });
      }

      // The till.
      const [open, shut] = hours(d);
      const n = Math.round((w === 0 ? 7 : w === 6 ? 18 : 15) * BUSY[m] * (0.8 + r.next() * 0.4));
      for (let k = 0; k < n; k++) {
        const minute = r.int(open * 60, shut * 60 - 1);
        if (d === 0 && minute >= cal.hour * 60) continue;
        const lines = [];
        const sold = [];
        const want = r.weighted([[1, 60], [2, 28], [3, 9], [4, 3]]);
        for (let j = 0; j < want; j++) {
          const p = r.weighted(choices[m]);
          if (lines.some((l) => l.p === p) || p.stock <= 0) continue;
          const qty = Math.min(r.weighted([[1, 85], [2, 12], [3, 3]]), p.max || 9, p.stock);
          if (p.check) {
            // A pharmacy-only line: the pharmacist has a word first, and now and then it is not sold.
            const no = r.chance(0.07);
            const c = { d, minute: minute - 1, p, n: qty, by: pharmacistOn(d), whom: r.chance(0.7) ? 'Self' : 'Someone at home', outcome: no ? 'Not sold' : 'Sold', note: no ? r.pick(NOT_SOLD) : null, sale: null };
            checks.push(c);
            if (no) continue;
            sold.push(c);
          }
          take(p, qty);
          lines.push({ p, qty });
        }
        if (!lines.length) continue;
        let total = 0;
        let vat = 0;
        for (const l of lines) {
          const g = money(l.qty * l.p.retail);
          total += g;
          vat += money(g - g / (1 + l.p.rate));
        }
        total = money(total);
        const cash = r.chance(0.26);
        // Cash handed over: the exact money, or the coin or note that covers it.
        const covers = [total, Math.ceil(total), 5, 10, 20, 50].filter((x) => x >= total);
        const paid = cash ? covers[Math.min(covers.length - 1, r.weighted([[0, 2], [1, 3], [2, 3], [3, 2]]))] : total;
        const s = { d, minute, by: servedBy(d), cash, total, vat: money(vat), paid: money(paid), lines };
        for (const c of sold) c.sale = s;
        sales.push(s);
      }

      // Prescriptions handed in or sent from the surgery, to collect at the counter.
      const np = Math.round((w === 0 ? 1 : w === 6 ? 3 : 7) * (0.7 + r.next() * 0.6));
      for (let k = 0; k < np; k++) {
        const first = r.pick(FIRST);
        const last = r.pick(LAST);
        const ready = nextOpen(d + r.weighted([[0, 70], [1, 25], [2, 5]]));
        const wait = r.weighted([[r.int(0, 2), 55], [r.int(3, 7), 30], [r.int(8, 20), 11], [-1, 4]]);
        let got = wait < 0 ? null : nextOpen(ready + wait);
        if (got != null && got > 0) got = null;
        const status = ready > 0 ? 'Being made up' : got != null ? 'Collected' : ready + 28 <= 0 ? 'Not collected' : 'Ready';
        prescriptions.push({ d, first, last, items: r.weighted([[1, 35], [2, 25], [3, 18], [4, 12], [5, 6], [6, 4]]), ready, got, status, delivery: false });
      }

      // Orders to each supplier on its order days, sent by eleven, for whatever is at or below its reorder level.
      for (const s of Object.values(suppliers)) {
        if (!s.days.includes(w) || (d === 0 && cal.hour < 11)) continue;
        const lines = products.filter((p) => p.sup === s && !p.onOrder && p.stock <= p.level).map((p) => ({ p, n: p.qty + Math.max(0, p.level - p.stock) }));
        // The main wholesaler is ordered from every weekday: on a day nothing is at its level, the
        // order tops up the line furthest below its usual most.
        if (!lines.length && s.key === 'W1') {
          const low = products.filter((p) => p.sup === s && !p.onOrder && p.stock < p.level + p.qty).sort((a, b) => (a.stock - a.level - a.qty) - (b.stock - b.level - b.qty))[0];
          if (low) lines.push({ p: low, n: low.level + low.qty - low.stock });
        }
        if (!lines.length) continue;
        for (const l of lines) l.p.onOrder = true;
        orders.push({ s, d, at: nextDelivery(d + s.lead), lines, by: r.chance(0.8) ? technician : pharmacistOn(d), received: null });
      }
    }

    // The delivery rounds: each customer due today, and any not in last time. Weekdays have a round
    // for each area; at the weekend one driver covers both.
    const due = customers.filter((c) => c.day === w && c.since <= d && (c.stopped == null || c.stopped > d) && (weekNo(d) - c.phase) % c.every === 0).map((c) => ({ c, note: null }));
    for (const x of carried) if (!due.some((y) => y.c === x.c)) due.push({ c: x.c, note: 'Second try: not in last time' });
    carried = [];
    // Someone off the usual round now and then, for an urgent bag.
    if (r.chance(0.35)) {
      const c = r.pick(customers.filter((x) => x.since <= d && (x.stopped == null || x.stopped > d)));
      if (!due.some((y) => y.c === c)) due.push({ c, note: 'Extra delivery, not the usual day' });
    }
    // Christmas Day's stops go out the day after.
    if (closed(d - 1)) {
      const xmas = customers.filter((c) => c.day === wd(d - 1) && (weekNo(d - 1) - c.phase) % c.every === 0 && c.since <= d && (c.stopped == null || c.stopped > d));
      for (const c of xmas) if (!due.some((y) => y.c === c)) due.push({ c, note: 'Moved from Christmas Day' });
    }
    const atWeekend = w === 0 || w === 6;
    const groups = atWeekend ? [['All', w === 0 ? driverA : driverB, due]] : [['North', driverA, due.filter((x) => x.c.area === 'North')], ['South', driverB, due.filter((x) => x.c.area === 'South')]];
    for (const [area, driver, list] of groups) {
      if (!list.length) continue;
      const done = d < 0 || (d === 0 && cal.hour >= 16);
      const round = { d, driver, area, stops: [], done };
      let minute = 11 * 60;
      list.forEach((x, i) => {
        // The bag for the stop: a prescription made up for delivery.
        // A bag for tomorrow's or the next day's round came in by today, and is made up the day before.
        const items = r.weighted([[1, 15], [2, 25], [3, 25], [4, 20], [5, 10], [6, 5]]);
        const got = Math.min(Math.max(d - r.int(1, 3), start), 0);
        const ready = d - 1 <= 0 ? Math.max(got, d - 1) : null;
        const rx = { d: got, first: x.c.first, last: x.c.last, items, ready, got: null, status: ready == null ? 'Being made up' : 'Ready', delivery: true };
        prescriptions.push(rx);
        minute += r.int(10, 25);
        const stop = { c: x.c, n: i + 1, rx, bags: items > 3 ? 2 : 1, note: x.note, status: 'Planned', at: null, by: null };
        if (done) {
          if (r.chance(0.03)) { stop.status = 'Not in, card left'; carried.push(x); } else {
            stop.status = 'Delivered';
            stop.at = cal.time(d, Math.floor(minute / 60), minute % 60);
            stop.by = r.weighted([['Customer', 80], ['Carer', 11], ['Family member', 9]]);
            rx.got = d;
            rx.status = 'Delivered';
          }
        }
        round.stops.push(stop);
      });
      rounds.push(round);
    }
  }

  // Into the file, each in date order with its numbers.
  orders.sort((a, b) => a.d - b.d);
  for (const o of orders) {
    o.id = add('Supplier Orders', {
      Number: numbered('PO', o.d), Supplier: o.s.id, 'Ordered By': o.by, 'Ordered On': cal.day(o.d), Expected: cal.day(o.at),
      'Received On': o.received == null ? null : cal.day(o.received), Status: o.received == null ? 'Submitted' : 'Received',
    });
    for (const l of o.lines) add('Supplier Order Lines', { Order: o.id, Product: l.p.id, Quantity: l.n, 'Unit Cost': l.p.cost });
  }
  for (const x of returns) {
    const collected = x.collected <= 0 ? x.collected : null;
    const credited = x.credited <= 0 ? x.credited : null;
    x.id = add('Supplier Returns', {
      Number: numbered('RTN', x.d), Supplier: x.s.id, 'Raised On': cal.day(x.d), 'Collected On': collected == null ? null : cal.day(collected),
      Status: credited != null ? 'Credited' : collected != null ? 'Awaiting credit' : 'Awaiting collection', 'Credit Claimed': x.value,
      'Credit Note': credited != null ? `CN-${r.int(100000, 999999)}` : null, 'Credited On': credited == null ? null : cal.day(credited),
    });
  }
  batches.sort((a, b) => a.d - b.d || a.p.id - b.p.id);
  for (const b of batches) {
    b.id = add('Batches', { Product: b.p.id, 'Batch No': b.no, 'Expiry Date': cal.day(b.exp), 'Received On': cal.day(b.d), 'Quantity Received': b.n, 'Quantity Left': b.left });
  }
  waste.sort((a, b) => a.d - b.d);
  for (const x of waste) add('Waste', { Batch: x.b.id, Return: x.ret ? x.ret.id : null, 'Written Off On': cal.day(x.d), Quantity: x.n, 'Unit Cost': x.cost, Reason: x.reason });

  sales.sort((a, b) => a.d - b.d || a.minute - b.minute);
  for (const s of sales) {
    s.id = add('Sales', {
      Number: numbered('RCP', s.d, 5), When: cal.time(s.d, Math.floor(s.minute / 60), s.minute % 60), Till: 'Till 1', 'Served By': s.by,
      Payment: s.cash ? 'Cash' : 'Card', Total: s.total, VAT: s.vat, Paid: s.paid, Change: money(s.paid - s.total),
    });
    for (const l of s.lines) add('Sale Lines', { Sale: s.id, Product: l.p.id, Quantity: l.qty, 'Unit Price': l.p.retail, 'Tax Rate': l.p.rate, 'Unit Cost': l.p.cost, 'Pharmacist Check': l.p.check });
  }
  checks.sort((a, b) => a.d - b.d || a.minute - b.minute);
  for (const c of checks) {
    add('Pharmacist Checks', {
      When: cal.time(c.d, Math.floor(c.minute / 60), c.minute % 60), Product: c.p.id, Quantity: c.n, Pharmacist: c.by, Sale: c.sale ? c.sale.id : null,
      'For Whom': c.whom, Outcome: c.outcome, Note: c.note,
    });
  }
  prescriptions.sort((a, b) => a.d - b.d);
  for (const x of prescriptions) {
    x.ref = numbered('RX', x.d, 5);
    add('Prescriptions', {
      Reference: x.ref, Initials: initials(x.first, x.last), 'Received On': cal.day(x.d), Items: x.items, 'Ready On': x.ready == null ? null : cal.day(x.ready),
      'Collected On': x.got == null ? null : cal.day(x.got), Status: x.status, Shelf: x.delivery ? 'Delivery' : `${x.last[0]}${(x.items % 3) + 1}`, 'For Delivery': x.delivery,
    });
  }
  for (const rd of rounds) {
    rd.id = add('Delivery Rounds', {
      Number: numbered('RND', rd.d), 'Delivery Date': cal.day(rd.d), Driver: rd.driver, Area: rd.area, Stops: rd.stops.length,
      Bags: rd.stops.reduce((t, s) => t + s.bags, 0), Status: rd.done ? 'Done' : 'Planned',
    });
    for (const s of rd.stops) {
      add('Deliveries', {
        Round: rd.id, Stop: s.n, Customer: s.c.id, 'Prescription Ref': s.rx.ref, Bags: s.bags, Status: s.status, 'Delivered At': s.at, 'Received By': s.by, Notes: s.note,
      });
    }
  }
  for (const p of products) base.update('Products', p.id, { 'Units in Stock': p.stock });
  return counts;
}
