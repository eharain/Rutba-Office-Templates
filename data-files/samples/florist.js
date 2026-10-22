// The florist: Hazel Row Flowers, an invented florist's shop in north
// London with a workroom behind it, a van, and a market buyer up before
// dawn three times a week. Stems, foliage and sundries bought from an
// invented wholesale market and a grower, each with the few days it lasts;
// the bouquets and arrangements it makes and the stems in each; orders for
// delivery or collection with their card messages; walk-in sales at the
// till; funeral tributes; weddings quoted, booked with a deposit and
// invoiced; delivery areas and runs; and what was thrown away.
//
// Its records are twelve months of the shop, run a day at a time, and the
// week of orders already booked ahead. Stems go down as orders are made and
// bunches sold, and the buyer buys for the days until the next market from
// what is booked and what the till usually sells; whatever passes its best
// before it is used is thrown away and logged. Valentine's Day, Mother's Day
// and the run-up to Christmas are the busy days: red roses cost more than
// twice as much at the market in early February. Weddings are booked months
// ahead, mostly for summer Saturdays, with a quarter paid to book and the
// rest four weeks before.
//
// Flowers carry VAT at the standard rate, and the shop's prices include it,
// so its receipts and invoices show the VAT within the price.

import { BUSINESS_ABOUT, BUSINESS_TABLE, businessRecord, FIRST, LAST, money, person, phoneFor } from './util.js';

// These print templates need Data Files 2.16: an older Office is told to update.
export const minOffice = '2.16.0';

const ref = (table) => ({ type: 'integer', points: table });
// The business's own details at the head of every document.
const LETTERHEAD = { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'E-mail', 'Website', 'Tax Number'] };
const AMOUNT = 'Round([Quantity] * [Unit Price], 2)';
// Prices include VAT: the VAT within a line.
const VAT_IN = `Round(${AMOUNT} - ${AMOUNT} / (1 + Nz([Tax Rate])), 2)`;
const CUSTOMER = '[Customers].[First Name] & " " & [Customers].[Last Name]';

