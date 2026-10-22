// The estate agent: Fernleigh Estates, an invented estate and letting agency
// in Bristol that sells homes for their owners and lets and manages homes for
// landlords. Its clients (sellers and landlords), the properties they put on
// the market, the buyers and tenants looking (applicants) with what they
// want, every viewing, every offer, each sale from the offer accepted to
// completion, the tenancies it manages, the rent it collects, the repairs it
// arranges, the monthly statement and payment to each landlord, and its own
// invoices for commission and fees.
//
// Its records are eighteen months of trading, run a property at a time and a
// day at a time: a home comes on the market, applicants view it, offers come
// in and are accepted or turned down, and an accepted sale moves through
// solicitors, searches, mortgage and exchange to completion, or falls
// through and goes back on the market. A let home is viewed and let, its
// rent comes in each month, repairs are booked, and the landlord is paid what
// is left after the agency's fees. The questions an agent asks are its saved
// queries; its reports and print templates print them.

import { address, BUSINESS_ABOUT, BUSINESS_TABLE, businessRecord, money, person, phoneFor, PLACES } from './util.js';

const ref = (table) => ({ type: 'integer', points: table });
const LETTERHEAD = { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'E-mail', 'Website'] };
const NAME = (t) => `[${t}].[First Name] & " " & [${t}].[Last Name]`;
// The order a sale moves through, for sorting.
const STAGE_RANK = 'IIf([Stage] = "Offer accepted", 1, IIf([Stage] = "Solicitors instructed", 2, IIf([Stage] = "Searches and survey", 3, IIf([Stage] = "Mortgage offered", 4, IIf([Stage] = "Exchanged", 5, 6)))))';
const FEES = 'Round(Nz([Received]) * [Management Fee], 2) + Round(Round(Nz([Received]) * [Management Fee], 2) * 0.2, 2)';

// The print templates use where, if, format and lines.on.
export const minOffice = '2.16.0';

