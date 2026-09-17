-- CreateTable
CREATE TABLE "ingredient_barcodes" (
    "barcode" TEXT NOT NULL,
    "ingredient_id" TEXT,
    "product_name" TEXT,
    "brand" TEXT,
    "looked_up_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_barcodes_pkey" PRIMARY KEY ("barcode")
);

-- CreateIndex
CREATE INDEX "ingredient_barcodes_ingredient_id_idx" ON "ingredient_barcodes"("ingredient_id");

-- AddForeignKey
ALTER TABLE "ingredient_barcodes" ADD CONSTRAINT "ingredient_barcodes_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
