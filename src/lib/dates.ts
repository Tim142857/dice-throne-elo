const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(pValue: number): string {
  return String(pValue).padStart(2, "0");
}

function formatDateParts(pYear: number, pMonth: number, pDay: number): string {
  return `${pad2(pDay)}-${pad2(pMonth)}-${pYear}`;
}

function parseDateInput(pValue: string): Date | null {
  const trimmed = pValue.trim();
  const dateOnlyMatch = ISO_DATE_PATTERN.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

/**
 * Display a calendar date as dd-mm-YYYY across the app.
 */
export function formatDate(pValue: string | Date): string {
  if (pValue instanceof Date) {
    if (Number.isNaN(pValue.getTime())) {
      return "";
    }
    return formatDateParts(pValue.getFullYear(), pValue.getMonth() + 1, pValue.getDate());
  }

  const parsed = parseDateInput(pValue);
  if (!parsed) {
    return pValue;
  }

  return formatDateParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

/**
 * Display a timestamp as dd-mm-YYYY HH:mm.
 */
export function formatDateTime(pValue: string | Date): string {
  const parsed = pValue instanceof Date ? pValue : parseDateInput(pValue);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return String(pValue);
  }

  return `${formatDate(parsed)} ${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
}