export const spec = {
  negative: {},
  tables: [
    BUSINESS_TABLE,
    { name: 'Staff', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Role', type: 'text' },
      { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Started', type: 'date' },
    ] },
    { name: 'Areas', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'District', type: 'text' },
      { name: 'Typical Price', type: 'currency' }, { name: 'Typical Rent', type: 'currency' }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Clients', fields: [
      { name: 'Account', type: 'text', unique: true }, { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true },
      { name: 'Kind', type: 'text', default: 'Seller' }, { name: 'Address', type: 'text' }, { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' },
      { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Client Since', type: 'date' }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Properties', fields: [
      { name: 'Reference', type: 'text', unique: true }, { name: 'Client', ...ref('Clients'), required: true }, { name: 'Area', ...ref('Areas') },
      { name: 'Address', type: 'text', required: true }, { name: 'City', type: 'text', default: 'Bristol' }, { name: 'Postcode', type: 'text' },
      { name: 'Purpose', type: 'text', default: 'Sale' }, { name: 'Kind', type: 'text' }, { name: 'Bedrooms', type: 'integer' }, { name: 'Bathrooms', type: 'integer', default: 1 },
      { name: 'Price', type: 'currency' }, { name: 'Listed On', type: 'date' }, { name: 'Status', type: 'text', default: 'For sale' },
      { name: 'Energy Rating', type: 'text' }, { name: 'Fee Rate', type: 'number' }, { name: 'Description', type: 'longtext' }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Applicants', show: ['First Name', 'Last Name', 'Phone'], fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Looking To', type: 'text', default: 'Buy' },
      { name: 'Area', ...ref('Areas') }, { name: 'Min Bedrooms', type: 'integer', default: 1 }, { name: 'Budget', type: 'currency' },
      { name: 'Position', type: 'text' }, { name: 'Address', type: 'text' }, { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' },
      { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Registered On', type: 'date' },
      { name: 'Status', type: 'text', default: 'Active' }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Viewings', fields: [
      { name: 'Property', ...ref('Properties'), required: true }, { name: 'Applicant', ...ref('Applicants'), required: true },
      { name: 'Accompanied By', ...ref('Staff') }, { name: 'Booked On', type: 'date' }, { name: 'Viewing Date', type: 'date' }, { name: 'Viewing Time', type: 'text' },
      { name: 'Status', type: 'text', default: 'Booked' }, { name: 'Confirmation Sent', type: 'date' }, { name: 'Feedback', type: 'longtext' },
    ] },
    { name: 'Offers', show: ['Made On', 'Property', 'Applicant'], fields: [
      { name: 'Property', ...ref('Properties'), required: true }, { name: 'Applicant', ...ref('Applicants'), required: true }, { name: 'Made On', type: 'date' },
      { name: 'Amount', type: 'currency' }, { name: 'Conditions', type: 'text' }, { name: 'Status', type: 'text', default: 'Awaiting decision' },
      { name: 'Decided On', type: 'date' }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Solicitors', fields: [
      { name: 'Name', type: 'text', required: true }, { name: 'Contact', type: 'text' }, { name: 'Address', type: 'text' }, { name: 'City', type: 'text' },
      { name: 'Postcode', type: 'text' }, { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' },
    ] },
    // Property, then Offer, then Buyer: a query that has Sales and Applicants joins the buyer through the sale.
    { name: 'Sales', show: ['Number'], fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Property', ...ref('Properties'), required: true }, { name: 'Offer', ...ref('Offers') },
      { name: 'Buyer', ...ref('Applicants'), required: true }, { name: 'Negotiator', ...ref('Staff') },
      { name: 'Buyer Solicitor', ...ref('Solicitors') }, { name: 'Seller Solicitor', ...ref('Solicitors') },
      { name: 'Price', type: 'currency' }, { name: 'Accepted On', type: 'date' }, { name: 'Memorandum Sent', type: 'date' }, { name: 'Stage', type: 'text', default: 'Offer accepted' },
      { name: 'Solicitors Instructed', type: 'date' }, { name: 'Searches Back', type: 'date' }, { name: 'Mortgage Offered', type: 'date' },
      { name: 'Exchanged On', type: 'date' }, { name: 'Completed On', type: 'date' }, { name: 'Target Completion', type: 'date' },
      { name: 'Included', type: 'text' }, { name: 'Fee Rate', type: 'number' }, { name: 'Fee', type: 'currency' }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Tenancies', show: ['Reference'], fields: [
      { name: 'Reference', type: 'text', unique: true }, { name: 'Property', ...ref('Properties'), required: true }, { name: 'Tenant', ...ref('Applicants'), required: true },
      { name: 'Signed On', type: 'date' }, { name: 'Start', type: 'date' }, { name: 'End', type: 'date' }, { name: 'Monthly Rent', type: 'currency' },
      { name: 'Rent Day', type: 'integer', default: 1 }, { name: 'Deposit', type: 'currency' }, { name: 'Deposit Ref', type: 'text' },
      { name: 'Service', type: 'text', default: 'Fully managed' }, { name: 'Management Fee', type: 'number', default: 0 }, { name: 'Letting Fee', type: 'currency' },
      { name: 'Rent Paid To', type: 'text' }, { name: 'Repairs To', type: 'text' }, { name: 'Pets', type: 'text', default: 'None' },
      { name: 'Renewal', type: 'yesno' }, { name: 'Status', type: 'text', default: 'Active' }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Landlord Statements', show: ['Number'], fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Client', ...ref('Clients'), required: true }, { name: 'Period', type: 'text' },
      { name: 'Statement Date', type: 'date' }, { name: 'Rent Collected', type: 'currency' }, { name: 'Deductions', type: 'currency' },
      { name: 'Paid Out', type: 'currency' }, { name: 'Paid On', type: 'date' },
    ] },
    { name: 'Statement Lines', fields: [
      { name: 'Statement', ...ref('Landlord Statements'), required: true }, { name: 'Date', type: 'date' }, { name: 'Property', ...ref('Properties') },
      { name: 'Kind', type: 'text' }, { name: 'Description', type: 'text' }, { name: 'Money In', type: 'currency', default: 0 }, { name: 'Money Out', type: 'currency', default: 0 },
    ] },
    { name: 'Rent Charges', fields: [
      { name: 'Tenancy', ...ref('Tenancies'), required: true }, { name: 'Period', type: 'text' }, { name: 'Due Date', type: 'date' },
      { name: 'Amount', type: 'currency' }, { name: 'Received', type: 'currency', default: 0 }, { name: 'Received On', type: 'date' },
      { name: 'Statement', ...ref('Landlord Statements') },
    ] },
    { name: 'Contractors', fields: [
      { name: 'Name', type: 'text', required: true }, { name: 'Trade', type: 'text' }, { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' },
    ] },
    { name: 'Repairs', fields: [
      { name: 'Property', ...ref('Properties'), required: true }, { name: 'Tenancy', ...ref('Tenancies') }, { name: 'Reported', type: 'date' },
      { name: 'Problem', type: 'text', required: true }, { name: 'Priority', type: 'text', default: 'Normal' }, { name: 'Contractor', ...ref('Contractors') },
      { name: 'Quote', type: 'currency' }, { name: 'Approved On', type: 'date' }, { name: 'Status', type: 'text', default: 'Reported' },
      { name: 'Booked For', type: 'date' }, { name: 'Done On', type: 'date' }, { name: 'Cost', type: 'currency' },
      { name: 'Statement', ...ref('Landlord Statements') }, { name: 'Notes', type: 'longtext' },
    ] },
    // Client first: a query with Agency Invoices and Clients joins the client billed.
    { name: 'Agency Invoices', show: ['Number'], fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Client', ...ref('Clients'), required: true }, { name: 'Sale', ...ref('Sales') },
      { name: 'Tenancy', ...ref('Tenancies') }, { name: 'Statement', ...ref('Landlord Statements') }, { name: 'Invoice Date', type: 'date' },
      { name: 'Due Date', type: 'date' }, { name: 'Net', type: 'currency' }, { name: 'Tax', type: 'currency' }, { name: 'Amount', type: 'currency' },
      { name: 'Paid On', type: 'date' }, { name: 'Paid How', type: 'text' },
    ] },
    { name: 'Invoice Lines', fields: [
      { name: 'Invoice', ...ref('Agency Invoices'), required: true }, { name: 'Kind', type: 'text' }, { name: 'Description', type: 'text' },
      { name: 'Property', ...ref('Properties') }, { name: 'Net', type: 'currency' }, { name: 'Tax Rate', type: 'number', default: 0.2 },
    ] },
  ],
  queries: {
    'Viewings in the next 7 days': { tables: ['Viewings', 'Properties', 'Applicants', 'Staff'], columns: [
      { table: 'Viewings', field: 'Viewing Date', sort: 'asc' }, { table: 'Viewings', field: 'Viewing Time', sort: 'asc' },
      { table: 'Properties', field: 'Reference' }, { table: 'Properties', field: 'Address', as: 'Property' }, { table: 'Properties', field: 'Purpose' },
      { expr: NAME('Applicants'), as: 'Applicant' }, { table: 'Applicants', field: 'Phone' }, { expr: NAME('Staff'), as: 'Accompanied By' },
      { table: 'Viewings', field: 'Confirmation Sent' },
      { expr: 'DateDiff("d", Date(), [Viewing Date])', as: 'Days Until', criteria: ['Between 0 And 7'], show: false },
      { table: 'Viewings', field: 'Status', criteria: ['Booked'], show: false },
    ] },
    'Offers awaiting a decision': { tables: ['Offers', 'Properties', 'Applicants', 'Clients'], columns: [
      { table: 'Offers', field: 'Made On', sort: 'asc' }, { table: 'Properties', field: 'Address', as: 'Property' }, { table: 'Properties', field: 'Price', as: 'Asking Price' },
      { table: 'Offers', field: 'Amount', as: 'Offer' }, { expr: 'Round([Amount] * 100 / [Properties].[Price], 1)', as: '% of Asking' },
      { expr: NAME('Applicants'), as: 'Buyer' }, { table: 'Applicants', field: 'Position' }, { table: 'Offers', field: 'Conditions' },
      { expr: NAME('Clients'), as: 'Seller' }, { table: 'Clients', field: 'Phone', as: 'Seller Phone' },
      { expr: 'DateDiff("d", [Made On], Date())', as: 'Days Waiting' }, { table: 'Offers', field: 'Status', criteria: ['Awaiting decision'], show: false },
    ] },
    'Sales in progress': { tables: ['Sales', 'Properties', 'Applicants', 'Clients', 'Staff'], columns: [
      { expr: STAGE_RANK, as: 'Rank', sort: 'asc', show: false }, { table: 'Sales', field: 'Stage' }, { table: 'Sales', field: 'Number', as: 'Sale' },
      { table: 'Properties', field: 'Address', as: 'Property' }, { table: 'Sales', field: 'Price' }, { table: 'Sales', field: 'Accepted On', sort: 'asc' },
      { expr: 'DateDiff("d", [Accepted On], Date())', as: 'Days Since Offer' }, { table: 'Sales', field: 'Target Completion' },
      { expr: NAME('Applicants'), as: 'Buyer' }, { expr: NAME('Clients'), as: 'Seller' }, { expr: NAME('Staff'), as: 'Negotiator' },
      { expr: 'Round([Sales].[Price] * [Sales].[Fee Rate], 2)', as: 'Fee Due' },
      { table: 'Sales', field: 'Stage', as: 'Where', criteria: ['Not In ("Completed", "Fell through")'], show: false },
    ] },
    'Sales by stage': { tables: ['Sales', 'Properties'], columns: [
      { expr: STAGE_RANK, as: 'Rank', total: 'group', sort: 'asc', show: false }, { table: 'Sales', field: 'Stage', total: 'group' },
      { table: 'Sales', field: 'ID', as: 'Sales', total: 'count' }, { table: 'Sales', field: 'Price', as: 'Value', total: 'sum' },
      { expr: 'Round([Sales].[Price] * [Sales].[Fee Rate], 2)', as: 'Fees to Come', total: 'sum' },
      { table: 'Sales', field: 'Stage', as: 'Where', total: 'where', criteria: ['Not In ("Completed", "Fell through")'] },
    ] },
    'On the market over 60 days': { tables: ['Properties', 'Areas', 'Clients'], columns: [
      { table: 'Properties', field: 'Reference' }, { table: 'Properties', field: 'Address' }, { table: 'Areas', field: 'Name', as: 'Area' },
      { table: 'Properties', field: 'Purpose' }, { table: 'Properties', field: 'Price' }, { table: 'Properties', field: 'Listed On', sort: 'asc' },
      { expr: 'DateDiff("d", [Listed On], Date())', as: 'Days on Market', criteria: ['> 60'] }, { expr: NAME('Clients'), as: 'Client' },
      { table: 'Clients', field: 'Phone' }, { table: 'Properties', field: 'Status', criteria: ['In ("For sale", "To let")'], show: false },
    ] },
    'Rent collected and owed to landlords': { tables: ['Rent Charges', 'Tenancies', 'Properties', 'Clients'], columns: [
      { expr: NAME('Clients'), as: 'Landlord', total: 'group', sort: 'asc' }, { table: 'Clients', field: 'Account', total: 'group' },
      { table: 'Rent Charges', field: 'ID', as: 'Rents Due', total: 'count' }, { table: 'Rent Charges', field: 'Amount', as: 'Rent Due', total: 'sum' },
      { expr: 'Nz([Received])', as: 'Collected', total: 'sum' }, { expr: 'Round([Amount] - Nz([Received]), 2)', as: 'Outstanding', total: 'sum' },
      { expr: FEES, as: 'Fees and VAT', total: 'sum' }, { expr: `Round(Nz([Received]) - (${FEES}), 2)`, as: 'Owed to Landlord', total: 'sum' },
      { expr: 'DateDiff("d", [Due Date], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 30'] },
    ] },
    'Commission earned by month': { tables: ['Invoice Lines', 'Agency Invoices'], columns: [
      { expr: 'Format([Invoice Date], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' },
      { expr: 'IIf([Kind] = "Sale commission", [Invoice Lines].[Net], 0)', as: 'Sales', total: 'sum' },
      { expr: 'IIf([Kind] = "Letting fee", [Invoice Lines].[Net], 0)', as: 'Letting Fees', total: 'sum' },
      { expr: 'IIf([Kind] = "Management fee", [Invoice Lines].[Net], 0)', as: 'Management Fees', total: 'sum' },
      { table: 'Invoice Lines', field: 'Net', as: 'Total', total: 'sum' },
    ] },
    'Applicants matching a property': { tables: ['Properties', 'Areas', 'Applicants'], columns: [
      { table: 'Properties', field: 'Reference', sort: 'asc' }, { table: 'Properties', field: 'Address', as: 'Property' }, { table: 'Areas', field: 'Name', as: 'Area' },
      { table: 'Properties', field: 'Purpose' }, { table: 'Properties', field: 'Bedrooms' }, { table: 'Properties', field: 'Price' },
      { expr: NAME('Applicants'), as: 'Applicant' }, { table: 'Applicants', field: 'Phone' }, { table: 'Applicants', field: 'Budget', sort: 'desc' },
      { table: 'Applicants', field: 'Min Bedrooms' }, { table: 'Applicants', field: 'Position' },
      { table: 'Properties', field: 'Status', criteria: ['In ("For sale", "To let")'], show: false },
      { table: 'Applicants', field: 'Status', as: 'Applicant Status', criteria: ['Active'], show: false },
      { expr: 'IIf([Purpose] = "Sale", "Buy", "Rent") = [Looking To]', as: 'Same Purpose', criteria: ['Yes'], show: false },
      { expr: '[Budget] >= [Price]', as: 'Within Budget', criteria: ['Yes'], show: false },
      { expr: '[Bedrooms] >= [Min Bedrooms]', as: 'Enough Bedrooms', criteria: ['Yes'], show: false },
    ] },
    'Rent arrears': { tables: ['Rent Charges', 'Tenancies', 'Properties', 'Applicants', 'Clients'], columns: [
      { expr: NAME('Applicants'), as: 'Tenant', sort: 'asc' }, { table: 'Properties', field: 'Address', as: 'Property' }, { expr: NAME('Clients'), as: 'Landlord' },
      { table: 'Rent Charges', field: 'Period' }, { table: 'Rent Charges', field: 'Due Date', sort: 'asc' }, { table: 'Rent Charges', field: 'Amount' },
      { table: 'Rent Charges', field: 'Received' }, { expr: 'Round([Amount] - Nz([Received]), 2)', as: 'Owed', criteria: ['> 0'] },
      { expr: 'DateDiff("d", [Due Date], Date())', as: 'Days Late', criteria: ['> 3'] },
    ] },
    'Tenancies ending in the next 60 days': { tables: ['Tenancies', 'Properties', 'Applicants', 'Clients'], columns: [
      { table: 'Tenancies', field: 'End', sort: 'asc' }, { expr: 'DateDiff("d", Date(), [End])', as: 'Days Left', criteria: ['Between 0 And 60'] },
      { table: 'Properties', field: 'Address', as: 'Property' }, { expr: NAME('Applicants'), as: 'Tenant' }, { expr: NAME('Clients'), as: 'Landlord' },
      { table: 'Tenancies', field: 'Monthly Rent' }, { table: 'Tenancies', field: 'Service' },
      { table: 'Tenancies', field: 'Status', criteria: ['Active'], show: false },
    ] },
    // Without Contractors: a repair not yet booked has none, and would drop out.
    'Open repairs': { tables: ['Repairs', 'Properties'], columns: [
      { table: 'Repairs', field: 'Reported', sort: 'asc' }, { table: 'Properties', field: 'Address', as: 'Property' }, { table: 'Repairs', field: 'Problem' },
      { table: 'Repairs', field: 'Priority' }, { table: 'Repairs', field: 'Status' },
      { table: 'Repairs', field: 'Quote' }, { table: 'Repairs', field: 'Booked For' }, { expr: 'DateDiff("d", [Reported], Date())', as: 'Days Open' },
      { table: 'Repairs', field: 'Status', as: 'State', criteria: ['Not In ("Done", "Cancelled")'], show: false },
    ] },
    'Paid to landlords by month': { tables: ['Landlord Statements'], columns: [
      { table: 'Landlord Statements', field: 'Period', as: 'Month', total: 'group', sort: 'asc' },
      { table: 'Landlord Statements', field: 'ID', as: 'Statements', total: 'count' },
      { table: 'Landlord Statements', field: 'Rent Collected', as: 'Rent Collected', total: 'sum' },
      { table: 'Landlord Statements', field: 'Deductions', as: 'Deducted', total: 'sum' },
      { table: 'Landlord Statements', field: 'Paid Out', as: 'Paid to Landlords', total: 'sum' },
      { expr: 'DateDiff("d", [Statement Date], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 366'] },
    ] },
    'Asking prices by area': { tables: ['Properties', 'Areas'], columns: [
      { table: 'Areas', field: 'Name', as: 'Area', total: 'group', sort: 'asc' }, { table: 'Properties', field: 'Purpose', total: 'group', sort: 'asc' },
      { table: 'Properties', field: 'ID', as: 'On the Market', total: 'count' }, { table: 'Properties', field: 'Price', as: 'Lowest', total: 'min' },
      { expr: 'Round([Price], 0)', as: 'Average', total: 'avg', decimals: 0 }, { table: 'Properties', field: 'Price', as: 'Highest', total: 'max' },
      { table: 'Properties', field: 'Status', total: 'where', criteria: ['In ("For sale", "To let", "Under offer", "Let agreed")'] },
    ] },
  },
  reports: [
    { name: 'Viewing diary', title: 'Viewings in the next 7 days', query: 'Viewings in the next 7 days', group: 'Viewing Date', columns: ['Viewing Time', 'Property', 'Purpose', 'Applicant', 'Phone', 'Accompanied By'] },
    { name: 'Offers to decide', title: 'Offers awaiting a decision', query: 'Offers awaiting a decision', columns: [{ field: 'Made On', type: 'date' }, 'Property', { field: 'Asking Price', type: 'currency' }, { field: 'Offer', type: 'currency' }, { field: '% of Asking', type: 'number' }, 'Buyer', 'Position', 'Seller'] },
    { name: 'Sales progress', title: 'Sales in progress', query: 'Sales in progress', group: 'Stage', columns: ['Sale', 'Property', { field: 'Price', type: 'currency' }, { field: 'Accepted On', type: 'date' }, { field: 'Days Since Offer', type: 'integer' }, { field: 'Target Completion', type: 'date' }, 'Buyer', 'Negotiator', { field: 'Fee Due', type: 'currency' }], totals: [{ field: 'Price', fn: 'sum' }, { field: 'Fee Due', fn: 'sum' }] },
    { name: 'Slow to sell or let', title: 'On the market over 60 days', query: 'On the market over 60 days', columns: ['Reference', 'Address', 'Area', 'Purpose', { field: 'Price', type: 'currency' }, { field: 'Listed On', type: 'date' }, { field: 'Days on Market', type: 'integer' }, 'Client', 'Phone'] },
    { name: 'Rent for landlords', title: 'Rent collected and owed to landlords, last 30 days', query: 'Rent collected and owed to landlords', columns: ['Landlord', 'Account', { field: 'Rent Due', type: 'currency' }, { field: 'Collected', type: 'currency' }, { field: 'Outstanding', type: 'currency' }, { field: 'Fees and VAT', type: 'currency' }, { field: 'Owed to Landlord', type: 'currency' }], totals: [{ field: 'Rent Due', fn: 'sum' }, { field: 'Collected', fn: 'sum' }, { field: 'Outstanding', fn: 'sum' }, { field: 'Fees and VAT', fn: 'sum' }, { field: 'Owed to Landlord', fn: 'sum' }] },
    { name: 'Commission by month', query: 'Commission earned by month', columns: ['Month', { field: 'Sales', type: 'currency' }, { field: 'Letting Fees', type: 'currency' }, { field: 'Management Fees', type: 'currency' }, { field: 'Total', type: 'currency' }], totals: [{ field: 'Sales', fn: 'sum' }, { field: 'Letting Fees', fn: 'sum' }, { field: 'Management Fees', fn: 'sum' }, { field: 'Total', fn: 'sum' }] },
    { name: 'Rent arrears', query: 'Rent arrears', group: 'Tenant', columns: ['Property', 'Landlord', 'Period', { field: 'Due Date', type: 'date' }, { field: 'Days Late', type: 'integer' }, { field: 'Amount', type: 'currency' }, { field: 'Received', type: 'currency' }, { field: 'Owed', type: 'currency' }], totals: [{ field: 'Owed', fn: 'sum' }] },
  ],
  // The print templates: each prints for the records it is for (its `where`),
  // and leaves out what does not apply to one record (an `if` on a block, a
  // field or a total). A record printed from its form always prints.
  documents: [
    // This month's statements, and in the first week of a month last month's too (they go out on the third working day).
    { name: 'Landlord statement', table: 'Landlord Statements', paper: 'a4', letterhead: LETTERHEAD, where: 'DateDiff("m", [Statement Date], Date()) = 0 Or (Day(Date()) <= 7 And DateDiff("m", [Statement Date], Date()) = 1)', blocks: [
      { type: 'heading', text: 'Landlord statement {Number}' },
      { type: 'totals', rows: [{ label: 'For the month', expr: '[Period] & "-01"', format: 'mmmm yyyy' }] },
      { type: 'fields', columns: 2, items: [
        { field: 'Client', label: 'Landlord' }, { field: 'Number', label: 'Statement' },
        { field: 'Client.Address', label: 'Address' }, { field: 'Statement Date', label: 'Date', format: 'dd/mm/yyyy' },
        { field: 'Client.City', label: 'City' }, { field: 'Client.Account', label: 'Your account' },
        { field: 'Client.Postcode', label: 'Postcode' },
      ] },
      // Each sum on its own side: what came in, and what was taken off.
      { type: 'lines', table: 'Statement Lines', link: 'Statement', sort: 'Date', columns: [
        { field: 'Date', format: 'dd/mm/yyyy' }, { field: 'Property.Address', label: 'Property', type: 'text' }, { field: 'Description' },
        { expr: 'IIf(Nz([Money In]) <> 0, [Money In], Null)', as: 'Received', type: 'currency' },
        { expr: 'IIf(Nz([Money Out]) <> 0, [Money Out], Null)', as: 'Deducted', type: 'currency' },
      ] },
      { type: 'totals', rows: [
        { label: 'Rent collected', expr: '[Received]' }, { label: 'Fees, VAT and repairs', expr: '[Deducted]' },
        { label: 'Paid to you', expr: 'Round([Received] - [Deducted], 2)', strong: true },
      ] },
      { type: 'text', text: 'We paid {Paid Out} into your account by bank transfer on {Paid On}.', if: 'Nz([Paid Out]) > 0' },
      { type: 'text', text: 'Nothing was paid to you this month: the repairs came to more than the rent left after our fees, and what was left of them is carried to next month\'s statement. A statement never asks you for money.', if: 'Nz([Paid Out]) <= 0' },
      { type: 'text', text: 'Our fees are shown with VAT; our VAT invoices for them come with this statement. Repairs are charged at what the contractor billed, with nothing added.', small: true },
      { type: 'text', text: 'Rent we collect for you is held in our client account, kept apart from our own money, until it is paid to you. Questions about this statement: call {Business.Phone} or write to {Business.E-mail}.', small: true },
      { type: 'text', text: '{Business.Document Footer}', small: true },
    ] },
    // Tenancies running now or about to start.
    { name: 'Tenancy agreement', table: 'Tenancies', paper: 'a4', letterhead: LETTERHEAD, where: '[Status] <> "Ended"', blocks: [
      { type: 'heading', text: 'Tenancy agreement {Reference}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Property.Client', label: 'Landlord' }, { field: 'Signed On', label: 'Date of this agreement', format: 'd mmmm yyyy' },
        { field: 'Tenant', label: 'Tenant' }, { field: 'Start', label: 'Tenancy begins', format: 'd mmmm yyyy' },
        { field: 'Property.Address', label: 'The property' }, { field: 'End', label: 'Fixed term ends', format: 'd mmmm yyyy' },
        { field: 'Property.City', label: 'City' }, { field: 'Rent Day', label: 'Rent day each month' },
        { field: 'Property.Postcode', label: 'Postcode' }, { field: 'Property.Bedrooms', label: 'Bedrooms' },
        { field: 'Service', label: 'Our service to the landlord' }, { field: 'Deposit Ref', label: 'Deposit protection reference', if: '[Deposit Ref]' },
      ] },
      { type: 'totals', rows: [{ label: 'Rent each month', expr: '[Monthly Rent]' }, { label: 'Deposit', expr: '[Deposit]' }] },
      { type: 'text', text: 'This agreement is made on {Signed On} between {Property.Client} of {Property.Client.Address}, {Property.Client.City} {Property.Client.Postcode} ("the Landlord") and {Tenant} ("the Tenant"). {Business.Name} of {Business.Address}, {Business.City} {Business.Postcode} ("the Agent") signs it for the Landlord and acts for the Landlord, not for the Tenant. The Landlord lets the property named above ("the Property") to the Tenant as a home, on the terms below.' },
      { type: 'text', text: 'It renews the Tenant\'s earlier tenancy of the Property, which ends the day before this one begins.', if: '[Renewal]' },
      { type: 'text', text: '1. The property. The Property is let together with the use of any shared entrance, paths, garden and bin store that serve it, and with the contents listed in the inventory. It is to be lived in by the Tenant and the members of the Tenant\'s household named on the application.' },
      { type: 'text', text: '2. The term. The tenancy begins on {Start} and its fixed term ends on {End}. If neither side has ended it by then, it carries on from month to month on the same terms until it is ended as clause 11 says.' },
      { type: 'text', text: '3. The rent. The rent is {Monthly Rent} a month, paid in advance on day {Rent Day} of each month, the first payment before the tenancy begins. It is paid to {Rent Paid To}, by standing order, quoting the reference {Reference}. The rent does not go up during the fixed term; after it, it may be raised no more than once a year, by at least two months\' notice in writing.' },
      { type: 'text', text: '4. Bills. The Tenant pays council tax, gas, electricity, water and sewerage, telephone and broadband for the Property from the start of the tenancy, and tells the suppliers of the meter readings on the day of moving in.' },
      { type: 'text', text: '5. The deposit. The Tenant pays a deposit of {Deposit} before the tenancy begins. Within 30 days of receiving it, the Agent protects it for the Landlord in a government-approved tenancy deposit scheme and gives the Tenant the scheme\'s details; its reference is shown above once given. At the end, the deposit is returned within ten days of both sides agreeing what, if anything, is kept back for unpaid rent, damage beyond fair wear and tear, or cleaning; if they cannot agree, either may ask the scheme to decide.', if: 'Nz([Renewal], 0) = 0' },
      { type: 'text', text: '5. The deposit. The deposit of {Deposit} paid for the earlier tenancy is kept, and carries on as the deposit for this one, protected in the same scheme under the reference shown above. At the end, it is returned within ten days of both sides agreeing what, if anything, is kept back for unpaid rent, damage beyond fair wear and tear, or cleaning; if they cannot agree, either may ask the scheme to decide.', if: '[Renewal]' },
      { type: 'text', text: '6. The Tenant agrees: to pay the rent on time; to keep the Property clean and in good order, and to heat and air it so that damp and mould do not build up; to report any repair needed promptly; to test the smoke alarms once a month; not to make alterations, redecorate or change the locks without consent in writing; not to cause a nuisance to the neighbours; not to sublet or take in a lodger without consent in writing; and to give back all the keys at the end.' },
      { type: 'text', text: '7. The Landlord agrees: to let the Tenant live in the Property in peace; to keep the structure and outside in repair, and the supplies of water, gas and electricity, the heating and the hot water in repair and working order; to have any gas appliances checked every year and the wiring every five years, and give the Tenant copies of the certificates; to fit smoke alarms, and carbon monoxide alarms where needed; and to insure the building.' },
      { type: 'text', text: '8. Repairs and access. The Tenant reports repairs to {Repairs To}. The Landlord or the Agent, or a contractor sent by either, may come in at a reasonable time of day to inspect the Property or carry out repairs after giving at least 24 hours\' notice in writing, and at once in an emergency such as a gas leak, a flood or a fire.' },
      { type: 'text', text: '9. Pets and smoking. No pets are agreed for this tenancy. A pet needs consent in writing first, which will not be refused without good reason. No one may smoke or vape inside the Property.', if: 'Nz([Pets], "None") = "None"' },
      { type: 'text', text: '9. Pets and smoking. Pets agreed for this tenancy: {Pets}. Any other pet needs consent in writing first, which will not be refused without good reason. No one may smoke or vape inside the Property.', if: 'Nz([Pets], "None") <> "None"' },
      { type: 'text', text: '10. The inventory. An inventory and record of condition, with photographs, is made at the start and signed by both sides. At the end, the Property is compared with it, allowing for fair wear and tear.' },
      { type: 'text', text: '11. Ending the tenancy. The Tenant may end the tenancy at the end of the fixed term, or at any time after it, by giving at least one month\'s notice in writing ending the day before a rent day. The Landlord may end it only on the grounds, and with the notice, that the law allows, and always in writing.' },
      { type: 'text', text: '12. Notices. Notices to the Landlord may be sent to the Agent at {Business.Address}, {Business.City} {Business.Postcode} or {Business.E-mail}, and count as given to the Landlord. Notices to the Tenant go to the Property, or to {Tenant.E-mail}.' },
      { type: 'spacer', size: 24 },
      { type: 'signatures', labels: ['Signed by the Agent for the Landlord', 'Date', 'Signed by the Tenant', 'Date'] },
    ] },
    // Viewings booked for today or later.
    { name: 'Viewing confirmation', table: 'Viewings', paper: 'a4', letterhead: LETTERHEAD, where: '[Status] = "Booked" And DateDiff("d", Date(), [Viewing Date]) >= 0', blocks: [
      { type: 'totals', rows: [{ label: 'Date', expr: 'Nz([Confirmation Sent], [Booked On])', format: 'd mmmm yyyy' }] },
      { type: 'fields', columns: 2, items: [
        { field: 'Applicant', label: 'To' }, { field: 'Property.Reference', label: 'Property reference' },
        { field: 'Applicant.Address', label: 'Address' }, { field: 'Applicant.City', label: 'City' },
        { field: 'Applicant.Postcode', label: 'Postcode' },
      ] },
      { type: 'heading', text: 'Your viewing of {Property.Address}' },
      { type: 'text', text: 'Dear {Applicant},' },
      { type: 'text', text: 'Thank you for booking a viewing with us. This is to confirm the details.' },
      { type: 'fields', columns: 2, items: [
        { field: 'Viewing Date', label: 'Day', format: 'dddd d mmmm yyyy' }, { field: 'Viewing Time', label: 'Time' },
        { field: 'Accompanied By', label: 'You will be met by', if: '[Accompanied By]' }, { field: 'Accompanied By.Phone', label: 'Their phone', if: '[Accompanied By]' },
      ] },
      // The home: its price for a sale, its rent for a let.
      { type: 'lines', table: 'Properties', on: { ID: 'Property' }, columns: [
        { field: 'Address', label: 'The home' }, { field: 'Area', type: 'text' }, { field: 'Kind', label: 'Kind of home' }, { field: 'Bedrooms', type: 'integer' },
        { expr: 'IIf([Purpose] = "Let", Format([Price], "#,##0") & " a month", Format([Price], "#,##0"))', as: 'Asking', label: 'Asking price or rent', type: 'text' },
      ] },
      { type: 'text', text: '{Accompanied By} will meet you outside the property a minute or two before the time above. The viewing takes about twenty minutes, and you are welcome to bring someone with you. If you are running late, or need to change the day, please call {Accompanied By.Phone} or the office on {Business.Phone}.', if: '[Accompanied By]' },
      { type: 'text', text: 'If you would like to make an offer, or apply to rent, after the viewing, tell us at the viewing or call the office. For a purchase we will ask how you are buying (a mortgage agreed in principle, the sale of your home, or cash) so that we can put your offer to the owner fully.' },
      { type: 'text', text: 'Yours sincerely,' },
      { type: 'spacer', size: 16 },
      { type: 'text', text: '{Business.Name}' },
      { type: 'text', text: '{Business.Document Footer}', small: true },
    ] },
    // Sales going through: accepted, and not yet completed or fallen through.
    { name: 'Memorandum of sale', table: 'Sales', paper: 'a4', letterhead: LETTERHEAD, where: '[Stage] <> "Completed" And [Stage] <> "Fell through"', blocks: [
      { type: 'heading', text: 'Memorandum of sale {Number}' },
      { type: 'totals', rows: [{ label: 'Date of this memorandum', expr: 'Nz([Memorandum Sent], Date())', format: 'd mmmm yyyy' }] },
      { type: 'text', text: 'To the seller, the buyer and their solicitors. An offer for the property below has been accepted, subject to contract. The details agreed are set out here so that the solicitors can begin their work. Nothing here is binding on either side until contracts are exchanged.' },
      { type: 'fields', columns: 2, items: [
        { field: 'Property.Address', label: 'Property' }, { field: 'Accepted On', label: 'Offer accepted on', format: 'd mmmm yyyy' },
        { field: 'Property.City', label: 'City' }, { field: 'Target Completion', label: 'Completion hoped for by', format: 'd mmmm yyyy', if: '[Target Completion]' },
        { field: 'Property.Postcode', label: 'Postcode' }, { field: 'Property.Kind', label: 'Kind of home' },
        { field: 'Negotiator', label: 'Our negotiator', if: '[Negotiator]' },
      ] },
      { type: 'totals', rows: [{ label: 'Agreed price', expr: '[Price]', strong: true }] },
      { type: 'fields', columns: 2, items: [
        { field: 'Property.Client', label: 'Seller' }, { field: 'Buyer', label: 'Buyer' },
        { field: 'Property.Client.Address', label: 'Seller\'s address' }, { field: 'Buyer.Address', label: 'Buyer\'s address' },
        { field: 'Property.Client.City', label: 'City' }, { field: 'Buyer.City', label: 'City' },
        { field: 'Property.Client.Phone', label: 'Seller\'s phone' }, { field: 'Buyer.Phone', label: 'Buyer\'s phone' },
      ] },
      { type: 'fields', columns: 2, if: '[Seller Solicitor] Or [Buyer Solicitor]', items: [
        { field: 'Seller Solicitor.Name', label: 'Seller\'s solicitor' }, { field: 'Buyer Solicitor.Name', label: 'Buyer\'s solicitor' },
        { field: 'Seller Solicitor.Contact', label: 'Dealing' }, { field: 'Buyer Solicitor.Contact', label: 'Dealing' },
        { field: 'Seller Solicitor.Phone', label: 'Phone' }, { field: 'Buyer Solicitor.Phone', label: 'Phone' },
        { field: 'Seller Solicitor.E-mail', label: 'E-mail' }, { field: 'Buyer Solicitor.E-mail', label: 'E-mail' },
      ] },
      { type: 'fields', columns: 1, items: [
        { field: 'Buyer.Position', label: 'How the buyer is buying' }, { field: 'Offer.Conditions', label: 'The offer was made' },
        { field: 'Included', label: 'Included in the price', if: '[Included]' },
      ] },
      { type: 'text', text: 'The seller has agreed to take the property off the market while the sale goes ahead, and we will not show it to anyone else. Our sales progressor will keep in touch with both solicitors each week and tell you both of any news. Please tell us at once of anything that may delay the sale, such as a change in the buyer\'s mortgage or the seller\'s onward move.' },
      { type: 'text', text: 'Our fee is due from the seller on completion, as agreed when the property came to us. Questions: call {Business.Phone} or write to {Business.E-mail}, quoting {Number}.', small: true },
    ] },
    // The invoices of the last 31 days.
    { name: 'Commission invoice', table: 'Agency Invoices', paper: 'a4', letterhead: { ...LETTERHEAD, fields: [...LETTERHEAD.fields, 'Tax Number'] }, where: 'DateDiff("d", [Invoice Date], Date()) >= 0 And DateDiff("d", [Invoice Date], Date()) <= 31', blocks: [
      { type: 'heading', text: 'Invoice {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Client', label: 'Invoice to' }, { field: 'Number', label: 'Invoice number' },
        { field: 'Client.Address', label: 'Address' }, { field: 'Invoice Date', label: 'Date', format: 'dd/mm/yyyy' },
        { field: 'Client.City', label: 'City' }, { field: 'Due Date', label: 'Payment due', format: 'dd/mm/yyyy' },
        { field: 'Client.Postcode', label: 'Postcode' }, { field: 'Client.Account', label: 'Your account' },
      ] },
      { type: 'lines', table: 'Invoice Lines', link: 'Invoice', columns: [
        { field: 'Description' }, { field: 'Property.Address', label: 'Property', type: 'text' }, { field: 'Net', type: 'currency' },
        { expr: 'Nz([Tax Rate]) * 100', as: 'VAT %', format: '0' }, { expr: 'Round([Net] * Nz([Tax Rate]), 2)', as: 'Line VAT', label: 'VAT', type: 'currency' },
      ] },
      { type: 'totals', rows: [
        { label: 'Fees', expr: '[Net]' }, { label: 'VAT', expr: '[Tax]' }, { label: 'Total', expr: '[Amount]', strong: true },
      ] },
      { type: 'fields', columns: 2, if: '[Paid On]', items: [
        { field: 'Paid On', label: 'Paid on', format: 'dd/mm/yyyy' }, { field: 'Paid How', label: 'Paid', if: '[Paid How]' },
      ] },
      { type: 'text', text: 'Paid in full: thank you.', if: '[Paid On]' },
      { type: 'text', text: '{Business.Payment Terms} By bank transfer to {Business.Bank Details}, quoting {Number}.', small: true, if: 'Nz([Paid On], "") = ""' },
      { type: 'text', text: 'Commission on a sale is paid by your solicitor from the sale money on completion.', small: true, if: '[Sale]' },
      { type: 'text', text: 'Fees for a managed let are taken from the rent we collect, and shown on your landlord statement.', small: true, if: '[Statement]' },
      { type: 'text', text: 'VAT registration {Business.Tax Number}. {Business.Document Footer}', small: true },
    ] },
  ],
};

