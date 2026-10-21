// The front desk of an office building: Copperfield House, an invented
// seven-storey office block by a canal in Manchester, with nine companies on
// its floors and the building's own management team on the ground floor. The
// desk signs visitors in and out, gives each a numbered badge, takes in the
// post and parcels for the tenants, inducts contractors and issues their
// permits to work, and keeps the fire roll call.
//
// Its records come from thirteen months of working days, run a day at a time
// and a visit at a time inside each day: hosts book their visitors in the
// days before, others walk in, most sign out and hand their badge back and a
// few forget, contractors take the site induction once a year, parcels wait
// on the shelves until they are collected, and a fire drill is held each
// quarter. The next two weeks' booked visits are already there. A visitor's
// record holds a name, a company and, for those who park, a car registration
// (in a made-up pattern, ZX-1234-A, that no real plate has), and nothing more.

import { BUSINESS_ABOUT, BUSINESS_TABLE, businessRecord, companies, person } from './util.js';

const ref = (table) => ({ type: 'integer', points: table });
const VISITOR = '[Visitors].[First Name] & " " & [Visitors].[Last Name]';
const HOST = '[Hosts].[First Name] & " " & [Hosts].[Last Name]';
// The day a visit's sign-in falls on, as a date, so DateDiff counts whole days from it.
const SIGNED_DAY = 'Left([Signed In], 10)';
const LETTERHEAD = { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'E-mail'] };

