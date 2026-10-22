// The takeaway: Saffron Lane Pizza and Curry, an invented takeaway in south
// London cooking pizzas, burgers and curries for phone, walk-in and online
// orders, collected from the counter or taken out by its own drivers, who
// are paid per drop. Delivery zones with their charges and drivers' fees,
// customers, the staff, the menu with its sizes, extras and meal deals, each
// dish's recipe (so every dish has a food cost and the kitchen can see what
// it used), the orders and their lines, a sheet for each night's takings,
// and a weekly pay sheet for each driver.
//
// Its records come from fourteen months of trading, run a night at a time:
// open every evening from five until eleven, and for lunch at weekends;
// Friday and Saturday nights twice as busy as the rest, more orders on wet
// and cold nights and in the winter, a quieter summer. Orders are kept line
// by line for the last twelve weeks; the night sheets go back the whole
// fourteen months. A few orders are booked ahead for tonight and the next
// two nights, so the kitchen's lists always have something on them.
//
// It prints a customer receipt, a kitchen ticket and a delivery slip for
// each order, and a pay sheet for each driver for each week.

import { BUSINESS_ABOUT, BUSINESS_TABLE, businessRecord, FIRST, LAST, money } from './util.js';

// These print templates need Data Files 2.16: an older Office is told to update.
export const minOffice = '2.16.0';

