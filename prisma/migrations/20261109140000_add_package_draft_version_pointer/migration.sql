ALTER TABLE "Package"
ADD COLUMN "draftVersionId" TEXT;

UPDATE "Package" AS package
SET "draftVersionId" = (
  SELECT version.id
  FROM "PackageVersion" AS version
  WHERE version."packageId" = package.id
  ORDER BY version."versionNumber" DESC
  LIMIT 1
)
WHERE package."scheduledAt" IS NOT NULL;

ALTER TABLE "Package"
ADD CONSTRAINT "Package_draftVersionId_fkey"
FOREIGN KEY ("draftVersionId") REFERENCES "PackageVersion"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
