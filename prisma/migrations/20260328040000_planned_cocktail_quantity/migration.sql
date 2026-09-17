-- AlterTable
ALTER TABLE "planned_cocktails" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "planned_cocktails" ADD COLUMN "completed_at" TIMESTAMP(3);