export const about = {
  name: 'Fernleigh Estates',
  kind: 'Estate and letting agent',
  line: 'Sellers and landlords, properties, applicants, viewings, offers, sales to completion, managed lets, rent and landlord statements for an estate agent.',
  summary: [
    'Fernleigh Estates is an invented estate and letting agency in Bristol with seven staff: a director who values homes, two sales negotiators, a sales progressor, a lettings negotiator, a property manager and an administrator. It sells homes for their owners across eight parts of the city, and lets homes for about sixteen landlords, managing most of them: it collects the rent and arranges repairs, and each month pays the landlord what is left after its fees.',
    'The sample holds eighteen months of trading. Homes come on the market at a price the owner chooses, some sensibly and some too high; applicants register to buy or rent with an area, a number of bedrooms and a budget, and view the homes that suit them. Offers come in, most a little under the asking price; the owner accepts or turns each down, and an accepted sale moves through solicitors, searches and survey, the buyer\'s mortgage and exchange of contracts to completion, when the agency invoices its commission. About one sale in ten falls through and the home goes back on the market, and a few homes that will not sell are reduced or taken off.',
    'On the lettings side each home has its run of tenancies: renewals, tenants who leave, and the weeks a home is marketed and viewed before the next tenant moves in. For a managed home the rent comes to the agency, most of it on the day and some late, and on the third working day of each month every landlord gets a statement of the rent collected, the management fee and VAT taken, any letting fee and repairs, and the sum paid to them. The agency\'s own invoices, for commission on sales, letting fees and monthly management fees, all carry VAT at twenty percent.',
  ],
  suits: ['An estate agent that only sells homes', 'A letting agent that only lets and manages', 'A commercial property agent, with units in place of homes', 'A holiday let agency, with bookings in place of tenancies', 'An auction house selling property lots', 'A relocation or property finding service'],
  tables: {
    Business: BUSINESS_ABOUT,
    Staff: { about: 'The agency\'s own people.', fields: {
      'First Name': 'Their first name.', 'Last Name': 'Their family name.', Role: 'What they do, such as Sales negotiator or Property manager.',
      Phone: 'Their work phone, given to applicants they meet at viewings.', 'E-mail': 'Their work e-mail address.', Started: 'The day they joined.',
    } },
    Areas: { about: 'The parts of the city the agency works in. Properties and applicants are each in an area, which is how applicants are matched to homes.', fields: {
      Name: 'The area\'s name. Each is used once.', District: 'The first half of its postcodes.',
      'Typical Price': 'What a two-bedroom house there sells for now, as a guide for valuations.', 'Typical Rent': 'What a two-bedroom home there lets for each month.',
      Notes: 'What buyers and tenants say about it: schools, transport, parking.',
    } },
    Clients: { about: 'The people the agency acts for: owners selling a home and landlords letting one. A landlord has one record however many homes they let.', fields: {
      Account: 'The client\'s account with the agency, printed on statements and invoices: CL-0042. Each is used once.',
      'First Name': 'Their first name.', 'Last Name': 'Their family name.', Kind: 'Seller or Landlord.',
      Address: 'Where letters, statements and invoices go.', City: 'The town or city.', Postcode: 'The postcode.',
      Phone: 'Their phone number.', 'E-mail': 'Their e-mail address.', 'Client Since': 'The day they first instructed the agency.',
      Notes: 'Anything worth knowing: how they like to be kept up to date, keys held, a second owner.',
    } },
    Properties: { about: 'Each home the agency has been asked to sell or let, one record each. A home let again after a tenant leaves keeps its record.', fields: {
      Reference: 'The agency\'s reference for the home, on its particulars and letters: FE-0042. Each is used once.',
      Client: 'Its owner: the seller or the landlord.', Area: 'The part of the city it is in.', Address: 'Its street address, with the flat number.',
      City: 'The city.', Postcode: 'The postcode.', Purpose: 'Sale or Let.', Kind: 'Flat, Maisonette, Terraced house, Semi-detached house or Detached house.',
      Bedrooms: 'How many bedrooms.', Bathrooms: 'How many bathrooms.', Price: 'The asking price for a sale, or the rent asked each month for a let.',
      'Listed On': 'The day it last came on the market. The query for slow sellers counts from here.',
      Status: 'For sale, Under offer, Sold or Withdrawn for a sale; To let, Let agreed or Let for a let, as it stands today.',
      'Energy Rating': 'Its energy rating, A to G, from its energy certificate.',
      'Fee Rate': 'For a sale, the commission agreed as a fraction of the price: 0.012 is 1.2 percent. Empty for a let, whose fees are on the tenancy.',
      Description: 'The words for its particulars and the website.', Notes: 'Keys, access, the owner\'s wishes, price changes.',
    } },
    Applicants: { about: 'Everyone looking to buy or rent through the agency, with what they want. A tenant is an applicant who has rented a home.', fields: {
      'First Name': 'Their first name.', 'Last Name': 'Their family name.', 'Looking To': 'Buy or Rent.', Area: 'The area they most want to live in.',
      'Min Bedrooms': 'The fewest bedrooms they will look at.', Budget: 'The most they can pay: a price for a buyer, a monthly rent for a tenant.',
      Position: 'For a buyer: First-time buyer, Selling a home, Mortgage agreed in principle or Cash buyer. For a tenant: who will live there.',
      Address: 'Where they live now; for a tenant, the home they rent from us.', City: 'The town or city.', Postcode: 'The postcode.',
      Phone: 'Their phone number.', 'E-mail': 'Their e-mail address.', 'Registered On': 'The day they registered.',
      Status: 'Active while looking; Bought, Rented or Withdrawn once they stop.', Notes: 'Anything else they want, or need: parking, a garden, near a school.',
    } },
    Viewings: { about: 'Each viewing booked, kept or not.', fields: {
      Property: 'The home viewed.', Applicant: 'Who viewed it.', 'Accompanied By': 'Who from the agency showed them round.',
      'Booked On': 'The day it was booked, and the date of the confirmation letter.', 'Viewing Date': 'The day of the viewing.', 'Viewing Time': 'The time, as 14:30.',
      Status: 'Booked, Done, Cancelled or No-show.', 'Confirmation Sent': 'The day the Viewing confirmation went to the applicant.',
      Feedback: 'What the applicant thought, passed on to the owner.',
    } },
    Offers: { about: 'Each offer made on a home for sale.', fields: {
      Property: 'The home.', Applicant: 'Who made the offer.', 'Made On': 'The day it was made.', Amount: 'The price offered.',
      Conditions: 'What the offer depends on: a mortgage, a survey, the buyer\'s own sale.',
      Status: 'Awaiting decision, Accepted or Rejected.', 'Decided On': 'The day the owner gave their answer.', Notes: 'Anything said about it.',
    } },
    Solicitors: { about: 'The solicitors and conveyancers buyers and sellers use, for the memorandum of sale.', fields: {
      Name: 'The firm\'s name.', Contact: 'The person who usually deals with the sale.', Address: 'Their address.', City: 'The town or city.',
      Postcode: 'The postcode.', Phone: 'Their phone number.', 'E-mail': 'Where to send the memorandum of sale.',
    } },
    Sales: { about: 'Each accepted offer, from the day it is agreed to completion, or to the day it falls through. The Memorandum of sale is printed from here.', fields: {
      Number: 'The sale\'s reference: SALE-2026-0042, given in the order offers were accepted.', Property: 'The home sold.', Offer: 'The offer accepted.',
      Buyer: 'The buyer.', Negotiator: 'Who agreed the sale.', 'Buyer Solicitor': 'The buyer\'s solicitor.', 'Seller Solicitor': 'The seller\'s solicitor.',
      Price: 'The agreed price.', 'Accepted On': 'The day the offer was accepted.', 'Memorandum Sent': 'The day the Memorandum of sale went out.',
      Stage: 'Offer accepted, Solicitors instructed, Searches and survey, Mortgage offered, Exchanged, Completed or Fell through.',
      'Solicitors Instructed': 'The day both solicitors had the papers.', 'Searches Back': 'The day the searches and the survey were back.',
      'Mortgage Offered': 'The day the buyer\'s lender made its offer; empty for a cash buyer.', 'Exchanged On': 'The day contracts were exchanged, when the sale became binding.',
      'Completed On': 'The day the money moved and the keys were handed over.', 'Target Completion': 'When both sides hope to complete.',
      Included: 'What is included in the price: carpets, curtains, appliances.', 'Fee Rate': 'The commission rate agreed with the seller, from the property.',
      Fee: 'The commission before VAT, worked out on completion.', Notes: 'Why a sale fell through, or anything holding it up.',
    } },
    Tenancies: { about: 'Each tenancy of a let home. A renewal is a new tenancy for the same tenant and home. The Tenancy agreement is printed from here.', fields: {
      Reference: 'The tenancy\'s reference, quoted on rent payments: TY-2026-0042.', Property: 'The home let.', Tenant: 'The tenant.',
      'Signed On': 'The day it was signed.', Start: 'The first day.', End: 'The last day of the fixed term.', 'Monthly Rent': 'The rent each month.',
      'Rent Day': 'The day of the month rent is due.', Deposit: 'The deposit taken: five weeks\' rent.',
      'Deposit Ref': 'The protection scheme\'s reference for the deposit (invented here); empty until it is protected.',
      Service: 'What the landlord asked of the agency: Fully managed (rent, repairs and everything else), Rent collection, or Let only (finding the tenant).',
      'Management Fee': 'The monthly fee as a fraction of the rent collected, before VAT: 0.12 is twelve percent. Nought for let only.',
      'Letting Fee': 'The fee for finding the tenant, before VAT, invoiced when the tenancy starts; nought for a renewal.',
      'Rent Paid To': 'Who the tenant pays, in the words the agreement prints.', 'Repairs To': 'Who the tenant reports repairs to, in the words the agreement prints.',
      Pets: 'The pets agreed, or None.', Renewal: 'Yes when it follows an earlier tenancy of the same tenant.',
      Status: 'Upcoming, Active or Ended, as it stands today.', Notes: 'Anything agreed that is not in the fields.',
    } },
    'Landlord Statements': { about: 'The monthly account sent to each landlord whose rent the agency collects: rent in, fees and repairs out, and the sum paid to them. The Landlord statement is printed from here.', fields: {
      Number: 'The statement\'s number: STM-2026-0042.', Client: 'The landlord.', Period: 'The month it covers, as 2026-09.',
      'Statement Date': 'The day it was made and the landlord paid, the third working day of the next month.',
      'Rent Collected': 'The rent received for the landlord in the month.', Deductions: 'The fees, VAT and repairs taken from it.',
      'Paid Out': 'What was paid to the landlord: the rent collected less the deductions.', 'Paid On': 'The day the payment was made.',
    } },
    'Statement Lines': { about: 'The lines of each landlord statement: each rent received, each fee, the VAT and each repair.', fields: {
      Statement: 'The statement it is on.', Date: 'The day the rent came in or the cost arose.', Property: 'The home it is for.',
      Kind: 'Rent received, Management fee, Letting fee, VAT on fees or Repair.', Description: 'What it is, as the statement prints it.',
      'Money In': 'Rent received; nought for a deduction.', 'Money Out': 'A deduction; nought for rent.',
    } },
    'Rent Charges': { about: 'The rent due each month on a tenancy whose rent the agency collects, and what has been received.', fields: {
      Tenancy: 'The tenancy.', Period: 'The month, as 2026-10.', 'Due Date': 'The day it is due.', Amount: 'The rent due.',
      Received: 'What has come in against it.', 'Received On': 'The day it came in.', Statement: 'The landlord statement it was paid out on; empty until then.',
    } },
    Contractors: { about: 'The trades the agency books for repairs at managed homes.', fields: {
      Name: 'The firm\'s name.', Trade: 'What they do.', Phone: 'Their phone number.', 'E-mail': 'Where job details go.',
    } },
    Repairs: { about: 'Each repair at a managed home, from the tenant\'s call to the contractor\'s bill being taken from the landlord\'s rent.', fields: {
      Property: 'The home.', Tenancy: 'The tenancy running when it was reported.', Reported: 'The day it was reported.', Problem: 'What is wrong.',
      Priority: 'Urgent, High, Normal or Low.', Contractor: 'Who was booked.', Quote: 'What the contractor quoted.',
      'Approved On': 'The day the landlord agreed the quote, for work over the 250 the agency may spend without asking.',
      Status: 'Reported, Awaiting approval, Booked, Done or Cancelled.', 'Booked For': 'The day the contractor is due.',
      'Done On': 'The day the work was finished.', Cost: 'What the contractor billed.',
      Statement: 'The landlord statement the cost was taken on; empty until then.', Notes: 'Access, parts, what was found.',
    } },
    'Agency Invoices': { about: 'The agency\'s own invoices to its clients: commission on a sale, the letting fee for a new tenancy, and each month\'s management fees. The Commission invoice is printed from here.', fields: {
      Number: 'The invoice number, given in date order: INV-2026-0042.', Client: 'Who it is to.', Sale: 'The sale it is for, for commission.',
      Tenancy: 'The tenancy it is for, for a letting fee.', Statement: 'The landlord statement its fees were taken on, for fees paid from rent.',
      'Invoice Date': 'The day it was raised.', 'Due Date': 'When it is due.', Net: 'The fees before VAT.', Tax: 'The VAT on them.',
      Amount: 'The total.', 'Paid On': 'The day it was paid; empty while it is owed.',
      'Paid How': 'From the sale proceeds, Taken from rent collected, or Bank transfer.',
    } },
    'Invoice Lines': { about: 'The lines of each agency invoice.', fields: {
      Invoice: 'The invoice.', Kind: 'Sale commission, Letting fee or Management fee.', Description: 'What the fee is for.',
      Property: 'The home it is for.', Net: 'The fee before VAT.', 'Tax Rate': 'The VAT rate as a fraction: 0.2.',
    } },
  },
  queries: {
    'Viewings in the next 7 days': 'Every viewing booked for the coming week, by day and time, with the applicant\'s phone and who is going.',
    'Offers awaiting a decision': 'Offers the owner has not yet answered, oldest first, with the asking price, the offer as a percentage of it, how the buyer is buying, and the seller\'s phone.',
    'Sales in progress': 'Every agreed sale not yet completed, in the order of its stage, with how long since the offer was accepted, the completion hoped for and the fee to come.',
    'Sales by stage': 'How many sales are at each stage, their value and the fees they will bring.',
    'On the market over 60 days': 'Homes for sale or to let that have been on the market more than 60 days, the longest first, to talk to the owner about the price.',
    'Rent collected and owed to landlords': 'For each landlord, the rent due in the last 30 days, what was collected and what is outstanding, the fees and VAT on it, and what is owed to the landlord before any repairs.',
    'Commission earned by month': 'The agency\'s fees before VAT each month: sales commission, letting fees and management fees.',
    'Applicants matching a property': 'For each home on the market, the active applicants in its area who want to buy or rent (whichever it is for), can afford it and want no more bedrooms than it has. Call them first.',
    'Rent arrears': 'Rent on managed tenancies more than three days late and not fully paid, by tenant, with the landlord.',
    'Tenancies ending in the next 60 days': 'Tenancies whose fixed term ends within two months, to ask the landlord and tenant about renewing.',
    'Open repairs': 'Repairs at managed homes not yet done or cancelled, oldest first, with the quote and the day the contractor is booked for.',
    'Paid to landlords by month': 'Rent collected, deducted and paid to landlords each month over the last year, from the statements.',
    'Asking prices by area': 'For each area, the homes on the market for sale and to let, with the lowest, average and highest price asked.',
  },
  reports: {
    'Viewing diary': 'The week\'s viewings a page a day, with the time, the home, the applicant\'s phone and who is going: for the office wall or the negotiator\'s car.',
    'Offers to decide': 'The offers waiting for an owner\'s answer, to go through at the morning meeting.',
    'Sales progress': 'Every sale in progress grouped by stage, with the value and the fees to come: the sales progressor\'s weekly list.',
    'Slow to sell or let': 'Homes on the market more than 60 days, with the owner\'s phone, for the price review.',
    'Rent for landlords': 'Each landlord\'s rent for the last 30 days, collected and outstanding, with the fees and what they are owed, and the totals.',
    'Commission by month': 'One line a month with the fees from sales, letting and management, and the totals.',
    'Rent arrears': 'Each tenant behind with rent on their own section, every unpaid month and the total owed.',
  },
  documents: {
    'Landlord statement': 'Sent to each landlord on the third working day of the month: every rent received for them, the management fee and VAT, any letting fee and repairs, each sum on its own side as received or deducted, and the sum paid into their account (or, in a month when repairs took it all, why nothing was paid). Numbered STM-2026-0042. It prints this month\'s statements, and in the first week of a month last month\'s too; print an older one from the Landlord Statements form.',
    'Tenancy agreement': 'The agreement for a home the agency lets, filled from the tenancy, the tenant, the home and its landlord. The agency signs it for the landlord and says that it acts for the landlord. A renewal says so and keeps the deposit already held; the pets clause reads one way when pets are agreed and another when none are. It prints for tenancies running or about to start. It is a plainly worded starting point of our own: have it checked against the law where your homes are before you use it.',
    'Viewing confirmation': 'The letter or e-mail an applicant gets when a viewing is booked: the day and time, who will meet them, the home with its asking price (or its rent a month, for a let), and what to do after. It prints for the viewings booked for today or later.',
    'Memorandum of sale': 'Sent to the seller, the buyer and both solicitors when an offer is accepted: the property, the agreed price, both parties and their solicitors, how the buyer is buying, what is included, and the completion hoped for. Subject to contract. It prints for the sales going through, not those completed or fallen through.',
    'Commission invoice': 'The agency\'s VAT invoice to a client: commission on a completed sale, the letting fee for a new tenancy, or a month\'s management fees, each line with its VAT. Paid, it says when and how; unpaid, how to pay. Numbered INV-2026-0042. It prints the invoices of the last 31 days; print an older one from the Agency Invoices form.',
  },
  tutorial: [
    { title: 'Take on a home to sell', steps: [
      'Open the Clients form and press New. Give the next account in Account (CL- and the next number), the owner\'s name, address, phone and e-mail, set Kind to Seller and type today in Client Since.',
      'Open the Properties form and press New. Give the next reference (FE- and the next number), choose the Client and the Area, type the Address and Postcode, set Purpose to Sale, and type Kind, Bedrooms, Bathrooms, Price (the asking price), Energy Rating and the agreed commission in Fee Rate (0.012 for 1.2 percent). Set Listed On to today and Status to For sale.',
      'Open the query Applicants matching a property to see who is looking for a home like it, and call them.',
    ] },
    { title: 'Register an applicant and book a viewing', steps: [
      'Open the Applicants form and press New. Type their name, phone, e-mail and address, set Looking To to Buy or Rent, choose the Area, and type Min Bedrooms, Budget and Position. Type today in Registered On and leave Status as Active.',
      'Open the Viewings form and press New. Choose the Property and the Applicant, choose who will show them round in Accompanied By, and type Booked On (today), Viewing Date and Viewing Time. Leave Status as Booked.',
      'Open the print template Viewing confirmation from Print templates, choose the viewing and press Print or Save as PDF, and send it. Type today in Confirmation Sent.',
      'Each morning, open the report Viewing diary for the week ahead. After each viewing, set Status to Done, Cancelled or No-show and type the applicant\'s Feedback for the owner.',
    ] },
    { title: 'Put an offer to the owner and agree a sale', steps: [
      'When an applicant offers, open the Offers form and press New. Choose the Property and the Applicant, type Made On, Amount and Conditions, and leave Status as Awaiting decision.',
      'Open the report Offers to decide, call each owner, and when they answer set Status to Accepted or Rejected and type Decided On. Turn down any other offers waiting on a home whose owner has accepted one.',
      'For an accepted offer, open the Sales form and press New. Give the next number (SALE-, the year and the next number), choose the Property, the Offer and the Buyer, the Negotiator and both solicitors, and type Price, Accepted On, Target Completion, what is Included and the Fee Rate from the property. Set the property\'s Status to Under offer and the buyer\'s Status to Bought.',
      'Open the print template Memorandum of sale, choose the sale and press Print, and send it to the seller, the buyer and both solicitors. Type today in Memorandum Sent.',
    ] },
    { title: 'Move a sale on to completion', steps: [
      'Each week, open the report Sales progress. Call both solicitors about each sale and type the date each step was reached: Solicitors Instructed, Searches Back, Mortgage Offered, Exchanged On.',
      'Change Stage as each step is reached, so the queries Sales in progress and Sales by stage show where things are.',
      'On completion, type Completed On, set Stage to Completed and type the Fee (the price times the fee rate). Set the property\'s Status to Sold.',
      'Open the Agency Invoices form and press New: give the next number, choose the seller in Client and the Sale, type Invoice Date and Due Date, and add an Invoice Lines record with Kind Sale commission, the Property and the Net fee. Type Net, Tax and Amount on the invoice, then print the Commission invoice and send it to the seller\'s solicitor.',
      'If a sale falls through, set Stage to Fell through, say why in Notes, and set the property back to For sale.',
    ] },
    { title: 'Let a home and start the tenancy', steps: [
      'Enter the landlord in Clients with Kind set to Landlord, and the home in Properties with Purpose set to Let, the monthly rent in Price and Status set to To let.',
      'Book viewings for rent applicants as for a sale. When the landlord chooses a tenant, set the property\'s Status to Let agreed and the applicant\'s Status to Rented.',
      'Open the Tenancies form and press New. Give the next reference, choose the Property and the Tenant, and type Signed On, Start, End, Monthly Rent, Rent Day, Deposit, the Service, the Management Fee and the Letting Fee. Type in Rent Paid To and Repairs To who the tenant pays and calls, as the agreement should say them.',
      'Open the print template Tenancy agreement, choose the tenancy, print two copies and have them signed. When the deposit is protected, type the scheme\'s reference in Deposit Ref.',
      'Raise the letting fee as an Agency Invoice with one line of Kind Letting fee. For a managed let it is taken from the first month\'s rent on the landlord\'s statement.',
    ] },
    { title: 'Collect the rent and arrange repairs', steps: [
      'At the start of each month, open the Rent Charges form and press New for each tenancy whose rent you collect: choose the Tenancy and type Period, Due Date and Amount.',
      'When rent reaches the client account, find the month\'s charge and type Received and Received On. Open the report Rent arrears each week to chase anything late.',
      'When a tenant reports a problem at a managed home, open the Repairs form and press New: choose the Property and Tenancy, type Reported, Problem and Priority, choose a Contractor and type the Quote. For work over 250, set Status to Awaiting approval and ask the landlord first; then type Approved On and set Status to Booked with the Booked For day.',
      'When it is done, type Done On and Cost and set Status to Done. Open the query Open repairs each morning to see what is still waiting.',
    ] },
    { title: 'Pay the landlords at the month end', steps: [
      'On the third working day of the month, open the query Rent collected and owed to landlords, or the report Rent for landlords, to see each landlord\'s rent, fees and what they are owed.',
      'For each landlord, open the Landlord Statements form and press New: give the next number (STM-, the year and the next number), choose the Client, type Period and Statement Date. Add Statement Lines: a Rent received line for each rent that came in, a Management fee line for each home, a VAT on fees line, and a Repair line for each finished repair.',
      'Type Rent Collected, Deductions and Paid Out (the first less the second) on the statement, pay the landlord, and type Paid On. Type the statement in the Statement field of each rent charge and repair it covers.',
      'Raise the month\'s management fees as an Agency Invoice for each landlord, with a line for each home. Print the Landlord statement and the Commission invoice together and send them.',
      'Open the report Commission by month to see what the agency earned, and the query Paid to landlords by month for the year so far.',
    ] },
  ],
  notes: [
    'Clients and applicants are kept apart: clients are the sellers and landlords the agency acts for, applicants are the buyers and tenants it finds for them. A tenant is an applicant whose Status is Rented, and a buyer one whose Status is Bought.',
    'A property\'s Price means two things: the asking price when its Purpose is Sale, and the monthly rent asked when it is Let. The queries that compare it with an applicant\'s Budget compare like with like, because a buyer\'s budget is a price and a tenant\'s is a monthly rent.',
    'Applicants are matched to homes through their Area: the query Applicants matching a property joins the two by it. An applicant happy to look in two areas needs a second record, or a second area field and a second query.',
    'Rent the agency collects is the landlord\'s money, not the agency\'s. It shows on the landlord statements, while the agency\'s own income is only its invoices, which is what Commission earned by month adds up.',
    'A landlord statement\'s Paid Out is the rent collected less everything deducted. When the repairs of a month cost more than the rent left after fees, they are carried to the next month\'s statement, so a statement never asks a landlord for money.',
    'Statuses on properties, applicants, sales and tenancies are as they stood on the day the sample was made. Change them by hand as things move on; the queries read them.',
    'Each print template prints only the records it is for: this month\'s landlord statements, the tenancies running or about to start, the viewings still to come, the sales going through and the invoices of the last 31 days. A record printed from its own form always prints, whatever the template would choose.',
    'Commission on sales is taken from the sale money by the seller\'s solicitor on completion, so most sale invoices are paid within a few days. Letting and management fees for managed homes are taken from the rent, so they are paid the day the statement is made.',
  ],
  faq: [
    { q: 'How do I find buyers for a new instruction?', a: 'Enter the home in Properties with its Area, Bedrooms and Price and a Status of For sale, then open the query Applicants matching a property. It lists the active buyers in that area whose budget reaches the price and who want no more bedrooms than it has.' },
    { q: 'How do I see where each sale has got to?', a: 'Open the report Sales progress, which groups the sales by stage with how long each has been going. The query Sales by stage gives the count and the fees to come at each stage.' },
    { q: 'How is a landlord\'s payment worked out?', a: 'The rent received for them in the month, less the management fee (the tenancy\'s Management Fee times the rent) and VAT on it, less any letting fee and VAT for a new tenancy, less the repairs finished that month. The Landlord statement prints each line and the sum paid.' },
    { q: 'Why does a let only tenancy have no rent charges?', a: 'With a let only service the agency finds the tenant and the tenant pays the landlord directly, so there is no rent to collect or pay out. Its only invoice is the letting fee, which the landlord pays by bank transfer.' },
    { q: 'How do I print a memorandum of sale for one sale?', a: 'Open the Sales form, find the sale and print the template Memorandum of sale from there, or open Print templates, choose Memorandum of sale and choose the sale from its list.' },
    { q: 'Can I use this for commercial property?', a: 'Yes, with small changes: add a Use Class or Size field to Properties, use leases in place of tenancies, and change the agreement\'s words. The viewings, offers and sales work as they are.' },
    { q: 'How do I see what the agency earned last year?', a: 'Open the report Commission by month. Each month shows the fees before VAT from sales, letting and management, and the totals cover every month in the file.' },
  ],
  empty: 'Start with Business, the agency\'s own name, address, VAT number and bank details, which every letter, statement and invoice prints. Then enter Staff, the Areas you work in, the Solicitors you deal with and your Contractors. Enter each client in Clients and each home in Properties, and applicants in Applicants as they register. Viewings, offers and sales come in as you trade. For lets, enter each Tenancy, a Rent Charge each month for the rent you collect, Repairs as they are reported, and a Landlord Statement with its lines for each landlord at the month end. Raise your own fees in Agency Invoices with their Invoice Lines.',
  adapt: [
    'Let applicants look in more than one area: add a Second Area field to Applicants pointing at Areas, and a second matching query that joins through it.',
    'Track the chain: add a Chain field to Sales for the buyer\'s own sale and the seller\'s onward purchase, and a query for sales whose chain is not complete.',
    'Record price reductions: add a Price Changes table (property, date, old price, new price) and enter one each time an owner agrees to a new price.',
    'Hold keys: add a Keys table with a key number, the property and who has it out, so the office knows where every set is.',
    'Keep safety certificates for managed homes: add a Certificates table (property, kind, expires) and a query for those running out in the next 60 days.',
    'Charge a renewal fee: add a Renewal Fee field to Tenancies and raise an Agency Invoice for it when a tenancy is renewed.',
    'Take holding deposits: add a Holding Deposit and a Holding Deposit Paid field to Tenancies for the sum a tenant pays to take a home off the market.',
  ],
};

