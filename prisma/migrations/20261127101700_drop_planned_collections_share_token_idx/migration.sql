-- DB-015: exact duplicate of the unique constraint on planned_collections(share_token).
DROP INDEX CONCURRENTLY IF EXISTS "planned_collections_share_token_idx";
