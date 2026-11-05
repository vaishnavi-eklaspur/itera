import { db } from "./db";

export async function logActivity(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: string
) {
  await db.activityLog.create({
    data: { userId, action, entity, entityId, details },
  });
}
