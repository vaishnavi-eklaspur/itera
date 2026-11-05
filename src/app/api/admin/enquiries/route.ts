import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const assignedTo = searchParams.get("assignedTo");
  const q = searchParams.get("q");

  const enquiries = await db.enquiry.findMany({
    where: {
      ...(status && status !== "all" && { status: status as "NEW" | "IN_PROGRESS" | "REPLIED" | "CLOSED" }),
      ...(assignedTo && { assignedToId: assignedTo }),
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { message: { contains: q, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      package: { include: { currentVersion: { select: { title: true } } } },
      assignedTo: { select: { id: true, name: true } },
      replies: { select: { sentAt: true }, take: 1, orderBy: { sentAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(enquiries);
}
