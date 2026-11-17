// Data Files' sample databases, in the parts their tests run in: the start
// screen's order, five to a part, each part a test file of its own so the
// parts run side by side (the whole took 518 seconds as one file in the
// 2.26.1 gate). samples.test.js holds every sample to exactly one part.

/** Every sample, in the start screen's order: its groups of businesses, one after another. */
export const ORDER = ['shop', 'food', 'cafe', 'takeaway', 'florist', 'pharmacy', 'trading', 'workshop', 'builder', 'cars',
  'salon', 'barber', 'repairs', 'garage', 'cleaning', 'agency', 'gym', 'clinic', 'school', 'charity',
  'rentals', 'agent', 'guesthouse', 'visitors', 'payroll'];

/** The parts, each named by its test file (tests/samples-<part>.test.js). */
export const PARTS = {
  'goods-1': ['shop', 'food', 'cafe', 'takeaway', 'florist'],
  'goods-2': ['pharmacy', 'trading', 'workshop', 'builder', 'cars'],
  'services-1': ['salon', 'barber', 'repairs', 'garage', 'cleaning'],
  'services-2': ['agency', 'gym', 'clinic', 'school', 'charity'],
  property: ['rentals', 'agent', 'guesthouse', 'visitors', 'payroll'],
};

/** The stock-keeping and invoicing samples, made on each day of a week as well (samples-checks.js). */
export const WEEK = ['trading', 'builder', 'garage', 'cafe'];

/**
 * Their weeks, in two parts of their own (tests/samples-<part>.test.js): a
 * week makes its sample seventeen times, and the four took a third of the
 * whole.
 */
export const WEEK_PARTS = {
  'week-1': ['garage', 'builder'],
  'week-2': ['cafe', 'trading'],
};
