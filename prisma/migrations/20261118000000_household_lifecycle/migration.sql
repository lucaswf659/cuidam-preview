CREATE TYPE "HouseholdStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "Household"
ADD COLUMN "status" "HouseholdStatus" NOT NULL DEFAULT 'ACTIVE';
