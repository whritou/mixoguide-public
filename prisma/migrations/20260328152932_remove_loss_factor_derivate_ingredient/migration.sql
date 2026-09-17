/*
  Warnings:

  - You are about to drop the column `loss_factor` on the `ingredient_derivatives` table. All the data in the column will be lost.
  - You are about to drop the column `review` on the `ratings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ingredient_derivatives" DROP COLUMN "loss_factor";

-- AlterTable
ALTER TABLE "ratings" DROP COLUMN "review";
