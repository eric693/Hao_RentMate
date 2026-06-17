-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");
