import { NextResponse } from "next/server";

export function authorizeRole(role: string | undefined, ...allowed: string[]): NextResponse | null {
  if (!allowed.includes(role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
