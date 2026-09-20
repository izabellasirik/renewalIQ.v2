-- AlterTable
ALTER TABLE "File" ADD COLUMN     "analysisStatus" TEXT NOT NULL DEFAULT 'Ready',
ADD COLUMN     "category" TEXT,
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DocumentInsight" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "extractedFields" JSONB NOT NULL,
    "issues" JSONB NOT NULL,
    "confidence" TEXT NOT NULL,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentInsight_fileId_key" ON "DocumentInsight"("fileId");

-- AddForeignKey
ALTER TABLE "DocumentInsight" ADD CONSTRAINT "DocumentInsight_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
