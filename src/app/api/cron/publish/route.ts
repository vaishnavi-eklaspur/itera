import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publishPackageNow } from "@/lib/package-publishing";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await db.package.findMany({
    where: { scheduledAt: { lte: now } },
    select: { id: true },
  });

  let published = 0;
  for (const pkg of due) {
    if (await publishPackageNow(pkg.id, now)) published++;
  }

  return NextResponse.json({ published });
}
