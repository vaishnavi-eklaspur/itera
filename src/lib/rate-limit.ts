const hits = new Map<string, number[]>();

export function rateLimit(key: string, windowMs = 60_000, max = 5): boolean {
  const now = Date.now();
  const timestamps = hits.get(key)?.filter((t) => now - t < windowMs) ?? [];
  if (timestamps.length >= max) return false;
  timestamps.push(now);
  hits.set(key, timestamps);
  return true;
}
