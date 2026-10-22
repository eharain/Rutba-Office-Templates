// The gym: Tannery Yard Fitness, an invented independent gym and fitness
// studio in a converted tannery in Leeds. Members join on a monthly plan
// (off-peak, full, family or student), pay a joining fee and then a monthly
// fee by direct debit on their own payment day, freeze for a month or two
// when they are hurt or away, and cancel with a month's notice once their
// minimum term is done. A weekly timetable of classes is taught by
// self-employed instructors paid by the class; members book places up to a
// week ahead, come, or do not. Personal training is sold in packs of
// sessions. Every swipe through the door is a visit.
//
// Its records come from about twelve months run a day at a time: members
// join (most in January and September) and some leave; each month's fee is
// invoiced ten days before the payment day and collected on it, and a few
// collections fail, are tried again five days later, and are paid at the
// desk or written off; classes fill as the day comes near; packs of
// personal training are used a session or two a week until they run out or
// expire. Some members stop coming long before they stop paying, which is
// what the gym most wants to see. Classes and training sessions are booked
// for the next fortnight, and the next fees are already invoiced.
//
// It prints what a gym hands over: the membership agreement, a membership
// card, a welcome letter, each month's invoice, and a receipt for a pack of
// personal training. Prices are shown to the public with VAT in them, so
// the invoice and receipt show the VAT within the price.

import { BUSINESS_ABOUT, BUSINESS_TABLE, businessRecord, FIRST, LAST, money, phoneFor } from './util.js';

// These print templates need Data Files 2.16: an older Office is told to update.
export const minOffice = '2.16.0';

const ref = (table) => ({ type: 'integer', points: table });
const NAME = '[First Name] & " " & [Last Name]';
const AHEAD = (field) => `DateDiff("d", Date(), [${field}])`;
const AGO = (field) => `DateDiff("d", [${field}], Date())`;
// An invoice line's price with VAT in it, and the VAT within it.
const LINE = 'Round([Quantity] * [Unit Price], 2)';
const VAT_IN = `Round(${LINE} - ${LINE} / (1 + [Tax Rate]), 2)`;
const LETTERHEAD = { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'E-mail', 'Website'] };

