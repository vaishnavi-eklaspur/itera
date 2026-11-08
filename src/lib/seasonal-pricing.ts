export type SeasonalPriceLike = {
  pricePerPerson: number;
  seasonStartMonth: number;
  seasonEndMonth: number;
  seasonName?: string;
  basis?: string;
  gstInclusive?: boolean;
};

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9, october: 10,
  oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

export function getTravelMonth(value: string | null | undefined): number | null {
  if (!value) return null;
  const isoDate = value.match(/\b\d{4}-(\d{2})-\d{2}\b/);
  if (isoDate) return Number(isoDate[1]);
  const numericDate = value.match(/\b(\d{1,2})[/-]\d{1,2}[/-]\d{2,4}\b/);
  if (numericDate) return Number(numericDate[1]) <= 12 ? Number(numericDate[1]) : null;
  const month = Object.entries(MONTHS).find(([name]) => new RegExp(`\\b${name}\\b`, "i").test(value));
  return month ? month[1] : null;
}

function includesMonth(start: number, end: number, month: number) {
  return start <= end ? month >= start && month <= end : month >= start || month <= end;
}

export function selectSeasonalPrice<T extends SeasonalPriceLike>(
  prices: T[],
  travelDate?: string | null,
): T | null {
  if (prices.length === 0) return null;
  const month = getTravelMonth(travelDate);
  if (!month) return prices[0];
  return prices.find((price) => includesMonth(price.seasonStartMonth, price.seasonEndMonth, month)) ?? prices[0];
}
