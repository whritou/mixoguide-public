-- CreateTable
CREATE TABLE "ingredient_derivatives" (
    "id" TEXT NOT NULL,
    "base_ingredient_id" TEXT NOT NULL,
    "derived_id" TEXT NOT NULL,
    "yield_amount" DOUBLE PRECISION NOT NULL,
    "yield_unit" "MeasureUnit" NOT NULL,
    "requires_tool" TEXT,
    "loss_factor" DOUBLE PRECISION,

    CONSTRAINT "ingredient_derivatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ingredient_derivatives_derived_id_idx" ON "ingredient_derivatives"("derived_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_derivatives_base_ingredient_id_derived_id_key" ON "ingredient_derivatives"("base_ingredient_id", "derived_id");

-- AddForeignKey
ALTER TABLE "ingredient_derivatives" ADD CONSTRAINT "ingredient_derivatives_base_ingredient_id_fkey" FOREIGN KEY ("base_ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_derivatives" ADD CONSTRAINT "ingredient_derivatives_derived_id_fkey" FOREIGN KEY ("derived_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
