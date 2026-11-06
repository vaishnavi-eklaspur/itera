import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
