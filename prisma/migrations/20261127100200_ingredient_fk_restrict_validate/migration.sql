-- DB-004: validate the FKs added NOT VALID (SHARE UPDATE EXCLUSIVE lock only).
ALTER TABLE "cocktail_ingredients" VALIDATE CONSTRAINT "cocktail_ingredients_ingredient_id_fkey";
ALTER TABLE "user_pantry_items" VALIDATE CONSTRAINT "user_pantry_items_ingredient_id_fkey";
