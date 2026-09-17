-- AddColumn: precomputed rating cache on cocktails table
-- Updated transactionally on every Rating create/update/delete
ALTER TABLE "cocktails" ADD COLUMN "avg_rating"   DOUBLE PRECISION;
ALTER TABLE "cocktails" ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0;

-- Back-fill existing data from the ratings table
UPDATE "cocktails" c
SET
    "rating_count" = sub.cnt,
    "avg_rating"   = sub.avg
FROM (
    SELECT
        "cocktail_id",
        COUNT(*)::INT           AS cnt,
        AVG("rating")::FLOAT    AS avg
    FROM "ratings"
    GROUP BY "cocktail_id"
) sub
WHERE c."id" = sub."cocktail_id";
