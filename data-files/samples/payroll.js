// HR, payroll and timesheets: the staff records any small business with
// employees keeps, shown at Wrenmoor Garden Centre, an invented garden centre
// with a cafe and about thirty staff in three departments. Some are salaried,
// most are paid by the hour from weekly timesheets, and several work
// part-time. Everyone is paid monthly, the hourly staff a month behind.
//
// The people, their jobs and pay over time, the contracts and checks held for
// each, holiday allowances and every absence, weekly timesheets with a line a
// day, pay runs, payslips with a line for each payment and deduction, the
// business's own deduction rates, and an annual pay summary for each person.
// The tax, social insurance and pension rates are invented examples, named so,
// to be replaced with the business's own country's rules.
//
// Its records start on 1 January last year and run a day at a time to today:
// staff join and leave, book holiday and fall ill, work their rota with extra
// hours in the busy spring and before Christmas, and are paid at the end of
// each month. Holidays are booked ahead into the rest of this year.

import { address, BUSINESS_ABOUT, BUSINESS_TABLE, businessRecord, FIRST, LAST, money, person, phoneFor } from './util.js';

const ref = (table) => ({ type: 'integer', points: table });
// The business's own details at the head of every document.
const LETTERHEAD = { table: 'Business', fields: ['Name', 'Address', 'City', 'Postcode', 'Phone', 'E-mail'] };
const NAME = '[First Name] & " " & [Last Name]';
// Years served at the work anniversary this month or next.
const YEARS = 'Year(Date()) - Year([Start Date]) + IIf(Month([Start Date]) < Month(Date()), 1, 0)';
// The current year of a record with a start and an end: today falls between them.
// The latest pay run's payslips: this month's once its pay date (the last
// weekday of the month) has come, last month's until then. The first of next
// month gives the days left in this one.
const NEXT_MONTH = 'IIf(Month(Date()) = 12, (Year(Date()) + 1) & "-01-01", Year(Date()) & "-" & Format(Month(Date()) + 1, "00") & "-01")';
const DAYS_LEFT = `(DateDiff("d", Date(), ${NEXT_MONTH}) - 1)`;
const PAID_THIS_MONTH = `(${DAYS_LEFT} = 0 Or (Weekday(Date()) = 6 And ${DAYS_LEFT} <= 2) Or (Weekday(Date()) = 7 And ${DAYS_LEFT} <= 1))`;
const LATEST_PAY = `DateDiff("d", [Pay Date], Date()) >= 0 And DateDiff("m", [Pay Date], Date()) = IIf(${PAID_THIS_MONTH}, 0, 1)`;

// The print templates use where, if and format.
export const minOffice = '2.16.0';

const THIS_YEAR = (starts, ends, total) => [
  { expr: `DateDiff("d", [${starts}], Date())`, as: 'Days Into Year', criteria: ['>= 0'], show: false, ...(total ? { total: 'where' } : {}) },
  { expr: `DateDiff("d", Date(), [${ends}])`, as: 'Days Left in Year', criteria: ['>= 0'], show: false, ...(total ? { total: 'where' } : {}) },
];

