-- Composite index for the "expiring soon" filter on the pantry.
-- Matches: WHERE user_id = ? AND is_in_pantry = true AND expiration_date BETWEEN ? AND ?
-- Lets PostgreSQL use a single index instead of bitmap-OR-ing two partial ones.

CREATE INDEX IF NOT EXISTS "user_pantry_items_user_id_is_in_pantry_expiration_date_idx"
    ON "user_pantry_items" ("user_id", "is_in_pantry", "expiration_date");
