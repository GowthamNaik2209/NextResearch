import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Company pages that were indexed under a slug we no longer use, sent to the company that took
  // the business over (railways keyAliases), so old search results and links still land.
  async redirects() {
    return [
      { source: "/company/stoneindia/:rest*", destination: "/company/jwl", permanent: true },
      // Renamed or re-listed: LTIMindtree is LTM, Tata Motors' cars are TMPV after the demerger,
      // Barbeque-Nation is United Foodbrands (UFBL), and Orkla India trades as ORKLAINDIA.
      { source: "/company/ltim/:rest*", destination: "/company/ltm", permanent: true },
      { source: "/company/tatamotors/:rest*", destination: "/company/tmpv", permanent: true },
      { source: "/company/barbeque/:rest*", destination: "/company/ufbl", permanent: true },
      { source: "/company/orkla/:rest*", destination: "/company/orklaindia", permanent: true },
    ];
  },
};

export default nextConfig;