export const spec = {
  negative: {},
  tables: [
    BUSINESS_TABLE,
    { name: 'Departments', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Code', type: 'text', unique: true }, { name: 'Notes', type: 'text' },
    ] },
    // Department comes before Manager: a query joins Employees to Departments by the first field that relates them.
    { name: 'Employees', show: ['Employee No', 'First Name', 'Last Name'], fields: [
      { name: 'Employee No', type: 'text', required: true, unique: true }, { name: 'First Name', type: 'text' }, { name: 'Last Name', type: 'text', required: true },
      { name: 'Job Title', type: 'text' }, { name: 'Department', ...ref('Departments') }, { name: 'Manager', ...ref('Employees') },
      { name: 'Start Date', type: 'date' }, { name: 'Leave Date', type: 'date' }, { name: 'Leaving Reason', type: 'text' }, { name: 'Date of Birth', type: 'date' },
      { name: 'Address', type: 'text' }, { name: 'City', type: 'text' }, { name: 'Postcode', type: 'text' }, { name: 'Phone', type: 'text' }, { name: 'E-mail', type: 'text' },
      { name: 'Pay Type', type: 'text', default: 'Hourly' }, { name: 'Hourly Rate', type: 'currency' }, { name: 'Annual Salary', type: 'currency' },
      { name: 'Hours per Week', type: 'number' }, { name: 'Days per Week', type: 'number' }, { name: 'Pay Frequency', type: 'text', default: 'Monthly' },
      { name: 'Holiday Days', type: 'number' }, { name: 'Notice Weeks', type: 'integer', default: 2 }, { name: 'Tax Code', type: 'text' },
      { name: 'Bank Code', type: 'text' }, { name: 'Account Number', type: 'text' },
      { name: 'Emergency Contact', type: 'text' }, { name: 'Emergency Relationship', type: 'text' }, { name: 'Emergency Phone', type: 'text' },
      { name: 'Notes', type: 'longtext' },
    ] },
    { name: 'Pay Changes', fields: [
      { name: 'Employee', ...ref('Employees'), required: true }, { name: 'Effective From', type: 'date' }, { name: 'Reason', type: 'text' },
      { name: 'Job Title', type: 'text' }, { name: 'Pay Type', type: 'text' }, { name: 'Hourly Rate', type: 'currency' }, { name: 'Annual Salary', type: 'currency' },
      { name: 'Hours per Week', type: 'number' }, { name: 'Days per Week', type: 'number' }, { name: 'Notes', type: 'text' },
    ] },
    { name: 'Documents Held', fields: [
      { name: 'Employee', ...ref('Employees'), required: true }, { name: 'Document', type: 'text', required: true }, { name: 'Reference', type: 'text' },
      { name: 'Issued On', type: 'date' }, { name: 'Completed On', type: 'date' }, { name: 'Checked By', ...ref('Employees') },
      { name: 'Expires On', type: 'date' }, { name: 'Notes', type: 'text' },
    ] },
    { name: 'Holiday Allowances', show: ['Employee', 'Holiday Year'], fields: [
      { name: 'Employee', ...ref('Employees'), required: true }, { name: 'Reference', type: 'text' }, { name: 'Holiday Year', type: 'text' },
      { name: 'Year Starts', type: 'date' }, { name: 'Year Ends', type: 'date' }, { name: 'Days per Week', type: 'number' },
      { name: 'Full-time Days', type: 'number', default: 28 }, { name: 'Allowance', type: 'number' }, { name: 'Carried Over', type: 'number', default: 0 },
      { name: 'Days Booked', type: 'number', default: 0 }, { name: 'Notes', type: 'text' },
    ] },
    { name: 'Absences', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Employee', ...ref('Employees'), required: true }, { name: 'Kind', type: 'text', default: 'Holiday' },
      { name: 'Allowance', ...ref('Holiday Allowances') }, { name: 'Starts', type: 'date' }, { name: 'Ends', type: 'date' }, { name: 'Days', type: 'number' },
      { name: 'Reason', type: 'text' }, { name: 'Status', type: 'text', default: 'Requested' }, { name: 'Requested On', type: 'date' },
      { name: 'Decided By', ...ref('Employees') }, { name: 'Decided On', type: 'date' }, { name: 'Paid', type: 'yesno', default: true }, { name: 'Notes', type: 'text' },
    ] },
    { name: 'Pay Years', fields: [
      { name: 'Name', type: 'text', required: true, unique: true }, { name: 'Starts', type: 'date' }, { name: 'Ends', type: 'date' }, { name: 'Notes', type: 'text' },
    ] },
    { name: 'Pay Runs', show: ['Number', 'Period'], fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Pay Year', ...ref('Pay Years'), required: true }, { name: 'Frequency', type: 'text', default: 'Monthly' },
      { name: 'Period', type: 'text' }, { name: 'Period Starts', type: 'date' }, { name: 'Period Ends', type: 'date' }, { name: 'Pay Date', type: 'date' },
      { name: 'Status', type: 'text', default: 'Open' }, { name: 'Notes', type: 'text' },
    ] },
    // Employee comes before Approved By, so a query joins a timesheet to the person whose hours they are.
    { name: 'Timesheets', show: ['Number'], fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Employee', ...ref('Employees'), required: true }, { name: 'Week Commencing', type: 'date' },
      { name: 'Contract Hours', type: 'number' }, { name: 'Total Hours', type: 'number' }, { name: 'Overtime Hours', type: 'number' },
      { name: 'Status', type: 'text', default: 'Submitted' }, { name: 'Submitted On', type: 'date' }, { name: 'Approved By', ...ref('Employees') },
      { name: 'Approved On', type: 'date' }, { name: 'Pay Run', ...ref('Pay Runs') }, { name: 'Notes', type: 'text' },
    ] },
    { name: 'Timesheet Lines', fields: [
      { name: 'Timesheet', ...ref('Timesheets'), required: true }, { name: 'Date', type: 'date' }, { name: 'Day', type: 'text' },
      { name: 'Start', type: 'text' }, { name: 'End', type: 'text' }, { name: 'Break Minutes', type: 'integer', default: 0 },
      { name: 'Hours', type: 'number' }, { name: 'Overtime', type: 'number', default: 0 }, { name: 'Note', type: 'text' },
    ] },
    { name: 'Deduction Rates', fields: [
      { name: 'Name', type: 'text', required: true }, { name: 'Paid By', type: 'text', default: 'Employee' }, { name: 'Percent', type: 'number' },
      { name: 'Fixed Amount', type: 'currency' }, { name: 'Threshold', type: 'currency' }, { name: 'Applies From', type: 'date' }, { name: 'Applies To', type: 'date' },
      { name: 'Print Order', type: 'integer' }, { name: 'Notes', type: 'text' },
    ] },
    { name: 'Payslips', fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Pay Run', ...ref('Pay Runs'), required: true }, { name: 'Employee', ...ref('Employees'), required: true },
      { name: 'Pay Date', type: 'date' }, { name: 'Tax Code', type: 'text' }, { name: 'Hours From', type: 'date' }, { name: 'Hours To', type: 'date' }, { name: 'Hours Paid', type: 'number' },
      { name: 'Gross', type: 'currency' }, { name: 'Deductions', type: 'currency' },
      { name: 'Net', type: 'currency' }, { name: 'Employer Costs', type: 'currency' }, { name: 'Gross to Date', type: 'currency' },
      { name: 'Deductions to Date', type: 'currency' }, { name: 'Net to Date', type: 'currency' },
    ] },
    { name: 'Payslip Lines', fields: [
      { name: 'Payslip', ...ref('Payslips'), required: true }, { name: 'Line', type: 'integer' }, { name: 'Kind', type: 'text', default: 'Payment' },
      { name: 'Item', type: 'text' }, { name: 'Hours', type: 'number' }, { name: 'Rate', type: 'currency' },
      { name: 'Amount', type: 'currency' }, { name: 'Year to Date', type: 'currency' },
    ] },
    { name: 'Annual Summaries', show: ['Number'], fields: [
      { name: 'Number', type: 'text', unique: true }, { name: 'Pay Year', ...ref('Pay Years'), required: true }, { name: 'Employee', ...ref('Employees'), required: true },
      { name: 'Tax Code', type: 'text' }, { name: 'Issued On', type: 'date' }, { name: 'Payslip Count', type: 'integer' }, { name: 'Gross Pay', type: 'currency' },
      { name: 'Deductions', type: 'currency' }, { name: 'Net Pay', type: 'currency' }, { name: 'Employer Costs', type: 'currency' }, { name: 'Notes', type: 'text' },
    ] },
    { name: 'Annual Summary Lines', fields: [
      { name: 'Annual Summary', ...ref('Annual Summaries'), required: true }, { name: 'Line', type: 'integer' }, { name: 'Kind', type: 'text' },
      { name: 'Item', type: 'text' }, { name: 'Amount', type: 'currency' },
    ] },
  ],
  queries: {
    'Who is off, next 7 days': { tables: ['Absences', 'Employees', 'Departments'], columns: [
      { expr: NAME, as: 'Employee' }, { table: 'Departments', field: 'Name', as: 'Department' }, { table: 'Absences', field: 'Kind' },
      { table: 'Absences', field: 'Starts', sort: 'asc' }, { table: 'Absences', field: 'Ends' }, { table: 'Absences', field: 'Days' },
      { expr: 'IIf(DateDiff("d", [Starts], Date()) >= 0 And DateDiff("d", Date(), [Ends]) >= 0, "Yes", "No")', as: 'Off Today' },
      { expr: 'DateDiff("d", Date(), [Starts])', as: 'Starts In', criteria: ['<= 7'], show: false },
      { expr: 'DateDiff("d", Date(), [Ends])', as: 'Ends In', criteria: ['>= 0'], show: false },
      { table: 'Absences', field: 'Status', criteria: ['In ("Approved", "Recorded")'], show: false },
    ] },
    'Leave requests to decide': { tables: ['Absences', 'Employees', 'Departments'], columns: [
      { table: 'Absences', field: 'Number' }, { expr: NAME, as: 'Employee' }, { table: 'Departments', field: 'Name', as: 'Department' },
      { table: 'Absences', field: 'Kind' }, { table: 'Absences', field: 'Starts', sort: 'asc' }, { table: 'Absences', field: 'Ends' },
      { table: 'Absences', field: 'Days' }, { table: 'Absences', field: 'Requested On' }, { expr: 'DateDiff("d", [Requested On], Date())', as: 'Days Waiting' },
      { table: 'Absences', field: 'Status', criteria: ['Requested'], show: false },
    ] },
    'Holidays left': { tables: ['Holiday Allowances', 'Employees', 'Departments'], columns: [
      { table: 'Departments', field: 'Name', as: 'Department', sort: 'asc' }, { expr: NAME, as: 'Employee', sort: 'asc' },
      { table: 'Holiday Allowances', field: 'Holiday Year' }, { table: 'Holiday Allowances', field: 'Allowance' },
      { table: 'Holiday Allowances', field: 'Carried Over' }, { table: 'Holiday Allowances', field: 'Days Booked' },
      { expr: '[Allowance] + Nz([Carried Over]) - Nz([Days Booked])', as: 'Days Left' },
      ...THIS_YEAR('Year Starts', 'Year Ends'),
      { table: 'Employees', field: 'Leave Date', criteria: ['Is Null'], show: false },
    ] },
    // Absences are joined through their Allowance (the first table they meet is Holiday Allowances), so only holiday is counted.
    'Holiday taken and to come': { tables: ['Absences', 'Holiday Allowances', 'Employees'], columns: [
      { expr: NAME, as: 'Employee', total: 'group', sort: 'asc' }, { table: 'Holiday Allowances', field: 'Holiday Year', total: 'group' },
      { table: 'Holiday Allowances', field: 'Days Booked', total: 'group' },
      { expr: 'IIf(DateDiff("d", [Starts], Date()) > 0, [Days], 0)', as: 'Days Taken', total: 'sum' },
      { expr: 'IIf(DateDiff("d", [Starts], Date()) > 0, 0, [Days])', as: 'Days To Come', total: 'sum' },
      { table: 'Absences', field: 'Status', total: 'where', criteria: ['Approved'] },
      ...THIS_YEAR('Year Starts', 'Year Ends', true),
    ] },
    'Timesheets to approve': { tables: ['Timesheets', 'Employees', 'Departments'], columns: [
      { table: 'Timesheets', field: 'Number' }, { expr: NAME, as: 'Employee' }, { table: 'Departments', field: 'Name', as: 'Department' },
      { table: 'Timesheets', field: 'Week Commencing', sort: 'asc' }, { table: 'Timesheets', field: 'Total Hours' }, { table: 'Timesheets', field: 'Overtime Hours' },
      { table: 'Timesheets', field: 'Submitted On' }, { expr: 'DateDiff("d", [Submitted On], Date())', as: 'Days Waiting' },
      { table: 'Timesheets', field: 'Status', criteria: ['Submitted'], show: false },
    ] },
    'Overtime by department, last month': { tables: ['Timesheet Lines', 'Timesheets', 'Employees', 'Departments'], columns: [
      { expr: 'Format([Date], "yyyy-mm")', as: 'Month', total: 'group' }, { table: 'Departments', field: 'Name', as: 'Department', total: 'group', sort: 'asc' },
      { table: 'Timesheet Lines', field: 'ID', as: 'Shifts', total: 'count' }, { table: 'Timesheet Lines', field: 'Hours', as: 'Hours Worked', total: 'sum' },
      { table: 'Timesheet Lines', field: 'Overtime', as: 'Overtime Hours', total: 'sum' },
      { expr: 'DateDiff("m", [Date], Date())', as: 'Months Ago', total: 'where', criteria: ['1'] },
    ] },
    'Hours and overtime by month': { tables: ['Timesheet Lines'], columns: [
      { expr: 'Format([Date], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Timesheet Lines', field: 'ID', as: 'Shifts', total: 'count' },
      { table: 'Timesheet Lines', field: 'Hours', as: 'Hours Worked', total: 'sum' }, { table: 'Timesheet Lines', field: 'Overtime', as: 'Overtime Hours', total: 'sum' },
    ] },
    'Payroll cost by department': { tables: ['Payslips', 'Pay Runs', 'Employees', 'Departments'], columns: [
      { expr: 'Format([Pay Runs].[Pay Date], "yyyy-mm")', as: 'Month', total: 'group', sort: 'asc' }, { table: 'Departments', field: 'Name', as: 'Department', total: 'group', sort: 'asc' },
      { table: 'Payslips', field: 'ID', as: 'Payslips', total: 'count' }, { table: 'Payslips', field: 'Gross', as: 'Gross', total: 'sum' },
      { table: 'Payslips', field: 'Employer Costs', as: 'Employer Costs', total: 'sum' }, { expr: 'Round([Gross] + [Employer Costs], 2)', as: 'Total Cost', total: 'sum' },
      { table: 'Payslips', field: 'Net', as: 'Net', total: 'sum' },
    ] },
    'Pay run totals': { tables: ['Pay Runs', 'Payslips'], columns: [
      { table: 'Pay Runs', field: 'Number', total: 'group' }, { table: 'Pay Runs', field: 'Frequency', total: 'group' }, { table: 'Pay Runs', field: 'Period', total: 'group' },
      { table: 'Pay Runs', field: 'Pay Date', total: 'group', sort: 'desc' }, { table: 'Payslips', field: 'ID', as: 'Payslips', total: 'count' },
      { table: 'Payslips', field: 'Gross', as: 'Gross', total: 'sum' }, { table: 'Payslips', field: 'Deductions', as: 'Deductions', total: 'sum' },
      { table: 'Payslips', field: 'Net', as: 'Net', total: 'sum' }, { table: 'Payslips', field: 'Employer Costs', as: 'Employer Costs', total: 'sum' },
    ] },
    'Pay to date': { tables: ['Payslips', 'Pay Runs', 'Pay Years', 'Employees'], columns: [
      { table: 'Pay Years', field: 'Name', as: 'Pay Year', total: 'group', sort: 'desc' }, { table: 'Employees', field: 'Employee No', total: 'group', sort: 'asc' },
      { expr: NAME, as: 'Employee', total: 'group' }, { table: 'Payslips', field: 'ID', as: 'Payslips', total: 'count' },
      { table: 'Payslips', field: 'Gross', as: 'Gross', total: 'sum' }, { table: 'Payslips', field: 'Deductions', as: 'Deductions', total: 'sum' },
      { table: 'Payslips', field: 'Net', as: 'Net', total: 'sum' }, { table: 'Payslips', field: 'Employer Costs', as: 'Employer Costs', total: 'sum' },
    ] },
    'Pay to date by item': { tables: ['Payslip Lines', 'Payslips', 'Pay Runs', 'Pay Years', 'Employees'], columns: [
      { table: 'Pay Years', field: 'Name', as: 'Pay Year', total: 'group', sort: 'desc' }, { table: 'Employees', field: 'Employee No', total: 'group', sort: 'asc' },
      { expr: NAME, as: 'Employee', total: 'group' }, { table: 'Payslip Lines', field: 'Kind', total: 'group', sort: 'desc' },
      { table: 'Payslip Lines', field: 'Item', total: 'group', sort: 'asc' }, { table: 'Payslip Lines', field: 'Amount', as: 'Amount to Date', total: 'sum' },
    ] },
    'Starters and leavers': { tables: ['Employees', 'Departments'], columns: [
      { table: 'Employees', field: 'Employee No' }, { expr: NAME, as: 'Employee' }, { table: 'Departments', field: 'Name', as: 'Department' },
      { table: 'Employees', field: 'Job Title' }, { table: 'Employees', field: 'Start Date', sort: 'desc' }, { table: 'Employees', field: 'Leave Date' },
      { table: 'Employees', field: 'Leaving Reason' },
      { expr: 'IIf(Nz([Leave Date], "") = "", IIf(DateDiff("d", Date(), [Start Date]) > 0, "Starting soon", "Joined"), IIf(DateDiff("d", [Start Date], Date()) <= 365, "Joined and left", "Left"))', as: 'Change' },
      { expr: 'DateDiff("d", [Start Date], Date())', as: 'Days Since Start', criteria: ['Between -90 And 365', ''], show: false },
      { expr: 'DateDiff("d", [Leave Date], Date())', as: 'Days Since Leaving', criteria: ['', 'Between 0 And 365'], show: false },
    ] },
    'Absence by person': { tables: ['Absences', 'Employees', 'Departments'], columns: [
      { expr: NAME, as: 'Employee', total: 'group' }, { table: 'Departments', field: 'Name', as: 'Department', total: 'group' },
      { expr: 'IIf([Kind] = "Sickness", 1, 0)', as: 'Sickness Spells', total: 'sum' }, { expr: 'IIf([Kind] = "Sickness", [Days], 0)', as: 'Sickness Days', total: 'sum' },
      { expr: 'IIf([Kind] = "Sickness", 0, [Days])', as: 'Other Days', total: 'sum' }, { table: 'Absences', field: 'Days', as: 'Days Absent', total: 'sum', sort: 'desc' },
      { table: 'Absences', field: 'Kind', total: 'where', criteria: ['<> "Holiday"'] },
      { table: 'Absences', field: 'Status', total: 'where', criteria: ['In ("Approved", "Recorded")'] },
      { expr: 'DateDiff("d", [Starts], Date())', as: 'Days Ago', total: 'where', criteria: ['Between 0 And 365'] },
    ] },
    'Birthdays and anniversaries': { tables: ['Employees', 'Departments'], columns: [
      { expr: NAME, as: 'Employee' }, { table: 'Departments', field: 'Name', as: 'Department' },
      { expr: 'IIf((Month([Date of Birth]) - Month(Date()) + 12) Mod 12 <= 1, Format([Date of Birth], "dd") & "/" & Format([Date of Birth], "mm"), "")', as: 'Birthday' },
      { expr: `IIf((Month([Start Date]) - Month(Date()) + 12) Mod 12 <= 1 And ${YEARS} >= 1, Format([Start Date], "dd") & "/" & Format([Start Date], "mm"), "")`, as: 'Work Anniversary' },
      { expr: `IIf((Month([Start Date]) - Month(Date()) + 12) Mod 12 <= 1 And ${YEARS} >= 1, ${YEARS}, Null)`, as: 'Years' },
      { expr: '(Month([Date of Birth]) - Month(Date()) + 12) Mod 12', as: 'Birthday In', criteria: ['<= 1', ''], show: false },
      { expr: '(Month([Start Date]) - Month(Date()) + 12) Mod 12', as: 'Anniversary In', criteria: ['', '<= 1'], show: false },
      { expr: YEARS, as: 'Years Served', criteria: ['', '>= 1'], show: false },
      { expr: 'DateDiff("d", [Start Date], Date())', as: 'Days Served', criteria: ['>= 0', '>= 0'], show: false },
      { table: 'Employees', field: 'Leave Date', criteria: ['Is Null', 'Is Null'], show: false },
      { table: 'Employees', field: 'Last Name', sort: 'asc', show: false },
    ] },
    'Documents to chase': { tables: ['Documents Held', 'Employees'], columns: [
      { expr: NAME, as: 'Employee' }, { table: 'Documents Held', field: 'Document' }, { table: 'Documents Held', field: 'Issued On', sort: 'asc' },
      { table: 'Documents Held', field: 'Completed On' }, { table: 'Documents Held', field: 'Expires On' },
      { expr: 'IIf(Nz([Completed On], "") = "", "Not done yet", "Check again before it expires")', as: 'To Do' },
      { table: 'Documents Held', field: 'Completed On', criteria: ['Is Null', ''], show: false },
      { expr: 'DateDiff("d", Date(), [Expires On])', as: 'Days to Expiry', criteria: ['', '<= 60'], show: false },
      { table: 'Employees', field: 'Leave Date', criteria: ['Is Null', 'Is Null'], show: false },
    ] },
    'Staff list': { tables: ['Employees', 'Departments'], columns: [
      { table: 'Departments', field: 'Name', as: 'Department', sort: 'asc' }, { table: 'Employees', field: 'Employee No' }, { expr: NAME, as: 'Employee' },
      { table: 'Employees', field: 'Last Name', sort: 'asc', show: false }, { table: 'Employees', field: 'Job Title' }, { table: 'Employees', field: 'Start Date' },
      { table: 'Employees', field: 'Pay Type' }, { table: 'Employees', field: 'Pay Frequency' }, { table: 'Employees', field: 'Hours per Week' },
      { table: 'Employees', field: 'Hourly Rate' }, { table: 'Employees', field: 'Annual Salary' }, { table: 'Employees', field: 'Phone' },
      { table: 'Employees', field: 'Leave Date', criteria: ['Is Null'], show: false },
      { expr: 'DateDiff("d", [Start Date], Date())', as: 'Days Served', criteria: ['>= 0'], show: false },
    ] },
    'Emergency contacts': { tables: ['Employees', 'Departments'], columns: [
      { table: 'Departments', field: 'Name', as: 'Department', sort: 'asc' }, { expr: NAME, as: 'Employee' }, { table: 'Employees', field: 'Last Name', sort: 'asc', show: false },
      { table: 'Employees', field: 'Phone' }, { table: 'Employees', field: 'Emergency Contact' }, { table: 'Employees', field: 'Emergency Relationship' },
      { table: 'Employees', field: 'Emergency Phone' }, { table: 'Employees', field: 'Leave Date', criteria: ['Is Null'], show: false },
    ] },
    'Pay history': { tables: ['Pay Changes', 'Employees'], columns: [
      { expr: NAME, as: 'Employee' }, { table: 'Employees', field: 'Last Name', sort: 'asc', show: false }, { table: 'Employees', field: 'First Name', sort: 'asc', show: false },
      { table: 'Pay Changes', field: 'Effective From', sort: 'desc' }, { table: 'Pay Changes', field: 'Reason' }, { table: 'Pay Changes', field: 'Job Title' },
      { table: 'Pay Changes', field: 'Pay Type' }, { table: 'Pay Changes', field: 'Hourly Rate' }, { table: 'Pay Changes', field: 'Annual Salary' },
      { table: 'Pay Changes', field: 'Hours per Week' },
    ] },
    'Deduction rates in use': { tables: ['Deduction Rates'], columns: [
      { table: 'Deduction Rates', field: 'Print Order', sort: 'asc', show: false }, { table: 'Deduction Rates', field: 'Name' }, { table: 'Deduction Rates', field: 'Paid By' },
      { table: 'Deduction Rates', field: 'Percent' }, { table: 'Deduction Rates', field: 'Fixed Amount' }, { table: 'Deduction Rates', field: 'Threshold' },
      { table: 'Deduction Rates', field: 'Applies From' }, { table: 'Deduction Rates', field: 'Applies To' },
      { expr: 'DateDiff("d", [Applies From], Date())', as: 'Days in Force', criteria: ['>= 0'], show: false },
      { expr: 'Nz(DateDiff("d", Date(), [Applies To]), 0)', as: 'Days Still to Run', criteria: ['>= 0'], show: false },
    ] },
  },
  // The print templates: each prints for the records it is for (its `where`),
  // and leaves out what does not apply to one record (an `if` on a block, a
  // field or a total). A record printed from its form always prints.
  documents: [
    // The latest pay run's payslips: this month's once its pay date has come, last month's until then.
    { name: 'Payslip', table: 'Payslips', paper: 'a4', letterhead: LETTERHEAD, where: LATEST_PAY, blocks: [
      { type: 'heading', text: 'Payslip: {Pay Run.Period}' },
      { type: 'fields', columns: 3, items: [
        { field: 'Employee', label: 'Name' }, { field: 'Employee.Employee No', label: 'Employee number' }, { field: 'Number', label: 'Payslip' },
        { field: 'Employee.Job Title', label: 'Job' }, { field: 'Employee.Department', label: 'Department' }, { field: 'Pay Date', label: 'Pay date', format: 'dd/mm/yyyy' },
        { field: 'Pay Run.Period Starts', label: 'Period from', format: 'dd/mm/yyyy' }, { field: 'Pay Run.Period Ends', label: 'Period to', format: 'dd/mm/yyyy' }, { field: 'Pay Run.Frequency', label: 'Paid' },
        { field: 'Employee.Pay Type', label: 'Pay type' }, { field: 'Pay Run.Pay Year', label: 'Pay year' }, { field: 'Tax Code', label: 'Tax code', if: '[Tax Code]' },
        // Hours only for someone paid by the hour.
        { field: 'Hours From', label: 'Hours worked from', format: 'dd/mm/yyyy', if: '[Hours From]' }, { field: 'Hours To', label: 'Hours worked to', format: 'dd/mm/yyyy', if: '[Hours To]' },
        { field: 'Hours Paid', label: 'Hours paid', if: '[Hours Paid]' },
      ] },
      // Each sum on its own side: a payment, or a deduction.
      { type: 'lines', table: 'Payslip Lines', sort: 'Line', columns: [
        { field: 'Item', label: 'Pay and deductions' }, { field: 'Hours', type: 'number' }, { field: 'Rate', type: 'currency' },
        { expr: 'IIf([Kind] = "Payment", [Amount], Null)', as: 'Payments', type: 'currency' },
        { expr: 'IIf([Kind] = "Deduction", [Amount], Null)', as: 'Deducted', label: 'Deductions', type: 'currency' },
        { field: 'Year to Date', label: 'Year to date', type: 'currency' },
      ] },
      { type: 'totals', rows: [
        { label: 'Gross pay', expr: '[Payments]' }, { label: 'Total deductions', expr: '[Deducted]' },
        { label: 'Net pay', expr: 'Round([Payments] - [Deducted], 2)', strong: true },
      ] },
      { type: 'fields', columns: 3, items: [
        { field: 'Gross to Date', label: 'Gross pay, year to date', format: '#,##0.00' }, { field: 'Deductions to Date', label: 'Deductions, year to date', format: '#,##0.00' }, { field: 'Net to Date', label: 'Net pay, year to date', format: '#,##0.00' },
      ] },
      { type: 'text', text: 'Net pay is paid by bank transfer on {Pay Date} to bank code {Employee.Bank Code}, account {Employee.Account Number}.', small: true },
      { type: 'text', text: 'On top of your pay, {Business.Name} pays {Employer Costs} in employer contributions for this period.', small: true, if: 'Nz([Employer Costs]) > 0' },
      { type: 'text', text: 'Please check your payslip and tell us within 14 days if anything looks wrong. Keep your payslips: you may need them to show what you earn.', small: true },
      { type: 'text', text: '{Business.Document Footer}', small: true },
    ] },
    // Timesheets waiting for the manager to approve, to print and sign.
    { name: 'Timesheet', table: 'Timesheets', paper: 'a4', letterhead: LETTERHEAD, where: '[Status] = "Submitted"', blocks: [
      { type: 'heading', text: 'Timesheet {Number}' },
      { type: 'fields', columns: 3, items: [
        { field: 'Employee', label: 'Name' }, { field: 'Employee.Employee No', label: 'Employee number' }, { field: 'Employee.Department', label: 'Department' },
        { field: 'Week Commencing', label: 'Week commencing', format: 'dd/mm/yyyy' }, { field: 'Contract Hours', label: 'Contract hours' }, { field: 'Status' },
        { field: 'Submitted On', label: 'Submitted', format: 'dd/mm/yyyy' },
        { field: 'Approved By', label: 'Approved by', if: '[Approved By]' }, { field: 'Approved On', label: 'Approved', format: 'dd/mm/yyyy', if: '[Approved On]' },
      ] },
      { type: 'lines', table: 'Timesheet Lines', sort: 'Date', columns: [
        { field: 'Day' }, { field: 'Date', format: 'dd/mm/yyyy' }, { field: 'Start' }, { field: 'End', label: 'Finish' },
        { field: 'Break Minutes', label: 'Break, minutes', type: 'integer' }, { field: 'Hours', type: 'number' }, { field: 'Overtime', type: 'number' }, { field: 'Note' },
      ] },
      { type: 'totals', rows: [
        { label: 'Hours worked', expr: '[Hours]', type: 'number', strong: true },
        { label: 'Within contract hours', expr: '[Hours] - [Overtime]', type: 'number', if: '[Overtime] > 0' },
        { label: 'Overtime', expr: '[Overtime]', type: 'number', strong: true, if: '[Overtime] > 0' },
      ] },
      { type: 'text', text: 'Overtime is the time worked above the contract hours for the week, and is paid at one and a half times the hourly rate. Days of holiday or sickness are not shown here: they are paid from the absence record.', small: true },
      { type: 'text', text: 'I confirm that these are the hours I worked in the week shown.' },
      { type: 'spacer', size: 16 },
      { type: 'signatures', labels: ['Employee', 'Approved by'] },
    ] },
    // Everyone working here now, and those about to start.
    { name: 'Employment contract summary', table: 'Employees', paper: 'a4', letterhead: LETTERHEAD, where: 'Nz([Leave Date], "") = ""', blocks: [
      { type: 'heading', text: 'Summary of terms of employment' },
      { type: 'fields', columns: 2, items: [
        { field: 'First Name', label: 'First name' }, { field: 'Last Name', label: 'Family name' },
        { field: 'Address' }, { field: 'Employee No', label: 'Employee number' },
        { field: 'City' }, { field: 'Postcode' },
        { field: 'Job Title', label: 'Job' }, { field: 'Department' },
        { field: 'Start Date', label: 'Starts on', format: 'd mmmm yyyy' }, { field: 'Manager', label: 'Reports to', if: '[Manager]' },
        { field: 'Pay Type', label: 'Pay type' }, { field: 'Pay Frequency', label: 'Paid' },
        { field: 'Hourly Rate', label: 'Hourly rate', format: '#,##0.00', if: '[Pay Type] = "Hourly"' },
        { field: 'Annual Salary', label: 'Annual salary', format: '#,##0.00', if: '[Pay Type] = "Salaried"' },
        { field: 'Hours per Week', label: 'Hours a week' }, { field: 'Days per Week', label: 'Days a week' },
        { field: 'Holiday Days', label: 'Holiday a year, days' }, { field: 'Notice Weeks', label: 'Notice, weeks' },
      ] },
      { type: 'text', text: 'This summary sets out the main terms on which {Business.Name}, of {Business.Address}, {Business.City} {Business.Postcode} ("the employer"), employs {First Name} {Last Name} ("you"). It goes with your offer letter and the staff handbook. Please read it, sign both copies and give one back to us.' },
      { type: 'text', text: '1. Your job. You are employed as {Job Title} in the {Department} department, reporting to {Manager}. Your manager may ask you to do other reasonable work that suits your skills, such as helping another department at a busy time.', if: '[Manager]' },
      { type: 'text', text: '1. Your job. You are employed as {Job Title} in the {Department} department, reporting to the owners. You may be asked to do other reasonable work that suits your skills, such as helping another department at a busy time.', if: 'Nz([Manager], 0) = 0' },
      { type: 'text', text: '2. Where you work. You work at {Business.Address}, {Business.City}. We will not ask you to work anywhere else for more than a day without agreeing it with you first.' },
      { type: 'text', text: '3. Start and trial period. Your employment starts on {Start Date}. The first three months are a trial period, during which either of us may end the employment with one week\'s notice. Your manager will meet you before it ends to talk about how it has gone.' },
      { type: 'text', text: '4. Hours. Your normal hours are {Hours per Week} hours a week over {Days per Week} days, on a rota your manager gives you at least two weeks ahead. Any shift longer than six hours has an unpaid break of 30 minutes. Time worked above your weekly hours is overtime: it is agreed with your manager beforehand and paid at one and a half times your hourly rate.', if: '[Pay Type] = "Hourly"' },
      { type: 'text', text: '4. Hours. Your normal hours are {Hours per Week} hours a week over {Days per Week} days. Any working day longer than six hours has an unpaid break of 30 minutes. Your salary covers reasonable extra hours at busy times.', if: '[Pay Type] <> "Hourly"' },
      { type: 'text', text: '5. Pay. You are paid {Hourly Rate} for each hour worked, {Pay Frequency}, by bank transfer on the last working day of the month. Pay by the hour is paid a month behind, from your approved timesheets: each month\'s pay covers the weeks that ended in the month before. Each payslip shows your pay and everything deducted from it: the deductions the law requires, your pension contributions, and anything else you have agreed to in writing.', if: '[Pay Type] = "Hourly"' },
      { type: 'text', text: '5. Pay. Your salary is {Annual Salary} a year, paid {Pay Frequency} in twelve equal parts, by bank transfer on the last working day of the month, for that month. Each payslip shows your pay and everything deducted from it: the deductions the law requires, your pension contributions, and anything else you have agreed to in writing.', if: '[Pay Type] <> "Hourly"' },
      { type: 'text', text: '6. Holiday. Your holiday is {Holiday Days} days a year, worked out for the days you work each week. The holiday year runs from 1 January to 31 December; if you join or leave during the year you have a share for the part of the year you work. Ask for holiday on a leave request at least two weeks ahead. At the busiest times of year we may ask you to choose other dates. Up to five unused days may be carried into the next year, and holiday you have earned but not taken when you leave is paid with your last pay.' },
      { type: 'text', text: '7. Sickness. If you are ill and cannot work, call your manager before your shift starts, or as soon as you can, and say how long you expect to be off. Sick pay is set out in the staff handbook and is never less than the law requires.' },
      { type: 'text', text: '8. Pension. We will offer you a place in the workplace pension scheme where the law requires it, and you may ask to join at any time. What you and we pay in is shown on each payslip.' },
      { type: 'text', text: '9. Notice. After the trial period, either of us may end your employment by giving {Notice Weeks} weeks\' notice in writing, or more where the law requires it. We may pay you for the notice period instead of asking you to work it.' },
      { type: 'text', text: '10. Rules and concerns. The staff handbook sets out how we deal with discipline and with any concern you raise. Speak first to your manager; if your concern is about your manager, speak to the office.' },
      { type: 'text', text: '11. Changes. We will tell you in writing at least one month ahead of any change to these terms, unless you agree to it sooner.' },
      { type: 'text', text: 'Signed for {Business.Name}, and by you to show that you have received these terms and agree to them.' },
      { type: 'spacer', size: 24 },
      { type: 'signatures', labels: ['For the employer', 'Employee', 'Date'] },
    ] },
    // Requests still to decide, and leave still to come; sickness is recorded, not asked for.
    { name: 'Leave request', table: 'Absences', paper: 'a4', letterhead: LETTERHEAD, where: '[Status] <> "Recorded" And ([Status] = "Requested" Or DateDiff("d", Date(), [Starts]) >= 0)', blocks: [
      { type: 'heading', text: 'Leave request {Number}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Employee', label: 'Name' }, { field: 'Employee.Employee No', label: 'Employee number' },
        { field: 'Employee.Department', label: 'Department' }, { field: 'Employee.Manager', label: 'Manager' },
        { field: 'Kind', label: 'Kind of leave' }, { field: 'Requested On', label: 'Asked for on', format: 'dd/mm/yyyy' },
        { field: 'Starts', label: 'First day off', format: 'dddd d mmmm yyyy' }, { field: 'Ends', label: 'Last day off', format: 'dddd d mmmm yyyy' },
        { field: 'Days', label: 'Working days' }, { field: 'Reason', if: '[Reason]' },
        { field: 'Paid', label: 'Paid leave', if: '[Kind] <> "Holiday"' },
      ] },
      // The allowance it comes out of: holiday only.
      { type: 'text', text: 'Holiday allowance for the year:', small: true, if: '[Allowance]' },
      { type: 'fields', columns: 3, if: '[Allowance]', items: [
        { field: 'Allowance.Holiday Year', label: 'Holiday year' }, { field: 'Allowance.Allowance', label: 'Allowance, days' },
        { field: 'Allowance.Carried Over', label: 'Carried over, days' }, { field: 'Allowance.Days Booked', label: 'Booked so far, days' },
      ] },
      { type: 'text', text: 'Request. I would like to take the leave shown above. I have checked the rota with my team, and my work will be covered or handed over before I go.' },
      { type: 'fields', columns: 3, if: '[Status] <> "Requested"', items: [
        { field: 'Status', label: 'Decision' }, { field: 'Decided By', label: 'Decided by', if: '[Decided By]' }, { field: 'Decided On', label: 'Decided on', format: 'dd/mm/yyyy', if: '[Decided On]' },
      ] },
      { type: 'text', text: '{Notes}', if: '[Notes]' },
      { type: 'text', text: 'Decision: approved / declined (the manager crosses out one).', if: '[Status] = "Requested"' },
      { type: 'text', text: 'Once approved, holiday is taken from the allowance for the year and paid as holiday pay. If a request is declined, your manager will tell you why and help you find other dates.', small: true },
      { type: 'spacer', size: 16 },
      { type: 'signatures', labels: ['Employee', 'Manager'] },
    ] },
    // Last pay year's summaries, given out in the first days of this one.
    { name: 'Annual pay summary', table: 'Annual Summaries', paper: 'a4', letterhead: LETTERHEAD, blocks: [
      { type: 'heading', text: 'Annual pay summary {Pay Year.Name}' },
      { type: 'fields', columns: 2, items: [
        { field: 'Employee', label: 'Name' }, { field: 'Number', label: 'Summary' },
        { field: 'Employee.Employee No', label: 'Employee number' }, { field: 'Issued On', label: 'Issued', format: 'dd/mm/yyyy' },
        { field: 'Employee.Address', label: 'Address' }, { field: 'Pay Year.Starts', label: 'Pay year from', format: 'dd/mm/yyyy' },
        { field: 'Employee.City', label: 'City' }, { field: 'Pay Year.Ends', label: 'Pay year to', format: 'dd/mm/yyyy' },
        { field: 'Employee.Postcode', label: 'Postcode' }, { field: 'Payslip Count', label: 'Payslips in the year' },
        { field: 'Tax Code', label: 'Tax code', if: '[Tax Code]' },
      ] },
      { type: 'lines', table: 'Annual Summary Lines', sort: 'Line', columns: [
        { field: 'Item', label: 'Pay and deductions for the year' },
        { expr: 'IIf([Kind] = "Payment", [Amount], Null)', as: 'Pay', type: 'currency' },
        { expr: 'IIf([Kind] = "Deduction", [Amount], Null)', as: 'Deducted', type: 'currency' },
      ] },
      { type: 'totals', rows: [
        { label: 'Total pay', expr: '[Pay]' }, { label: 'Total deductions', expr: '[Deducted]' }, { label: 'Net pay', expr: 'Round([Pay] - [Deducted], 2)', strong: true },
      ] },
      { type: 'text', text: 'This summary shows the pay {Business.Name} paid you in the pay year from {Pay Year.Starts} to {Pay Year.Ends}, and everything deducted from it. In the same year we paid {Employer Costs} in employer contributions on top of your pay.' },
      { type: 'text', text: '{Notes}', small: true, if: '[Notes]' },
      { type: 'text', text: 'Please keep it safe: you may be asked for it to show your income, for example for a tax return, a loan or a tenancy. Ask the office if you need another copy.', small: true },
      { type: 'text', text: '{Business.Document Footer}', small: true },
    ] },
  ],
  reports: [
    { name: 'Staff by department', query: 'Staff list', group: 'Department', columns: ['Employee No', 'Employee', 'Job Title', { field: 'Start Date', type: 'date' }, 'Pay Type', 'Pay Frequency', { field: 'Hours per Week', type: 'number' }], totals: [{ field: 'Employee', fn: 'count' }, { field: 'Hours per Week', fn: 'sum' }] },
    { name: 'Emergency contact list', query: 'Emergency contacts', group: 'Department', columns: ['Employee', 'Phone', 'Emergency Contact', 'Emergency Relationship', 'Emergency Phone'] },
    { name: 'Holiday balances', query: 'Holidays left', group: 'Department', columns: ['Employee', 'Holiday Year', { field: 'Allowance', type: 'number' }, { field: 'Carried Over', type: 'number' }, { field: 'Days Booked', type: 'number' }, { field: 'Days Left', type: 'number' }], totals: [{ field: 'Days Booked', fn: 'sum' }, { field: 'Days Left', fn: 'sum' }] },
    { name: 'Absence report', title: 'Absence other than holiday, last 12 months', query: 'Absence by person', group: 'Department', columns: ['Employee', { field: 'Sickness Spells', type: 'integer' }, { field: 'Sickness Days', type: 'number' }, { field: 'Other Days', type: 'number' }, { field: 'Days Absent', type: 'number' }], totals: [{ field: 'Sickness Days', fn: 'sum' }, { field: 'Days Absent', fn: 'sum' }] },
    { name: 'Monthly payroll cost', query: 'Payroll cost by department', group: 'Month', columns: ['Department', { field: 'Payslips', type: 'integer' }, { field: 'Gross', type: 'currency' }, { field: 'Employer Costs', type: 'currency' }, { field: 'Total Cost', type: 'currency' }, { field: 'Net', type: 'currency' }], totals: [{ field: 'Gross', fn: 'sum' }, { field: 'Employer Costs', fn: 'sum' }, { field: 'Total Cost', fn: 'sum' }] },
    { name: 'Pay run register', query: 'Pay run totals', columns: ['Number', 'Frequency', 'Period', { field: 'Pay Date', type: 'date' }, { field: 'Payslips', type: 'integer' }, { field: 'Gross', type: 'currency' }, { field: 'Deductions', type: 'currency' }, { field: 'Net', type: 'currency' }, { field: 'Employer Costs', type: 'currency' }], totals: [{ field: 'Gross', fn: 'sum' }, { field: 'Net', fn: 'sum' }, { field: 'Employer Costs', fn: 'sum' }] },
    { name: 'Overtime last month', query: 'Overtime by department, last month', columns: ['Month', 'Department', { field: 'Shifts', type: 'integer' }, { field: 'Hours Worked', type: 'number' }, { field: 'Overtime Hours', type: 'number' }], totals: [{ field: 'Hours Worked', fn: 'sum' }, { field: 'Overtime Hours', fn: 'sum' }] },
    { name: 'Timesheets awaiting approval', query: 'Timesheets to approve', group: 'Department', columns: ['Number', 'Employee', { field: 'Week Commencing', type: 'date' }, { field: 'Total Hours', type: 'number' }, { field: 'Overtime Hours', type: 'number' }, { field: 'Days Waiting', type: 'integer' }], totals: [{ field: 'Total Hours', fn: 'sum' }] },
    { name: 'Year to date pay', query: 'Pay to date', group: 'Pay Year', columns: ['Employee No', 'Employee', { field: 'Payslips', type: 'integer' }, { field: 'Gross', type: 'currency' }, { field: 'Deductions', type: 'currency' }, { field: 'Net', type: 'currency' }, { field: 'Employer Costs', type: 'currency' }], totals: [{ field: 'Gross', fn: 'sum' }, { field: 'Deductions', fn: 'sum' }, { field: 'Net', fn: 'sum' }] },
  ],
};

