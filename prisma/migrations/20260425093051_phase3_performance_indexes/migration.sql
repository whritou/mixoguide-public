-- CreateIndex
CREATE INDEX "cocktail_made_logs_user_id_made_at_idx" ON "cocktail_made_logs"("user_id", "made_at");

-- CreateIndex
CREATE INDEX "cocktails_main_alcohol_id_idx" ON "cocktails"("main_alcohol_id");

-- CreateIndex
CREATE INDEX "ingredients_type_id_sub_type_id_idx" ON "ingredients"("type_id", "sub_type_id");

-- CreateIndex
CREATE INDEX "ingredients_created_at_idx" ON "ingredients"("created_at");

-- CreateIndex
CREATE INDEX "planned_cocktails_user_id_planned_for_status_idx" ON "planned_cocktails"("user_id", "planned_for", "status");

-- CreateIndex
CREATE INDEX "ratings_cocktail_id_created_at_idx" ON "ratings"("cocktail_id", "created_at");

-- CreateIndex
CREATE INDEX "suggestions_status_created_at_idx" ON "suggestions"("status", "created_at");

-- CreateIndex
CREATE INDEX "user_pantry_items_user_id_is_in_pantry_idx" ON "user_pantry_items"("user_id", "is_in_pantry");

-- CreateIndex
CREATE INDEX "user_pantry_items_user_id_is_in_shopping_list_idx" ON "user_pantry_items"("user_id", "is_in_shopping_list");

-- CreateIndex
CREATE INDEX "user_pantry_items_user_id_expiration_date_idx" ON "user_pantry_items"("user_id", "expiration_date");
