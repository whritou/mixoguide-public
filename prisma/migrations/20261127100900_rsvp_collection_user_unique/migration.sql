-- DB-008: one RSVP per logged-in user per collection.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "collection_rsvps_collection_id_user_id_key" ON "collection_rsvps"("collection_id", "user_id");
