import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { authorizeRole } from "@/lib/roles";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN", "CONSULTANT");
  if (denied) return denied;

  const { id } = await params;
  const base = process.env.NEXTAUTH_URL || "http://localhost:3001";

  const res = await fetch(`${base}/api/internal/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
    },
    body: JSON.stringify({ enquiryId: id }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
