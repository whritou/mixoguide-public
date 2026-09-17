-- CreateTable
CREATE TABLE "planned_collections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "planned_for" TIMESTAMP(3) NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "occasions" "Occasion"[],
    "status" "PlannedStatus" NOT NULL DEFAULT 'planned',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planned_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_collection_cocktails" (
    "id" TEXT NOT NULL,
    "planned_collection_id" TEXT NOT NULL,
    "cocktail_id" TEXT NOT NULL,

    CONSTRAINT "planned_collection_cocktails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planned_collection_cocktails_planned_collection_id_cocktail_key" ON "planned_collection_cocktails"("planned_collection_id", "cocktail_id");

-- AddForeignKey
ALTER TABLE "planned_collections" ADD CONSTRAINT "planned_collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_collection_cocktails" ADD CONSTRAINT "planned_collection_cocktails_planned_collection_id_fkey" FOREIGN KEY ("planned_collection_id") REFERENCES "planned_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_collection_cocktails" ADD CONSTRAINT "planned_collection_cocktails_cocktail_id_fkey" FOREIGN KEY ("cocktail_id") REFERENCES "cocktails"("id") ON DELETE CASCADE ON UPDATE CASCADE;