// The areas: [name, district, typical price of a two-bedroom house, typical rent, how much of the work it brings, notes].
const AREAS = [
  ['Redland', 'BS6', 455000, 1650, 1.3, 'Tree-lined streets of Victorian houses and flats; good schools and the station.'],
  ['Clifton', 'BS8', 525000, 1825, 1, 'Flats in large old houses, a village feel; parking is hard.'],
  ['Bishopston', 'BS7', 425000, 1550, 1.4, 'Terraced family houses near the long shopping street.'],
  ['Southville', 'BS3', 395000, 1500, 1.1, 'Terraces near the river and the park; popular with young families.'],
  ['Bedminster', 'BS3', 335000, 1375, 1.2, 'Terraces and new flats; good value and well placed for the centre.'],
  ['Easton', 'BS5', 295000, 1250, 1, 'Small terraces and a busy high street; first-time buyers and sharers.'],
  ['Fishponds', 'BS16', 305000, 1225, 1, 'Semi-detached houses with gardens; quieter streets.'],
  ['Horfield', 'BS7', 325000, 1275, 1, 'Post-war semis and terraces near the common.'],
];
// The kinds of home: [kind, price against a terraced house, rent against one, bedrooms it comes with, how common].
const KINDS = [
  ['Flat', 0.78, 0.95, [1, 2, 2, 3], 3], ['Maisonette', 0.85, 0.96, [2, 3], 1], ['Terraced house', 1, 1, [2, 3, 3, 4], 4],
  ['Semi-detached house', 1.18, 1.08, [3, 3, 4], 2], ['Detached house', 1.5, 1.25, [3, 4, 5], 0.7],
];
const PRICE_BEDS = { 1: 0.68, 2: 1, 3: 1.28, 4: 1.6, 5: 1.95 };
const RENT_BEDS = { 1: 0.76, 2: 1, 3: 1.2, 4: 1.42, 5: 1.65 };
// Invented street names.
const STREETS = ['Ashgrove Road', 'Brookfield Avenue', 'Chestnut Walk', 'Dunmore Street', 'Fernbank Road', 'Glenmore Close', 'Hazel Grove', 'Ivywell Lane',
  'Kingsmead Parade', 'Laurel Street', 'Maple Road', 'Nursery Gardens', 'Oakfield Place', 'Priory Rise', 'Quarry Steps', 'Rosebery Mews',
  'Selwyn Road', 'Tyndale Avenue', 'Upland Road', 'Vale Street', 'Westbury Lane', 'Yew Tree Close', 'Belgrave Terrace', 'Coronation Row'];
