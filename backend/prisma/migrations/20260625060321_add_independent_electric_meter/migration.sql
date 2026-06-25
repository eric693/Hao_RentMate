-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "electricLastReading" DECIMAL(10,2),
ADD COLUMN     "electricUnitPrice" DECIMAL(8,2),
ADD COLUMN     "hasElectricMeter" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UtilityAllocation" ADD COLUMN     "currReading" DECIMAL(10,2),
ADD COLUMN     "prevReading" DECIMAL(10,2),
ADD COLUMN     "unitPrice" DECIMAL(8,2);