export const spec = {
  // Where a value below nought is right: a wedding balance already overdue.
  negative: { 'Weddings in the next 60 days': ['Days Until Due'] },
  tables: [
    BUSINESS_TABLE,
    { name: 'Staff', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Role', type: 'text' },
      { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Started', type: 'date' },
    ] },
    { name: 'Suppliers', fields: [
      { name: 'Name', type: 'text', required: true }, { name: 'Kind', type: 'text' }, { name: 'Address', type: 'text' }, { name: 'City', type: 'text' },
      { name: 'Postcode', type: 'text' }, { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Account No', type: 'text' },
      { name: 'Buying Days', type: 'text' },
    ] },
    { name: 'Items', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Kind', type: 'text' }, { name: 'Supplier', ...ref('Suppliers') },
      { name: 'Unit', type: 'text' }, { name: 'Stems per Unit', type: 'integer', default: 10 }, { name: 'Cost per Stem', type: 'currency' },
      { name: 'Life Days', type: 'integer' }, { name: 'Season', type: 'text' }, { name: 'In Stock', type: 'integer', default: 0 },
    ] },
    { name: 'Products', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Code', type: 'text', unique: true }, { name: 'Kind', type: 'text' },
      { name: 'Price', type: 'currency' }, { name: 'Tax Rate', type: 'number', default: 0.2 }, { name: 'Season', type: 'text' },
      { name: 'Description', type: 'text' }, { name: 'On Sale', type: 'yesno', default: true },
    ] },
    { name: 'Recipe Lines', fields: [
      { name: 'Product', ...ref('Products'), required: true }, { name: 'Line', type: 'integer' }, { name: 'Item', ...ref('Items'), required: true },
      { name: 'Stems', type: 'integer' },
    ] },
    { name: 'Purchases', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Supplier', ...ref('Suppliers'), required: true }, { name: 'Bought On', type: 'date' },
      { name: 'Total', type: 'currency' },
    ] },
    { name: 'Purchase Lines', fields: [
      { name: 'Purchase', ...ref('Purchases'), required: true }, { name: 'Item', ...ref('Items'), required: true }, { name: 'Units', type: 'integer' },
      { name: 'Unit Cost', type: 'currency' }, { name: 'Stems', type: 'integer' }, { name: 'Use By', type: 'date' },
    ] },
    { name: 'Waste', fields: [
      { name: 'Item', ...ref('Items'), required: true }, { name: 'Batch', ...ref('Purchase Lines') }, { name: 'When', type: 'date' },
      { name: 'Stems', type: 'integer' }, { name: 'Cost', type: 'currency' }, { name: 'Reason', type: 'text' },
    ] },
    { name: 'Delivery Areas', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Postcodes', type: 'text' }, { name: 'Charge', type: 'currency' },
    ] },
    // Delivery Runs come before Orders: a delivery's Staff record is its driver, not who took the order.
    { name: 'Delivery Runs', fields: [
      { name: 'Run Date', type: 'date' }, { name: 'Slot', type: 'text' }, { name: 'Driver', ...ref('Staff') }, { name: 'Notes', type: 'text' },
    ] },
    { name: 'Customers', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Company', type: 'text' },
      { name: 'Kind', type: 'text', default: 'Private' }, { name: 'Address', type: 'text' }, { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' },
      { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Added', type: 'date' },
    ] },
    { name: 'Orders', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Customer', ...ref('Customers'), required: true }, { name: 'Taken By', ...ref('Staff') },
      { name: 'Taken', type: 'datetime' }, { name: 'Kind', type: 'text', default: 'Delivery' }, { name: 'Occasion', type: 'text' },
      { name: 'Due Date', type: 'date' }, { name: 'Slot', type: 'text' }, { name: 'Recipient', type: 'text' }, { name: 'Recipient Phone', type: 'text' },
      { name: 'Address', type: 'text' }, { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' }, { name: 'Area', ...ref('Delivery Areas') },
      { name: 'Run', ...ref('Delivery Runs') }, { name: 'Description', type: 'text' }, { name: 'Card Included', type: 'yesno' },
      { name: 'Card Message', type: 'longtext' }, { name: 'Card From', type: 'text' }, { name: 'Delivery Charge', type: 'currency', default: 0 },
      { name: 'Net', type: 'currency' }, { name: 'Tax', type: 'currency' }, { name: 'Total', type: 'currency' }, { name: 'Payment', type: 'text' },
      { name: 'Paid On', type: 'date' }, { name: 'Status', type: 'text', default: 'Booked' },
    ] },
    { name: 'Order Lines', fields: [
      { name: 'Order', ...ref('Orders'), required: true }, { name: 'Product', ...ref('Products'), required: true },
      { name: 'Quantity', type: 'integer', default: 1 }, { name: 'Unit Price', type: 'currency' }, { name: 'Tax Rate', type: 'number', default: 0.2 },
    ] },
    { name: 'Till Sales', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Sold At', type: 'datetime' }, { name: 'Served By', ...ref('Staff') },
      { name: 'Payment', type: 'text' }, { name: 'Net', type: 'currency' }, { name: 'Tax', type: 'currency' }, { name: 'Total', type: 'currency' },
    ] },
    { name: 'Till Lines', fields: [
      { name: 'Till Sale', ...ref('Till Sales'), required: true }, { name: 'Product', ...ref('Products'), required: true },
      { name: 'Quantity', type: 'integer', default: 1 }, { name: 'Unit Price', type: 'currency' }, { name: 'Tax Rate', type: 'number', default: 0.2 },
    ] },
    { name: 'Weddings', fields: [
      { name: 'Quote No', type: 'text', unique: true }, { name: 'Customer', ...ref('Customers'), required: true }, { name: 'Couple', type: 'text' },
      { name: 'Wedding Date', type: 'date' }, { name: 'Ceremony Venue', type: 'text' }, { name: 'Reception Venue', type: 'text' }, { name: 'Colours', type: 'text' },
      { name: 'Quoted On', type: 'date' }, { name: 'Valid Until', type: 'date' }, { name: 'Status', type: 'text', default: 'Quoted' },
      { name: 'Net', type: 'currency' }, { name: 'Tax', type: 'currency' }, { name: 'Total', type: 'currency' },
      { name: 'Deposit', type: 'currency' }, { name: 'Deposit Paid On', type: 'date' }, { name: 'Invoice No', type: 'text', unique: true },
      { name: 'Invoice Date', type: 'date' }, { name: 'Balance Due On', type: 'date' }, { name: 'Balance Paid On', type: 'date' }, { name: 'Notes', type: 'text' },
    ] },
    { name: 'Wedding Lines', fields: [
      { name: 'Wedding', ...ref('Weddings'), required: true }, { name: 'Line', type: 'integer' }, { name: 'Product', ...ref('Products'), required: true },
      { name: 'Description', type: 'text' }, { name: 'Quantity', type: 'integer', default: 1 }, { name: 'Unit Price', type: 'currency' },
      { name: 'Tax Rate', type: 'number', default: 0.2 },
    ] },
  ],
  queries: {
    'Deliveries today and tomorrow': { tables: ['Orders', 'Delivery Areas'], columns: [
      { table: 'Delivery Areas', field: 'Name', as: 'Area', sort: 'asc' }, { table: 'Orders', field: 'Due Date', sort: 'asc' }, { table: 'Orders', field: 'Slot', sort: 'asc' },
      { table: 'Orders', field: 'Number', as: 'Order' }, { table: 'Orders', field: 'Kind' }, { table: 'Orders', field: 'Recipient' }, { table: 'Orders', field: 'Address' },
      { table: 'Orders', field: 'Postcode' }, { table: 'Orders', field: 'Recipient Phone' }, { table: 'Orders', field: 'Status' },
      { expr: 'DateDiff("d", Date(), [Due Date])', as: 'Days Ahead', criteria: ['Between 0 And 1'], show: false },
      { table: 'Orders', field: 'Status', as: 'Not Cancelled', criteria: ['<> "Cancelled"'], show: false },
    ] },
    'Stems to buy for the next 3 days': { tables: ['Orders', 'Order Lines', 'Products', 'Recipe Lines', 'Items'], columns: [
      { table: 'Items', field: 'Name', as: 'Item', total: 'group', sort: 'asc' }, { table: 'Items', field: 'Kind', total: 'group' },
      { table: 'Items', field: 'Unit', total: 'group' }, { table: 'Items', field: 'Stems per Unit', total: 'group' }, { table: 'Items', field: 'In Stock', total: 'group' },
      { expr: '[Order Lines].[Quantity] * [Stems]', as: 'Stems Needed', total: 'sum' },
      { table: 'Orders', field: 'Status', total: 'where', criteria: ['Booked'] },
      { expr: 'DateDiff("d", Date(), [Due Date])', as: 'Days Ahead', total: 'where', criteria: ['Between 0 And 3'] },
      { table: 'Items', field: 'Kind', as: 'Stem Kind', total: 'where', criteria: ['In ("Flower", "Foliage")'] },
    ] },
    'Waste by week': { tables: ['Waste'], columns: [
      { expr: 'Round((DateDiff("d", [When], Date()) - 3) / 7, 0)', as: 'Weeks Ago', total: 'group', sort: 'asc', criteria: ['Between 0 And 11'] },
      { table: 'Waste', field: 'When', as: 'From', total: 'min' }, { table: 'Waste', field: 'When', as: 'To', total: 'max' },
      { table: 'Waste', field: 'Stems', as: 'Stems', total: 'sum' }, { table: 'Waste', field: 'Cost', as: 'Cost', total: 'sum' },
    ] },
    'Waste by item': { tables: ['Waste', 'Items'], columns: [
      { table: 'Items', field: 'Name', as: 'Item', total: 'group' }, { table: 'Items', field: 'Kind', total: 'group' },
      { table: 'Waste', field: 'Stems', as: 'Stems', total: 'sum' }, { table: 'Waste', field: 'Cost', as: 'Cost', total: 'sum', sort: 'desc' },
      { expr: 'DateDiff("d", [When], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 27'] },
    ] },
    'Weddings in the next 60 days': { tables: ['Weddings', 'Customers'], columns: [
      { table: 'Weddings', field: 'Wedding Date', sort: 'asc' }, { expr: 'DateDiff("d", Date(), [Wedding Date])', as: 'Days to Go', criteria: ['Between 0 And 60'] },
      { table: 'Weddings', field: 'Couple' }, { table: 'Customers', field: 'Phone' }, { table: 'Weddings', field: 'Ceremony Venue' },
      { table: 'Weddings', field: 'Total' }, { table: 'Weddings', field: 'Deposit' }, { expr: 'Round([Total] - Nz([Deposit]), 2)', as: 'Balance' },
      { table: 'Weddings', field: 'Balance Due On' }, { expr: 'DateDiff("d", Date(), [Balance Due On])', as: 'Days Until Due' },
      { table: 'Weddings', field: 'Status', criteria: ['Booked'], show: false }, { table: 'Weddings', field: 'Balance Paid On', criteria: ['Is Null'], show: false },
    ] },
    'Margin per product': { tables: ['Recipe Lines', 'Products', 'Items'], columns: [
      { table: 'Products', field: 'Kind', total: 'group', sort: 'asc' }, { table: 'Products', field: 'Name', as: 'Product', total: 'group' },
      { table: 'Products', field: 'Price', total: 'group' }, { expr: 'Round([Stems] * [Cost per Stem], 2)', as: 'Cost of Stems', total: 'sum' },
      // The price, without its VAT, is counted once: on the recipe's first line.
      { expr: 'IIf([Line] = 1, Round([Price] / (1 + [Tax Rate]), 2), 0) - Round([Stems] * [Cost per Stem], 2)', as: 'Margin', total: 'sum', sort: 'desc' },
      { table: 'Products', field: 'On Sale', total: 'where', criteria: ['Yes'] },
    ] },
    'Takings by occasion': { tables: ['Orders'], columns: [
      { table: 'Orders', field: 'Occasion', total: 'group' }, { table: 'Orders', field: 'ID', as: 'Orders', total: 'count' },
      { table: 'Orders', field: 'Total', as: 'Takings', total: 'sum', sort: 'desc' }, { table: 'Orders', field: 'Tax', as: 'VAT', total: 'sum' },
      { table: 'Orders', field: 'Status', total: 'where', criteria: ['<> "Cancelled"'] },
      { expr: 'DateDiff("d", [Paid On], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 365'] },
    ] },
    'Till takings by day': { tables: ['Till Sales'], columns: [
      { expr: 'Format([Sold At], "yyyy-mm-dd")', as: 'Day', total: 'group', sort: 'desc' }, { table: 'Till Sales', field: 'ID', as: 'Receipts', total: 'count' },
      { table: 'Till Sales', field: 'Total', as: 'Takings', total: 'sum' }, { table: 'Till Sales', field: 'Tax', as: 'VAT', total: 'sum' },
      { expr: 'DateDiff("d", [Sold At], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 13'] },
    ] },
    'Orders by month': { tables: ['Orders'], columns: [
      { expr: 'Format([Due Date], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Orders', field: 'ID', as: 'Orders', total: 'count' },
      { table: 'Orders', field: 'Total', as: 'Takings', total: 'sum' }, { table: 'Orders', field: 'Delivery Charge', as: 'Delivery Charges', total: 'sum' },
      { table: 'Orders', field: 'Status', total: 'where', criteria: ['<> "Cancelled"'] },
    ] },
    'Deliveries by area': { tables: ['Orders', 'Delivery Areas'], columns: [
      { table: 'Delivery Areas', field: 'Name', as: 'Area', total: 'group', sort: 'asc' }, { table: 'Delivery Areas', field: 'Charge', total: 'group' },
      { table: 'Orders', field: 'ID', as: 'Deliveries', total: 'count' }, { table: 'Orders', field: 'Delivery Charge', as: 'Charges', total: 'sum' },
      { table: 'Orders', field: 'Status', total: 'where', criteria: ['Delivered'] },
      { expr: 'DateDiff("d", [Due Date], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 90'] },
    ] },
    'Market spend by month': { tables: ['Purchases', 'Suppliers'], columns: [
      { expr: 'Format([Bought On], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Suppliers', field: 'Name', as: 'Supplier', total: 'group', sort: 'asc' },
      { table: 'Purchases', field: 'ID', as: 'Purchases', total: 'count' }, { table: 'Purchases', field: 'Total', as: 'Spent', total: 'sum' },
    ] },
    'Customers who order most': { tables: ['Customers', 'Orders'], columns: [
      { expr: `IIf(Nz([Company], "") = "", ${CUSTOMER}, [Company])`, as: 'Customer', total: 'group' }, { table: 'Customers', field: 'Phone', total: 'group' }, { table: 'Customers', field: 'Kind', total: 'group' },
      { table: 'Orders', field: 'ID', as: 'Orders', total: 'count' }, { table: 'Orders', field: 'Total', as: 'Spent', total: 'sum', sort: 'desc', criteria: ['>= 150'] },
      { table: 'Orders', field: 'Status', total: 'where', criteria: ['<> "Cancelled"'] },
    ] },
  },
  reports: [
    { name: 'Delivery sheet', query: 'Deliveries today and tomorrow', group: 'Area', columns: [{ field: 'Due Date', type: 'date' }, 'Slot', 'Order', 'Recipient', 'Address', 'Postcode', 'Recipient Phone', 'Status'], totals: [{ field: 'Order', fn: 'count' }] },
    { name: 'Market list', query: 'Stems to buy for the next 3 days', group: 'Kind', columns: ['Item', 'Unit', { field: 'Stems per Unit', type: 'integer' }, { field: 'In Stock', type: 'integer' }, { field: 'Stems Needed', type: 'integer' }], totals: [{ field: 'Stems Needed', fn: 'sum' }] },
    { name: 'Weekly waste', query: 'Waste by week', columns: [{ field: 'Weeks Ago', type: 'integer' }, { field: 'From', type: 'date' }, { field: 'To', type: 'date' }, { field: 'Stems', type: 'integer' }, { field: 'Cost', type: 'currency' }], totals: [{ field: 'Stems', fn: 'sum' }, { field: 'Cost', fn: 'sum' }] },
    { name: 'Wedding balances', query: 'Weddings in the next 60 days', columns: [{ field: 'Wedding Date', type: 'date' }, 'Couple', 'Ceremony Venue', { field: 'Total', type: 'currency' }, { field: 'Deposit', type: 'currency' }, { field: 'Balance', type: 'currency' }, { field: 'Balance Due On', type: 'date' }], totals: [{ field: 'Balance', fn: 'sum' }] },
    { name: 'Product margins', query: 'Margin per product', group: 'Kind', columns: ['Product', { field: 'Price', type: 'currency' }, { field: 'Cost of Stems', type: 'currency' }, { field: 'Margin', type: 'currency' }] },
    { name: 'Occasion takings', query: 'Takings by occasion', columns: ['Occasion', { field: 'Orders', type: 'integer' }, { field: 'Takings', type: 'currency' }, { field: 'VAT', type: 'currency' }], totals: [{ field: 'Orders', fn: 'sum' }, { field: 'Takings', fn: 'sum' }] },
    { name: 'Till takings', query: 'Till takings by day', columns: ['Day', { field: 'Receipts', type: 'integer' }, { field: 'Takings', type: 'currency' }, { field: 'VAT', type: 'currency' }], totals: [{ field: 'Receipts', fn: 'sum' }, { field: 'Takings', fn: 'sum' }, { field: 'VAT', fn: 'sum' }] },
    { name: 'Monthly orders', query: 'Orders by month', columns: ['Month', { field: 'Orders', type: 'integer' }, { field: 'Takings', type: 'currency' }, { field: 'Delivery Charges', type: 'currency' }], totals: [{ field: 'Orders', fn: 'sum' }, { field: 'Takings', fn: 'sum' }] },
  ],
  documents: [
    // A letter for each order a customer placed: not the weekly standing orders, not a cancelled order (it still prints when chosen).
    { name: 'Order confirmation', table: 'Orders', paper: 'a4', letterhead: LETTERHEAD, where: '[Kind] <> "Contract" And [Status] <> "Cancelled"', blocks: [
      { type: 'fields', columns: 2, items: [
        { field: 'Customer', label: 'To' }, { field: 'Number', label: 'Order' },
        { field: 'Customer.Address', label: 'Address' }, { field: 'Taken', label: 'Taken', format: 'd mmmm yyyy' },
        { field: 'Customer.City', label: 'Town' }, { field: 'Customer.Postcode', label: 'Postcode' },
      ] },
      { type: 'heading', text: 'Your order {Number}' },
      { type: 'text', text: 'Dear {Customer.First Name},' },
      { type: 'text', text: 'Thank you for your order. This is what we have written down. If anything is not right, call us on {Business.Phone} and we will put it right.' },
      { type: 'lines', table: 'Order Lines', columns: [
        { field: 'Product.Name', label: 'Flowers' }, { field: 'Quantity', type: 'integer' }, { field: 'Unit Price', label: 'Price', type: 'currency' },
        { expr: AMOUNT, as: 'Amount', type: 'currency' },
      ] },
      { type: 'totals', rows: [
        { label: 'Flowers', expr: '[Amount]' }, { label: 'Delivery', expr: '[Delivery Charge]', if: '[Delivery Charge] > 0' },
        { label: 'Total', expr: '[Total]', strong: true }, { label: 'VAT included', expr: '[Tax]' },
      ] },
      { type: 'fields', columns: 2, items: [
        { field: 'Kind', label: 'Delivery or collection' }, { field: 'Due Date', label: 'On', format: 'dddd d mmmm yyyy' },
        { field: 'Recipient', label: 'For' }, { field: 'Slot', label: 'Time' },
        { field: 'Address', label: 'Address' }, { field: 'City', label: 'Town', if: '[City]' }, { field: 'Postcode', label: 'Postcode', if: '[Postcode]' },
        { field: 'Description', label: 'What we will make' },
        { field: 'Payment', label: 'Paid by', if: '[Paid On]' }, { field: 'Paid On', label: 'Paid on', format: 'd mmmm yyyy', if: '[Paid On]' },
      ] },
      { type: 'text', text: 'The card will read: {Card Message} {Card From}', if: '[Card Included]' },
      { type: 'text', text: 'No card goes with the flowers. If you would like one, call us and tell us what to write.', if: 'Nz([Card Included], 0) = 0' },
      { type: 'text', text: 'Payment: {Payment}. We take it before the flowers are made.', if: 'Nz([Paid On], "") = ""' },
      { type: 'text', text: 'Flowers are made fresh on the day from what is best at the market, so a stem may differ a little from the picture; the colours and the size will not. If you need to change or cancel the order, tell us by 5pm the day before and we refund you in full. Once the flowers are made we can change the delivery but cannot refund them.' },
      { type: 'text', text: 'This order was cancelled. If you have paid for it, the money is refunded to the card you paid with.', if: '[Status] = "Cancelled"' },
      { type: 'text', text: 'With best wishes,' },
      { type: 'text', text: '{Taken By}, {Business.Name}' },
      { type: 'text', text: '{Business.Document Footer}', small: true },
    ] },
    // A card only for the orders that have one.
    { name: 'Gift card message', table: 'Orders', paper: 'a5', where: '[Card Included] And [Status] <> "Cancelled"', blocks: [
      { type: 'spacer', size: 32 },
      { type: 'text', text: '{Card Message}' },
      { type: 'spacer', size: 16 },
      { type: 'text', text: '{Card From}' },
    ] },
    // Only what goes out in the van: a collection has no delivery note.
    { name: 'Delivery note', table: 'Orders', paper: 'a5', where: '[Kind] <> "Collection" And [Status] <> "Cancelled"', letterhead: { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone'] }, blocks: [
      { type: 'heading', text: 'Delivery note {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Recipient', label: 'For' }, { field: 'Due Date', label: 'Delivery date', format: 'dd/mm/yyyy' },
        { field: 'Address', label: 'Address' }, { field: 'Slot', label: 'Time' },
        { field: 'City', label: 'Town' }, { field: 'Area.Name', label: 'Area' },
        { field: 'Postcode', label: 'Postcode' }, { field: 'Run.Driver', label: 'Driver', if: '[Run]' },
        { field: 'Recipient Phone', label: 'Phone', if: '[Recipient Phone]' }, { field: 'Card Included', label: 'Card enclosed', if: '[Card Included]' },
      ] },
      { type: 'lines', table: 'Order Lines', columns: [{ field: 'Product.Name', label: 'Flowers' }, { field: 'Quantity', type: 'integer' }] },
      { type: 'totals', rows: [{ label: 'Items', expr: '[Quantity]', type: 'integer', strong: true }] },
      { type: 'text', text: 'Someone has sent you flowers from {Business.Name}. To keep them fresh, cut the stems at an angle, put them in clean water and keep them out of direct sun. Change the water every two days.', small: true, if: '[Kind] = "Delivery"' },
      { type: 'text', text: 'A funeral tribute from {Business.Name}, made to order. Please keep it flat and out of the sun until the service.', small: true, if: '[Kind] = "Funeral"' },
      { type: 'text', text: 'Your weekly flowers from {Business.Name}. We take away last week\'s arrangement when we bring the new one.', small: true, if: '[Kind] = "Contract"' },
      { type: 'spacer', size: 16 },
      { type: 'signatures', labels: ['Received by', 'Time'] },
    ] },
    // Every wedding has its quote; what it says about the deposit follows the wedding's Status.
    { name: 'Wedding quote', table: 'Weddings', paper: 'a4', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'Wedding flowers: quote {Quote No}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Customer', label: 'For' }, { field: 'Quote No', label: 'Quote' },
        { field: 'Customer.Address', label: 'Address' }, { field: 'Quoted On', label: 'Date', format: 'd mmmm yyyy' },
        { field: 'Customer.Postcode', label: 'Postcode' }, { field: 'Valid Until', label: 'Prices hold until', format: 'd mmmm yyyy', if: '[Status] = "Quoted"' },
        { field: 'Couple', label: 'The couple' }, { field: 'Wedding Date', label: 'Wedding date', format: 'dddd d mmmm yyyy' },
        { field: 'Ceremony Venue', label: 'Ceremony' }, { field: 'Reception Venue', label: 'Reception', if: '[Reception Venue]' },
        { field: 'Colours', label: 'Colours' },
      ] },
      { type: 'lines', table: 'Wedding Lines', sort: 'Line', columns: [
        { field: 'Description' }, { field: 'Quantity', type: 'integer' }, { field: 'Unit Price', label: 'Each', type: 'currency' },
        { expr: AMOUNT, as: 'Amount', type: 'currency' }, { expr: VAT_IN, as: 'Line VAT', label: 'VAT within', type: 'currency' },
      ] },
      { type: 'totals', rows: [
        { label: 'Total for the flowers', expr: '[Amount]', strong: true }, { label: 'VAT included', expr: '[Line VAT]' },
        { label: 'Deposit to book (a quarter)', expr: 'Round([Amount] * 0.25 / 10, 0) * 10', if: '[Status] = "Quoted"' },
        { label: 'Deposit paid', expr: '[Deposit]', if: '[Deposit Paid On]' },
      ] },
      { type: 'text', text: 'To book, pay the deposit above: we then hold the date for you and send an invoice. The balance is due four weeks before the wedding. Flowers are seasonal: if a flower is not at its best that week we use the closest we can find, and we tell you first.', if: '[Status] = "Quoted"' },
      { type: 'text', text: 'Booked: thank you for your deposit. We hold the date for you, and the balance is on your invoice, due four weeks before the wedding. Flowers are seasonal: if a flower is not at its best that week we use the closest we can find, and we tell you first.', if: '[Status] = "Booked"' },
      { type: 'text', text: 'The flowers for this wedding have been made and delivered. Thank you for choosing us.', if: '[Status] = "Done"' },
      { type: 'text', text: 'This quote was not taken up. If your plans change, call us and we will quote again at the prices of the day.', if: '[Status] = "Declined"' },
      { type: 'text', text: 'The price includes making everything, delivery on the morning of the wedding, and setting up at the ceremony and the reception. Vases and stands we bring are collected the next working day.' },
      { type: 'text', text: '{Business.Document Footer}', small: true },
    ] },
    // An invoice only for a wedding that has one: booked, with its deposit paid.
    { name: 'Wedding invoice', table: 'Weddings', paper: 'a4', letterhead: LETTERHEAD, where: 'Nz([Invoice No], "") <> ""', blocks: [
      { type: 'heading', text: 'Invoice {Invoice No}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Customer', label: 'Invoice to' }, { field: 'Invoice No', label: 'Invoice' },
        { field: 'Customer.Address', label: 'Address' }, { field: 'Invoice Date', label: 'Date', format: 'dd/mm/yyyy' },
        { field: 'Customer.City', label: 'Town' }, { field: 'Quote No', label: 'Your quote' },
        { field: 'Customer.Postcode', label: 'Postcode' }, { field: 'Wedding Date', label: 'Wedding date', format: 'dd/mm/yyyy' },
        { field: 'Couple', label: 'The couple' }, { field: 'Deposit Paid On', label: 'Deposit paid on', format: 'dd/mm/yyyy', if: '[Deposit Paid On]' },
        { field: 'Balance Due On', label: 'Balance due by', format: 'dd/mm/yyyy', if: 'Nz([Balance Paid On], "") = ""' },
        { field: 'Balance Paid On', label: 'Balance paid on', format: 'dd/mm/yyyy', if: '[Balance Paid On]' },
      ] },
      { type: 'lines', table: 'Wedding Lines', sort: 'Line', columns: [
        { field: 'Description' }, { field: 'Quantity', type: 'integer' }, { field: 'Unit Price', label: 'Each', type: 'currency' },
        { expr: AMOUNT, as: 'Amount', type: 'currency' }, { expr: VAT_IN, as: 'Line VAT', label: 'VAT within', type: 'currency' },
      ] },
      { type: 'totals', rows: [
        { label: 'Total for the flowers', expr: '[Amount]' }, { label: 'VAT included', expr: '[Tax]' },
        { label: 'Deposit paid', expr: '[Deposit]', if: '[Deposit]' },
        { label: 'Balance paid', expr: '[Amount] - Nz([Deposit], 0)', if: '[Balance Paid On]' },
        { label: 'Balance due', expr: '[Amount] - Nz([Deposit], 0)', strong: true, if: 'Nz([Balance Paid On], "") = ""' },
      ] },
      { type: 'text', text: 'Please pay the balance by the date above to {Business.Bank Details}, quoting {Invoice No}. If you have paid it since this invoice was sent, thank you.', if: 'Nz([Balance Paid On], "") = ""' },
      { type: 'text', text: 'Paid in full. Thank you, and we hope the day was everything you wished for.', if: '[Balance Paid On]' },
      { type: 'text', text: '{Business.Payment Terms}', small: true },
    ] },
    { name: 'Till receipt', table: 'Till Sales', paper: 'receipt-80', letterhead: { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'Tax Number'] }, blocks: [
      { type: 'heading', text: 'Receipt {Number}' },
      { type: 'fields', columns: 1, items: [{ field: 'Sold At', label: 'Date', format: 'dd/mm/yyyy hh:nn' }, { field: 'Served By', label: 'Served by' }, { field: 'Payment', label: 'Paid by' }] },
      { type: 'lines', table: 'Till Lines', columns: [
        { field: 'Product.Name', label: 'Item' }, { field: 'Quantity', label: 'Qty', type: 'integer' }, { expr: AMOUNT, as: 'Amount', type: 'currency' },
      ] },
      { type: 'totals', rows: [{ label: 'Total', expr: '[Amount]', strong: true }, { label: 'VAT at 20% included', expr: '[Tax]', if: '[Tax] > 0' }] },
      { type: 'text', text: 'VAT number {Business.Tax Number}.', small: true },
      { type: 'text', text: '{Business.Document Footer}', small: true },
    ] },
  ],
};

