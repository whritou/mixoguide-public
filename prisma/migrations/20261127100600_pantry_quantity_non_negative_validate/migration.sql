-- DB-013: validate the pantry quantity CHECKs added NOT VALID.
ALTER TABLE "user_pantry_items" VALIDATE CONSTRAINT "user_pantry_items_quantity_non_negative_check";
ALTER TABLE "user_pantry_items" VALIDATE CONSTRAINT "user_pantry_items_shopping_quantity_non_negative_check";
