export type EnquiryDateRange = {
  from?: Date;
  through?: Date;
  error?: string;
};

function parseDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function parseEnquiryDateRange(fromValue?: string, throughValue?: string): EnquiryDateRange {
  const from = parseDate(fromValue);
  const through = parseDate(throughValue);

  if (fromValue && !from) return { error: "Enter a valid start date." };
  if (throughValue && !through) return { error: "Enter a valid end date." };
  if (from && through && from > through) {
    return { error: "The start date must be on or before the end date." };
  }

  if (through) through.setUTCDate(through.getUTCDate() + 1);
  return { ...(from ? { from } : {}), ...(through ? { through } : {}) };
}