export const about = {
  name: 'Hazel Row Flowers',
  kind: 'Florist',
  line: 'Stems and their waste, bouquets and recipes, orders and deliveries, weddings and the till for a florist.',
  summary: [
    'Hazel Row Flowers is an invented florist\'s shop in Stoke Newington, north London, run by its owner with two florists, a Saturday junior and a delivery driver. It sells hand-tied bouquets, arrangements, plants and wrapped bunches over the counter, takes orders by phone and online for delivery across north and east London or for collection, makes funeral tributes, and does the flowers for a dozen or more weddings a year.',
    'The sample holds twelve months of the shop, made up a day at a time, and the orders already booked for the coming week. Three mornings a week the owner buys at an invented wholesale market and from a grower, buying for the days until the next market from what is booked and what the till usually sells. Each stem lasts a set number of days; what passes its best before it is used is thrown away and logged. Each product has a recipe of the stems it takes, so the orders booked turn into the stems to buy, and the price and the recipe give its margin.',
    'Valentine\'s Day, Mother\'s Day and the weeks before Christmas are the busy days, with red roses at more than twice their usual market price in early February. Weddings are quoted months ahead, mostly for summer Saturdays; a quarter is paid to book and the rest four weeks before. Prices include VAT, as a shop\'s do, so receipts and invoices show the VAT within them.',
  ],
  suits: ['A florist with a shop or a studio', 'A flower stall or market trader', 'A wedding and events florist', 'A plant shop or garden centre counter', 'A gift and hamper shop that makes up orders', 'A cake maker who takes orders for set days'],
  tables: {
    Business: BUSINESS_ABOUT,
    Staff: { about: 'The people who work in the shop and drive the van.', fields: {
      'First Name': 'Their first name.', 'Last Name': 'Their family name.', Role: 'Their job: Owner and head florist, Florist, Junior florist or Delivery driver.',
      Phone: 'Their work phone.', 'E-mail': 'Their work e-mail address.', Started: 'The day they joined.',
    } },
    Suppliers: { about: 'Where stems and sundries are bought: the wholesale market, a grower and a sundries wholesaler. The sample\'s are invented.', fields: {
      Name: 'The supplier\'s name.', Kind: 'Market, Grower or Sundries.', Address: 'The street address.', City: 'The town or city.', Postcode: 'The postcode.',
      Phone: 'Their phone number.', 'E-mail': 'Where orders go.', 'Account No': 'Your account or buyer number with them.', 'Buying Days': 'The days you usually buy from them.',
    } },
    Items: { about: 'What is bought to make the flowers: each kind of stem, foliage, plant and sundry, with how long it lasts and how many are in the workroom now.', fields: {
      Name: 'The item, such as Rose, red, 50 cm. Each name is used once.', Kind: 'Flower, Foliage, Plant or Sundry.', Supplier: 'Who you usually buy it from.',
      Unit: 'How it is bought, such as Bunch of 20.', 'Stems per Unit': 'How many stems (or pieces) come in one unit.',
      'Cost per Stem': 'What one stem cost at the last buy. The margin query uses it, so it moves with the market.',
      'Life Days': 'How many days after buying it is at its best; after that it is thrown away. Sundries last a long time.',
      Season: 'When it can be bought: All year, or the months it is in season.', 'In Stock': 'How many stems are in the workroom now, after what has been used and thrown away.',
    } },
    Products: { about: 'What the shop sells: bouquets, arrangements, plants, funeral tributes, wedding flowers and gifts, each with its price.', fields: {
      Name: 'The product as it is shown to customers. Each name is used once.', Code: 'A short code for the till. Each is used once.',
      Kind: 'Bouquet, Arrangement, Plant, Gift, Funeral, Wedding, Christmas or Service.', Price: 'The price, VAT included, as it is shown in the shop.',
      'Tax Rate': 'The VAT within the price, as a fraction: 0.2 is twenty percent.', Season: 'When it is sold: All year, or its months.',
      Description: 'A line describing it, for the website and the order pad.', 'On Sale': 'Ticked while it is sold; untick it to keep it off the till without losing old sales.',
    } },
    'Recipe Lines': { about: 'What goes into each product: the stems, foliage and sundries, and how many of each. The stems to buy and the margins are worked out from these.', fields: {
      Product: 'The product.', Line: 'The order the recipe lists them in, the main flower first. The margin query counts the price once, on line 1.',
      Item: 'The stem or sundry.', Stems: 'How many go in one of the product.',
    } },
    Purchases: { about: 'Each buy at the market, from the grower or from the sundries wholesaler.', fields: {
      Number: 'The buy\'s number, in date order: PUR-2026-0042.', Supplier: 'Who it was bought from.', 'Bought On': 'The day.', Total: 'What it cost in all.',
    } },
    'Purchase Lines': { about: 'What was bought on each buy. Each line is a batch of stems with its own use-by day.', fields: {
      Purchase: 'The buy it was part of.', Item: 'What was bought.', Units: 'How many bunches, boxes or packs.', 'Unit Cost': 'What one unit cost that day.',
      Stems: 'How many stems that comes to.', 'Use By': 'The last day the batch is at its best: the day bought and the item\'s life.',
    } },
    Waste: { about: 'Stems thrown away, past their best or damaged, logged at the morning check.', fields: {
      Item: 'What was thrown away.', Batch: 'The batch it came from.', When: 'The day it was thrown away.', Stems: 'How many stems.',
      Cost: 'What they had cost.', Reason: 'Past its best, or Damaged.',
    } },
    'Delivery Areas': { about: 'The areas the van delivers to and what each costs.', fields: {
      Name: 'The area\'s name. Each is used once.', Postcodes: 'The postcode districts it covers.', Charge: 'The delivery charge, VAT included.',
    } },
    'Delivery Runs': { about: 'Each morning or afternoon run of the van, with its driver.', fields: {
      'Run Date': 'The day.', Slot: 'Morning or Afternoon.', Driver: 'Who drives it.', Notes: 'Anything for the run, such as which van.',
    } },
    Customers: { about: 'Everyone who orders: people sending flowers, the couples and families who book weddings, and businesses with a standing order.', fields: {
      'First Name': 'Their first name.', 'Last Name': 'Their family name.', Company: 'The business, for a business customer.',
      Kind: 'Private or Business.', Address: 'Their own address, where the confirmation goes.', City: 'The town.', Postcode: 'The postcode.',
      Phone: 'The number to call them on.', 'E-mail': 'Their e-mail address.', Added: 'The day they first ordered.',
    } },
    Orders: { about: 'Every order taken by phone, online or in the shop, for delivery, collection or a funeral, and the weekly standing orders for businesses.', fields: {
      Number: 'The order\'s number, given in the order they are taken: ORD-2026-0042.', Customer: 'Who ordered and paid.', 'Taken By': 'Who took it.',
      Taken: 'The day and time it was taken.', Kind: 'Delivery, Collection, Funeral or Contract.', Occasion: 'What it is for: Birthday, Sympathy, Valentine\'s and so on.',
      'Due Date': 'The day it is delivered or collected.', Slot: 'Morning or Afternoon.', Recipient: 'Who the flowers are for.',
      'Recipient Phone': 'A number for the driver if no one answers.', Address: 'Where it goes; for a collection, the shop.', City: 'The town.', Postcode: 'The postcode.',
      Area: 'The delivery area, which sets the charge.', Run: 'The van run it goes on.', Description: 'What the florist is to make, in words.',
      'Card Included': 'Ticked when a card goes with the flowers.', 'Card Message': 'The words for the card, as the customer gave them.',
      'Card From': 'Who the card says it is from.', 'Delivery Charge': 'The charge for the area, VAT included; nought for a collection.',
      Net: 'The total without its VAT.', Tax: 'The VAT within the total: each line\'s worked out to the penny, and the delivery\'s, added up.',
      Total: 'What the customer pays: the flowers and the delivery.', Payment: 'How it was paid.', 'Paid On': 'The day it was paid; empty for a cancelled order or a standing order not yet delivered.',
      Status: 'Booked, Made, Out for delivery, Delivered, Collected or Cancelled.',
    } },
    'Order Lines': { about: 'What is on each order.', fields: {
      Order: 'The order.', Product: 'What is to be made.', Quantity: 'How many.', 'Unit Price': 'The price of one, VAT included, kept as it was on the day.',
      'Tax Rate': 'The VAT within the price, taken from the product.',
    } },
    'Till Sales': { about: 'Every sale over the counter, one record per receipt.', fields: {
      Number: 'The receipt\'s number, in time order: RCP-2026-00042.', 'Sold At': 'The day and time.', 'Served By': 'Who served.',
      Payment: 'Card or Cash.', Net: 'The total without its VAT.', Tax: 'The VAT within the total, each line\'s added up.', Total: 'What was paid.',
    } },
    'Till Lines': { about: 'What was sold on each receipt.', fields: {
      'Till Sale': 'The receipt.', Product: 'What was sold.', Quantity: 'How many.', 'Unit Price': 'The price of one, VAT included.', 'Tax Rate': 'The VAT within the price.',
    } },
    Weddings: { about: 'Every wedding quoted, with its booking, deposit, invoice and balance.', fields: {
      'Quote No': 'The quote\'s number, in date order: QUO-2026-0042.', Customer: 'Who the quote and invoice go to.', Couple: 'The couple\'s names.',
      'Wedding Date': 'The day.', 'Ceremony Venue': 'Where the ceremony is.', 'Reception Venue': 'Where the reception is.', Colours: 'The colours chosen.',
      'Quoted On': 'The day the quote was sent.', 'Valid Until': 'The last day its prices hold.', Status: 'Quoted, Booked, Declined or Done.',
      Net: 'The total without its VAT.', Tax: 'The VAT within the total.', Total: 'The whole price of the flowers.',
      Deposit: 'The quarter paid to book.', 'Deposit Paid On': 'The day it was paid.', 'Invoice No': 'The invoice\'s number, given when the wedding is booked: INV-2026-0012.',
      'Invoice Date': 'The day the invoice was sent.', 'Balance Due On': 'Four weeks before the wedding.', 'Balance Paid On': 'The day the balance came in; empty while it is owed.',
      Notes: 'Anything to remember: allergies, a flower the couple does not want, access at the venue.',
    } },
    'Wedding Lines': { about: 'What is quoted and made for each wedding.', fields: {
      Wedding: 'The wedding.', Line: 'The order the lines print in.', Product: 'The product it is.', Description: 'The words on the quote, with the colours.',
      Quantity: 'How many.', 'Unit Price': 'The price of one, VAT included.', 'Tax Rate': 'The VAT within the price.',
    } },
  },
  queries: {
    'Deliveries today and tomorrow': 'Every delivery for today and tomorrow, by area and then by time, with the address and the recipient\'s phone: the driver\'s list and the workroom\'s.',
    'Stems to buy for the next 3 days': 'The flowers and foliage that the orders booked for the next three days need, item by item, beside what is in the workroom: buy the difference, and more for the till.',
    'Waste by week': 'Stems thrown away and what they cost, a line for each of the last twelve weeks: week 0 is the last seven days.',
    'Waste by item': 'What has been thrown away in the last four weeks, item by item, the costliest first: the items to buy less of.',
    'Weddings in the next 60 days': 'Booked weddings in the next sixty days whose balance has not been paid, with the balance and how many days until it is due (below nought when it is late).',
    'Margin per product': 'Each product on sale with its price, what its stems cost at the last market price, and the margin left after VAT and stems, the best first.',
    'Takings by occasion': 'Orders paid in the last twelve months by occasion, with what they brought in.',
    'Till takings by day': 'Receipts, takings and VAT at the till for each of the last fourteen days.',
    'Orders by month': 'Orders by the month they were delivered, with their takings and the delivery charges.',
    'Deliveries by area': 'Deliveries in the last ninety days by area, with the charges collected: whether each area\'s charge is right.',
    'Market spend by month': 'What was spent with each supplier each month.',
    'Customers who order most': 'Customers who have spent 150 or more on orders, the biggest first.',
  },
  reports: {
    'Delivery sheet': 'Today\'s and tomorrow\'s deliveries on a page for each area, for the driver to take.',
    'Market list': 'What the booked orders need from the market for the next three days, beside what is in stock.',
    'Weekly waste': 'Stems and money thrown away each week for twelve weeks, with the totals.',
    'Wedding balances': 'Balances due on the weddings of the next sixty days, and the total to come.',
    'Product margins': 'The price list with the cost of stems and the margin of each product, by kind.',
    'Occasion takings': 'A year\'s order takings by occasion.',
    'Till takings': 'The till for the last fourteen days, with the totals for cashing up and the VAT return.',
    'Monthly orders': 'Orders and their takings, month by month.',
  },
  documents: {
    'Order confirmation': 'The letter or e-mail sent when an order is taken: what will be made, for whom, where and when, the card\'s words, what was paid and when, and how to change or cancel. The delivery charge shows only when there is one. It is for the orders customers place, not the weekly standing orders, and not cancelled ones; any order chosen on the Orders form still prints.',
    'Gift card message': 'The small card that goes with the flowers: the message and who it is from, nothing else. It is only for the orders with Card Included ticked, so a standing order with no card has none.',
    'Delivery note': 'Goes with the driver: the recipient, the address, the time, that a card is enclosed when there is one, and what is being delivered, with no prices, a line of care for the flowers (or for a funeral tribute, or the weekly arrangement), and a line for whoever takes them in to sign. It is for the orders that go out in the van, not collections or cancelled orders.',
    'Wedding quote': 'Sent after the consultation: the couple, the date and venues, each piece with its price, the total with its VAT, and the deposit to book. Once the wedding is booked the quote shows the deposit paid instead, and a declined quote says it was not taken up.',
    'Wedding invoice': 'Sent when a wedding is booked: the same lines, the deposit paid and the balance due four weeks before the day, or the balance paid and a thank you once it has come in. It is for the weddings with an invoice number, the booked ones.',
    'Till receipt': 'The receipt from the till, on an 80 mm roll: what was bought, the total and the VAT within it.',
  },
  tutorial: [
    { title: 'Take an order for delivery', steps: [
      'Find the customer in the Customers form, or press New and type their name, address, phone and e-mail.',
      'Open the Orders form and press New. Type the next Number, choose the customer in Customer and yourself in Taken By, and type when it was taken in Taken.',
      'Choose Delivery in Kind and the Occasion, type the Due Date and Slot, the Recipient, their phone and the address, and choose the Area. Type its charge in Delivery Charge.',
      'Type what to make in Description, and the card\'s words in Card Message and Card From; tick Card Included.',
      'In the order lines below, choose each product and type the quantity and price. Type the Total, the Tax within it and the Net, how it was paid and Paid On.',
      'Open the print template Order confirmation, choose the order, and press Save as PDF to e-mail it.',
    ] },
    { title: 'Get the day\'s deliveries out', steps: [
      'First thing, open the Delivery Runs form and add the morning run (and the afternoon one on a busy day) with its driver. On each order going out, choose the run in Run.',
      'Print the report Delivery sheet: the deliveries for today and tomorrow, by area.',
      'Open the print template Gift card message and print the cards for today\'s orders; open Delivery note and print a note for each.',
      'As each order is made set its Status to Made, then Out for delivery, then Delivered when the driver is back.',
    ] },
    { title: 'Buy at the market', steps: [
      'The evening before, run the query Stems to buy for the next 3 days, or print the report Market list, and add what the till usually sells.',
      'After buying, open the Purchases form and press New: type the next Number, choose the supplier and type Bought On.',
      'In the lines below, add each item with the Units, the Unit Cost, the Stems and the Use By day (the day bought and the item\'s Life Days).',
      'Add the stems to In Stock in the Items form, and type the new Cost per Stem when the price has changed.',
    ] },
    { title: 'Log the morning waste check', steps: [
      'Go through the buckets. For each item past its best, open the Waste form and press New: choose the Item and the batch, type the day, the Stems and what they cost, and choose the Reason.',
      'Take the stems off In Stock in the Items form.',
      'On Mondays print the report Weekly waste, and run Waste by item to see what to buy less of.',
    ] },
    { title: 'Sell at the till', steps: [
      'Open the Till Sales form and press New. Type the next Number, the time in Sold At, and choose yourself in Served By.',
      'In the lines below, choose each product and type the quantity and its price. Type the Total, the Tax within it and Net, and choose Card or Cash in Payment.',
      'Open the print template Till receipt, choose the sale, and press Print.',
      'At closing, print the report Till takings to cash up.',
    ] },
    { title: 'Quote for a wedding and book it', steps: [
      'Add the couple in the Customers form. Open the Weddings form and press New: type the next Quote No, choose the customer, and type the Couple, the Wedding Date, the venues and the Colours.',
      'Type Quoted On and Valid Until (a month on). In the lines below, add each piece: the product, the description with the colours, the quantity and the price. Type the Total, Tax and Net.',
      'Open the print template Wedding quote, choose the wedding and press Save as PDF to send it.',
      'When they book, set Status to Booked, type the Deposit and Deposit Paid On, the next Invoice No, the Invoice Date and Balance Due On (four weeks before). Print the print template Wedding invoice.',
      'Each week run the query Weddings in the next 60 days, or print Wedding balances, to see which balances are due. Type Balance Paid On when one comes in.',
    ] },
    { title: 'Look back over the month', steps: [
      'Print the report Monthly orders for the orders delivered, and Till takings for the counter.',
      'Print the report Occasion takings to see what people buy flowers for, and Product margins to see which products earn most.',
      'Run the query Market spend by month to set what was bought against what was sold, and Deliveries by area to check the delivery charges.',
    ] },
  ],
  notes: [
    'In Stock on an item is kept by hand: add the stems when you buy, take them off as they are used or thrown away. The sample\'s figures were made that way, so they never go below nought.',
    'A product\'s recipe is what the margin and the stems to buy are worked out from. Keep it close to what the florists really use; when a bouquet changes, change its recipe lines.',
    'The margin query counts each product\'s price once, on its recipe\'s line 1, and takes the cost of every line from it. Every recipe needs a line 1.',
    'Prices include VAT. The VAT within a price is the price less the price divided by 1.2; each line\'s is worked out to the penny and added up, as the receipt and invoice print it.',
    'Each print template prints only the orders it is for: no confirmation for a standing order, no card where none is wanted, no delivery note for a collection, and nothing for a cancelled order. The Wedding invoice prints for booked weddings only. Choose the orders to print, or print the one on screen, which always prints.',
    'Weddings are separate from orders, with their own lines, because they are quoted and paid differently. A quote not yet booked prints a Wedding invoice with no number; print the invoice only once the wedding is booked.',
    'Walk-in sales are in Till Sales and are not given an occasion, so the query Takings by occasion counts orders only.',
  ],
  faq: [
    { q: 'How do I know what to buy at the market?', a: 'Run the query Stems to buy for the next 3 days (or print the report Market list). It adds up the recipes of every order booked for the next three days, beside what is in stock. Add what the till sells on a usual day, and more before a busy day.' },
    { q: 'Why do my margins change from week to week?', a: 'The margin uses each item\'s Cost per Stem, the price at the last buy. When roses go up at the market before Valentine\'s Day, the margin on a dozen roses comes down until the price falls again.' },
    { q: 'How do I print tomorrow\'s cards?', a: 'Open the print template Gift card message from Print templates and choose tomorrow\'s orders (the query Deliveries today and tomorrow lists them). Each card has only the message and who it is from.' },
    { q: 'How do I change the delivery charges?', a: 'Edit the Charge in the Delivery Areas form. New orders take the new charge; orders already taken keep theirs.' },
    { q: 'A customer has cancelled. What do I do?', a: 'Set the order\'s Status to Cancelled and clear Paid On when the money has gone back. Cancelled orders are left out of the takings and the deliveries.' },
    { q: 'How do I see what is being thrown away?', a: 'Print the report Weekly waste for twelve weeks of waste, and run Waste by item for the last four weeks by item, the costliest first.' },
    { q: 'Where is a wedding\'s balance?', a: 'The Total less the Deposit. The query Weddings in the next 60 days shows it for each booked wedding not yet paid, with the days until it is due.' },
  ],
  empty: 'Start with Business, your own name, address, VAT number and bank details, which every document prints. Then Staff, Suppliers, Items (every stem, foliage and sundry you buy, with its life) and Products, then each product\'s Recipe Lines, and Delivery Areas. Count what is in the workroom into In Stock. Customers, orders, runs, till sales, purchases, waste and weddings come in as you trade.',
  adapt: [
    'Sell online: add a Source field to Orders (Phone, Website, Shop) and a query of orders by source.',
    'Remember the dates customers send flowers for: add a Reminders table (customer, occasion, date, recipient) and a query of reminders in the next fourteen days, to call or e-mail them.',
    'Price by size: add Small, Medium and Large as separate products, each with its own recipe, as the sample does with hand-tied bouquets.',
    'Take accounts for businesses and funeral directors: add Payment Days to Customers and an Invoices table, so standing orders are invoiced monthly.',
    'Record substitutions: add a Substitutions table (order, item asked for, item used) for the days the market runs short.',
    'Hire out vases and stands for weddings: add a Hire Items table and a Wedding Hire table with the return date, and a query of what is still out.',
    'Count the van\'s miles: add Miles and Fuel to Delivery Runs and a monthly query of the cost of delivering.',
  ],
};

