-- DropIndex: allow same ingredient in both pantry and shopping list
DROP INDEX "user_pantry_items_user_id_ingredient_id_key";

-- CreateIndex: non-unique index for lookup performance
CREATE INDEX "user_pantry_items_user_id_ingredient_id_idx" ON "user_pantry_items"("user_id", "ingredient_id");
