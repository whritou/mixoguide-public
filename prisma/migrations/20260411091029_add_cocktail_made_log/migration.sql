-- CreateTable
CREATE TABLE "cocktail_made_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cocktail_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "made_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "cocktail_made_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cocktail_made_logs_user_id_idx" ON "cocktail_made_logs"("user_id");

-- CreateIndex
CREATE INDEX "cocktail_made_logs_cocktail_id_idx" ON "cocktail_made_logs"("cocktail_id");

-- CreateIndex
CREATE INDEX "cocktail_made_logs_made_at_idx" ON "cocktail_made_logs"("made_at");

-- AddForeignKey
ALTER TABLE "cocktail_made_logs" ADD CONSTRAINT "cocktail_made_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktail_made_logs" ADD CONSTRAINT "cocktail_made_logs_cocktail_id_fkey" FOREIGN KEY ("cocktail_id") REFERENCES "cocktails"("id") ON DELETE CASCADE ON UPDATE CASCADE;
