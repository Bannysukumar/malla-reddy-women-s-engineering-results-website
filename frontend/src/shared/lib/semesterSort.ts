const ROMAN_VALUES: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
};

/** MRECW labels like "III/IV I SEM" → chronological index (1 = first sem). */
export function getSemesterSortKey(label: string): number {
  const match = label
    .trim()
    .toUpperCase()
    .match(/^([IVXLCDM]+)\/[IVXLCDM]+\s+([IVXLCDM]+)\s+SEM$/);
  if (!match) return 0;
  const year = ROMAN_VALUES[match[1]] ?? 0;
  const semInYear = ROMAN_VALUES[match[2]] ?? 0;
  return (year - 1) * 2 + semInYear;
}

/** Latest semester first (e.g. III/IV I SEM before II/IV II SEM). */
export function compareSemestersDesc(a: string, b: string): number {
  return getSemesterSortKey(b) - getSemesterSortKey(a);
}

export function sortBySemesterDesc<T>(items: T[], getLabel: (item: T) => string): T[] {
  return [...items].sort((a, b) => compareSemestersDesc(getLabel(a), getLabel(b)));
}

/** Earliest semester first (e.g. I/IV I SEM before I/IV II SEM). */
export function compareSemestersAsc(a: string, b: string): number {
  return getSemesterSortKey(a) - getSemesterSortKey(b);
}

export function sortBySemesterAsc<T>(items: T[], getLabel: (item: T) => string): T[] {
  return [...items].sort((a, b) => compareSemestersAsc(getLabel(a), getLabel(b)));
}

const YEAR_ROMAN = ["I", "II", "III", "IV"] as const;

/** Next semester after the given label (e.g. III/IV I SEM → III/IV II SEM). */
export function getNextSemester(label: string): string | null {
  const key = getSemesterSortKey(label);
  if (key <= 0) return null;
  const nextKey = key + 1;
  if (nextKey > 8) return null;
  const year = Math.floor((nextKey - 1) / 2) + 1;
  const semInYear = ((nextKey - 1) % 2) + 1;
  return `${YEAR_ROMAN[year - 1]}/IV ${semInYear === 1 ? "I" : "II"} SEM`;
}

/**
 * Semester to show in "not published yet" warnings.
 * Portal header may jump ahead (e.g. IV/IV I) while marks exist only up to III/IV I —
 * in that case the immediate next semester (III/IV II) is the one still unpublished.
 */
export function inferPendingSemester(published: string[], headerSemester?: string | null): string | null {
  if (!published.length || !headerSemester) return null;
  if (published.includes(headerSemester)) return null;

  const latest = published.reduce((best, label) =>
    getSemesterSortKey(label) >= getSemesterSortKey(best) ? label : best
  );
  const nextAfterLatest = getNextSemester(latest);
  if (!nextAfterLatest) return headerSemester;

  if (getSemesterSortKey(headerSemester) > getSemesterSortKey(nextAfterLatest)) {
    return nextAfterLatest;
  }
  return nextAfterLatest;
}

const ACADEMIC_MONTH_ORDER: Record<string, number> = {
  JUNE: 0,
  JULY: 1,
  AUGUST: 2,
  SEPTEMBER: 3,
  OCTOBER: 4,
  NOVEMBER: 5,
  DECEMBER: 6,
  JANUARY: 7,
  FEBRUARY: 8,
  MARCH: 9,
  APRIL: 10,
  MAY: 11,
};

/** Month rows within a semester (academic year order). */
export function compareAcademicMonths(a: string, b: string): number {
  const aKey = ACADEMIC_MONTH_ORDER[a.trim().toUpperCase()] ?? 99;
  const bKey = ACADEMIC_MONTH_ORDER[b.trim().toUpperCase()] ?? 99;
  return aKey - bKey;
}
