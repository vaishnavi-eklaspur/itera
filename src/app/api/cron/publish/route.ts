import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const now = new Date();
  const due = await db.package.findMany({
    where: { scheduledAt: { lte: now }, status: { not: "PUBLISHED" } },
  });

  for (const pkg of due) {
    if (pkg.currentVersionId) {
      await db.package.update({
        where: { id: pkg.id },
        data: { status: "PUBLISHED", scheduledAt: null },
      });
    }
  }

  return NextResponse.json({ published: due.length });
}
