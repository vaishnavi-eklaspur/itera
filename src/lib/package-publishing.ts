import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { seasonalPricesSchema } from "@/lib/validations";

export function parseScheduledAt(value: unknown): Date | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const scheduledAt = new Date(value);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    return undefined;
  }
  return scheduledAt;
}

export async function publishPackageNow(packageId: string, dueAt?: Date) {
  const published = await db.$transaction(async (tx) => {
    const pkg = await tx.package.findUnique({
      where: { id: packageId },
      select: {
        id: true,
        slug: true,
        currentVersionId: true,
        scheduledAt: true,
        versions: { orderBy: { versionNumber: "desc" }, take: 1, select: { id: true } },
        seasonalPrices: true,
      },
    });

    if (!pkg || (dueAt && (!pkg.scheduledAt || pkg.scheduledAt > dueAt))) return null;

    const versionId = pkg.scheduledAt
      ? pkg.versions[0]?.id ?? pkg.currentVersionId
      : pkg.currentVersionId;
    if (!versionId) return null;

    const stagedPrices = pkg.scheduledAt
      ? seasonalPricesSchema.safeParse(pkg.seasonalPrices.filter((price) => !price.isActive))
      : null;
    if (stagedPrices && !stagedPrices.success) {
      throw new Error(`Scheduled prices for package ${packageId} are invalid`);
    }

    const claimed = await tx.package.updateMany({
      where: {
        id: pkg.id,
        scheduledAt: pkg.scheduledAt,
      },
      data: {
        currentVersionId: versionId,
        status: "PUBLISHED",
        scheduledAt: null,
      },
    });

    if (claimed.count !== 1) return null;

    if (stagedPrices?.success) {
      const stagedPriceIds = pkg.seasonalPrices.filter((price) => !price.isActive).map((price) => price.id);
      if (stagedPriceIds.length > 0) {
        await tx.seasonalPrice.deleteMany({ where: { packageId: pkg.id, isActive: true } });
        await tx.seasonalPrice.updateMany({
          where: { id: { in: stagedPriceIds } },
          data: { isActive: true },
        });
      }
    }

    return { slug: pkg.slug };
  });

  if (!published) return null;

  revalidatePath("/");
  revalidatePath("/packages");
  revalidatePath(`/packages/${published.slug}`);
  return published;
}