const ref = (table) => ({ type: 'integer', points: table });
const LINE = 'Round([Quantity] * [Unit Price], 2)';
// Minutes since midnight of a stored date and time (2026-10-21T19:45:00 is 1185).
const MOD = (field) => `(Mid([${field}], 12, 2) * 60 + Mid([${field}], 15, 2))`;
// From the order being placed to the food reaching the customer, in minutes.
const DELIVERY_MINUTES = `(DateDiff("d", Format([Placed], "yyyy-mm-dd"), Format([Handed Over], "yyyy-mm-dd")) * 1440 + ${MOD('Handed Over')} - ${MOD('Placed')})`;
// Minutes from now until an order is due; below nought it is late.
const MINUTES_LEFT = `DateDiff("d", Date(), Format([Due], "yyyy-mm-dd")) * 1440 + ${MOD('Due')} - (Mid(Now(), 12, 2) * 60 + Mid(Now(), 15, 2))`;
// The night an order is for, counted back from today: 0 is tonight.
const NIGHTS_AGO = 'DateDiff("d", Format([Due], "yyyy-mm-dd"), Date())';
const TAKINGS = '[Phone Takings] + [Walk-in Takings] + [Online Takings]';
// Days counted from Monday 1 January 2024, so a date's place in its week (0 is Monday) comes from the date alone.
const DAY_NO = 'DateDiff("d", #2024-01-01#, [Date]) Mod 7';
const DAY_NAME = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  .reduceRight((rest, name, i) => `IIf(${DAY_NO} = ${i}, "${name}", ${rest})`, '"Sunday"');
const RECIPE_COST = 'Round([Quantity] * [Cost per Unit], 2)';
const LETTERHEAD = { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone'] };

export const spec = {
  // Where a value below nought is right: an order already past the time it was due.
  negative: { 'Orders still to go out': ['Minutes Left'] },
  tables: [
    BUSINESS_TABLE,
    { name: 'Delivery Zones', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Areas', type: 'text' }, { name: 'Miles', type: 'number' },
      { name: 'Charge', type: 'currency' }, { name: 'Free Over', type: 'currency' }, { name: 'Minimum Order', type: 'currency' },
      { name: 'Target Minutes', type: 'integer' }, { name: 'Drop Fee', type: 'currency' },
    ] },
    { name: 'Customers', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Phone', type: 'text' },
      { name: 'E-mail', type: 'text' }, { name: 'Address', type: 'text' }, { name: 'Postcode', type: 'text' },
      { name: 'Zone', ...ref('Delivery Zones') }, { name: 'Delivery Notes', type: 'text' }, { name: 'First Order', type: 'date' },
      { name: 'Offers', type: 'yesno' },
    ] },
    { name: 'Staff', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Role', type: 'text' },
      { name: 'Phone', type: 'text' }, { name: 'Hourly Rate', type: 'currency' }, { name: 'Works', type: 'text' },
      { name: 'Started', type: 'date' }, { name: 'Active', type: 'yesno', default: true },
    ] },
    { name: 'Sizes', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Add to Price', type: 'currency' },
      { name: 'Portion', type: 'number', default: 1 }, { name: 'Sort Order', type: 'integer' },
    ] },
    { name: 'Menu Categories', fields: [{ name: 'Name', type: 'text', required: true, unique: true }, { name: 'Sort Order', type: 'integer' }] },
    { name: 'Menu Items', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Category', ...ref('Menu Categories'), required: true },
      { name: 'Price', type: 'currency' }, { name: 'Sized', type: 'yesno' }, { name: 'VAT Rate', type: 'number', default: 0.2 },
      { name: 'Diet', type: 'text' }, { name: 'Spice', type: 'integer', default: 0 }, { name: 'Description', type: 'text' },
      { name: 'Available', type: 'text' }, { name: 'Active', type: 'yesno', default: true },
    ] },
    { name: 'Ingredients', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Unit', type: 'text' }, { name: 'Cost per Unit', type: 'currency' },
      { name: 'Supplier', type: 'text' }, { name: 'Bought As', type: 'text' },
    ] },
    { name: 'Recipe Lines', fields: [
      { name: 'Menu Item', ...ref('Menu Items'), required: true }, { name: 'Line', type: 'integer', default: 1 },
      { name: 'Ingredient', ...ref('Ingredients'), required: true }, { name: 'Quantity', type: 'number' },
    ] },
    // A pay sheet for each driver for each week, its lines the drops the driver made.
    { name: 'Driver Pay', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Driver', ...ref('Staff'), required: true },
      { name: 'Week Beginning', type: 'date' }, { name: 'Week Ending', type: 'date' }, { name: 'Pay Date', type: 'date' },
      { name: 'Drops', type: 'integer' }, { name: 'Drop Pay', type: 'currency' },
    ] },
    { name: 'Orders', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Placed', type: 'datetime' }, { name: 'Channel', type: 'text', default: 'Phone' },
      { name: 'Method', type: 'text', default: 'Collection' }, { name: 'Customer', ...ref('Customers') }, { name: 'Zone', ...ref('Delivery Zones') },
      { name: 'Driver', ...ref('Staff') }, { name: 'Driver Pay', ...ref('Driver Pay') }, { name: 'Due', type: 'datetime' },
      { name: 'Ready', type: 'datetime' }, { name: 'Out', type: 'datetime' }, { name: 'Handed Over', type: 'datetime' },
      { name: 'Address', type: 'text' }, { name: 'Postcode', type: 'text' }, { name: 'Delivery Notes', type: 'text' },
      { name: 'Goods', type: 'currency' }, { name: 'Delivery Charge', type: 'currency', default: 0 }, { name: 'Net', type: 'currency' },
      { name: 'Tax', type: 'currency' }, { name: 'Total', type: 'currency' }, { name: 'Payment', type: 'text', default: 'Cash' },
      { name: 'Paid', type: 'yesno' }, { name: 'Status', type: 'text', default: 'Booked' }, { name: 'Drop Fee', type: 'currency' },
    ] },
    { name: 'Order Lines', fields: [
      { name: 'Order', ...ref('Orders'), required: true }, { name: 'Line', type: 'integer', default: 1 },
      { name: 'Menu Item', ...ref('Menu Items'), required: true }, { name: 'Size', ...ref('Sizes') }, { name: 'Portion', type: 'number', default: 1 },
      { name: 'Quantity', type: 'integer', default: 1 }, { name: 'Unit Price', type: 'currency' }, { name: 'Tax Rate', type: 'number', default: 0.2 },
      { name: 'Notes', type: 'text' },
    ] },
    { name: 'Nights', fields: [
      { name: 'Date', type: 'date', required: true, unique: true }, { name: 'Weather', type: 'text' }, { name: 'Orders', type: 'integer' },
      { name: 'Deliveries', type: 'integer' }, { name: 'Collections', type: 'integer' }, { name: 'Phone Takings', type: 'currency' },
      { name: 'Walk-in Takings', type: 'currency' }, { name: 'Online Takings', type: 'currency' }, { name: 'Delivery Charges', type: 'currency' },
      { name: 'VAT', type: 'currency' }, { name: 'Card', type: 'currency' }, { name: 'Cash', type: 'currency' }, { name: 'Online Payments', type: 'currency' },
      { name: 'Kitchen Wages', type: 'currency' }, { name: 'Driver Pay', type: 'currency' }, { name: 'Notes', type: 'longtext' },
    ] },
  ],
  queries: {
    "Tonight's orders": { tables: ['Orders'], columns: [
      { table: 'Orders', field: 'Number' }, { expr: 'Mid([Due], 12, 5)', as: 'Due Time', sort: 'asc' }, { table: 'Orders', field: 'Channel' },
      { table: 'Orders', field: 'Method' }, { table: 'Orders', field: 'Postcode' }, { table: 'Orders', field: 'Status' },
      { table: 'Orders', field: 'Payment' }, { table: 'Orders', field: 'Total' },
      { expr: NIGHTS_AGO, as: 'Nights Ago', criteria: ['0'], show: false },
    ] },
    'Orders still to go out': { tables: ['Orders'], columns: [
      { table: 'Orders', field: 'Due', sort: 'asc' }, { table: 'Orders', field: 'Number' }, { table: 'Orders', field: 'Method' },
      { table: 'Orders', field: 'Channel' }, { table: 'Orders', field: 'Postcode' }, { table: 'Orders', field: 'Status' },
      { expr: MINUTES_LEFT, as: 'Minutes Left' }, { table: 'Orders', field: 'Total' },
      { table: 'Orders', field: 'Status', as: 'Still Open', criteria: ['In ("Booked", "Cooking", "Ready", "Out")'], show: false },
    ] },
    'Tonight by the hour': { tables: ['Orders'], columns: [
      { expr: 'Mid([Due], 12, 2)', as: 'Hour', total: 'group', sort: 'asc' }, { table: 'Orders', field: 'ID', as: 'Orders', total: 'count' },
      { expr: 'IIf([Method] = "Delivery", 1, 0)', as: 'Deliveries', total: 'sum' }, { expr: 'IIf([Method] = "Collection", 1, 0)', as: 'Collections', total: 'sum' },
      { table: 'Orders', field: 'Total', as: 'Takings', total: 'sum' },
      { expr: NIGHTS_AGO, as: 'Nights Ago', total: 'where', criteria: ['0'] },
      { table: 'Orders', field: 'Status', total: 'where', criteria: ['<> "Cancelled"'] },
    ] },
    'Delivery times by zone, last 28 days': { tables: ['Orders', 'Delivery Zones'], columns: [
      { table: 'Delivery Zones', field: 'Name', as: 'Zone', total: 'group', sort: 'asc' }, { table: 'Delivery Zones', field: 'Target Minutes', total: 'group' },
      { table: 'Orders', field: 'ID', as: 'Deliveries', total: 'count' }, { expr: DELIVERY_MINUTES, as: 'Average Minutes', total: 'avg', decimals: 1 },
      { expr: DELIVERY_MINUTES, as: 'Longest', total: 'max' },
      { expr: `IIf(${DELIVERY_MINUTES} > [Target Minutes], 1, 0)`, as: 'Over Target', total: 'sum' },
      { expr: NIGHTS_AGO, as: 'Nights Ago', total: 'where', criteria: ['Between 1 And 28'] },
      { table: 'Orders', field: 'Status', total: 'where', criteria: ['Done'] },
    ] },
    'Takings by channel, last 28 days': { tables: ['Orders'], columns: [
      { table: 'Orders', field: 'Channel', total: 'group', sort: 'asc' }, { table: 'Orders', field: 'ID', as: 'Orders', total: 'count' },
      { expr: 'IIf([Method] = "Delivery", 1, 0)', as: 'Deliveries', total: 'sum' }, { table: 'Orders', field: 'Total', as: 'Takings', total: 'sum' },
      { table: 'Orders', field: 'Total', as: 'Average Order', total: 'avg', decimals: 2 }, { table: 'Orders', field: 'Delivery Charge', as: 'Delivery Charges', total: 'sum' },
      { expr: NIGHTS_AGO, as: 'Nights Ago', total: 'where', criteria: ['Between 1 And 28'] },
      { table: 'Orders', field: 'Status', total: 'where', criteria: ['<> "Cancelled"'] },
    ] },
    'Takings by month': { tables: ['Nights'], columns: [
      { expr: 'Format([Date], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Nights', field: 'Date', as: 'Nights Open', total: 'count' },
      { table: 'Nights', field: 'Orders', as: 'Orders', total: 'sum' }, { table: 'Nights', field: 'Phone Takings', as: 'Phone', total: 'sum' },
      { table: 'Nights', field: 'Walk-in Takings', as: 'Walk-in', total: 'sum' }, { table: 'Nights', field: 'Online Takings', as: 'Online', total: 'sum' },
      { expr: TAKINGS, as: 'Takings', total: 'sum' }, { table: 'Nights', field: 'VAT', as: 'VAT', total: 'sum' },
      { table: 'Nights', field: 'Kitchen Wages', as: 'Kitchen Wages', total: 'sum' }, { table: 'Nights', field: 'Driver Pay', as: 'Driver Pay', total: 'sum' },
      { expr: `Round(${TAKINGS} - [VAT] - [Kitchen Wages] - [Driver Pay], 2)`, as: 'Left After VAT and Wages', total: 'sum' },
    ] },
    'Busy nights, last 12 weeks': { tables: ['Nights'], columns: [
      { expr: DAY_NO, as: 'Day No', total: 'group', sort: 'asc', show: false }, { expr: DAY_NAME, as: 'Day', total: 'group' },
      { table: 'Nights', field: 'Date', as: 'Nights', total: 'count' }, { table: 'Nights', field: 'Orders', as: 'Average Orders', total: 'avg', decimals: 1 },
      { table: 'Nights', field: 'Deliveries', as: 'Average Deliveries', total: 'avg', decimals: 1 }, { expr: TAKINGS, as: 'Average Takings', total: 'avg', decimals: 2 },
      { expr: 'DateDiff("d", [Date], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 1 And 84'] },
    ] },
    'Best sellers, last 28 days': { tables: ['Order Lines', 'Orders', 'Menu Items', 'Menu Categories'], columns: [
      { table: 'Menu Items', field: 'Name', as: 'Menu Item', total: 'group' }, { table: 'Menu Categories', field: 'Name', as: 'Category', total: 'group' },
      { table: 'Order Lines', field: 'Quantity', as: 'Sold', total: 'sum', sort: 'desc' }, { expr: LINE, as: 'Takings', total: 'sum' },
      { expr: NIGHTS_AGO, as: 'Nights Ago', total: 'where', criteria: ['Between 0 And 28'] },
      { table: 'Orders', field: 'Status', total: 'where', criteria: ['<> "Cancelled"'] },
    ] },
    'Pizza sizes sold, last 28 days': { tables: ['Order Lines', 'Orders', 'Sizes'], columns: [
      { table: 'Sizes', field: 'Sort Order', total: 'group', sort: 'asc', show: false }, { table: 'Sizes', field: 'Name', as: 'Size', total: 'group' },
      { table: 'Order Lines', field: 'Quantity', as: 'Pizzas', total: 'sum' },
      { expr: NIGHTS_AGO, as: 'Nights Ago', total: 'where', criteria: ['Between 0 And 28'] },
      { table: 'Orders', field: 'Status', total: 'where', criteria: ['<> "Cancelled"'] },
    ] },
    'Drops by driver, last 28 days': { tables: ['Orders', 'Staff'], columns: [
      { expr: '[First Name] & " " & [Last Name]', as: 'Driver', total: 'group' }, { table: 'Orders', field: 'ID', as: 'Drops', total: 'count', sort: 'desc' },
      { table: 'Orders', field: 'Drop Fee', as: 'Drop Fees', total: 'sum' }, { expr: DELIVERY_MINUTES, as: 'Average Minutes', total: 'avg', decimals: 1 },
      { expr: 'IIf([Payment] = "Cash", [Total], 0)', as: 'Cash Collected', total: 'sum' },
      { expr: NIGHTS_AGO, as: 'Nights Ago', total: 'where', criteria: ['Between 1 And 28'] },
      { table: 'Orders', field: 'Status', total: 'where', criteria: ['Done'] },
    ] },
    'Driver pay by week': { tables: ['Driver Pay', 'Staff'], columns: [
      { table: 'Driver Pay', field: 'Week Beginning', sort: 'desc' }, { table: 'Driver Pay', field: 'Number' },
      { expr: '[First Name] & " " & [Last Name]', as: 'Driver', sort: 'asc' }, { table: 'Driver Pay', field: 'Drops' },
      { table: 'Driver Pay', field: 'Drop Pay' }, { table: 'Driver Pay', field: 'Pay Date' },
      { expr: 'DateDiff("d", [Week Beginning], Date())', as: 'Days Ago', criteria: ['Between 7 And 62'], show: false },
    ] },
    'Customers not ordered for 60 days': { tables: ['Customers', 'Orders'], columns: [
      { expr: '[First Name] & " " & [Last Name]', as: 'Customer', total: 'group' }, { table: 'Customers', field: 'Phone', total: 'group' },
      { table: 'Customers', field: 'Postcode', total: 'group' }, { table: 'Orders', field: 'ID', as: 'Orders', total: 'count' },
      { table: 'Orders', field: 'Total', as: 'Spent', total: 'sum', sort: 'desc' },
      { expr: 'Format([Placed], "yyyy-mm-dd")', as: 'Last Order', total: 'max' },
      { expr: 'DateDiff("d", Format([Placed], "yyyy-mm-dd"), Date())', as: 'Days Since', total: 'min', criteria: ['> 60'] },
      { table: 'Customers', field: 'Offers', total: 'where', criteria: ['Yes'] },
      { table: 'Orders', field: 'Status', total: 'where', criteria: ['<> "Cancelled"'] },
    ] },
    'Ingredient use, last 7 nights': { tables: ['Order Lines', 'Orders', 'Menu Items', 'Recipe Lines', 'Ingredients'], columns: [
      { table: 'Ingredients', field: 'Supplier', total: 'group', sort: 'asc' }, { table: 'Ingredients', field: 'Name', as: 'Ingredient', total: 'group', sort: 'asc' },
      { table: 'Ingredients', field: 'Unit', total: 'group' }, { table: 'Ingredients', field: 'Bought As', total: 'group' },
      { expr: 'Round([Order Lines].[Quantity] * [Portion] * [Recipe Lines].[Quantity], 3)', as: 'Used', total: 'sum' },
      { expr: 'Round([Order Lines].[Quantity] * [Portion] * [Recipe Lines].[Quantity] * [Cost per Unit], 2)', as: 'Cost', total: 'sum' },
      { expr: NIGHTS_AGO, as: 'Nights Ago', total: 'where', criteria: ['Between 1 And 7'] },
      { table: 'Orders', field: 'Status', total: 'where', criteria: ['Done'] },
    ] },
    'Menu': { tables: ['Menu Items', 'Menu Categories'], columns: [
      { table: 'Menu Categories', field: 'Sort Order', sort: 'asc', show: false }, { table: 'Menu Categories', field: 'Name', as: 'Category' },
      { table: 'Menu Items', field: 'Name', as: 'Menu Item', sort: 'asc' }, { table: 'Menu Items', field: 'Description' },
      { table: 'Menu Items', field: 'Diet' }, { table: 'Menu Items', field: 'Spice' }, { table: 'Menu Items', field: 'Available' },
      { table: 'Menu Items', field: 'Price' }, { table: 'Menu Items', field: 'Active', criteria: ['Yes'], show: false },
    ] },
    'Menu costing': { tables: ['Menu Items', 'Menu Categories', 'Recipe Lines', 'Ingredients'], columns: [
      { table: 'Menu Categories', field: 'Name', as: 'Category', total: 'group' }, { table: 'Menu Categories', field: 'Sort Order', total: 'group', sort: 'asc', show: false },
      { table: 'Menu Items', field: 'Name', as: 'Menu Item', total: 'group', sort: 'asc' }, { table: 'Menu Items', field: 'Price', total: 'group' },
      { expr: 'Round([Price] / (1 + [VAT Rate]), 2)', as: 'Price less VAT', total: 'group' },
      { expr: RECIPE_COST, as: 'Food Cost', total: 'sum' },
      { expr: 'Round(100 * [Quantity] * [Cost per Unit] / ([Price] / (1 + [VAT Rate])), 2)', as: 'Food Cost %', total: 'sum' },
      // The price less VAT is counted once, on the recipe's first line, so the sum over the lines is what is left after the food.
      { expr: `Round(IIf([Line] = 1, [Price] / (1 + [VAT Rate]), 0) - ${RECIPE_COST}, 2)`, as: 'Gross Profit', total: 'sum' },
      { table: 'Menu Items', field: 'Active', total: 'where', criteria: ['Yes'] },
    ] },
  },
  // The print templates: a document for each record of the table named that the template is for, its lines from the records pointing at it.
  documents: [
    // For every order not cancelled; a cancelled one still prints when it is chosen on the Orders form.
    { name: 'Customer receipt', table: 'Orders', paper: 'receipt-80', where: '[Status] <> "Cancelled"', letterhead: { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'Website', 'Tax Number'] },
      blocks: [
        { type: 'heading', text: 'Order {Number}' },
        { type: 'fields', columns: 2, items: [
          { field: 'Placed', label: 'Ordered', format: 'dd/mm/yyyy hh:nn' }, { field: 'Channel', label: 'Ordered by' }, { field: 'Method', label: 'Collection or delivery' },
          { field: 'Due', label: 'Due', format: 'ddd hh:nn' }, { field: 'Customer', label: 'Name', if: '[Customer]' }, { field: 'Payment' },
        ] },
        { type: 'lines', table: 'Order Lines', sort: 'Line', columns: [
          { field: 'Quantity', label: 'Qty', type: 'integer' }, { field: 'Menu Item.Name', label: 'Item' }, { field: 'Size.Name', label: 'Size' },
          { field: 'Notes' }, { expr: LINE, as: 'Price', type: 'currency' },
        ] },
        { type: 'totals', rows: [
          { label: 'Food and drink', expr: '[Price]' }, { label: 'Delivery', expr: '[Delivery Charge]', if: '[Delivery Charge] > 0' },
          { label: 'Total', expr: '[Total]', strong: true }, { label: 'VAT included', expr: '[Tax]' },
          { label: 'Cash to pay', expr: '[Total]', if: 'Nz([Paid], 0) = 0 And [Status] <> "Cancelled"' },
        ] },
        { type: 'text', text: 'Free delivery: your order is over the zone\'s amount for free delivery.', if: '[Method] = "Delivery" And Nz([Delivery Charge], 0) = 0', small: true },
        { type: 'text', text: 'Cancelled: this order was cancelled and nothing is owed for it.', if: '[Status] = "Cancelled"' },
        { type: 'text', text: 'Payment: {Payment}. VAT number {Business.Tax Number}.', small: true },
        { type: 'text', text: '{Business.Document Footer}', small: true },
      ] },
    // For the kitchen: the items in the order they were taken, an extra under the dish it goes on.
    { name: 'Kitchen ticket', table: 'Orders', paper: 'receipt-80', where: '[Status] <> "Cancelled"',
      blocks: [
        { type: 'heading', text: 'Kitchen {Number}' },
        { type: 'fields', columns: 2, items: [
          { field: 'Due', label: 'Due', format: 'ddd hh:nn' }, { field: 'Method', label: 'Collection or delivery' }, { field: 'Placed', label: 'Taken', format: 'hh:nn' }, { field: 'Channel', label: 'Came by' },
        ] },
        { type: 'lines', table: 'Order Lines', sort: 'Line', columns: [
          { field: 'Quantity', label: 'Qty', type: 'integer' }, { field: 'Menu Item.Name', label: 'Item' }, { field: 'Size.Name', label: 'Size' }, { field: 'Notes' },
        ] },
        { type: 'totals', rows: [{ label: 'Items', expr: '[Quantity]', type: 'integer', strong: true }] },
        { type: 'text', text: 'CANCELLED: do not cook.', if: '[Status] = "Cancelled"' },
      ] },
    // Only deliveries go out with a driver; a collection has no slip.
    { name: 'Delivery slip', table: 'Orders', paper: 'receipt-80', where: '[Method] = "Delivery" And [Status] <> "Cancelled"', letterhead: { table: 'Business', fields: ['Name', 'Phone'] },
      blocks: [
        { type: 'heading', text: 'Delivery {Number}' },
        { type: 'fields', columns: 1, items: [
          { field: 'Customer', label: 'Deliver to' }, { field: 'Address' }, { field: 'Postcode' }, { field: 'Customer.Phone', label: 'Phone' },
          { field: 'Delivery Notes', label: 'Notes', if: '[Delivery Notes]' }, { field: 'Zone.Name', label: 'Zone' }, { field: 'Due', label: 'Due by', format: 'ddd hh:nn' },
          { field: 'Driver', if: '[Driver]' },
        ] },
        { type: 'lines', table: 'Order Lines', sort: 'Line', columns: [
          { field: 'Quantity', label: 'Qty', type: 'integer' }, { field: 'Menu Item.Name', label: 'Item' }, { field: 'Size.Name', label: 'Size' },
        ] },
        { type: 'totals', rows: [
          { label: 'Order total', expr: '[Total]' }, { label: 'Cash to collect', expr: '[Total]', strong: true, if: '[Payment] = "Cash"' },
        ] },
        { type: 'text', text: 'Cash: collect the amount above and hand it in at the end of the night.', if: '[Payment] = "Cash"', small: true },
        { type: 'text', text: 'Paid already ({Payment}): nothing to collect.', if: '[Payment] <> "Cash"', small: true },
      ] },
    { name: 'Driver pay sheet', table: 'Driver Pay', paper: 'a4', letterhead: LETTERHEAD,
      blocks: [
        { type: 'heading', text: 'Driver pay sheet {Number}' },
        { type: 'fields', columns: 2, items: [
          { field: 'Driver' }, { field: 'Week Beginning', label: 'Week beginning', format: 'dd/mm/yyyy' }, { field: 'Driver.Phone', label: 'Phone' },
          { field: 'Week Ending', label: 'Week ending', format: 'dd/mm/yyyy' }, { field: 'Pay Date', label: 'Paid on', format: 'dd/mm/yyyy' },
        ] },
        // The drops night by night, with each night's fees and the cash handed in that night.
        { type: 'lines', table: 'Orders', link: 'Driver Pay', sort: 'Handed Over', group: 'Night', subtotals: ['Drop Fee', 'Cash Taken'], columns: [
          { expr: 'Format([Handed Over], "dddd dd/mm/yyyy")', as: 'Night' },
          { field: 'Number', label: 'Order' }, { field: 'Handed Over', label: 'Delivered', format: 'hh:nn' }, { field: 'Zone.Name', label: 'Zone' },
          { field: 'Postcode' }, { field: 'Drop Fee', type: 'currency' },
          { expr: 'IIf([Payment] = "Cash", [Total], 0)', as: 'Cash Taken', type: 'currency' },
        ] },
        { type: 'totals', rows: [
          { label: 'Drops', expr: '[Orders count]', type: 'integer' }, { label: 'Pay for the drops', expr: '[Drop Pay]', strong: true },
          { label: 'Cash collected, handed in each night', expr: '[Cash Taken]', if: '[Cash Taken] > 0' },
        ] },
        { type: 'text', text: 'Paid per drop at the zone\'s fee, which covers the driver\'s own fuel and car. Tax, National Insurance and any other deduction are worked out by the payroll, not on this sheet.', small: true },
        { type: 'signatures', labels: ['Driver', 'Manager'] },
      ] },
  ],
  reports: [
    { name: 'Tonight', title: 'Tonight\'s orders', query: "Tonight's orders", group: 'Method', columns: ['Due Time', 'Number', 'Channel', 'Postcode', 'Status', 'Payment', { field: 'Total', type: 'currency' }], totals: [{ field: 'Total', fn: 'sum' }, { field: 'Number', fn: 'count' }] },
    { name: 'Orders to go out', query: 'Orders still to go out', columns: [{ field: 'Due', type: 'date' }, 'Number', 'Method', 'Postcode', 'Status', { field: 'Minutes Left', type: 'integer' }, { field: 'Total', type: 'currency' }], totals: [{ field: 'Total', fn: 'sum' }] },
    { name: 'Delivery times', query: 'Delivery times by zone, last 28 days', columns: ['Zone', { field: 'Target Minutes', type: 'integer' }, { field: 'Deliveries', type: 'integer' }, { field: 'Average Minutes', type: 'number' }, { field: 'Longest', type: 'integer' }, { field: 'Over Target', type: 'integer' }], totals: [{ field: 'Deliveries', fn: 'sum' }, { field: 'Over Target', fn: 'sum' }] },
    { name: 'Monthly takings', query: 'Takings by month', columns: ['Month', { field: 'Nights Open', type: 'integer' }, { field: 'Orders', type: 'integer' }, { field: 'Phone', type: 'currency' }, { field: 'Walk-in', type: 'currency' }, { field: 'Online', type: 'currency' }, { field: 'Takings', type: 'currency' }, { field: 'VAT', type: 'currency' }, { field: 'Kitchen Wages', type: 'currency' }, { field: 'Driver Pay', type: 'currency' }, { field: 'Left After VAT and Wages', type: 'currency' }], totals: [{ field: 'Takings', fn: 'sum' }, { field: 'VAT', fn: 'sum' }, { field: 'Kitchen Wages', fn: 'sum' }, { field: 'Driver Pay', fn: 'sum' }, { field: 'Left After VAT and Wages', fn: 'sum' }] },
    { name: 'Best sellers', query: 'Best sellers, last 28 days', group: 'Category', columns: ['Menu Item', { field: 'Sold', type: 'integer' }, { field: 'Takings', type: 'currency' }], totals: [{ field: 'Sold', fn: 'sum' }, { field: 'Takings', fn: 'sum' }] },
    { name: 'Driver drops', query: 'Drops by driver, last 28 days', columns: ['Driver', { field: 'Drops', type: 'integer' }, { field: 'Drop Fees', type: 'currency' }, { field: 'Average Minutes', type: 'number' }, { field: 'Cash Collected', type: 'currency' }], totals: [{ field: 'Drops', fn: 'sum' }, { field: 'Drop Fees', fn: 'sum' }, { field: 'Cash Collected', fn: 'sum' }] },
    { name: 'Come-back list', query: 'Customers not ordered for 60 days', columns: ['Customer', 'Phone', 'Postcode', { field: 'Orders', type: 'integer' }, { field: 'Spent', type: 'currency' }, { field: 'Last Order', type: 'date' }, { field: 'Days Since', type: 'integer' }], totals: [{ field: 'Customer', fn: 'count' }] },
    { name: 'Ingredient use', query: 'Ingredient use, last 7 nights', group: 'Supplier', columns: ['Ingredient', 'Unit', { field: 'Used', type: 'number' }, 'Bought As', { field: 'Cost', type: 'currency' }], totals: [{ field: 'Cost', fn: 'sum' }] },
    { name: 'Price list', title: 'Menu', query: 'Menu', group: 'Category', columns: ['Menu Item', 'Description', 'Diet', { field: 'Spice', type: 'integer' }, { field: 'Price', type: 'currency' }] },
    { name: 'Menu costing sheet', query: 'Menu costing', group: 'Category', columns: ['Menu Item', { field: 'Price', type: 'currency' }, { field: 'Price less VAT', type: 'currency' }, { field: 'Food Cost', type: 'currency' }, { field: 'Food Cost %', type: 'number' }, { field: 'Gross Profit', type: 'currency' }], totals: [{ field: 'Food Cost %', fn: 'avg' }, { field: 'Gross Profit', fn: 'avg' }] },
  ],
};

