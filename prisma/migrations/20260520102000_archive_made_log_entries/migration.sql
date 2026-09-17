-- Hide made-log entries from the user's Made list without removing them from stats.
ALTER TABLE "cocktail_made_logs"
ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;

UPDATE "cocktail_made_logs"
SET "archived" = true,
    "note" = NULLIF(regexp_replace("note", '^MIXOGUIDE_ARCHIVED_MADE_LOG:', ''), '')
WHERE left("note", length('MIXOGUIDE_ARCHIVED_MADE_LOG:')) = 'MIXOGUIDE_ARCHIVED_MADE_LOG:';

UPDATE "cocktail_made_logs"
SET "archived" = true,
    "note" = NULLIF(regexp_replace("note", '^__MIXOGUIDE_ARCHIVED_MADE_LOG__', ''), '')
WHERE left("note", length('__MIXOGUIDE_ARCHIVED_MADE_LOG__')) = '__MIXOGUIDE_ARCHIVED_MADE_LOG__';

CREATE INDEX IF NOT EXISTS "cocktail_made_logs_user_id_archived_made_at_idx"
ON "cocktail_made_logs"("user_id", "archived", "made_at");
