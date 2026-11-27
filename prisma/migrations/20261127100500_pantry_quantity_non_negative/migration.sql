-- DB-013: pantry quantities can never be negative.
-- Clamp legacy negative values first, then add the CHECKs NOT VALID.
UPDATE "user_pantry_items" SET "quantity" = 0 WHERE "quantity" < 0;
UPDATE "user_pantry_items" SET "shopping_quantity" = 0 WHERE "shopping_quantity" < 0;

ALTER TABLE "user_pantry_items"
    ADD CONSTRAINT "user_pantry_items_quantity_non_negative_check" CHECK ("quantity" >= 0) NOT VALID;
ALTER TABLE "user_pantry_items"
    ADD CONSTRAINT "user_pantry_items_shopping_quantity_non_negative_check" CHECK ("shopping_quantity" >= 0) NOT VALID;