export const spec = {
  tables: [
    BUSINESS_TABLE,
    { name: 'Plans', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Monthly Fee', type: 'currency' }, { name: 'Joining Fee', type: 'currency', default: 0 },
      { name: 'Minimum Months', type: 'integer', default: 3 }, { name: 'Notice Months', type: 'integer', default: 1 }, { name: 'Freeze Fee', type: 'currency', default: 0 },
      { name: 'Access Hours', type: 'text' }, { name: 'Tax Rate', type: 'number', default: 0.2 }, { name: 'Description', type: 'text' },
    ] },
    { name: 'Staff', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Role', type: 'text' },
      { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Class Rate', type: 'currency' }, { name: 'Session Rate', type: 'currency' },
      { name: 'Started', type: 'date' },
    ] },
    { name: 'Members', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true },
      { name: 'Date of Birth', type: 'date' }, { name: 'Address', type: 'text' }, { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' },
      { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Plan', ...ref('Plans'), required: true },
      { name: 'Monthly Fee', type: 'currency' }, { name: 'Joined', type: 'date' }, { name: 'Payment Day', type: 'integer' },
      { name: 'Minimum Term Ends', type: 'date' }, { name: 'Status', type: 'text', default: 'Active' }, { name: 'Cancel Requested', type: 'date' },
      { name: 'Ends', type: 'date' }, { name: 'Health Declaration', type: 'yesno' }, { name: 'Emergency Contact', type: 'text' },
      { name: 'Emergency Phone', type: 'text' }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Freezes', fields: [
      { name: 'Member', ...ref('Members'), required: true }, { name: 'Starts', type: 'date' }, { name: 'Ends', type: 'date' },
      { name: 'Reason', type: 'text' }, { name: 'Monthly Fee', type: 'currency' },
    ] },
    { name: 'Invoices', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Member', ...ref('Members'), required: true }, { name: 'Invoice Date', type: 'date' },
      { name: 'Period From', type: 'date' }, { name: 'Period To', type: 'date' }, { name: 'Due Date', type: 'date' },
      { name: 'Net', type: 'currency' }, { name: 'Tax', type: 'currency' }, { name: 'Total', type: 'currency' },
      { name: 'Status', type: 'text', default: 'Due' }, { name: 'Paid On', type: 'date' }, { name: 'Method', type: 'text', default: 'Direct debit' },
    ] },
    { name: 'Invoice Lines', fields: [
      { name: 'Invoice', ...ref('Invoices'), required: true }, { name: 'Description', type: 'text' }, { name: 'Kind', type: 'text' },
      { name: 'Quantity', type: 'integer', default: 1 }, { name: 'Unit Price', type: 'currency' }, { name: 'Tax Rate', type: 'number', default: 0.2 },
    ] },
    { name: 'Payments', fields: [
      { name: 'Invoice', ...ref('Invoices'), required: true }, { name: 'Taken On', type: 'date' }, { name: 'Method', type: 'text' },
      { name: 'Amount', type: 'currency' }, { name: 'Result', type: 'text' }, { name: 'Reason', type: 'text' },
    ] },
    { name: 'Classes', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Description', type: 'text' }, { name: 'Minutes', type: 'integer', default: 45 },
      { name: 'Capacity', type: 'integer' }, { name: 'Studio', type: 'text' },
    ] },
    { name: 'Class Sessions', fields: [
      { name: 'Class', ...ref('Classes'), required: true }, { name: 'Instructor', ...ref('Staff') }, { name: 'Starts', type: 'datetime' },
      { name: 'Studio', type: 'text' }, { name: 'Capacity', type: 'integer' }, { name: 'Places Booked', type: 'integer', default: 0 },
      { name: 'Instructor Fee', type: 'currency' }, { name: 'Status', type: 'text', default: 'Scheduled' },
    ] },
    { name: 'Bookings', fields: [
      { name: 'Session', ...ref('Class Sessions'), required: true }, { name: 'Member', ...ref('Members'), required: true },
      { name: 'Booked At', type: 'datetime' }, { name: 'Status', type: 'text', default: 'Booked' },
    ] },
    { name: 'Visits', fields: [
      { name: 'Member', ...ref('Members'), required: true }, { name: 'Visited At', type: 'datetime' }, { name: 'Entry', type: 'text', default: 'Gym floor' },
    ] },
    { name: 'PT Packs', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Member', ...ref('Members'), required: true }, { name: 'Trainer', ...ref('Staff') },
      { name: 'Bought On', type: 'date' }, { name: 'Sessions', type: 'integer' }, { name: 'Price', type: 'currency' }, { name: 'Tax Rate', type: 'number', default: 0.2 },
      { name: 'Paid By', type: 'text' }, { name: 'Expires', type: 'date' }, { name: 'Sessions Used', type: 'integer', default: 0 }, { name: 'Status', type: 'text', default: 'Open' },
    ] },
    { name: 'PT Sessions', fields: [
      { name: 'Pack', ...ref('PT Packs'), required: true }, { name: 'Trainer', ...ref('Staff') }, { name: 'Session At', type: 'datetime' },
      { name: 'Status', type: 'text', default: 'Booked' }, { name: 'Trainer Fee', type: 'currency' },
    ] },
  ],
  queries: {
    'Classes in the next 7 days': { tables: ['Class Sessions', 'Classes', 'Staff'], columns: [
      { table: 'Class Sessions', field: 'Starts', sort: 'asc' }, { expr: 'Format([Starts], "yyyy-mm-dd")', as: 'Day' }, { expr: 'Mid([Starts], 12, 5)', as: 'Time' },
      { table: 'Classes', field: 'Name', as: 'Class' }, { expr: NAME, as: 'Instructor' }, { table: 'Class Sessions', field: 'Studio' },
      { table: 'Class Sessions', field: 'Capacity' }, { table: 'Class Sessions', field: 'Places Booked', as: 'Booked' },
      { expr: '[Class Sessions].[Capacity] - [Places Booked]', as: 'Free Places', criteria: ['> 0'] },
      { expr: AHEAD('Starts'), as: 'Days Ahead', criteria: ['Between 0 And 7'], show: false },
      { table: 'Class Sessions', field: 'Status', criteria: ['Scheduled'], show: false },
    ] },
    'Class register': { tables: ['Bookings', 'Class Sessions', 'Classes', 'Members'], columns: [
      { expr: '[Classes].[Name] & ", " & Format([Starts], "yyyy-mm-dd") & " " & Mid([Starts], 12, 5)', as: 'Class' },
      { table: 'Class Sessions', field: 'Starts', sort: 'asc', show: false }, { table: 'Members', field: 'Last Name', sort: 'asc', show: false },
      { expr: NAME, as: 'Member' }, { table: 'Members', field: 'Number', as: 'Member No' }, { table: 'Members', field: 'Phone' },
      { table: 'Bookings', field: 'Booked At' }, { table: 'Bookings', field: 'Status', criteria: ['Booked'], show: false },
      { expr: AHEAD('Starts'), as: 'Days Ahead', criteria: ['Between 0 And 7'], show: false },
    ] },
    'Payments to chase': { tables: ['Invoices', 'Members'], columns: [
      { table: 'Invoices', field: 'Number', as: 'Invoice' }, { expr: NAME, as: 'Member' }, { table: 'Members', field: 'Phone' }, { table: 'Members', field: 'E-mail' },
      { table: 'Invoices', field: 'Due Date', sort: 'asc' }, { table: 'Invoices', field: 'Total' }, { table: 'Invoices', field: 'Status', criteria: ['In ("Retry due", "Failed")'] },
      { expr: AGO('Due Date'), as: 'Days Overdue' },
    ] },
    'Not seen for 30 days': { tables: ['Members', 'Plans', 'Visits'], columns: [
      { expr: NAME, as: 'Member', total: 'group' }, { table: 'Members', field: 'Number', as: 'Member No', total: 'group' },
      { table: 'Plans', field: 'Name', as: 'Plan', total: 'group' }, { table: 'Members', field: 'Phone', total: 'group' }, { table: 'Members', field: 'E-mail', total: 'group' },
      { table: 'Visits', field: 'Visited At', as: 'Last Visit', total: 'max' },
      { expr: AGO('Visited At'), as: 'Days Since', total: 'min', criteria: ['>= 30'], sort: 'desc' },
      { table: 'Members', field: 'Status', total: 'where', criteria: ['Active'] },
    ] },
    'Attendance by class': { tables: ['Bookings', 'Class Sessions', 'Classes'], columns: [
      { table: 'Classes', field: 'Name', as: 'Class', total: 'group', sort: 'asc' }, { table: 'Bookings', field: 'ID', as: 'Booked', total: 'count' },
      { expr: 'IIf([Bookings].[Status] = "Attended", 1, 0)', as: 'Came', total: 'sum' },
      { expr: 'IIf([Bookings].[Status] = "No-show", 1, 0)', as: 'No-shows', total: 'sum' },
      { expr: 'IIf([Bookings].[Status] = "Cancelled", 1, 0)', as: 'Cancelled', total: 'sum' },
      { table: 'Class Sessions', field: 'Status', total: 'where', criteria: ['Held'] },
      { expr: AGO('Starts'), as: 'Days Ago', total: 'where', criteria: ['Between 0 And 365'] },
    ] },
    'Instructor pay': { tables: ['Class Sessions', 'Staff'], columns: [
      { expr: 'Format([Starts], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { expr: NAME, as: 'Instructor', total: 'group', sort: 'asc' },
      { table: 'Class Sessions', field: 'ID', as: 'Classes', total: 'count' }, { table: 'Class Sessions', field: 'Instructor Fee', as: 'Pay', total: 'sum' },
      { table: 'Class Sessions', field: 'Status', total: 'where', criteria: ['Held'] },
    ] },
    'Trainer pay': { tables: ['PT Sessions', 'Staff'], columns: [
      { expr: 'Format([Session At], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { expr: NAME, as: 'Trainer', total: 'group', sort: 'asc' },
      { table: 'PT Sessions', field: 'ID', as: 'Sessions', total: 'count' }, { table: 'PT Sessions', field: 'Trainer Fee', as: 'Pay', total: 'sum' },
      { table: 'PT Sessions', field: 'Status', total: 'where', criteria: ['In ("Done", "No-show")'] },
    ] },
    'Plan mix': { tables: ['Members', 'Plans'], columns: [
      { table: 'Plans', field: 'Name', as: 'Plan', total: 'group', sort: 'asc' }, { table: 'Members', field: 'ID', as: 'Members', total: 'count' },
      { table: 'Plans', field: 'Monthly Fee', as: 'Fee', total: 'max' },
      { expr: 'IIf([Status] = "Frozen", [Freeze Fee], [Members].[Monthly Fee])', as: 'Monthly Income', total: 'sum' },
      { table: 'Members', field: 'Status', total: 'where', criteria: ['In ("Active", "Frozen")'] },
    ] },
    'Income by month': { tables: ['Invoices'], columns: [
      { expr: 'Format([Paid On], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Invoices', field: 'ID', as: 'Invoices', total: 'count' },
      { table: 'Invoices', field: 'Net', as: 'Before VAT', total: 'sum' }, { table: 'Invoices', field: 'Tax', as: 'VAT', total: 'sum' },
      { table: 'Invoices', field: 'Total', as: 'Taken', total: 'sum' }, { table: 'Invoices', field: 'Status', total: 'where', criteria: ['Paid'] },
    ] },
    'Income by kind': { tables: ['Invoice Lines', 'Invoices'], columns: [
      { table: 'Invoice Lines', field: 'Kind', total: 'group' }, { table: 'Invoice Lines', field: 'ID', as: 'Lines', total: 'count' },
      { expr: LINE, as: 'Taken', total: 'sum', sort: 'desc' }, { table: 'Invoices', field: 'Status', total: 'where', criteria: ['Paid'] },
      { expr: AGO('Paid On'), as: 'Days Ago', total: 'where', criteria: ['Between 0 And 365'] },
    ] },
    'PT packs sold': { tables: ['PT Packs'], columns: [
      { expr: 'Format([Bought On], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'PT Packs', field: 'ID', as: 'Packs', total: 'count' },
      { table: 'PT Packs', field: 'Sessions', as: 'Sessions', total: 'sum' }, { table: 'PT Packs', field: 'Price', as: 'Takings', total: 'sum' },
    ] },
    'PT packs running low': { tables: ['PT Packs', 'Members', 'Staff'], columns: [
      { table: 'PT Packs', field: 'Number', as: 'Pack' }, { expr: '[Members].[First Name] & " " & [Members].[Last Name]', as: 'Member' },
      { table: 'Members', field: 'Phone' }, { expr: '[Staff].[First Name] & " " & [Staff].[Last Name]', as: 'Trainer' },
      { table: 'PT Packs', field: 'Sessions' }, { table: 'PT Packs', field: 'Sessions Used', as: 'Used' },
      { expr: '[Sessions] - [Sessions Used]', as: 'Left', criteria: ['Between 1 And 3'] }, { table: 'PT Packs', field: 'Expires', sort: 'asc' },
      { table: 'PT Packs', field: 'Status', criteria: ['Open'], show: false },
    ] },
    'Freezes now and coming': { tables: ['Freezes', 'Members'], columns: [
      { table: 'Freezes', field: 'Starts', sort: 'asc' }, { table: 'Freezes', field: 'Ends' }, { expr: NAME, as: 'Member' },
      { table: 'Members', field: 'Number', as: 'Member No' }, { table: 'Freezes', field: 'Reason' }, { table: 'Freezes', field: 'Monthly Fee', as: 'Freeze Fee' },
      { expr: 'DateDiff("d", Date(), [Freezes].[Ends])', as: 'Days Left', criteria: ['>= 0'], show: false },
    ] },
    'Members in notice': { tables: ['Members', 'Plans'], columns: [
      { table: 'Members', field: 'Ends', sort: 'asc' }, { expr: NAME, as: 'Member' }, { table: 'Members', field: 'Number', as: 'Member No' },
      { table: 'Plans', field: 'Name', as: 'Plan' }, { table: 'Members', field: 'Joined' }, { table: 'Members', field: 'Cancel Requested' },
      { expr: AHEAD('Ends'), as: 'Days Left', criteria: ['>= 0'] }, { table: 'Members', field: 'Phone' },
      { table: 'Members', field: 'Cancel Requested', as: 'Gave Notice', criteria: ['Is Not Null'], show: false },
    ] },
    'New members by month': { tables: ['Members', 'Plans'], columns: [
      { expr: 'Format([Joined], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Plans', field: 'Name', as: 'Plan', total: 'group', sort: 'asc' },
      { table: 'Members', field: 'ID', as: 'Joined', total: 'count' }, { expr: AGO('Joined'), as: 'Days Ago', total: 'where', criteria: ['Between 0 And 400'] },
    ] },
  },
  reports: [
    { name: 'Classes with places', title: 'Classes in the next 7 days with places free', query: 'Classes in the next 7 days', group: 'Day', columns: ['Time', 'Class', 'Instructor', 'Studio', { field: 'Capacity', type: 'integer' }, { field: 'Booked', type: 'integer' }, { field: 'Free Places', type: 'integer' }], totals: [{ field: 'Free Places', fn: 'sum' }] },
    { name: 'Class registers', title: 'Class registers for the next 7 days', query: 'Class register', group: 'Class', columns: ['Member', 'Member No', 'Phone'], totals: [{ field: 'Member', fn: 'count' }] },
    { name: 'Payments to chase', query: 'Payments to chase', columns: ['Invoice', 'Member', 'Phone', 'Status', { field: 'Due Date', type: 'date' }, { field: 'Days Overdue', type: 'integer' }, { field: 'Total', type: 'currency' }], totals: [{ field: 'Total', fn: 'sum' }] },
    { name: 'Members to win back', title: 'Members not seen for 30 days', query: 'Not seen for 30 days', columns: ['Member', 'Member No', 'Plan', 'Phone', 'Last Visit', { field: 'Days Since', type: 'integer' }], totals: [{ field: 'Member', fn: 'count' }] },
    { name: 'Instructor pay by month', query: 'Instructor pay', group: 'Month', columns: ['Instructor', { field: 'Classes', type: 'integer' }, { field: 'Pay', type: 'currency' }], totals: [{ field: 'Classes', fn: 'sum' }, { field: 'Pay', fn: 'sum' }] },
    { name: 'Trainer pay by month', query: 'Trainer pay', group: 'Month', columns: ['Trainer', { field: 'Sessions', type: 'integer' }, { field: 'Pay', type: 'currency' }], totals: [{ field: 'Sessions', fn: 'sum' }, { field: 'Pay', fn: 'sum' }] },
    { name: 'Plan mix', title: 'Members and monthly income by plan', query: 'Plan mix', columns: ['Plan', { field: 'Members', type: 'integer' }, { field: 'Fee', type: 'currency' }, { field: 'Monthly Income', type: 'currency' }], totals: [{ field: 'Members', fn: 'sum' }, { field: 'Monthly Income', fn: 'sum' }] },
    { name: 'Monthly income', query: 'Income by month', columns: ['Month', { field: 'Invoices', type: 'integer' }, { field: 'Before VAT', type: 'currency' }, { field: 'VAT', type: 'currency' }, { field: 'Taken', type: 'currency' }], totals: [{ field: 'Before VAT', fn: 'sum' }, { field: 'VAT', fn: 'sum' }, { field: 'Taken', fn: 'sum' }] },
    { name: 'Attendance', title: 'Class attendance over the last year', query: 'Attendance by class', columns: ['Class', { field: 'Booked', type: 'integer' }, { field: 'Came', type: 'integer' }, { field: 'No-shows', type: 'integer' }, { field: 'Cancelled', type: 'integer' }], totals: [{ field: 'Booked', fn: 'sum' }, { field: 'Came', fn: 'sum' }] },
    { name: 'PT packs to renew', title: 'Personal training packs running low', query: 'PT packs running low', group: 'Trainer', columns: ['Pack', 'Member', 'Phone', { field: 'Sessions', type: 'integer' }, { field: 'Left', type: 'integer' }, { field: 'Expires', type: 'date' }], totals: [{ field: 'Left', fn: 'sum' }] },
  ],
  documents: [
    // The agreement a member signs at the desk: for memberships still running (active, frozen or in notice), not those cancelled or lapsed.
    { name: 'Membership agreement', table: 'Members', where: '[Status] <> "Cancelled" And [Status] <> "Lapsed"', paper: 'a4', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'Membership agreement' },
      { type: 'fields', columns: 2, items: [
        { field: 'Number', label: 'Membership no' }, { field: 'Joined', label: 'Start date', format: 'd mmmm yyyy' },
        { field: 'First Name' }, { field: 'Last Name' }, { field: 'Date of Birth', format: 'd mmmm yyyy' }, { field: 'Phone' },
        { field: 'Address' }, { field: 'City', label: 'Town' }, { field: 'Postcode' }, { field: 'Plan.Name', label: 'Plan' },
        { field: 'Monthly Fee', label: 'Monthly fee', format: '#,##0.00' }, { field: 'Plan.Joining Fee', label: 'Joining fee', format: '#,##0.00' },
        { field: 'Payment Day', label: 'Payment day each month' }, { field: 'Minimum Term Ends', label: 'Minimum term ends', format: 'd mmmm yyyy' },
        { field: 'Plan.Freeze Fee', label: 'Freeze fee a month', format: '#,##0.00' }, { field: 'Health Declaration', label: 'Health questions done' },
        { field: 'Emergency Contact' }, { field: 'Emergency Phone' },
      ] },
      { type: 'text', text: '1. The parties. This agreement is between {Business.Name} of {Business.Address}, {Business.City} {Business.Postcode} ("the gym") and {First Name} {Last Name} of {Address}, {City} {Postcode} ("the member"). It starts on the start date above.' },
      { type: 'text', text: '2. The plan. The member joins on the {Plan.Name} plan: {Plan.Description}. The member may use the gym {Plan.Access Hours}. A family plan covers the people named on it at one address, and the member who signs pays the fees for all of them.' },
      { type: 'text', text: '3. Fees. The joining fee and the first month\'s fee, both shown above, are paid on joining. After that the monthly fee is collected by direct debit on day {Payment Day} of each month. Prices include VAT. If a payment fails, the gym tries again five days later; if that fails too, the member\'s card stops opening the door until the amount is paid at the desk. The gym gives at least a month\'s notice in writing of any change to the fee.' },
      { type: 'text', text: '4. Minimum term. The plan has a minimum term of {Plan.Minimum Months} months, ending on the day shown above, and the monthly fee is paid for the whole of it. The gym will let a member leave early for a serious illness or injury, or a move of more than 20 miles away, if they show evidence of it.' },
      { type: 'text', text: '5. Freezing. The member may freeze the membership for one to three months in any twelve, from a payment day, by asking at the desk at least ten days before it. While it is frozen the member pays the freeze fee shown above instead of the monthly fee, and cannot use the gym or book classes.' },
      { type: 'text', text: '6. Cancelling. The member may cancel at any time, in person at the desk or in writing, giving {Plan.Notice Months} month\'s notice. The membership then ends the day before the first payment day that is at least that far ahead, or at the end of the minimum term if that is later; fees up to that day are still due. The gym may end a membership at once if the member seriously or repeatedly breaks the rules below.' },
      { type: 'text', text: '7. Health. The member confirms that their answers to the health questions are true, that they will tell staff of any change, and that they will stop and ask for help if they feel unwell while exercising. Anyone with a health condition should ask their doctor before starting a new kind of exercise.' },
      { type: 'text', text: 'The health questions are not answered yet. The member may not use the gym floor or join a class until they have answered them at the desk.', if: 'Nz([Health Declaration], 0) = 0' },
      { type: 'text', text: '8. The rules. Show your card at the door and do not let anyone in on it. Wipe equipment down after use and put weights back. Wear clean indoor shoes on the gym floor. Classes are booked up to seven days ahead; a place not cancelled at least two hours before counts as a no-show, and three no-shows in a month stop booking for a fortnight. Children aged 14 to 17 on a family plan use the gym floor only with an adult on the same plan. Lockers are emptied each night.' },
      { type: 'text', text: '9. Personal details. The gym keeps the member\'s details to run the membership, collect the fees and contact them about it. It passes them to no one but its bank, for the direct debit. The member may ask to see what is kept about them.' },
      { type: 'text', text: '10. Belongings and injury. The gym is not responsible for belongings left in the building unless it has been careless with them. Nothing here limits the gym\'s responsibility for injury caused by its own negligence.' },
      { type: 'spacer', size: 24 },
      { type: 'signatures', labels: ['Member', 'For the gym'] },
      { type: 'text', text: '{Business.Name}, {Business.Address}, {Business.City} {Business.Postcode}. VAT number {Business.Tax Number}.', small: true },
    ] },
    // The card a member shows at the door: only for members who can come in (active, or frozen and coming back).
    { name: 'Membership card', table: 'Members', where: '[Status] = "Active" Or [Status] = "Frozen"', paper: 'receipt-58', letterhead: { table: 'Business', fields: ['Name', 'Phone'] }, blocks: [
      { type: 'heading', text: '{First Name} {Last Name}' },
      { type: 'fields', columns: 1, items: [
        { field: 'Number', label: 'Member no' }, { field: 'Plan.Name', label: 'Plan' }, { field: 'Joined', label: 'Member since', format: 'mmmm yyyy' }, { field: 'Plan.Access Hours', label: 'Access' },
      ] },
      { type: 'text', text: 'Show this card at the door. It is for the named member only. A lost card is replaced at the desk.', small: true },
    ] },
    // A letter handed over or posted when someone joins: members who joined in the last 30 days and have not left.
    { name: 'Welcome letter', table: 'Members', where: 'DateDiff("d", [Joined], Date()) <= 30 And [Status] <> "Cancelled"', paper: 'a4', letterhead: LETTERHEAD, blocks: [
      { type: 'fields', columns: 2, items: [
        { field: 'First Name' }, { field: 'Number', label: 'Membership no' }, { field: 'Last Name' }, { field: 'Joined', label: 'Joined on', format: 'd mmmm yyyy' },
        { field: 'Address' }, { field: 'Plan.Name', label: 'Plan' }, { field: 'City', label: 'Town' }, { field: 'Monthly Fee', label: 'Monthly fee', format: '#,##0.00' },
        { field: 'Postcode' }, { field: 'Minimum Term Ends', label: 'Minimum term ends', format: 'd mmmm yyyy' },
      ] },
      { type: 'heading', text: 'Welcome to {Business.Name}' },
      { type: 'text', text: 'Dear {First Name},' },
      { type: 'text', text: 'Thank you for joining us, and welcome. Your membership number is {Number}, and it is on your card; show the card at the door each time you come in. On the {Plan.Name} plan you can use the gym {Plan.Access Hours}.' },
      { type: 'text', text: 'Your monthly fee, shown above, will be collected by direct debit on day {Payment Day} of each month, and an invoice comes by e-mail ten days before. Once your minimum term ends on the date above, you can cancel with a month\'s notice; you can also freeze for up to three months if you are injured or away.' },
      { type: 'text', text: 'Before your first visit, please answer the health questions at the desk: we cannot let you on the gym floor or into a class until you have.', if: 'Nz([Health Declaration], 0) = 0' },
      { type: 'text', text: 'Your first visit should be a gym induction with one of our instructors, which is free and takes about forty minutes: ask at the desk or call {Business.Phone} to book one. Classes are on the timetable by the door and can be booked up to seven days ahead; please cancel at least two hours before if you cannot come, so someone else can have the place.' },
      { type: 'text', text: 'If you would like a programme of your own, our personal trainers sell sessions in packs of five, ten or twenty, and your first consultation with one is free.' },
      { type: 'text', text: 'We are glad to have you. If anything is not right, tell any of us, or write to {Business.E-mail}.' },
      { type: 'text', text: 'With best wishes,' },
      { type: 'spacer', size: 24 },
      { type: 'signatures', labels: ['Gym manager'] },
      { type: 'text', text: '{Business.Document Footer}', small: true },
    ] },
    // Each month's invoice, with the VAT within the price; one written off is not sent again.
    { name: 'Monthly invoice', table: 'Invoices', where: '[Status] <> "Written off"', paper: 'a4', letterhead: { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'E-mail', 'Tax Number'] }, blocks: [
      { type: 'heading', text: 'Invoice {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Member', label: 'Member' }, { field: 'Number', label: 'Invoice no' },
        { field: 'Member.Address', label: 'Address' }, { field: 'Invoice Date', label: 'Invoice date', format: 'dd/mm/yyyy' },
        { field: 'Member.City', label: 'Town' }, { field: 'Due Date', label: 'Collected on', format: 'dd/mm/yyyy' },
        { field: 'Member.Postcode', label: 'Postcode' }, { field: 'Member.Number', label: 'Member no' },
        { field: 'Period From', label: 'Period from', format: 'dd/mm/yyyy' }, { field: 'Period To', label: 'Period to', format: 'dd/mm/yyyy' },
        { field: 'Status' }, { field: 'Paid On', label: 'Paid on', format: 'dd/mm/yyyy', if: '[Paid On]' },
      ] },
      { type: 'lines', table: 'Invoice Lines', link: 'Invoice', columns: [
        { field: 'Description' }, { field: 'Quantity', type: 'integer' }, { field: 'Unit Price', type: 'currency' },
        { expr: LINE, as: 'Amount', type: 'currency' }, { expr: '[Tax Rate] * 100', as: 'VAT %', format: '0' }, { expr: VAT_IN, as: 'VAT Included', label: 'VAT included', type: 'currency' },
      ] },
      { type: 'totals', rows: [
        { label: 'Price before VAT', expr: '[Amount] - [VAT Included]' }, { label: 'VAT included', expr: '[VAT Included]' },
        { label: 'Total', expr: '[Amount]', strong: true },
      ] },
      // What the member is asked to do, by where the payment stands.
      { type: 'text', text: '{Business.Payment Terms}', small: true, if: '[Status] = "Due"' },
      { type: 'text', text: 'Paid, with thanks.', small: true, if: '[Status] = "Paid"' },
      { type: 'text', text: 'The direct debit on the collection day did not go through. We will try again five days later: please make sure the money is in your account.', small: true, if: '[Status] = "Retry due"' },
      { type: 'text', text: 'Both tries at the direct debit failed. Please pay this invoice at the desk or call {Business.Phone}; until it is paid your card will not open the door.', small: true, if: '[Status] = "Failed"' },
      { type: 'text', text: 'Prices include VAT. VAT number {Business.Tax Number}. {Business.Document Footer}', small: true },
    ] },
    // The till receipt for a pack of personal training.
    { name: 'PT pack receipt', table: 'PT Packs', paper: 'receipt-80', letterhead: { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'Tax Number'] }, blocks: [
      { type: 'heading', text: 'Receipt {Number}' },
      { type: 'fields', columns: 1, items: [
        { field: 'Bought On', label: 'Date', format: 'dd/mm/yyyy' }, { field: 'Member', label: 'Member' }, { field: 'Member.Number', label: 'Member no' },
        { field: 'Trainer', label: 'Trainer' }, { field: 'Sessions', label: 'Personal training sessions' }, { field: 'Expires', label: 'Use by', format: 'dd/mm/yyyy' },
        { field: 'Paid By', label: 'Paid by' },
      ] },
      { type: 'totals', rows: [
        { label: 'Price per session', expr: 'Round([Price] / [Sessions], 2)' },
        { label: 'VAT rate, %', expr: '[Tax Rate] * 100', format: '0' },
        { label: 'VAT included', expr: 'Round([Price] - [Price] / (1 + [Tax Rate]), 2)' },
        { label: 'Total paid', expr: '[Price]', strong: true },
      ] },
      { type: 'text', text: 'Book your sessions with {Trainer} at the desk or on {Business.Phone}. A session cancelled with less than 24 hours\' notice counts as used. Sessions not used by the use-by date end then and are not refunded.' },
      { type: 'text', text: 'Prices include VAT. VAT number {Business.Tax Number}. Thank you.', small: true },
    ] },
  ],
};

