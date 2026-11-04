// Consumer Internet: what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.consumerinternet) and ../docs.ts (SECTOR_DOCS.consumerinternet).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const CONSUMERINTERNET_SCENARIOS: Scenario[] = [
  {
    id: "qc-price-war",
    title: "Quick-commerce price war",
    blurb: "Flipkart Minutes and Amazon Now fund deep discounts for a year",
    story:
      "Flipkart and Amazon have the deepest pockets in Indian retail and both are opening dark stores fast. If they keep discounts high for another year to win share before Flipkart's own IPO, Blinkit's newly positive margins stall, Instamart's path to breakeven slips again and Zepto's listing gets harder to price. Couriers, ad platforms and brands' ad budgets benefit from the extra orders; supermarkets lose top-up baskets.",
    effect: "headwind",
    impacts: [
      S("quickcommerce", 3, "Discounts and new stores push out breakeven for the listed players"),
      S("foodtech", 1, "Food-delivery profits are diverted to defend quick commerce"),
      S("ecommerce", 2, "Beauty, kids and essentials move to 10-minute apps"),
      S("logistics", 2, "More hyperlocal orders for last-mile networks", "tailwind"),
      S("adtech", 1, "Brands spend more on ads to win shelf space in apps", "tailwind"),
    ],
    stocks: [
      { key: "shadowfax", severity: 2, effect: "tailwind", why: "Its riders carry quick-commerce and marketplace orders for several platforms" },
      { key: "dmart", severity: 1, effect: "headwind", why: "Top-up grocery baskets leave supermarkets in big cities" },
    ],
  },
  {
    id: "upi-mdr",
    title: "UPI merchant fee starts after Diwali",
    blurb: "The announced 0.4% MDR on UPI payments above ₹2,000 takes effect as planned",
    story:
      "UPI and RuPay debit carried no merchant fee from 2020. On 15 Sep 2026 the Finance Ministry and NPCI announced a 0.4% MDR on person-to-merchant UPI payments above ₹2,000, capped at ₹300 a payment, paid by merchants; consumers, person-to-person transfers and small merchants are exempt. NPCI then pushed the 15 Oct start to after Diwali, on a date to be notified. Once it starts, payment apps and gateways earn on their largest pipe for the first time, though the ministry says only about 4% of merchant payments qualify; large platforms pay a new cost on bigger orders. A further delay or a cut in the rate would shrink the gain.",
    effect: "tailwind",
    impacts: [
      S("payments", 3, "First revenue on UPI volume for apps and gateways"),
      S("ecommerce", 1, "Marketplaces pay a fee on UPI orders above ₹2,000", "headwind"),
      S("foodtech", 1, "Few food orders exceed ₹2,000, so the new cost is small", "headwind"),
      S("quickcommerce", 1, "Larger baskets carry a new payment cost on thin margins", "headwind"),
      S("travel", 1, "Many flight and hotel bookings exceed ₹2,000 and carry a new cost", "headwind"),
    ],
    stocks: [
      { key: "paytm", severity: 3, effect: "tailwind", why: "Largest listed UPI and merchant-payments business" },
      { key: "pineLabs", severity: 2, effect: "tailwind", why: "Large-merchant acceptance is its core market" },
    ],
  },
  {
    id: "gig-levy",
    title: "Gig-worker levy switched on in full",
    blurb: "The Centre notifies a 2% of turnover contribution and more states add fees",
    story:
      "The Code on Social Security asks aggregators to pay 1-2% of annual turnover (capped at 5% of what they pay workers) into a welfare fund; the rate and start date still await notification, and Karnataka already levies a per-booking fee. If the Centre picks the top rate and more states add their own fees, rider-heavy platforms lose a meaningful slice of their thin margins unless they pass it to customers through higher fees.",
    effect: "headwind",
    impacts: [
      S("foodtech", 2, "Every order needs a rider; margins are ~5% of order value"),
      S("quickcommerce", 3, "Margins are near zero, so a levy delays breakeven"),
      S("logistics", 2, "Last-mile riders are a large share of cost"),
      S("classifieds", 1, "Home-services professionals count as platform workers"),
    ],
  },
  {
    id: "rmg-court",
    title: "Court eases the real-money gaming ban",
    blurb: "The Supreme Court strikes down or narrows the 2025 ban on online money games",
    story:
      "Gaming companies challenged the Promotion and Regulation of Online Gaming Act, 2025, and the cases were moved to the Supreme Court. If the court allows skill-based games such as fantasy and rummy again under licensing, gaming revenue and ad spending return - but only slowly, since apps have shut, users have left and banks must check registration before processing payments.",
    effect: "tailwind",
    impacts: [
      S("gaming", 3, "Fantasy, rummy and poker could restart under licences"),
      S("adtech", 2, "Gaming apps were large buyers of performance ads"),
      S("payments", 1, "Gaming payment flows return to gateways"),
    ],
    stocks: [
      { key: "nazara", severity: 2, effect: "tailwind", why: "Holds a stake in PokerBaazi's parent, now written down" },
      { key: "affle", severity: 1, effect: "tailwind", why: "Real-money gaming was a big Indian ad category" },
    ],
  },
];

export const CONSUMERINTERNET_DOCS: ResearchLink[] = [
  { title: "How India Shops Online 2026", source: "Bain & Company and Flipkart", url: "https://www.bain.com/insights/how-india-shops-online-2026/" },
  { title: "UPI product statistics (monthly volumes and value)", source: "National Payments Corporation of India (NPCI)", url: "https://www.npci.org.in/what-we-do/upi/product-statistics" },
  { title: "Promotion and Regulation of Online Gaming Rules, 2026", source: "National e-Governance Division (MeitY)", url: "https://negd.gov.in/press_release/promotion-and-regulation-of-online-gaming-rules-2026/" },
  { title: "Indian listed new-age tech company tracker", source: "Inc42", url: "https://inc42.com/features/indian-listed-new-age-tech-company-tracker-market-cap-revenue-more/" },
];
