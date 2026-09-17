-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BarToolType" AS ENUM ('bar', 'kitchen', 'glassware', 'other');

-- CreateEnum
CREATE TYPE "CocktailSource" AS ENUM ('custom', 'cocktaildb', 'ninjas');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "Technique" AS ENUM ('shaken', 'stirred', 'built', 'layered', 'blended', 'flamed', 'infused', 'clarified', 'muddled', 'smoked');

-- CreateEnum
CREATE TYPE "Flavor" AS ENUM ('sweet', 'sour', 'bitter', 'spicy', 'savory', 'fruity', 'herbal', 'smoky', 'floral', 'refreshing', 'creamy', 'citrus', 'nutty', 'earthy', 'vanilla', 'umami', 'minty', 'woody', 'salty');

-- CreateEnum
CREATE TYPE "Occasion" AS ENUM ('party', 'romantic', 'casual', 'formal', 'holiday', 'summer', 'winter', 'spring', 'fall', 'celebration', 'everyday', 'brunch', 'happy_hour', 'after_dinner', 'before_dinner', 'cocktail_hour', 'picnic', 'barbecue', 'beach', 'pool_party', 'game_night', 'movie_night', 'date_night', 'family_gathering', 'friends_gathering', 'wedding', 'birthday', 'anniversary', 'graduation', 'baby_shower', 'bridal_shower', 'housewarming', 'new_years_eve', 'valentines_day', 'halloween', 'thanksgiving', 'digestif', 'aperitif', 'date', 'mocktail_friendly', 'after_work', 'luxury');

-- CreateEnum
CREATE TYPE "MeasureUnit" AS ENUM ('cl', 'ml', 'oz', 'g', 'pcs', 'zest', 'slice', 'twist');