// What is bought: [name, kind, supplier, unit, per unit, cost per stem, life days, months in season or null, season words].
const SPRING = [1, 2, 3, 4];
const ITEMS = [
  ['Rose, red, 50 cm', 'Flower', 'market', 'Bunch of 20', 20, 0.62, 8, null, 'All year'],
  ['Rose, white, 50 cm', 'Flower', 'market', 'Bunch of 20', 20, 0.58, 8, null, 'All year'],
  ['Rose, pink, 50 cm', 'Flower', 'market', 'Bunch of 20', 20, 0.58, 8, null, 'All year'],
  ['Spray rose, peach', 'Flower', 'market', 'Bunch of 10', 10, 0.75, 7, null, 'All year'],
  ['Lisianthus, white', 'Flower', 'market', 'Bunch of 10', 10, 0.85, 8, null, 'All year'],
  ['Alstroemeria, mixed', 'Flower', 'market', 'Bunch of 10', 10, 0.4, 12, null, 'All year'],
  ['Chrysanthemum, white bloom', 'Flower', 'market', 'Bunch of 10', 10, 0.55, 14, null, 'All year'],
  ['Carnation, pink', 'Flower', 'market', 'Box of 25', 25, 0.3, 14, null, 'All year'],
  ['Lily, oriental white', 'Flower', 'market', 'Bunch of 10', 10, 1.4, 9, null, 'All year'],
  ['Gypsophila', 'Flower', 'market', 'Bunch of 10', 10, 0.7, 8, null, 'All year'],
  ['Freesia, yellow', 'Flower', 'market', 'Bunch of 10', 10, 0.55, 6, null, 'All year'],
  ['Hydrangea, blue', 'Flower', 'market', 'Box of 5', 5, 2.2, 6, null, 'All year'],
  ['Stocks, purple', 'Flower', 'market', 'Bunch of 10', 10, 0.7, 6, null, 'All year'],
  ['Tulip, mixed', 'Flower', 'grower', 'Bunch of 10', 10, 0.45, 6, SPRING, 'January to April'],
  ['Ranunculus, mixed', 'Flower', 'grower', 'Bunch of 10', 10, 0.95, 7, SPRING, 'January to April'],
  ['Peony, pink', 'Flower', 'grower', 'Bunch of 10', 10, 2.4, 6, [5, 6], 'May and June'],
  ['Sunflower', 'Flower', 'grower', 'Bunch of 10', 10, 0.8, 7, [6, 7, 8, 9], 'June to September'],
  ['Eucalyptus', 'Foliage', 'market', 'Bunch of 10', 10, 0.45, 18, null, 'All year'],
  ['Ruscus', 'Foliage', 'market', 'Bunch of 10', 10, 0.3, 21, null, 'All year'],
  ['Pittosporum', 'Foliage', 'market', 'Bunch of 10', 10, 0.35, 16, null, 'All year'],
  ['Salal', 'Foliage', 'market', 'Bunch of 10', 10, 0.3, 14, null, 'All year'],
  ['Spruce sprigs', 'Foliage', 'grower', 'Bundle of 25', 25, 0.3, 25, [11, 12], 'November and December'],
  ['Holly with berries', 'Foliage', 'grower', 'Bunch of 10', 10, 0.6, 14, [11, 12], 'November and December'],
  ['Orchid, white, potted', 'Plant', 'market', 'Tray of 6', 6, 7.5, 45, null, 'All year'],
  ['Peace lily, potted', 'Plant', 'market', 'Tray of 6', 6, 6, 45, null, 'All year'],
  ['Kraft wrap, sheet', 'Sundry', 'sundries', 'Pack of 100', 100, 0.12, 3650, null, 'All year'],
  ['Tissue, sheet', 'Sundry', 'sundries', 'Pack of 240', 240, 0.05, 3650, null, 'All year'],
  ['Satin ribbon, metre', 'Sundry', 'sundries', 'Reel of 50 m', 50, 0.15, 3650, null, 'All year'],
  ['Gift card and envelope', 'Sundry', 'sundries', 'Pack of 100', 100, 0.08, 3650, null, 'All year'],
  ['Water bag, tied', 'Sundry', 'sundries', 'Pack of 100', 100, 0.25, 3650, null, 'All year'],
  ['Floral foam brick', 'Sundry', 'sundries', 'Box of 20', 20, 0.9, 3650, null, 'All year'],
  ['Glass vase, 20 cm', 'Sundry', 'sundries', 'Box of 6', 6, 3.5, 3650, null, 'All year'],
  ['Wreath ring, 30 cm', 'Sundry', 'sundries', 'Box of 10', 10, 2.2, 3650, null, 'All year'],
  ['Tribute letter frame', 'Sundry', 'sundries', 'Box of 10', 10, 4.5, 3650, null, 'All year'],
  ['Hatbox, medium', 'Sundry', 'sundries', 'Pack of 10', 10, 3.2, 3650, null, 'All year'],
  ['Ceramic pot', 'Sundry', 'sundries', 'Box of 12', 12, 2.5, 3650, null, 'All year'],
];
const WRAP = [['Kraft wrap, sheet', 1], ['Tissue, sheet', 2], ['Satin ribbon, metre', 1], ['Water bag, tied', 1], ['Gift card and envelope', 1]];
// What is sold: [name, code, kind, price, months on sale or null, season words, description, recipe [[item, stems]...]].
const PRODUCTS = [
  ['Hand-tied bouquet, small', 'HT-S', 'Bouquet', 30, null, 'All year', 'Roses, lisianthus and alstroemeria with eucalyptus, hand-tied in kraft and tissue.', [['Rose, pink, 50 cm', 3], ['Alstroemeria, mixed', 4], ['Lisianthus, white', 2], ['Eucalyptus', 3], ['Pittosporum', 2], ...WRAP]],
  ['Hand-tied bouquet, medium', 'HT-M', 'Bouquet', 45, null, 'All year', 'A fuller hand-tied of roses, spray roses, lisianthus and alstroemeria with mixed foliage.', [['Rose, pink, 50 cm', 5], ['Spray rose, peach', 3], ['Lisianthus, white', 3], ['Alstroemeria, mixed', 5], ['Eucalyptus', 4], ['Ruscus', 3], ...WRAP]],
  ['Hand-tied bouquet, large', 'HT-L', 'Bouquet', 65, null, 'All year', 'A generous hand-tied with lilies, roses, hydrangea and lisianthus.', [['Rose, white, 50 cm', 8], ['Lily, oriental white', 3], ['Lisianthus, white', 4], ['Spray rose, peach', 5], ['Hydrangea, blue', 1], ['Eucalyptus', 5], ['Pittosporum', 4], ...WRAP]],
  ['Dozen red roses, hand-tied', 'RR-12', 'Bouquet', 75, null, 'All year', 'Twelve long red roses with gypsophila and eucalyptus.', [['Rose, red, 50 cm', 12], ['Gypsophila', 3], ['Eucalyptus', 4], ...WRAP]],
  ['Single red rose, wrapped', 'RR-1', 'Bouquet', 6.5, null, 'All year', 'One red rose in tissue and ribbon.', [['Rose, red, 50 cm', 1], ['Tissue, sheet', 1], ['Satin ribbon, metre', 1]]],
  ['Wrapped bunch, seasonal', 'WB', 'Bouquet', 18, null, 'All year', 'A bright wrapped bunch from the buckets, ready to take away.', [['Carnation, pink', 6], ['Alstroemeria, mixed', 5], ['Freesia, yellow', 3], ['Ruscus', 3], ['Kraft wrap, sheet', 1], ['Satin ribbon, metre', 1]]],
  ['Spring tulip bunch', 'TU', 'Bouquet', 15, SPRING, 'January to April', 'Ten tulips wrapped in kraft.', [['Tulip, mixed', 10], ['Kraft wrap, sheet', 1], ['Satin ribbon, metre', 1]]],
  ['Ranunculus and tulip posy', 'RT', 'Bouquet', 32, SPRING, 'January to April', 'A spring posy of ranunculus and tulips.', [['Ranunculus, mixed', 6], ['Tulip, mixed', 6], ['Pittosporum', 3], ...WRAP]],
  ['Sunflower bunch', 'SF', 'Bouquet', 20, [6, 7, 8, 9], 'June to September', 'Five sunflowers with ruscus.', [['Sunflower', 5], ['Ruscus', 3], ['Kraft wrap, sheet', 1], ['Satin ribbon, metre', 1]]],
  ['Peony bouquet', 'PE', 'Bouquet', 55, [5, 6], 'May and June', 'Seven pink peonies with eucalyptus, hand-tied.', [['Peony, pink', 7], ['Eucalyptus', 4], ...WRAP]],
  ['Vase arrangement', 'VA', 'Arrangement', 60, null, 'All year', 'Roses, lilies and hydrangea arranged in a glass vase, ready to put down.', [['Glass vase, 20 cm', 1], ['Rose, pink, 50 cm', 6], ['Lily, oriental white', 2], ['Hydrangea, blue', 1], ['Salal', 4], ['Eucalyptus', 3], ['Gift card and envelope', 1]]],
  ['Hatbox of roses', 'HB', 'Arrangement', 70, null, 'All year', 'Sixteen pink roses set in a hatbox.', [['Hatbox, medium', 1], ['Floral foam brick', 1], ['Rose, pink, 50 cm', 16], ['Gypsophila', 2], ['Gift card and envelope', 1]]],
  ['Orchid in ceramic pot', 'OR', 'Plant', 25, null, 'All year', 'A white orchid in a ceramic pot.', [['Orchid, white, potted', 1], ['Ceramic pot', 1]]],
  ['Peace lily in ceramic pot', 'PL', 'Plant', 22, null, 'All year', 'A peace lily in a ceramic pot.', [['Peace lily, potted', 1], ['Ceramic pot', 1]]],
  ['Glass vase', 'GV', 'Gift', 8, null, 'All year', 'A plain 20 cm glass vase to go with a bouquet.', [['Glass vase, 20 cm', 1]]],
  ['Sympathy posy', 'SY', 'Funeral', 40, null, 'All year', 'A posy of white chrysanthemums, lilies and roses in foam.', [['Chrysanthemum, white bloom', 4], ['Lily, oriental white', 2], ['Rose, white, 50 cm', 3], ['Salal', 3], ['Floral foam brick', 1], ['Gift card and envelope', 1]]],
  ['Funeral wreath, white and green', 'FW', 'Funeral', 85, null, 'All year', 'A 30 cm wreath of white chrysanthemums and roses on green foliage.', [['Wreath ring, 30 cm', 1], ['Chrysanthemum, white bloom', 12], ['Rose, white, 50 cm', 6], ['Salal', 10], ['Pittosporum', 6], ['Gift card and envelope', 1]]],
  ['Casket spray', 'CS', 'Funeral', 180, null, 'All year', 'A long spray for the top of the coffin: white roses, lilies and lisianthus.', [['Floral foam brick', 3], ['Rose, white, 50 cm', 20], ['Lily, oriental white', 6], ['Lisianthus, white', 8], ['Chrysanthemum, white bloom', 10], ['Eucalyptus', 10], ['Ruscus', 10], ['Gift card and envelope', 1]]],
  ['Letter tribute, per letter', 'LT', 'Funeral', 45, null, 'All year', 'One letter of a name tribute, such as MUM, in white chrysanthemums edged with ribbon.', [['Tribute letter frame', 1], ['Chrysanthemum, white bloom', 15], ['Satin ribbon, metre', 2]]],
  ['Christmas door wreath', 'XW', 'Christmas', 55, [11, 12], 'November and December', 'A door wreath of spruce and holly with a ribbon bow.', [['Wreath ring, 30 cm', 1], ['Spruce sprigs', 15], ['Holly with berries', 4], ['Satin ribbon, metre', 2]]],
  ['Christmas table centrepiece', 'XC', 'Christmas', 45, [12], 'December', 'Spruce, holly and red roses around a candle, in foam.', [['Floral foam brick', 1], ['Spruce sprigs', 8], ['Holly with berries', 3], ['Rose, red, 50 cm', 5], ['Satin ribbon, metre', 1]]],
  ['Reception arrangement, weekly', 'CO', 'Arrangement', 95, null, 'All year', 'A large arrangement for a reception desk, changed every week.', [['Floral foam brick', 1], ['Lily, oriental white', 5], ['Rose, white, 50 cm', 8], ['Hydrangea, blue', 2], ['Salal', 6], ['Eucalyptus', 5]]],
  ['Bridal bouquet', 'WD-B', 'Wedding', 165, null, 'All year', 'The bride\'s hand-tied bouquet.', [['Rose, white, 50 cm', 15], ['Spray rose, peach', 8], ['Lisianthus, white', 6], ['Gypsophila', 3], ['Eucalyptus', 6], ['Satin ribbon, metre', 2]]],
  ['Bridesmaid bouquet', 'WD-M', 'Wedding', 65, null, 'All year', 'A smaller bouquet to match the bride\'s.', [['Rose, white, 50 cm', 6], ['Spray rose, peach', 4], ['Lisianthus, white', 3], ['Eucalyptus', 4], ['Satin ribbon, metre', 1]]],
  ['Buttonhole', 'WD-H', 'Wedding', 12, null, 'All year', 'A spray rose buttonhole with eucalyptus.', [['Spray rose, peach', 1], ['Eucalyptus', 1], ['Satin ribbon, metre', 1]]],
  ['Corsage', 'WD-C', 'Wedding', 18, null, 'All year', 'A wrist or pin corsage.', [['Spray rose, peach', 2], ['Gypsophila', 1], ['Satin ribbon, metre', 1]]],
  ['Ceremony arrangement', 'WD-A', 'Wedding', 120, null, 'All year', 'A large pedestal arrangement for the ceremony.', [['Floral foam brick', 2], ['Rose, white, 50 cm', 12], ['Lily, oriental white', 5], ['Hydrangea, blue', 3], ['Eucalyptus', 8], ['Ruscus', 8]]],
  ['Table centrepiece', 'WD-T', 'Wedding', 45, null, 'All year', 'A low centrepiece for a reception table.', [['Floral foam brick', 1], ['Rose, white, 50 cm', 6], ['Lisianthus, white', 3], ['Eucalyptus', 4], ['Gypsophila', 2]]],
  ['Arch garland, per metre', 'WD-G', 'Wedding', 75, null, 'All year', 'A metre of garland for an arch or a top table.', [['Floral foam brick', 1], ['Ruscus', 10], ['Eucalyptus', 10], ['Spray rose, peach', 6], ['Gypsophila', 4]]],
  ['Delivery and set-up', 'WD-D', 'Service', 85, null, 'All year', 'Delivery on the morning, setting up at both venues and collecting the vases after.', []],
];
const AREAS = [
  ['Stoke Newington', ['N16'], 5.95, 5], ['Dalston and Hackney', ['E8', 'E9'], 6.95, 4], ['Clapton', ['E5'], 6.95, 2], ['Highbury', ['N5'], 6.95, 2],
  ['Islington', ['N1', 'N7'], 7.95, 3], ['Finsbury Park', ['N4'], 6.95, 2], ['Tottenham', ['N15', 'N17'], 7.95, 2], ['Walthamstow', ['E17'], 8.95, 1.5],
];
const STREETS = ['Church Street', 'Mill Lane', 'Station Road', 'Orchard Way', 'Beech Grove', 'Riverside Drive', 'Cedar Avenue', 'Linden Close', 'Hawthorn Road', 'Kingfisher Way', 'Ashdown Crescent', 'Meadow Rise', 'Elm Park Road', 'Harbour Street', 'Canal Walk', 'Market Square'];
const FUNERAL_DIRECTORS = [['Hollybrook Funeral Service', '12 Mill Lane', 'N16'], ['Linden Funeral Care', '88 Station Road', 'E5'], ['Cedar House Funeral Directors', '5 Beech Grove', 'N4']];
const MESSAGES = {
  Birthday: ['Happy birthday! Have the loveliest day.', 'Happy birthday Mum, with all our love.', 'Wishing you a wonderful birthday and a year of good things.', 'Happy 40th! Here is to the next forty.', 'Happy birthday, sorry we cannot be there. See you soon.'],
  Anniversary: ['Happy anniversary, my love. Here is to many more years.', 'Ten years today. Thank you for every one of them.', 'Happy anniversary to the two of you.'],
  'Thank you': ['Thank you so much for everything you did for us.', 'A small thank you for being such a good neighbour.', 'Thank you for looking after the children so well this year.'],
  'Get well': ['Get well soon. Thinking of you and sending love.', 'Hope you are back on your feet very soon.', 'Sending you sunshine and a speedy recovery.'],
  'New baby': ['Congratulations on the arrival of your little one!', 'Welcome to the world, little one. Love to all three of you.'],
  Sympathy: ['Thinking of you at this sad time.', 'With deepest sympathy and love.', 'So sorry for your loss. We are here if you need anything.'],
  Congratulations: ['Congratulations on the new job! So proud of you.', 'Well done on passing your exams!', 'Congratulations on your new home.'],
  'Just because': ['Just because. Love you.', 'Thinking of you today.', 'A little something to brighten your week.'],
  'Valentine\'s': ['Happy Valentine\'s Day, my love.', 'To my Valentine, always.', 'Be mine? Happy Valentine\'s Day.'],
  'Mother\'s Day': ['Happy Mother\'s Day, Mum. Thank you for everything.', 'To the best mum in the world, happy Mother\'s Day.', 'Happy Mother\'s Day. We love you lots.'],
  Christmas: ['Merry Christmas and a happy new year!', 'Wishing you a peaceful Christmas, with love.', 'Happy Christmas from all of us.'],
  Funeral: ['Rest in peace. You will be greatly missed.', 'With fond memories and deepest sympathy.', 'Forever in our hearts.'],
};
const OCCASIONS = [['Birthday', 30], ['Anniversary', 10], ['Thank you', 10], ['Get well', 6], ['New baby', 6], ['Sympathy', 8], ['Congratulations', 6], ['Just because', 12]];
const VENUES = ['Canal Walk Town Hall', 'The Orchard Barn', 'Linden House Hotel', 'St Hilda\'s Church, Beech Grove', 'Riverside Pavilion', 'The Old Granary', 'Cedar Avenue Chapel', 'Harbour Street Register Office'];
const RECEPTIONS = ['The Orchard Barn', 'Linden House Hotel', 'Riverside Pavilion', 'The Kestrel Rooms', 'The Old Granary', 'The Mill House Restaurant'];
const COLOURS = ['Ivory and blush', 'White and green', 'Peach and coral', 'Burgundy and blush', 'Blue and white', 'Lilac and grey', 'Yellow and white'];
const WEDDING_MONTHS = [0.3, 0.4, 0.5, 0.8, 1.2, 1.5, 1.6, 1.5, 1.3, 0.8, 0.4, 0.5];