export const about = {
  name: 'Tannery Yard Fitness',
  kind: 'Gym and fitness studio',
  line: 'Members on monthly plans, direct debits, classes and bookings, personal training packs and visits for an independent gym.',
  summary: [
    'For an independent gym, a fitness studio or a club with a timetable: one database for the members and what they pay, the classes and who books them, personal training, and who has stopped coming.',
    'Tannery Yard Fitness is an invented gym and studio in Leeds with a gym floor, a main studio and a cycle studio. Members join on one of four monthly plans, pay a joining fee, and then pay by direct debit on the day of the month they joined. A weekly timetable of about twenty-five classes is taught by self-employed instructors paid by the class, and three trainers sell personal training in packs of five, ten or twenty sessions.',
    'The records cover about twelve months up to today, and the fortnight ahead: next week\'s classes with places already booked, personal training sessions on the diary, and the next month\'s fees invoiced. A few direct debits fail each month and are tried again; most are then paid at the desk and a few are written off. Members freeze, give notice and leave, and some keep paying long after their last visit, which the gym wants to know about before they cancel.',
  ],
  suits: [
    'A boxing or martial arts club with monthly members',
    'A yoga or pilates studio with a class timetable',
    'A climbing wall or swimming club',
    'A dance school with termly or monthly fees',
    'A personal training studio selling session packs',
    'A leisure centre run by a community trust',
  ],
  tables: {
    Business: BUSINESS_ABOUT,
    Plans: { about: 'The memberships on offer, what each costs and its terms. Enter these first.', fields: {
      Name: 'The plan\'s name, such as Off-peak or Family. Each name is used once.',
      'Monthly Fee': 'What the plan costs a month, with VAT in it, as the price list shows it.',
      'Joining Fee': 'The one-off fee paid on joining, with VAT in it; nought for none.',
      'Minimum Months': 'How many months a new member pays before they may leave.',
      'Notice Months': 'How many months\' notice a member gives to cancel.',
      'Freeze Fee': 'What a member pays a month while their membership is frozen.',
      'Access Hours': 'When the plan lets a member in, in words that follow "may use the gym": printed on the card, the agreement and the welcome letter.',
      'Tax Rate': 'The VAT in the plan\'s prices, as a fraction: 0.2 is twenty percent.',
      Description: 'Who the plan is for and what it covers.',
    } },
    Staff: { about: 'Everyone who works at the gym: the manager, the desk, the class instructors and the personal trainers.', fields: {
      'First Name': 'Their first name.', 'Last Name': 'Their family name.',
      Role: 'What they do, such as Class instructor or Personal trainer.',
      Phone: 'Their phone number, for the rota and cover.', 'E-mail': 'Their e-mail address.',
      'Class Rate': 'What an instructor is paid for each class they teach; empty for staff who teach none.',
      'Session Rate': 'What a trainer is paid for each personal training session; empty for staff who give none.',
      Started: 'The day they started.',
    } },
    Members: { about: 'One record per member, past and present, with their plan, fee, payment day and where their membership stands.', fields: {
      Number: 'The membership number, printed on the card and quoted when they call: MEM-2026-0042. Given in the order members join, a new run each year.',
      'First Name': 'Their first name.', 'Last Name': 'Their family name; lists are sorted by it.',
      'Date of Birth': 'Their date of birth: members must be 16 or over, or 14 on a family plan.',
      Address: 'House number and street.', City: 'The town or city.', Postcode: 'The postcode.',
      Phone: 'A phone number.', 'E-mail': 'Where invoices and booking reminders go.',
      Plan: 'The plan they are on.',
      'Monthly Fee': 'What they pay a month, kept here so a later change to the plan\'s price does not alter what they agreed.',
      Joined: 'The day they joined and paid the joining fee.',
      'Payment Day': 'The day of the month their fee is collected, the day they joined (the 28th for anyone who joined on the 29th, 30th or 31st).',
      'Minimum Term Ends': 'The last day of their minimum term.',
      Status: 'Active (including members working out their notice), Frozen, Cancelled once their notice has run out, or Lapsed when they stopped paying.',
      'Cancel Requested': 'The day they gave notice; empty for a member who has not.',
      Ends: 'The last day of the membership, once they have given notice or lapsed.',
      'Health Declaration': 'Ticked when they have answered the health questions on joining.',
      'Emergency Contact': 'Who to call if they are taken ill.',
      'Emergency Phone': 'That person\'s phone number.',
      Notes: 'Anything staff should know, such as an injury to work around or the others on a family plan.',
    } },
    Freezes: { about: 'Each time a member freezes their membership: one to three months from a payment day, at the plan\'s freeze fee.', fields: {
      Member: 'The member.', Starts: 'The first day of the freeze, a payment day.', Ends: 'The last day of the freeze.',
      Reason: 'Why, such as an injury or travel.', 'Monthly Fee': 'The fee charged a month while frozen.',
    } },
    Invoices: { about: 'An invoice for each month\'s fee, raised ten days before the payment day, and one when a member joins with the joining fee and first month.', fields: {
      Number: 'The invoice number: INV-2026-0042, given in date order, a new run each year.',
      Member: 'Who it is for.', 'Invoice Date': 'The day it was raised.',
      'Period From': 'The first day the fee covers.', 'Period To': 'The last day the fee covers.',
      'Due Date': 'The payment day it is collected on.',
      Net: 'The total before VAT.', Tax: 'The VAT within the total, each line\'s worked out to the penny and then added up.', Total: 'What is collected, VAT in it.',
      Status: 'Due (not collected yet), Paid, Retry due (the first try failed), Failed (both tries failed, to chase) or Written off.',
      'Paid On': 'The day the money came in; empty until then.',
      Method: 'How it was paid: Direct debit, Card on joining, or Card at the desk after a failed collection.',
    } },
    'Invoice Lines': { about: 'The lines on each invoice.', fields: {
      Invoice: 'The invoice the line is on.', Description: 'What it is for, with the dates it covers.',
      Kind: 'Membership, Freeze fee or Joining fee, for counting income by kind.',
      Quantity: 'How many, usually 1.', 'Unit Price': 'The price with VAT in it.', 'Tax Rate': 'The VAT rate in the price, as a fraction, taken from the plan.',
    } },
    Payments: { about: 'Every try at taking money for an invoice, collected or not, as the bank reports it: a failed direct debit and its second try are both here.', fields: {
      Invoice: 'The invoice it was for.', 'Taken On': 'The day of the try.', Method: 'Direct debit, or Card at the desk.',
      Amount: 'How much was asked for.', Result: 'Collected or Failed.', Reason: 'Why it failed, as the bank gives it; empty when collected.',
    } },
    Classes: { about: 'The classes on the timetable, one record each, whatever day they run.', fields: {
      Name: 'The class\'s name, as on the timetable.', Description: 'What the class is, for the timetable and website.',
      Minutes: 'How long it lasts.', Capacity: 'How many places it usually has.', Studio: 'Where it is usually held.',
    } },
    'Class Sessions': { about: 'Each time a class runs, past and on the timetable for the fortnight ahead.', fields: {
      Class: 'The class.', Instructor: 'Who teaches it, or covers it.', Starts: 'The day and time it starts.',
      Studio: 'Where it is held.', Capacity: 'How many places it has this time.',
      'Places Booked': 'How many places are taken, kept up to date as members book and cancel, so free places show at a glance.',
      'Instructor Fee': 'What the instructor is paid for it, from their class rate on the day.',
      Status: 'Scheduled, Held or Cancelled.',
    } },
    Bookings: { about: 'Each place a member books in a class.', fields: {
      Session: 'The class session booked.', Member: 'Who booked.', 'Booked At': 'When they booked.',
      Status: 'Booked (still to come), Attended, No-show or Cancelled.',
    } },
    Visits: { about: 'Every time a member comes through the door, as the door reader records it.', fields: {
      Member: 'Who came in.', 'Visited At': 'The day and time.', Entry: 'Gym floor, or Class when they came for a class.',
    } },
    'PT Packs': { about: 'Packs of personal training sessions sold to members, each with a trainer and a use-by date.', fields: {
      Number: 'The receipt number: PT-2026-0042, given in date order, a new run each year.',
      Member: 'Who bought it.', Trainer: 'The trainer the sessions are with.', 'Bought On': 'The day it was sold.',
      Sessions: 'How many sessions are in it.', Price: 'What it cost, VAT in it.', 'Tax Rate': 'The VAT rate in the price, as a fraction.',
      'Paid By': 'Card or cash.', Expires: 'The last day its sessions can be used.',
      'Sessions Used': 'Sessions given or missed without notice so far, kept up to date as they happen.',
      Status: 'Open, Used up or Expired.',
    } },
    'PT Sessions': { about: 'Each personal training session, given, missed or booked ahead.', fields: {
      Pack: 'The pack it comes out of.', Trainer: 'Who gives it.', 'Session At': 'The day and time.',
      Status: 'Booked, Done, No-show (missed without notice, so it counts as used) or Cancelled (with notice, so it does not).',
      'Trainer Fee': 'What the trainer is paid for it, from their session rate.',
    } },
  },
  queries: {
    'Classes in the next 7 days': 'Classes on the timetable for the next week that still have places, with how many are booked and free. For the desk, the website and the weekly e-mail.',
    'Class register': 'Everyone booked into each class in the next 7 days, with their membership number and phone, for the instructor\'s register.',
    'Payments to chase': 'Invoices whose direct debit failed, either waiting for the second try or failed twice, with the member\'s phone and e-mail and how long ago the payment was due.',
    'Not seen for 30 days': 'Active members whose last visit was 30 days ago or more, the longest gone first. These are the members most likely to cancel; a call or a free session often brings them back.',
    'Attendance by class': 'For each class over the last year: places booked, how many came, no-shows and late cancellations. Shows which classes to add to and which to change.',
    'Instructor pay': 'The classes each instructor taught each month and what they are owed for them. Cancelled classes are not paid.',
    'Trainer pay': 'The personal training sessions each trainer gave each month, missed ones included, and what they are owed.',
    'Plan mix': 'How many members are on each plan now and what they bring in each month, frozen members at the freeze fee.',
    'Income by month': 'The fees taken each month, before VAT, the VAT, and in all, by the day they were paid.',
    'Income by kind': 'What the last year\'s paid invoices brought in from monthly fees, joining fees and freeze fees.',
    'PT packs sold': 'Personal training packs sold each month, the sessions in them and the takings.',
    'PT packs running low': 'Open personal training packs with three sessions or fewer left, soonest to expire first. The trainer offers the member a new pack.',
    'Freezes now and coming': 'Freezes running now or booked to start, with who, why and to when.',
    'Members in notice': 'Members who have given notice and are working it out, with the day their membership ends. A last chance to ask why and keep them.',
    'New members by month': 'How many joined each month on each plan.',
  },
  reports: {
    'Classes with places': 'The next week\'s classes with free places, day by day: the list for the desk and the noticeboard.',
    'Class registers': 'A register for each class in the next 7 days with who is booked, to tick off at the door.',
    'Payments to chase': 'Failed payments with the member\'s phone and how overdue each is, and the total, for the manager to work through.',
    'Members to win back': 'Members not seen for 30 days or more, with their phone, for calling.',
    'Instructor pay by month': 'Each month\'s classes and pay for each instructor, for paying them.',
    'Trainer pay by month': 'Each month\'s personal training sessions and pay for each trainer.',
    'Plan mix': 'Members and monthly income by plan, with the totals.',
    'Monthly income': 'Fees taken each month, before VAT, VAT and in all, with the totals for the accountant.',
    Attendance: 'Bookings, attendance, no-shows and late cancellations for each class over the last year.',
    'PT packs to renew': 'Packs with three sessions or fewer left, a page for each trainer.',
  },
  documents: {
    'Membership agreement': 'The agreement a member signs, for every membership still running (Active, Frozen, or in notice; not Cancelled or Lapsed): their plan, fees, payment day, minimum term and freeze fee, then numbered clauses on fees, freezing, cancelling with notice, health and the gym\'s rules, and two signatures. A member who has not answered the health questions gets a line saying they cannot train until they do. Written for this sample; have it checked for your own country before you use it.',
    'Membership card': 'A small card with the member\'s name, membership number, plan, the month they joined and the times they may come in, for members who are Active or Frozen.',
    'Welcome letter': 'Handed over or posted when someone joins, for members who joined in the last 30 days and have not cancelled: their membership number, fee and payment day, minimum term, how to book an induction and classes, and personal training, with a reminder to answer the health questions when they have not yet.',
    'Monthly invoice': 'Each month\'s invoice, sent ten days before the payment day: the period it covers, each line with the VAT in its price, and the total collected. The first one has the joining fee on it. Its last words follow the Status: when it will be collected, paid with thanks, a failed payment to be tried again (Retry due), or one to pay at the desk (Failed). Written-off invoices are not printed unless you choose one.',
    'PT pack receipt': 'The till receipt for a pack of personal training: the trainer, the sessions in it, the use-by date, the price per session and the VAT within the price.',
  },
  empty: 'Start with Business: the gym\'s name, address and VAT number, which every document prints. Then Plans (your prices and terms), Staff, and Classes. Enter Members as they join, each with a plan, fee and payment day, and raise their first invoice. Then each week put the timetable into Class Sessions and take Bookings, and each month raise the invoices and record each collection in Payments. Visits come from your door reader, or can be typed at the desk.',
  adapt: [
    'Add a Junior plan with a Minimum Months of nought and a field on Members for the parent who pays.',
    'Keep a waiting list for full classes: a Waiting status on Bookings, and a query of waiting bookings for classes where a place has come free.',
    'Charge for classes on their own, for people who are not members: a Price field on Classes and a Class Payments table.',
    'Record inductions: an Induction Date on Members and a query of members who joined over a week ago and have none.',
    'Track goals for personal training: a Goal field on PT Packs and a Notes field on PT Sessions for what was done.',
    'Raise fees once a year: change Monthly Fee on Plans, and on each member after their written notice, so invoices take the new price.',
    'Pay instructors by attendance as well as by the class: a bonus column in the Instructor pay query worked out from the bookings that came.',
  ],
  tutorial: [
    { title: 'Join a new member', steps: [
      'Open the Members form and press New. Type the next membership number in Number (MEM-2026-0042 after MEM-2026-0041), their name, date of birth, address, phone, e-mail and emergency contact.',
      'Choose their plan in Plan and type its fee in Monthly Fee. Type today in Joined, the day of the month in Payment Day (28 if today is later than the 28th), and the day their minimum term ends in Minimum Term Ends. Tick Health Declaration once they have answered the health questions.',
      'Open the Invoices form and press New for their first invoice: the next number in Number, the member, today as Invoice Date and Due Date, and the dates the first month covers. Add a line for the joining fee and one for the first month, each with Kind and Tax Rate.',
      'Take the payment by card, type today in Paid On, set Status to Paid and Method to Card on joining, and add a Collected line in the Payments form.',
      'Open the print templates Membership agreement, Welcome letter and Membership card from Print templates, choose the new member, and print each one. The member signs the agreement.',
    ] },
    { title: 'Raise and collect the monthly fees', steps: [
      'Each day, open the Members form and find the members whose payment day is ten days away. For each, open the Invoices form, press New, and enter the invoice with one line for the month (or for the freeze fee, if they are frozen then).',
      'Open the print template Monthly invoice, choose the new invoices, and press Save as PDF to e-mail them.',
      'On the payment day, when the bank reports the collections, add a line in the Payments form for each: Collected, or Failed with the reason. Set each invoice\'s Status to Paid with Paid On, or to Retry due.',
      'Five days later, add the second try in Payments. If it fails again, set the invoice to Failed.',
      'Run the query Payments to chase, or print the report Payments to chase, and call each member. When they pay at the desk, add the payment and set the invoice to Paid with Method Card at the desk.',
    ] },
    { title: 'Put the timetable in and take class bookings', steps: [
      'Each week, open the Class Sessions form and press New for each class on the timetable a week or two ahead: the Class, the Instructor, Starts, Studio and Capacity, the instructor\'s rate in Instructor Fee, and Status Scheduled.',
      'When a member books, open the Bookings form and press New: choose the Session and the Member, type the time in Booked At, and Status Booked. Add one to Places Booked on the session; take one off if they cancel.',
      'Run the query Classes in the next 7 days, or print the report Classes with places, for the desk and the noticeboard.',
      'Before each class, print the report Class registers. Afterwards set each booking to Attended or No-show, and the session\'s Status to Held.',
    ] },
    { title: 'Sell a pack of personal training', steps: [
      'Open the PT Packs form and press New. Type the next receipt number in Number (PT-2026-0042), choose the Member and the Trainer, type today in Bought On, the Sessions, Price and Paid By, and the use-by date in Expires. Status is Open.',
      'Open the print template PT pack receipt, choose the pack, and print the receipt for the member.',
      'Book each session in the PT Sessions form: the Pack, the Trainer, Session At, Status Booked and the trainer\'s rate in Trainer Fee. Afterwards set it to Done, No-show or Cancelled, and add one to Sessions Used on the pack for Done or No-show.',
      'Each week run the query PT packs running low, or print the report PT packs to renew, so each trainer can offer a new pack before the last session.',
    ] },
    { title: 'Freeze a membership or take a cancellation', steps: [
      'For a freeze, open the Freezes form and press New: the Member, Starts on their next payment day, Ends one to three months later, the Reason and the plan\'s freeze fee in Monthly Fee. The query Freezes now and coming lists them.',
      'For a cancellation, open the member in the Members form, type today in Cancel Requested, and in Ends the day before the first payment day a month or more ahead (or the end of their minimum term, if that is later).',
      'Run the query Members in notice each week and ask those leaving why. When their Ends day has passed, set their Status to Cancelled.',
    ] },
    { title: 'Win back members who have stopped coming', steps: [
      'Each Monday, run the query Not seen for 30 days, or print the report Members to win back.',
      'Call or e-mail each member on it, longest gone first; offer a free session with a trainer, or a freeze if they are away.',
      'Note what they said in Notes on the Members form.',
    ] },
    { title: 'Pay instructors and trainers, and see the month\'s income', steps: [
      'At the month end, print the report Instructor pay by month for the classes each instructor taught, and the report Trainer pay by month for the personal training sessions.',
      'Print the report Monthly income for the fees taken, with the VAT for the accountant, and run the query PT packs sold for personal training takings.',
      'Print the report Plan mix to see how many members are on each plan and what they bring in each month.',
    ] },
  ],
  notes: [
    'Prices are shown with VAT in them, as the price list on the wall shows them. Each invoice line\'s VAT is worked out from its price to the penny and the lines added up, so an invoice\'s Net and Tax agree with what the Monthly invoice prints.',
    'Places Booked on Class Sessions and Sessions Used on PT Packs are kept up to date by hand as bookings are made, cancelled and used, the way a stock figure is. The free places and packs running low come from them.',
    'Invoice, membership and receipt numbers are typed, one on from the last, with a new run each year. The sample gave them in date order; Data Files does not fill them in for you.',
    'A member who has given notice stays Active until their Ends day has passed, so they still show in Plan mix and still pay. Cancel Requested and Ends tell them apart.',
    'A member whose payment failed twice cannot get in until they pay at the desk. If they never do, their invoice is set to Written off and their Status to Lapsed about a month later.',
    'Every visit comes from the door reader, including members coming for a class, so a member who only comes to classes is not missed by Not seen for 30 days.',
    'Print templates print only the records they are for: the Membership agreement for memberships still running, the Membership card for Active and Frozen members, the Welcome letter for members who joined in the last 30 days, and the Monthly invoice for every invoice not written off. A record you choose from its form always prints, whatever its status.',
    'The gym is closed on Christmas Day and New Year\'s Day, so those days have no visits, classes or training sessions. Fees are still collected on them.',
  ],
  faq: [
    { q: 'How do I print this month\'s invoices only?', a: 'Open the print template Monthly invoice and choose the invoices in the list (sort it by Invoice Date), then press Print or Save as PDF. Or open one in the Invoices form and print it from there.' },
    { q: 'Why does a member show in Not seen for 30 days when they came to a class last week?', a: 'They came in without their card, so the door reader has no visit for them. Add a visit in the Visits form with Entry Class, or ask them to use their card.' },
    { q: 'How do I change a plan\'s price?', a: 'Change Monthly Fee in Plans for new members. Existing members keep the fee in their own Monthly Fee until you change it there, after giving them the month\'s notice the agreement promises.' },
    { q: 'A class shows no free places but someone cancelled. Why?', a: 'Places Booked on the session was not taken down when the booking was cancelled. Open the session in the Class Sessions form and correct it.' },
    { q: 'How do I see how much each instructor is owed?', a: 'Print the report Instructor pay by month: the classes held and their fees for each instructor. Cancelled classes are left out.' },
    { q: 'Can a family plan hold more than one person?', a: 'The family plan is one member record for the person who pays; write the others on it in Notes. To give each their own card and visits, add a Members record for each with a fee of nought and a note of who pays.' },
    { q: 'How do I change the gym\'s address or VAT number on every document?', a: 'Open the Business form and change it there. Every print template takes its letterhead and footer from that one record.' },
  ],
};

