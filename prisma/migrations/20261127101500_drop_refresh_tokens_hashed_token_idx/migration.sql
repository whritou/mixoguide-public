-- DB-015: exact duplicate of the unique index "refresh_tokens_hashed_token_key".
DROP INDEX CONCURRENTLY IF EXISTS "refresh_tokens_hashed_token_idx";