const RATES_WARNING = 'The tax, social insurance and pension rates in this sample are invented examples, named "(example rate)". They are not the rules of any country. Before paying anyone, replace them in Deduction Rates with your own country\'s current rules or your payroll provider\'s figures.';

export const about = {
  name: 'Wrenmoor Garden Centre',
  kind: 'HR, payroll and timesheets',
  line: 'Staff, contracts, holidays, absence, timesheets, pay runs and payslips for a business with employees.',
  summary: [
    'A staff database for any small business with employees: who works for you and on what terms, the contracts and checks you hold for each person, holiday and sickness, weekly timesheets, and the pay runs and payslips that follow from them. It is laid out so that a shop, a cafe, a salon or a workshop can use it as it is, or add its tables to its own sample.',
    'The records are those of Wrenmoor Garden Centre, an invented garden centre with a cafe and about thirty staff in three departments: the office, the shop and plant nursery, and the cafe. Managers and office staff are salaried. Everyone else is paid by the hour from a weekly timesheet, and many work part-time. Two seasonal assistants join each March and leave at the end of September. Pay is monthly: salaries for the month, and hours a month behind, for the weeks that ended in the month before.',
    'The records start on 1 January last year and run a day at a time to today. People join and leave, book holiday and fall ill, work extra hours in the spring rush and before Christmas, and are paid; the rest of this year\'s holidays are booked ahead. Each payslip has a line for every payment and deduction, with the year-to-date figures, and each person paid last year has an annual pay summary for it.',
    RATES_WARNING,
  ],
  suits: ['A shop or a chain of two or three shops', 'A cafe, restaurant or takeaway', 'A salon, barber or spa', 'A workshop, garage or small factory', 'A cleaning or care company with hourly staff', 'A charity or club with paid staff'],
  tables: {
    Business: BUSINESS_ABOUT,
    Departments: { about: 'The parts of the business people work in. Payroll cost and overtime are added up by department.', fields: {
      Name: 'The department\'s name. Each name is used once.', Code: 'A short code, such as CAF, for a cost centre in your accounts. Each code is used once.', Notes: 'What the department does, or anything worth knowing about it.',
    } },
    Employees: { about: 'One record for each person who works for you, or has done, or is about to start. The pay fields hold the terms they are on now; Pay Changes keeps the history.', fields: {
      'Employee No': 'Your own number for the person, printed on payslips and timesheets: EMP-0103. Each number is used once. It is not any government number.',
      'First Name': 'Their first name.', 'Last Name': 'Their family name.', 'Job Title': 'Their job now.', Department: 'The department they work in.',
      Manager: 'The person they report to, who approves their timesheets and leave.', 'Start Date': 'Their first day. A date ahead is someone about to start.',
      'Leave Date': 'Their last day; empty while they still work for you.', 'Leaving Reason': 'Why they left, in a few plain words.',
      'Date of Birth': 'Used for the birthdays list, and where pay or pension depends on age.', Address: 'Their home street address, for letters and the annual pay summary.',
      City: 'Their town or city.', Postcode: 'Their postcode or ZIP code.', Phone: 'Their own phone number.', 'E-mail': 'Their work e-mail address.',
      'Pay Type': 'Hourly (paid for the hours on their timesheets) or Salaried (paid a yearly salary in twelve parts).',
      'Hourly Rate': 'What one normal hour pays, for someone paid by the hour. Overtime is one and a half times this.',
      'Annual Salary': 'The salary for a year, for someone salaried. For a part-timer it is the salary for their hours, not the full-time figure.',
      'Hours per Week': 'The hours in their contract each week. Hours above this on a timesheet are overtime.', 'Days per Week': 'How many days a week they work, which sets their share of holiday.',
      'Pay Frequency': 'How often they are paid: Monthly in the sample, or Weekly where you pay by the week.', 'Holiday Days': 'The holiday a year in their contract, in days, for the days they work. Each year\'s Holiday Allowances record starts from it.',
      'Notice Weeks': 'The notice in weeks either side must give after the trial period.', 'Tax Code': 'The code or reference your tax office gives for the person, printed on payslips. Left empty in the sample.',
      'Bank Code': 'The sort code, routing number or branch code of their bank account. The sample has noughts.', 'Account Number': 'Their bank account number. The sample has noughts.',
      'Emergency Contact': 'Who to call if they are taken ill or hurt at work.', 'Emergency Relationship': 'Who that person is to them: partner, mother, friend.',
      'Emergency Phone': 'The emergency contact\'s phone number.', Notes: 'Anything else worth keeping: a fixed-term contract, an agreed change to their days.',
    } },
    'Pay Changes': { about: 'The history of each person\'s job and pay: when they joined, each yearly pay review, a promotion, a change of hours. The newest record for a person is what Employees shows now.', fields: {
      Employee: 'Whose job or pay changed.', 'Effective From': 'The first day the new terms apply.', Reason: 'Joined, Annual review, Promotion or Change of hours.',
      'Job Title': 'Their job from that day.', 'Pay Type': 'Hourly or Salaried from that day.', 'Hourly Rate': 'The hourly rate from that day, for someone paid by the hour.',
      'Annual Salary': 'The yearly salary from that day, for someone salaried.', 'Hours per Week': 'The weekly hours from that day.', 'Days per Week': 'The days a week from that day.',
      Notes: 'Anything said about the change, such as who agreed it.',
    } },
    'Documents Held': { about: 'The papers and checks kept for each person: the signed contract, the check that they may work for you, the starter form with their bank and emergency details, and letters that changed their terms. A record with no Completed On is still to be done.', fields: {
      Employee: 'Whose document it is.', Document: 'Employment contract, Right to work check, Starter form or Contract change letter.',
      Reference: 'Your own file reference for it: HR-0103-2. Never a passport, visa or identity number.', 'Issued On': 'The day it was given to the person, or the check was asked for.',
      'Completed On': 'The day it came back signed, or the check was done; empty until then.', 'Checked By': 'Who did the check or filed the document.',
      'Expires On': 'For a right to work that runs out: the day it must be checked again. Empty when it does not run out.', Notes: 'Anything worth knowing about it.',
    } },
    'Holiday Allowances': { about: 'Each person\'s holiday for each holiday year: what they may take, what they brought from last year, and what is booked. The sample\'s holiday year runs from 1 January to 31 December.', fields: {
      Employee: 'Whose allowance it is.', Reference: 'How the record is known in lists, such as on the Absences form: the person\'s name and the year.',
      'Holiday Year': 'The year it is for: 2026.', 'Year Starts': 'The first day of the holiday year.', 'Year Ends': 'The last day of the holiday year.',
      'Days per Week': 'The days a week they worked when the allowance was set.', 'Full-time Days': 'The allowance for someone working five days a week for the whole year.',
      Allowance: 'Their own allowance in days: the full-time days for their days a week, and for the part of the year they work if they joined or left during it, rounded up to a half day.',
      'Carried Over': 'Unused days brought from last year, up to five.', 'Days Booked': 'Approved holiday in the year, taken or still to come. Add a request\'s days when you approve it.',
      Notes: 'How it was worked out, or what was paid for untaken days when someone left.',
    } },
    Absences: { about: 'Every day someone is away from work: holiday, sickness, appointments, compassionate leave and unpaid leave. Holiday and unpaid leave are asked for ahead and decided by the manager; sickness is recorded when it happens.', fields: {
      Number: 'The absence\'s number, given in date order and once only: LV-2026-0042, a new run each year.', Employee: 'Who is away.',
      Kind: 'Holiday, Sickness, Appointment, Compassionate leave or Unpaid leave.', Allowance: 'For holiday, the person\'s Holiday Allowances record for the year it comes out of. Empty for other kinds.',
      Starts: 'The first day away.', Ends: 'The last day away (for sickness still going on, the day they expect to be back at work, less one).',
      Days: 'The working days it covers, on the person\'s own working days. A half day is 0.5.', Reason: 'A few plain words, kept general: "Cold or flu", "Family matter". Medical details do not belong here.',
      Status: 'Requested (waiting for a decision), Approved, Declined, or Recorded for sickness and compassionate leave.', 'Requested On': 'The day it was asked for, or the day sickness was reported.',
      'Decided By': 'The manager who approved or declined it, or recorded it.', 'Decided On': 'The day it was decided or recorded.',
      Paid: 'Ticked when the days are paid: holiday, sickness, appointments and compassionate leave in the sample. Unpaid leave is not.', Notes: 'Anything else, such as a handover arranged.',
    } },
    'Pay Years': { about: 'The years pay is added up in, for the year-to-date figures and the annual pay summary. A payslip belongs to the pay year its pay date falls in. The sample uses the calendar year; set your own dates where your tax year differs.', fields: {
      Name: 'The year\'s name: 2026.', Starts: 'The first day of the pay year.', Ends: 'The last day of the pay year.', Notes: 'Anything worth knowing about the year.',
    } },
    'Pay Runs': { about: 'Each time pay is worked out and paid: once a month in the sample, with a payslip for each person. A salary is paid for the run\'s own month; hours are paid a month behind, for the weeks that ended in the month before.', fields: {
      Number: 'The run\'s number: PAY-2026-M10 for October 2026. A weekly run would be PAY-2026-W14.', 'Pay Year': 'The pay year its pay date falls in.',
      Frequency: 'Monthly, or Weekly for a weekly run.', Period: 'The period in words: October 2026.', 'Period Starts': 'The first day of the month the salaries cover.', 'Period Ends': 'The last day of that month.',
      'Pay Date': 'The day the money reaches people\'s accounts: the last working day of the month.',
      Status: 'Open while it is being prepared, Paid once the money has gone.', Notes: 'Anything worth knowing about the run.',
    } },
    Timesheets: { about: 'One for each person paid by the hour, for each week they worked, with a line for each day. The person hands it in when their week is done and their manager approves it, in time for the month\'s pay run.', fields: {
      Number: 'The timesheet\'s number, given in date order: TS-2026-0042, a new run each year.', Employee: 'Whose hours they are.', 'Week Commencing': 'The Monday the week starts on.',
      'Contract Hours': 'Their contract hours for that week, kept here so a later change of hours does not alter it.', 'Total Hours': 'All the hours worked in the week: the lines added up.',
      'Overtime Hours': 'The hours worked above the contract hours for the week.', Status: 'Submitted (waiting for the manager) or Approved.',
      'Submitted On': 'The day the person handed it in.', 'Approved By': 'The manager who approved it.', 'Approved On': 'The day it was approved.',
      'Pay Run': 'The pay run it was paid in: the run at the end of the month after the week ended. Empty until then.', Notes: 'Anything said about the week.',
    } },
    'Timesheet Lines': { about: 'One line for each day worked in a week.', fields: {
      Timesheet: 'The timesheet the day belongs to.', Date: 'The day worked.', Day: 'The day of the week, as it reads on the printed timesheet.',
      Start: 'The time they started, on the 24-hour clock: 08:30.', End: 'The time they finished: 17:00.', 'Break Minutes': 'The unpaid break taken, in minutes.',
      Hours: 'The hours worked that day: finish less start less the break.', Overtime: 'The part of the day\'s hours that took the week above the contract hours.',
      Note: 'Why a day was different: stayed late, an extra shift, a half day off.',
    } },
    'Deduction Rates': { about: `The rates the business uses to work out what is taken from pay, and what it pays on top as the employer. You fill these in yourself. ${RATES_WARNING}`, fields: {
      Name: 'The deduction as it is printed on the payslip.', 'Paid By': 'Employee (taken from pay and shown on the payslip) or Employer (paid by the business on top of pay).',
      Percent: 'The rate as a percentage of pay above the threshold: 18 is eighteen percent. Empty for a fixed amount.',
      'Fixed Amount': 'A set amount a year, shared equally across the pay periods: 52 a year is 1.00 a week or 4.33 a month. Empty for a percentage.',
      Threshold: 'The yearly pay below which nothing is taken, shared across the pay periods the same way. Empty or 0 for none.',
      'Applies From': 'The first pay date the rate is used for.', 'Applies To': 'The last pay date it is used for; empty while it is still in force. When a rate changes, end the old record and add a new one.',
      'Print Order': 'Where the deduction comes on the payslip, lowest first.', Notes: 'Where the figure comes from; in the sample, that it is an invented example.',
    } },
    Payslips: { about: 'One for each person in each pay run, with its lines. The money figures are stored as they were paid, so a later change of rate never alters an old payslip.', fields: {
      Number: 'The payslip\'s number, given in pay date order: PS-2026-0042, a new run each pay year.', 'Pay Run': 'The pay run it belongs to.', Employee: 'Who is paid.',
      'Pay Date': 'The day the pay goes into their bank, the same as the pay run\'s: the payslip prints it, and the Payslip template finds the latest run\'s payslips by it.',
      'Tax Code': 'The tax code used for this payslip, from the person\'s record. Left empty in the sample.',
      'Hours From': 'For someone paid by the hour, the Monday of the first week paid.', 'Hours To': 'For someone paid by the hour, the Sunday of the last week paid.', 'Hours Paid': 'The hours paid, for someone paid by the hour: worked, overtime and paid absence.',
      Gross: 'All the pay before deductions: the payment lines added up.', Deductions: 'Everything taken from pay: the deduction lines added up.',
      Net: 'What reaches the person\'s bank account: gross less deductions.', 'Employer Costs': 'What the business pays on top of gross pay, from the employer rates.',
      'Gross to Date': 'Gross pay in the pay year so far, this payslip included.', 'Deductions to Date': 'Deductions in the pay year so far.', 'Net to Date': 'Net pay in the pay year so far.',
    } },
    'Payslip Lines': { about: 'The lines of each payslip: the payments first (basic pay, overtime, holiday pay, sick pay), then each deduction.', fields: {
      Payslip: 'The payslip the line belongs to.', Line: 'Its place on the payslip, from 1.', Kind: 'Payment or Deduction.',
      Item: 'What the line is, as printed: Basic pay, Overtime, Holiday pay, or for a deduction the name of the Deduction Rates record it was worked out from.',
      Hours: 'For hourly pay, the hours paid on the line.', Rate: 'For hourly pay, the rate per hour on the line; overtime is at one and a half times.',
      Amount: 'The line\'s amount, rounded to the penny.', 'Year to Date': 'The same item added up over the pay year so far, this payslip included.',
    } },
    'Annual Summaries': { about: 'An end-of-year summary of pay for each person paid in a pay year, issued when the year closes. Last year\'s are in the sample; this year\'s are made after its last pay run.', fields: {
      Number: 'The summary\'s number: APS-2025-0012.', 'Pay Year': 'The pay year it covers.', Employee: 'Whose pay it is.', 'Tax Code': 'The tax code at the year end. Left empty in the sample.',
      'Issued On': 'The day it was given to the person.', 'Payslip Count': 'How many payslips they had in the year.', 'Gross Pay': 'All pay in the year before deductions.',
      Deductions: 'Everything deducted in the year.', 'Net Pay': 'What they received in the year.', 'Employer Costs': 'What the business paid on top in the year.',
      Notes: 'Anything worth knowing, such as that they left during the year.',
    } },
    'Annual Summary Lines': { about: 'The lines of each annual summary: each kind of pay and each deduction, added up for the year.', fields: {
      'Annual Summary': 'The summary the line belongs to.', Line: 'Its place on the summary, from 1.', Kind: 'Payment or Deduction.', Item: 'The kind of pay or the deduction\'s name.',
      Amount: 'The total for the year.',
    } },
  },
  queries: {
    'Who is off, next 7 days': 'Everyone away today or in the next seven days, for holiday, sickness or other leave, with Off Today marked Yes for those away now. Requests not yet approved are left out. Use it each morning to plan cover.',
    'Leave requests to decide': 'Holiday and other leave asked for but not yet approved or declined, by the first day off, with how many days each has waited.',
    'Holidays left': 'This holiday year\'s allowance for each person still working for you: the allowance, days carried over, days booked and the days left, by department.',
    'Holiday taken and to come': 'Approved holiday this year from the absences themselves: the days already taken and the days still to come for each person, beside Days Booked on their allowance, which they should add up to. Someone with no holiday approved this year is not listed.',
    'Timesheets to approve': 'Timesheets submitted and not yet approved, the oldest week first, with the days each has waited. Clear it each week, and before the month\'s pay run.',
    'Overtime by department, last month': 'The shifts, hours and overtime hours worked in each department last calendar month, from the timesheet lines.',
    'Hours and overtime by month': 'Hours and overtime worked by hourly staff each month, which shows the busy seasons.',
    'Payroll cost by department': 'For each month and department: how many payslips, gross pay, the employer costs on top, the total cost to the business and the net paid. The department is the one each person is in now.',
    'Pay run totals': 'Each pay run, the newest first, with its payslips and its gross, deductions, net and employer costs.',
    'Pay to date': 'For each pay year and person: the payslips, gross pay, deductions, net pay and employer costs so far. The current year\'s figures are the year to date.',
    'Pay to date by item': 'The same, item by item: basic pay, overtime and holiday pay, and each deduction, for each person in each pay year.',
    'Starters and leavers': 'People who joined or left in the last 12 months, and anyone due to start in the next three months, the newest first.',
    'Absence by person': 'Absence other than holiday in the last 12 months for each person: sickness spells and days, other days, and the days absent in all, the most first. Days in 12 months is the person\'s absence rate in days a year.',
    'Birthdays and anniversaries': 'Staff with a birthday or a work anniversary this month or next, with the date and the years served.',
    'Documents to chase': 'Contracts not yet signed back, right to work checks and other papers not yet done, and checks that must be done again within 60 days, for people still working for you.',
    'Staff list': 'Everyone working for you now, by department, with their job, start date, pay type, hours and rate.',
    'Emergency contacts': 'Who to call for each person working for you now, by department.',
    'Pay history': 'Every change of job, pay or hours, by person, the newest first.',
    'Deduction rates in use': 'The deduction and employer rates that apply today, in payslip order.',
  },
  reports: {
    'Staff by department': 'The staff list on a page for each department, with a head count and the hours.',
    'Emergency contact list': 'Each person\'s emergency contact, by department: print it for the office wall or the first-aid box.',
    'Holiday balances': 'This year\'s holiday allowance, days booked and days left for each person, by department.',
    'Absence report': 'Sickness and other absence in the last 12 months for each person, by department, with totals.',
    'Monthly payroll cost': 'Gross pay, employer costs and total cost for each department, month by month.',
    'Pay run register': 'Every pay run with its totals: the record of what was paid and when.',
    'Overtime last month': 'Hours and overtime for each department last month.',
    'Timesheets awaiting approval': 'Timesheets waiting for a manager, by department.',
    'Year to date pay': 'Each person\'s gross, deductions and net for each pay year, with totals for the year.',
  },
  documents: {
    Payslip: `The payslip for one person and one pay run: their details, the month, the pay date and, for someone paid by the hour, the weeks their hours are from and the hours paid, each payment and each deduction on its own side with its year-to-date figure, then gross, deductions and net pay, and the year to date. The tax code prints once you type it on the payslip. It prints the latest pay run\'s payslips: this month\'s once the pay date has come, last month\'s until then; print an older one from the Payslips form. ${RATES_WARNING}`,
    Timesheet: 'A week\'s timesheet for one person: each day\'s start, finish, break and hours, the overtime above their contract hours when there is any, and lines for the employee and the manager to sign. It prints the timesheets waiting for approval.',
    'Employment contract summary': 'A summary of a person\'s main terms, to give with the offer letter and sign: the job, start date, pay, hours, holiday, sickness, pension and notice, filled in from their Employees record, with the hours and pay clauses worded for someone paid by the hour or for a salary. The words are a plain example of our own, not legal advice: have them checked for your own country before you use them. It prints for everyone working here now and those about to start; print a leaver\'s from the Employees form.',
    'Leave request': 'The form for asking for leave and recording the manager\'s decision, with the holiday allowance for the year when it is holiday. It prints the requests still to decide and the leave still to come; sickness and compassionate leave are recorded, not asked for, and print only from the Absences form.',
    'Annual pay summary': 'The end-of-year summary for one person and one pay year: each kind of pay and each deduction added up for the year, and the net pay, with a note for someone who has left. Give it to each person after the last pay run of the year.',
  },
  tutorial: [
    { title: 'Take on a new starter', steps: [
      'Open the Employees form and press New. Type the Employee No (the next number after the last one), their names, Job Title, Department and Manager, and the Start Date.',
      'Fill in Pay Type, Hourly Rate or Annual Salary, Hours per Week, Days per Week, Pay Frequency, Holiday Days and Notice Weeks, then their address, phone, bank details and emergency contact.',
      'Open the Pay Changes form and press New: choose the person, set Effective From to the start date and Reason to Joined, and copy in the job, pay and hours.',
      'Open the Documents Held form and add an Employment contract, a Right to work check and a Starter form for the person, each with its Issued On. Type Completed On as each comes back.',
      'Open the Holiday Allowances form and add their allowance for this year: the Reference, Holiday Year, Year Starts, Year Ends, their Days per Week, and the Allowance for the part of the year left.',
      'Open the print template Employment contract summary from Print templates, choose the person, and press Print or Save as PDF. Two copies: one to sign and keep.',
    ] },
    { title: 'Ask for holiday and decide it', steps: [
      'Open the Absences form and press New. Choose the Employee, set Kind to Holiday, choose their Allowance for the year, and type Starts, Ends, the working Days and Requested On. Status stays Requested.',
      'Open the print template Leave request, choose the request, and print it for the person to sign if you keep paper forms.',
      'The manager opens the query Leave requests to decide, and for each request sets Status to Approved or Declined on the Absences form, with Decided By and Decided On.',
      'For an approved holiday, open the person\'s record on the Holiday Allowances form and add the Days to Days Booked.',
      'Open the query Holidays left, or print the report Holiday balances, to see what everyone has left.',
    ] },
    { title: 'Record sickness and see who is off', steps: [
      'When someone calls in sick, open the Absences form and press New. Choose the Employee, set Kind to Sickness and Status to Recorded, and type Starts, Ends (the day before they expect to be back), Days and a short general Reason.',
      'Set Decided By to the manager who took the call and Decided On to today. Leave Paid ticked if the days are paid.',
      'Each morning open the query Who is off, next 7 days to see who is away and plan cover.',
      'Once a quarter print the report Absence report to see each person\'s days away in the last 12 months.',
    ] },
    { title: 'Fill in and approve the week\'s timesheets', steps: [
      'Open the Timesheets form and press New. Type the Number, choose the Employee, and type the Week Commencing (a Monday) and their Contract Hours. Status stays Submitted.',
      'In the Timesheet Lines below, add a line for each day worked: Date, Day, Start, End, Break Minutes and Hours.',
      'Add up the week\'s hours into Total Hours. Hours above Contract Hours are overtime: type them in Overtime Hours, and on the lines in Overtime from the day the week went over.',
      'Open the print template Timesheet, choose the timesheet, print it and have it signed.',
      'The manager opens the query Timesheets to approve and, for each one, sets Status to Approved with Approved By and Approved On.',
    ] },
    { title: 'Run the month\'s pay', steps: [
      'Open the Pay Runs form and press New: Number (PAY-2026-M10), Pay Year, Frequency Monthly, the month in Period, its first and last days in Period Starts and Period Ends, Pay Date (its last working day) and Status Open.',
      'For each salaried person, open the Payslips form and press New: choose the Pay Run and the Employee, give it the next Number and the run\'s Pay Date, and add a Payslip Lines line for Basic pay of their Annual Salary divided by 12 (a share of it for someone who joined or left during the month).',
      'For each person paid by the hour, add a payslip with Hours From and Hours To set to the weeks that ended last month. Add up their approved timesheets: a Basic pay line for the hours within contract at their Hourly Rate, and an Overtime line for the overtime hours at one and a half times it.',
      'Add Holiday pay, Sick pay and Paid leave lines for the paid days on the Absences form in those weeks: the days times their usual hours a day, at their rate.',
      'Open the query Deduction rates in use. For each Employee rate add a Deduction line: the gross less a twelfth of the yearly Threshold, times the Percent; or a twelfth of the Fixed Amount. The Employer rates, worked out the same way, go in Employer Costs.',
      'Type Gross, Deductions and Net (gross less deductions), and the year-to-date figures: the person\'s last payslip this pay year plus this one. Set Pay Run on each timesheet you paid.',
      'Open the print template Payslip, choose the payslips of the run, and print them or save them as PDF. Pay the net amounts and set the run\'s Status to Paid.',
    ] },
    { title: 'Check the payroll and its cost', steps: [
      'Open the query Pay run totals to check the run you have just made against the payments from your bank.',
      'Print the report Monthly payroll cost to see what each department cost this month, with the employer costs on top of pay.',
      'Print the report Overtime last month to see where overtime is building up, and the query Hours and overtime by month for the busy seasons.',
      'Open the query Pay to date for each person\'s gross, deductions and net so far this pay year.',
    ] },
    { title: 'Close the year', steps: [
      'After the last pay run of the year, open the query Pay to date by item and note each person\'s totals for the year.',
      'Open the Annual Summaries form and press New for each person: Number, Pay Year, Employee, Issued On, Payslip Count, Gross Pay, Deductions, Net Pay and Employer Costs, then an Annual Summary Lines line for each item.',
      'Open the print template Annual pay summary, choose the summaries, and print them for each person.',
      'Open the Pay Years form and add next year. Open the Holiday Allowances form and add each person\'s allowance for the new year, with up to five unused days in Carried Over.',
      'If a rate changes, open the Deduction Rates form, type Applies To on the old record and add a new one with its Applies From.',
    ] },
    { title: 'Give a pay rise, or see someone leave', steps: [
      'For a pay rise, promotion or change of hours, open the Pay Changes form, press New, and type the new terms with Effective From and a Reason. Then change the same fields on the person\'s Employees record.',
      'Add a Contract change letter on the Documents Held form, and print the Employment contract summary again for them to sign.',
      'When someone leaves, type the Leave Date and Leaving Reason on their Employees record, and cut their Allowance on the Holiday Allowances form to the part of the year they worked.',
      'On their last payslip add a Holiday pay, untaken days line for the days they had left. Their Annual pay summary is made with everyone else\'s at the year end.',
    ] },
  ],
  notes: [
    RATES_WARNING,
    'Data Files keeps and prints the payroll but does not work it out: the payslip lines, the deductions and the totals are typed in, as the tutorial shows. The sample\'s were worked out the same way, from the hours, the rates and the Deduction Rates table. If you use a payroll provider, type in the figures from their payslips instead.',
    'The holiday year and the pay year both run from 1 January to 31 December in the sample. Change the dates in Holiday Allowances and Pay Years if yours differ, for example where the tax year starts in April or July.',
    'Holiday in the sample is 5.6 weeks a year, which is 28 days for someone working five days a week, shared out for part-timers and for people who join or leave in the year, and rounded up to a half day. That is the business\'s own choice; check the least your country allows.',
    'Days Booked on each Holiday Allowances record is kept up by hand: add a request\'s days when you approve it. The query Holiday taken and to come adds up the approved absences themselves, so the two can be checked against each other.',
    'Only people paid by the hour keep timesheets in the sample. Overtime is worked out for the whole week: the hours above the contract hours, at one and a half times the hourly rate. A day of holiday or sickness is not a timesheet line; it is paid from the absence.',
    'Everyone is paid monthly, on the last working day of the month. Salaries are paid for that month. Hours are paid a month behind, for the whole weeks (Monday to Sunday) that ended in the month before, so every timesheet is approved well before it is paid. A payslip belongs to the pay year its pay date falls in, so January\'s pay for December\'s hours counts in the new year.',
    'Bank details are noughts and the tax code is empty in every record. Employee numbers and document references are your own, never a government or identity number. Keep reasons for absence general: medical details do not belong in this file.',
    'The payroll cost queries add up by the department each person is in now, so someone who moved department counts in the new one for the months before the move.',
    'Each print template prints only the records it is for: the latest pay run\'s payslips, the timesheets waiting for approval, the contract summaries of the people working here, the leave requests still to decide or to come, and last year\'s annual summaries. A record printed from its own form always prints. A payslip keeps its own Pay Date, the same as its pay run\'s, so the Payslip template can find the latest run.',
  ],
  faq: [
    { q: 'Are the tax and pension rates real?', a: `No. ${RATES_WARNING}` },
    { q: 'How do I print one person\'s payslip, or a whole month\'s?', a: 'The print template Payslip holds the latest pay run\'s payslips, so print it from Print templates for the whole month. For one, or an older one, open the Payslips form, find the payslip by its Number or the person, and print it from there.' },
    { q: 'Can I pay some staff weekly?', a: 'Yes. Set their Pay Frequency to Weekly and add a weekly pay run each week (Frequency Weekly, the Monday to Sunday in Period Starts and Period Ends), with a payslip for each of them from that week\'s timesheet. Share the yearly thresholds and fixed amounts by 52 instead of 12.' },
    { q: 'Why is someone missing from Holidays left?', a: 'Holidays left lists the people who have a Holiday Allowances record for the year that takes in today and have no Leave Date. Add this year\'s record for anyone new. Leavers are left out on purpose.' },
    { q: 'How is a part-timer\'s holiday worked out?', a: 'Their days a week times the full-time days, divided by five: three days a week with 28 full-time days is 16.8, rounded up to 17. Someone who joins during the year has a share for the months left.' },
    { q: 'How is overtime worked out?', a: 'For the whole week: the hours on the timesheet above the person\'s contract hours. On the lines, it is the part of the day when the week went over. It is paid at one and a half times their hourly rate.' },
    { q: 'Where do the year-to-date figures come from?', a: 'From the payslips: each payslip keeps Gross to Date, Deductions to Date and Net to Date, and each line its Year to Date. The queries Pay to date and Pay to date by item add up the payslips themselves for each pay year.' },
    { q: 'Can I use the contract summary as it is?', a: 'It is a plain example written for this sample, not legal advice. Have it checked for your own country, change the words in the print template Employment contract summary, and keep your full contract and staff handbook alongside it.' },
  ],
  empty: 'Start with Business, your own name and address, which every document prints, then Departments and Pay Years. Fill in Deduction Rates with your own country\'s current rates or your payroll provider\'s. Then add each person in Employees with a Pay Changes record for the terms they are on, their Documents Held and this year\'s Holiday Allowances. Absences and timesheets come in as people book holiday and work their weeks, and Pay Runs, Payslips and Annual Summaries as you pay them.',
  adapt: [
    'Pay hourly staff weekly: set their Pay Frequency to Weekly and add a weekly pay run, with one timesheet on each payslip.',
    'Add more kinds of pay, such as a bonus, tips or a night allowance: they are Payment lines on the payslip with an Item of their own, and the Pay to date by item query adds them up.',
    'Keep timesheets for salaried staff too: add a timesheet for them each week without paying overtime, to see the hours they really work.',
    'Pay overtime at more than one rate, such as double time on public holidays: add a Rate Multiplier field to Timesheet Lines and an Overtime line for each rate.',
    'Track training and certificates, such as first aid or food hygiene: add them to Documents Held with an Expires On, and the Documents to chase query will show those running out.',
    'Keep a rota: add a Shifts table (person, date, start, end) for the weeks ahead and a query of who is working each day.',
    'Run more than one site: add a Sites table and point Employees at it, then group the payroll cost and overtime queries by site.',
  ],
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n, w = 2) => String(n).padStart(w, '0');
const hhmm = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
/** Up to the next half day, as the business rounds holiday: in the person's favour. */
const halfUp = (n) => Math.ceil(n * 2 - 1e-9) / 2;
const quarter = (n) => Math.round(n * 4) / 4;