/** Easter Sunday of year `y`, as a month (0-11) and day: the Gregorian rule. */
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return { month: Math.floor((h + l - 7 * m + 114) / 31) - 1, day: ((h + l - 7 * m + 114) % 31) + 1 };
}

/** Fill a Hazel Row Flowers database made from `spec`. `r` is random(), `cal` calendar(). Answers counts. */
export function fill(base, { r, cal, days = 365 }) {
  const counts = {};
  const add = (table, values) => { counts[table] = (counts[table] || 0) + 1; return base.insert(table, values); };
  const iso = (d) => dayOf(d).iso;
  const yearOf = (d) => dayOf(d).y;
  const numbers = {};
  const number = (prefix, d, width = 4) => { const y = yearOf(d); const k = `${prefix}${y}`; numbers[k] = (numbers[k] || 0) + 1; return `${prefix}-${y}-${String(numbers[k]).padStart(width, '0')}`; };
  const vatIn = (amount, rate = 0.2) => money(amount - amount / (1 + rate));
  // Each day's month, date and weekday, worked out once: the fill asks for them many times.
  const days_ = new Map();
  const dayOf = (d) => { let x = days_.get(d); if (!x) { const t = cal.at(d); x = { m: t.getMonth() + 1, date: t.getDate(), wd: t.getDay(), y: t.getFullYear(), iso: cal.iso(t) }; days_.set(d, x); } return x; };
  const monthOf = (d) => dayOf(d).m;
  const dateOf = (d) => dayOf(d).date;
  const weekday = (d) => dayOf(d).wd;
  // Shut on Christmas Day and New Year's Day; open every other day, Sundays for a short morning.
  const closed = (d) => (monthOf(d) === 12 && dateOf(d) === 25) || (monthOf(d) === 1 && dateOf(d) === 1);
  const mothersDay = new Map();
  const isMothersDay = (d) => {
    const y = yearOf(d);
    if (!mothersDay.has(y)) { const e = easter(y); mothersDay.set(y, cal.iso(new Date(y, e.month, e.day - 21))); }
    return iso(d) === mothersDay.get(y);
  };
  // The busy days: how much more is ordered for delivery that day and sold over the counter, and the occasion.
  const busyMemo = new Map();
  const busy = (d) => { if (!busyMemo.has(d)) busyMemo.set(d, busyOn(d)); return busyMemo.get(d); };
  const busyOn = (d) => {
    const m = monthOf(d);
    const day = dateOf(d);
    if (m === 2 && day === 14) return { orders: 7, till: 5, occasion: 'Valentine\'s' };
    if (m === 2 && day === 13) return { orders: 3, till: 2.5, occasion: 'Valentine\'s' };
    if (m === 2 && day === 12) return { orders: 1.5, till: 1.3, occasion: 'Valentine\'s' };
    if (isMothersDay(d)) return { orders: 6, till: 3.5, occasion: 'Mother\'s Day' };
    if (isMothersDay(d + 1)) return { orders: 4, till: 3, occasion: 'Mother\'s Day' };
    if (isMothersDay(d + 2)) return { orders: 2, till: 1.5, occasion: 'Mother\'s Day' };
    if (m === 12 && day >= 23 && day <= 24) return { orders: 2.2, till: 2.5, occasion: 'Christmas' };
    if (m === 12 && day >= 14 && day <= 22) return { orders: 1.6, till: 1.8, occasion: 'Christmas' };
    return null;
  };
  const inSeason = (months, d) => !months || months.includes(monthOf(d));

  add('Business', businessRecord({
    name: 'Hazel Row Flowers', domain: 'hazelrow.example', phone: '020 7946 0610',
    address: { Address: '27 Church Street', City: 'London', Postcode: 'N16 0AB', Country: 'United Kingdom' },
    terms: 'Wedding balances are due four weeks before the wedding, by bank transfer.',
    footer: 'Open Monday to Saturday 8.30am to 5.30pm, Sunday 10am to 2pm. Deliveries across north and east London every day. Thank you for choosing us.',
  }));

  const ROLES = [['Owner and head florist', 3100], ['Florist', 1500], ['Florist', 640], ['Junior florist', 300], ['Delivery driver', 1100]];
  const staff = ROLES.map(([role, since], i) => {
    const p = person(r, { domain: 'hazelrow.example' });
    return { role, id: add('Staff', { 'First Name': p['First Name'], 'Last Name': p['Last Name'], Role: role, Phone: `020 7946 0${String(611 + i).padStart(3, '0')}`, 'E-mail': p['E-mail'], Started: iso(-since) }) };
  });
  const florists = staff.filter((s) => s.role !== 'Delivery driver').map((s) => s.id);
  const driver = staff.find((s) => s.role === 'Delivery driver').id;
  const junior = staff.find((s) => s.role === 'Junior florist').id;

  const SUPPLIERS = {
    market: ['Eastgate Flower Market', 'Market', 'Unit 14, Market Square', 'London', 'E15 2QR', 'Monday, Wednesday and Friday'],
    grower: ['Orchard Bloom Growers', 'Grower', 'Orchard Way', 'Waltham Abbey', 'EN9 3TU', 'Delivers on market days'],
    sundries: ['Kestrel Floral Sundries', 'Sundries', '7 Quarry Road', 'Enfield', 'EN3 7DE', 'Monday'],
  };
  const suppliers = {};
  for (const [key, [name, kind, a, city, post, buying]] of Object.entries(SUPPLIERS)) {
    suppliers[key] = add('Suppliers', { Name: name, Kind: kind, Address: a, City: city, Postcode: post, Phone: phoneFor(r, 'United Kingdom'), 'E-mail': `orders@${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`, 'Account No': `HR-${r.int(1000, 9999)}`, 'Buying Days': buying });
  }

  // Items: what is bought, with a batch list for each, oldest first.
  const items = new Map();
  for (const [name, kind, sup, unit, per, cost, life, months, season] of ITEMS) {
    const id = add('Items', { Name: name, Kind: kind, Supplier: suppliers[sup], Unit: unit, 'Stems per Unit': per, 'Cost per Stem': cost, 'Life Days': life, Season: season, 'In Stock': 0 });
    items.set(name, { id, name, kind, sup, per, cost, life, months, last: cost, batches: [] });
  }
  const products = new Map();
  for (const [name, code, kind, price, months, season, description, recipe] of PRODUCTS) {
    const id = add('Products', { Name: name, Code: code, Kind: kind, Price: price, 'Tax Rate': 0.2, Season: season, Description: description, 'On Sale': true });
    recipe.forEach(([item, stems], i) => add('Recipe Lines', { Product: id, Line: i + 1, Item: items.get(item).id, Stems: stems }));
    products.set(name, { id, name, kind, price, months, description, recipe: recipe.map(([item, stems]) => [items.get(item), stems]) });
  }
  const P = (name) => products.get(name);
  const areas = AREAS.map(([name, posts, charge, weight]) => ({ name, posts, charge, weight, id: add('Delivery Areas', { Name: name, Postcodes: posts.join(', '), Charge: charge }) }));
  const areaOf = (post) => areas.find((a) => a.posts.includes(post)) || areas[0];
  const where = () => {
    const a = r.weighted(areas.map((x) => [x, x.weight]));
    const post = r.pick(a.posts);
    return { area: a, Address: `${r.int(1, 160)} ${r.pick(STREETS)}`, City: 'London', Postcode: `${post} ${r.int(1, 9)}${r.pick(['AB', 'DE', 'FG', 'HJ', 'NP', 'QR', 'TU', 'WX'])}` };
  };
  const someone = () => `${r.pick(FIRST)} ${r.pick(LAST)}`;
  const signOff = (first) => `${r.pick(['Love,', 'With love,', 'All our love,', 'From', 'Love from'])} ${first}${r.chance(0.3) ? ` and ${r.pick(FIRST)}` : ''}${r.chance(0.25) ? ' xx' : ''}`;

  // Twelve months from the first of a month.
  let start = -days;
  while (dateOf(start) !== 1) start++;

  // Orders, made first as plans by the day they are due, then taken in the order they came in.
  const plans = [];
  const orderProduct = (d, occasion) => {
    const list = [[P('Hand-tied bouquet, small'), 3], [P('Hand-tied bouquet, medium'), 5], [P('Hand-tied bouquet, large'), 3], [P('Dozen red roses, hand-tied'), occasion === 'Valentine\'s' ? 14 : 1.2],
      [P('Vase arrangement'), 2], [P('Hatbox of roses'), 1.2], [P('Orchid in ceramic pot'), 1], [P('Peace lily in ceramic pot'), 0.5], [P('Peony bouquet'), 1.5], [P('Ranunculus and tulip posy'), 1.5],
      [P('Christmas table centrepiece'), occasion === 'Christmas' ? 3 : 0], [P('Christmas door wreath'), monthOf(d) === 12 || (monthOf(d) === 11 && dateOf(d) > 20) ? 2 : 0]];
    return r.weighted(list.filter(([p, w]) => w > 0 && inSeason(p.months, d)));
  };
  const plan = (due, o) => plans.push({ due, ...o });
  const leadFor = (b) => (b ? r.int(0, 10) : r.weighted([[0, 3], [1, 4], [2, 2], [3, 1], [5, 1], [7, 0.5]]));
  for (let D = start; D <= 7; D++) {
    if (closed(D)) continue;
    const wd = weekday(D);
    const b = busy(D);
    const n = Math.round((wd === 0 ? 1 : wd === 6 ? 5.5 : 4.5) * (b ? b.orders : 1) * (0.6 + r.next() * 0.8));
    for (let k = 0; k < n; k++) {
      const kind = wd !== 0 && !b && r.chance(0.06) ? 'Funeral' : r.chance(0.15) ? 'Collection' : 'Delivery';
      const lead = kind === 'Funeral' ? r.int(3, 9) : leadFor(b);
      const occasion = kind === 'Funeral' ? 'Funeral' : b && r.chance(0.85) ? b.occasion : r.weighted(OCCASIONS);
      let lines;
      if (kind === 'Funeral') {
        lines = [[r.weighted([[P('Funeral wreath, white and green'), 4], [P('Sympathy posy'), 3], [P('Casket spray'), 1.5], [P('Letter tribute, per letter'), 1]]), 1]];
        if (lines[0][0].name === 'Letter tribute, per letter') lines[0][1] = r.pick([3, 3, 3, 4, 6]);
      } else {
        lines = [[orderProduct(D, occasion), 1]];
        if (r.chance(0.15) && lines[0][0].kind === 'Bouquet') lines.push([P('Glass vase'), 1]);
      }
      plan(D, { kind, lead, occasion, lines, slot: kind === 'Funeral' ? 'Morning' : r.chance(0.6) ? 'Morning' : 'Afternoon' });
    }
    // Standing orders: reception flowers every Monday for two businesses, and Thursdays for a third.
    if (wd === 1) { plan(D, { kind: 'Contract', contract: 0, lead: 7, occasion: 'Contract', lines: [[P('Reception arrangement, weekly'), 1]], slot: 'Morning' }); plan(D, { kind: 'Contract', contract: 1, lead: 7, occasion: 'Contract', lines: [[P('Reception arrangement, weekly'), 2]], slot: 'Morning' }); }
    if (wd === 4) plan(D, { kind: 'Contract', contract: 2, lead: 7, occasion: 'Contract', lines: [[P('Reception arrangement, weekly'), 1]], slot: 'Morning' });
  }
  // When each was taken: an order is in the records only once it has been taken.
  const nowHour = cal.hour;
  for (const p of plans) {
    let t = p.due - p.lead;
    while (closed(t)) t--;
    p.takenAt = t;
    p.hour = p.kind === 'Contract' ? 9 : p.lead === 0 ? r.int(8, 11) : r.int(8, 20);
    p.minute = r.int(0, 59);
  }
  let live = plans.filter((p) => p.takenAt < 0 || (p.takenAt === 0 && p.hour < nowHour));
  // Today and the next two days always have a delivery booked, as a florist this size has.
  for (let D = 0; D <= 2; D++) {
    if (closed(D) || live.some((p) => p.due === D && p.kind === 'Delivery')) continue;
    let t = -1;
    while (closed(t)) t--;
    live.push({ due: D, kind: 'Delivery', lead: D - t, occasion: 'Birthday', lines: [[P('Hand-tied bouquet, medium'), 1]], slot: 'Morning', takenAt: t, hour: 15, minute: 10 });
  }
  live.sort((a, b) => a.takenAt - b.takenAt || a.hour - b.hour || a.minute - b.minute);

  // The van's runs, one for each day and slot with deliveries.
  const runs = new Map();
  for (const p of live) {
    if (p.kind === 'Collection') continue;
    const key = `${p.due}|${p.slot}`;
    if (!runs.has(key)) runs.set(key, { due: p.due, slot: p.slot });
  }
  for (const run of [...runs.values()].sort((a, b) => a.due - b.due || (a.slot < b.slot ? 1 : -1))) {
    const second = run.slot === 'Afternoon' && busy(run.due);
    run.id = add('Delivery Runs', { 'Run Date': iso(run.due), Slot: run.slot, Driver: second ? junior : driver, Notes: second ? 'Second van, hired for the day' : 'Van 1' });
  }

  // Customers: most order once or twice; some come back.
  const people = [];
  const newCustomer = (d, extra = {}) => {
    const p = person(r, { domain: r.pick(['example.com', 'example.org', 'example.net']) });
    const w = where();
    const c = { first: p['First Name'], last: p['Last Name'] };
    c.id = add('Customers', { 'First Name': p['First Name'], 'Last Name': p['Last Name'], Kind: 'Private', Address: w.Address, City: w.City, Postcode: w.Postcode, Phone: phoneFor(r, 'United Kingdom'), 'E-mail': p['E-mail'], Added: iso(d), ...extra });
    return c;
  };
  const businesses = [['Saffron Kitchen', 'N16'], ['Larkspur Studios', 'E8'], ['Riverbend Care Home', 'N5']].map(([company, post]) => {
    const p = person(r, { domain: `${company.toLowerCase().replace(/[^a-z]+/g, '')}.example` });
    const a = areaOf(post);
    const c = { first: p['First Name'], last: p['Last Name'], company, area: a, address: `${r.int(1, 120)} ${r.pick(STREETS)}`, post: `${post} ${r.int(1, 9)}${r.pick(['AB', 'DE', 'HJ'])}` };
    c.id = add('Customers', { 'First Name': c.first, 'Last Name': c.last, Company: company, Kind: 'Business', Address: c.address, City: 'London', Postcode: c.post, Phone: phoneFor(r, 'United Kingdom'), 'E-mail': p['E-mail'], Added: iso(start - r.int(100, 600)) });
    return c;
  });

  // The orders themselves, numbered in the order they were taken.
  const orders = [];
  for (const p of live) {
    const c = p.kind === 'Contract' ? businesses[p.contract] : people.length > 40 && r.chance(0.4) ? r.pick(people) : (() => { const x = newCustomer(p.takenAt); people.push(x); return x; })();
    let dest;
    let recipient;
    if (p.kind === 'Contract') { dest = { area: c.area, Address: c.address, City: 'London', Postcode: c.post }; recipient = `${c.company}, reception`; }
    else if (p.kind === 'Funeral') { const [fd, a, post] = r.pick(FUNERAL_DIRECTORS); dest = { area: areaOf(post), Address: `${fd}, ${a}`, City: 'London', Postcode: `${post} ${r.int(1, 9)}QR` }; recipient = `The funeral of ${someone()}`; }
    else if (p.kind === 'Collection') { dest = { area: null, Address: 'To be collected from the shop', City: null, Postcode: null }; recipient = `${c.first} ${c.last}`; }
    else { dest = where(); recipient = someone(); }
    const charge = p.kind === 'Delivery' || p.kind === 'Funeral' ? dest.area.charge : 0;
    let total = charge;
    let tax = vatIn(charge);
    for (const [prod, qty] of p.lines) { const a = money(prod.price * qty); total += a; tax += vatIn(a); }
    total = money(total);
    tax = money(tax);
    const cancelled = p.kind !== 'Contract' && r.chance(0.02);
    const nowStatus = p.due < 0 ? (p.kind === 'Collection' ? 'Collected' : 'Delivered')
      : p.due > 0 ? 'Booked'
        : p.kind === 'Collection' ? 'Made' : p.slot === 'Morning' ? (nowHour >= 12 ? 'Delivered' : 'Out for delivery') : nowHour >= 16 ? 'Delivered' : 'Made';
    const status = cancelled ? 'Cancelled' : nowStatus;
    const card = p.kind !== 'Contract';
    const message = card ? r.pick(MESSAGES[p.occasion] || MESSAGES['Just because']) : null;
    const main = p.lines[0][0];
    const paidOn = cancelled ? null : p.kind === 'Contract' ? (p.due <= 0 ? iso(p.due) : null) : iso(p.takenAt);
    const id = add('Orders', {
      Number: number('ORD', p.takenAt), Customer: c.id, 'Taken By': r.pick(florists), Taken: cal.time(p.takenAt, p.hour, p.minute), Kind: p.kind, Occasion: p.occasion,
      'Due Date': iso(p.due), Slot: p.slot, Recipient: recipient, 'Recipient Phone': p.kind === 'Delivery' ? phoneFor(r, 'United Kingdom') : null,
      Address: dest.Address, City: dest.City, Postcode: dest.Postcode, Area: dest.area ? dest.area.id : null,
      Run: p.kind === 'Collection' ? null : runs.get(`${p.due}|${p.slot}`).id, Description: p.lines.length > 1 ? `${main.description} With a glass vase.` : main.description,
      'Card Included': card, 'Card Message': message, 'Card From': card ? (p.kind === 'Funeral' ? `${r.pick(['From', 'With love from', 'Remembered by'])} ${c.first} and family` : signOff(c.first)) : null,
      'Delivery Charge': charge, Net: money(total - tax), Tax: tax, Total: total,
      Payment: p.kind === 'Contract' ? 'Standing order' : r.pick(['Card by phone', 'Online', 'Online', 'Card in the shop']), 'Paid On': paidOn, Status: status,
    });
    for (const [prod, qty] of p.lines) add('Order Lines', { Order: id, Product: prod.id, Quantity: qty, 'Unit Price': prod.price, 'Tax Rate': 0.2 });
    if (!cancelled) orders.push({ due: p.due, lines: p.lines });
  }

  // Weddings: summer Saturdays mostly, quoted months ahead, a quarter paid to book and the rest four weeks before.
  const weddings = [];
  const planWedding = (S, quotedAt, booked) => {
    const colours = r.pick(COLOURS);
    const lines = [[P('Bridal bouquet'), 1], [P('Bridesmaid bouquet'), r.int(2, 4)], [P('Buttonhole'), r.int(4, 10)], [P('Corsage'), r.int(2, 4)],
      [P('Ceremony arrangement'), r.int(1, 2)], [P('Table centrepiece'), r.int(6, 14)]];
    if (r.chance(0.4)) lines.push([P('Arch garland, per metre'), r.int(3, 6)]);
    lines.push([P('Delivery and set-up'), 1]);
    const w = { S, quotedAt, colours, lines, booked };
    weddings.push(w);
    return w;
  };
  for (let S = start; S <= 330; S++) {
    if (weekday(S) !== 6 && !(weekday(S) === 5 && r.chance(0.15))) continue;
    if (!r.chance(0.5 * WEDDING_MONTHS[monthOf(S) - 1])) continue;
    const quotedAt = S - r.int(75, 320);
    if (quotedAt > 0) continue;
    planWedding(S, quotedAt, r.chance(0.62));
  }
  // At least one booked wedding a month or two away, its balance not yet due.
  if (!weddings.some((w) => w.booked && w.S >= 40 && w.S <= 58 && w.quotedAt + 21 <= 0)) {
    let S = 40;
    while (weekday(S) !== 6) S++;
    planWedding(S, -r.int(60, 120), true).bookAfter = 7;
  }
  weddings.sort((a, b) => a.quotedAt - b.quotedAt);
  for (const w of weddings) {
    const c = newCustomer(w.quotedAt);
    const partner = `${r.pick(FIRST)} ${r.pick(LAST)}`;
    let total = 0;
    let tax = 0;
    for (const [prod, qty] of w.lines) { const a = money(prod.price * qty); total += a; tax += vatIn(a); }
    total = money(total);
    tax = money(tax);
    const bookAt = w.quotedAt + (w.bookAfter || r.int(3, 21));
    const declineAt = w.quotedAt + r.int(5, 30);
    let status = 'Quoted';
    const values = {};
    if (w.booked && bookAt <= 0) {
      status = w.S < 0 ? 'Done' : 'Booked';
      const due = w.S - 28;
      const paidAt = r.chance(0.12) ? due + r.int(1, 12) : due - r.int(0, 10);
      w.bookAt = bookAt;
      Object.assign(values, { Deposit: Math.round(total * 0.25 / 10) * 10, 'Deposit Paid On': iso(bookAt), 'Invoice Date': iso(bookAt), 'Balance Due On': iso(due), 'Balance Paid On': paidAt <= 0 ? iso(paidAt) : null });
      orders.push({ due: w.S - 1, lines: w.lines });
    } else if (!w.booked && declineAt <= 0) status = 'Declined';
    w.id = add('Weddings', {
      'Quote No': number('QUO', w.quotedAt), Customer: c.id, Couple: `${c.first} ${c.last} and ${partner}`, 'Wedding Date': iso(w.S),
      'Ceremony Venue': r.pick(VENUES), 'Reception Venue': r.pick(RECEPTIONS), Colours: w.colours, 'Quoted On': iso(w.quotedAt), 'Valid Until': iso(w.quotedAt + 30),
      Status: status, Net: money(total - tax), Tax: tax, Total: total, ...values,
      Notes: r.pick([null, null, 'No lilies: the bride does not like the scent.', 'Venue access from 8am only.', 'Bride allergic to pollen: pollen-free flowers only.', 'Buttonholes collected by the best man on the Friday.']),
    });
    w.lines.forEach(([prod, qty], i) => add('Wedding Lines', { Wedding: w.id, Line: i + 1, Product: prod.id, Description: prod.kind === 'Service' ? prod.name : `${prod.name}: ${w.colours.toLowerCase()}`, Quantity: qty, 'Unit Price': prod.price, 'Tax Rate': 0.2 }));
  }
  // Invoices for the booked weddings, numbered in the order they were booked.
  for (const w of weddings.filter((x) => x.bookAt !== undefined).sort((a, b) => a.bookAt - b.bookAt || a.id - b.id)) base.update('Weddings', w.id, { 'Invoice No': number('INV', w.bookAt) });

  // Walk-in sales, planned for each day the shop is open.
  const walkins = new Map();
  const tillProduct = (d, b) => {
    const list = [[P('Wrapped bunch, seasonal'), 5], [P('Hand-tied bouquet, small'), 3], [P('Hand-tied bouquet, medium'), 1.5], [P('Single red rose, wrapped'), b?.occasion === 'Valentine\'s' ? 30 : 1],
      [P('Dozen red roses, hand-tied'), b?.occasion === 'Valentine\'s' ? 8 : 0.3], [P('Orchid in ceramic pot'), 1], [P('Peace lily in ceramic pot'), 0.6], [P('Glass vase'), 0.5],
      [P('Spring tulip bunch'), 3], [P('Sunflower bunch'), 2.5], [P('Peony bouquet'), 1], [P('Christmas door wreath'), 3], [P('Christmas table centrepiece'), 2]];
    return r.weighted(list.filter(([p]) => inSeason(p.months, d)));
  };
  for (let d = start; d <= 0; d++) {
    if (closed(d)) continue;
    const wd = weekday(d);
    const b = busy(d);
    const m = monthOf(d);
    const n = Math.round((wd === 0 ? 5 : wd === 6 ? 12 : 6) * (b ? b.till : 1) * (m === 1 ? 0.7 : m === 8 ? 0.8 : 1) * (0.6 + r.next() * 0.8));
    const open = wd === 0 ? [10, 13] : [8, 17];
    const sales = [];
    for (let k = 0; k < n; k++) {
      const hour = r.int(open[0], open[1]);
      if (d === 0 && hour >= nowHour) continue;
      const first = tillProduct(d, b);
      const lines = [[first, first.name === 'Single red rose, wrapped' ? r.int(1, 3) : 1]];
      if (r.chance(0.12)) lines.push([r.pick([P('Glass vase'), P('Orchid in ceramic pot'), P('Wrapped bunch, seasonal')].filter((p) => p.name !== first.name)), 1]);
      sales.push({ hour, minute: r.int(0, 59), lines });
    }
    sales.sort((a, b2) => a.hour - b2.hour || a.minute - b2.minute);
    walkins.set(d, sales);
  }

  // The workroom, a day at a time: the morning check, the market, then what is made and sold.
  const dueOn = new Map();
  for (const o of orders) { if (!dueOn.has(o.due)) dueOn.set(o.due, []); dueOn.get(o.due).push(o); }
  // What each day's orders and walk-ins take, item by item, worked out once.
  const needs = (list) => { const out = new Map(); for (const [prod, qty] of list) for (const [item, stems] of prod.recipe) out.set(item, (out.get(item) || 0) + stems * qty); return out; };
  const orderNeed = new Map();
  const walkNeed = new Map();
  const ordersOn = (k) => { if (!orderNeed.has(k)) orderNeed.set(k, needs((dueOn.get(k) || []).flatMap((o) => o.lines))); return orderNeed.get(k); };
  const walkinsOn = (k) => { if (!walkNeed.has(k)) walkNeed.set(k, needs((walkins.get(k) || []).flatMap((s) => s.lines))); return walkNeed.get(k); };
  const addTo = (out, m, factor) => { for (const [item, n] of m) out.set(item, (out.get(item) || 0) + n * factor); };
  const stockOf = (item, from) => item.batches.reduce((n, x) => n + (x.useBy >= from ? x.left : 0), 0);
  const take = (item, stems) => {
    let want = stems;
    for (const x of item.batches) { if (!want) break; const t = Math.min(x.left, want); x.left -= t; want -= t; }
    item.batches = item.batches.filter((x) => x.left > 0);
  };
  const marketDay = (d) => { const wd = weekday(d); return !closed(d) && (wd === 1 || wd === 3 || wd === 5 || (busy(d + 1) && wd !== 0)); };
  const priceOn = (item, d) => {
    const m = monthOf(d);
    let f = m === 12 ? 1.25 : m >= 6 && m <= 8 ? 0.9 : 1;
    if (item.name.startsWith('Rose, red') && m === 2 && dateOf(d) <= 14) f = 2.4;
    if (item.name.startsWith('Rose') && isMothersDay(d + 2)) f *= 1.3;
    return money(item.cost * f * (0.95 + r.next() * 0.12));
  };
  for (let d = start - 4; d <= 0; d++) {
    if (closed(d)) continue;
    const date = iso(d);
    // The morning check: whatever is past its best goes, and is logged.
    for (const item of items.values()) {
      const old = item.batches.filter((x) => x.useBy < d && x.left > 0);
      if (!old.length) continue;
      const stems = old.reduce((n, x) => n + x.left, 0);
      add('Waste', { Item: item.id, Batch: old[0].line, When: date, Stems: stems, Cost: money(old.reduce((n, x) => n + x.left * x.cost, 0)), Reason: 'Past its best' });
      item.batches = item.batches.filter((x) => x.useBy >= d);
    }
    // Buying at the market and from the grower, for the days until the next market: the orders
    // booked, and for the till what the same day sold last week, with some over (the buyer cannot
    // know the day's walk-ins). Before a busy day the buyer knows to buy for it.
    const buyingFor = new Map();
    if (marketDay(d)) {
      let next = d + 1;
      while (!marketDay(next)) next++;
      for (let k = d; k <= next; k++) {
        addTo(buyingFor, ordersOn(k), 1.1);
        addTo(buyingFor, busy(k) && k <= 0 ? walkinsOn(k) : walkinsOn(k - 7), 1.5 + r.next() * 0.5);
      }
    }
    const isMonday = weekday(d) === 1;
    const bySupplier = new Map();
    const want = (item, units) => { if (!bySupplier.has(item.sup)) bySupplier.set(item.sup, []); bySupplier.get(item.sup).push({ item, units }); };
    for (const item of items.values()) {
      if (item.sup === 'sundries') {
        // A weekly order on Mondays for a fortnight's use, and a top-up on any day one is running out.
        let use = 0;
        for (let k = d; k < d + 14; k++) use += (ordersOn(k).get(item) || 0) + (walkinsOn(k > 0 ? k - 7 : k).get(item) || 0);
        const have = stockOf(item, d);
        if (have >= use * (isMonday ? 1.2 : 0.4)) continue;
        const units = Math.ceil((use * 1.6 - have) / item.per);
        if (units > 0) want(item, units);
        continue;
      }
      if (!marketDay(d) || !inSeason(item.months, d)) continue;
      // The buckets are never empty: at least two bunches of every flower in season, and a tray of each plant.
      const wanted = Math.max(buyingFor.get(item) || 0, item.kind === 'Flower' ? item.per * 2 : item.kind === 'Plant' ? item.per : 0);
      const short = wanted - stockOf(item, d + 2);
      if (short <= 0) continue;
      want(item, Math.ceil(short / item.per));
    }
    for (const [sup, lines] of bySupplier) {
      const pid = add('Purchases', { Number: number('PUR', d), Supplier: suppliers[sup], 'Bought On': date, Total: 0 });
      let total = 0;
      for (const { item, units } of lines) {
        const perStem = priceOn(item, d);
        const unitCost = money(perStem * item.per);
        total += unitCost * units;
        const stems = units * item.per;
        const line = add('Purchase Lines', { Purchase: pid, Item: item.id, Units: units, 'Unit Cost': unitCost, Stems: stems, 'Use By': iso(d + item.life) });
        item.batches.push({ line, left: stems, useBy: d + item.life, cost: perStem });
        item.last = perStem;
        // Now and then a box arrives crushed.
        if (item.kind === 'Flower' && r.chance(0.02)) { const lost = Math.min(stems, r.int(2, 6)); add('Waste', { Item: item.id, Batch: line, When: date, Stems: lost, Cost: money(lost * perStem), Reason: 'Damaged' }); take(item, lost); }
      }
      base.update('Purchases', pid, { Total: money(total) });
    }
    if (d < start) continue;
    // What is made today: the day's orders and tomorrow's weddings, then what the till sells.
    for (const o of dueOn.get(d) || []) for (const [prod, qty] of o.lines) for (const [item, stems] of prod.recipe) take(item, stems * qty);
    for (const s of walkins.get(d) || []) {
      let total = 0;
      let tax = 0;
      for (const [prod, qty] of s.lines) { const a = money(prod.price * qty); total += a; tax += vatIn(a); for (const [item, stems] of prod.recipe) take(item, stems * qty); }
      total = money(total);
      tax = money(tax);
      const id = add('Till Sales', { Number: number('RCP', d, 5), 'Sold At': cal.time(d, s.hour, s.minute), 'Served By': r.pick(florists), Payment: r.chance(0.86) ? 'Card' : 'Cash', Net: money(total - tax), Tax: tax, Total: total });
      for (const [prod, qty] of s.lines) add('Till Lines', { 'Till Sale': id, Product: prod.id, Quantity: qty, 'Unit Price': prod.price, 'Tax Rate': 0.2 });
    }
  }
  for (const item of items.values()) base.update('Items', item.id, { 'In Stock': item.batches.reduce((n, x) => n + x.left, 0), 'Cost per Stem': item.last });
  return counts;
}
