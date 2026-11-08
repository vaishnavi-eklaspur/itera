import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [total, byStatus, enquiries, recentEnquiries, admins] = await Promise.all([
    db.enquiry.count(),
    db.enquiry.groupBy({ by: ["status"], _count: true }),
    db.enquiry.findMany({
      select: {
        createdAt: true,
        status: true,
        assignedToId: true,
        replies: { select: { sentAt: true }, take: 1, orderBy: { sentAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.enquiry.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { createdAt: true },
    }),
    db.user.findMany({
      where: { role: { in: ["ADMIN", "CONSULTANT"] } },
      select: { id: true, name: true },
    }),
  ]);

  // Response times for enquiries that have replies
  const responseTimes = enquiries
    .filter((e) => e.replies.length > 0)
    .map((e) => ({
      minutes: Math.floor((e.replies[0].sentAt.getTime() - e.createdAt.getTime()) / 60000),
      assignedToId: e.assignedToId,
    }));

  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((sum, r) => sum + r.minutes, 0) / responseTimes.length)
    : 0;

  const repliedWithinHour = responseTimes.filter((r) => r.minutes <= 60).length;
  const slaRate = responseTimes.length > 0
    ? Math.round((repliedWithinHour / responseTimes.length) * 100)
    : 0;

  // Per-consultant stats
  const consultantStats = admins.map((admin) => {
    const assigned = enquiries.filter((e) => e.assignedToId === admin.id);
    const replied = assigned.filter((e) => e.replies.length > 0);
    const times = responseTimes.filter((r) => r.assignedToId === admin.id);
    return {
      id: admin.id,
      name: admin.name,
      assigned: assigned.length,
      replied: replied.length,
      avgResponseTime: times.length > 0
        ? Math.round(times.reduce((s, r) => s + r.minutes, 0) / times.length)
        : 0,
    };
  });

  // Daily enquiry counts (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dailyEnquiries: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const day = new Date();
    day.setDate(day.getDate() - (29 - i));
    dailyEnquiries[day.toISOString().split("T")[0]] = 0;
  }
  recentEnquiries.forEach((e) => {
    const day = e.createdAt.toISOString().split("T")[0];
    if (day in dailyEnquiries) dailyEnquiries[day]++;
  });

  const responseTrend: { date: string; averageMinutes: number | null }[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const key = date.toISOString().split("T")[0];
    const values = enquiries
      .filter((enquiry) => enquiry.createdAt.toISOString().split("T")[0] === key && enquiry.replies.length > 0)
      .map((enquiry) => Math.floor((enquiry.replies[0].sentAt.getTime() - enquiry.createdAt.getTime()) / 60000));
    responseTrend.push({
      date: key,
      averageMinutes: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null,
    });
  }

  // Top packages by enquiry count
  const packageCounts = await db.enquiry.groupBy({
    by: ["packageId"],
    _count: true,
    where: { packageId: { not: null } },
    orderBy: { _count: { packageId: "desc" } },
    take: 5,
  });

  const topPackageIds = packageCounts.map((p) => p.packageId).filter(Boolean) as string[];
  const topPackages = await db.package.findMany({
    where: { id: { in: topPackageIds } },
    include: { currentVersion: { select: { title: true } } },
  });

  const topPackageData = packageCounts.map((p) => ({
    title: topPackages.find((tp) => tp.id === p.packageId)?.currentVersion?.title || "Unknown",
    count: p._count,
  }));

  return NextResponse.json({
    total,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    avgResponseTime,
    slaRate,
    consultantStats,
    dailyEnquiries,
    responseTrend,
    topPackages: topPackageData,
  });
}
