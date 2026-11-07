import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { timeAgo, responseTimeBadge } from "@/lib/utils";
import Link from "next/link";

export const instant = false;

export default async function MyEnquiriesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const enquiries = await db.enquiry.findMany({
    where: { email: session.user.email! },
    include: {
      package: { include: { currentVersion: { select: { title: true } } } },
      replies: { orderBy: { sentAt: "asc" }, take: 1, select: { sentAt: true, content: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-display font-semibold text-stone-900 mb-6">My Enquiries</h1>

        {enquiries.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-stone-500">You haven&apos;t sent any enquiries yet.</p>
            <Link href="/packages" className="mt-3 inline-block text-sm text-forest-600 hover:text-forest-700 font-medium">
              Browse Packages
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enquiries.map((e) => {
              const firstReplyAt = e.replies[0]?.sentAt ?? null;
              const badge = responseTimeBadge(e.createdAt, firstReplyAt);
              return (
                <div key={e.id} className="bg-white rounded-xl border border-stone-200 p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      {e.package?.currentVersion && (
                        <p className="text-sm font-medium text-forest-700">{e.package.currentVersion.title}</p>
                      )}
                      <p className="text-xs text-stone-400">{timeAgo(e.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        e.status === "NEW" ? "bg-amber-100 text-amber-700" :
                        e.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                        e.status === "REPLIED" ? "bg-green-100 text-green-700" :
                        "bg-stone-100 text-stone-500"
                      }`}>
                        {e.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 line-clamp-2">{e.message}</p>
                  {e.replies[0] && (
                    <div className="mt-3 bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-600 mb-1">Reply from team</p>
                      <p className="text-sm text-green-700 line-clamp-3">{e.replies[0].content}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
