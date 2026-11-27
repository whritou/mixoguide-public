-- DB-007: per-user collection list ordered by planned_for.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "planned_collections_user_id_planned_for_idx" ON "planned_collections"("user_id", "planned_for");
