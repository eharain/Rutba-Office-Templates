// Which Office a template needs. A version is major.minor.patch, compared as
// numbers (2.13.0 is newer than 2.9.4). An entry in the gallery, a simple
// Data Files template, a sample business, a part of the set or the whole set
// may say `minOffice`, the oldest Office that can use it; none means any.

/** -1, 0 or 1 as version `a` is older than, the same as or newer than `b`. */
export function compareVersions(a, b) {
  const pa = String(a || '0').split(/[.+-]/).slice(0, 3).map((n) => Number.parseInt(n, 10) || 0);
  const pb = String(b || '0').split(/[.+-]/).slice(0, 3).map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) < (pb[i] || 0) ? -1 : 1;
  }
  return 0;
}

/** Whether Office `office` can use something that needs `minOffice` (none: any Office can). */
export const usableBy = (office, minOffice) => !minOffice || compareVersions(office, minOffice) >= 0;

/** What an Office at `office` makes of an entry: null when it can use it, else the version it needs. */
export const needsFor = (office, entry) => (usableBy(office, entry?.minOffice) ? null : entry.minOffice);
