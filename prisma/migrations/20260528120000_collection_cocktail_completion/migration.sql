-- Allow event cocktails to be completed one by one.
ALTER TABLE "planned_collection_cocktails"
ADD COLUMN "status" "PlannedStatus" NOT NULL DEFAULT 'planned',
ADD COLUMN "completed_at" TIMESTAMP(3);
