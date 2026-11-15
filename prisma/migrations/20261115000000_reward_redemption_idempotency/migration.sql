ALTER TABLE "RewardRedemption" ADD COLUMN "requestKey" TEXT;
CREATE UNIQUE INDEX "RewardRedemption_requestKey_key" ON "RewardRedemption"("requestKey");

