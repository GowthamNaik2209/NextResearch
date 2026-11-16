-- Follow industry: the industries, policies and indices a user follows, for /watchlist's news.
-- Additive only: one new table; nothing existing changes.

-- CreateTable
CREATE TABLE "IndustryFollow" (
    "userId" TEXT NOT NULL,
    "sectorSlug" TEXT NOT NULL,
    "followedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndustryFollow_pkey" PRIMARY KEY ("userId","sectorSlug")
);

-- AddForeignKey
ALTER TABLE "IndustryFollow" ADD CONSTRAINT "IndustryFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
