ALTER TABLE "PackageVersion"
ADD COLUMN "hotelNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "photoAltTexts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "seasonalPrices" JSONB;

UPDATE "PackageVersion" AS version
SET "seasonalPrices" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'seasonName', price."seasonName",
        'seasonStartMonth', price."seasonStartMonth",
        'seasonEndMonth', price."seasonEndMonth",
        'pricePerPerson', price."pricePerPerson",
        'basis', price."basis",
        'gstInclusive', price."gstInclusive"
      )
      ORDER BY price.id
    )
    FROM "SeasonalPrice" AS price
    WHERE price."packageId" = version."packageId"
      AND price."isActive" = true
  ),
  '[]'::jsonb
)
FROM "Package" AS package
WHERE package."currentVersionId" = version.id;
