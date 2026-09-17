-- CreateTable
CREATE TABLE "mobile_oauth_exchange_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "hashed_code" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "code_challenge" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobile_oauth_exchange_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mobile_oauth_exchange_codes_hashed_code_key" ON "mobile_oauth_exchange_codes"("hashed_code");

-- CreateIndex
CREATE INDEX "mobile_oauth_exchange_codes_user_id_idx" ON "mobile_oauth_exchange_codes"("user_id");

-- CreateIndex
CREATE INDEX "mobile_oauth_exchange_codes_hashed_code_idx" ON "mobile_oauth_exchange_codes"("hashed_code");

-- CreateIndex
CREATE INDEX "mobile_oauth_exchange_codes_device_id_idx" ON "mobile_oauth_exchange_codes"("device_id");

-- CreateIndex
CREATE INDEX "mobile_oauth_exchange_codes_expires_at_idx" ON "mobile_oauth_exchange_codes"("expires_at");

-- AddForeignKey
ALTER TABLE "mobile_oauth_exchange_codes" ADD CONSTRAINT "mobile_oauth_exchange_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