export const spec = {
  negative: {},
  tables: [
    BUSINESS_TABLE,
    { name: 'Floors', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Level', type: 'integer' },
      { name: 'Assembly Point', type: 'text' }, { name: 'Notes', type: 'text' },
    ] },
    { name: 'Tenants', fields: [
      { name: 'Name', type: 'text', required: true }, { name: 'Floor', ...ref('Floors'), required: true }, { name: 'Suite', type: 'text' },
      { name: 'Staff', type: 'integer' }, { name: 'Reception Phone', type: 'text' }, { name: 'E-mail', type: 'text' },
      { name: 'Moved In', type: 'date' }, { name: 'Active', type: 'yesno', default: true },
    ] },
    { name: 'Hosts', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Tenant', ...ref('Tenants'), required: true },
      { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' }, { name: 'Active', type: 'yesno', default: true },
    ] },
    { name: 'Visitors', fields: [
      { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true }, { name: 'Company', type: 'text' },
      { name: 'Car Registration', type: 'text' }, { name: 'Kind', type: 'text', default: 'Guest' }, { name: 'Regular', type: 'yesno' },
      { name: 'First Visit', type: 'date' },
    ] },
    { name: 'Badges', fields: [
      { name: 'Number', type: 'text', required: true, unique: true }, { name: 'Kind', type: 'text', default: 'Visitor' },
      { name: 'Status', type: 'text', default: 'Available' }, { name: 'Added On', type: 'date' },
    ] },
    { name: 'Visits', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Visitor', ...ref('Visitors'), required: true }, { name: 'Host', ...ref('Hosts'), required: true },
      { name: 'Expected On', type: 'date' }, { name: 'Expected At', type: 'text' }, { name: 'Pre-registered', type: 'yesno' },
      { name: 'Purpose', type: 'text' }, { name: 'Parking', type: 'yesno' },
      { name: 'Signed In', type: 'datetime' }, { name: 'Signed Out', type: 'datetime' },
      { name: 'Badge', ...ref('Badges') }, { name: 'Badge Returned', type: 'yesno' }, { name: 'Valid Until', type: 'datetime' },
      { name: 'Status', type: 'text', default: 'Expected' },
    ] },
    { name: 'Inductions', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Visitor', ...ref('Visitors'), required: true },
      { name: 'Given On', type: 'date' }, { name: 'Valid Until', type: 'date' }, { name: 'Given By', type: 'text' }, { name: 'Renewed', type: 'yesno' },
    ] },
    { name: 'Permits', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Visit', ...ref('Visits'), required: true }, { name: 'Kind', type: 'text' },
      { name: 'Location', type: 'text' }, { name: 'Valid From', type: 'datetime' }, { name: 'Valid To', type: 'datetime' },
      { name: 'Issued By', type: 'text' }, { name: 'Closed At', type: 'datetime' }, { name: 'Status', type: 'text', default: 'Open' },
    ] },
    { name: 'Deliveries', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Received At', type: 'datetime' }, { name: 'Carrier', type: 'text' },
      { name: 'Host', ...ref('Hosts'), required: true }, { name: 'Kind', type: 'text', default: 'Parcel' }, { name: 'Pieces', type: 'integer', default: 1 },
      { name: 'Reference', type: 'text' }, { name: 'Stored In', type: 'text' }, { name: 'Collected At', type: 'datetime' },
      { name: 'Collected By', type: 'text' }, { name: 'Status', type: 'text', default: 'Waiting' },
    ] },
    { name: 'Roll Calls', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Kind', type: 'text', default: 'Drill' }, { name: 'Started At', type: 'datetime' },
      { name: 'Building Clear At', type: 'datetime' }, { name: 'Minutes to Clear', type: 'number' }, { name: 'All Accounted', type: 'yesno' },
      { name: 'Led By', type: 'text' }, { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Roll Call Lines', fields: [
      { name: 'Roll Call', ...ref('Roll Calls'), required: true }, { name: 'Floor', ...ref('Floors'), required: true }, { name: 'Kind', type: 'text' },
      { name: 'Name', type: 'text' }, { name: 'Company', type: 'text' }, { name: 'People', type: 'integer', default: 1 },
      { name: 'Accounted', type: 'yesno' }, { name: 'Visit', ...ref('Visits') },
    ] },
  ],
  queries: {
    'In the building now': { tables: ['Visits', 'Visitors', 'Hosts', 'Tenants', 'Floors', 'Badges'], columns: [
      { table: 'Floors', field: 'Level', sort: 'asc', show: false }, { table: 'Floors', field: 'Name', as: 'Floor' },
      { expr: VISITOR, as: 'Visitor' }, { table: 'Visitors', field: 'Company' }, { table: 'Visitors', field: 'Kind' },
      { expr: HOST, as: 'Host' }, { table: 'Tenants', field: 'Name', as: 'Tenant' }, { table: 'Badges', field: 'Number', as: 'Badge' },
      { table: 'Visits', field: 'Signed In', sort: 'asc' },
      { table: 'Visits', field: 'Signed Out', criteria: ['Is Null'], show: false },
      // Signed in today or yesterday: one who forgot to sign out last night is still on the list until the desk checks.
      { expr: `DateDiff("d", ${SIGNED_DAY}, Date())`, as: 'Days Ago', criteria: ['Between 0 And 1'], show: false },
    ] },
    'Expected today and tomorrow': { tables: ['Visits', 'Visitors', 'Hosts', 'Tenants', 'Floors'], columns: [
      { table: 'Visits', field: 'Expected On', sort: 'asc' }, { table: 'Visits', field: 'Expected At', sort: 'asc' },
      { expr: VISITOR, as: 'Visitor' }, { table: 'Visitors', field: 'Company' }, { table: 'Visits', field: 'Purpose' },
      { expr: HOST, as: 'Host' }, { table: 'Tenants', field: 'Name', as: 'Tenant' }, { table: 'Floors', field: 'Name', as: 'Floor' },
      { table: 'Visits', field: 'Parking' }, { table: 'Visitors', field: 'Car Registration' },
      { expr: 'DateDiff("d", Date(), [Expected On])', as: 'Days Ahead', criteria: ['Between 0 And 1'], show: false },
      { table: 'Visits', field: 'Signed In', criteria: ['Is Null'], show: false },
      { table: 'Visits', field: 'Status', criteria: ['Expected'], show: false },
    ] },
    'Still in after 18:00': { tables: ['Visits', 'Visitors', 'Hosts', 'Tenants'], columns: [
      { expr: SIGNED_DAY, as: 'Day', sort: 'desc' }, { expr: VISITOR, as: 'Visitor' }, { table: 'Visitors', field: 'Company' },
      { expr: HOST, as: 'Host' }, { table: 'Tenants', field: 'Name', as: 'Tenant' },
      { table: 'Visits', field: 'Signed In' }, { table: 'Visits', field: 'Signed Out' },
      // The hour they signed out, or 24 when they never did.
      { expr: 'IIf(Nz([Signed Out], "") = "", 24, Mid([Signed Out], 12, 2) * 1)', as: 'Out Hour', criteria: ['>= 18'], show: false },
      { expr: `DateDiff("d", ${SIGNED_DAY}, Date())`, as: 'Days Ago', criteria: ['Between 1 And 30'], show: false },
    ] },
    'Badges not returned': { tables: ['Visits', 'Visitors', 'Hosts', 'Tenants', 'Badges'], columns: [
      { table: 'Badges', field: 'Number', as: 'Badge', sort: 'asc' }, { table: 'Badges', field: 'Status', as: 'Badge Status' },
      { expr: VISITOR, as: 'Visitor' }, { table: 'Visitors', field: 'Company' }, { expr: HOST, as: 'Host' }, { table: 'Tenants', field: 'Name', as: 'Tenant' },
      { table: 'Visits', field: 'Signed In' }, { table: 'Visits', field: 'Signed Out' },
      { table: 'Visits', field: 'Badge Returned', criteria: ['No'], show: false },
      { expr: `DateDiff("d", ${SIGNED_DAY}, Date())`, as: 'Days Ago', criteria: ['Between 1 And 60'] },
    ] },
    'Inductions expiring in 30 days': { tables: ['Inductions', 'Visitors'], columns: [
      { table: 'Inductions', field: 'Valid Until', sort: 'asc' }, { expr: 'DateDiff("d", Date(), [Valid Until])', as: 'Days Left', criteria: ['Between 0 And 30'] },
      { expr: VISITOR, as: 'Contractor' }, { table: 'Visitors', field: 'Company' }, { table: 'Inductions', field: 'Number', as: 'Induction' },
      { table: 'Inductions', field: 'Given On' }, { table: 'Inductions', field: 'Renewed', criteria: ['No'], show: false },
    ] },
    'Deliveries waiting over 2 days': { tables: ['Deliveries', 'Hosts', 'Tenants', 'Floors'], columns: [
      { table: 'Deliveries', field: 'Received At', sort: 'asc' }, { table: 'Deliveries', field: 'Number', as: 'Delivery' },
      { expr: `DateDiff("d", Left([Received At], 10), Date())`, as: 'Days Waiting', criteria: ['> 2'] },
      { expr: HOST, as: 'For' }, { table: 'Tenants', field: 'Name', as: 'Tenant' }, { table: 'Floors', field: 'Name', as: 'Floor' },
      { table: 'Deliveries', field: 'Kind' }, { table: 'Deliveries', field: 'Pieces' }, { table: 'Deliveries', field: 'Stored In' },
      { table: 'Deliveries', field: 'Status', criteria: ['Waiting'], show: false },
    ] },
    'Visits by company and month': { tables: ['Visits', 'Hosts', 'Tenants'], columns: [
      { expr: 'Format([Signed In], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Tenants', field: 'Name', as: 'Tenant', total: 'group', sort: 'asc' },
      { table: 'Visits', field: 'ID', as: 'Visits', total: 'count' },
      { expr: 'IIf([Pre-registered], 0, 1)', as: 'Walk-ins', total: 'sum' },
      { table: 'Visits', field: 'Signed In', total: 'where', criteria: ['Is Not Null'] },
    ] },
    'Regular visitors': { tables: ['Visits', 'Visitors'], columns: [
      { table: 'Visitors', field: 'ID', total: 'group', show: false }, { expr: VISITOR, as: 'Visitor', total: 'group', sort: 'asc' },
      { table: 'Visitors', field: 'Company', total: 'group' }, { table: 'Visitors', field: 'Kind', total: 'group' },
      { table: 'Visits', field: 'ID', as: 'Visits', total: 'count', criteria: ['>= 4'], sort: 'desc' },
      { table: 'Visits', field: 'Signed In', as: 'Last Visit', total: 'max' },
      { expr: `DateDiff("d", ${SIGNED_DAY}, Date())`, as: 'Days Ago', total: 'where', criteria: ['Between 0 And 90'] },
    ] },
    'No-shows, last 30 days': { tables: ['Visits', 'Visitors', 'Hosts', 'Tenants'], columns: [
      { table: 'Visits', field: 'Expected On', sort: 'desc' }, { table: 'Visits', field: 'Expected At' }, { expr: VISITOR, as: 'Visitor' },
      { table: 'Visitors', field: 'Company' }, { expr: HOST, as: 'Host' }, { table: 'Tenants', field: 'Name', as: 'Tenant' },
      { table: 'Visits', field: 'Status', criteria: ['No show'], show: false },
      { expr: 'DateDiff("d", [Expected On], Date())', as: 'Days Ago', criteria: ['Between 1 And 30'], show: false },
    ] },
    'Permits, last 30 days': { tables: ['Permits', 'Visits', 'Visitors'], columns: [
      { table: 'Permits', field: 'Valid From', sort: 'desc' }, { table: 'Permits', field: 'Number', as: 'Permit' }, { table: 'Permits', field: 'Kind' },
      { table: 'Permits', field: 'Location' }, { expr: VISITOR, as: 'Contractor' }, { table: 'Visitors', field: 'Company' },
      { table: 'Permits', field: 'Valid To' }, { table: 'Permits', field: 'Closed At' }, { table: 'Permits', field: 'Status' },
      { table: 'Permits', field: 'Issued By' },
      { expr: 'DateDiff("d", Left([Valid From], 10), Date())', as: 'Days Ago', criteria: ['Between 0 And 30'], show: false },
    ] },
    'Visitor book, last 7 days': { tables: ['Visits', 'Visitors', 'Hosts', 'Tenants', 'Badges'], columns: [
      { expr: SIGNED_DAY, as: 'Day', sort: 'desc' }, { table: 'Visits', field: 'Signed In', sort: 'asc' }, { table: 'Visits', field: 'Number', as: 'Visit' },
      { expr: VISITOR, as: 'Visitor' }, { table: 'Visitors', field: 'Company' }, { table: 'Visitors', field: 'Car Registration' },
      { expr: HOST, as: 'Host' }, { table: 'Tenants', field: 'Name', as: 'Tenant' }, { table: 'Badges', field: 'Number', as: 'Badge' },
      { table: 'Visits', field: 'Signed Out' },
      { expr: `DateDiff("d", ${SIGNED_DAY}, Date())`, as: 'Days Ago', criteria: ['Between 0 And 7'], show: false },
    ] },
    'Evacuation drills': { tables: ['Roll Calls'], columns: [
      { table: 'Roll Calls', field: 'Started At', sort: 'desc' }, { table: 'Roll Calls', field: 'Number', as: 'Roll Call' }, { table: 'Roll Calls', field: 'Kind' },
      { table: 'Roll Calls', field: 'Building Clear At' }, { table: 'Roll Calls', field: 'Minutes to Clear' }, { table: 'Roll Calls', field: 'All Accounted' },
      { table: 'Roll Calls', field: 'Led By' }, { table: 'Roll Calls', field: 'Notes' },
    ] },
    'Contractor inductions': { tables: ['Inductions', 'Visitors'], columns: [
      { expr: VISITOR, as: 'Contractor', sort: 'asc' }, { table: 'Visitors', field: 'Company' }, { table: 'Inductions', field: 'Number', as: 'Induction' },
      { table: 'Inductions', field: 'Given On' }, { table: 'Inductions', field: 'Valid Until' },
      { expr: 'IIf(DateDiff("d", Date(), [Valid Until]) < 0, "Expired", "Valid")', as: 'State' },
      { table: 'Inductions', field: 'Renewed', criteria: ['No'], show: false },
    ] },
  },
  reports: [
    { name: 'Fire roll call list', title: 'Fire roll call: visitors in the building now', query: 'In the building now', group: 'Floor', columns: ['Visitor', 'Company', 'Kind', 'Host', 'Tenant', 'Badge', { field: 'Signed In', type: 'date' }], totals: [{ field: 'Visitor', fn: 'count' }] },
    { name: 'Expected visitors', title: 'Visitors expected today and tomorrow', query: 'Expected today and tomorrow', group: 'Expected On', sort: 'Expected At', columns: ['Expected At', 'Visitor', 'Company', 'Purpose', 'Host', 'Tenant', 'Floor', 'Car Registration'], totals: [{ field: 'Visitor', fn: 'count' }] },
    { name: 'Visitor book', title: 'Visitor book, the last 7 days', query: 'Visitor book, last 7 days', group: 'Day', sort: 'Signed In', columns: ['Visit', 'Visitor', 'Company', 'Car Registration', 'Host', 'Tenant', 'Badge', 'Signed In', 'Signed Out'], totals: [{ field: 'Visit', fn: 'count' }] },
    { name: 'Deliveries to chase', query: 'Deliveries waiting over 2 days', group: 'Tenant', columns: ['Delivery', 'Received At', { field: 'Days Waiting', type: 'integer' }, 'For', 'Kind', { field: 'Pieces', type: 'integer' }, 'Stored In'], totals: [{ field: 'Pieces', fn: 'sum' }] },
    { name: 'Missing badges', query: 'Badges not returned', columns: ['Badge', 'Badge Status', 'Visitor', 'Company', 'Host', 'Tenant', 'Signed In', { field: 'Days Ago', type: 'integer' }], totals: [{ field: 'Badge', fn: 'count' }] },
    { name: 'Visits by company', query: 'Visits by company and month', group: 'Month', columns: ['Tenant', { field: 'Visits', type: 'integer' }, { field: 'Walk-ins', type: 'integer' }], totals: [{ field: 'Visits', fn: 'sum' }, { field: 'Walk-ins', fn: 'sum' }] },
    { name: 'Drill log', title: 'Evacuation drill log', query: 'Evacuation drills', columns: ['Roll Call', 'Kind', 'Started At', 'Building Clear At', { field: 'Minutes to Clear', type: 'number' }, 'All Accounted', 'Led By', 'Notes'], totals: [{ field: 'Minutes to Clear', fn: 'avg' }] },
    { name: 'Induction renewals', title: 'Contractor inductions expiring in the next 30 days', query: 'Inductions expiring in 30 days', columns: ['Contractor', 'Company', 'Induction', { field: 'Given On', type: 'date' }, { field: 'Valid Until', type: 'date' }, { field: 'Days Left', type: 'integer' }], totals: [{ field: 'Contractor', fn: 'count' }] },
  ],
  // The print templates: one document for each record of the table named.
  documents: [
    { name: 'Visitor pass', table: 'Visits', paper: 'receipt-58', letterhead: { table: 'Business', fields: ['Name'] },
      blocks: [
        { type: 'heading', text: 'VISITOR' },
        { type: 'heading', text: '{Visitor}' },
        { type: 'fields', columns: 1, items: [
          { field: 'Visitor.Company', label: 'From' }, { field: 'Host', label: 'Visiting' }, { field: 'Host.Tenant.Name', label: 'Company' },
          { field: 'Host.Tenant.Floor', label: 'Floor' }, { field: 'Expected On', label: 'Date' }, { field: 'Badge', label: 'Badge' },
          { field: 'Valid Until' }, { field: 'Number', label: 'Pass' },
        ] },
        { type: 'text', text: 'Wear this pass where it can be seen and stay with your host. Sign out and hand your badge back at the front desk when you leave.', small: true },
        { type: 'text', text: 'If the fire alarm sounds, leave by the nearest exit, do not use the lifts, and go to {Host.Tenant.Floor.Assembly Point}.', small: true },
      ] },
    { name: 'Site rules agreement', table: 'Inductions', paper: 'a4', letterhead: LETTERHEAD,
      blocks: [
        { type: 'heading', text: 'Site rules and confidentiality agreement for contractors' },
        { type: 'fields', columns: 2, items: [
          { field: 'Visitor', label: 'Contractor' }, { field: 'Visitor.Company', label: 'Company' },
          { field: 'Given On', label: 'Date' }, { field: 'Number', label: 'Induction' }, { field: 'Valid Until', label: 'Valid until' },
        ] },
        { type: 'text', text: 'This agreement is made on {Given On} between {Business.Name}, {Business.Address}, {Business.City} {Business.Postcode}, which manages the building ("the Building"), and {Visitor} of {Visitor.Company} ("the Contractor"). It covers every visit the Contractor makes to work in the Building until {Valid Until}, when the site induction is taken again and a new agreement signed.' },
        { type: 'text', text: '1. Signing in and out. The Contractor signs in at the front desk on arriving and signs out on leaving, every visit, and wears the contractor badge given out where it can be seen. The badge goes back to the desk at the end of each visit; a lost badge is reported to the desk at once.' },
        { type: 'text', text: '2. The induction. The Contractor took the Building\'s site induction on {Given On}: the fire exits and assembly points, the sound of the alarm, first aid, reporting accidents, the lifts and loading bay, and these rules. Anyone else from {Visitor.Company} who comes to work takes the induction before starting.' },
        { type: 'text', text: '3. Permits to work. Hot work, work at height, work on the electrical supply, going onto the roof and work in confined spaces each need a permit to work from the front desk before they start, and stop when the permit ends. Only the Building\'s own staff isolate fire detectors.' },
        { type: 'text', text: '4. Working safely. The Contractor wears the protective equipment the work needs, keeps exits, stairs and corridors clear, screens off the work area, and leaves no tools or materials unattended in shared areas. Any accident, near miss or damage is reported at the desk the same day.' },
        { type: 'text', text: '5. Fire. When the alarm sounds, the Contractor stops work, makes the area safe if that takes seconds, leaves by the nearest exit without using the lifts and goes to the assembly point to be counted. Nobody goes back in until told it is safe.' },
        { type: 'text', text: '6. Waste and noise. The Contractor takes away their own waste, or uses what the Building has agreed. Noisy work on a floor where people are working is arranged with the tenant first, and done before 08:00 or after 18:00 if the tenant asks.' },
        { type: 'text', text: '7. Confidentiality. The tenants\' offices hold private papers and information. The Contractor does not read, copy, photograph or take away any document, screen or item the work does not need, takes no photographs in the Building except of the work itself, and keeps to themselves anything they see or hear about the tenants, their staff and their visitors, during the work and after it.' },
        { type: 'text', text: '8. What the desk keeps. The front desk keeps the Contractor\'s name, company and car registration, the times of each visit, and the induction and permit records, for the safety and security of the Building, and deletes them when they are no longer needed.' },
        { type: 'text', text: '9. Breaking the rules. The Building may stop the work, or refuse entry, when these rules are not kept.' },
        { type: 'text', text: 'Signed for the Contractor and for the Building:' },
        { type: 'spacer', size: 24 },
        { type: 'signatures', labels: ['Contractor', 'For the Building'] },
      ] },
    { name: 'Induction certificate', table: 'Inductions', paper: 'a5', letterhead: LETTERHEAD,
      blocks: [
        { type: 'heading', text: 'Site induction certificate' },
        { type: 'text', text: 'This certifies that' },
        { type: 'heading', text: '{Visitor}' },
        { type: 'text', text: 'of {Visitor.Company} has completed the site induction for {Business.Name}, {Business.Address}, {Business.City}, on {Given On}, and may work in the building as a contractor, signing in at the front desk on each visit, until {Valid Until}.' },
        { type: 'fields', columns: 2, items: [{ field: 'Number', label: 'Certificate' }, { field: 'Given By' }, { field: 'Given On' }, { field: 'Valid Until' }] },
        { type: 'text', text: 'A permit to work from the front desk is still needed for hot work, work at height, electrical isolation, roof access and confined spaces.', small: true },
        { type: 'signatures', labels: ['Given by'] },
      ] },
    { name: 'Delivery collection slip', table: 'Deliveries', paper: 'receipt-80', letterhead: { table: 'Business', fields: ['Name', 'Address', 'City'] },
      blocks: [
        { type: 'heading', text: 'Delivery {Number}' },
        { type: 'fields', columns: 1, items: [
          { field: 'Host', label: 'For' }, { field: 'Host.Tenant.Name', label: 'Company' }, { field: 'Host.Tenant.Floor', label: 'Floor' },
          { field: 'Received At', label: 'Received' }, { field: 'Carrier' }, { field: 'Kind' }, { field: 'Pieces' }, { field: 'Reference' },
          { field: 'Stored In', label: 'Kept at' }, { field: 'Collected At', label: 'Collected' }, { field: 'Collected By' },
        ] },
        { type: 'text', text: 'Received at the front desk. Please sign when you collect it. Anything not collected within 14 days goes back to the carrier.', small: true },
        { type: 'signatures', labels: ['Collected by'] },
      ] },
    { name: 'Fire roll call', table: 'Roll Calls', paper: 'a4', letterhead: LETTERHEAD,
      blocks: [
        { type: 'heading', text: 'Fire roll call {Number}' },
        { type: 'fields', columns: 2, items: [
          { field: 'Kind' }, { field: 'Led By', label: 'Roll call taken by' }, { field: 'Started At', label: 'Alarm at' },
          { field: 'Building Clear At', label: 'Building clear at' }, { field: 'Minutes to Clear' }, { field: 'All Accounted' },
        ] },
        { type: 'lines', table: 'Roll Call Lines', sort: 'Floor', columns: [
          { field: 'Floor', as: 'Floor', type: 'text' }, { field: 'Kind' }, { field: 'Name' }, { field: 'Company' },
          { field: 'People', type: 'integer' }, { expr: 'IIf([Accounted], "Yes", "Not found")', as: 'Accounted For' },
        ] },
        { type: 'totals', rows: [{ label: 'People counted', expr: '[People]', type: 'integer', strong: true }] },
        { type: 'text', text: '{Notes}' },
        { type: 'text', text: 'Visitors and contractors are listed by name from the front desk\'s sign-in records; each tenant\'s fire warden counts their own staff.', small: true },
        { type: 'signatures', labels: ['Fire marshal', 'Building manager'] },
      ] },
  ],
};

