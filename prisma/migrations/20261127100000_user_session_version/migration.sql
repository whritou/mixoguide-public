-- Session revocation counter: bump to invalidate every session/token of a user.
ALTER TABLE "users" ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;
