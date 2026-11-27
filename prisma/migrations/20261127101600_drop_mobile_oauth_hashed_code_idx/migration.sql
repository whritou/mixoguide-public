-- DB-015: exact duplicate of the unique index "mobile_oauth_exchange_codes_hashed_code_key".
DROP INDEX CONCURRENTLY IF EXISTS "mobile_oauth_exchange_codes_hashed_code_idx";