export const about = {
  name: 'Saffron Lane Pizza and Curry',
  kind: 'Takeaway',
  line: 'Phone, walk-in and online orders, delivery zones and drivers, the menu with sizes, extras and meal deals, and the night\'s takings for a takeaway.',
  summary: [
    'For the owner of a takeaway who wants to see tonight\'s orders as they come in, how long deliveries take in each zone, which channel brings the money, what sells, what each driver is owed, which regulars have gone quiet, and how much of each ingredient the kitchen gets through.',
    'Saffron Lane Pizza and Curry is an invented takeaway in south London. It cooks pizzas in three sizes, burgers and curries, with rice, breads, sides, desserts and drinks, and four meal deals. Customers order by phone, at the counter or on its own website, and either collect or have it delivered by one of its five drivers, who use their own cars and are paid a fee for each drop. Three delivery zones each have a delivery charge, a minimum order, a target time and the driver\'s fee for a drop there. It opens every evening from five until eleven, and from twelve until half past two on Saturday and Sunday.',
    'The records cover the last fourteen months: a night sheet for every night with the takings by channel, the VAT, the kitchen\'s wages and the drivers\' pay. The orders themselves are kept line by line for the last twelve weeks, about four thousand of them, with a pay sheet for each driver for each finished week in that time. Friday and Saturday nights are about twice as busy as the rest; wet and cold nights and the winter months are busier, the summer quieter. Some customers have stopped ordering, and a few orders are booked ahead for tonight and the next two nights.',
    'Prices include VAT, as a takeaway\'s prices to the public do. Hot food, drinks, ice cream and the delivery charge carry the standard rate of 20%; the cold desserts and the coleslaw, sold cold, carry none. The real rules have more cases than that, so set each dish\'s VAT Rate to what applies to you. The documents are a customer receipt, a kitchen ticket and a delivery slip for every order, numbered ORD-2026-00042, and a weekly pay sheet for each driver, numbered DRV-2026-0042.',
  ],
  suits: ['A pizza shop or kebab house', 'A fish and chip shop that delivers', 'A Chinese or Indian takeaway', 'A burger or chicken shop', 'A cafe or restaurant with its own delivery', 'A bakery or caterer taking orders for collection'],
  tables: {
    Business: BUSINESS_ABOUT,
    'Delivery Zones': { about: 'The areas the takeaway delivers to, each with its charges and the driver\'s fee for a drop there. Enter these first.', fields: {
      Name: 'The zone\'s name, as the order screen and the driver\'s sheet show it.',
      Areas: 'The postcode districts in the zone, so whoever takes an order can tell which zone an address is in.',
      Miles: 'About how far the edge of the zone is from the shop.',
      Charge: 'What the customer pays for delivery to the zone.',
      'Free Over': 'Orders of food and drink at or over this amount are delivered free; empty when delivery there is never free.',
      'Minimum Order': 'The least food and drink delivered to the zone. Smaller orders are for collection.',
      'Target Minutes': 'The time quoted for delivery to the zone, from the order going in to the door. Delivery times by zone measures against it.',
      'Drop Fee': 'What a driver is paid for each delivery to the zone, fuel included.',
    } },
    Customers: { about: 'Everyone who has ordered by phone or online, and the regulars who come in, with where to deliver to.', fields: {
      'First Name': 'Their first name.', 'Last Name': 'Their family name.',
      Phone: 'The number they order from, which is how a phone order finds them.',
      'E-mail': 'Their e-mail address, for online orders.',
      Address: 'The house or flat and street to deliver to.', Postcode: 'Their postcode.',
      Zone: 'The delivery zone their address is in.',
      'Delivery Notes': 'What the driver needs to know: which bell, round the back, no knocking, the baby is asleep.',
      'First Order': 'The day of their first order.',
      Offers: 'Yes when they have agreed to be sent offers by text or e-mail. The come-back list only shows these.',
    } },
    Staff: { about: 'Everyone who works in the shop: the kitchen, the counter and the drivers.', fields: {
      'First Name': 'Their first name.', 'Last Name': 'Their family name.',
      Role: 'Their job: Head Chef, Curry Chef, Cook, Counter, Kitchen Porter or Driver.',
      Phone: 'A number to reach them on.', 'Hourly Rate': 'What they are paid an hour before tax; empty for drivers, who are paid per drop.',
      Works: 'The nights and lunches they usually work, as the rota on the wall has it.',
      Started: 'The day they started.', Active: 'No for someone who has left. They stay for the orders and pay sheets that name them.',
    } },
    Sizes: { about: 'The sizes a pizza comes in, with what each adds to the price and how much more of each ingredient it takes.', fields: {
      Name: 'The size as the menu names it.', 'Add to Price': 'Added to a pizza\'s menu price, which is for the smallest size.',
      Portion: 'How much of the recipe the size takes: the recipe is written for the smallest, 1, and a 14 inch takes nearly twice as much.',
      'Sort Order': 'The order sizes are listed in.',
    } },
    'Menu Categories': { about: 'The sections of the menu.', fields: { Name: 'The section as the menu heads it.', 'Sort Order': 'Its place on the printed menu: 1 comes first.' } },
    'Menu Items': { about: 'Everything that can go on an order: dishes, sides, drinks, the extras added to a dish, and the meal deals.', fields: {
      Name: 'The item as the menu and the tickets name it. No two share a name.',
      Category: 'The menu section it is in.',
      Price: 'What one costs, VAT included. For a pizza, the price of the smallest size.',
      Sized: 'Yes for what comes in sizes: the pizzas.',
      'VAT Rate': 'The VAT within the price, as a fraction: 0.2 for hot food and drinks, 0 for cold food that carries none.',
      Diet: 'Marks for the menu: V for vegetarian, VG for vegan.',
      Spice: 'How hot, from 0 (mild) to 3, shown as chillies on the menu.',
      Description: 'A line for the menu; for a meal deal, what is in it.',
      Available: 'When a deal can be had, such as Sunday to Thursday; empty for always.',
      Active: 'No for an item taken off the menu.',
    } },
    Ingredients: { about: 'What the kitchen buys, with what one unit costs, so each dish has a food cost and the week\'s use can be costed.', fields: {
      Name: 'The ingredient as the kitchen knows it.', Unit: 'What its cost and the recipes count in: kg, litre or each.',
      'Cost per Unit': 'What one unit costs now. Changing it changes every dish\'s food cost.',
      Supplier: 'Who it is bought from.', 'Bought As': 'How it comes, such as a 10 kg sack or a case of 24.',
    } },
    'Recipe Lines': { about: 'What goes into one of each item: one line per ingredient, for the smallest size of a pizza.', fields: {
      'Menu Item': 'The item this line is for.', Line: 'The line\'s place in the recipe, from 1. Every recipe needs a line 1: the costing counts the price once, on that line.',
      Ingredient: 'The ingredient used.', Quantity: 'How much one takes, in the ingredient\'s unit.',
    } },
    'Driver Pay': { about: 'A pay sheet for each driver for each week, Monday to Sunday. Its lines are the orders the driver delivered.', fields: {
      Number: 'The sheet\'s number, given in date order with a new run each year: DRV-2026-0042.',
      Driver: 'Who it pays.', 'Week Beginning': 'The Monday the week starts.', 'Week Ending': 'The Sunday it ends.',
      'Pay Date': 'The day the money goes out: the Friday after the week ends.',
      Drops: 'How many deliveries the driver made that week.',
      'Drop Pay': 'The drop fees for those deliveries added up: what the driver is paid before any deduction.',
    } },
    Orders: { about: 'One record per order, from the moment it is taken to the moment it is handed over. Each prints as a customer receipt, a kitchen ticket and a delivery slip.', fields: {
      Number: 'The order\'s number, given as orders come in with a new run each year: ORD-2026-00042. It is on the receipt, the ticket and the slip.',
      Placed: 'The day and time the order was taken.',
      Channel: 'How it came in: Phone, Walk-in or Online.',
      Method: 'Collection or Delivery.',
      Customer: 'Who ordered; empty for someone who walked in and gave no name.',
      Zone: 'The delivery zone; empty for a collection.',
      Driver: 'Who took it out; empty for a collection.',
      'Driver Pay': 'The driver\'s pay sheet the drop is paid on; empty until the week is over.',
      Due: 'The time promised to the customer: the door for a delivery, the counter for a collection.',
      Ready: 'When it came off the pass, boxed and bagged.',
      Out: 'When the driver left with it.',
      'Handed Over': 'When the customer had it: at the door, or at the counter.',
      Address: 'Where it goes, from the customer\'s record unless they asked for somewhere else.',
      Postcode: 'The postcode it goes to.',
      'Delivery Notes': 'What the driver needs to know for this one.',
      Goods: 'The food and drink, VAT included: the lines added up.',
      'Delivery Charge': 'The zone\'s charge, nought for a collection or an order over the zone\'s free delivery amount.',
      Net: 'The total less the VAT within it.',
      Tax: 'The VAT within the total: each line\'s VAT and the delivery\'s, rounded to the penny, added up.',
      Total: 'What the customer pays: the goods and the delivery charge.',
      Payment: 'Online (paid on the website), Card (paid over the phone or at the counter) or Cash (paid at the door or the counter).',
      Paid: 'Yes once the money is in. A cash delivery is paid when the driver hands it over.',
      Status: 'Booked (ordered ahead, not started), Cooking, Ready, Out, Done or Cancelled.',
      'Drop Fee': 'What the driver is paid for this delivery, from the zone; empty for a collection.',
    } },
    'Order Lines': { about: 'What is on each order, one line per item. A meal deal is a line at the deal\'s price followed by what the customer chose, at nought; an extra is a line of its own under the dish it goes on.', fields: {
      Order: 'The order the line is on.', Line: 'Its place on the order, which the ticket and the receipt keep.',
      'Menu Item': 'What it is.', Size: 'The size of a pizza; empty for anything else.',
      Portion: 'How much of the recipe it takes, from its size: 1 for anything not sized.',
      Quantity: 'How many.', 'Unit Price': 'The price of one, size included and VAT included, as it was charged. Nought for what is part of a deal.',
      'Tax Rate': 'The VAT rate within the price, from the item when it was sold.',
      Notes: 'What the kitchen needs to know: extra hot, no onions, well done, or which deal it is part of.',
    } },
    Nights: { about: 'The sheet filled in at close each night: the takings by channel and by how they were paid, the VAT, and the night\'s wages and drivers\' pay.', fields: {
      Date: 'The night. One sheet per night.', Weather: 'Dry, Rain or Cold: wet and cold nights are busier.',
      Orders: 'How many orders went out, cancelled ones left out.', Deliveries: 'How many of them were delivered.', Collections: 'How many were collected.',
      'Phone Takings': 'Taken on phone orders, delivery charges included.', 'Walk-in Takings': 'Taken at the counter from people who walked in.',
      'Online Takings': 'Taken on the website.', 'Delivery Charges': 'The delivery charges within those takings.',
      VAT: 'The VAT within the night\'s takings, for the VAT return.',
      Card: 'Paid by card, at the counter or over the phone.', Cash: 'Paid in cash, at the counter or to the drivers.', 'Online Payments': 'Paid on the website.',
      'Kitchen Wages': 'What the night\'s kitchen and counter shifts cost, from the rota.',
      'Driver Pay': 'The drop fees earned that night.',
      Notes: 'Anything worth remembering: a driver short, the oven down, a big party order.',
    } },
  },
  queries: {
    "Tonight's orders": 'Every order due tonight, earliest first, with how it came in, where it goes, its status and its total. Keep it open through the evening.',
    'Orders still to go out': 'Orders booked, cooking, ready or out, by the time they are due, with the minutes left; below nought means it is late. The orders booked ahead for later nights are on it too.',
    'Tonight by the hour': 'Tonight\'s orders by the hour they are due: how many, deliveries and collections, and their takings. Look at the next hour\'s row to see what is coming, and call in another driver when it is heavy.',
    'Delivery times by zone, last 28 days': 'For each zone, the deliveries in the last 28 nights, the average and the longest time from the order going in to the door, and how many took longer than the zone\'s target.',
    'Takings by channel, last 28 days': 'Orders, deliveries, takings, the average order and the delivery charges for phone, walk-in and online orders over the last 28 nights.',
    'Takings by month': 'Each month\'s takings by channel from the night sheets, the VAT within them, the kitchen\'s wages and the drivers\' pay, and what was left.',
    'Busy nights, last 12 weeks': 'The average night for each day of the week over the last twelve weeks: orders, deliveries and takings. For planning the rota and the drivers.',
    'Best sellers, last 28 days': 'How many of each item went out in the last 28 nights and what they took, the most first. Items in a meal deal are counted as sold at nought; the deal carries the money.',
    'Pizza sizes sold, last 28 days': 'How many pizzas of each size went out in the last 28 nights, for the dough and the boxes.',
    'Drops by driver, last 28 days': 'Each driver\'s deliveries over the last 28 nights, their drop fees, their average delivery time and the cash they collected.',
    'Driver pay by week': 'The pay sheets of the last eight weeks: each driver, their drops and their pay, the newest week first.',
    'Customers not ordered for 60 days': 'Customers who have agreed to offers and have not ordered for more than 60 days, the biggest spenders first, with how many orders they made and when the last was. The list for a come-back offer.',
    'Ingredient use, last 7 nights': 'How much of each ingredient the last seven nights\' orders used, from the recipes and the pizza sizes, and what it cost, by supplier. Use it when ordering and to check against what was delivered.',
    Menu: 'The items on the menu now, by section, with their descriptions, diet and spice marks, when a deal is available, and prices.',
    'Menu costing': 'Each item with a recipe, its price, its price less VAT, its food cost and the share of the price that is, and the gross profit left. Pizzas are costed at the smallest size.',
  },
  reports: {
    Tonight: 'Tonight\'s orders in two sections, deliveries and collections, with their totals and how many. To keep an eye on the night or hand to the drivers\' desk.',
    'Orders to go out': 'The orders still to go out with the minutes left, earliest first.',
    'Delivery times': 'Delivery times for each zone over the last 28 nights against the target, with the total over target.',
    'Monthly takings': 'Takings by channel, VAT, wages and drivers\' pay month by month, with the totals. For the accountant and the VAT return.',
    'Best sellers': 'The last 28 nights\' sales by section of the menu, the most sold first, with the totals.',
    'Driver drops': 'Each driver\'s drops, fees, average time and cash collected over the last 28 nights.',
    'Come-back list': 'The customers to send a come-back offer to, with their phone, how much they have spent and how long since their last order.',
    'Ingredient use': 'The last seven nights\' ingredient use, a section for each supplier, with its cost.',
    'Price list': 'The menu by section with descriptions, diet and spice marks and prices, to check against the printed menu and the website.',
    'Menu costing sheet': 'Each item by section with its price, price less VAT, food cost, food cost percentage and gross profit, and the averages. For setting prices.',
  },
  documents: {
    'Customer receipt': 'Goes in the bag or to the customer at the counter, on an 80 mm roll: the order number, when it was ordered and is due, each item with its size, notes and price, the food and drink, the delivery charge when there is one, the total and the VAT within it, how it is paid, and the cash to pay when it is not paid yet. It is for every order not cancelled; a cancelled one chosen on the Orders form still prints, marked cancelled.',
    'Kitchen ticket': 'Printed on the kitchen printer as the order is taken: the order number, the time due, collection or delivery, and each item with its size and notes in the order taken, an extra under the dish it goes on, with no prices. Meal deals show what was chosen. It is for every order not cancelled; choose the new ones to print.',
    'Delivery slip': 'Taped to the bag for the driver: the customer\'s name, address, postcode, phone and delivery notes, the zone, the time due, what is in the bag, and either the cash to collect or a line saying it is paid already. It is only for deliveries that are not cancelled: a collection has no slip.',
    'Driver pay sheet': 'Given to each driver with their pay each week: every drop they made, night by night, with its time, zone and fee and each night\'s fees and cash handed in, the number of drops, the cash they collected, and the pay for the drops. Numbered DRV-2026-0042. Tax and deductions are left for the payroll.',
  },
  tutorial: [
    { title: 'Take a phone order and send it to the kitchen', steps: [
      'Open the Customers form and find the caller by Phone or name. For someone new, press New and type their name, Phone, Address, Postcode and any Delivery Notes, and choose their Zone from the postcode district (the Delivery Zones form lists the districts in Areas).',
      'Open the Orders form and press New. Type the next order number in Number, one on from the last (ORD-2026-00042 after ORD-2026-00041), the time now in Placed, Phone in Channel, and Collection or Delivery in Method. Choose the Customer.',
      'For a delivery, choose the Zone, copy the Address, Postcode and Delivery Notes, and type the Due time: now plus the zone\'s Target Minutes. For a collection, Due is about 20 minutes away.',
      'In the Order Lines below, add each item in order with its Line number: the Menu Item, the Size for a pizza (and its Portion from the Sizes form), the Quantity, the Unit Price with the size added, and any Notes. Put an extra on its own line under the dish it goes on. For a meal deal, add the deal at its price, then each thing chosen at nought with the deal\'s name in Notes.',
      'Type Goods (the lines added up), the Delivery Charge from the zone (nought if Goods is over its Free Over), Total, and the VAT in Tax and the rest in Net. Set Payment, tick Paid for a card payment taken now, and set Status to Cooking.',
      'Open the print template Kitchen ticket from Print templates, choose the order, and press Print for the kitchen. For a delivery, print the Delivery slip too; print the Customer receipt to go in the bag.',
    ] },
    { title: 'Take a walk-in order at the counter', steps: [
      'Open the Orders form and press New: the next Number, the time in Placed, Walk-in in Channel and Collection in Method. Leave Customer empty unless they are a regular who gives their name.',
      'Add the Order Lines as for a phone order, type Goods and Total (no delivery charge), Tax and Net, and set Payment to Card or Cash with Paid ticked.',
      'Print the Kitchen ticket for the kitchen and the Customer receipt for the customer.',
      'When it comes off the pass, type the time in Ready and Handed Over and set Status to Done.',
    ] },
    { title: 'Run the evening: what is due and who takes it', steps: [
      'Keep the query Tonight\'s orders open, or print the report Tonight: every order due tonight, earliest first.',
      'Run Orders still to go out every so often: the minutes left on each order, below nought when it is late. The query Tonight by the hour shows what is due in the next hour.',
      'When an order comes off the pass, type Ready. When a driver takes it, choose the Driver, type Out, set Status to Out, and type the zone\'s Drop Fee.',
      'When the driver is back, type Handed Over, set Status to Done, and tick Paid for a cash order once the cash is handed in.',
    ] },
    { title: 'Cash up at close', steps: [
      'Open the Nights form and press New. Type the Date, the Weather, and from the till and the website the Orders, Deliveries, Collections, Phone Takings, Walk-in Takings, Online Takings, Delivery Charges and VAT.',
      'Count the cash from the till and the drivers and type Card, Cash and Online Payments. They should add up to the three takings.',
      'Type the Kitchen Wages from the rota and the Driver Pay: the night\'s drop fees, from the Drop Fee of the night\'s delivered orders. Note anything that went wrong in Notes.',
      'On Monday, run Busy nights, last 12 weeks and Takings by channel, last 28 days to see how the week went.',
    ] },
    { title: 'Pay the drivers for the week', steps: [
      'When the week is over (Monday to Sunday), run the query Drops by driver, last 28 days, or print the report Driver drops, to check each driver\'s drops and cash.',
      'Open the Driver Pay form and press New for each driver: the next Number (DRV-2026-0042), the Driver, the Week Beginning and Week Ending, the Pay Date, and their Drops and Drop Pay for the week.',
      'Open the Orders form as a datasheet and set Driver Pay to the new sheet on each order the driver delivered that week: they are the sheet\'s lines.',
      'Open the print template Driver pay sheet from Print templates, choose the week\'s sheets, and print them for the drivers to sign. The query Driver pay by week lists the last eight weeks.',
    ] },
    { title: 'Win back customers who have gone quiet', steps: [
      'Run the query Customers not ordered for 60 days, or print the report Come-back list: customers who agreed to offers and have not ordered for two months, the biggest spenders first.',
      'Send each a come-back offer by text or e-mail from their Phone or E-mail on the Customers form.',
      'If someone asks not to be sent offers again, untick Offers on their Customers record and they leave the list.',
    ] },
    { title: 'Check the menu, the costs and the ingredients each week', steps: [
      'Print the report Ingredient use: what the last seven nights used of each ingredient, by supplier, to check the week\'s orders to suppliers against it.',
      'When a supplier puts a price up, change Cost per Unit on the Ingredients form, then print the Menu costing sheet to see each item\'s food cost against its price less VAT.',
      'To change a price, open the Menu Items form and change Price; old orders keep the price they were charged. Print the Price list to check the website and the printed menu.',
      'Run Best sellers, last 28 days and Pizza sizes sold, last 28 days to see what to make more of and what to drop.',
    ] },
    { title: 'Close the month', steps: [
      'Print the report Monthly takings: the takings by channel, the VAT within them, the kitchen\'s wages and the drivers\' pay, month by month.',
      'Add up the VAT of the three months of your VAT quarter for the return.',
      'Print the report Delivery times to see whether the zones are keeping to their targets, and change a zone\'s Target Minutes or its Charge on the Delivery Zones form if they are not.',
    ] },
  ],
  notes: [
    'The orders are kept line by line for the last twelve weeks; the night sheets go back fourteen months and are where the monthly figures come from. The driver pay sheets cover the finished weeks of those twenty.',
    'Goods, Total, Tax and Net on an order, and Drops and Drop Pay on a pay sheet, are stored figures typed when the record is made, not added up by the form. The sample\'s own are exactly the sums of their lines.',
    'A meal deal is a line at the deal\'s price followed by each thing chosen at nought, so best sellers count the pizzas and curries in deals as sold, and the money stays with the deal.',
    'Recipes are written for one item, and for the smallest pizza; the Portion on each order line scales them for the size. Extras have recipes of their own. Ingredient use is worked out from these, not counted, so check it against a stock count now and then.',
    'The three order templates leave cancelled orders out, and the Delivery slip prints for deliveries only. Choose the orders you mean before pressing Print; an order chosen on the Orders form always prints, a cancelled one marked as cancelled.',
    'Time is kept to the minute in Placed, Due, Ready, Out and Handed Over, and the delivery times are worked out from them. Leave Handed Over empty until the customer has the food.',
    'The VAT is kept simple: 20% on hot food, drinks, ice cream and delivery, nought on the cold desserts and coleslaw. Have yours checked by an accountant for your own country.',
    'A few orders are booked ahead for tonight and the next two nights, so Tonight\'s orders and Orders still to go out have something on them whenever the sample is made. Orders taken today before the time it was made are there too, with their status at that time.',
  ],
  faq: [
    { q: 'How do I reprint a customer\'s receipt?', a: 'Find the order on the Orders form by its Number or the customer, then open the print template Customer receipt, choose that order and press Print.' },
    { q: 'Why is a pizza at nought on the receipt?', a: 'It is part of a meal deal. The deal is the line above it at the deal\'s price, and each thing chosen for it follows at nought, with the deal\'s name in its notes, so the kitchen sees what to make.' },
    { q: 'Where does the delivery time come from?', a: 'From Placed and Handed Over on each order: the minutes between the order going in and the food reaching the door. Delivery times by zone, last 28 days averages them and counts those over the zone\'s Target Minutes.' },
    { q: 'How are the drivers paid?', a: 'Per drop, at the Drop Fee of the zone each delivery went to, which covers their own fuel and car. Each week\'s drops are added up on a Driver Pay sheet; tax and National Insurance are worked out by the payroll.' },
    { q: 'A customer wants their usual delivered somewhere else tonight. What do I change?', a: 'Type the other Address, Postcode and Delivery Notes on that order only, and choose the Zone that address is in. Their Customers record stays as it is.' },
    { q: 'Why is someone missing from the come-back list?', a: 'The list shows only customers who have ticked Offers, have not ordered for more than 60 days and have an order within the twelve weeks kept here. Someone who said no to offers is never on it.' },
    { q: 'How do I change the delivery charge for one zone?', a: 'Open the Delivery Zones form and change Charge, Free Over or Minimum Order. Orders already taken keep the charge they were given.' },
    { q: 'Can I start with my own menu and keep the design?', a: 'Yes. Make the sample empty and follow the order under starting empty: your Business details, the zones, the menu with its sizes and recipes, then your staff.' },
  ],
  empty: 'Start with Business: your name, address, phone, VAT number and the words at the foot of a receipt. Then Delivery Zones, with each zone\'s districts, charges and the drivers\' fee; Sizes; Menu Categories; Menu Items; Ingredients; and the Recipe Lines for each item, numbered from 1. Then Staff, the drivers among them. Customers are added as they first order. From then on, each order is an Orders record with its Order Lines, each night a Nights sheet, and each week a Driver Pay sheet for each driver with their drops pointing at it.',
  adapt: [
    'Charge by distance rather than zone: add a Miles field to Customers and a calculated delivery charge in a query, such as 1.50 plus 0.50 a mile.',
    'Take orders through a delivery app as well: add App as a Channel, and an App Fee field on Orders for the commission, so Takings by channel shows what each channel leaves you.',
    'Run a loyalty card: add a Stamps field to Customers and a query counting each customer\'s orders since their last free one.',
    'Pay drivers by the hour as well as per drop: give them an Hourly Rate and add Hours and Hourly Pay to Driver Pay, with a gross pay that adds both.',
    'Keep allergens: add yes/no fields to Ingredients (gluten, milk, egg, nuts, sesame and the rest) and a query listing the menu items using any marked Yes, for the counter and the website.',
    'Add a Table No and Covers to Orders and Eat in as a Method if you have a few tables.',
    'Track stock: add In Stock and Reorder Level to Ingredients and a Deliveries table, and compare the ingredient use with what came in.',
  ],
};