/** The plans: [name, monthly fee, joining fee, minimum months, notice months, access, description, weight among joiners]. */
const ANY_TIME = 'at every opening hour, weekdays 06:00 to 22:00 and weekends 08:00 to 18:00';
const PLANS = [
  ['Off-peak', 24.99, 15, 3, 1, 'on weekdays from 09:00 to 16:00, and all day at weekends', 'the gym floor and classes at off-peak times', 3],
  ['Full', 39.99, 20, 6, 1, ANY_TIME, 'the gym floor and every class at any time', 5],
  ['Family', 69.99, 30, 6, 1, ANY_TIME, 'two adults and up to two children aged 14 to 17 at one address, at any time', 1.2],
  ['Student', 21.99, 0, 3, 1, ANY_TIME, 'one student in full-time study with a valid student card, at any time', 1.6],
];
const FREEZE_FEE = 5;

/** The staff: role, and what instructors are paid a class and trainers a session. */
const STAFF = [
  { key: 'M', role: 'Gym manager' }, { key: 'D1', role: 'Front desk' }, { key: 'D2', role: 'Front desk' },
  { key: 'A', role: 'Class instructor', classRate: 28 }, { key: 'B', role: 'Instructor and personal trainer', classRate: 28, ptRate: 22 },
  { key: 'C', role: 'Instructor and personal trainer', classRate: 30, ptRate: 22 }, { key: 'D', role: 'Yoga and pilates teacher', classRate: 32 },
  { key: 'E', role: 'Class instructor', classRate: 30 }, { key: 'F', role: 'Class instructor', classRate: 26 }, { key: 'G', role: 'Personal trainer', ptRate: 24 },
];

