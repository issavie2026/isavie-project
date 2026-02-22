export function formatDateOnly(value, locale, options = {}) {
  if (!value) return '';
  const raw = typeof value === 'string' ? value : new Date(value).toISOString();
  const ymd = raw.slice(0, 10);
  const [year, month, day] = ymd.split('-').map((part) => Number(part));
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return utcDate.toLocaleDateString(locale, { timeZone: 'UTC', ...options });
}