// The delivery zones: [name, districts, miles, charge, free over, minimum order, target minutes, drop fee, travel minutes lo, hi, share of deliveries].
const ZONES = [
  ['Zone A', 'SE15', 1, 1.5, 25, 12, 35, 2, 5, 11, 50],
  ['Zone B', 'SE5, SE22', 2, 2.5, 35, 15, 40, 2.75, 9, 17, 33],
  ['Zone C', 'SE4, SE14, SE23', 3.5, 3.5, null, 20, 50, 3.5, 14, 24, 17],
];
const STREETS = {
  'Zone A': ['Harbour Street', 'Mill Lane', 'Orchard Way', 'Canal Walk', 'Beech Grove', 'Linden Close', 'Peckham Hill Row', 'Copper Lane'],
  'Zone B': ['Station Road', 'Church Street', 'Cedar Avenue', 'Riverside Drive', 'Hollybush Rise', 'Elm Terrace', 'Wren Gardens'],
  'Zone C': ['Quarry Road', 'Market Square', 'Larch Avenue', 'Thornfield Road', 'Kestrel Court', 'Ashdown Way'],
};
const NOTES = ['Ring the top bell', 'Flat is round the back', 'Please do not knock, baby asleep', 'Leave at the door and ring', 'Side gate, blue door', 'Buzzer broken, please call', 'Third floor, no lift', 'Opposite the school'];