export const about = {
  name: 'Copperfield House',
  kind: 'Building front desk',
  line: 'Visitors, hosts, badges, contractor inductions and permits, deliveries and fire roll calls for an office building\'s front desk.',
  summary: [
    'For the front desk or reception of a building shared by several companies: a multi-let office block, a business centre, a co-working building, a science park, or a single company\'s head office with many departments. It keeps who is expected, who is in the building now and who they are with, which badge each has, the parcels waiting for collection, the contractors and their inductions and permits, and the fire roll calls.',
    'Copperfield House is an invented seven-storey office building by a canal in Manchester. Nine companies rent its floors, from a design studio of a dozen people to a firm of a hundred, and the building\'s own management team sits on the ground floor with the front desk. On a working day the desk signs in about twenty-five visitors: clients and suppliers for the tenants, interview candidates, and contractors for the building and its tenants. It takes in about ten deliveries, from letters to pallets, and holds a fire drill each quarter.',
    'The records cover thirteen months of working days up to the day the file is made, with the next two weeks\' booked visits. Most visitors are booked in by their host beforehand; the rest walk in. A few booked visitors never come. Most sign out and hand their badge back, a few forget, and a few badges go missing. Contractors take the site induction once a year and need a permit for hot work, work at height and the like. Most parcels are collected the same day; some wait while their addressee is away.',
    'A visitor\'s record holds only a name, the company they come from and, for those who drive, a car registration, here in a made-up pattern (ZX-1234-A) that no real plate has. All of it is invented.',
  ],
  suits: [
    'A multi-let office building or business centre',
    'A co-working space with members and their guests',
    'A company head office with several departments as its tenants',
    'A science park or innovation centre',
    'A school, college or clinic reception that signs visitors in',
    'A factory or depot gatehouse with contractors and deliveries',
  ],
  tables: {
    Business: BUSINESS_ABOUT,
    Floors: { about: 'The building\'s floors, from the ground floor up, each with the assembly point its people go to when the alarm sounds. Enter these first.', fields: {
      Name: 'The floor\'s name as it is signed, such as Ground floor or Third floor.',
      Level: 'Its number, 0 for the ground floor, so lists run from the bottom up.',
      'Assembly Point': 'Where people from this floor gather in an evacuation. The visitor pass prints it.',
      Notes: 'Anything the desk should know, such as where the meeting rooms are.',
    } },
    Tenants: { about: 'The companies on the building\'s floors, and the building\'s own management team, who host its contractors.', fields: {
      Name: 'The company\'s name, as on the directory board in the lobby.',
      Floor: 'The floor it is on.',
      Suite: 'Its suite or unit, such as 3.02.',
      Staff: 'How many people work there, used for the fire warden\'s count.',
      'Reception Phone': 'The number the desk rings to say a visitor has arrived.',
      'E-mail': 'Where the desk writes about deliveries and bookings.',
      'Moved In': 'The day the company moved in.',
      Active: 'Yes while it is a tenant. When one moves out, set it to No and keep its records.',
    } },
    Hosts: { about: 'The people in the building whom visitors come to see and deliveries are addressed to: the tenants\' staff who book visitors.', fields: {
      'First Name': 'Their first name.', 'Last Name': 'Their family name.', Tenant: 'The company they work for, and so their floor.',
      Phone: 'Their phone number, to say their visitor or parcel has arrived.', 'E-mail': 'Their work e-mail address.',
      Active: 'Yes while they work in the building.',
    } },
    Visitors: { about: 'Everyone who has been to the building or is booked to come, once each, however many times they visit. Kept to a name, a company and a car registration.', fields: {
      'First Name': 'Their first name.', 'Last Name': 'Their family name.',
      Company: 'The company they come from; empty for an interview candidate or a private visitor.',
      'Car Registration': 'For those who park, so the car park can be checked. The sample uses a made-up pattern, ZX-1234-A.',
      Kind: 'Guest, Client, Supplier, Candidate or Contractor. Contractors need a site induction.',
      Regular: 'Yes for someone who comes often, a dozen times or more, such as a supplier or a client who works with a tenant.',
      'First Visit': 'The day they first came, or are first booked to come.',
    } },
    Badges: { about: 'The numbered visitor and contractor badges at the desk. A badge is given out at sign-in and handed back at sign-out.', fields: {
      Number: 'The number printed on the badge: V-001 for visitors, C-01 for contractors.',
      Kind: 'Visitor or Contractor. Contractor badges open the service doors.',
      Status: 'Available in the tray, Issued to someone in the building, Missing (not handed back in the last month), or Written off when it has been missing longer and was replaced.',
      'Added On': 'The day the badge was put into use.',
    } },
    Visits: { about: 'One record for each visit, booked or walked in: who, to see whom, when they were expected, when they signed in and out, and the badge they had.', fields: {
      Number: 'The visit\'s number, printed on the visitor pass: VIS-2026-00042, given in date order, a new run each year.',
      Visitor: 'Who is visiting.', Host: 'Whom they are visiting.',
      'Expected On': 'The day of the visit.', 'Expected At': 'The time they are expected, as 10:30; for a walk-in, the time they arrived.',
      'Pre-registered': 'Yes when the host booked the visit beforehand; No for a walk-in.',
      Purpose: 'Meeting, Interview, Works, Event and so on.', Parking: 'Yes when a car park space is booked for the visit.',
      'Signed In': 'When they signed in at the desk; empty until they arrive.', 'Signed Out': 'When they signed out; empty while they are in the building, or when they left without signing out.',
      Badge: 'The badge they were given.', 'Badge Returned': 'Yes once the badge is back at the desk.',
      'Valid Until': 'When the pass runs out, the end of the day of the visit.',
      Status: 'Expected, On site, Left, Not signed out, No show or Cancelled.',
    } },
    Inductions: { about: 'The site induction each contractor takes before working in the building, valid for a year. When it runs out it is taken again and a new record made.', fields: {
      Number: 'The induction\'s number, printed on the certificate and the agreement: IND-2026-0042.',
      Visitor: 'The contractor inducted.', 'Given On': 'The day it was given.', 'Valid Until': 'The last day it is good for, a year less a day after it was given.',
      'Given By': 'Who at the desk gave it.', Renewed: 'Yes once a newer induction has taken its place.',
    } },
    Permits: { about: 'Permits to work, issued at the desk for a contractor\'s visit when the work carries a particular risk.', fields: {
      Number: 'The permit\'s number: PTW-2026-0042.', Visit: 'The contractor\'s visit it was issued on.',
      Kind: 'Hot work, Work at height, Electrical isolation, Roof access or Confined space.', Location: 'Where the work is done.',
      'Valid From': 'When work may start.', 'Valid To': 'When the permit runs out.', 'Issued By': 'Who at the desk issued it.',
      'Closed At': 'When the contractor handed it back with the area made safe; empty while it is open.', Status: 'Open or Closed.',
    } },
    Deliveries: { about: 'Every parcel, letter, pallet and order taken in at the desk for someone in the building, until it is collected.', fields: {
      Number: 'The delivery\'s number, on the slip stuck to it: DLV-2026-00042.', 'Received At': 'When it arrived.',
      Carrier: 'Who brought it.', Host: 'Whom it is addressed to.', Kind: 'Parcel, Letter, Large box, Pallet, Flowers or Food order.',
      Pieces: 'How many boxes or items.', Reference: 'The carrier\'s tracking reference, invented in the sample.',
      'Stored In': 'Where it is kept: a shelf, the post room, the fridge or the desk.',
      'Collected At': 'When it was collected; empty while it waits.', 'Collected By': 'Who collected it, the addressee or a colleague.',
      Status: 'Waiting, Collected, or Returned to the carrier after 14 days.',
    } },
    'Roll Calls': { about: 'The evacuation drill log: each fire drill and real alarm, when the building was clear and whether everyone was found. Its lines are the roll call.', fields: {
      Number: 'The roll call\'s number: DRL-2026-01.', Kind: 'Drill, or Alarm for a real or false alarm.',
      'Started At': 'When the alarm sounded.', 'Building Clear At': 'When the last person was out.',
      'Minutes to Clear': 'How long the building took to clear.', 'All Accounted': 'Yes when everyone on the list was found.',
      'Led By': 'Who took the roll call.', Notes: 'What went well and what did not.',
    } },
    'Roll Call Lines': { about: 'The roll call itself: each visitor and contractor signed in when the alarm sounded, by name, and each tenant\'s staff as counted by its fire warden.', fields: {
      'Roll Call': 'The roll call the line belongs to.', Floor: 'The floor they were on.',
      Kind: 'Visitor, Contractor, or Staff for a warden\'s count.', Name: 'The visitor\'s name, or whose staff the count is.',
      Company: 'The company they are from, or the tenant.', People: 'How many people the line stands for: 1 for a visitor, the count for staff.',
      Accounted: 'Yes when they were found at the assembly point.', Visit: 'The visit the line came from, for a visitor or contractor.',
    } },
  },
  queries: {
    'In the building now': 'Every visitor and contractor signed in today or yesterday who has not signed out, by floor, with their host and badge. This is the list to take out when the alarm sounds.',
    'Expected today and tomorrow': 'Booked visitors who have not arrived yet, today and tomorrow, in time order, with their host, floor and car registration for the car park.',
    'Still in after 18:00': 'Visits in the last 30 days that ended after six in the evening, or never signed out, to follow up with the host.',
    'Badges not returned': 'Badges not handed back in the last 60 days, with who had them and whom they were visiting.',
    'Inductions expiring in 30 days': 'Contractors whose site induction runs out in the next 30 days, so it can be booked again before their next visit.',
    'Deliveries waiting over 2 days': 'Deliveries still on the shelves more than two days after they arrived, with whom they are for, to chase.',
    'Visits by company and month': 'How many visitors each tenant had each month and how many of them walked in without booking.',
    'Regular visitors': 'Visitors who came four times or more in the last 90 days, the most frequent first: candidates for a standing pass.',
    'No-shows, last 30 days': 'Booked visitors who did not come, in the last 30 days.',
    'Permits, last 30 days': 'Permits to work issued in the last 30 days, with the contractor, the place and whether each is closed.',
    'Visitor book, last 7 days': 'Every sign-in of the last week, day by day: the signing-in book.',
    'Evacuation drills': 'The drill log: each drill and alarm, how long the building took to clear and whether everyone was found.',
    'Contractor inductions': 'Each contractor\'s latest induction and whether it is still valid.',
  },
  reports: {
    'Fire roll call list': 'Visitors and contractors in the building now, a page for each floor, for the fire marshal to call out at the assembly point.',
    'Expected visitors': 'Today\'s and tomorrow\'s booked visitors in time order, for the desk and the car park.',
    'Visitor book': 'The last seven days of sign-ins, day by day, as the paper book would show them.',
    'Deliveries to chase': 'Deliveries waiting more than two days, tenant by tenant.',
    'Missing badges': 'Badges not handed back in the last 60 days and who had them.',
    'Visits by company': 'Visits and walk-ins for each tenant, month by month, for the building manager.',
    'Drill log': 'Every fire drill and alarm with the time to clear the building, for the fire safety file.',
    'Induction renewals': 'Contractors whose induction runs out in the next 30 days.',
  },
  documents: {
    'Visitor pass': 'Printed on a label roll when a visitor signs in: their name and company, whom they are seeing, the floor, the date, the badge number, when the pass runs out and where to go if the alarm sounds.',
    'Site rules agreement': 'Signed by each contractor at the site induction, once a year: signing in, permits to work, working safely, fire, waste and noise, and keeping what they see in the tenants\' offices to themselves. Have the wording checked for your own building and country.',
    'Induction certificate': 'Given to a contractor after the site induction, on A5: who they are, the date and when it runs out.',
    'Delivery collection slip': 'Printed when a delivery comes in and stuck to it, on a till roll: whom it is for, the floor, the carrier and reference, where it is kept, and a line to sign on collection.',
    'Fire roll call': 'The record of a drill or alarm: when it started and when the building was clear, then every visitor and contractor on the list and each tenant\'s staff count, floor by floor, and whether all were found.',
  },
  empty: 'Start with Business, the building\'s own name and address, which every document prints. Then Floors, from the ground floor up, then Tenants on each floor and the Hosts who work for them, and the Badges in the tray. Visitors are added the first time they come or are booked, and each arrival is a Visit. Contractors need an Induction before they start work, and a Permit for risky work. Deliveries are entered as they arrive. Each drill or alarm is a Roll Call with its lines.',
  adapt: [
    'For a co-working space, make each member company a tenant and each member a host; add a Desk field to Hosts for their usual desk.',
    'If visitors must accept the building\'s rules or a confidentiality agreement at the desk, add an Agreed yes/no field to Visits and tick it at sign-in.',
    'To keep a record of the tenants\' own staff in the building, add a Staff Badges table and sign them in and out like visitors; the roll call can then list them by name.',
    'For a site with several entrances, add a Desk field to Visits and Deliveries, and group the visitor book by it.',
    'If visitors may only come with a valid ID check, add an ID Checked yes/no field to Visits; do not record the document\'s number.',
    'Add a Vehicles field to Permits for contractors who need the loading bay, and a query of loading bay bookings for the next 7 days.',
    'To delete old visitor records after a year, run the visitor book query with a Days Ago criterion of more than 365 and delete the visits it lists, then visitors with no visits left.',
  ],
  tutorial: [
    { title: 'Book a visitor in for a host', steps: [
      'When a host rings or writes, open the Visitors form and look for the visitor by name. If they are new, press New and type First Name, Last Name, Company and, if they will park, the Car Registration. Set Kind to Guest, Client, Supplier, Candidate or Contractor.',
      'Open the Visits form and press New. Type the next Number (VIS-2026-00043 after VIS-2026-00042), choose the Visitor and the Host, type Expected On and Expected At, tick Pre-registered, type the Purpose, and tick Parking if a space is needed.',
      'Set Valid Until to the end of that day, such as 18:30, and leave Status as Expected.',
      'Check the next day\'s list with the query Expected today and tomorrow, or print the report Expected visitors for the desk and the car park.',
    ] },
    { title: 'Sign a visitor in and print their pass', steps: [
      'When the visitor arrives, find their visit in the Visits form (or press New for a walk-in, leaving Pre-registered unticked).',
      'Type the time in Signed In, choose a free badge in Badge (look in the Badges form for one that is Available), set the badge\'s Status to Issued, and set the visit\'s Status to On site.',
      'Open the print template Visitor pass from Print templates, choose this visit, and press Print. It fits a 58 mm label roll.',
      'Ring the host on their Phone, or the tenant\'s Reception Phone, to say their visitor is here.',
    ] },
    { title: 'Sign a visitor out', steps: [
      'Find the visit in the Visits form or in the query In the building now.',
      'Type the time in Signed Out, tick Badge Returned, and set Status to Left.',
      'Open the Badges form and set the badge\'s Status back to Available.',
      'At the end of the day, run the query Still in after 18:00 and ring the host about anyone shown as never signed out; set their Status to Not signed out.',
    ] },
    { title: 'Induct a contractor and issue a permit', steps: [
      'Before a contractor\'s first visit, or when the query Inductions expiring in 30 days lists them, give the site induction. Open the Inductions form and press New: type the Number (IND-2026-0042), choose the Visitor, type Given On, Valid Until (a year less a day later) and Given By. Tick Renewed on their older induction.',
      'Print the print template Site rules agreement for the new induction and have the contractor sign it. Print the Induction certificate and give it to them.',
      'When the work needs a permit, open the Permits form and press New: the Number (PTW-2026-0042), the contractor\'s Visit, the Kind, the Location, Valid From and Valid To, and Issued By. Status is Open.',
      'When they hand the permit back, type Closed At and set Status to Closed. The query Permits, last 30 days shows any still open.',
    ] },
    { title: 'Take in a delivery and hand it over', steps: [
      'Open the Deliveries form and press New: the Number (DLV-2026-00042), Received At, the Carrier, the Host it is for, the Kind, Pieces, the Reference on the label and where you put it in Stored In. Status is Waiting.',
      'Open the print template Delivery collection slip, choose the delivery and print it on the till roll; stick it to the parcel and let the host know.',
      'When it is collected, type Collected At and Collected By and set Status to Collected. Have the person sign the slip.',
      'Each morning, run the query Deliveries waiting over 2 days, or print the report Deliveries to chase, and chase those hosts.',
    ] },
    { title: 'Run a fire drill and keep the roll call', steps: [
      'When the alarm sounds, print the report Fire roll call list (or take it on a tablet): everyone signed in and not out, floor by floor.',
      'Afterwards, open the Roll Calls form and press New: the Number (DRL-2026-01), the Kind, Started At, Building Clear At, Minutes to Clear and Led By.',
      'In the Roll Call Lines below, add a line for each visitor and contractor on the list with their Floor, Kind, Name and Company, and tick Accounted for each one found. Add a Staff line for each tenant with the People its warden counted.',
      'Tick All Accounted if everyone was found, write what happened in Notes, and print the print template Fire roll call for the fire safety file. The report Drill log lists every drill.',
    ] },
    { title: 'Chase missing badges and see the month\'s visits', steps: [
      'Run the query Badges not returned, or print the report Missing badges, and ask each host to get the badge back.',
      'In the Badges form, set a badge that has been gone for a month to Written off, and add a new badge with the next Number.',
      'At the end of the month, print the report Visits by company for the building manager.',
    ] },
  ],
  notes: [
    'In the building now looks at visits signed in today or yesterday that have no Signed Out time. Someone who left without signing out stays on it until the desk sets their Signed Out or their Status; check it before trusting it in an evacuation.',
    'The query and report work from the clock: Expected today and tomorrow and In the building now change through the day as visitors come and go, so the sample shows the building as it was when the file was made.',
    'A print template prints every record of its table, so choose the visit, delivery or induction you want before pressing Print, or it prints them all.',
    'Contractors in the sample take a new induction on their first visit after the last one ran out. The older induction is kept, with Renewed ticked, so the history stays.',
    'Badges here are reused: the same badge appears on many visits. A badge not handed back is Missing for a month and then Written off, and a new number is added.',
    'Only what the desk needs about a visitor is kept: a name, a company and a car registration. Do not add home addresses, dates of birth or ID numbers; delete old visits when you no longer need them (see the ways to adapt the sample).',
    'The building\'s own management team is a tenant on the ground floor, so contractors working on the building itself have a host like anyone else.',
  ],
  faq: [
    { q: 'How do I print the list of who is in the building for a fire alarm?', a: 'Print the report Fire roll call list. It lists every visitor and contractor signed in and not signed out, a page for each floor, with their host and badge.' },
    { q: 'How do I print one visitor\'s pass?', a: 'Open the visit in the Visits form, or open the print template Visitor pass from Print templates and choose that visit, then press Print.' },
    { q: 'A visitor left without signing out. What do I do?', a: 'Type the time they left, if the host knows it, in Signed Out; otherwise set Status to Not signed out. Leave Badge Returned unticked if they took the badge, and it will show in Badges not returned.' },
    { q: 'How do I know a contractor may start work?', a: 'Open the query Contractor inductions and find them: their latest induction must show Valid. If it has expired, give the induction again before they start, and issue a permit for any risky work.' },
    { q: 'Why is the car registration in such an odd pattern?', a: 'So that no plate in the sample could be a real person\'s. Type real registrations as they are written in your own country.' },
    { q: 'Where do the tenants\' own staff go in the roll call?', a: 'Each tenant\'s fire warden counts their staff at the assembly point; the desk adds one Staff line for each tenant with the number in People.' },
    { q: 'How long should visitor records be kept?', a: 'Only as long as you need them, which many buildings set at a year. Use the query Visitor book, last 7 days with its Days Ago criterion changed to find older visits, and delete them.' },
  ],
};

