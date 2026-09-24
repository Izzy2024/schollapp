-- CreateIndex
CREATE UNIQUE INDEX "FinancePayment_tenantId_reference_key" ON "FinancePayment"("tenantId", "reference");
