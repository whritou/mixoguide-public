/*
  Warnings:

  - You are about to drop the `cocktail_collection_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cocktail_collections` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "cocktail_collection_items" DROP CONSTRAINT "cocktail_collection_items_cocktail_id_fkey";

-- DropForeignKey
ALTER TABLE "cocktail_collection_items" DROP CONSTRAINT "cocktail_collection_items_collection_id_fkey";

-- DropForeignKey
ALTER TABLE "cocktail_collections" DROP CONSTRAINT "cocktail_collections_user_id_fkey";

-- DropTable
DROP TABLE "cocktail_collection_items";

-- DropTable
DROP TABLE "cocktail_collections";
