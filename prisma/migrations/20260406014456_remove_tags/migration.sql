/*
  Warnings:

  - You are about to drop the `cocktail_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tags` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "cocktail_tags" DROP CONSTRAINT "cocktail_tags_cocktail_id_fkey";

-- DropForeignKey
ALTER TABLE "cocktail_tags" DROP CONSTRAINT "cocktail_tags_tag_id_fkey";

-- DropTable
DROP TABLE "cocktail_tags";

-- DropTable
DROP TABLE "tags";
