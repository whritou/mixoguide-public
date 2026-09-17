/*
  Warnings:

  - You are about to drop the `advices` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "advices" DROP CONSTRAINT "advices_author_id_fkey";

-- DropTable
DROP TABLE "advices";

-- CreateTable
CREATE TABLE "cocktail_collections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "occasions" "Occasion"[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cocktail_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cocktail_collection_items" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "cocktail_id" TEXT NOT NULL,

    CONSTRAINT "cocktail_collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cocktail_collections_user_id_key" ON "cocktail_collections"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cocktail_collection_items_collection_id_cocktail_id_key" ON "cocktail_collection_items"("collection_id", "cocktail_id");

-- AddForeignKey
ALTER TABLE "cocktail_collections" ADD CONSTRAINT "cocktail_collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktail_collection_items" ADD CONSTRAINT "cocktail_collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "cocktail_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktail_collection_items" ADD CONSTRAINT "cocktail_collection_items_cocktail_id_fkey" FOREIGN KEY ("cocktail_id") REFERENCES "cocktails"("id") ON DELETE CASCADE ON UPDATE CASCADE;
