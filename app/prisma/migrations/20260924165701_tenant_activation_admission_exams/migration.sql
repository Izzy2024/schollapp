-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "admissionPassPercent" DOUBLE PRECISION NOT NULL DEFAULT 70;

-- CreateTable
CREATE TABLE "TenantActivationKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByTenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantActivationKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionExam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicantExamResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicantExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantActivationKey_key_key" ON "TenantActivationKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TenantActivationKey_usedByTenantId_key" ON "TenantActivationKey"("usedByTenantId");

-- CreateIndex
CREATE INDEX "TenantActivationKey_usedAt_idx" ON "TenantActivationKey"("usedAt");

-- CreateIndex
CREATE INDEX "AdmissionExam_tenantId_active_idx" ON "AdmissionExam"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicantExamResult_applicantId_examId_key" ON "ApplicantExamResult"("applicantId", "examId");

-- AddForeignKey
ALTER TABLE "TenantActivationKey" ADD CONSTRAINT "TenantActivationKey_usedByTenantId_fkey" FOREIGN KEY ("usedByTenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionExam" ADD CONSTRAINT "AdmissionExam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantExamResult" ADD CONSTRAINT "ApplicantExamResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantExamResult" ADD CONSTRAINT "ApplicantExamResult_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantExamResult" ADD CONSTRAINT "ApplicantExamResult_examId_fkey" FOREIGN KEY ("examId") REFERENCES "AdmissionExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
