-- CreateTable
CREATE TABLE "RecoveryEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "action" TEXT,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecoveryEvent_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "recoverable" BOOLEAN NOT NULL DEFAULT false,
    "recoveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "recoveryAction" TEXT,
    "recommendation" TEXT,
    "confidence" REAL,
    "reason" TEXT,
    "recovered" BOOLEAN NOT NULL DEFAULT false,
    "recoveredAmount" REAL,
    "recoveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Transaction" ("amount", "createdAt", "currency", "customerEmail", "failureReason", "id", "paymentId", "recoverable", "recoveryStatus", "status", "updatedAt") SELECT "amount", "createdAt", "currency", "customerEmail", "failureReason", "id", "paymentId", "recoverable", "recoveryStatus", "status", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_paymentId_key" ON "Transaction"("paymentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RecoveryEvent_transactionId_idx" ON "RecoveryEvent"("transactionId");
