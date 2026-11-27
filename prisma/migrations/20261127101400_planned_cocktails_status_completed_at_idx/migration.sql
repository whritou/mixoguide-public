-- DB-007: admin "recent completions" (status = 'done' ORDER BY completed_at DESC).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "planned_cocktails_status_completed_at_idx" ON "planned_cocktails"("status", "completed_at");
