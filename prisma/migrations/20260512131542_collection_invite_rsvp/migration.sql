-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('going', 'maybe', 'not_going');

-- AlterTable
ALTER TABLE "planned_collections"
    ADD COLUMN "share_token"   TEXT    UNIQUE,
    ADD COLUMN "share_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "planned_collections_share_token_idx" ON "planned_collections"("share_token");

-- CreateTable
CREATE TABLE "collection_rsvps" (
    "id"            TEXT        NOT NULL,
    "collection_id" TEXT        NOT NULL,
    "name"          TEXT        NOT NULL,
    "status"        "RsvpStatus" NOT NULL,
    "guest_count"   INTEGER     NOT NULL DEFAULT 1,
    "note"          TEXT,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collection_rsvps_collection_id_idx" ON "collection_rsvps"("collection_id");

-- AddForeignKey
ALTER TABLE "collection_rsvps"
    ADD CONSTRAINT "collection_rsvps_collection_id_fkey"
    FOREIGN KEY ("collection_id") REFERENCES "planned_collections"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