// The staff: [role, hourly rate or null for a driver, evenings worked (0 Sunday), weekend lunches worked].
const STAFF = [
  ['Owner and Head Chef', 17, [2, 3, 4, 5, 6, 0], [6, 0]],
  ['Curry Chef', 15.5, [0, 1, 3, 4, 5, 6], []],
  ['Cook', 14, [1, 2, 5, 6], [0]],
  ['Cook', 12.9, [0, 3, 4, 5, 6], [6]],
  ['Counter and Phones', 12.75, [1, 2, 3, 4, 5], [6, 0]],
  ['Counter and Phones', 12.75, [0, 5, 6], []],
  ['Kitchen Porter', 12.75, [5, 6], []],
  ['Driver', null, [0, 1, 2, 3, 4], []],
  ['Driver', null, [3, 4, 5, 6], []],
  ['Driver', null, [0, 5, 6], [6, 0]],
  ['Driver', null, [1, 2, 5, 6], []],
  ['Driver', null, [4, 5, 6], []],
];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SIZES = [['10 inch', 0, 1, 1], ['12 inch', 2.5, 1.4, 2], ['14 inch', 5, 1.9, 3]];
const CATEGORIES = ['Meal Deals', 'Pizzas', 'Burgers', 'Curries', 'Rice and Breads', 'Sides', 'Desserts', 'Drinks', 'Extras'];

// The ingredients: [key, name, unit, cost per unit, supplier, bought as].
const INGREDIENTS = [
  ['dough', 'Pizza dough ball', 'each', 0.42, 'Juniper Bakery Supplies', 'tray of 40'],
  ['sauce', 'Pizza sauce', 'kg', 2.4, 'Copperfield Wholesale', '5 kg tub'],
  ['mozz', 'Mozzarella, grated', 'kg', 6.2, 'Copperfield Wholesale', '2 kg bag'],
  ['pep', 'Pepperoni, sliced', 'kg', 9.5, 'Kestrel Butchers', '1 kg pack'],
  ['ham', 'Ham, diced', 'kg', 8, 'Kestrel Butchers', '1 kg pack'],
  ['beef', 'Spiced minced beef', 'kg', 9, 'Kestrel Butchers', '2 kg pack'],
  ['chicken', 'Chicken breast, cooked', 'kg', 9.5, 'Kestrel Butchers', '2 kg pack'],
  ['tikka', 'Chicken tikka pieces', 'kg', 10.5, 'Kestrel Butchers', '2.5 kg pack'],
  ['lamb', 'Diced lamb', 'kg', 11, 'Kestrel Butchers', '5 kg pack'],
  ['bacon', 'Streaky bacon', 'kg', 9, 'Kestrel Butchers', '1 kg pack'],
  ['patty', 'Beef burger, 6 oz', 'each', 0.85, 'Kestrel Butchers', 'box of 48'],
  ['fillet', 'Breaded chicken fillet', 'each', 0.95, 'Kestrel Butchers', 'box of 40'],
  ['wings', 'Chicken wings', 'kg', 4.2, 'Kestrel Butchers', '5 kg box'],
  ['prawns', 'King prawns, frozen', 'kg', 14, 'Copperfield Wholesale', '1 kg bag'],
  ['beanpatty', 'Spiced bean burger', 'each', 0.7, 'Copperfield Wholesale', 'box of 36'],
  ['bun', 'Brioche bun', 'each', 0.28, 'Juniper Bakery Supplies', 'bag of 12'],
  ['naan', 'Naan dough ball', 'each', 0.25, 'Juniper Bakery Supplies', 'tray of 30'],
  ['cheddar', 'Cheddar slice', 'each', 0.12, 'Copperfield Wholesale', 'pack of 84'],
  ['cream', 'Double cream', 'litre', 3.5, 'Copperfield Wholesale', '2 litre carton'],
  ['coconut', 'Desiccated coconut', 'kg', 5, 'Copperfield Wholesale', '1 kg bag'],
  ['base', 'Curry base sauce', 'litre', 1.8, 'Copperfield Wholesale', '10 litre tub'],
  ['spice', 'Spice blend', 'kg', 9, 'Copperfield Wholesale', '1 kg tub'],
  ['rice', 'Basmati rice', 'kg', 1.9, 'Copperfield Wholesale', '10 kg sack'],
  ['chickpeas', 'Chickpeas, tinned', 'kg', 1.6, 'Copperfield Wholesale', 'case of 12 tins'],
  ['garlic', 'Garlic butter', 'kg', 6, 'Copperfield Wholesale', '1 kg tub'],
  ['bbq', 'Barbecue sauce', 'kg', 3.5, 'Copperfield Wholesale', '2 kg tub'],
  ['burgersauce', 'Burger sauce', 'kg', 4, 'Copperfield Wholesale', '2 kg tub'],
  ['fries', 'Frozen fries', 'kg', 1.6, 'Copperfield Wholesale', '10 kg box'],
  ['bhaji', 'Onion bhaji', 'each', 0.22, 'Copperfield Wholesale', 'box of 60'],
  ['samosa', 'Vegetable samosa', 'each', 0.3, 'Copperfield Wholesale', 'box of 50'],
  ['poppadom', 'Poppadom', 'each', 0.06, 'Copperfield Wholesale', 'box of 200'],
  ['chutney', 'Mango chutney', 'kg', 4, 'Copperfield Wholesale', '2.5 kg tub'],
  ['coleslaw', 'Coleslaw', 'kg', 3, 'Copperfield Wholesale', '2 kg tub'],
  ['onions', 'Onions', 'kg', 1, 'Alder Produce', '10 kg sack'],
  ['peppers', 'Peppers', 'kg', 2.6, 'Alder Produce', '5 kg box'],
  ['mushrooms', 'Mushrooms', 'kg', 3.8, 'Alder Produce', '2.5 kg box'],
  ['tomatoes', 'Tomatoes', 'kg', 2.2, 'Alder Produce', '6 kg box'],
  ['lettuce', 'Shredded lettuce', 'kg', 3, 'Alder Produce', '1 kg bag'],
  ['spinach', 'Spinach', 'kg', 4, 'Alder Produce', '1 kg bag'],
  ['jalapenos', 'Jalapenos, sliced', 'kg', 4.5, 'Copperfield Wholesale', '3 kg tin'],
  ['olives', 'Black olives, sliced', 'kg', 6, 'Copperfield Wholesale', '2 kg tin'],
  ['sweetcorn', 'Sweetcorn', 'kg', 2.5, 'Copperfield Wholesale', '2 kg tin'],
  ['fudge', 'Chocolate fudge cake, slice', 'each', 1.1, 'Copperfield Wholesale', 'cake of 14 slices'],
  ['cheesecake', 'Baked cheesecake, slice', 'each', 1.2, 'Copperfield Wholesale', 'cake of 12 slices'],
  ['icecream', 'Vanilla ice cream, 500 ml tub', 'each', 1.9, 'Copperfield Wholesale', 'case of 6'],
  ['can', 'Cola, 330 ml can', 'each', 0.42, 'Silverline Drinks', 'case of 24'],
  ['lemonade', 'Lemonade, 330 ml can', 'each', 0.4, 'Silverline Drinks', 'case of 24'],
  ['bottle', 'Cola, 1.5 litre bottle', 'each', 0.95, 'Silverline Drinks', 'case of 12'],
  ['water', 'Still water, 500 ml bottle', 'each', 0.22, 'Silverline Drinks', 'case of 24'],
];

