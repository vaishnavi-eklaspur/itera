import { db } from "@/lib/db";
import { Activity } from "lucide-react";
import { requireAdminRole } from "@/lib/admin-access";

export const instant = false;

export default async function ActivityPage() {
  await requireAdminRole("ADMIN");
  const logs = await db.activityLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-stone-900 mb-6">Activity Log</h1>
      <div className="bg-white rounded-xl border border-stone-200">
        {logs.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone-400">
            <Activity className="w-8 h-8 mx-auto mb-2 text-stone-300" />
            No activity yet
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {logs.map((log) => (
              <div key={log.id} className="px-6 py-3 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-forest-400 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-900">
                    <span className="font-medium">{log.user.name}</span>{" "}
                    <span className="text-stone-500">{log.action}</span>{" "}
                    <span className="font-medium">{log.entity}</span>
                    {log.details && <span className="text-stone-400"> — {log.details}</span>}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