/** The classes: [name, minutes, capacity, studio, popularity, description]. */
const CLASSES = [
  ['Spin', 45, 18, 'Cycle studio', 0.85, 'Indoor cycling to music, at your own pace'],
  ['HIIT', 45, 20, 'Main studio', 0.75, 'Short bursts of hard work with short rests'],
  ['Strength and conditioning', 45, 14, 'Main studio', 0.65, 'Barbells, dumbbells and body weight, coached'],
  ['Yoga', 60, 16, 'Main studio', 0.8, 'Flowing yoga for every level'],
  ['Pilates', 50, 14, 'Main studio', 0.8, 'Mat pilates for core strength and posture'],
  ['Boxfit', 45, 16, 'Main studio', 0.7, 'Pad work and boxing drills, no sparring'],
  ['Dance fitness', 45, 20, 'Main studio', 0.6, 'Easy-to-follow dance routines for fitness'],
  ['Mobility and stretch', 45, 14, 'Main studio', 0.45, 'Gentle mobility work, good after an injury'],
  ['Kettlebells', 45, 12, 'Main studio', 0.55, 'Swings, presses and carries with kettlebells'],
  ['Circuits', 45, 18, 'Main studio', 0.6, 'Stations round the studio, a minute each'],
];

/** The weekly timetable: [weekday (0 Sunday), hour, minute, class, instructor]. */
const TIMETABLE = [
  [1, 6, 30, 'Spin', 'A'], [1, 12, 15, 'HIIT', 'B'], [1, 18, 0, 'Strength and conditioning', 'C'], [1, 19, 15, 'Yoga', 'D'],
  [2, 7, 0, 'HIIT', 'B'], [2, 9, 30, 'Pilates', 'D'], [2, 18, 0, 'Spin', 'A'], [2, 19, 0, 'Boxfit', 'C'],
  [3, 6, 30, 'Strength and conditioning', 'C'], [3, 12, 15, 'Spin', 'F'], [3, 18, 30, 'Dance fitness', 'E'], [3, 19, 30, 'Pilates', 'E'],
  [4, 7, 0, 'Spin', 'A'], [4, 10, 0, 'Mobility and stretch', 'D'], [4, 18, 0, 'HIIT', 'B'], [4, 19, 15, 'Yoga', 'D'],
  [5, 6, 30, 'HIIT', 'B'], [5, 12, 15, 'Kettlebells', 'C'], [5, 17, 30, 'Spin', 'F'],
  [6, 9, 0, 'Spin', 'A'], [6, 10, 0, 'Boxfit', 'C'], [6, 11, 0, 'Yoga', 'D'],
  [0, 9, 30, 'Pilates', 'E'], [0, 10, 30, 'Circuits', 'B'],
];

