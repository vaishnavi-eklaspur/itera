import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function getSeasonForMonth(month: number, prices: { seasonStartMonth: number; seasonEndMonth: number; seasonName: string; pricePerPerson: number }[]) {
  return prices.find((p) => {
    if (p.seasonStartMonth <= p.seasonEndMonth) {
      return month >= p.seasonStartMonth && month <= p.seasonEndMonth;
    }
    return month >= p.seasonStartMonth || month <= p.seasonEndMonth;
  });
}

export function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export function responseTimeBadge(createdAt: Date, repliedAt?: Date | null): { label: string; color: "green" | "amber" | "red" | "grey"; className: string } {
  if (repliedAt) {
    const diffMin = Math.floor((repliedAt.getTime() - createdAt.getTime()) / 60000);
    return { label: `Replied in ${diffMin}m`, color: "grey", className: "bg-stone-100 text-stone-500" };
  }
  const diffMin = Math.floor((Date.now() - createdAt.getTime()) / 60000);
  if (diffMin < 30) return { label: `Waiting ${diffMin}m`, color: "green", className: "bg-green-100 text-green-700" };
  if (diffMin < 60) return { label: `Waiting ${diffMin}m`, color: "amber", className: "bg-amber-100 text-amber-700" };
  return { label: `Waiting ${diffMin}m`, color: "red", className: "bg-red-100 text-red-700" };
}
