import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const pkg = await db.package.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      currentVersion: true,
      seasonalPrices: { where: { isActive: true }, orderBy: { pricePerPerson: "asc" } },
    },
  });

  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const response = NextResponse.json(pkg);
  response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return response;
}