const CONTRACTOR_TAILS = ['Electrical', 'Mechanical', 'Lifts', 'Cleaning', 'Facilities', 'Fire Safety', 'Glazing', 'Cabling', 'Joinery', 'Plumbing'];
const TENANT_TAILS = ['Partners', 'Studio', 'Consulting', 'Analytics', 'Legal', 'Design', 'Labs', 'Associates', 'Recruitment', 'Media'];
const GUEST_TAILS = ['Group', 'Holdings', 'Services', 'Systems', 'Finance', 'Logistics', 'Health', 'Software', 'Property', 'Print'];
const FLOORS = [
  ['Ground floor', 0, 'Assembly point A, the car park by the canal gate', 'Front desk, post room and the building management office'],
  ['First floor', 1, 'Assembly point A, the car park by the canal gate', 'Shared meeting rooms 1.1 to 1.4'],
  ['Second floor', 2, 'Assembly point A, the car park by the canal gate', null],
  ['Third floor', 3, 'Assembly point B, the square on Mill Lane', null],
  ['Fourth floor', 4, 'Assembly point B, the square on Mill Lane', null],
  ['Fifth floor', 5, 'Assembly point B, the square on Mill Lane', null],
  ['Sixth floor', 6, 'Assembly point B, the square on Mill Lane', 'Roof plant room above, by permit only'],
];
// The tenants by floor and size: [floor level, staff].
const TENANCIES = [[1, 34], [2, 62], [2, 18], [3, 105], [4, 48], [4, 12], [5, 80], [6, 26], [6, 40]];
const PURPOSES = { Guest: ['Meeting', 'Meeting', 'Meeting', 'Lunch', 'Training'], Client: ['Meeting', 'Meeting', 'Workshop', 'Review'], Supplier: ['Meeting', 'Stock check', 'Service visit'], Candidate: ['Interview'], Contractor: ['Works', 'Maintenance', 'Repair', 'Survey', 'Installation'] };
const PERMITS = [['Hot work', 3], ['Work at height', 5], ['Electrical isolation', 4], ['Roof access', 2], ['Confined space', 1]];
const CARRIERS = ['Overland Parcel', 'Swift Freight', 'Cargo Line Couriers', 'Postal delivery', 'Same-day courier', 'Northside Cycle Couriers'];
const DELIVERY_KINDS = [['Parcel', 60], ['Letter', 15], ['Large box', 10], ['Food order', 8], ['Flowers', 4], ['Pallet', 3]];