-- CreateEnum
CREATE TYPE "PlannedStatus" AS ENUM ('planned', 'done');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "ingredient_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ingredient_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_sub_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,

    CONSTRAINT "ingredient_sub_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "sub_type_id" TEXT,
    "description" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit" "MeasureUnit" NOT NULL DEFAULT 'oz',
    "is_alcoholic" BOOLEAN,
    "abv" DOUBLE PRECISION,
    "brand" TEXT,
    "image_url" TEXT,
    "color_gradient" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "glasses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "color_gradient" TEXT,

    CONSTRAINT "glasses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "color_gradient" TEXT,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bar_tools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "color_gradient" TEXT,
    "type" "BarToolType" NOT NULL DEFAULT 'other',
    "is_essential" BOOLEAN,

    CONSTRAINT "bar_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cocktails" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "full_description" TEXT,
    "instructions" TEXT[],
    "image_url" TEXT,
    "is_alcoholic" BOOLEAN,
    "main_alcohol_id" TEXT,
    "source" "CocktailSource" NOT NULL DEFAULT 'custom',
    "external_id" TEXT,
    "color_gradient" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'easy',
    "preparation_time" INTEGER,
    "technique" "Technique"[],
    "flavors" "Flavor"[],
    "occasions" "Occasion"[],
    "origin" TEXT,
    "glass_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cocktails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cocktail_ingredients" (
    "id" TEXT NOT NULL,
    "cocktail_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "unit" "MeasureUnit" NOT NULL DEFAULT 'oz',
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "substitutes" TEXT[],
    "subUnit" "MeasureUnit"[] DEFAULT ARRAY['oz']::"MeasureUnit"[],
    "subAmount" DOUBLE PRECISION[],
    "subShow" BOOLEAN[],

    CONSTRAINT "cocktail_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cocktail_bar_tools" (
    "cocktail_id" TEXT NOT NULL,
    "bar_tool_id" TEXT NOT NULL,

    CONSTRAINT "cocktail_bar_tools_pkey" PRIMARY KEY ("cocktail_id","bar_tool_id")
);

-- CreateTable
CREATE TABLE "cocktail_tags" (
    "cocktail_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "cocktail_tags_pkey" PRIMARY KEY ("cocktail_id","tag_id")
);

-- CreateTable
CREATE TABLE "user_favorite_cocktails" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cocktail_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_cocktails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_pantry_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_left" "MeasureUnit" NOT NULL DEFAULT 'cl',
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "expiration_date" TIMESTAMP(3),
    "is_essential" BOOLEAN NOT NULL DEFAULT false,
    "is_in_pantry" BOOLEAN NOT NULL DEFAULT true,
    "is_in_shopping_list" BOOLEAN NOT NULL DEFAULT false,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pantry_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_cocktails" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cocktail_id" TEXT NOT NULL,
    "status" "PlannedStatus" NOT NULL DEFAULT 'planned',
    "planned_for" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planned_cocktails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cocktail_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advices" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_types_name_key" ON "ingredient_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_sub_types_type_id_name_key" ON "ingredient_sub_types"("type_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_name_key" ON "ingredients"("name");

-- CreateIndex
CREATE INDEX "ingredients_type_id_idx" ON "ingredients"("type_id");

-- CreateIndex
CREATE INDEX "ingredients_sub_type_id_idx" ON "ingredients"("sub_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "glasses_name_key" ON "glasses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "bar_tools_name_key" ON "bar_tools"("name");

-- CreateIndex
CREATE UNIQUE INDEX "cocktails_name_key" ON "cocktails"("name");

-- CreateIndex
CREATE INDEX "cocktails_source_idx" ON "cocktails"("source");

-- CreateIndex
CREATE INDEX "cocktails_difficulty_idx" ON "cocktails"("difficulty");

-- CreateIndex
CREATE INDEX "cocktails_is_alcoholic_idx" ON "cocktails"("is_alcoholic");

-- CreateIndex
CREATE INDEX "cocktails_glass_id_idx" ON "cocktails"("glass_id");

-- CreateIndex
CREATE INDEX "cocktails_created_at_idx" ON "cocktails"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cocktail_ingredients_cocktail_id_ingredient_id_key" ON "cocktail_ingredients"("cocktail_id", "ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_cocktails_user_id_cocktail_id_key" ON "user_favorite_cocktails"("user_id", "cocktail_id");

-- CreateIndex
CREATE INDEX "user_pantry_items_user_id_idx" ON "user_pantry_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_pantry_items_user_id_ingredient_id_key" ON "user_pantry_items"("user_id", "ingredient_id");

-- CreateIndex
CREATE INDEX "planned_cocktails_user_id_idx" ON "planned_cocktails"("user_id");

-- CreateIndex
CREATE INDEX "planned_cocktails_status_idx" ON "planned_cocktails"("status");

-- CreateIndex
CREATE UNIQUE INDEX "planned_cocktails_user_id_cocktail_id_key" ON "planned_cocktails"("user_id", "cocktail_id");

-- CreateIndex
CREATE INDEX "ratings_cocktail_id_idx" ON "ratings"("cocktail_id");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_user_id_cocktail_id_key" ON "ratings"("user_id", "cocktail_id");

-- CreateIndex
CREATE INDEX "advices_author_id_idx" ON "advices"("author_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_sub_types" ADD CONSTRAINT "ingredient_sub_types_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "ingredient_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "ingredient_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_sub_type_id_fkey" FOREIGN KEY ("sub_type_id") REFERENCES "ingredient_sub_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktails" ADD CONSTRAINT "cocktails_glass_id_fkey" FOREIGN KEY ("glass_id") REFERENCES "glasses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktails" ADD CONSTRAINT "cocktails_main_alcohol_id_fkey" FOREIGN KEY ("main_alcohol_id") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktail_ingredients" ADD CONSTRAINT "cocktail_ingredients_cocktail_id_fkey" FOREIGN KEY ("cocktail_id") REFERENCES "cocktails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktail_ingredients" ADD CONSTRAINT "cocktail_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktail_bar_tools" ADD CONSTRAINT "cocktail_bar_tools_cocktail_id_fkey" FOREIGN KEY ("cocktail_id") REFERENCES "cocktails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktail_bar_tools" ADD CONSTRAINT "cocktail_bar_tools_bar_tool_id_fkey" FOREIGN KEY ("bar_tool_id") REFERENCES "bar_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktail_tags" ADD CONSTRAINT "cocktail_tags_cocktail_id_fkey" FOREIGN KEY ("cocktail_id") REFERENCES "cocktails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktail_tags" ADD CONSTRAINT "cocktail_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_cocktails" ADD CONSTRAINT "user_favorite_cocktails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_cocktails" ADD CONSTRAINT "user_favorite_cocktails_cocktail_id_fkey" FOREIGN KEY ("cocktail_id") REFERENCES "cocktails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_pantry_items" ADD CONSTRAINT "user_pantry_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_pantry_items" ADD CONSTRAINT "user_pantry_items_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_cocktails" ADD CONSTRAINT "planned_cocktails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_cocktails" ADD CONSTRAINT "planned_cocktails_cocktail_id_fkey" FOREIGN KEY ("cocktail_id") REFERENCES "cocktails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_cocktail_id_fkey" FOREIGN KEY ("cocktail_id") REFERENCES "cocktails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advices" ADD CONSTRAINT "advices_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
