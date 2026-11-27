-- DB-004: deleting an ingredient must not cascade into recipes and pantries.
-- Re-create the FKs as ON DELETE NO ACTION. NOT VALID avoids a full scan while
-- holding the lock; the constraints are validated in the next migration.
ALTER TABLE "cocktail_ingredients" DROP CONSTRAINT "cocktail_ingredients_ingredient_id_fkey";
ALTER TABLE "cocktail_ingredients"
    ADD CONSTRAINT "cocktail_ingredients_ingredient_id_fkey"
    FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id")
    ON DELETE NO ACTION ON UPDATE CASCADE NOT VALID;

ALTER TABLE "user_pantry_items" DROP CONSTRAINT "user_pantry_items_ingredient_id_fkey";
ALTER TABLE "user_pantry_items"
    ADD CONSTRAINT "user_pantry_items_ingredient_id_fkey"
    FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id")
    ON DELETE NO ACTION ON UPDATE CASCADE NOT VALID;
