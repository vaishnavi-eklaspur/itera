export type GstBreakdown = {
  subtotal: number;
  gstAmount: number;
  total: number;
};

export function calculateGst(
  pricePerPerson: number,
  travellers: number,
  gstRate: number,
  gstInclusive: boolean,
): GstBreakdown {
  const enteredTotal = Math.round(pricePerPerson * travellers);
  const rate = gstRate / 100;

  if (gstInclusive) {
    const subtotal = Math.round(enteredTotal / (1 + rate));
    return {
      subtotal,
      gstAmount: enteredTotal - subtotal,
      total: enteredTotal,
    };
  }

  const gstAmount = Math.round(enteredTotal * rate);
  return {
    subtotal: enteredTotal,
    gstAmount,
    total: enteredTotal + gstAmount,
  };
}
