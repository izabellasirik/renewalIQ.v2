-- AlterTable
ALTER TABLE "File" ADD COLUMN     "marketSubmissionId" TEXT;

-- AlterTable
ALTER TABLE "FollowUp" ADD COLUMN     "marketSubmissionId" TEXT;

-- CreateTable
CREATE TABLE "MarketSubmission" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "carrierName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "submittedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Not Contacted',
    "notes" TEXT,
    "requestedInfo" TEXT,
    "premium" DOUBLE PRECISION,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketSubmission_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_marketSubmissionId_fkey" FOREIGN KEY ("marketSubmissionId") REFERENCES "MarketSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_marketSubmissionId_fkey" FOREIGN KEY ("marketSubmissionId") REFERENCES "MarketSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSubmission" ADD CONSTRAINT "MarketSubmission_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