// The menu: [key, name, category, price, VAT rate, diet, spice, description, recipe, available].
// Pizzas are priced and their recipes written for the 10 inch; a size adds to both.
const BASE = [['dough', 1], ['sauce', 0.06], ['mozz', 0.11]];
const CURRY = (extra) => [['base', 0.3], ['spice', 0.01], ...extra];
const MENU = [
  ['nightfortwo', 'Pizza Night for Two', 'Meal Deals', 24, 0.2, '', 0, 'Two 12 inch pizzas, garlic bread and a 1.5 litre cola', [], 'Sunday to Thursday'],
  ['feast', 'Family Feast', 'Meal Deals', 36, 0.2, '', 0, 'Two 14 inch pizzas, six wings, fries, garlic bread and a 1.5 litre cola', [], ''],
  ['currytwo', 'Curry for Two', 'Meal Deals', 24, 0.2, '', 0, 'Two curries, two rice, a naan and poppadoms with chutney', [], ''],
  ['lunchdeal', 'Weekend Lunch Deal', 'Meal Deals', 8.5, 0.2, '', 0, 'A 10 inch pizza or a burger, fries and a can', [], 'Saturday and Sunday, 12 to 2:30'],
  ['margherita', 'Margherita', 'Pizzas', 7.5, 0.2, 'V', 0, 'Tomato and mozzarella', [...BASE, ['mozz', 0.01]], ''],
  ['pepperoni', 'Pepperoni', 'Pizzas', 9, 0.2, '', 0, 'Double pepperoni', [...BASE, ['pep', 0.05]], ''],
  ['meatfeast', 'Meat Feast', 'Pizzas', 10, 0.2, '', 0, 'Pepperoni, ham, spiced beef and bacon', [...BASE, ['pep', 0.03], ['ham', 0.03], ['beef', 0.04], ['bacon', 0.02]], ''],
  ['veggie', 'Vegetarian Supreme', 'Pizzas', 9.5, 0.2, 'V', 0, 'Peppers, onions, mushrooms, olives and sweetcorn', [...BASE, ['peppers', 0.03], ['onions', 0.02], ['mushrooms', 0.03], ['olives', 0.015], ['sweetcorn', 0.02]], ''],
  ['tikkapizza', 'Chicken Tikka Pizza', 'Pizzas', 9.75, 0.2, '', 1, 'Chicken tikka, onions and peppers', [...BASE, ['tikka', 0.06], ['onions', 0.02], ['peppers', 0.02]], ''],
  ['bbqchicken', 'Barbecue Chicken', 'Pizzas', 9.75, 0.2, '', 0, 'Barbecue sauce base, chicken and onions', [['dough', 1], ['bbq', 0.05], ['mozz', 0.11], ['chicken', 0.06], ['onions', 0.02]], ''],
  ['hotspicy', 'Hot and Spicy', 'Pizzas', 9.75, 0.2, '', 2, 'Spiced beef, jalapenos, peppers and onions', [...BASE, ['beef', 0.05], ['jalapenos', 0.02], ['peppers', 0.02], ['onions', 0.02]], ''],
  ['classic', 'Classic Burger', 'Burgers', 7, 0.2, '', 0, '6 oz beef, lettuce, tomato, onion and burger sauce', [['patty', 1], ['bun', 1], ['lettuce', 0.02], ['tomatoes', 0.03], ['onions', 0.01], ['burgersauce', 0.02]], ''],
  ['cheese', 'Cheeseburger', 'Burgers', 7.5, 0.2, '', 0, 'The classic with cheddar', [['patty', 1], ['bun', 1], ['cheddar', 1], ['lettuce', 0.02], ['tomatoes', 0.03], ['burgersauce', 0.02]], ''],
  ['double', 'Double Stack', 'Burgers', 9.5, 0.2, '', 0, 'Two 6 oz beef, two cheddar, burger sauce', [['patty', 2], ['bun', 1], ['cheddar', 2], ['lettuce', 0.02], ['burgersauce', 0.03]], ''],
  ['chickenburger', 'Crispy Chicken Burger', 'Burgers', 7.5, 0.2, '', 0, 'Breaded chicken fillet, lettuce and burger sauce', [['fillet', 1], ['bun', 1], ['lettuce', 0.02], ['burgersauce', 0.02]], ''],
  ['beanburger', 'Spiced Bean Burger', 'Burgers', 7, 0.2, 'VG', 1, 'Spiced bean burger, lettuce and tomato', [['beanpatty', 1], ['bun', 1], ['lettuce', 0.02], ['tomatoes', 0.03]], ''],
  ['tikkamasala', 'Chicken Tikka Masala', 'Curries', 9.5, 0.2, '', 1, 'Chicken tikka in a creamy tomato sauce', CURRY([['tikka', 0.18], ['cream', 0.05]]), ''],
  ['korma', 'Chicken Korma', 'Curries', 9.5, 0.2, '', 0, 'Mild, with cream and coconut', CURRY([['tikka', 0.18], ['cream', 0.06], ['coconut', 0.02]]), ''],
  ['madras', 'Chicken Madras', 'Curries', 9.5, 0.2, '', 2, 'Hot and tangy', CURRY([['tikka', 0.18], ['spice', 0.005]]), ''],
  ['roganjosh', 'Lamb Rogan Josh', 'Curries', 10.95, 0.2, '', 1, 'Lamb with tomatoes and spices', CURRY([['lamb', 0.18], ['tomatoes', 0.05]]), ''],
  ['bhuna', 'Lamb Bhuna', 'Curries', 10.95, 0.2, '', 1, 'Lamb with onions and peppers, a thick sauce', CURRY([['lamb', 0.18], ['onions', 0.05], ['peppers', 0.03]]), ''],
  ['jalfrezi', 'Prawn Jalfrezi', 'Curries', 11.5, 0.2, '', 2, 'King prawns, peppers, onions and green chilli', CURRY([['prawns', 0.15], ['peppers', 0.04], ['onions', 0.04], ['jalapenos', 0.01]]), ''],
  ['chickpea', 'Chickpea and Spinach Curry', 'Curries', 8.5, 0.2, 'VG', 1, 'Chickpeas and spinach in a spiced tomato sauce', CURRY([['chickpeas', 0.15], ['spinach', 0.06]]), ''],
  ['pilau', 'Pilau Rice', 'Rice and Breads', 3.2, 0.2, 'VG', 0, '', [['rice', 0.12], ['spice', 0.002]], ''],
  ['plainrice', 'Plain Rice', 'Rice and Breads', 2.8, 0.2, 'VG', 0, '', [['rice', 0.12]], ''],
  ['naanplain', 'Plain Naan', 'Rice and Breads', 2.8, 0.2, 'V', 0, '', [['naan', 1], ['garlic', 0.005]], ''],
  ['naangarlic', 'Garlic Naan', 'Rice and Breads', 3.2, 0.2, 'V', 0, '', [['naan', 1], ['garlic', 0.02]], ''],
  ['naanpeshwari', 'Peshwari Naan', 'Rice and Breads', 3.5, 0.2, 'V', 0, 'Sweet, with coconut', [['naan', 1], ['coconut', 0.02], ['garlic', 0.005]], ''],
  ['fries', 'Fries', 'Sides', 2.9, 0.2, 'VG', 0, '', [['fries', 0.2]], ''],
  ['cheesyfries', 'Cheesy Fries', 'Sides', 3.9, 0.2, 'V', 0, '', [['fries', 0.2], ['mozz', 0.05]], ''],
  ['garlicbread', 'Garlic Bread', 'Sides', 3.8, 0.2, 'V', 0, 'Baked to order', [['dough', 1], ['garlic', 0.03]], ''],
  ['wings', 'Chicken Wings, six', 'Sides', 5.9, 0.2, '', 0, 'With barbecue sauce', [['wings', 0.4], ['bbq', 0.03]], ''],
  ['bhajis', 'Onion Bhajis, four', 'Sides', 3.9, 0.2, 'VG', 0, '', [['bhaji', 4]], ''],
  ['samosas', 'Vegetable Samosas, three', 'Sides', 3.9, 0.2, 'VG', 1, '', [['samosa', 3]], ''],
  ['poppadoms', 'Poppadoms and Chutney', 'Sides', 2.5, 0.2, 'VG', 0, 'Four poppadoms with mango chutney', [['poppadom', 4], ['chutney', 0.06]], ''],
  ['coleslaw', 'Coleslaw', 'Sides', 1.8, 0, 'V', 0, 'Sold cold', [['coleslaw', 0.12]], ''],
  ['fudgecake', 'Chocolate Fudge Cake', 'Desserts', 4.5, 0, 'V', 0, 'Sold cold', [['fudge', 1]], ''],
  ['cheesecake', 'Baked Cheesecake', 'Desserts', 4.5, 0, 'V', 0, 'Sold cold', [['cheesecake', 1]], ''],
  ['icecream', 'Vanilla Ice Cream, 500 ml', 'Desserts', 5.5, 0.2, 'V', 0, '', [['icecream', 1]], ''],
  ['cola', 'Cola, 330 ml can', 'Drinks', 1.5, 0.2, 'VG', 0, '', [['can', 1]], ''],
  ['lemonade', 'Lemonade, 330 ml can', 'Drinks', 1.5, 0.2, 'VG', 0, '', [['lemonade', 1]], ''],
  ['bottle', 'Cola, 1.5 litre bottle', 'Drinks', 3.5, 0.2, 'VG', 0, '', [['bottle', 1]], ''],
  ['water', 'Still Water, 500 ml', 'Drinks', 1.2, 0.2, 'VG', 0, '', [['water', 1]], ''],
  ['xcheese', 'Extra Cheese', 'Extras', 1.2, 0.2, 'V', 0, 'On a pizza', [['mozz', 0.04]], ''],
  ['xmushrooms', 'Extra Mushrooms', 'Extras', 1, 0.2, 'VG', 0, 'On a pizza', [['mushrooms', 0.03]], ''],
  ['xpep', 'Extra Pepperoni', 'Extras', 1.5, 0.2, '', 0, 'On a pizza', [['pep', 0.03]], ''],
  ['xjalapenos', 'Extra Jalapenos', 'Extras', 0.9, 0.2, 'VG', 1, 'On a pizza or a burger', [['jalapenos', 0.02]], ''],
  ['xbacon', 'Add Bacon', 'Extras', 1.5, 0.2, '', 0, 'On a burger', [['bacon', 0.03]], ''],
  ['xslice', 'Add Cheese Slice', 'Extras', 0.8, 0.2, 'V', 0, 'On a burger', [['cheddar', 1]], ''],
  ['meal', 'Make It a Meal', 'Extras', 3.5, 0.2, '', 0, 'Fries and a can with a burger', [['fries', 0.2], ['can', 1]], ''],
  // Off the menu since the spring; kept for the record.
  ['doner', 'Lamb Doner Pizza', 'Pizzas', 9.75, 0.2, '', 1, 'Lamb doner and red onion', [...BASE, ['lamb', 0.06], ['onions', 0.02]], '', 'retired'],
];

const PIZZAS = ['margherita', 'pepperoni', 'meatfeast', 'veggie', 'tikkapizza', 'bbqchicken', 'hotspicy'];
const PIZZA_WEIGHT = [18, 22, 15, 11, 12, 10, 9];
const BURGERS = ['classic', 'cheese', 'double', 'chickenburger', 'beanburger'];
const BURGER_WEIGHT = [20, 28, 14, 26, 8];
const CURRIES = ['tikkamasala', 'korma', 'madras', 'roganjosh', 'bhuna', 'jalfrezi', 'chickpea'];
const CURRY_WEIGHT = [28, 16, 14, 12, 9, 8, 9];

// Orders expected in each hour, before the night, the season and the weather lift them.
const EVENING = { 17: 3, 18: 8, 19: 10, 20: 8, 21: 5, 22: 2 };
const LUNCH = { 12: 5, 13: 6, 14: 2 };
const NIGHT_LIFT = [1, 0.75, 0.8, 0.85, 0.95, 2, 2]; // Sunday first
const SEASON = [1.05, 1, 0.95, 0.92, 0.88, 0.85, 0.85, 0.85, 0.92, 1, 1.05, 1.15]; // January first

/** An item of `keys` chosen by `weights`. */
const pickW = (r, keys, weights) => r.weighted(keys.map((k, i) => [k, weights[i]]));

/**
 * What one order asks for: lines of { it, size, qty, price, notes, fixed } in
 * the order the ticket lists them. `fixed` lines (a deal's parts, a dish with
 * an extra under it) are never merged with another of the same.
 */
