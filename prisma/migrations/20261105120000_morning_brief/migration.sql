-- The 8 am morning brief email (src/lib/brief). Additive only: three new tables; nothing existing
-- changes, and code that predates them is unaffected.

-- CreateTable
CREATE TABLE "EmailPref" (
    "userId" TEXT NOT NULL,
    "morningBrief" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailPref_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MorningBrief" (
    "day" DATE NOT NULL,
    "data" JSONB NOT NULL,
    "builtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "MorningBrief_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "BriefSend" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BriefSend_pkey" PRIMARY KEY ("userId","day")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailPref_token_key" ON "EmailPref"("token");

-- AddForeignKey
ALTER TABLE "EmailPref" ADD CONSTRAINT "EmailPref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
