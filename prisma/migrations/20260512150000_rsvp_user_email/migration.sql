-- AlterTable: add user_id and email to collection_rsvps
ALTER TABLE "collection_rsvps" ADD COLUMN "user_id" TEXT;
ALTER TABLE "collection_rsvps" ADD COLUMN "email" VARCHAR(255);

-- AddForeignKey
ALTER TABLE "collection_rsvps" ADD CONSTRAINT "collection_rsvps_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "collection_rsvps_user_id_idx" ON "collection_rsvps"("user_id");
