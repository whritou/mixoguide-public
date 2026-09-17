-- Step 1: Add shopping_quantity column
ALTER TABLE "user_pantry_items" ADD COLUMN "shopping_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Step 2: For shopping-list-only rows the old quantity field WAS the shopping quantity → migrate it
UPDATE "user_pantry_items"
SET "shopping_quantity" = "quantity", "quantity" = 0
WHERE "is_in_shopping_list" = true AND "is_in_pantry" = false;

-- Step 3: Remove duplicate rows created while the unique constraint was absent.
--         Keep: pantry row over shopping-only row; then most recently added.
WITH ranked AS (
    SELECT "id",
           ROW_NUMBER() OVER (
               PARTITION BY "user_id", "ingredient_id"
               ORDER BY "is_in_pantry" DESC, "added_at" DESC
           ) AS rn
    FROM "user_pantry_items"
)
DELETE FROM "user_pantry_items"
WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

-- Step 4: Drop the non-unique composite index added in the previous migration
DROP INDEX IF EXISTS "user_pantry_items_user_id_ingredient_id_idx";

-- Step 5: Restore the unique constraint
CREATE UNIQUE INDEX "user_pantry_items_user_id_ingredient_id_key"
    ON "user_pantry_items"("user_id", "ingredient_id");
