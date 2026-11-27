-- DB-008: keep only the most recent RSVP per (collection, logged-in user) before
-- adding the unique index in the next migration. Guest RSVPs (user_id NULL) are kept.
DELETE FROM "collection_rsvps" r
USING "collection_rsvps" newer
WHERE r."user_id" IS NOT NULL
  AND newer."collection_id" = r."collection_id"
  AND newer."user_id" = r."user_id"
  AND (newer."created_at", newer."id") > (r."created_at", r."id");
