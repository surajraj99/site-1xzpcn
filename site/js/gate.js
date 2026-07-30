const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
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

  const named = text.match(/([a-z]{3,9})\.?\s*(\d{1,2})|(\d{1,2})\s*(?:st|nd|rd|th)?\s+([a-z]{3,9})/);
  if (named) {
    const word = named[1] || named[4];
    const number = Number(named[2] || named[3]);
    const month = MONTHS[word.slice(0, 3)];
    if (month) return build(month, number);
  }

  const separated = text.match(/^(\d{1,2})\s*[/.\-\s]\s*(\d{1,2})/);
  if (separated) return build(Number(separated[1]), Number(separated[2]));

  const compact = text.replace(/\D/g, '');
  if (compact.length === 4) return build(Number(compact.slice(0, 2)), Number(compact.slice(2)));
  if (compact.length === 3) return build(Number(compact.slice(0, 1)), Number(compact.slice(1)));

  return null;
}

export function checkAnswer(input, expected) {
  const got = normalizeDate(input);
  return got !== null && got === expected;
}