/** Personal training packs: [sessions, price with VAT, days to use them in, weight]. */
const PACKS = [[5, 165, 90, 5], [10, 300, 180, 3], [20, 560, 270, 1]];

// Where members live: Leeds postcode districts, and two towns near it.
const TOWNS = [[['Leeds', ['LS3', 'LS4', 'LS5', 'LS6', 'LS7', 'LS8', 'LS11', 'LS12', 'LS13', 'LS16']], 10], [['Horsforth', ['LS18']], 1], [['Pudsey', ['LS28']], 1]];
const STREETS = ['Tanner Street', 'Kirk Lane', 'Mill Lane', 'Station Road', 'Canal Walk', 'Victoria Terrace', 'Park View', 'Hawthorn Grove', 'Albion Street', 'Oak Road', 'Beech Close', 'Moorland Avenue', 'Chapel Street', 'Brook Lane'];
const FREEZE_REASONS = [['Injury', 4], ['Travelling', 3], ['Working away', 2], ['Surgery', 1], ['Pregnancy', 1], ['Money is tight', 1]];
const FAIL_REASONS = [['Not enough money in the account', 6], ['Payment refused by the bank', 2], ['Bank asked for a new instruction', 1]];
const MEMBER_NOTES = ['Knee injury: no jumping', 'Training for a half marathon', 'Prefers early mornings', 'Back problem: see induction notes', 'Asked about personal training', 'Shoulder injury: light weights only'];
// Visits through the day, by hour, on weekdays and at weekends.
const WEEKDAY_HOURS = [[6, 3], [7, 4], [8, 2], [9, 1.5], [10, 1.5], [11, 1.5], [12, 3], [13, 2], [14, 1], [15, 1], [16, 1.5], [17, 4], [18, 5], [19, 4], [20, 2], [21, 0.5]];
const WEEKEND_HOURS = [[8, 2], [9, 3], [10, 3], [11, 3], [12, 2], [13, 1.5], [14, 1.5], [15, 1], [16, 1], [17, 0.5]];
// How busy each month is: January most, the summer and December least.
const SEASON = [1.3, 1.15, 1.05, 1, 1, 0.9, 0.8, 0.8, 1.1, 1.05, 1, 0.75];