/** Fill a Copperfield House database made from `spec`. `r` is random(), `cal` calendar(). Answers counts. */
export function fill(base, { r, cal, days = 400 }) {
  const counts = {};
  const add = (table, values) => { counts[table] = (counts[table] || 0) + 1; return base.insert(table, values); };
  const slug = (name) => name.toLowerCase().replace(/[^a-z]+/g, '');
  // A time `m` minutes after the start of day `d`, as a datetime.
  const at = (d, m) => cal.time(d + Math.floor(m / 1440), Math.floor((m % 1440) / 60), m % 60);
  const clock = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  // The minute the file is made at: nothing after it has happened yet.
  const NOW = cal.hour * 60;
  const happened = (d, m) => d * 1440 + m <= NOW;
  const numbered = (prefix, width) => { const n = {}; return (d) => { const y = cal.at(d).getFullYear(); n[y] = (n[y] || 0) + 1; return `${prefix}-${y}-${String(n[y]).padStart(width, '0')}`; }; };

  add('Business', businessRecord({
    name: 'Copperfield House', domain: 'copperfieldhouse.example', phone: '020 7946 0730',
    address: { Address: '40 Canal Walk', City: 'Manchester', Postcode: 'M4 6QR', Country: 'United Kingdom' },
    terms: 'Building services are charged to tenants under their leases.',
    footer: 'Front desk open Monday to Friday 07:30 to 19:00. Out of hours, ring the security line on the door.',
  }));

  // The desk team, who give inductions and issue permits.
  const desk = [];
  for (let i = 0; i < 3; i++) { const p = person(r); desk.push(`${p['First Name']} ${p['Last Name']}`); }

  // Floors.
  const floors = FLOORS.map(([name, level, point, notes]) => ({ level, id: add('Floors', { Name: name, Level: level, 'Assembly Point': point, Notes: notes }) }));
  const floorOf = (level) => floors.find((f) => f.level === level);

  // Tenants and their staff who host visitors. The building's own team is on the ground floor.
  let phone = 100;
  const tenants = [];
  const addTenant = (name, level, staff, suite, mgmt = false) => {
    const domain = `${slug(name)}.example`;
    const id = add('Tenants', { Name: name, Floor: floorOf(level).id, Suite: suite, Staff: staff, 'Reception Phone': `020 7946 0${phone++}`, 'E-mail': `reception@${domain}`, 'Moved In': cal.day(-r.int(500, 4000)), Active: true });
    const t = { id, name, level, staff, mgmt, hosts: [] };
    const n = mgmt ? 3 : 3 + Math.round(staff / 12);
    for (let k = 0; k < n; k++) {
      const p = person(r, { domain });
      const host = { id: add('Hosts', { ...p, Tenant: id, Phone: `07700 900${String(100 + (phone++ % 800)).padStart(3, '0')}`, Active: true }), name: `${p['First Name']} ${p['Last Name']}`, t, weight: k === 0 ? 3 : 1 };
      t.hosts.push(host);
    }
    tenants.push(t);
    return t;
  };
  const management = addTenant('Copperfield House Management', 0, 6, 'G.01', true);
  const tenantNames = companies(r, TENANCIES.length, TENANT_TAILS);
  TENANCIES.forEach(([level, staff], i) => addTenant(tenantNames[i], level, staff, `${level}.0${1 + TENANCIES.slice(0, i).filter((x) => x[0] === level).length}`));
  const occupiers = tenants.filter((t) => !t.mgmt);
  const hostOf = (t) => r.weighted(t.hosts.map((h) => [h, h.weight]));
  const anyHost = () => hostOf(r.weighted(occupiers.map((t) => [t, t.staff])));
  const facilities = management.hosts[0];

  // Visitors, written the first time they come or are booked.
  const plate = () => `ZX-${r.int(1000, 9999)}-${r.pick(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'L', 'M', 'N'])}`;
  const guestFirms = companies(r, 70, GUEST_TAILS).filter((n) => !tenantNames.includes(n));
  const newVisitor = (kind, company) => {
    const p = person(r);
    return { id: null, kind, company, first: p['First Name'], last: p['Last Name'], car: r.chance(kind === 'Contractor' ? 0.75 : kind === 'Candidate' ? 0.2 : 0.3) ? plate() : null, visits: 0, valid: -9999, induction: null };
  };
  const visitorId = (v, d) => {
    if (!v.id) v.id = add('Visitors', { 'First Name': v.first, 'Last Name': v.last, Company: v.company, 'Car Registration': v.car, Kind: v.kind, Regular: false, 'First Visit': cal.day(d) });
    return v.id;
  };
  // Contractors from a dozen firms; each works for the building or for one tenant.
  const firms = companies(r, 12, CONTRACTOR_TAILS);
  const contractors = [];
  for (let i = 0; i < 64; i++) {
    const v = newVisitor('Contractor', firms[i % firms.length]);
    v.host = r.chance(0.6) ? facilities : anyHost();
    v.weight = r.weighted([[0.4, 3], [1, 3], [3, 1]]);
    contractors.push(v);
  }
  // Regular visitors: clients and suppliers who come most weeks to one host.
  const regulars = [];
  for (let i = 0; i < 70; i++) {
    const v = newVisitor(r.chance(0.6) ? 'Client' : 'Supplier', r.pick(guestFirms));
    v.host = anyHost();
    regulars.push(v);
  }
  const guests = [];
  // Three contractors who came once, about eleven months ago, for a single job: their inductions run out in the coming weeks.
  const oneOff = [0, 1, 2].map(() => ({ v: newVisitor('Contractor', r.pick(firms)), d: cal.workday(-364 + r.int(3, 24)), host: r.chance(0.5) ? facilities : anyHost() }));

  // Badges in the tray, and more added as some go missing.
  const badges = [];
  const newBadge = (kind, d) => {
    const list = badges.filter((b) => b.kind === kind);
    const number = kind === 'Visitor' ? `V-${String(list.length + 1).padStart(3, '0')}` : `C-${String(list.length + 1).padStart(2, '0')}`;
    const b = { kind, number, free: -Infinity, lost: null, issued: false };
    b.id = add('Badges', { Number: number, Kind: kind, Status: 'Available', 'Added On': cal.day(d) });
    badges.push(b);
    return b;
  };

  // From the first of a month, thirteen months back.
  let start = -days;
  while (cal.at(start).getDate() !== 1) start++;
  for (let i = 0; i < 40; i++) newBadge('Visitor', start - 400);
  for (let i = 0; i < 15; i++) newBadge('Contractor', start - 400);

  // Inductions each contractor took before the records begin, in date order, valid for a year.
  const inductionNumber = numbered('IND', 4);
  const induct = (v, d) => {
    if (v.induction) base.update('Inductions', v.induction, { Renewed: true });
    v.induction = add('Inductions', { Number: inductionNumber(d), Visitor: visitorId(v, d), 'Given On': cal.day(d), 'Valid Until': cal.day(d + 364), 'Given By': r.pick(desk), Renewed: false });
    v.valid = d + 364;
  };
  for (const v of contractors.map((x) => ({ x, d: start - r.int(1, 360) })).sort((a, b) => a.d - b.d)) induct(v.x, v.d);

  const visitNumber = numbered('VIS', 5);
  const permitNumber = numbered('PTW', 4);
  const deliveryNumber = numbered('DLV', 5);
  const drillNumber = numbered('DRL', 2);
  // Fire drills in the middle of each quarter's second month, and two false alarms.
  const drills = new Map();
  for (let d = start; d <= 0; d++) {
    const t = cal.at(d);
    if (t.getDate() === 15 && [1, 4, 7, 10].includes(t.getMonth())) drills.set(cal.workday(d), ['Drill', 11 * 60]);
  }
  for (let k = 0; k < 2; k++) drills.set(cal.workday(start + r.int(30, days - 30)), ['Alarm', r.int(9 * 60 + 30, 15 * 60 + 30)]);

  const lostDay = cal.workday(-r.int(12, 40));
  let lostDone = false;
  // A parcel taken in four or more working days ago for someone on long leave, still on the shelf.
  let holdDay = -4;
  while ([0, 6].includes(cal.weekday(holdDay)) || (cal.at(holdDay).getMonth() === 11 && [25, 26].includes(cal.at(holdDay).getDate())) || (cal.at(holdDay).getMonth() === 0 && cal.at(holdDay).getDate() === 1)) holdDay--;

  for (let d = start; d <= 14; d++) {
    const wd = cal.weekday(d);
    const weekend = wd === 0 || wd === 6;
    const month = cal.at(d).getMonth();
    const date = cal.at(d).getDate();
    // Closed to visitors on Christmas Day, Boxing Day and New Year's Day.
    const holiday = (month === 11 && (date === 25 || date === 26)) || (month === 0 && date === 1);
    const plans = [];
    const plan = (v, host, kind, extra = {}) => {
      const pre = extra.pre ?? r.chance({ Contractor: 0.9, Candidate: 1, Client: 0.8, Supplier: 0.75 }[kind] ?? 0.6);
      const expected = extra.expected ?? (kind === 'Contractor' ? r.int(30, 42) * 15 : r.int(34, 66) * 15);
      const arrival = extra.night ? expected : Math.max(0, expected + (pre ? r.int(-10, 20) : 0));
      const length = extra.length ?? (kind === 'Contractor' ? r.int(120, 480) : kind === 'Candidate' ? r.int(45, 90) : r.int(30, 150));
      const late = r.chance(0.02) ? r.int(60, 150) : 0;
      plans.push({
        // Visits end by 22:00, but out-of-hours works run on through the night.
        v, host, kind, pre, expected, arrival, out: extra.night ? arrival + length : Math.min(arrival + length + late, 22 * 60), purpose: extra.purpose ?? r.pick(PURPOSES[kind]),
        noShow: pre && r.chance(0.04), cancelled: pre && r.chance(0.02), forgot: r.chance(0.02), parking: Boolean(v.car) && r.chance(0.8),
      });
    };
    if (!weekend && !holiday) {
      const season = month === 7 ? 0.7 : month === 11 && date > 15 ? 0.55 : month === 0 && date < 8 ? 0.6 : 1;
      const n = Math.round(25 * season * [1, 0.9, 1.05, 1.1, 1.05, 0.8, 1][wd] * (0.8 + r.next() * 0.4));
      for (let k = 0; k < n; k++) {
        const kind = r.weighted([['Contractor', 14], ['Regular', 26], ['Guest', 50], ['Candidate', 10]]);
        if (kind === 'Contractor') { const v = r.weighted(contractors.map((c) => [c, c.weight])); plan(v, v.host, 'Contractor'); }
        else if (kind === 'Regular') { const v = r.pick(regulars); plan(v, v.host, v.kind); }
        else if (kind === 'Candidate') plan(newVisitor('Candidate', null), anyHost(), 'Candidate');
        else {
          // Most guests are new; some have been before.
          const v = guests.length > 30 && r.chance(0.45) ? r.pick(guests) : newVisitor(r.chance(0.5) ? 'Guest' : 'Client', r.pick(guestFirms));
          if (!v.listed) { v.listed = true; guests.push(v); }
          plan(v, anyHost(), v.kind);
        }
      }
      // Now and then a tenant holds an evening event, with guests until nine.
      if (r.chance(0.05)) {
        const host = anyHost();
        for (let k = r.int(8, 18); k > 0; k--) plan(newVisitor('Guest', r.chance(0.7) ? r.pick(guestFirms) : null), host, 'Guest', { pre: true, expected: 17 * 60 + 30, length: r.int(90, 200), purpose: 'Event' });
      }
    } else {
      // Weekend and holiday works: lifts, cleaning and fit-outs while the offices are empty.
      for (let k = r.int(1, 3); k > 0; k--) { const v = r.weighted(contractors.map((c) => [c, c.weight])); plan(v, v.host, 'Contractor', { pre: true, purpose: holiday ? 'Holiday works' : 'Weekend works' }); }
    }
    for (const o of oneOff.filter((x) => x.d === d)) {
      plan(o.v, o.host, 'Contractor', { pre: true, purpose: 'Survey' });
      Object.assign(plans[plans.length - 1], { noShow: false, cancelled: false });
    }
    // When the file is made, there are always people in the building: at night, the out-of-hours works.
    if (d === 0) {
      const inside = plans.filter((p) => !p.noShow && !p.cancelled && p.arrival <= NOW && p.out > NOW).length;
      for (let k = inside; k < 3; k++) {
        const v = r.weighted(contractors.map((c) => [c, c.weight]));
        plan(v, facilities, 'Contractor', { pre: true, expected: Math.max(0, NOW - r.int(20, 90)), length: 300, purpose: 'Out-of-hours works', night: true });
        Object.assign(plans[plans.length - 1], { noShow: false, cancelled: false, forgot: false });
      }
    }
    // Ahead of today, only what has been booked: the further ahead, the fewer.
    const kept = plans.filter((p) => (d < 0 || happened(d, p.arrival) ? true : p.pre && (d <= 2 || r.chance(Math.max(0.25, 1 - d * 0.06)))));
    kept.sort((x, y) => x.expected - y.expected || x.arrival - y.arrival);

    for (const p of kept) {
      const came = happened(d, p.arrival) && !p.noShow && !p.cancelled;
      const status = p.cancelled && d <= 0 && happened(d, p.arrival) ? 'Cancelled' : p.noShow && happened(d, p.arrival) ? 'No show' : !came ? 'Expected' : null;
      const visit = {
        Number: visitNumber(d), Visitor: visitorId(p.v, d), Host: p.host.id, 'Expected On': cal.day(d), 'Expected At': clock(p.expected),
        'Pre-registered': p.pre, Purpose: p.purpose, Parking: p.parking, 'Valid Until': at(d, p.purpose === 'Event' ? 22 * 60 : 18 * 60 + 30), Status: status || 'On site', 'Badge Returned': false,
      };
      p.came = came;
      if (came) {
        p.v.visits++;
        // A badge from the tray, the lowest number free; a new one when none is.
        const kind = p.kind === 'Contractor' ? 'Contractor' : 'Visitor';
        const now = d * 1440 + p.arrival;
        const b = badges.find((x) => x.kind === kind && !x.lost && x.free <= now) || newBadge(kind, d);
        const left = happened(d, p.out);
        // One visitor a few weeks ago walked off with their badge without signing out.
        const lose = left && d === lostDay && !lostDone;
        if (lose) lostDone = true;
        const signedOut = left && !p.forgot && !lose;
        const returned = left && !lose && (p.forgot ? r.chance(0.8) : r.chance(0.998));
        b.free = returned ? d * 1440 + p.out : Infinity;
        if (left && !returned) b.lost = d;
        b.issued = !left;
        Object.assign(visit, {
          'Signed In': at(d, p.arrival), 'Signed Out': signedOut ? at(d, p.out) : null, Badge: b.id, 'Badge Returned': returned,
          Status: !left ? 'On site' : signedOut ? 'Left' : 'Not signed out',
        });
        p.signedOut = signedOut;
        // A contractor whose induction has run out takes it again before starting.
        if (p.kind === 'Contractor' && p.v.valid < d) induct(p.v, d);
      }
      p.id = add('Visits', visit);
      if (came && p.kind === 'Contractor' && r.chance(0.25)) {
        const where = p.host === facilities ? r.pick(['Roof plant room', 'Basement plant room', 'Riser cupboards', 'Lift motor room', 'Car park', 'Loading bay']) : `${FLOORS.find((f) => f[1] === p.host.t.level)[0]}, ${p.host.t.name}`;
        const to = Math.min(p.arrival + 480, 19 * 60);
        // Handed back when they sign out, or closed by the desk when it runs out.
        const closed = p.signedOut ? Math.min(p.out, to) : happened(d, to) ? to : null;
        add('Permits', {
          Number: permitNumber(d), Visit: p.id, Kind: r.weighted(PERMITS), Location: where, 'Valid From': at(d, p.arrival), 'Valid To': at(d, to),
          'Issued By': r.pick(desk), 'Closed At': closed === null ? null : at(d, closed), Status: closed === null ? 'Open' : 'Closed',
        });
      }
    }

    // A fire drill or alarm: the roll call of who was signed in then, and each tenant's staff.
    const drill = drills.get(d);
    if (drill && happened(d, drill[1])) {
      const [kind, t] = drill;
      const listed = kept.filter((p) => p.came && p.arrival <= t && (!p.signedOut || p.out > t));
      const minutes = Math.round((3 + r.next() * 4.5) * 10) / 10;
      const missing = listed.filter((p) => p.out <= t);
      const id = add('Roll Calls', {
        Number: drillNumber(d), Kind: kind, 'Started At': at(d, t), 'Building Clear At': at(d, t + Math.ceil(minutes)), 'Minutes to Clear': minutes,
        'All Accounted': true, 'Led By': facilities.name,
        Notes: [
          kind === 'Drill' ? 'Planned quarterly drill; tenants were told the week before.' : r.pick(['False alarm: a detector on the fourth floor set off by toast.', 'False alarm: steam from the shower room on the ground floor.']),
          missing.length ? `${missing.length === 1 ? 'One visitor' : `${missing.length} visitors`} on the list had left without signing out, found by ringing their host.` : 'Everyone on the list was found.',
          minutes > 6 ? 'Slow to clear: the fifth floor waited for the lifts. Wardens to remind staff to use the stairs.' : 'Cleared in good time.',
        ].join(' '),
      });
      for (const p of listed) {
        add('Roll Call Lines', { 'Roll Call': id, Floor: floorOf(p.host.t.level).id, Kind: p.kind === 'Contractor' ? 'Contractor' : 'Visitor', Name: `${p.v.first} ${p.v.last}`, Company: p.v.company, People: 1, Accounted: p.out > t, Visit: p.id });
      }
      for (const tn of tenants) add('Roll Call Lines', { 'Roll Call': id, Floor: floorOf(tn.level).id, Kind: 'Staff', Name: `${tn.name} staff`, Company: tn.name, People: Math.round(tn.staff * (0.5 + r.next() * 0.35)), Accounted: true });
    }

    // Deliveries, on working days, until now: most collected the same day, some left while the addressee is away.
    if (!weekend && !holiday && d <= 0) {
      let held = d === holdDay;
      const n = Math.round((month === 11 && date < 20 ? 14 : 10) * (0.7 + r.next() * 0.6));
      const times = Array.from({ length: n }, () => r.int(8 * 60 + 30, 16 * 60 + 30)).sort((x, y) => x - y);
      for (const m of times) {
        if (!happened(d, m)) break;
        const host = anyHost();
        const kind = held ? 'Large box' : r.weighted(DELIVERY_KINDS);
        let at2 = null;
        const lag = held ? 'held' : kind === 'Food order' || kind === 'Flowers' ? 'now' : r.weighted([['day', 75], ['next', 14], ['away', 9], ['never', 2]]);
        held = false;
        if (lag === 'now') at2 = [d, m + r.int(5, 45)];
        else if (lag === 'day') { const c = m + r.int(15, 240); at2 = c <= 18 * 60 ? [d, c] : [cal.workday(d + 1), r.int(9 * 60, 11 * 60)]; }
        else if (lag === 'next') at2 = [cal.workday(d + 1), r.int(8 * 60 + 45, 14 * 60)];
        else if (lag === 'away') at2 = [cal.workday(d + r.int(3, 12)), r.int(9 * 60, 16 * 60)];
        else if (lag === 'held') at2 = [cal.workday(d + 21), r.int(9 * 60, 16 * 60)];
        const collected = at2 && happened(at2[0], at2[1]);
        const returned = lag === 'never' && d + 14 <= 0;
        const colleague = r.chance(0.2) ? r.pick(host.t.hosts) : host;
        add('Deliveries', {
          Number: deliveryNumber(d), 'Received At': at(d, m), Carrier: kind === 'Letter' ? 'Postal delivery' : r.pick(CARRIERS), Host: host.id, Kind: kind,
          Pieces: kind === 'Parcel' ? r.weighted([[1, 8], [2, 2], [3, 1]]) : kind === 'Large box' ? r.int(1, 4) : 1,
          Reference: kind === 'Food order' || kind === 'Flowers' ? null : `TRK${r.int(10000000, 99999999)}`,
          'Stored In': kind === 'Food order' ? 'Fridge' : kind === 'Flowers' ? 'Front desk' : kind === 'Pallet' ? 'Post room floor' : kind === 'Letter' ? 'Post room pigeonholes' : `Shelf ${r.pick(['A', 'B', 'C'])}${r.int(1, 4)}`,
          'Collected At': collected ? at(at2[0], at2[1]) : null, 'Collected By': collected ? colleague.name : returned ? 'Returned to carrier' : null,
          Status: collected ? 'Collected' : returned ? 'Returned' : 'Waiting',
        });
      }
    }
  }

  // Badges as they stand now: in the tray, out with someone in the building, or missing.
  for (const b of badges) {
    const status = b.lost !== null ? (b.lost >= -30 ? 'Missing' : 'Written off') : b.issued ? 'Issued' : 'Available';
    if (status !== 'Available') base.update('Badges', b.id, { Status: status });
  }
  // Regulars are those who have come a dozen times or more.
  for (const v of [...regulars, ...contractors, ...guests]) if (v.id && v.visits >= 12) base.update('Visitors', v.id, { Regular: true });
  return counts;
}
