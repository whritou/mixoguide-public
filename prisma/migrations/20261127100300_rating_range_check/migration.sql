-- DB-006: enforce the 1..5 rating range in the database.
-- Clamp any legacy out-of-range values first so the validation step succeeds.
UPDATE "ratings" SET "rating" = LEAST(GREATEST("rating", 1), 5) WHERE "rating" < 1 OR "rating" > 5;

ALTER TABLE "ratings"
    ADD CONSTRAINT "ratings_rating_range_check" CHECK ("rating" BETWEEN 1 AND 5) NOT VALID;
