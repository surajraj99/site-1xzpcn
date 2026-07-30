const MONTHS = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

const DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function pad(n) {
  return String(n).padStart(2, '0');
}

function build(month, day) {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > DAYS_IN_MONTH[month]) return null;
  return `${pad(month)}-${pad(day)}`;
}

// Accepts "04/29", "4-29", "0429", "april 29", "29 Apr", "APRIL 29th".
export function normalizeDate(input) {
  if (typeof input !== 'string') return null;
  const text = input.trim().toLowerCase();
  if (!text) return null;

  const monthFirst = text.match(
    /^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:(?:\s*,\s*|\s+)(?:\d{2}|\d{4}))?$/,
  );
  if (monthFirst) {
    return build(MONTHS[monthFirst[1]], Number(monthFirst[2]));
  }

  const dayFirst = text.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?(?:(?:\s*,\s*|\s+)(?:\d{2}|\d{4}))?$/,
  );
  if (dayFirst) {
    return build(MONTHS[dayFirst[2]], Number(dayFirst[1]));
  }

  const separated = text.match(
    /^(\d{1,2})\s*([/.-])\s*(\d{1,2})(?:\s*\2\s*(?:\d{2}|\d{4}))?$/,
  );
  if (separated) return build(Number(separated[1]), Number(separated[3]));

  if (/^\d{4}$/.test(text)) {
    return build(Number(text.slice(0, 2)), Number(text.slice(2)));
  }
  if (/^\d{3}$/.test(text)) {
    return build(Number(text.slice(0, 1)), Number(text.slice(1)));
  }

  return null;
}

export function checkAnswer(input, expected) {
  const got = normalizeDate(input);
  return got !== null && got === expected;
}