function basket(r, M, S, { lunch, wd, people }) {
  const lines = [];
  const add = (key, { size = null, price = null, notes = null, fixed = false } = {}) => {
    const it = M[key];
    const p = price ?? money(it.price + (size ? size.add : 0));
    const same = !fixed && !notes && lines.find((l) => !l.fixed && !l.notes && l.it === it && l.size === size && l.price === p);
    if (same) same.qty++;
    else lines.push({ it, size, qty: 1, price: p, notes, fixed });
  };
  const pizza = (size, inDeal) => {
    const key = pickW(r, PIZZAS, PIZZA_WEIGHT);
    const extras = !inDeal && r.chance(0.18) ? r.some(['xcheese', 'xmushrooms', 'xpep', 'xjalapenos'], r.chance(0.7) ? 1 : 2) : [];
    const notes = inDeal ? `in ${inDeal}` : r.chance(0.05) ? r.pick(['Well done', 'Light on the cheese', 'Cut in squares']) : null;
    add(key, { size, price: inDeal ? 0 : null, notes, fixed: Boolean(inDeal) || extras.length > 0 });
    for (const x of extras) add(x, { notes: `on the ${M[key].name}`, fixed: true });
  };
  const burger = (inDeal) => {
    const key = pickW(r, BURGERS, BURGER_WEIGHT);
    const meal = !inDeal && r.chance(0.42);
    const bacon = !inDeal && r.chance(0.14);
    const notes = inDeal ? `in ${inDeal}` : r.chance(0.07) ? r.pick(['No onions', 'No sauce', 'No lettuce']) : null;
    add(key, { price: inDeal ? 0 : null, notes, fixed: Boolean(inDeal) || meal || bacon });
    if (bacon) add('xbacon', { notes: `on the ${M[key].name}`, fixed: true });
    if (meal) add('meal', { notes: `with the ${M[key].name}`, fixed: true });
    return meal;
  };
  const curry = (inDeal) => {
    const key = pickW(r, CURRIES, CURRY_WEIGHT);
    const notes = inDeal ? `in ${inDeal}` : r.chance(0.14) ? r.pick(['Extra hot', 'Extra hot', 'Mild please', 'No onions']) : null;
    add(key, { price: inDeal ? 0 : null, notes, fixed: Boolean(inDeal) });
  };
  const size = () => S[r.weighted(people >= 3 ? [[0, 15], [1, 45], [2, 40]] : [[0, 35], [1, 50], [2, 15]])];

  const kind = lunch ? r.weighted([['pizza', 50], ['burger', 35], ['curry', 15]]) : r.weighted([['pizza', 45], ['curry', 33], ['burger', 22]]);
  let left = people;
  let mealDrinks = 0;
  // The deals first, when the order fits one.
  if (lunch && r.chance(0.45)) {
    add('lunchdeal');
    const name = M.lunchdeal.name;
    if (kind === 'burger') burger(name); else pizza(S[0], name);
    add('fries', { price: 0, notes: `in ${name}`, fixed: true });
    add(r.chance(0.75) ? 'cola' : 'lemonade', { price: 0, notes: `in ${name}`, fixed: true });
    left -= 1;
    mealDrinks++;
  } else if (kind === 'pizza' && people >= 4 && r.chance(0.4)) {
    add('feast');
    const name = M.feast.name;
    pizza(S[2], name);
    pizza(S[2], name);
    for (const k of ['wings', 'fries', 'garlicbread', 'bottle']) add(k, { price: 0, notes: `in ${name}`, fixed: true });
    left -= 4;
    mealDrinks += 4;
  } else if (kind === 'pizza' && people >= 2 && wd <= 4 && r.chance(0.45)) {
    add('nightfortwo');
    const name = M.nightfortwo.name;
    pizza(S[1], name);
    pizza(S[1], name);
    for (const k of ['garlicbread', 'bottle']) add(k, { price: 0, notes: `in ${name}`, fixed: true });
    left -= 2;
    mealDrinks += 2;
  } else if (kind === 'curry' && people >= 2 && r.chance(0.38)) {
    add('currytwo');
    const name = M.currytwo.name;
    curry(name);
    curry(name);
    add(r.chance(0.7) ? 'pilau' : 'plainrice', { price: 0, notes: `in ${name}`, fixed: true });
    add(r.chance(0.7) ? 'pilau' : 'plainrice', { price: 0, notes: `in ${name}`, fixed: true });
    add(r.pick(['naanplain', 'naangarlic', 'naangarlic', 'naanpeshwari']), { price: 0, notes: `in ${name}`, fixed: true });
    add('poppadoms', { price: 0, notes: `in ${name}`, fixed: true });
    left -= 2;
  }
  // Then a dish each for the rest, with what goes with it.
  for (let p = 0; p < left; p++) {
    const k = p === 0 || r.chance(0.8) ? kind : r.pick(['pizza', 'burger', 'curry']);
    if (k === 'pizza') pizza(size(), null);
    else if (k === 'burger') { if (burger(null)) mealDrinks++; } else {
      curry(null);
      if (r.chance(0.85)) add(r.chance(0.7) ? 'pilau' : 'plainrice');
      if (r.chance(0.55)) add(r.pick(['naanplain', 'naangarlic', 'naangarlic', 'naanpeshwari']));
    }
  }
  if (left > 0) {
    if (kind === 'curry') {
      if (r.chance(0.4)) add('poppadoms');
      if (r.chance(0.3)) add('bhajis');
      if (r.chance(0.18)) add('samosas');
    } else {
      if (r.chance(0.42)) add(r.pick(['fries', 'fries', 'cheesyfries', 'garlicbread', 'garlicbread', 'wings', 'coleslaw']));
      if (people >= 3 && r.chance(0.35)) add(r.pick(['wings', 'garlicbread', 'fries']));
    }
  }
  // Drinks for whoever has none from a deal or a meal.
  const thirsty = Math.max(0, people - mealDrinks);
  if (thirsty >= 3 && r.chance(0.45)) add('bottle');
  else for (let p = 0; p < thirsty; p++) if (r.chance(0.33)) add(r.pick(['cola', 'cola', 'lemonade', 'water']));
  if (r.chance(0.11)) add(r.pick(['fudgecake', 'cheesecake', 'icecream', 'fudgecake']));
  return lines;
}

/** The night's weather, as the night sheet notes it, and how much it lifts orders. */
function weatherFor(r, month) {
  const winter = month <= 1 || month >= 10;
  if (winter) return r.weighted([['Dry', 40], ['Rain', 35], ['Cold', 25]]);
  if (month >= 5 && month <= 7) return r.weighted([['Dry', 75], ['Rain', 25]]);
  return r.weighted([['Dry', 60], ['Rain', 40]]);
}
const WEATHER_LIFT = { Dry: 1, Rain: 1.15, Cold: 1.1 };

const pad2 = (n) => String(n).padStart(2, '0');
/** A time `m` minutes after midnight of day `d`, as stored. */
const at = (cal, d, m) => `${cal.day(d)}T${pad2(Math.floor(m / 60))}:${pad2(m % 60)}:00`;

