import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Company pages that were indexed under a slug we no longer use, sent to the company that took
  // the business over (railways keyAliases), so old search results and links still land.
  async redirects() {
    return [{ source: "/company/stoneindia/:rest*", destination: "/company/jwl", permanent: true }];
  },
};

export default nextConfig;
