/*
  Warnings:

  - The values [vanilla,umami,minty,woody,salty] on the enum `Flavor` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Flavor_new" AS ENUM ('sweet', 'sour', 'bitter', 'spicy', 'savory', 'fruity', 'herbal', 'smoky', 'floral', 'refreshing', 'creamy', 'citrus', 'nutty', 'earthy', 'bubbly', 'tropical', 'dry', 'rich', 'strong', 'warm', 'coffee', 'light');
ALTER TABLE "cocktails" ALTER COLUMN "flavors" TYPE "Flavor_new"[] USING ("flavors"::text::"Flavor_new"[]);
ALTER TYPE "Flavor" RENAME TO "Flavor_old";
ALTER TYPE "Flavor_new" RENAME TO "Flavor";
DROP TYPE "public"."Flavor_old";
COMMIT;
