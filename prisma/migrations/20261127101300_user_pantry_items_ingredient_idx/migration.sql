-- DB-007: ingredient usage checks / FK RESTRICT lookups on pantry rows.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_pantry_items_ingredient_id_idx" ON "user_pantry_items"("ingredient_id");
