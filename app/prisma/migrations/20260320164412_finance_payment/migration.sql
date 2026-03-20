-- CreateTable
CREATE TABLE "FinancePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "paidAt" DATETIME NOT NULL,
    "method" TEXT NOT NULL,
    "note" TEXT,
    "reference" TEXT,
    "attachmentId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancePayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinancePayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinancePayment_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "FinanceCharge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinancePayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinancePayment_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FinancePayment_tenantId_studentId_paidAt_idx" ON "FinancePayment"("tenantId", "studentId", "paidAt");

-- CreateIndex
CREATE INDEX "FinancePayment_tenantId_chargeId_idx" ON "FinancePayment"("tenantId", "chargeId");