const DEPARTMENTS = [
  ['Office', 'OFF', 'Management, buying, marketing, accounts and HR. Salaried, paid monthly.'],
  ['Shop and Nursery', 'SHN', 'The shop floor, the plant nursery and deliveries. Busiest from March to June and in December.'],
  ['Cafe', 'CAF', 'The cafe and its kitchen. Busiest at weekends and in the summer.'],
];
/**
 * The jobs: department, title, Salaried or Hourly, hours a week, working days
 * (0 is Sunday), salary or hourly rate today, the time a shift starts (minutes
 * after midnight) and the manager's job. `churn` jobs see a leaver and a new
 * starter in the records.
 */
const JOBS = [
  { key: 'gm', dept: 'Office', job: 'General Manager', pay: 'S', hours: 40, days: [1, 2, 3, 4, 5], rate: 49000, boss: null },
  { key: 'hr', dept: 'Office', job: 'Office and HR Manager', pay: 'S', hours: 37.5, days: [1, 2, 3, 4, 5], rate: 34500, boss: 'gm' },
  { dept: 'Office', job: 'Accounts Assistant', pay: 'S', hours: 22.5, days: [1, 2, 3], rate: 15000, boss: 'gm' },
  { key: 'buyer', dept: 'Office', job: 'Buyer', pay: 'S', hours: 37.5, days: [1, 2, 3, 4, 5], rate: 31500, boss: 'gm' },
  { dept: 'Office', job: 'Marketing and Events Coordinator', pay: 'S', hours: 30, days: [1, 2, 3, 4], rate: 24500, boss: 'gm' },
  { key: 'shop', dept: 'Shop and Nursery', job: 'Shop Manager', pay: 'S', hours: 40, days: [1, 2, 3, 4, 6], rate: 33500, boss: 'gm' },
  { key: 'nursery', dept: 'Shop and Nursery', job: 'Nursery Manager', pay: 'S', hours: 40, days: [1, 2, 3, 4, 5], rate: 32500, boss: 'gm' },
  { key: 'cafe', dept: 'Cafe', job: 'Cafe Manager', pay: 'S', hours: 40, days: [2, 3, 4, 5, 6], rate: 30500, boss: 'gm' },
  // Everyone paid by the hour is paid monthly, a month behind: the hours of the weeks that ended last month.
  { dept: 'Shop and Nursery', job: 'Shop Supervisor', pay: 'H', hours: 40, days: [3, 4, 5, 6, 0], rate: 14.1, start: 510, boss: 'shop' },
  { dept: 'Shop and Nursery', job: 'Nursery Supervisor', pay: 'H', hours: 40, days: [2, 3, 4, 5, 6], rate: 14.1, start: 450, boss: 'nursery' },
  { key: 'promoted', dept: 'Shop and Nursery', job: 'Sales Assistant', pay: 'H', hours: 37.5, days: [1, 2, 3, 4, 5], rate: 12.85, start: 510, boss: 'shop' },
  { dept: 'Shop and Nursery', job: 'Sales Assistant', pay: 'H', hours: 24, days: [1, 2, 3], rate: 12.85, start: 510, boss: 'shop', churn: true },
  { key: 'more', dept: 'Shop and Nursery', job: 'Sales Assistant', pay: 'H', hours: 16, days: [3, 4], rate: 12.85, start: 510, boss: 'shop' },
  { dept: 'Shop and Nursery', job: 'Sales Assistant', pay: 'H', hours: 16, days: [6, 0], rate: 12.85, start: 540, boss: 'shop', churn: true },
  { dept: 'Shop and Nursery', job: 'Plant Care Assistant', pay: 'H', hours: 37.5, days: [1, 2, 3, 4, 5], rate: 13.05, start: 450, boss: 'nursery' },
  { dept: 'Shop and Nursery', job: 'Plant Care Assistant', pay: 'H', hours: 30, days: [2, 3, 4, 5], rate: 13.05, start: 450, boss: 'nursery', churn: true },
  { dept: 'Shop and Nursery', job: 'Delivery Driver', pay: 'H', hours: 40, days: [1, 2, 3, 4, 5], rate: 13.6, start: 420, boss: 'nursery' },
  { dept: 'Cafe', job: 'Cook', pay: 'H', hours: 37.5, days: [3, 4, 5, 6, 0], rate: 13.75, start: 480, boss: 'cafe' },
  { dept: 'Cafe', job: 'Cook', pay: 'H', hours: 30, days: [1, 2, 6, 0], rate: 13.75, start: 480, boss: 'cafe' },
  { dept: 'Cafe', job: 'Cafe Assistant', pay: 'H', hours: 30, days: [4, 5, 6, 0], rate: 12.85, start: 570, boss: 'cafe', churn: true },
  { dept: 'Cafe', job: 'Cafe Assistant', pay: 'H', hours: 24, days: [1, 2, 3], rate: 12.85, start: 570, boss: 'cafe', churn: true },
  { dept: 'Cafe', job: 'Cafe Assistant', pay: 'H', hours: 16, days: [6, 0], rate: 12.85, start: 570, boss: 'cafe', churn: true },
  { dept: 'Cafe', job: 'Kitchen Porter', pay: 'H', hours: 18, days: [1, 2, 3], rate: 12.75, start: 600, boss: 'cafe' },
  // Two seasonal assistants, each year from mid-March to the end of September.
  { dept: 'Shop and Nursery', job: 'Seasonal Assistant', pay: 'H', hours: 30, days: [4, 5, 6, 0], rate: 12.85, start: 510, boss: 'nursery', seasonal: true },
  { dept: 'Shop and Nursery', job: 'Seasonal Assistant', pay: 'H', hours: 30, days: [3, 4, 6, 0], rate: 12.85, start: 510, boss: 'shop', seasonal: true },
];
const LEAVING = ['New job', 'Moved away', 'Returned to study', 'Career change', 'Family reasons', 'Retired'];
const SICK = ['Cold or flu', 'Stomach upset', 'Headache', 'Back strain', 'Unwell', 'Minor injury at home', 'Dental treatment'];
const APPOINTMENTS = ['Medical appointment', 'Dental appointment', 'School meeting', 'Hospital appointment', 'Optician'];