/** Fill a Tannery Yard Fitness database made from `spec`. `r` is random(), `cal` calendar(). Answers counts. */
export function fill(base, { r, cal, days = 370 }) {
  const counts = {};
  const add = (table, values) => { counts[table] = (counts[table] || 0) + 1; return base.insert(table, values); };
  const zero = cal.at(0).getTime();
  const offsetOf = (date) => Math.round((date.getTime() - zero) / 86400000);
  /** The day `k` months after `offset`, on day `dom` of that month. */
  const monthOn = (offset, dom, k = 1) => { const a = cal.at(offset); return offsetOf(new Date(a.getFullYear(), a.getMonth() + k, dom)); };
  // Numbers given in date order, a new run each year: INV-2026-0042.
  const numbers = (prefix) => {
    const count = {};
    return (d) => { const y = cal.at(d).getFullYear(); count[y] = (count[y] || 0) + 1; return `${prefix}-${y}-${String(count[y]).padStart(4, '0')}`; };
  };
  const invoiceNo = numbers('INV');
  const packNo = numbers('PT');
  const dayCache = new Map();
  const dayOf = (d) => { let v = dayCache.get(d); if (v === undefined) { v = cal.day(d); dayCache.set(d, v); } return v; };
  // A day as an invoice line says it: 01/11/2026.
  const ukDay = (d) => dayOf(d).split('-').reverse().join('/');
  const two = (n) => (n < 10 ? `0${n}` : String(n));
  const at = (d, hour, minute) => `${dayOf(d)}T${two(hour)}:${two(minute)}:00`;

  add('Business', businessRecord({
    name: 'Tannery Yard Fitness', domain: 'tanneryyard.example', phone: '07700 900731',
    address: { Address: '3 Tannery Yard, Canal Walk', City: 'Leeds', Postcode: 'LS4 2QR', Country: 'United Kingdom' },
    terms: 'Monthly fees are collected by direct debit on your payment day. A failed payment is tried again five days later.',
    footer: 'Open 06:00 to 22:00 on weekdays and 08:00 to 18:00 at weekends. Classes can be booked up to seven days ahead.',
  }));

  // Plans, staff and classes.
  const plans = PLANS.map(([name, fee, joining, min, notice, access, description, weight]) => ({
    name, fee, joining, min, weight, offPeak: name === 'Off-peak',
    id: add('Plans', { Name: name, 'Monthly Fee': fee, 'Joining Fee': joining, 'Minimum Months': min, 'Notice Months': notice, 'Freeze Fee': FREEZE_FEE, 'Access Hours': access, 'Tax Rate': 0.2, Description: description }),
  }));
  const staff = {};
  for (const s of STAFF) {
    const first = r.pick(FIRST);
    const last = r.pick(LAST);
    staff[s.key] = { ...s, id: add('Staff', { 'First Name': first, 'Last Name': last, Role: s.role, Phone: phoneFor(r, 'United Kingdom'), 'E-mail': `${first}.${last}@tanneryyard.example`.toLowerCase(), 'Class Rate': s.classRate ?? null, 'Session Rate': s.ptRate ?? null, Started: dayOf(-r.int(200, 2500)) }) };
  }
  const instructors = STAFF.filter((s) => s.classRate).map((s) => staff[s.key]);
  const trainers = STAFF.filter((s) => s.ptRate).map((s) => staff[s.key]);
  const classes = {};
  for (const [name, minutes, capacity, studio, pop, description] of CLASSES) classes[name] = { name, capacity, studio, pop, id: add('Classes', { Name: name, Description: description, Minutes: minutes, Capacity: capacity, Studio: studio }) };

  // Members: invented names, each once.
  const taken = new Set();
  const members = [];
  let live = [];
  const newMember = (joined, initial) => {
    let first;
    let last;
    do { first = r.pick(FIRST); last = r.pick(LAST); } while (taken.has(`${first} ${last}`));
    taken.add(`${first} ${last}`);
    const month = cal.at(joined).getMonth();
    const plan = r.weighted(plans.map((p) => [p, p.name === 'Student' && (month === 8 || month === 9) ? p.weight * 3 : p.weight]));
    const age = plan.name === 'Student' ? r.int(18, 24) : plan.name === 'Family' ? r.int(30, 52) : r.int(20, 68);
    const dom = Math.min(28, cal.at(joined).getDate());
    const [town, districts] = r.weighted(TOWNS);
    const m = {
      plan, fee: plan.fee, dom, joined, minEnd: monthOn(joined, dom, plan.min) - 1, ends: null, endKind: null, cancelReq: null,
      // How often they come to the gym floor a week, how much they like classes, and whether they will stop coming.
      rate: r.weighted([[0.25, 2], [0.5, 3], [0.8, 3], [1.3, 2], [2, 1]]), love: r.weighted([[0, 4], [0.5, 2], [1, 3], [2, 1.5]]),
      sleepFrom: r.chance(0.13) ? joined + r.int(30, 120) : null, fade: r.chance(0.2) ? r.int(120, 400) : null,
      risky: r.chance(0.08), freezes: [], suspended: false, pack: null,
    };
    m.id = add('Members', {
      'First Name': first, 'Last Name': last, 'Date of Birth': dayOf(joined - age * 365 - r.int(0, 364)),
      Address: `${r.int(1, 160)} ${r.pick(STREETS)}`, City: town, Postcode: `${r.pick(districts)} ${r.int(1, 9)}${r.pick(['AB', 'DE', 'FG', 'HJ', 'NP', 'QR', 'TU', 'XY'])}`,
      Phone: phoneFor(r, 'United Kingdom'), 'E-mail': `${first}.${last}@${r.pick(['mail.example', 'post.example', 'inbox.example', 'mail.example'])}`.toLowerCase(),
      Plan: plan.id, 'Monthly Fee': plan.fee, Joined: dayOf(joined), 'Payment Day': dom, 'Minimum Term Ends': dayOf(m.minEnd),
      'Health Declaration': r.chance(0.97), 'Emergency Contact': `${r.pick(FIRST)} ${last}`, 'Emergency Phone': phoneFor(r, 'United Kingdom'),
      Notes: r.chance(0.06) ? r.pick(MEMBER_NOTES) : null,
    });
    m.nextDue = monthOn(joined, dom);
    if (initial) while (m.nextDue < initial + 10) m.nextDue = monthOn(m.nextDue, dom);
    members.push(m);
    live.push(m);
    return m;
  };
  /** Visits a week, as of day `d`: less for a member drifting away, almost none once they have stopped coming. */
  const rateOn = (m, d) => {
    if (m.sleepFrom != null && d >= m.sleepFrom) return 0.03;
    return m.fade ? m.rate * Math.exp(-(d - m.joined) / m.fade) : m.rate;
  };
  // Closed on Christmas Day and New Year's Day: no visits, classes or training.
  const closedOn = (d) => { const x = cal.at(d); return (x.getMonth() === 11 && x.getDate() === 25) || (x.getMonth() === 0 && x.getDate() === 1); };
  const frozenOn = (m, d) => m.freezes.some((f) => d >= f.start && d <= f.end);
  const inOn = (m, d) => m.joined <= d && (m.ends == null || d <= m.ends);
  const canCome = (m, d) => inOn(m, d) && !m.suspended && !frozenOn(m, d);

  // The day by day starts on the first of a month, about twelve months back.
  let start = -days;
  while (cal.at(start).getDate() !== 1) start++;
  for (let i = 0; i < 190; i++) newMember(start - r.int(15, 1500), start);

  // An invoice for a member's month from `due`, raised on `d`: VAT within each line's price, rounded, then added up.
  const raise = (m, due, d, joining) => {
    const next = monthOn(due, m.dom);
    const lines = [];
    if (joining && m.plan.joining) lines.push(['Joining fee', 'Joining fee', m.plan.joining]);
    lines.push(frozenOn(m, due)
      ? [`Membership frozen, ${ukDay(due)} to ${ukDay(next - 1)}`, 'Freeze fee', FREEZE_FEE]
      : [`${m.plan.name} membership, ${ukDay(due)} to ${ukDay(next - 1)}`, 'Membership', m.fee]);
    let total = 0;
    let tax = 0;
    for (const [, , price] of lines) { total += price; tax += money(price - price / 1.2); }
    total = money(total);
    tax = money(tax);
    // The first try at the direct debit, when the payment day has come: most are collected.
    const collected = !joining && due <= 0 && r.chance(m.risky ? 0.8 : 0.965);
    const paid = joining || collected;
    const id = add('Invoices', {
      Number: invoiceNo(d), Member: m.id, 'Invoice Date': dayOf(d), 'Period From': dayOf(due), 'Period To': dayOf(next - 1), 'Due Date': dayOf(due),
      Net: money(total - tax), Tax: tax, Total: total, Status: paid ? 'Paid' : 'Due', 'Paid On': paid ? dayOf(joining ? d : due) : null, Method: joining ? 'Card on joining' : 'Direct debit',
    });
    for (const [description, kind, price] of lines) add('Invoice Lines', { Invoice: id, Description: description, Kind: kind, Quantity: 1, 'Unit Price': price, 'Tax Rate': 0.2 });
    if (paid) add('Payments', { Invoice: id, 'Taken On': dayOf(joining ? d : due), Method: joining ? 'Card' : 'Direct debit', Amount: total, Result: 'Collected' });
    const inv = { id, m, due, total };
    // One that is not collected fails on the day, and is tried again five days later.
    if (!paid) on(due, () => collect(inv, due, false));
    return inv;
  };
  const later = new Map(); // day -> [fn]: collections, second tries, desk payments, write-offs
  const on = (d, fn) => { if (!later.has(d)) later.set(d, []); later.get(d).push(fn); };
  /** A direct debit for `inv` on day `d`: the first try, which has failed, or the second. */
  const collect = (inv, d, second) => {
    const ok = second && r.chance(inv.m.risky ? 0.35 : 0.55);
    add('Payments', { Invoice: inv.id, 'Taken On': dayOf(d), Method: 'Direct debit', Amount: inv.total, Result: ok ? 'Collected' : 'Failed', Reason: ok ? null : r.weighted(FAIL_REASONS) });
    if (ok) { base.update('Invoices', inv.id, { Status: 'Paid', 'Paid On': dayOf(d) }); return; }
    if (!second) { base.update('Invoices', inv.id, { Status: 'Retry due' }); on(d + 5, () => collect(inv, d + 5, true)); return; }
    // Failed twice: the card stops opening the door until they pay at the desk; some never do.
    base.update('Invoices', inv.id, { Status: 'Failed' });
    inv.m.suspended = true;
    if (r.chance(0.55)) {
      const paid = d + r.int(2, 20);
      on(paid, () => {
        add('Payments', { Invoice: inv.id, 'Taken On': dayOf(paid), Method: 'Card at the desk', Amount: inv.total, Result: 'Collected' });
        base.update('Invoices', inv.id, { Status: 'Paid', 'Paid On': dayOf(paid), Method: 'Card at the desk' });
        inv.m.suspended = false;
      });
    } else {
      on(d + 30, () => {
        base.update('Invoices', inv.id, { Status: 'Written off' });
        if (inv.m.ends == null || inv.m.ends > d + 30) { inv.m.ends = d + 30; inv.m.endKind = 'Lapsed'; }
      });
    }
  };

  // The class pools: who could book, by how much they like classes, for off-peak and peak times.
  let pools = null;
  const draw = (list) => {
    const sums = [];
    let total = 0;
    for (const x of list) sums.push(total += x.love);
    return () => {
      if (!list.length) return null;
      const v = r.next() * total;
      let lo = 0;
      let hi = sums.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (sums[mid] > v) hi = mid; else lo = mid + 1; }
      return list[lo];
    };
  };
  const poolsFor = (d) => {
    const able = live.filter((m) => m.love > 0 && canCome(m, d) && rateOn(m, d) > 0.1);
    return { offPeak: draw(able), peak: draw(able.filter((m) => !m.plan.offPeak)) };
  };
  /** A class on day `d` from timetable entry `t`, with its bookings; past ones held, the rest booked so far. */
  const session = (d, [wd, hour, minute, name, who]) => {
    const c = classes[name];
    const teacher = r.chance(0.05) ? r.pick(instructors.filter((x) => x.key !== who)) : staff[who];
    const past = d < 0 || (d === 0 && hour < cal.hour);
    const cancelled = past && r.chance(0.012);
    const offPeak = wd === 0 || wd === 6 || (hour >= 9 && hour < 16);
    const pick = offPeak ? pools.offPeak : pools.peak;
    let want = Math.min(c.capacity, Math.round(c.capacity * c.pop * SEASON[cal.at(d).getMonth()] * (0.4 + r.next() * 0.45)));
    // Ahead of the day, only some of the places are booked yet.
    if (!past) want = Math.round(want * Math.min(1, Math.max(0.12, 1 - d / 9)));
    const chosen = new Set();
    for (let k = 0; k < want * 3 && chosen.size < want; k++) { const m = pick(); if (m) chosen.add(m); }
    const bookings = [...chosen].map((m) => ({ m, status: cancelled ? 'Cancelled' : past ? r.weighted([['Attended', 85], ['No-show', 7], ['Cancelled', 8]]) : r.weighted([['Booked', 93], ['Cancelled', 7]]) }));
    const id = add('Class Sessions', {
      Class: c.id, Instructor: teacher.id, Starts: at(d, hour, minute), Studio: c.studio, Capacity: c.capacity,
      'Places Booked': bookings.filter((b) => b.status !== 'Cancelled').length, 'Instructor Fee': teacher.classRate, Status: cancelled ? 'Cancelled' : past ? 'Held' : 'Scheduled',
    });
    for (const b of bookings) {
      const day = Math.min(0, d - r.weighted([[0, 3], [1, 3], [2, 2], [r.int(3, 6), 2]]));
      const bh = day === 0 ? r.int(6, Math.max(6, Math.min(21, cal.hour - 1))) : r.int(7, 21);
      add('Bookings', { Session: id, Member: b.m.id, 'Booked At': at(day < d || bh < hour ? day : day - 1, bh, r.int(0, 59)), Status: b.status });
      // Coming for a class is a visit through the door too.
      if (b.status === 'Attended') add('Visits', { Member: b.m.id, 'Visited At': at(d, minute >= 10 ? hour : hour - 1, (minute + 50) % 60), Entry: 'Class' });
    }
  };

  // Personal training: packs bought, and their sessions a week or two apart.
  const packs = [];
  let open = [];
  const buyPack = (m, d) => {
    const [n, price, life] = r.weighted(PACKS.map((p) => [p, p[3]]));
    const trainer = r.pick(trainers);
    const p = { m, trainer, n, used: 0, expires: d + life, next: d + r.int(2, 5), gap: r.pick([3, 4, 7, 7]), status: 'Open' };
    p.id = add('PT Packs', { Number: packNo(d), Member: m.id, Trainer: trainer.id, 'Bought On': dayOf(d), Sessions: n, Price: price, 'Tax Rate': 0.2, 'Paid By': r.weighted([['Card', 5], ['Cash', 1]]), Expires: dayOf(p.expires) });
    m.pack = p;
    packs.push(p);
    open.push(p);
  };
  const ptSession = (p, d, booked) => {
    const status = booked ? 'Booked' : r.weighted([['Done', 88], ['No-show', 5], ['Cancelled', 7]]);
    add('PT Sessions', { Pack: p.id, Trainer: p.trainer.id, 'Session At': at(d, r.pick([7, 8, 9, 12, 13, 17, 18, 19]), r.pick([0, 30])), Status: status, 'Trainer Fee': p.trainer.ptRate });
    if (status === 'Done' || status === 'No-show') p.used++;
  };

  for (let d = start; d <= 0; d++) {
    const date = cal.at(d);
    const wd = date.getDay();
    const season = SEASON[date.getMonth()];
    const closed = closedOn(d);
    for (const fn of later.get(d) || []) fn();

    // New members: most in January and September.
    const joins = 0.33 * (date.getMonth() === 0 ? 2.4 : date.getMonth() === 8 ? 1.6 : season);
    for (let k = Math.floor(joins) + (r.chance(joins % 1) ? 1 : 0); k > 0; k--) {
      const m = newMember(d, null);
      raise(m, d, d, true);
    }

    if (date.getDate() === 1) live = live.filter((m) => m.ends == null || m.ends >= d);
    for (const m of live) {
      if (!inOn(m, d) || m.joined === d) continue;
      // Ten days before the payment day, the month's invoice; collected on the day.
      if (d === m.nextDue - 10) {
        if (m.ends == null || m.nextDue <= m.ends) {
          if (!m.suspended) raise(m, m.nextDue, d, false);
          m.nextDue = monthOn(m.nextDue, m.dom);
        }
      }
      const rate = rateOn(m, d);
      const frozen = frozenOn(m, d);
      // Giving notice: more likely from those who have stopped coming.
      if (m.cancelReq == null && m.ends == null && !frozen && d > m.joined + 20 && r.chance(0.0006 + (rate < 0.5 ? 0.0016 : 0))) {
        let due = m.nextDue;
        while (due < d + 28 || due <= m.minEnd) due = monthOn(due, m.dom);
        m.cancelReq = d;
        m.ends = due - 1;
        m.endKind = 'Cancelled';
      }
      // A freeze from the next payment day not yet invoiced, for one to three months.
      if (m.cancelReq == null && !m.suspended && !m.freezes.some((f) => f.end >= d) && d > m.joined + 30 && r.chance(0.0005)) {
        const months = r.weighted([[1, 5], [2, 3], [3, 2]]);
        const f = { start: m.nextDue, end: monthOn(m.nextDue, m.dom, months) - 1 };
        m.freezes.push(f);
        add('Freezes', { Member: m.id, Starts: dayOf(f.start), Ends: dayOf(f.end), Reason: r.weighted(FREEZE_REASONS), 'Monthly Fee': FREEZE_FEE });
      }
      // A visit to the gym floor, at an hour their plan lets them in.
      if (closed || !canCome(m, d) || !r.chance((rate / 7) * season * (wd === 0 || wd === 6 ? 0.8 : 1.05))) continue;
      const offPeakDay = m.plan.offPeak && wd !== 0 && wd !== 6;
      const hour = wd === 0 || wd === 6 ? r.weighted(WEEKEND_HOURS) : offPeakDay ? r.int(9, 15) : r.weighted(WEEKDAY_HOURS);
      if (d === 0 && hour >= cal.hour) continue;
      add('Visits', { Member: m.id, 'Visited At': at(d, hour, r.int(0, 59)), Entry: 'Gym floor' });
    }

    // The day's classes.
    if (closed) continue;
    pools = poolsFor(d);
    for (const t of TIMETABLE) if (t[0] === wd) session(d, t);

    // Personal training: a pack or so a week sold, more in January.
    if (r.chance(0.3 * season)) {
      for (let k = 0; k < 6; k++) {
        const m = r.pick(live);
        if (canCome(m, d) && !m.pack && rateOn(m, d) > 0.6) { buyPack(m, d); break; }
      }
    }
    for (const p of open) {
      if (p.next > d) continue;
      if (d > p.expires) { p.status = 'Expired'; p.m.pack = null; continue; }
      if (wd !== 0 && canCome(p.m, d)) ptSession(p, d, d === 0 && cal.hour < 12);
      p.next = d + p.gap + (wd === 0 ? 1 : 0);
      if (p.used >= p.n) { p.status = 'Used up'; p.m.pack = null; }
    }
    if (open.some((p) => p.status !== 'Open')) open = open.filter((p) => p.status === 'Open');
  }
  // Packs whose use-by day has passed with sessions left.
  for (const p of packs) if (p.status === 'Open' && p.expires < 0) p.status = 'Expired';

  // The fortnight ahead: the timetable with the places booked so far, and the training diary.
  pools = poolsFor(0);
  for (let d = 1; d <= 14; d++) {
    const wd = cal.weekday(d);
    if (!closedOn(d)) for (const t of TIMETABLE) if (t[0] === wd) session(d, t);
  }
  for (const p of packs) {
    if (p.status !== 'Open' || !canCome(p.m, 0)) continue;
    let booked = 0;
    for (let d = Math.max(1, p.next); d <= 14 && d <= p.expires && p.used + booked < p.n; d += p.gap) {
      if (cal.weekday(d) === 0 || closedOn(d)) continue;
      ptSession(p, d, true);
      booked++;
    }
  }

  // Membership numbers in the order members joined, and where each membership stands today.
  const memberNo = numbers('MEM');
  members.sort((a, b) => a.joined - b.joined || a.id - b.id);
  for (const m of members) {
    const status = m.endKind === 'Lapsed' && m.ends <= 0 ? 'Lapsed' : m.endKind === 'Cancelled' && m.ends < 0 ? 'Cancelled' : frozenOn(m, 0) ? 'Frozen' : 'Active';
    base.update('Members', m.id, { Number: memberNo(m.joined), Status: status, 'Cancel Requested': m.cancelReq == null ? null : dayOf(m.cancelReq), Ends: m.ends == null ? null : dayOf(m.ends) });
  }
  for (const p of packs) base.update('PT Packs', p.id, { 'Sessions Used': p.used, Status: p.status });
  return counts;
}
