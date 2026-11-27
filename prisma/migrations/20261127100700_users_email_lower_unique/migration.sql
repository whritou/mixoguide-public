-- DB-013: case-insensitive email uniqueness. Prisma cannot express expression
-- indexes, so this index is not in schema.prisma: if `prisma migrate dev` ever
-- generates a `DROP INDEX "users_email_lower_key"`, remove that line.
-- Fails if case-variant duplicate accounts already exist; resolve them first:
--   SELECT lower(email), count(*) FROM users GROUP BY 1 HAVING count(*) > 1;
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "users_email_lower_key" ON "users" (lower("email"));