/** Fill a Saffron Lane Pizza and Curry database made from `spec`. `r` is random(), `cal` calendar(). Answers counts. */
export function fill(base, { r, cal, days = 425, orderDays = 84 }) {
  const counts = {};
  const add = (table, values) => { counts[table] = (counts[table] || 0) + 1; return base.insert(table, values); };

  add('Business', businessRecord({
    name: 'Saffron Lane Pizza and Curry', domain: 'saffronlanepizza.example', phone: '020 7946 0730',
    address: { Address: '88 Station Road', City: 'London', Postcode: 'SE15 4TU', Country: 'United Kingdom' },
    terms: 'Paid when ordered, or in cash at the door or the counter.',
    footer: 'Thank you for ordering. Open every evening 5 pm to 11 pm, and Saturday and Sunday 12 to 2:30. Prices include VAT. Please tell us about any allergy when you order: our kitchen handles gluten, milk, egg, mustard and sesame.',
  }));

  // Document numbers, given in date order with a new run each year: ORD-2026-00042.
  const runs = {};
  const numbered = (prefix, d, width) => {
    const y = cal.at(d).getFullYear();
    const k = `${prefix}${y}`;
    runs[k] = (runs[k] || 0) + 1;
    return `${prefix}-${y}-${String(runs[k]).padStart(width, '0')}`;
  };

  // Phone numbers only from the ranges kept for fiction, each given once.
  const phones = [];
  for (let i = 0; i < 1000; i++) phones.push(`07700 900${String(i).padStart(3, '0')}`, `020 7946 0${String(i).padStart(3, '0')}`);
  for (let i = phones.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [phones[i], phones[j]] = [phones[j], phones[i]]; }
  const used = new Set(['020 7946 0730']);
  const phone = () => { let p; do p = phones.pop(); while (used.has(p)); used.add(p); return p; };

  // Delivery zones.
  const zones = ZONES.map(([name, areas, miles, charge, freeOver, min, target, fee, lo, hi, share]) => ({
    name, areas: areas.split(', '), charge, freeOver, min, target, fee, lo, hi, share,
    id: add('Delivery Zones', { Name: name, Areas: areas, Miles: miles, Charge: charge, 'Free Over': freeOver, 'Minimum Order': min, 'Target Minutes': target, 'Drop Fee': fee }),
  }));

  // Staff: the kitchen, the counter and the drivers.
  const staff = STAFF.map(([role, rate, evenings, lunches], i) => {
    const first = FIRST[(i * 7 + r.int(0, 6)) % FIRST.length];
    const last = LAST[(i * 11 + r.int(0, 10)) % LAST.length];
    const works = [...evenings.map((w) => DAY_SHORT[w]).sort((a, b) => DAY_SHORT.indexOf(a) - DAY_SHORT.indexOf(b)), ...lunches.map((w) => `${DAY_SHORT[w]} lunch`)];
    const id = add('Staff', {
      'First Name': first, 'Last Name': last, Role: role, Phone: phone(), 'Hourly Rate': rate,
      Works: works.join(', '), Started: cal.day(-r.int(i === 0 ? 2400 : 300, i === 0 ? 3200 : 1800)),
    });
    return { id, role, rate, evenings, lunches, driver: role === 'Driver' };
  });
  const drivers = staff.filter((s) => s.driver);
  // A night's wages: the kitchen and counter from five to half past eleven, lunch from half past eleven to three.
  const wagesFor = (wd, lunch) => money(staff.filter((s) => !s.driver && (lunch ? s.lunches : s.evenings).includes(wd)).reduce((n, s) => n + s.rate * (lunch ? 3.5 : 6.5), 0));

  // Sizes and the menu.
  const sizes = SIZES.map(([name, addTo, portion, order]) => ({ name, add: addTo, portion, id: add('Sizes', { Name: name, 'Add to Price': addTo, Portion: portion, 'Sort Order': order }) }));
  const categories = new Map(CATEGORIES.map((name, i) => [name, add('Menu Categories', { Name: name, 'Sort Order': i + 1 })]));
  const ingredients = new Map(INGREDIENTS.map(([key, name, unit, cost, supplier, boughtAs]) => [key, add('Ingredients', { Name: name, Unit: unit, 'Cost per Unit': cost, Supplier: supplier, 'Bought As': boughtAs })]));
  const M = {};
  for (const [key, name, cat, price, vat, diet, spice, description, recipe, available, retired] of MENU) {
    const id = add('Menu Items', {
      Name: name, Category: categories.get(cat), Price: price, Sized: cat === 'Pizzas', 'VAT Rate': vat, Diet: diet || null, Spice: spice,
      Description: description || null, Available: available || null, Active: retired !== 'retired',
    });
    recipe.forEach(([k, q], i) => add('Recipe Lines', { 'Menu Item': id, Line: i + 1, Ingredient: ingredients.get(k), Quantity: q }));
    M[key] = { id, name, price, vat };
  }

  // Customers: some from before the records start, the rest joining through them; some stop ordering.
  const customers = [];
  for (let i = 0; i < 1250; i++) {
    const z = r.weighted(zones.map((x) => [x, x.share]));
    const district = r.pick(z.areas);
    const flat = r.chance(0.3) ? `Flat ${r.int(1, 12)}, ` : '';
    const first = r.pick(FIRST);
    const last = r.pick(LAST);
    const joined = r.chance(0.4) ? -days - r.int(1, 700) : -days + r.int(0, days);
    const freq = r.weighted([[0.8, 5], [0.4, 15], [0.2, 35], [0.06, 45]]);
    const lapse = r.chance(0.14) ? -r.int(62, 100) : r.chance(0.08) ? -r.int(140, days) : Infinity;
    customers.push({
      first, last, z, joined, freq, lapse, id: null,
      address: `${flat}${r.int(1, 180)} ${r.pick(STREETS[z.name])}`, postcode: `${district} ${r.int(1, 9)}${r.pick(['AB', 'DE', 'FG', 'HJ', 'LN', 'PQ', 'RT', 'WX'])}`,
      notes: r.chance(0.18) ? r.pick(NOTES) : null, online: r.chance(0.8), offers: r.chance(0.6),
    });
  }
  // The customers able to order on a day, weighted by how often they do, as running totals.
  let pool = null;
  let poolDay = null;
  const poolFor = (d) => {
    if (poolDay !== null && d - poolDay < 7) return pool;
    const list = customers.filter((c) => c.joined <= d && d < c.lapse);
    let sum = 0;
    pool = { list, upTo: list.map((c) => (sum += c.freq)), total: sum };
    poolDay = d;
    return pool;
  };
  const someone = (d) => {
    const p = poolFor(d);
    const x = r.next() * p.total;
    let lo = 0;
    let hi = p.upTo.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (p.upTo[mid] > x) hi = mid; else lo = mid + 1; }
    return p.list[lo];
  };

  const now = cal.hour * 60; // the minute of today the records stop at
  const firstKept = -orderDays;

  /**
   * One order for the night of day `d`, placed at minute `m` (of day `placedDay`):
   * who, how, what and when, worked out but not yet written.
   */
  const makeOrder = (d, m, { lunch, wd, recent, short, ahead = null }) => {
    let channel = ahead ? r.weighted([['Phone', 70], ['Online', 30]]) : r.weighted(lunch ? [['Phone', 30], ['Walk-in', 35], ['Online', 35]] : [['Phone', 26], ['Walk-in', 20], ['Online', 54]]);
    const customer = channel === 'Walk-in' ? (r.chance(0.25) ? someone(d) : null) : someone(d);
    // Online orders come from customers with an account (and an e-mail address); the rest rang.
    if (channel === 'Online' && !customer.online) channel = 'Phone';
    let method = channel === 'Walk-in' ? 'Collection' : r.chance(channel === 'Online' ? 0.72 : ahead ? 0.55 : 0.55) ? 'Delivery' : 'Collection';
    if (!customer) method = 'Collection';
    const people = ahead ? r.int(4, 8) : r.weighted(channel === 'Walk-in' ? [[1, 50], [2, 30], [3, 12], [4, 8]] : (wd === 5 || wd === 6 ? [[1, 30], [2, 36], [3, 15], [4, 13], [5, 4], [6, 2]] : [[1, 40], [2, 36], [3, 11], [4, 9], [5, 3], [6, 1]]));
    const lines = basket(r, M, sizes, { lunch, wd, people });
    let goods = money(lines.reduce((n, l) => n + money(l.qty * l.price), 0));
    const z = method === 'Delivery' ? customer.z : null;
    // A delivery under the zone's minimum has a side added, as the order screen asks; still short, it is collected.
    for (let k = 0; z && goods < z.min && k < 3; k++) {
      const key = r.pick(['fries', 'garlicbread', 'cola']);
      lines.push({ it: M[key], size: null, qty: 1, price: M[key].price, notes: null, fixed: true });
      goods = money(goods + M[key].price);
    }
    if (z && goods < z.min) method = 'Collection';
    const zone = method === 'Delivery' ? z : null;
    const charge = zone && !(zone.freeOver && goods >= zone.freeOver) ? zone.charge : 0;
    // VAT within each line's price and the delivery charge, rounded line by line, then added up.
    let tax = 0;
    for (const l of lines) { const g = money(l.qty * l.price); tax += money(g - g / (1 + l.it.vat)); }
    tax = money(tax + money(charge - charge / 1.2));
    const total = money(goods + charge);
    const payment = channel === 'Online' ? 'Online' : channel === 'Walk-in' ? (r.chance(0.7) ? 'Card' : 'Cash') : r.chance(0.42) ? 'Card' : 'Cash';
    // The times, in minutes after midnight of the night it is for.
    let due;
    let ready;
    let out = null;
    let handed;
    const busy = Math.round(recent * 0.8);
    if (ahead) {
      due = ahead;
      ready = due - (zone ? Math.round((zone.lo + zone.hi) / 2) + 6 : 4) - r.int(0, 4);
      if (zone) { out = ready + r.int(1, 5); handed = out + r.int(zone.lo, zone.hi); } else handed = due + r.int(-3, 10);
    } else {
      const prep = 12 + r.int(0, 8) + busy;
      ready = m + prep;
      if (zone) {
        due = Math.ceil((m + zone.target + (recent > 5 ? 10 : 0)) / 5) * 5;
        out = ready + r.int(0, 6) + Math.round(recent * 0.5) + (short ? r.int(4, 12) : 0);
        handed = out + r.int(zone.lo, zone.hi) + (short ? r.int(2, 8) : 0);
      } else {
        due = Math.ceil((m + 18 + busy) / 5) * 5;
        handed = Math.max(ready, due - 5) + r.int(0, 12);
      }
    }
    const cancelled = !ahead && r.chance(0.015);
    return { d, m, channel, customer, method, zone, lines, goods, charge, tax, total, payment, due, ready, out, handed, cancelled, people };
  };

  const driverPays = new Map();
  const nights = [];

  /** Write `o`, placed on day `pd` at minute `o.m`, if it is within the weeks kept; its status as of now. */
  const write = (o, pd, number, driversOn) => {
    const d = o.d;
    // The driver: whoever is on that night, more or less in turn.
    const driver = o.zone && !o.cancelled ? r.pick(driversOn) : null;
    o.driver = driver;
    if (pd < firstKept) return;
    // Where it stands now: tonight's and the nights ahead may not be done yet.
    const clock = d < 0 ? Infinity : d > 0 ? -Infinity : now;
    let status = 'Done';
    if (o.cancelled) status = 'Cancelled';
    else if (o.handed <= clock) status = 'Done';
    else if (o.out !== null && o.out <= clock) status = 'Out';
    else if (o.ready <= clock) status = 'Ready';
    else if (o.due - 45 <= clock || (!o.ahead && o.m <= clock)) status = 'Cooking';
    else status = 'Booked';
    const done = status === 'Done';
    const reached = (t) => (t !== null && t <= clock && !o.cancelled ? at(cal, d, t) : null);
    // A finished week's drops go on the driver's pay sheet, paid the Friday after.
    let sheet = null;
    if (driver && done && d < 0) {
      const monday = d - ((cal.weekday(d) + 6) % 7);
      if (monday >= firstKept && monday + 6 <= -1) {
        const k = `${driver.id}|${monday}`;
        if (!driverPays.has(k)) {
          driverPays.set(k, { drops: 0, pay: 0, id: add('Driver Pay', {
            Number: numbered('DRV', monday + 11, 4), Driver: driver.id, 'Week Beginning': cal.day(monday), 'Week Ending': cal.day(monday + 6),
            'Pay Date': cal.day(monday + 11), Drops: 0, 'Drop Pay': 0,
          }) });
        }
        sheet = driverPays.get(k);
        sheet.drops++;
        sheet.pay = money(sheet.pay + o.zone.fee);
      }
    }
    const c = o.customer;
    const id = add('Orders', {
      Number: number, Placed: at(cal, pd, o.m), Channel: o.channel, Method: o.method, Customer: c ? c.id : null,
      Zone: o.zone ? o.zone.id : null, Driver: driver && (status === 'Out' || done) ? driver.id : null, 'Driver Pay': sheet ? sheet.id : null,
      Due: at(cal, d, o.due), Ready: reached(o.ready), Out: reached(o.out), 'Handed Over': reached(o.handed),
      Address: o.zone ? c.address : null, Postcode: o.zone ? c.postcode : null, 'Delivery Notes': o.zone ? c.notes : null,
      Goods: o.goods, 'Delivery Charge': o.charge, Net: money(o.total - o.tax), Tax: o.tax, Total: o.total, Payment: o.payment,
      Paid: !o.cancelled && (o.payment !== 'Cash' || done), Status: status, 'Drop Fee': o.zone && driver && (status === 'Out' || done) ? o.zone.fee : null,
    });
    o.lines.forEach((l, i) => add('Order Lines', {
      Order: id, Line: i + 1, 'Menu Item': l.it.id, Size: l.size ? l.size.id : null, Portion: l.size ? l.size.portion : 1,
      Quantity: l.qty, 'Unit Price': l.price, 'Tax Rate': l.it.vat, Notes: l.notes,
    }));
  };

  // A customer's record is made at their first order; those from before the records start are there from the beginning.
  const ensure = (c, day) => {
    if (c.id) return;
    c.id = add('Customers', {
      'First Name': c.first, 'Last Name': c.last, Phone: phone(), 'E-mail': c.online ? `${c.first}.${c.last}${r.int(1, 99)}@mail.example`.toLowerCase() : null,
      Address: c.address, Postcode: c.postcode, Zone: c.z.id, 'Delivery Notes': c.notes, 'First Order': cal.day(day), Offers: c.offers,
    });
  };
  for (const c of customers) if (c.joined < -days) ensure(c, c.joined);

  for (let d = -days; d <= 0; d++) {
    const wd = cal.weekday(d);
    const date = cal.at(d);
    const month = date.getMonth();
    const weather = weatherFor(r, month);
    let lift = NIGHT_LIFT[wd] * SEASON[month] * WEATHER_LIFT[weather];
    if (month === 11 && date.getDate() === 31) lift *= 1.6;
    if (month === 11 && date.getDate() === 25) lift *= 0.5;
    const short = r.chance(0.04); // a driver short: deliveries run late
    const driversOn = drivers.filter((s) => s.evenings.includes(wd));
    const lunchDrivers = drivers.filter((s) => s.lunches.includes(wd));

    // The night's orders, lunch first at weekends, in the order they came in.
    const placed = [];
    const services = [[EVENING, false, 17, 22, 44]];
    if (wd === 0 || wd === 6) services.unshift([LUNCH, true, 12, 14, 29]);
    for (const [hours, lunch, , lastHour, lastMinute] of services) {
      for (const [hs, expected] of Object.entries(hours)) {
        const h = Number(hs);
        const n = Math.round(expected * (lunch ? NIGHT_LIFT[1] * 1.3 * SEASON[month] : lift) * (0.8 + r.next() * 0.4));
        for (let k = 0; k < n; k++) placed.push({ m: h * 60 + r.int(0, h === lastHour ? lastMinute : 59), lunch });
      }
    }
    placed.sort((a, b) => a.m - b.m);
    const orders = [];
    for (let i = 0; i < placed.length; i++) {
      const { m, lunch } = placed[i];
      let recent = 0;
      for (let j = i - 1; j >= 0 && placed[j].m > m - 20; j--) recent++;
      const o = makeOrder(d, m, { lunch, wd, recent, short });
      o.lunchDrivers = lunch;
      orders.push(o);
    }
    // Last night, a few rang to book for tonight and the next two nights: parties, mostly.
    const ahead = [];
    if (d === -1) {
      for (let nd = 0; nd <= 2; nd++) {
        const nwd = cal.weekday(nd);
        for (let k = 0; k < r.int(2, 4); k++) {
          const due = 18 * 60 + r.int(0, 10) * 15;
          const o = makeOrder(nd, 17 * 60 + r.int(10, 290), { lunch: false, wd: nwd, recent: 0, short: false, ahead: due });
          o.ahead = true;
          o.aheadDrivers = drivers.filter((s) => s.evenings.includes(nwd));
          ahead.push(o);
        }
      }
    }

    // Numbered as they were taken; the records stop at the start of the current minute of today.
    const taken = [...orders.filter((o) => d < 0 || o.m < now).map((o) => ({ o, pd: d })), ...ahead.map((o) => ({ o, pd: d }))].sort((a, b) => a.o.m - b.o.m);
    for (const { o, pd } of taken) {
      const number = numbered('ORD', pd, 5);
      if (o.customer) ensure(o.customer, pd);
      write(o, pd, number, o.ahead ? o.aheadDrivers : o.lunchDrivers && lunchDrivers.length ? lunchDrivers : driversOn);
    }

    // The night sheet, once the night is over.
    if (d < 0) {
      const ok = orders.filter((o) => !o.cancelled);
      const sum = (f) => money(ok.reduce((n, o) => n + f(o), 0));
      const notes = [];
      if (short) notes.push('A driver short tonight; deliveries ran late.');
      if (weather === 'Rain' && (wd === 5 || wd === 6)) notes.push('Wet and busy from seven.');
      const big = ok.filter((o) => o.people >= 6).length;
      if (big) notes.push(`${big} party order${big > 1 ? 's' : ''}.`);
      nights.push({
        Date: cal.day(d), Weather: weather, Orders: ok.length, Deliveries: ok.filter((o) => o.zone).length, Collections: ok.filter((o) => !o.zone).length,
        'Phone Takings': sum((o) => (o.channel === 'Phone' ? o.total : 0)), 'Walk-in Takings': sum((o) => (o.channel === 'Walk-in' ? o.total : 0)),
        'Online Takings': sum((o) => (o.channel === 'Online' ? o.total : 0)), 'Delivery Charges': sum((o) => o.charge), VAT: sum((o) => o.tax),
        Card: sum((o) => (o.payment === 'Card' ? o.total : 0)), Cash: sum((o) => (o.payment === 'Cash' ? o.total : 0)), 'Online Payments': sum((o) => (o.payment === 'Online' ? o.total : 0)),
        'Kitchen Wages': money(wagesFor(wd, false) + (wd === 0 || wd === 6 ? wagesFor(wd, true) : 0)),
        'Driver Pay': sum((o) => (o.zone ? o.zone.fee : 0)), Notes: notes.join(' ') || null,
      });
    }
  }
  for (const n of nights) add('Nights', n);

  for (const s of driverPays.values()) base.update('Driver Pay', s.id, { Drops: s.drops, 'Drop Pay': s.pay });
  return counts;
}
