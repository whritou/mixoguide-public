-- Preserve user made-log stats after a cocktail recipe is deleted.
ALTER TABLE "cocktail_made_logs" ADD COLUMN "archived_cocktail" JSONB;

UPDATE "cocktail_made_logs" AS log
SET "archived_cocktail" = jsonb_build_object(
    'id', cocktail."id",
    'name', cocktail."name",
    'imageUrl', cocktail."image_url",
    'difficulty', cocktail."difficulty"::text
)
FROM "cocktails" AS cocktail
WHERE log."cocktail_id" = cocktail."id"
  AND log."archived_cocktail" IS NULL;

ALTER TABLE "cocktail_made_logs" DROP CONSTRAINT "cocktail_made_logs_cocktail_id_fkey";
ALTER TABLE "cocktail_made_logs" ALTER COLUMN "cocktail_id" DROP NOT NULL;

ALTER TABLE "cocktail_made_logs"
ADD CONSTRAINT "cocktail_made_logs_cocktail_id_fkey"
FOREIGN KEY ("cocktail_id") REFERENCES "cocktails"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