const FEATURES = ['a south-facing garden', 'a kitchen refitted last year', 'a loft room', 'off-street parking', 'original fireplaces', 'a quiet cul-de-sac position',
  'a large through lounge', 'a balcony with views over the city', 'a garden studio', 'a ground-floor shower room', 'new double glazing', 'gas central heating'];

const STAFF = [['Director and valuer', true], ['Sales negotiator', true], ['Sales negotiator', true], ['Sales progressor', false], ['Lettings negotiator', false], ['Property manager', false], ['Accounts and administration', false]];
// Invented firms.
const SOLICITORS = ['Harbourside Conveyancing', 'Meridian Law', 'Northgate Solicitors', 'Willow Legal', 'Lantern Property Law', 'Granite Conveyancing', 'Saffron Solicitors'];
const CONTRACTORS = [['Alder Plumbing and Heating', 'Plumbing and heating'], ['Bluewater Electrical', 'Electrical'], ['Thistle Building Services', 'General building'],
  ['Falcon Locks and Glass', 'Locks and glazing'], ['Juniper Decorating', 'Decorating'], ['Orchard Gas Services', 'Plumbing and heating']];
// What goes wrong in a let home: [problem, trade, priority, quote from, quote to].
const PROBLEMS = [
  ['Boiler not working, no hot water', 'Plumbing and heating', 'Urgent', 120, 650], ['Leaking tap in the kitchen', 'Plumbing and heating', 'Low', 60, 130],
  ['Toilet cistern not filling', 'Plumbing and heating', 'High', 70, 180], ['Shower leaking through the ceiling', 'Plumbing and heating', 'Urgent', 150, 520],
  ['Sockets in the bedroom not working', 'Electrical', 'High', 70, 210], ['Extractor fan in the bathroom broken', 'Electrical', 'Normal', 90, 230],
  ['Smoke alarm faulty', 'Electrical', 'High', 45, 90], ['Back door lock broken', 'Locks and glazing', 'High', 80, 190], ['Cracked window pane', 'Locks and glazing', 'Normal', 110, 320],
  ['Damp patch on the bedroom ceiling', 'General building', 'Normal', 180, 900], ['Fence blown down', 'General building', 'Normal', 150, 480],
  ['Gutter leaking over the front door', 'General building', 'Normal', 90, 260], ['Mould in the bathroom, needs treating and painting', 'Decorating', 'Normal', 160, 420],
];
const TIMES = ['09:30', '10:15', '11:00', '11:45', '12:30', '13:15', '14:00', '15:30', '16:15', '17:00', '17:45'];
const SATURDAY = ['09:30', '10:15', '11:00', '11:45', '12:30', '13:15', '14:00'];
const LIKED = ['Liked the garden; would like a second viewing.', 'Rooms smaller than they hoped.', 'Very keen; talking to their lender about an offer.', 'Worried about the road noise.',
  'Loved the kitchen.', 'Not for them: more work than they want to take on.', 'Good size; will talk it over at home.', 'Liked it but would rather be nearer the station.',
  'Thought the price a little high for the street.', 'Second viewing; brought a builder to look at the roof.'];