/** Fill a Wrenmoor Garden Centre database made from `spec`. `r` is random(), `cal` calendar(). Answers counts. */
export function fill(base, { r, cal }) {
  const counts = {};
  const add = (table, values) => { counts[table] = (counts[table] || 0) + 1; return base.insert(table, values); };

  add('Business', businessRecord({
    name: 'Wrenmoor Garden Centre', domain: 'wrenmoor.example', phone: '020 7946 0420',
    address: { Address: '1 Orchard Way', City: 'London', Postcode: 'N9 4QR', Country: 'United Kingdom' },
    terms: 'Pay is made by bank transfer on the pay date shown.',
    footer: 'Wrenmoor Garden Centre, open every day. Questions about pay, holiday or this document: hr@wrenmoor.example or the office.',
  }));
  const deptId = {};
  for (const [name, code, notes] of DEPARTMENTS) deptId[name] = add('Departments', { Name: name, Code: code, Notes: notes });

  // The calendar: today is 0. The records start on 1 January last year.
  const t0 = cal.at(0);
  const y0 = t0.getFullYear();
  const todayUtc = Date.UTC(y0, t0.getMonth(), t0.getDate());
  const jan1 = (y) => Math.round((Date.UTC(y, 0, 1) - todayUtc) / 86400000);
  const S = jan1(y0 - 1);
  const YE = jan1(y0 + 1) - 1;
  // The first Monday whose week is paid in the first pay year (the monthly hourly pay is a month
  // behind, so the January run pays the weeks that ended in December), and this week's Monday.
  let m0 = S - 31;
  while (cal.weekday(m0) !== 1) m0--;
  let mc = 0;
  while (cal.weekday(mc) !== 1) mc--;
  const LO = m0 - 7;
  const HI = Math.max(YE, 0) + 60;
  const days = [];
  for (let o = LO; o <= HI; o++) { const d = cal.at(o); days.push({ iso: cal.iso(d), wd: d.getDay(), mo: d.getMonth(), y: d.getFullYear(), dd: d.getDate() }); }
  const D = (o) => days[o - LO];
  const iso = (o) => (o === null || o === undefined ? null : o < LO || o > HI ? cal.day(o) : D(o).iso);

  // People: each job's holder now, and those before them.
  const holders = [];
  const hire = (pos, start, extra = {}) => { const h = { pos, start, leave: null, reason: null, events: [], off: new Map(), weeks: new Map(), ...extra }; holders.push(h); return h; };
  const byKey = {};
  for (const pos of JOBS) {
    if (pos.seasonal) continue;
    const h = hire(pos, S - r.int(pos.pay === 'S' ? 400 : 60, pos.key === 'gm' ? 4200 : 3200));
    pos.first = h;
    if (pos.key) byKey[pos.key] = h;
  }
  // Leavers and the people who replaced them: three in the period, one recently (their replacement starts soon), the buyer once.
  const churn = r.some(JOBS.filter((p) => p.churn), 4);
  churn.forEach((pos, i) => {
    const h = pos.first;
    h.leave = i === 0 ? r.int(-45, -22) : r.int(S + 45, -50);
    h.reason = r.pick(LEAVING);
    hire(pos, i === 0 ? r.int(3, 28) : h.leave + r.int(10, 40));
  });
  {
    const h = byKey.buyer;
    h.leave = r.int(S + 90, -90);
    h.reason = r.pick(LEAVING);
    hire(h.pos, h.leave + r.int(20, 45));
  }
  for (const pos of JOBS.filter((p) => p.seasonal)) {
    for (const y of [y0 - 1, y0]) {
      const start = jan1(y) + 73 + r.int(0, 12);
      const end = jan1(y) + 271 + r.int(0, 3);
      if (start > 45) continue;
      const h = hire(pos, start, { notes: `Seasonal contract, ${MONTH_NAMES[2]} to ${MONTH_NAMES[8]}.` });
      if (end <= -1) { h.leave = end; h.reason = 'End of seasonal contract'; }
    }
  }
  // A promotion and a change of hours during the period.
  byKey.promoted.events.push({ at: r.int(S + 120, -60), reason: 'Promotion', set: { job: 'Senior Sales Assistant', add: 0.8 } });
  byKey.more.events.push({ at: r.int(S + 90, -90), reason: 'Change of hours', set: { hours: 24, days: [2, 3, 4] } });

  const employed = (h, o) => o >= h.start && (h.leave === null || o <= h.leave);
  // The terms a person is on that day: pay rises 3.5 percent each January.
  const termsAt = (h, o) => {
    const y = o < LO || o > HI ? cal.at(o).getFullYear() : D(o).y;
    let n = 0;
    for (const e of h.events) if (e.at <= o) n++;
    const key = y * 10 + n;
    if (!h.terms) h.terms = new Map();
    if (h.terms.has(key)) return h.terms.get(key);
    const t = { job: h.pos.job, hours: h.pos.hours, days: h.pos.days, add: 0 };
    for (const e of h.events) if (e.at <= o) Object.assign(t, e.set);
    const k = Math.pow(1.035, y - y0);
    t.rate = h.pos.pay === 'H' ? Math.round((h.pos.rate + t.add) * k * 20) / 20 : null;
    t.salary = h.pos.pay === 'S' ? Math.round((h.pos.rate * k) / 250) * 250 : null;
    t.perDay = t.hours / t.days.length;
    h.terms.set(key, t);
    return t;
  };
  const bossOf = (h) => (h.pos.boss ? byKey[h.pos.boss] : byKey.hr);

  // Holiday, sickness and other leave, planned day by day so nothing overlaps.
  const leave = [];
  const allowances = [];
  /** `n` working days of the person's from `from`, none already off and none after `until`; null if they do not fit. */
  const workdays = (h, from, n, until) => {
    const out = [];
    for (let o = from; out.length < n; o++) {
      if (o > until || o - from > 21) return null;
      if (!employed(h, o) || !termsAt(h, o).days.includes(D(o).wd)) continue;
      if (h.off.has(o)) return null;
      out.push(o);
    }
    return out;
  };
  const mark = (h, list, frac, kind, status) => { for (const o of list) h.off.set(o, { frac, kind, status }); };
  // A request asked for some days before, decided a few days later: answers its status and dates, or null if not asked for yet.
  const request = (h, first, before) => {
    const req = Math.max(Math.min(h.start, first - 1), first - r.int(before[0], before[1]));
    if (req > 0) return null;
    const dec = Math.max(req, Math.min(req + r.int(1, 4), first - 1));
    return { req, dec, status: dec >= 0 ? 'Requested' : 'Approved' };
  };
  const busyMonths = (dept) => (dept === 'Cafe' ? [5, 6, 7, 11] : [2, 3, 4, 5, 11]);

  for (const h of holders) {
    h.sickly = r.weighted([[0, 3], [1, 4], [2, 3], [3, 2], [4, 1], [6, 0.4]]);
    h.carry = 0;
    for (const y of [y0 - 1, y0]) {
      const yStart = jan1(y);
      const yEnd = jan1(y + 1) - 1;
      const from = Math.max(yStart, S, h.start);
      const to = Math.min(yEnd, h.leave === null ? yEnd : h.leave);
      if (from > to) continue;
      const dpw = termsAt(h, from).days.length;
      const full = Math.round(5.6 * 5 * 10) / 10;
      const allowEnd = h.leave !== null && h.leave <= yEnd ? h.leave : yEnd;
      const allowance = halfUp((5.6 * dpw * (allowEnd - from + 1)) / (yEnd - yStart + 1));
      const a = { h, y, yStart, yEnd, dpw, full, allowance, carry: y === y0 ? h.carry : 0, booked: 0, notes: null };
      allowances.push(a);
      // Holiday: most of the allowance, in blocks of a day to two weeks, fewer in the busy months.
      const target = (a.allowance + a.carry) * (0.85 + r.next() * 0.15) * (h.leave !== null && h.leave <= yEnd ? 0.8 : 1);
      let planned = 0;
      for (let tries = 0; planned < target - 0.4 && tries < 90; tries++) {
        const left = target - planned;
        let n = Math.min(r.weighted([[1, 3], [2, 2], [3, 2], [4, 1], [5, 3], [8, 1], [10, 0.6]]), Math.floor(left));
        let frac = 1;
        if (n < 1 || (n === 1 && r.chance(0.12))) { n = 1; frac = 0.5; }
        const first = r.int(from, to);
        if (busyMonths(h.pos.dept).includes(D(first).mo) && r.chance(0.65)) continue;
        const list = workdays(h, first, n, to);
        if (!list) continue;
        const asked = request(h, list[0], [7, 60]);
        // Holiday planned for later in the year and not asked for yet: it is not in the records.
        if (!asked) { planned += list.length * frac; continue; }
        if (asked.status === 'Approved' && r.chance(0.04)) asked.status = 'Declined';
        const daysOff = list.length * frac;
        leave.push({ h, kind: 'Holiday', a, list, days: daysOff, ...asked, paid: true, reason: frac < 1 ? 'Half day' : null });
        if (asked.status === 'Declined') continue;
        mark(h, list, frac, 'Holiday', asked.status);
        planned += daysOff;
        if (asked.status === 'Approved') a.booked += daysOff;
      }
      // Sickness, more of it in winter: only up to today.
      const pastTo = Math.min(to, 0);
      if (from <= pastTo) {
        const spells = Math.round((h.sickly * (pastTo - from + 1)) / 365);
        for (let k = 0, tries = 0; k < spells && tries < 40; tries++) {
          const first = r.int(from, pastTo);
          if (![0, 1, 10, 11].includes(D(first).mo) && r.chance(0.4)) continue;
          const list = workdays(h, first, r.weighted([[1, 5], [2, 2.5], [3, 1.5], [5, 0.7], [8, 0.3]]), to);
          if (!list || list[0] > 0) continue;
          leave.push({ h, kind: 'Sickness', list, days: list.length, req: list[0], dec: list[0], status: 'Recorded', paid: true, reason: r.pick(SICK) });
          mark(h, list, 1, 'Sickness', 'Recorded');
          k++;
        }
        // Now and then a day or two of compassionate leave.
        if (r.chance(0.07)) {
          const list = workdays(h, r.int(from, pastTo), r.int(1, 3), to);
          if (list && list[0] <= 0) {
            leave.push({ h, kind: 'Compassionate leave', list, days: list.length, req: list[0], dec: list[0], status: 'Recorded', paid: true, reason: 'Family matter' });
            mark(h, list, 1, 'Compassionate leave', 'Recorded');
          }
        }
      }
      // Half days for appointments, asked for a week or two ahead.
      for (let k = r.int(0, 2); k > 0; k--) {
        const list = workdays(h, r.int(from, to), 1, to);
        if (!list) continue;
        const asked = request(h, list[0], [2, 14]);
        if (!asked) continue;
        leave.push({ h, kind: 'Appointment', list, days: 0.5, ...asked, paid: true, reason: r.pick(APPOINTMENTS) });
        mark(h, list, 0.5, 'Appointment', asked.status);
      }
      // Unpaid leave, for someone paid by the hour who wants more time off.
      if (h.pos.pay === 'H' && r.chance(0.12)) {
        const list = workdays(h, r.int(from, to), r.int(1, 3), to);
        const asked = list && request(h, list[0], [10, 40]);
        if (asked) {
          leave.push({ h, kind: 'Unpaid leave', list, days: list.length, ...asked, paid: false, reason: 'Extra time off, unpaid' });
          mark(h, list, 1, 'Unpaid leave', asked.status);
        }
      }
      // Up to five unused days go into next year; a leaver is paid for theirs.
      const unused = Math.max(0, a.allowance + a.carry - a.booked);
      if (h.leave !== null && h.leave <= yEnd) {
        h.untaken = unused;
        if (unused > 0) a.notes = `Left on ${iso(h.leave)}: ${unused} days untaken, paid on the last payslip.`;
      } else {
        h.carry = Math.min(5, unused);
      }
    }
  }

  // Whatever the day: someone off in the next week, and a request waiting for a decision.
  const current = holders.filter((h) => h.start <= 0 && h.leave === null);
  const offSoon = () => leave.some((l) => ['Approved', 'Recorded'].includes(l.status) && l.list[0] <= 7 && l.list[l.list.length - 1] >= 0);
  for (const h of r.some(current, current.length)) {
    if (offSoon()) break;
    const a = allowances.find((x) => x.h === h && x.y === y0);
    if (!a || a.allowance + a.carry - a.booked < 2) continue;
    const list = workdays(h, r.int(0, 4), r.int(1, 2), Math.min(YE, 9));
    if (!list) continue;
    const req = -r.int(10, 30);
    leave.push({ h, kind: 'Holiday', a, list, days: list.length, req, dec: req + 2, status: 'Approved', paid: true, reason: null });
    mark(h, list, 1, 'Holiday', 'Approved');
    a.booked += list.length;
  }
  // At the very end of the year, when no holiday is left to book, a half day for an appointment.
  for (const h of r.some(current, current.length)) {
    if (offSoon()) break;
    const list = workdays(h, r.int(1, 5), 1, HI);
    if (!list) continue;
    const req = -r.int(3, 10);
    leave.push({ h, kind: 'Appointment', list, days: 0.5, req, dec: req + 1, status: 'Approved', paid: true, reason: r.pick(APPOINTMENTS) });
    mark(h, list, 0.5, 'Appointment', 'Approved');
  }
  if (!leave.some((l) => l.status === 'Requested')) {
    for (const h of r.some(current, current.length)) {
      const list = workdays(h, r.int(4, 20), 1, HI);
      if (!list) continue;
      leave.push({ h, kind: 'Appointment', list, days: 0.5, req: -1, dec: 0, status: 'Requested', paid: true, reason: r.pick(APPOINTMENTS) });
      mark(h, list, 0.5, 'Appointment', 'Requested');
      break;
    }
  }

  // Their records: numbers in order of starting, details made up.
  holders.sort((a, b) => a.start - b.start);
  let no = 100;
  const londonHome = { country: 'United Kingdom', cities: ['London'], post: (rr) => `${rr.pick(['N', 'E', 'NW', 'EN'])}${rr.int(1, 22)} ${rr.int(1, 9)}${rr.pick(['AB', 'DE', 'HJ', 'NP', 'QR', 'TU'])}` };
  for (const h of holders) {
    no += r.int(1, 3);
    h.no = `EMP-${pad(no, 4)}`;
    const p = person(r, { domain: 'wrenmoor.example' });
    h.first = p['First Name'];
    h.last = p['Last Name'];
    h.email = p['E-mail'];
    const young = h.pos.pay === 'H' && h.pos.hours < 25 && r.chance(0.5);
    h.age = h.pos.pay === 'S' ? r.int(28, 61) : young ? r.int(17, 24) : r.int(19, 63);
    h.dob = -Math.round(h.age * 365.25) - r.int(0, 364);
    const rel = h.age < 25 ? r.pick(['Mother', 'Father', 'Parent']) : r.pick(['Partner', 'Husband', 'Wife', 'Sister', 'Brother', 'Friend', ...(h.age > 45 ? ['Son', 'Daughter'] : [])]);
    h.contact = { name: `${r.pick(FIRST)} ${['Partner', 'Friend'].includes(rel) ? r.pick(LAST) : h.last}`, rel };
  }
  // Someone always has a birthday this month.
  {
    const h = r.pick(current);
    const want = t0.getMonth();
    const d = cal.at(h.dob);
    let o = h.dob;
    while (cal.at(o).getMonth() !== want || cal.at(o).getDate() !== Math.min(d.getDate(), 28)) o--;
    h.dob = o;
  }

  for (const h of holders) {
    const t = termsAt(h, h.leave !== null ? h.leave : Math.max(0, h.start));
    const a = address(r, [londonHome]);
    h.id = add('Employees', {
      'Employee No': h.no, 'First Name': h.first, 'Last Name': h.last, 'Job Title': t.job, Department: deptId[h.pos.dept],
      'Start Date': iso(h.start), 'Leave Date': iso(h.leave), 'Leaving Reason': h.reason, 'Date of Birth': cal.day(h.dob),
      Address: a.Address, City: a.City, Postcode: a.Postcode, Phone: phoneFor(r, 'United Kingdom'), 'E-mail': h.email,
      'Pay Type': h.pos.pay === 'S' ? 'Salaried' : 'Hourly', 'Hourly Rate': t.rate, 'Annual Salary': t.salary,
      'Hours per Week': t.hours, 'Days per Week': t.days.length, 'Pay Frequency': h.pos.weekly ? 'Weekly' : 'Monthly',
      'Holiday Days': halfUp(5.6 * t.days.length), 'Notice Weeks': h.pos.pay === 'S' ? 4 : 2, 'Tax Code': null,
      'Bank Code': '00-00-00', 'Account Number': '00000000',
      'Emergency Contact': h.contact.name, 'Emergency Relationship': h.contact.rel, 'Emergency Phone': phoneFor(r, 'United Kingdom'),
      Notes: h.notes || null,
    });
  }
  for (const h of holders) { const b = bossOf(h); if (h.pos.boss && b) base.update('Employees', h.id, { Manager: b.id }); }
  const hr = byKey.hr;
  const gm = byKey.gm;

  // Pay history: joining, each January's review, and any promotion or change of hours.
  for (const h of holders) {
    const changes = [{ at: h.start, reason: 'Joined' }];
    const until = h.leave !== null ? h.leave : 0;
    const startYear = h.start < LO ? cal.at(h.start).getFullYear() : D(h.start).y;
    for (let y = startYear + 1; jan1(y) <= until; y++) changes.push({ at: jan1(y), reason: 'Annual review' });
    for (const e of h.events) if (e.at <= until && e.at >= h.start) changes.push({ at: e.at, reason: e.reason });
    changes.sort((x, y) => x.at - y.at);
    for (const c of changes) {
      const t = termsAt(h, c.at);
      add('Pay Changes', {
        Employee: h.id, 'Effective From': iso(c.at), Reason: c.reason, 'Job Title': t.job, 'Pay Type': h.pos.pay === 'S' ? 'Salaried' : 'Hourly',
        'Hourly Rate': t.rate, 'Annual Salary': t.salary, 'Hours per Week': t.hours, 'Days per Week': t.days.length,
        Notes: c.reason === 'Annual review' ? 'Yearly pay review, agreed for all staff.' : c.reason === 'Joined' ? null : 'Agreed with the General Manager.',
      });
    }
  }

  // Papers held: a contract, a right to work check and a starter form for each, and a letter for each change.
  {
    const expiring = r.some(current, 3);
    const longServing = current.filter((h) => h.start < -365);
    const missing = r.pick(longServing.length ? longServing : current);
    for (const h of holders) {
      let k = 0;
      const refNo = () => `HR-${h.no.slice(4)}-${++k}`;
      const checker = h === hr || h.start < hr.start ? gm : hr;
      const recent = h.start > -25;
      const contractIssued = Math.min(h.start - r.int(7, 20), -2);
      const signed = h.start > 0 || (recent && r.chance(0.5)) ? null : Math.min(h.start - r.int(0, 5), -1);
      add('Documents Held', { Employee: h.id, Document: 'Employment contract', Reference: refNo(), 'Issued On': iso(contractIssued), 'Completed On': iso(signed), 'Checked By': checker.id, Notes: signed === null ? 'Sent; waiting for the signed copy.' : null });
      const i = expiring.indexOf(h);
      const checked = h.start > 0 ? null : Math.min(h.start - r.int(1, 7), -1);
      const expires = i < 0 ? null : i === 0 ? r.int(10, 55) : r.int(120, 600);
      add('Documents Held', { Employee: h.id, Document: 'Right to work check', Reference: refNo(), 'Issued On': iso(Math.min(h.start - r.int(10, 20), -2)), 'Completed On': iso(checked), 'Checked By': checker.id, 'Expires On': iso(expires), Notes: expires !== null ? 'Permission to work runs out: check again before the date.' : checked === null ? 'To be done on or before the first day.' : null });
      add('Documents Held', { Employee: h.id, Document: 'Starter form', Reference: refNo(), 'Issued On': iso(contractIssued), 'Completed On': iso(h.start > 0 ? null : Math.min(h.start, -1)), 'Checked By': checker.id });
      for (const e of h.events) {
        if (e.at > 0 || e.at < h.start || (h.leave !== null && e.at > h.leave)) continue;
        add('Documents Held', { Employee: h.id, Document: 'Contract change letter', Reference: refNo(), 'Issued On': iso(e.at - r.int(7, 14)), 'Completed On': iso(e.at - r.int(1, 5)), 'Checked By': hr.id, Notes: `${e.reason}.` });
      }
      if (h === missing) add('Documents Held', { Employee: h.id, Document: 'Right to work check', Reference: refNo(), 'Issued On': iso(-r.int(5, 30)), 'Checked By': hr.id, Notes: 'The copy was missing from the file at the last audit: check again.' });
    }
  }

  // Holiday allowances, then every absence numbered in the order it was asked for.
  for (const a of allowances) {
    a.id = add('Holiday Allowances', {
      Employee: a.h.id, Reference: `${a.h.first} ${a.h.last}, ${a.y}`, 'Holiday Year': String(a.y), 'Year Starts': iso(a.yStart), 'Year Ends': iso(a.yEnd),
      'Days per Week': a.dpw, 'Full-time Days': a.full, Allowance: a.allowance, 'Carried Over': a.carry, 'Days Booked': a.booked,
      Notes: a.notes || (a.allowance < halfUp(5.6 * a.dpw) ? `A share of ${halfUp(5.6 * a.dpw)} days for the part of the year worked.` : null),
    });
  }
  leave.sort((x, y) => x.req - y.req || x.list[0] - y.list[0]);
  const lvCount = {};
  for (const l of leave) {
    const y = Number(iso(l.req).slice(0, 4));
    lvCount[y] = (lvCount[y] || 0) + 1;
    const decided = l.status !== 'Requested';
    add('Absences', {
      Number: `LV-${y}-${pad(lvCount[y], 4)}`, Employee: l.h.id, Kind: l.kind, Allowance: l.a ? l.a.id : null,
      Starts: iso(l.list[0]), Ends: iso(l.list[l.list.length - 1]), Days: l.days, Reason: l.reason, Status: l.status,
      'Requested On': iso(l.req), 'Decided By': decided ? (bossOf(l.h) || hr).id : null, 'Decided On': decided ? iso(l.dec) : null, Paid: l.paid,
      Notes: l.status === 'Declined' ? 'Too many of the team already off then; other dates offered.' : null,
    });
  }

  // Timesheets, worked out a week at a time for everyone paid by the hour.
  const busy = (dept, mo) => (dept === 'Cafe' ? ([5, 6, 7].includes(mo) ? 0.2 : mo === 11 ? 0.18 : 0.05) : ([2, 3, 4, 5].includes(mo) ? 0.28 : mo === 11 ? 0.22 : mo === 10 ? 0.1 : 0.05));
  const away = (h, o) => { const x = h.off.get(o); return x && (x.status === 'Approved' || x.status === 'Recorded') ? x : null; };
  for (const h of holders) {
    if (h.pos.pay !== 'H') continue;
    for (let m = m0; m <= mc; m += 7) {
      const contract = termsAt(h, m).hours;
      const lines = [];
      for (let o = m; o < m + 7; o++) {
        if (o > -1 || !employed(h, o)) continue;
        const t = termsAt(h, o);
        const x = away(h, o);
        const b = busy(h.pos.dept, D(o).mo) * (D(o).wd === 0 || D(o).wd === 6 ? 1.3 : 1);
        let hours;
        let note = null;
        if (t.days.includes(D(o).wd)) {
          if (x && x.frac >= 1) continue;
          hours = t.perDay * (x ? 1 - x.frac : 1);
          if (x) note = `Half day off: ${x.kind.toLowerCase()}`;
          else if (r.chance(b)) { hours += r.pick([0.5, 0.5, 1, 1, 1.5, 2]); note = 'Stayed late, busy'; }
          else if (r.chance(0.03)) { hours -= 0.5; note = 'Left early, agreed'; }
        } else if (t.days.length < 5 && !h.off.has(o) && r.chance(b * 0.25)) {
          hours = t.perDay;
          note = 'Extra shift';
        } else continue;
        hours = quarter(hours);
        const shift = h.pos.start + (r.chance(0.1) ? r.pick([-30, 30]) : 0) + (x && x.frac < 1 && r.chance(0.5) ? hours * 60 : 0);
        lines.push({ o, hours, brk: hours > 6 ? 30 : 0, shift, note });
      }
      if (!lines.length) continue;
      // This week's sheet is handed in only once the person has finished their week.
      if (m === mc) {
        let open = false;
        for (let o = 0; o < m + 7; o++) if (employed(h, o) && termsAt(h, o).days.includes(D(o).wd) && !(away(h, o)?.frac >= 1)) open = true;
        if (open) continue;
      }
      let cum = 0;
      for (const l of lines) { const before = cum; cum += l.hours; l.ot = Math.max(0, cum - contract) - Math.max(0, before - contract); }
      const total = quarter(cum);
      const ot = quarter(Math.max(0, cum - contract));
      const dec = m + 8 + r.weighted([[0, 7], [1, 2], [2, 1]]);
      h.weeks.set(m, { m, lines, total, ot, contract, submitted: lines[lines.length - 1].o, approved: dec < 0 ? dec : null });
    }
  }

  // Pay years, and the pay runs: one a month, paying salaries for its own month and hours for the
  // weeks that ended in the month before. A job marked weekly would have weekly runs of its own.
  const runs = [];
  for (let m = m0; JOBS.some((p) => p.weekly) && m + 6 < 0; m += 7) {
    const pay = m + 11;
    if (pay < S) continue;
    if (pay > 0 && runs.some((x) => x.weekly && x.pay > 0)) break;
    runs.push({ weekly: true, m, ps: m, pe: m + 6, pay, paid: pay <= 0 });
  }
  const monthOf = (y, mo) => [Math.round((Date.UTC(y, mo, 1) - todayUtc) / 86400000), Math.round((Date.UTC(y, mo + 1, 1) - todayUtc) / 86400000) - 1];
  for (let y = y0 - 1; y <= y0; y++) {
    for (let mo = 0; mo < 12; mo++) {
      const [ps, pe] = monthOf(y, mo);
      if (ps > 0) break;
      let pay = pe;
      while (D(pay).wd === 0 || D(pay).wd === 6) pay--;
      const [hs, he] = monthOf(y, mo - 1);
      const weeks = [];
      for (let m = m0; m <= mc; m += 7) if (m + 6 >= hs && m + 6 <= he) weeks.push(m);
      runs.push({ weekly: false, ps, pe, pay, paid: pay <= 0, weeks, hoursKey: `${D(hs).y}-${D(hs).mo}` });
    }
  }
  runs.sort((a, b) => a.pay - b.pay || (a.weekly ? 0 : 1) - (b.weekly ? 0 : 1));
  const payYear = {};
  for (const y of [...new Set(runs.map((x) => D(x.pay).y))].sort()) {
    payYear[y] = add('Pay Years', { Name: String(y), Starts: iso(jan1(y)), Ends: iso(jan1(y + 1) - 1), Notes: 'The calendar year. Change the dates if your tax year differs.' });
  }
  const weekNo = {};
  const dm = (o) => `${iso(o).slice(8)}/${iso(o).slice(5, 7)}`;
  for (const run of runs) {
    const y = D(run.pay).y;
    run.y = y;
    if (run.weekly) {
      weekNo[y] = (weekNo[y] || 0) + 1;
      run.number = `PAY-${y}-W${pad(weekNo[y])}`;
      run.period = `Week ${weekNo[y]}, ${dm(run.ps)} to ${dm(run.pe)}`;
    } else {
      run.number = `PAY-${y}-M${pad(D(run.ps).mo + 1)}`;
      run.period = `${MONTH_NAMES[D(run.ps).mo]} ${D(run.ps).y}`;
    }
    run.id = add('Pay Runs', {
      Number: run.number, 'Pay Year': payYear[y], Frequency: run.weekly ? 'Weekly' : 'Monthly', Period: run.period,
      'Period Starts': iso(run.ps), 'Period Ends': iso(run.pe), 'Pay Date': iso(run.pay), Status: run.paid ? 'Paid' : 'Open',
      Notes: run.paid ? null : 'Being prepared: payslips are added on the pay date, once the timesheets are approved.',
    });
  }
  const weeklyRun = new Map(runs.filter((x) => x.weekly && x.paid).map((x) => [x.m, x]));
  const monthlyRun = new Map(runs.filter((x) => !x.weekly && x.paid).map((x) => [x.hoursKey, x]));
  const runFor = (h, m) => (h.pos.weekly ? weeklyRun.get(m) : monthlyRun.get(`${D(m + 6).y}-${D(m + 6).mo}`));

  // The timesheets in date order, a week at a time.
  const tsCount = {};
  for (let m = m0; m <= mc; m += 7) {
    for (const h of holders) {
      const w = h.weeks.get(m);
      if (!w) continue;
      const y = D(m).y;
      tsCount[y] = (tsCount[y] || 0) + 1;
      const run = runFor(h, m);
      const id = add('Timesheets', {
        Number: `TS-${y}-${pad(tsCount[y], 4)}`, Employee: h.id, 'Week Commencing': iso(m), 'Contract Hours': w.contract, 'Total Hours': w.total,
        'Overtime Hours': w.ot, Status: w.approved !== null ? 'Approved' : 'Submitted', 'Submitted On': iso(w.submitted),
        'Approved By': w.approved !== null ? bossOf(h).id : null, 'Approved On': iso(w.approved), 'Pay Run': run ? run.id : null,
      });
      for (const l of w.lines) {
        add('Timesheet Lines', {
          Timesheet: id, Date: iso(l.o), Day: DAY_NAMES[D(l.o).wd], Start: hhmm(l.shift), End: hhmm(l.shift + l.hours * 60 + l.brk),
          'Break Minutes': l.brk, Hours: l.hours, Overtime: quarter(l.ot), Note: l.note,
        });
      }
    }
  }

  // The business's own deduction rates: invented examples, every one named so.
  const RATES = [
    { name: 'Income tax (example rate)', by: 'Employee', pct: 18, threshold: 10000, from: S, to: null, order: 1 },
    { name: 'Social insurance (example rate)', by: 'Employee', pct: 7, threshold: 8000, from: S, to: null, order: 2 },
    { name: 'Pension (example rate)', by: 'Employee', pct: 3, threshold: 6000, from: S, to: jan1(y0) - 1, order: 3 },
    { name: 'Pension (example rate)', by: 'Employee', pct: 4, threshold: 6000, from: jan1(y0), to: null, order: 3 },
    { name: 'Employer insurance (example amount)', by: 'Employer', fixed: 156, from: S, to: null, order: 7 },
    { name: 'Employer social insurance (example rate)', by: 'Employer', pct: 9, threshold: 8000, from: S, to: null, order: 5 },
    { name: 'Employer pension (example rate)', by: 'Employer', pct: 3, threshold: 6000, from: S, to: null, order: 6 },
  ];
  for (const x of RATES) {
    x.id = add('Deduction Rates', {
      Name: x.name, 'Paid By': x.by, Percent: x.pct ?? null, 'Fixed Amount': x.fixed ?? null, Threshold: x.threshold ?? null,
      'Applies From': iso(x.from), 'Applies To': iso(x.to), 'Print Order': x.order,
      Notes: 'An invented example, not any country\'s rule. Replace it with your own country\'s current rate or your payroll provider\'s figure.',
    });
  }
  const PAY_ITEMS = ['Basic pay', 'Overtime', 'Holiday pay', 'Sick pay', 'Paid leave', 'Holiday pay, untaken days'];

  /** An hourly person's pay for whole weeks: hours worked, overtime and paid absence, a line for each item and rate. */
  const hourlyPay = (h, weeks) => {
    const lines = new Map();
    const put = (item, hours, rate) => {
      if (!hours) return;
      const k = `${item}|${rate}`;
      if (!lines.has(k)) lines.set(k, { item, hours: 0, rate });
      lines.get(k).hours += hours;
    };
    for (const m of weeks) {
      const t = termsAt(h, m);
      const w = h.weeks.get(m);
      if (w) { put('Basic pay', w.total - w.ot, t.rate); put('Overtime', w.ot, Math.ceil(t.rate * 150 - 1e-6) / 100); }
      for (let o = m; o < m + 7; o++) {
        const x = away(h, o);
        if (!x || x.kind === 'Unpaid leave') continue;
        put(x.kind === 'Holiday' ? 'Holiday pay' : x.kind === 'Sickness' ? 'Sick pay' : 'Paid leave', termsAt(h, o).perDay * x.frac, t.rate);
      }
      if (h.leave !== null && h.leave >= m && h.leave < m + 7 && h.untaken > 0) put('Holiday pay, untaken days', h.untaken * termsAt(h, h.leave).perDay, t.rate);
    }
    const out = [...lines.values()].sort((a, b) => PAY_ITEMS.indexOf(a.item) - PAY_ITEMS.indexOf(b.item));
    for (const p of out) { p.hours = quarter(p.hours); p.amount = money(p.hours * p.rate); }
    return out;
  };

  // Payslips, run by run in pay date order, so the year-to-date figures build up.
  const ytd = new Map();
  const psCount = {};
  for (const run of runs.filter((x) => x.paid)) {
    const periods = run.weekly ? 52 : 12;
    const rates = RATES.filter((x) => x.from <= run.pay && (x.to === null || x.to >= run.pay));
    for (const h of holders) {
      if (Boolean(h.pos.weekly) !== run.weekly) continue;
      const hourly = h.pos.pay === 'H';
      const weeks = run.weekly ? [run.m] : hourly ? run.weeks : null;
      if (weeks && !weeks.length) continue;
      const from = weeks ? weeks[0] : run.ps;
      const to = weeks ? weeks[weeks.length - 1] + 6 : run.pe;
      if (h.start > to || (h.leave !== null && h.leave < from)) continue;
      let pays;
      if (hourly) pays = hourlyPay(h, weeks);
      else {
        const t = termsAt(h, run.ps);
        const inMonth = Math.min(run.pe, h.leave === null ? run.pe : h.leave) - Math.max(run.ps, h.start) + 1;
        pays = [{ item: 'Basic pay', hours: null, rate: null, amount: money((t.salary / 12) * (inMonth / (run.pe - run.ps + 1))) }];
        if (h.leave !== null && h.leave <= run.pe && h.untaken > 0) pays.push({ item: 'Holiday pay, untaken days', hours: null, rate: null, amount: money((h.untaken * t.salary) / (52 * t.days.length)) });
      }
      const gross = money(pays.reduce((n, p) => n + p.amount, 0));
      if (gross <= 0) continue;
      const share = (x) => (x.fixed ? money(x.fixed / periods) : money(Math.max(0, gross - (x.threshold || 0) / periods) * (x.pct / 100)));
      const deductions = rates.filter((x) => x.by === 'Employee').map((x) => ({ item: x.name, rate: x, amount: share(x) })).filter((x) => x.amount > 0);
      const taken = money(deductions.reduce((n, x) => n + x.amount, 0));
      const employer = money(rates.filter((x) => x.by === 'Employer').reduce((n, x) => n + share(x), 0));
      const net = money(gross - taken);
      const key = `${h.id}|${run.y}`;
      if (!ytd.has(key)) ytd.set(key, { h, y: run.y, items: new Map(), gross: 0, taken: 0, net: 0, employer: 0, count: 0 });
      const sum = ytd.get(key);
      sum.gross = money(sum.gross + gross);
      sum.taken = money(sum.taken + taken);
      sum.net = money(sum.net + net);
      sum.employer = money(sum.employer + employer);
      sum.count++;
      psCount[run.y] = (psCount[run.y] || 0) + 1;
      const id = add('Payslips', {
        Number: `PS-${run.y}-${pad(psCount[run.y], 4)}`, 'Pay Run': run.id, Employee: h.id, 'Pay Date': iso(run.pay), 'Tax Code': null,
        'Hours From': hourly ? iso(from) : null, 'Hours To': hourly ? iso(to) : null,
        'Hours Paid': hourly ? quarter(pays.reduce((n, p) => n + p.hours, 0)) : null, Gross: gross, Deductions: taken, Net: net, 'Employer Costs': employer,
        'Gross to Date': sum.gross, 'Deductions to Date': sum.taken, 'Net to Date': sum.net,
      });
      let line = 0;
      const put = (kind, x) => {
        const before = sum.items.get(x.item) || { kind, amount: 0 };
        before.amount = money(before.amount + x.amount);
        sum.items.set(x.item, before);
        add('Payslip Lines', { Payslip: id, Line: ++line, Kind: kind, Item: x.item, Hours: x.hours ?? null, Rate: kind === 'Payment' ? x.rate ?? null : null, Amount: x.amount, 'Year to Date': before.amount });
      };
      for (const p of pays) put('Payment', p);
      for (const d of deductions) put('Deduction', d);
    }
  }

  // Last year's annual pay summaries, given out in the first days of this year.
  const issued = Math.min(cal.workday(jan1(y0) + 1), 0);
  let apsNo = 0;
  const lastYear = [...ytd.values()].filter((x) => x.y === y0 - 1).sort((a, b) => (a.h.no < b.h.no ? -1 : 1));
  const order = [...PAY_ITEMS, ...[...new Set(RATES.filter((x) => x.by === 'Employee').map((x) => x.name))]];
  for (const s of lastYear) {
    const id = add('Annual Summaries', {
      Number: `APS-${s.y}-${pad(++apsNo, 4)}`, 'Pay Year': payYear[s.y], Employee: s.h.id, 'Tax Code': null, 'Issued On': iso(issued), 'Payslip Count': s.count,
      'Gross Pay': s.gross, Deductions: s.taken, 'Net Pay': s.net, 'Employer Costs': s.employer,
      Notes: s.h.leave !== null && s.h.leave <= jan1(y0) - 1 ? `Left on ${Number(iso(s.h.leave).slice(8))} ${MONTH_NAMES[Number(iso(s.h.leave).slice(5, 7)) - 1]} ${iso(s.h.leave).slice(0, 4)}; sent to their home address.` : null,
    });
    let line = 0;
    for (const item of order) {
      const x = s.items.get(item);
      if (x) add('Annual Summary Lines', { 'Annual Summary': id, Line: ++line, Kind: x.kind, Item: item, Amount: x.amount });
    }
  }
  return counts;
}
