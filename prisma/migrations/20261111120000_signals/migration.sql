-- Signals (docs/SIGNALS.md): saved rules per user and stock/basket, and the rules met on each close
-- for the alert emails. Additive only: two new tables; nothing existing changes.

-- CreateTable
CREATE TABLE "SignalStrategy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "alerts" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT NOT NULL,
    "checkedDay" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignalStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalEvent" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "ticker" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignalStrategy_token_key" ON "SignalStrategy"("token");

-- CreateIndex
CREATE INDEX "SignalStrategy_alerts_idx" ON "SignalStrategy"("alerts");

-- CreateIndex
CREATE UNIQUE INDEX "SignalStrategy_userId_scope_target_key" ON "SignalStrategy"("userId", "scope", "target");

-- CreateIndex
CREATE INDEX "SignalEvent_emailedAt_idx" ON "SignalEvent"("emailedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SignalEvent_strategyId_day_ticker_kind_key" ON "SignalEvent"("strategyId", "day", "ticker", "kind");

-- AddForeignKey
ALTER TABLE "SignalStrategy" ADD CONSTRAINT "SignalStrategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalEvent" ADD CONSTRAINT "SignalEvent_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "SignalStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