const INCLUDED = ['Carpets, curtains and blinds; the oven, hob and extractor.', 'Carpets and light fittings; the fridge freezer by separate agreement.',
  'Carpets, blinds and the garden shed; the washing machine.', 'Carpets and curtains only.', 'Carpets, blinds and all the kitchen appliances.'];
const FELL = ['The buyer\'s own sale fell through.', 'The survey found movement in the back wall; the buyer withdrew.', 'The lender valued it below the price; the buyer could not make up the difference.', 'The buyer changed their mind.', 'The seller\'s onward purchase fell through and they decided to stay.'];
const PETS = ['One cat', 'One small dog', 'Two cats'];

const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '');
const round = (n, to) => Math.round(n / to) * to;
const pad4 = (n) => String(n).padStart(4, '0');

/** Fill a Fernleigh Estates database made from `spec`. `r` is random(), `cal` calendar(). Answers counts. */
export function fill(base, { r, cal, days = 540 }) {
  const counts = {};
  const add = (table, values) => { counts[table] = (counts[table] || 0) + 1; return base.insert(table, values); };

  add('Business', businessRecord({
    name: 'Fernleigh Estates', domain: 'fernleigh.example', phone: '020 7946 0730',
    address: { Address: '27 Kingsmead Parade', City: 'Bristol', Postcode: 'BS6 5AB', Country: 'United Kingdom' },
    terms: 'Payment within 7 days of the invoice date.',
    footer: 'Fernleigh Estates: homes sold, let and managed across Bristol. Rent we collect is held in a client account apart from our own money. Office open Monday to Friday 9am to 6pm, Saturday 9am to 3pm.',
  }));

  // Dates as day offsets from today; months counted on the calendar.
  const b0 = cal.at(0);
  const zero = Date.UTC(b0.getFullYear(), b0.getMonth(), b0.getDate());
  const offsetOf = (y, m, d) => Math.round((Date.UTC(y, m, d) - zero) / 864e5);
  // Day of the month and of the week, worked out once for each day: the loops below ask often.
  const memo = new Map();
  const dayOf = (off) => { let x = memo.get(off); if (!x) { const d = cal.at(off); x = [d.getDate(), d.getDay(), d.getMonth()]; memo.set(off, x); } return x; };
  const dom = (off) => dayOf(off)[0];
  const weekday = (off) => dayOf(off)[1];
  const addMonths = (off, n) => {
    const d = cal.at(off);
    const y = d.getFullYear();
    const m = d.getMonth() + n;
    const last = offsetOf(y, m + 1, 1) - offsetOf(y, m, 1);
    return offsetOf(y, m, Math.min(d.getDate(), last));
  };
  const startFrom = (off) => { while (dom(off) > 28) off++; return off; };
  const notSunday = (off) => (weekday(off) === 0 ? off + 1 : off);
  const numberer = (prefix) => { const n = {}; return (off) => { const y = cal.at(off).getFullYear(); n[y] = (n[y] || 0) + 1; return `${prefix}-${y}-${pad4(n[y])}`; }; };

  // Staff.
  const staff = STAFF.map(([role, sells], i) => {
    const p = person(r, { domain: 'fernleigh.example' });
    return { role, sells, name: `${p['First Name']} ${p['Last Name']}`, id: add('Staff', { ...p, Role: role, Phone: `020 7946 07${String(31 + i).padStart(2, '0')}`, Started: cal.day(-r.int(300, 4000)) }) };
  });
  const sellers = staff.filter((s) => s.sells);
  const progressor = staff.find((s) => s.role === 'Sales progressor');
  const letter = staff.find((s) => s.role === 'Lettings negotiator');

  // Areas, solicitors and contractors.
  const areas = AREAS.map(([name, district, price, rent, weight, notes]) => ({ name, district, price, rent, weight, id: add('Areas', { Name: name, District: district, 'Typical Price': price, 'Typical Rent': rent, Notes: notes }) }));
  const postcodeIn = (a) => `${a.district} ${r.int(1, 9)}${r.pick(['AB', 'DH', 'EJ', 'LN', 'PQ', 'RT', 'UW', 'XY'])}`;
  const solicitors = SOLICITORS.map((name) => {
    const p = person(r);
    const a = r.pick(areas);
    return add('Solicitors', { Name: name, Contact: `${p['First Name']} ${p['Last Name']}`, Address: `${r.int(1, 90)} ${r.pick(STREETS)}`, City: 'Bristol', Postcode: postcodeIn(a), Phone: phoneFor(r, 'United Kingdom'), 'E-mail': `property@${slug(name)}.example` });
  });
  const contractors = CONTRACTORS.map(([name, trade]) => ({ name, trade, id: add('Contractors', { Name: name, Trade: trade, Phone: phoneFor(r, 'United Kingdom'), 'E-mail': `jobs@${slug(name)}.example` }) }));

  // Somewhere to live, for a person: mostly in the city, some moving from elsewhere.
  const homeOf = () => {
    if (r.chance(0.65)) { const a = r.pick(areas); return { Address: `${r.int(1, 180)} ${r.pick(STREETS)}`, City: 'Bristol', Postcode: postcodeIn(a) }; }
    const a = address(r, PLACES.slice(0, 1));
    return { Address: a.Address, City: a.City, Postcode: a.Postcode };
  };

  // Applicants, made as they register and kept for the end.
  const applicants = [];
  const newApplicant = (looking, area, reg, beds, budget) => {
    const p = person(r, { domain: 'mail.example' });
    const position = looking === 'Buy'
      ? r.weighted([['First-time buyer', 3], ['Selling a home', 3], ['Mortgage agreed in principle', 2], ['Cash buyer', 1]])
      : r.weighted([['Working professional', 5], ['Couple', 3], ['Family', 2], ['Sharers', 1.5]]);
    const a = { ...p, looking, area, reg, beds, budget, position, home: homeOf(), foundAt: null, goneAt: null, status: null };
    applicants.push(a);
    return a;
  };
  const free = (a, d) => a.reg <= d && (a.foundAt == null || a.foundAt > d) && (a.goneAt == null || a.goneAt > d);
  /** Someone to view `p` on day `d`: an applicant already on the books who fits, or a new one. */
  const viewerFor = (p, d) => {
    const looking = p.purpose === 'Sale' ? 'Buy' : 'Rent';
    const fits = applicants.filter((a) => a.looking === looking && free(a, d) && a.budget >= p.price * 0.95 && a.beds <= p.beds && (a.area === p.area || a.wide));
    if (fits.length && r.chance(0.7)) return r.pick(fits);
    const step = looking === 'Buy' ? 5000 : 25;
    const a = newApplicant(looking, p.area, d - r.int(0, 21), Math.max(1, p.beds - r.int(0, 1)), round(p.price * (1 + r.next() * 0.12), step));
    a.wide = r.chance(0.2);
    return a;
  };

  // Clients.
  const clients = [];
  const newClient = (kind, since, home) => { const p = person(r, { domain: 'mail.example' }); const c = { ...p, kind, since, home, homes: [] }; clients.push(c); return c; };

  // Properties.
  const props = [];
  const newProperty = (purpose, client, listed) => {
    const area = r.weighted(areas.map((a) => [a, a.weight]));
    const [kind, priceK, rentK, bedsList] = r.weighted(KINDS.map((k) => [k, k[4]]));
    const beds = r.pick(bedsList);
    const street = r.pick(STREETS);
    const num = r.int(1, 160);
    const p = {
      purpose, client, listed, area, kind, beds, baths: beds >= 4 || (beds === 3 && r.chance(0.4)) ? 2 : 1,
      address: kind === 'Flat' ? `Flat ${r.int(1, 8)}, ${num} ${street}` : `${num} ${street}`, postcode: postcodeIn(area),
      value: round(area.price * priceK * PRICE_BEDS[beds] * (0.9 + r.next() * 0.2), 5000),
      market: round(area.rent * rentK * RENT_BEDS[beds] * (0.93 + r.next() * 0.14), 25),
      rating: r.weighted([['B', 1], ['C', 4], ['D', 4], ['E', 1.5]]), viewings: [], offers: [], notes: [], byDay: new Map(), byDecide: new Map(),
      feature: r.some(FEATURES, 2),
    };
    client.homes.push(p);
    props.push(p);
    return p;
  };

  // Lists kept by day, so each day's viewings and decisions are found at once.
  const listed = (map, k) => { if (!map.has(k)) map.set(k, []); return map.get(k); };
  const viewings = [];
  const book = (p, d, staffer) => {
    let at = notSunday(d + r.int(1, 6));
    if (at === d) at++;
    const a = viewerFor(p, d);
    const v = { p, a, booked: d, at, time: r.pick(weekday(at) === 6 ? SATURDAY : TIMES), staff: staffer, status: 'Booked', feedback: null };
    viewings.push(v);
    p.viewings.push(v);
    listed(p.byDay, at).push(v);
    return v;
  };
  const happen = (v, why) => {
    if (why) { v.status = 'Cancelled'; v.feedback = why; return false; }
    v.status = r.weighted([['Done', 86], ['Cancelled', 8], ['No-show', 6]]);
    v.feedback = v.status === 'Done' ? r.pick(LIKED) : v.status === 'Cancelled' ? r.pick(['Applicant found somewhere else.', 'Rearranged by the owner.', 'Applicant unwell; will call to rebook.']) : 'Did not arrive and did not answer the phone.';
    return v.status === 'Done';
  };

  // ---------------- Sales ----------------
  // Homes come on the market more in spring and early autumn, fewer at Christmas.
  const SEASON = [0.7, 0.9, 1.2, 1.35, 1.3, 1.1, 1, 0.85, 1.15, 1.1, 0.9, 0.5];
  const sales = [];
  const offers = [];
  const addOffer = (o) => { o.p.offers.push(o); offers.push(o); listed(o.p.byDecide, o.decide).push(o); };
  const saleProps = [];
  for (let d = -days - 60; d <= 0; d++) {
    if (weekday(d) === 0) continue;
    if (!r.chance(0.21 * SEASON[dayOf(d)[2]])) continue;
    const c = newClient('Seller', d - r.int(3, 20), null);
    const p = newProperty('Sale', c, d);
    c.home = { Address: p.address, City: 'Bristol', Postcode: p.postcode };
    saleProps.push(p);
  }
  // Two owners who asked too much and will not come down: on the market for months.
  for (const p of r.some(saleProps.filter((x) => x.listed < -62 && x.listed > -130), 2)) p.stubborn = true;

  for (const p of saleProps) {
    p.price = round(p.value * (p.stubborn ? 1.14 : r.chance(0.18) ? 1.1 : 1 + r.next() * 0.06), 5000);
    p.fee = r.pick([0.01, 0.012, 0.012, 0.0125, 0.015]);
    p.status = 'For sale';
    let sale = null;
    let reduced = false;
    for (let d = p.listed; d <= 0; d++) {
      const interest = p.value / p.price;
      for (const v of p.byDay.get(d) || []) {
        if (v.status !== 'Booked') continue;
        if (p.status !== 'For sale') { happen(v, p.status === 'Withdrawn' ? 'Cancelled: the owner took the home off the market.' : 'Cancelled: the owner has accepted an offer.'); continue; }
        if (happen(v) && r.chance(0.21 * interest ** 3)) {
          const made = d + r.int(0, 2);
          if (made <= 0 && free(v.a, made)) {
            const o = { p, a: v.a, made, amount: round(p.price * (0.92 + r.next() * 0.075), 1000), decide: made + r.int(1, 5), status: 'Awaiting decision', notes: null };
            addOffer(o);
          }
        }
      }
      for (const o of p.byDecide.get(d) || []) {
        if (o.status !== 'Awaiting decision') continue;
        o.decided = d;
        if (p.status !== 'For sale') { o.status = 'Rejected'; o.notes = 'The owner had already accepted another offer.'; continue; }
        const floor = p.stubborn ? p.price * 1.01 : p.value * (d - p.listed > 90 ? 0.94 : 0.965);
        if (o.amount >= floor && free(o.a, d)) {
          o.status = 'Accepted';
          o.a.foundAt = d;
          p.status = 'Under offer';
          const cash = o.a.position === 'Cash buyer';
          const A = d;
          const sol = A + r.int(2, 6);
          const searches = sol + r.int(12, 24);
          const mortgage = cash ? null : searches + r.int(6, 24);
          const exchange = (mortgage ?? searches) + r.int(10, 28);
          sale = {
            p, o, buyer: o.a, A, sol, searches, mortgage, exchange, complete: exchange + r.int(7, 28), target: A + r.int(70, 100),
            fall: r.chance(0.1) ? A + r.int(8, exchange - A - 1) : null, negotiator: r.pick(sellers), price: o.amount,
            bs: r.pick(solicitors), ss: r.pick(solicitors), included: r.pick(INCLUDED), fee: p.fee,
          };
          sales.push(sale);
        } else {
          o.status = 'Rejected';
          o.notes = p.stubborn ? 'The owner is holding out for the asking price.' : 'Too far below what the owner will take.';
          // Some come back with a better offer.
          if (!p.stubborn && r.chance(0.4)) {
            const made = d + r.int(1, 4);
            if (made <= 0) {
              const again = { p, a: o.a, made, amount: Math.min(p.price, round(o.amount * (1.02 + r.next() * 0.02), 1000)), decide: made + r.int(1, 4), status: 'Awaiting decision', notes: 'An improved offer.' };
              addOffer(again);
            }
          }
        }
      }
      if (sale && d === sale.fall) {
        sale.fell = d;
        sale.buyer.goneAt = d;
        p.status = 'For sale';
        p.notes.push(`Back on the market on ${cal.day(d)}: the sale fell through.`);
        sale = null;
      } else if (sale && d === sale.complete) {
        p.status = 'Sold';
        break;
      }
      if (p.status === 'For sale' && d > p.listed) {
        if (weekday(d) !== 0 && r.chance(0.1 * interest ** 4 * (p.stubborn ? 0.7 : 1))) book(p, d, r.pick(sellers));
        if (!reduced && !p.stubborn && d - p.listed >= 45 && p.price > p.value && r.chance(0.06)) {
          const was = p.price;
          p.price = round(p.price * 0.95, 5000);
          reduced = true;
          p.notes.push(`Reduced from ${was} to ${p.price} on ${cal.day(d)}.`);
        }
        if (!p.stubborn && d - p.listed > 150 && r.chance(0.012)) { p.status = 'Withdrawn'; p.notes.push(`Taken off the market on ${cal.day(d)}.`); }
      }
    }
    // Viewings booked for days still to come stay booked; nothing else is decided yet.
  }
  // An offer or two always waiting on an owner's answer: made in the last few days on homes still for sale.
  const waiting = offers.filter((o) => o.status === 'Awaiting decision').length;
  if (waiting < 2) {
    const open = saleProps.filter((p) => p.status === 'For sale' && !p.stubborn && p.viewings.some((v) => v.status === 'Done' && free(v.a, 0)));
    for (const p of r.some(open, 2 - waiting)) {
      const v = p.viewings.filter((x) => x.status === 'Done' && free(x.a, 0)).pop();
      const made = Math.max(v.at, -r.int(0, 3));
      const o = { p, a: v.a, made, amount: round(p.price * (0.93 + r.next() * 0.05), 1000), decide: 1, status: 'Awaiting decision', notes: null };
      addOffer(o);
    }
  }

  // ---------------- Lettings ----------------
  const tenancies = [];
  const letProps = [];
  const landlords = [];
  for (let i = 0; i < 13; i++) landlords.push(newClient('Landlord', -days - r.int(30, 2500), homeOf()));
  // A few landlords new to the agency during the period.
  for (let i = 0; i < 3; i++) landlords.push(newClient('Landlord', -r.int(60, days - 30), homeOf()));
  for (const c of landlords) {
    const n = c.since > -days ? r.int(1, 2) : r.weighted([[1, 5], [2, 3], [3, 1.5]]);
    const service = r.weighted([['Fully managed', 6], ['Rent collection', 2.5], ['Let only', 1.5]]);
    for (let k = 0; k < n; k++) {
      const p = newProperty('Let', c, null);
      p.service = service;
      p.fresh = c.since > -days;
      letProps.push(p);
    }
  }
  const SERVICE_FEE = { 'Fully managed': 0.12, 'Rent collection': 0.08, 'Let only': 0 };
  const newTenancy = (p, tenant, S, renewal, rent, signed, term = r.chance(0.15) ? 6 : 12) => {
    const t = {
      p, tenant, S, E: addMonths(S, term) - 1, rent, renewal, signed, service: p.service, mgmt: SERVICE_FEE[p.service],
      letFee: renewal ? 0 : money(rent * (p.service === 'Let only' ? 1 : 0.5)), pets: r.chance(0.1) ? r.pick(PETS) : 'None',
    };
    t.deposit = renewal ? null : Math.floor((rent * 12) / 52 * 5);
    tenancies.push(t);
    return t;
  };
  // One home's yearly tenancies run on to an end in the next few weeks, so on
  // any day there is a tenancy to ask about renewing.
  const ending = letProps.find((p) => !p.fresh);
  const endsOn = startFrom(r.int(11, 51)) - 1;
  let endingStart = endsOn + 1;
  while (endingStart > -days) endingStart = addMonths(endingStart, -12);
  for (const p of letProps) {
    p.price = p.market;
    let cur = null;
    let listAt = null;
    if (p.fresh) listAt = p.client.since + r.int(3, 14);
    else {
      const S = p === ending ? endingStart : startFrom(-days - r.int(0, 330));
      const tenant = newApplicant('Rent', p.area, S - r.int(25, 60), p.beds, round(p.market * 1.05, 25));
      tenant.foundAt = S - r.int(10, 20);
      cur = newTenancy(p, tenant, S, false, round(p.market * Math.pow(1.035, S / 365), 25), S - r.int(5, 15), p === ending ? 12 : undefined);
    }
    for (let guard = 0; guard < 12; guard++) {
      if (cur) {
        const decideAt = cur.E - 60;
        if (decideAt > 0) break;
        const onToTheEnd = p === ending && cur.E < endsOn;
        if (onToTheEnd || r.chance(0.55)) {
          cur = newTenancy(p, cur.tenant, cur.E + 1, true, round(cur.rent * 1.03, 5), Math.min(0, cur.E - r.int(25, 45)), onToTheEnd ? 12 : undefined);
          if (cur.S > 0) break;
          continue;
        }
        listAt = Math.max(cur.E - 35, cur.S + 60);
        p.leaving = cur;
      }
      if (listAt > 0) { p.status = 'Let'; break; }
      // Marketing: viewings until the landlord chooses a tenant.
      p.listed = listAt;
      p.price = round(p.market * Math.pow(1.035, listAt / 365), 25);
      let agreed = null;
      let chosen = null;
      for (let d = listAt; d <= 0 && agreed == null; d++) {
        for (const v of p.byDay.get(d) || []) {
          if (v.status !== 'Booked') continue;
          if (happen(v) && r.chance(0.38) && free(v.a, d)) { agreed = d + r.int(0, 2); chosen = v.a; break; }
        }
        if (agreed == null && weekday(d) !== 0 && r.chance(0.2)) book(p, d, letter);
      }
      if (agreed == null || agreed > 0) { p.status = 'To let'; break; }
      chosen.foundAt = agreed;
      for (const v of p.viewings) if (v.status === 'Booked' && v.at >= agreed) happen(v, 'Cancelled: the home has been let.');
      const S = startFrom(Math.max(p.leaving ? p.leaving.E + 1 : agreed, agreed + r.int(7, 18)));
      cur = newTenancy(p, chosen, S, false, p.price, Math.min(0, agreed + r.int(1, 4)));
      p.leaving = null;
      if (S > 0) { p.status = 'Let agreed'; break; }
    }
    if (!p.status) p.status = 'Let';
    if (p.listed == null) p.listed = cur ? cur.S - r.int(20, 40) : listAt;
  }

  // Applicants who stop looking without buying or renting, and some who are
  // looking now without having viewed anything yet.
  for (let i = 0; i < 60; i++) {
    const looking = r.chance(0.55) ? 'Buy' : 'Rent';
    const area = r.weighted(areas.map((a) => [a, a.weight]));
    const beds = r.weighted([[1, 2], [2, 4], [3, 3], [4, 1]]);
    const price = looking === 'Buy' ? area.price * PRICE_BEDS[beds] * (0.85 + r.next() * 0.4) : area.rent * RENT_BEDS[beds] * (0.9 + r.next() * 0.3);
    newApplicant(looking, area, -r.int(0, 200), beds, round(price, looking === 'Buy' ? 5000 : 25));
  }
  for (const a of applicants) if (a.foundAt == null && a.goneAt == null && a.reg < -120 && r.chance(0.6)) a.goneAt = a.reg + r.int(60, 160);

  // ---------------- Money ----------------
  // Rent: a charge each month of each tenancy whose rent the agency collects, from when the records begin.
  const charges = [];
  const collected = tenancies.filter((t) => t.service !== 'Let only');
  const current = collected.filter((t) => t.S <= -100 && t.E >= 0);
  for (const t of r.some(current, Math.min(2, current.length))) t.struggling = true;
  for (const t of collected) {
    t.profile = r.weighted([['prompt', 8], ['late', 2]]);
    for (let k = 0; ; k++) {
      const due = addMonths(t.S, k);
      if (due > t.E || due > 0) break;
      if (due < -days) continue;
      let got = t.rent;
      let at = due;
      if (t.struggling && due > -95) { got = money(t.rent * r.pick([0, 0.5, 0.5, 1])); at = due + r.int(3, 12); }
      else if (t.profile === 'late' && r.chance(0.5)) at = due + r.int(2, 12);
      if (at > 0 || got === 0) { got = 0; at = null; }
      charges.push({ t, due, period: cal.day(due).slice(0, 7), amount: t.rent, got, at });
    }
  }

  // Repairs at fully managed homes, as tenants report them.
  const repairs = [];
  for (const t of tenancies.filter((x) => x.service === 'Fully managed')) {
    for (let d = Math.max(t.S, -days); d <= Math.min(t.E, 0); d++) {
      if (!r.chance(1 / 115)) continue;
      const [problem, trade, priority, lo, hi] = r.pick(PROBLEMS);
      repairs.push({ t, p: t.p, at: d, problem, trade, priority, quote: r.int(lo, hi) });
    }
  }
  const lead = { Urgent: [0, 1], High: [1, 3], Normal: [3, 10], Low: [5, 20] };
  for (const x of repairs) {
    x.contractor = r.pick(contractors.filter((c) => c.trade === x.trade));
    x.approved = x.quote > 250 ? x.at + r.int(1, 3) : null;
    const [lo, hi] = lead[x.priority];
    x.booked = cal.workday(Math.max(x.at, x.approved ?? x.at) + r.int(lo, hi));
    x.done = x.booked + (r.chance(0.15) ? r.int(1, 5) : 0);
    x.cost = x.done <= 0 ? money(x.quote * (0.95 + r.next() * 0.12)) : null;
    x.status = x.done <= 0 ? 'Done' : x.approved != null && x.approved > 0 ? 'Awaiting approval' : x.at >= -1 && r.chance(0.5) ? 'Reported' : 'Booked';
    if (x.status === 'Reported') x.booked = null;
  }

  // At least one still waiting today: reported in the last few days, the contractor coming soon.
  const live = tenancies.filter((t) => t.service === 'Fully managed' && t.S <= -5 && t.E >= 0);
  if (live.length && !repairs.some((x) => x.status !== 'Done')) {
    const t = r.pick(live);
    const [problem, trade, priority, lo] = r.pick(PROBLEMS.filter((x) => x[3] < 200));
    const at = -r.int(0, 3);
    repairs.push({ t, p: t.p, at, problem, trade, priority, quote: r.int(lo, 240), contractor: r.pick(contractors.filter((c) => c.trade === trade)), approved: null, booked: cal.workday(r.int(1, 4)), done: null, cost: null, status: 'Booked' });
  }
  // Invoices: a letting fee when a tenancy starts, commission when a sale completes, management fees each month.
  const invoices = [];
  for (const t of tenancies) {
    if (!t.letFee || t.S > 0 || t.S < -days) continue;
    invoices.push({ at: t.S, client: t.p.client, tenancy: t, kind: 'Letting fee', lines: [{ kind: 'Letting fee', text: `Letting fee: finding the tenant, references, the inventory and the tenancy agreement, from ${cal.day(t.S)}`, p: t.p, net: t.letFee }], deducted: t.service !== 'Let only' });
  }
  for (const s of sales) {
    if (s.fell != null || s.complete > 0) continue;
    s.feeNet = money(s.price * s.fee);
    invoices.push({ at: s.complete, client: s.p.client, sale: s, kind: 'Sale commission', lines: [{ kind: 'Sale commission', text: `Commission on the sale at ${s.price}, ${(s.fee * 100).toFixed(2).replace(/0$/, '')} percent of the price`, p: s.p, net: s.feeNet }] });
  }

  // Landlord statements: on the third working day of each month, for the month before.
  const statements = [];
  let month = -days;
  while (dom(month) !== 1) month++;
  const byLandlord = new Map(landlords.map((c) => [c, { charges: [], repairs: [], fees: [] }]));
  for (const c of charges) byLandlord.get(c.t.p.client).charges.push(c);
  for (const x of repairs) byLandlord.get(x.p.client).repairs.push(x);
  for (const inv of invoices) if (inv.deducted) byLandlord.get(inv.client).fees.push(inv);
  for (let m = month; ; m = addMonths(m, 1)) {
    const next = addMonths(m, 1);
    const on = cal.workday(next + 2);
    if (on > 0) break;
    for (const c of landlords) {
      const mine = byLandlord.get(c);
      const rents = mine.charges.filter((x) => x.at != null && x.at >= m && x.at < next);
      if (!rents.length) continue;
      const lines = [];
      const rentIn = money(rents.reduce((n, x) => n + x.got, 0));
      for (const x of rents) lines.push({ at: x.at, p: x.t.p, kind: 'Rent received', text: `Rent for ${x.period}, ${x.t.tenant['First Name']} ${x.t.tenant['Last Name']}`, in: x.got, out: 0 });
      // The month's management fee for each home, on its own invoice.
      const fee = { at: on, client: c, kind: 'Management fee', lines: [], deducted: true, paidAt: on };
      for (const p of [...new Set(rents.map((x) => x.t.p))]) {
        const got = rents.filter((x) => x.t.p === p).reduce((n, x) => n + x.got, 0);
        const rate = rents.find((x) => x.t.p === p).t.mgmt;
        const net = money(got * rate);
        fee.lines.push({ kind: 'Management fee', text: `Management fee for ${cal.day(m).slice(0, 7)}, ${Math.round(rate * 100)} percent of the rent collected`, p, net });
        lines.push({ at: on, p, kind: 'Management fee', text: `Management fee, ${Math.round(rate * 100)} percent of ${money(got)}`, in: 0, out: net, invoice: fee });
      }
      invoices.push(fee);
      const settled = [fee];
      const vatOf = (inv) => inv.lines.reduce((k, l) => k + money(l.net * 0.2), 0);
      let left = money(rentIn - lines.reduce((n, l) => n + l.out, 0) - vatOf(fee));
      // A letting fee is taken when the rent left will pay it with its VAT; otherwise it waits for next month.
      for (const inv of mine.fees.filter((x) => x.paidAt == null && x.at < next)) {
        const cost = money(inv.lines.reduce((n, l) => n + l.net, 0) + vatOf(inv));
        if (cost > left) continue;
        left = money(left - cost);
        inv.paidAt = on;
        settled.push(inv);
        for (const l of inv.lines) lines.push({ at: inv.at, p: l.p, kind: 'Letting fee', text: 'Letting fee for the new tenancy', in: 0, out: l.net, invoice: inv });
      }
      const vat = money(settled.reduce((n, inv) => n + vatOf(inv), 0));
      lines.push({ at: on, p: null, kind: 'VAT on fees', text: 'VAT at 20 percent on our fees', in: 0, out: vat, invoices: settled });
      left = money(rentIn - lines.reduce((n, l) => n + l.out, 0));
      // Repairs finished up to the month end, as far as the rent left will pay; the rest wait for next month.
      for (const x of mine.repairs.filter((y) => y.status === 'Done' && y.stmt == null && y.done < next).sort((a, b) => a.done - b.done)) {
        if (x.cost > left) continue;
        left = money(left - x.cost);
        x.stmt = true;
        lines.push({ at: x.done, p: x.p, kind: 'Repair', text: `${x.problem} (${x.contractor.name})`, in: 0, out: x.cost, repair: x });
      }
      const s = { c, m, on, period: cal.day(m).slice(0, 7), lines, rentIn, out: money(rentIn - left), paid: left, rents };
      for (const x of rents) x.stmt = s;
      for (const l of lines) if (l.repair) l.repair.stmt = s;
      for (const inv of settled) inv.stmt = s;
      statements.push(s);
    }
  }

  // Numbers in date order, a new run each year.
  const kindOrder = { 'Sale commission': 0, 'Letting fee': 1, 'Management fee': 2 };
  invoices.sort((a, b) => a.at - b.at || kindOrder[a.kind] - kindOrder[b.kind] || a.client.since - b.client.since);
  const invNo = numberer('INV');
  for (const inv of invoices) {
    inv.number = invNo(inv.at);
    inv.net = money(inv.lines.reduce((n, l) => n + l.net, 0));
    inv.tax = money(inv.lines.reduce((n, l) => n + money(l.net * 0.2), 0));
  }
  for (const s of statements) for (const l of s.lines) {
    if (l.invoice) l.text = `${l.text} (invoice ${l.invoice.number})`;
    if (l.invoices) l.text = `${l.text}, invoice${l.invoices.length > 1 ? 's' : ''} ${l.invoices.map((i) => i.number).join(', ')}`;
  }

  // ---------------- Writing it all down ----------------
  // Viewings still booked on a home no longer on the market are called off.
  for (const v of viewings) {
    if (v.status !== 'Booked' || ['For sale', 'To let'].includes(v.p.status)) continue;
    happen(v, v.p.status === 'Withdrawn' ? 'Cancelled: the owner took the home off the market.' : v.p.purpose === 'Sale' ? 'Cancelled: the owner has accepted an offer.' : 'Cancelled: the home has been let.');
  }
  clients.sort((a, b) => a.since - b.since);
  clients.forEach((c, i) => {
    c.id = add('Clients', {
      Account: `CL-${pad4(i + 1)}`, 'First Name': c['First Name'], 'Last Name': c['Last Name'], Kind: c.kind, ...c.home,
      Phone: phoneFor(r, 'United Kingdom'), 'E-mail': c['E-mail'], 'Client Since': cal.day(c.since),
      Notes: c.kind === 'Landlord' && c.homes.length > 1 ? `Lets ${c.homes.length} homes through us.` : c.kind === 'Landlord' && r.chance(0.3) ? 'Prefers statements by e-mail.' : null,
    });
  });
  props.sort((a, b) => (a.listed ?? 0) - (b.listed ?? 0));
  props.forEach((p, i) => {
    p.ref = `FE-${pad4(i + 1)}`;
    p.id = add('Properties', {
      Reference: p.ref, Client: p.client.id, Area: p.area.id, Address: p.address, City: 'Bristol', Postcode: p.postcode, Purpose: p.purpose,
      Kind: p.kind, Bedrooms: p.beds, Bathrooms: p.baths, Price: p.price, 'Listed On': p.listed != null ? cal.day(p.listed) : null, Status: p.status,
      'Energy Rating': p.rating, 'Fee Rate': p.purpose === 'Sale' ? p.fee : null,
      Description: `A ${p.beds} bedroom ${p.kind.toLowerCase()} in ${p.area.name} with ${p.feature[0]} and ${p.feature[1]}.`,
      Notes: p.notes.length ? p.notes.join(' ') : p.purpose === 'Let' ? `${p.service}. Keys held in the office.` : null,
    });
  });
  // Where a tenant lives now: the home they rent from us.
  for (const t of tenancies) if (t.E >= 0) t.tenant.home = { Address: t.p.address, City: 'Bristol', Postcode: t.p.postcode };
  applicants.sort((a, b) => a.reg - b.reg);
  for (const a of applicants) {
    const bought = sales.some((s) => s.buyer === a && s.fell == null && s.A <= 0);
    const rented = tenancies.some((t) => t.tenant === a);
    a.id = add('Applicants', {
      'First Name': a['First Name'], 'Last Name': a['Last Name'], 'Looking To': a.looking, Area: a.area.id, 'Min Bedrooms': a.beds, Budget: a.budget,
      Position: a.position, ...a.home, Phone: phoneFor(r, 'United Kingdom'), 'E-mail': a['E-mail'], 'Registered On': cal.day(a.reg),
      Status: bought ? 'Bought' : rented ? 'Rented' : a.goneAt != null && a.goneAt <= 0 ? 'Withdrawn' : 'Active',
      Notes: a.wide ? 'Happy to look in other areas too.' : null,
    });
  }
  viewings.sort((a, b) => a.booked - b.booked || a.at - b.at);
  for (const v of viewings) {
    add('Viewings', {
      Property: v.p.id, Applicant: v.a.id, 'Accompanied By': v.staff.id, 'Booked On': cal.day(v.booked), 'Viewing Date': cal.day(v.at), 'Viewing Time': v.time,
      Status: v.status, 'Confirmation Sent': cal.day(v.booked), Feedback: v.feedback,
    });
  }
  offers.sort((a, b) => a.made - b.made);
  for (const o of offers) {
    o.id = add('Offers', {
      Property: o.p.id, Applicant: o.a.id, 'Made On': cal.day(o.made), Amount: o.amount,
      Conditions: { 'Cash buyer': 'Cash, no chain; subject to survey.', 'First-time buyer': 'Subject to mortgage and survey; no chain.', 'Selling a home': 'Subject to the sale of their own home, which is under offer.', 'Mortgage agreed in principle': 'Mortgage agreed in principle; subject to survey.' }[o.a.position],
      Status: o.status, 'Decided On': o.decided != null ? cal.day(o.decided) : null, Notes: o.notes,
    });
  }
  sales.sort((a, b) => a.A - b.A);
  const saleNo = numberer('SALE');
  for (const s of sales) {
    const seen = (d) => (d != null && d <= 0 && (s.fell == null || d < s.fell) ? cal.day(d) : null);
    const stage = s.fell != null ? 'Fell through' : s.complete <= 0 ? 'Completed' : s.exchange <= 0 ? 'Exchanged' : s.mortgage != null && s.mortgage <= 0 ? 'Mortgage offered'
      : s.searches <= 0 ? 'Searches and survey' : s.sol <= 0 ? 'Solicitors instructed' : 'Offer accepted';
    const done = stage === 'Completed';
    s.id = add('Sales', {
      Number: saleNo(s.A), Property: s.p.id, Offer: s.o.id, Buyer: s.buyer.id, Negotiator: s.negotiator.id, 'Buyer Solicitor': s.bs, 'Seller Solicitor': s.ss,
      Price: s.price, 'Accepted On': cal.day(s.A), 'Memorandum Sent': s.A + 1 <= 0 ? cal.day(s.A + 1) : null, Stage: stage,
      'Solicitors Instructed': seen(s.sol), 'Searches Back': seen(s.searches), 'Mortgage Offered': seen(s.mortgage), 'Exchanged On': seen(s.exchange),
      'Completed On': done ? cal.day(s.complete) : null, 'Target Completion': cal.day(s.target), Included: s.included, 'Fee Rate': s.fee,
      Fee: done ? s.feeNet : null, Notes: s.fell != null ? r.pick(FELL) : stage !== 'Completed' && s.A < -90 ? `Slow: ${progressor.name} chasing the ${s.mortgage != null && s.mortgage > 0 ? 'mortgage offer' : 'searches'} each week.` : null,
    });
  }
  tenancies.sort((a, b) => a.signed - b.signed || a.S - b.S);
  const tyNo = numberer('TY');
  for (const t of tenancies) {
    const prev = t.renewal ? tenancies.filter((x) => x.p === t.p && x.tenant === t.tenant && x.E < t.S).pop() : null;
    if (prev) { t.deposit = prev.deposit; t.ref = prev.ref; } else t.ref = t.S > -10 || (t.S > -30 && r.chance(0.5)) ? null : `DPS-${cal.day(t.S).slice(0, 4)}-${String(r.int(10000, 99999))}`;
    t.id = add('Tenancies', {
      Reference: tyNo(t.signed), Property: t.p.id, Tenant: t.tenant.id, 'Signed On': cal.day(t.signed), Start: cal.day(t.S), End: cal.day(t.E),
      'Monthly Rent': t.rent, 'Rent Day': dom(t.S), Deposit: t.deposit, 'Deposit Ref': t.ref, Service: t.service, 'Management Fee': t.mgmt, 'Letting Fee': t.letFee,
      'Rent Paid To': t.service === 'Let only' ? 'the Landlord, into the account the Landlord gives in writing' : 'the Agent, into its client account',
      'Repairs To': t.service === 'Fully managed' ? 'the Agent, on the office number above or by e-mail' : 'the Landlord, on the number the Landlord gives in writing',
      Pets: t.pets, Renewal: t.renewal, Status: t.S > 0 ? 'Upcoming' : t.E < 0 ? 'Ended' : 'Active',
      Notes: t.struggling ? 'Behind with the rent; a plan to clear it agreed with the landlord.' : null,
    });
  }
  const stNo = numberer('STM');
  for (const s of statements) {
    s.id = add('Landlord Statements', { Number: stNo(s.on), Client: s.c.id, Period: s.period, 'Statement Date': cal.day(s.on), 'Rent Collected': s.rentIn, Deductions: s.out, 'Paid Out': s.paid, 'Paid On': cal.day(s.on) });
    for (const l of s.lines.sort((a, b) => a.at - b.at)) add('Statement Lines', { Statement: s.id, Date: cal.day(Math.min(l.at, s.on)), Property: l.p ? l.p.id : null, Kind: l.kind, Description: l.text, 'Money In': l.in, 'Money Out': l.out });
  }
  charges.sort((a, b) => a.due - b.due);
  for (const c of charges) add('Rent Charges', { Tenancy: c.t.id, Period: c.period, 'Due Date': cal.day(c.due), Amount: c.amount, Received: c.got, 'Received On': c.at != null ? cal.day(c.at) : null, Statement: c.stmt ? c.stmt.id : null });
  repairs.sort((a, b) => a.at - b.at);
  for (const x of repairs) {
    add('Repairs', {
      Property: x.p.id, Tenancy: x.t.id, Reported: cal.day(x.at), Problem: x.problem, Priority: x.priority, Contractor: x.status === 'Reported' ? null : x.contractor.id,
      Quote: x.status === 'Reported' ? null : x.quote, 'Approved On': x.approved != null && x.approved <= 0 ? cal.day(x.approved) : null, Status: x.status,
      'Booked For': x.booked != null && x.status !== 'Awaiting approval' ? cal.day(x.booked) : null, 'Done On': x.status === 'Done' ? cal.day(x.done) : null,
      Cost: x.cost, Statement: x.stmt && x.stmt !== true ? x.stmt.id : null, Notes: x.approved != null ? 'Over 250: the landlord\'s agreement asked for first.' : null,
    });
  }
  for (const inv of invoices) {
    let paid = inv.paidAt ?? null;
    let how = inv.deducted ? 'Taken from rent collected' : null;
    if (inv.kind === 'Sale commission') { paid = inv.at + (r.chance(0.9) ? r.int(0, 3) : r.int(12, 35)); how = 'From the sale proceeds'; }
    if (inv.kind === 'Letting fee' && !inv.deducted) { paid = inv.at + r.int(2, 20); how = 'Bank transfer'; }
    if (paid != null && paid > 0) { paid = null; how = null; }
    const id = add('Agency Invoices', {
      Number: inv.number, Client: inv.client.id, Sale: inv.sale ? inv.sale.id : null, Tenancy: inv.tenancy ? inv.tenancy.id : null, Statement: inv.stmt ? inv.stmt.id : null,
      'Invoice Date': cal.day(inv.at), 'Due Date': cal.day(inv.at + 7), Net: inv.net, Tax: inv.tax, Amount: money(inv.net + inv.tax),
      'Paid On': paid != null ? cal.day(paid) : null, 'Paid How': how,
    });
    for (const l of inv.lines) add('Invoice Lines', { Invoice: id, Kind: l.kind, Description: l.text, Property: l.p.id, Net: l.net, 'Tax Rate': 0.2 });
  }
  return counts;
}
