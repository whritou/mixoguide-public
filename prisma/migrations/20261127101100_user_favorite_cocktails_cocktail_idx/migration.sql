-- DB-007: favorites count per cocktail + cocktail delete cascade.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_favorite_cocktails_cocktail_id_idx" ON "user_favorite_cocktails"("cocktail_id");
