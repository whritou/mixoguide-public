/*
  Warnings:

  - You are about to drop the column `color_gradient` on the `bar_tools` table. All the data in the column will be lost.
  - You are about to drop the column `color_gradient` on the `glasses` table. All the data in the column will be lost.
  - You are about to drop the column `color_gradient` on the `ingredients` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `ingredients` table. All the data in the column will be lost.
  - You are about to drop the column `color_gradient` on the `tags` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `tags` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `tags` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bar_tools" DROP COLUMN "color_gradient";

-- AlterTable
ALTER TABLE "glasses" DROP COLUMN "color_gradient";

-- AlterTable
ALTER TABLE "ingredients" DROP COLUMN "color_gradient",
DROP COLUMN "quantity";

-- AlterTable
ALTER TABLE "tags" DROP COLUMN "color_gradient",
DROP COLUMN "description",
DROP COLUMN "image_url";
