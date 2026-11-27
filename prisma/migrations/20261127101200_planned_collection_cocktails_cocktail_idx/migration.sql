-- DB-007: cocktail delete cascade into planned collections.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "planned_collection_cocktails_cocktail_id_idx" ON "planned_collection_cocktails"("cocktail_id");
