-- DB-006: validate the rating range CHECK added NOT VALID.
ALTER TABLE "ratings" VALIDATE CONSTRAINT "ratings_rating_range_check";
