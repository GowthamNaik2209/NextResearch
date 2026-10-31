import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyTone, TONE_REASONS, type Tone } from "./news-tone";

// Real headlines from Google News RSS (October 2026, " - Source" suffix stripped as the app
// does), labelled the way a long-term shareholder would read them: is this good, bad or neutral
// for the company the feed is about? A reason is pinned where the wording matters.
type Case = [headline: string, tone: Tone, reason?: string];

const RESULTS: Case[] = [
  ["Bharat Electronics Q2 Results: Net Profit Jumps 139% to Rs 4,720 Crore, Revenue Rises 26%", "pos", "Profit up"],
  ["SBI Cards Q2 Results: Profit Surges 75% To Rs 778 Crore, Revenue Up 3%; Beats Estimates", "pos", "Profit up"],
  ["Dixon Technologies' Q2 Profit Falls 49 Pc To Rs 344 Crore", "neg", "Profit down"],
  ["Dr Reddy's net profit down 36% on lower Revlimid sales in North America", "neg", "Profit down"],
  ["Mazagon Dock Q2 Profit Falls 54% To Rs 344 Crore As Margins Collapse", "neg", "Profit down"],
  ["Mazagon Dock Q2 Results: Profit Falls 54%, Margins Contract Sharply To 8.1%", "neg", "Profit down"],
  ["Godrej Properties' Q2FY27 results: Net profit falls 62% to ₹154 crore", "neg", "Profit down"],
  ["Vedanta Q2 FY27 result: Net profit drops 33% QoQ; revenue falls to ₹26,356 crore", "neg", "Profit down"],
  ["Vedanta Oil and Gas Q2 profits fall 21% QoQ to ₹746 crore; revenues contract marginally; key things to know", "neg", "Profit down"],
  ["Vedanta Q2 net profit jumps 151% to ₹6,202 crore, revenue rises 57%", "pos", "Profit up"],
  ["Vedanta Q2 Results: Net profit rises 17% QoQ to Rs 6,202 crore, Revenue up 10%", "pos", "Profit up"],
  ["BHEL Q2 Profit Jumps 120%; Shares Rise 4.44%", "pos", "Profit up"],
  ["BHEL Q2 net profit jumps 120 pc to Rs 810 crore; shares hit record high", "pos", "Profit up"],
  ["L&T shares surge 6% as Q2 net profit rises to Rs 5,202 crore", "pos", "Profit up"],
  ["L&T profit jumps 33% on strong order inflows", "pos", "Profit up"],
  ["HDFC Bank Q2 earnings: Net profit rises 5% to ₹19,510 crore, NII advances 10%; Asset quality improves", "pos", "Profit up"],
  ["SBI Card Q2 results: Net profit rises nearly 75%, total income up 3%", "pos", "Profit up"],
  ["Bharat Electronics Posts Higher Fiscal Q2 Profit; Consolidated Revenue Up", "pos", "Profit up"],
  ["Earnings call transcript: Vedanta Oil and Gas posts higher profit in Q2 2026 By Investing.com", "pos", "Profit up"],
  ["Vedanta Aluminium Shares Hit Rs 364.70 After Q2 Profit Doubles", "pos", "Profit up"],
  ["Paytm Q2 Results Show Strong Profit Growth As UPI Charges Offer Fresh Earnings Potential", "pos", "Profit up"],
  ["IndusInd Bank Q2 FY27 slides: profit surges despite margin pressure By Investing.com", "pos", "Profit up"],
  ["India's L&T jumps as quarterly profit beat eases Middle East concerns", "pos"],
  ["Adani Enterprises Q2 Results: Revenue spikes 75% YoY to Rs 37,216 crore, profit at Rs 1,492 crore", "pos", "Revenue up"],
  ["Adani Enterprises Q2 Results: Topline Surges 74% To Rs 38,023 Crore, EBITDA Up 62%", "pos", "Revenue up"],
  ["Waaree Energies Q2 2026 Earnings: Revenue Jumps 80.55% YoY to ₹25,954.73 Crore as EPS Comes in at ₹128.84", "pos", "Revenue up"],
  ["Vedanta Aluminium reports 41% revenue growth to Rs 22,066 crore in September quarter", "pos", "Revenue up"],
  ["TCS Q2 results: Annualised AI revenue jumps over 19% QoQ to $3.1 billion", "pos", "Revenue up"],
  ["HDFC Bank Fiscal Q2 Earnings, Revenue Rise", "pos", "Revenue up"],
  ["Infosys Fiscal Q2 Earnings Flat, Revenue Advances", "pos", "Revenue up"],
  ["Bharat Electronics Reports Q2 Revenue Of ₹7,328 Crore Versus ₹5,760 Crore YoY", "pos", "Revenue up"],
  ["Dixon Technologies: Q2 FY27 Revenue Soars 42% to ₹21,863 Cr; Appoints New Director", "pos", "Revenue up"],
  ["Vedanta Oil & Gas Results: EBITDA Up 34%, Shares Rally—What Investors Should Know", "pos", "Margin up"],
  ["Adani Enterprises H1 FY27 slides: record EBITDA on copper, airport surge By Investing.com", "pos", "Margin up"],
  ["NTPC Q2 2026 Earnings: EPS of ₹27.9 as Revenue Eases 1.2% Year-on-Year - Healthcare Earnings Report", "neg", "Revenue down"],
  ["DLF Q2 2026 Earnings: EPS at ₹17.83 as Revenue Declines 1.37% YoY - Weak Earnings Momentum", "neg"],
  ["Tata Power Solaroof Installations Jump 33%, Quarterly Rooftop Solar Count Hits 88,397", "pos", "Business growth"],
  ["Tata Power Renewables records 130% YoY growth in Q2FY27 execution", "pos", "Business growth"],
  ["HDFC Bank Ltd (HDB) (Q2 2027) Earnings Call Highlights: Deposits Surge 18. ...", "pos", "Business growth"],
  // Beats and misses.
  ["Earnings Beat: DLF Limited Just Beat Analyst Forecasts, And Analysts Have Been Updating Their Models", "pos", "Results beat"],
  ["TCS Q2 results marginally beat analyst expectations", "pos", "Results beat"],
  ["BHEL shares fall 5% despite Q2 earnings beat; JM Financial sees ₹80,000 crore order inflows by FY29", "pos", "Results beat"],
  ["Sun Pharma Q2 Results: US sales meet expectations; Other parameters deliver a beat", "pos", "Results beat"],
  ["Earnings call transcript: Dr. Reddy’s posts modest Q2 2026 beat, stock edges up", "pos", "Results beat"],
  ["Adani Enterprises Limited Just Missed EPS By 22%: Here's What Analysts Think Will Happen Next", "neg", "Results miss"],
  ["HDFC Bank results fail to cheer markets, shares down by 2%", "neg"],
  ["Hindustan Zinc share jumps 4% after strong Q2 results 2026 | Should you buy Vedanta Group stock? Target, stop loss", "pos", "Strong results"],
  ["Paytm Guides 2-3 Quarter Horizon For UPI MDR Transition To Stabilise After Strong Q2 Show", "pos", "Strong results"],
  ["Earnings call transcript: IndusInd Bank posts stronger Q2 2026 recovery", "pos", "Strong results"],
  // Loss narrows / widens / back to profit.
  ["Vedanta Iron Q2 Results: Loss narrows to Rs 324 crore, revenue declines 2% YoY", "neu", "Mixed results"],
  ["Tejas Networks Q2 loss narrows as revenue rises 55 per cent", "pos", "Loss narrows"],
  ["Tejas Networks Q2 results: Net loss narrows to Rs 207 crore, revenue rises marginally", "pos", "Loss narrows"],
  ["Tejas Networks Q2FY27 slides: losses narrow, order book surges 54% By Investing.com", "pos", "Loss narrows"],
  ["Vedanta Iron and Steel’s loss narrows on year in September quarter", "pos", "Loss narrows"],
  ["Vedanta Iron and Steel Q2 earnings: Net loss at Rs 324 crore, revenue falls 24%", "neg", "Net loss"],
  ["Tata Motors CV swings to ₹1,257 crore profit in Q2; revenue rises 36%", "pos", "Returns to profit"],
  ["Tata Motors returns to profit with ₹1,254 crore in Q2 earnings as CV sales rise 42%", "pos", "Returns to profit"],
  ["Tata Motors CV Q2 profit at ₹2,138 crore against year-ago loss; revenue jumps 42%", "pos", "Returns to profit"],
  ["IndusInd Bank Q2 results: Net Profit recovers to Rs 1,242 crore from year-ago loss", "pos", "Returns to profit"],
  ["Vedanta Oil and Gas swings to ₹746 crore profit in Q2 despite output dip", "pos", "Returns to profit"],
  ["Gautam Adani-led Adani Enterprises returns to profit as revenue jumps 75%, but shares fall | Can new businesses deliver?", "pos", "Returns to profit"],
  // Mixed: neither side outweighs the other two to one (weights: profit 3, revenue 2, beat 2, margin 1).
  ["Dixon Technologies Q2 FY27 Profit Falls 45% To ₹411 Crore, Revenue Jumps 47% To ₹21,794 Crore", "neu", "Mixed results"],
  ["Sun Pharma Q2 net profit falls 36% on one-time charges, revenue rises 12%", "neu", "Mixed results"],
  ["Adani Enterprises' Fiscal H1 Attributable Net Profit Falls; Revenue Up", "neu", "Mixed results"],
  ["Dr Reddy’s Q2 Results: Profit Falls 31% To Rs 925 Crore, Beats Estimates", "neu", "Mixed results"],
  ["SBI Life Q2FY27 Results: Net profit up 11% YoY to ₹549 crore, misses estimates", "neu", "Mixed results"],
  ["Sun Pharma Q2FY27 Results: Revenue up 11.8% to ₹161 billion; margin dips", "pos", "Revenue up"],
  ["Tata Motors CV Q2FY27: Volumes up 42%, EBITDA margin down 90 bps", "neu", "Mixed results"],
  ["Tata Motors PV Q2 Business Update: JLR Wholesale Volumes Up 24.5%, Retail Sales Decline", "neu", "Mixed results"],
  // Guidance outweighs the reported quarter.
  ["Infosys Q2 FY27 Profit Rises 6.2% YoY To ₹7,823 Crore, Cuts Growth Guidance", "neg", "Guidance cut"],
  ["Infosys shares fall 4% after FY27 revenue growth guidance cut", "neg", "Guidance cut"],
  ["Earnings call transcript: Infosys Q2 2026 beats revenue, cuts outlook", "neg", "Guidance cut"],
  ["Infosys shares drop 4% on Q2, guidance miss; here's what analysts recommend", "neg", "Guidance cut"],
  ["Infosys falls despite revenue beat as guidance disappoints", "neg"],
  ["Piramal Pharma raises FY27 growth guidance to 19-20%, expects profitability to improve", "pos", "Guidance raised"],
  // Previews and scheduling are not results.
  ["TCS Q2 preview, dividend: Analysts see modest growth; PAT may rise by 13%", "neu", "Results preview"],
  ["Hindustan Zinc share: Q2 results 2026 date today! Dividend, profit growth in focus? Experts' preview and expectations", "neu", "Results preview"],
  ["BEL Q2 Results FY27 Preview: Defence PSU profit seen rising 7% YoY, revenue 15%; Rs 55,000 crore orders in focus", "neu", "Results preview"],
  ["Tech Mahindra Q2 results: Net profit likely to see double-digit growth; Key focus on bonus shares, guidance and dividend", "neu", "Results preview"],
  ["Lupin Q2 FY27 Earnings Call Scheduled for 4 November 2026", "neu", "Results date"],
  ["IndusInd Bank INDUSINDBK Q2 FY27 Earnings Call Date", "neu", "Results date"],
  ["Sun Pharma stock: Sun Pharma schedules October 30 results for Sun Pharma stock", "neu", "Results date"],
  ["Lodha Developers sets analyst call for Q2FY27 results on Nov 2", "neu", "Results date"],
  ["Bharat Electronics Board to Meet on 30 October for Q2 Results", "neu", "Board meeting"],
  ["Mazagon Dock Board Meet on 27 Oct for Q2 Results Dividend", "neu", "Board meeting"],
  ["Godrej Properties Q2 2027 Earnings Call Is Live", "neu", "Earnings call"],
  ["Tejas Networks Limited Reports Earnings Results for the Second Quarter and Six Months Ended September 30, 2026", "neu", "Results out"],
  ["Tata Motors CV posts Rs 2,138 crore Q2 profit", "neu", "Results out"],
  ["HDFC Bank Q2 review: Earnings in line with estimates; brokerages share price targets", "neu", "Results in line"],
];

const EVENTS: Case[] = [
  // Orders.
  ["Siemens secures €2 billion battery train order for Germany’s Lower Saxony", "pos", "Order win"],
  ["Bharat Electronics Limited Receives Orders Worth INR 5,330 Million", "pos", "Order win"],
  ["BEL secures orders worth Rs 533 crore, FY27 order book crosses Rs 75,000 crore", "pos", "Order win"],
  ["Larsen & Toubro wins major ultra-supercritical order from Damodar Valley-Coal India JV", "pos", "Order win"],
  ["Larsen & Toubro (L&T) bags order worth around Rs 15,000 crore", "pos", "Order win"],
  ["Larsen & Toubro Wins Mega Contract Valued Between ₹10,000 Crore and ₹15,000 Crore", "pos", "Order win"],
  ["Larsen & Toubro Powers Up Major $1.8B Transmission Contracts Across KSA, UAE and India", "pos", "Order win"],
  ["Cochin Shipyard subsidiary secures repeat order for 2 luxury river cruise vessels", "pos", "Order win"],
  ["Cochin Shipyard gets order to build 40 ships from U.S., Germany, Norway, other nations: Sonowal", "pos", "Order win"],
  ["Bharat Electronics Limited Adds Rs. 1011 Crore to Order Book with New Defence Contracts", "pos", "Order win"],
  ["Renfe awards €1.22bn contract to Siemens for 350km/h trains", "pos", "Order win"],
  ["Siemens Mobility selected for California High Speed Rail train contact", "pos", "Order win"],
  ["World’s largest battery train order: Siemens accelerates decarbo ...", "pos", "Order win"],
  ["Premier Energies Q2 Update: Bags ₹4,001 crore orders for 2,308 MW solar cell, module supplies", "pos", "Order win"],
  ["Swan Defence and Heavy Industries Ltd set to win Rs 1,897 crore tanker order", "pos", "Order win"],
  // The order is the news, not the day's price move.
  ["BEL Slides Despite ₹770‑Crore Radar Order From Defence", "pos", "Order win"],
  ["Zero-Debt Defence PSU Stock BEL Falls Despite Rs 1,081 Crore Orders Win; Buy-On-Dips For Rs 530 Target", "pos", "Order win"],
  ["Cochin Shipyard shares jump 5% as firm gets order to build 40 ships from US and other countries; details here", "pos", "Order win"],
  ["Waaree Energies flags US-linked export order cancellations", "neg", "Order setback"],
  ["BHEL falls as Rajasthan government re-invites bids for Rs 12,000 crore tender", "neg", "Order setback"],
  ["Siemens Energy India loses Russia appeal on ₹443.76 million order", "neg"],
  // USFDA and other regulators.
  ["Zydus Lifesciences' Moraiya Plant Receives 5 USFDA Observations", "neg", "USFDA observations"],
  ["Zydus Lifesciences In Focus As US FDA Flags Data Integrity, Quality Control Issues At Gujarat Plant", "neg", "USFDA observations"],
  ["Dr Reddy's FTO-11 facility gets FDA Form 483 with two observations", "neg", "USFDA observations"],
  ["Dr Reddy’s formulations facility gets three observations from FDA", "neg", "USFDA observations"],
  ["Zydus Lifesciences' USFDA inspection at Ahmedabad plant concludes with 5 observations", "neg", "USFDA observations"],
  ["Sun Pharma's ILUMYA gets USFDA approval for psoriatic arthritis treatment", "pos", "USFDA approval"],
  ["Aurobindo Pharma Gets USFDA Nod for Perampanel Tablets", "pos", "USFDA approval"],
  ["Lupin gets US FDA nod for vitamin K injection with $52 million US market", "pos", "USFDA approval"],
  ["FDA Approves Ilumya for Adults With Active Psoriatic Arthritis", "pos", "USFDA approval"],
  ["Aurobindo Pharma shares hit 52-week high on final USFDA approval for Perampanel tablets", "pos", "USFDA approval"],
  ["Zydus moves closer to US market for Keytruda biosimilar as FDA accepts application", "pos", "USFDA filing accepted"],
  ["Dr Reddy's gets DCGI approval for Zytorvi in esophageal cancer", "pos", "Regulatory approval"],
  ["Sun Pharma secures label expansion for specialty star Ilumya in US", "pos", "Regulatory approval"],
  ["Drug Regulators Order Sun Pharma to Halt Eye-Care Production at Assam Plant Over Quality Lapses", "neg"],
  ["Sun Pharma terms recalled eye drugs production halt a ‘voluntary call’", "neg", "Product recall"],
  // Legal, tax and trouble.
  ["Bharti Airtel: Receives ₹54 Lakh Penalty Order from TRAI", "neg", "Penalty"],
  ["U.S. IRS imposes $32,350 penalty on Dr. Reddy’s arm", "neg", "Penalty"],
  ["Bharti Airtel pays ₹2.14 lakh penalty for verification violations", "neg", "Penalty"],
  ["SBI confirms data leak after 3,897 customer records found on dark web", "neg", "Data breach"],
  ["SBI probes suspected dark web leak involving 3,897 customer records", "neg", "Data breach"],
  ["HDFC Bank shares near 52-week low amid insider leak probe", "neg", "Probe"],
  ["Pomerantz LLP investigates Dr. Reddy's over semaglutide-linked losses", "neg", "Probe"],
  ["Kerala HC directs SBI to pay Rs 3.73 lakh to cyber fraud victim", "neg"],
  ["Court To Ola Electric: Replace Defective Electric Scooter Or Refund Customer Rs 1.02 Lakh Plus Interest", "neg", "Court case"],
  ["RBI removes Paytm Payments Bank from list of scheduled banks", "neg", "Regulatory action"],
  ["Paytm subsidiary's GST demand cut to ₹704 crore from ₹5,712 crore; no financial impact", "pos", "Tax relief"],
  ["SEBI Drops Charges Against Vinod Adani, Foreign Investors", "pos", "Legal relief"],
  ["Waaree Energies Receives GPCB Order Revoking Closure Directions for Gujarat Plant", "pos", "Legal relief"],
  ["Waaree Energies Clarifies GPCB Regulatory Order on Navsari Solar Unit", "neu", "Clarification"],
  ["NTPC NSE:NTPC Denies Profit Growth and Buyback Claims", "neu", "Clarification"],
  ["Cochin Shipyard clarifies claims of 40 ship orders from ‘US, Germany, Norway, other nations’", "neu", "Clarification"],
  // Stakes and pledges.
  ["SoftBank Sells 1.2% Stake In Ola Electric, Offloads 1.12 Cr Rights Entitlements", "neg", "Stake sale"],
  ["SoftBank sold 1.2% stake in Ola Electric between January-October", "neg", "Stake sale"],
  ["GQG pares Rs 8,000 crore of Adani stakes in September quarter as FPI bets turn mixed", "neg", "Stake sale"],
  ["LIC raises stake in NTPC to 7.004% after acquiring 2.002% shares", "pos", "Stake buy"],
  ["LIC Raises Stake in NTPC to 7% via Market Purchases", "pos", "Stake buy"],
  ["Ola Electric promoter Bhavish Aggarwal pledges 4.32% stake to fund rights issue subscription", "neg", "Promoter pledge"],
  ["CEO Bhavish Aggarwal Pledges 20 Crore Ola Electric Shares: Here's Why", "neg", "Promoter pledge"],
  // Broker and credit ratings.
  ["Macquarie Upgrades Lupin to 'Outperform'", "pos", "Rating upgrade"],
  ["Jefferies upgrades Dr. Reddy’s stock rating on margin outlook", "pos", "Rating upgrade"],
  ["Adani Enterprises Bags CareEdge's AA Rating Upgrade On Stronger Earnings, Balance Sheet", "pos", "Rating upgrade"],
  ["Adani Enterprises shares fall 4% despite getting CARE Ratings upgrade to AA; stable", "pos", "Rating upgrade"],
  ["Adani Enterprises: AEL gets highest-ever rating in its credit history; shares up over 22% YTD", "pos", "Rating upgrade"],
  ["Jefferies downgrades Siemens stock rating on demand risks", "neg", "Rating downgrade"],
  ["Infosys Draws Four Downgrades in a Day on Weaker Sales Outlook", "neg", "Rating downgrade"],
  ["Ola Electric stock falls over 6 per cent after analysts downgrade to sell", "neg", "Rating downgrade"],
  ["Garden Reach, Mazagon Dock shares: Goldman Sachs says 'Sell' GRSE, MDL; stocks fall up to 8%", "neg", "Sell rating"],
  ["Tata Power Faces 13.5% Downside As Goldman Sachs Sticks To 'Sell' Despite Target Hike; Here's Why", "neg", "Sell rating"],
  ["Buy Vedanta; target of Rs 330: ICICI Securities", "pos", "Buy rating"],
  ["IIFL Capital Initiates Coverage On Adani Enterprises With 'Buy' Rating, Sees 22% Upside", "pos", "Buy rating"],
  ["Siemens Energy AG : Receives a Buy rating from JP Morgan", "pos", "Buy rating"],
  ["Morgan Stanley turns bullish on Paytm, raises target 35% to ₹1,950 on earnings upside", "pos"],
  ["Explained - Why Zydus Life shares are down 2% but Bernstein sees nearly 30% upside - CNBC TV18", "pos", "Upside seen"],
  ["Vedanta Aluminium shares can jump 40%; Nomura recommends buying its peer as well", "pos", "Upside seen"],
  ["Neutral IndusInd Bank; target of Rs 1050: Motilal Oswal", "neu", "Neutral rating"],
  ["Kotak cuts target to INR 410 for Bharat Electronics stock", "neg", "Target cut"],
  ["Geojit raises target for Sun Pharma stock to INR 2,070.00", "pos", "Target raised"],
  ["Bharat Electronics stock: PL Capital keeps INR 452 target for Bharat Electronics stock", "neu", "Target unchanged"],
  // Index changes.
  ["AMFI Rejig: Lenskart, LG Electronics, Siemens Energy among 6 stocks set for largecap upgrade", "pos", "Index inclusion"],
  ["S&P Dow Jones Says Will Drop Adani Enterprises From Sustainability Indices", "neg", "Index exclusion"],
  // Corporate actions and fundraising.
  ["Tech Mahindra Q2 results: Net profit rises 33% YoY; company announces 1:1 bonus issue after 11 years", "pos", "Profit up"],
  ["Tech Mahindra Dividend and 1:1 Bonus: Payout and Record Date", "pos", "Bonus issue"],
  ["Dividend Alert: Mazagon Dock Announces Rs 5 Interim Dividend; Check Record Date", "pos", "Dividend"],
  ["Infosys dividend alert! IT major announces Rs 26 per share dividend. Check record date", "pos", "Dividend"],
  ["Siemens Energy AG (ENR) Buys 1.10M Shares in Oct 12–18 Buyback Window", "pos", "Buyback"],
  ["Ola Electric’s Rs 1,000 crore rights issue fully subscribed with two days to go", "pos", "Issue fully subscribed"],
  ["Ola Electric Board Approves ₹1,000 Crore Rights Issue At ₹27 Per Share", "neu", "Fundraise"],
  ["Ola Electric Mobility concludes ₹1,000 crore rights issue", "neu", "Fundraise"],
  ["India's Adani Enterprises eyes $210 million fundraise via rupee debt, bankers say", "neu", "Fundraise"],
  ["Ola Electric shares in focus as board to finalise Rs 1,000 crore Rights Issue on October 5", "neu", "Fundraise"],
  ["HDFC Bank Allots 46.76 Lakh Equity Shares under ESOP/RSU Schemes", "neu", "ESOP allotment"],
  ["Lodha Developers AGM set for Aug 14 with ₹4.25 dividend", "pos", "Dividend"],
  // Capex, capacity, operations.
  ["NTPC Green Energy declares commercial operation of 66.18 MW solar project", "pos", "Capacity added"],
  ["Tata Power Renewable Energy commissions 419 MW of utlity-scale projects in Q2FY27", "pos", "Capacity added"],
  ["Tata Power to set up ₹54 crore GCC in Odisha for next-gen energy solutions", "pos", "Expansion"],
  ["L&T charts out expansion to double order book by 2031", "pos", "Expansion"],
  ["Tata Motors asks suppliers to ramp up capacity for 100,000 passenger vehicles a month from FY28", "pos", "Expansion"],
  ["Dr Reddy’s set to resume Semaglutide supplies in Q3 after production disruption", "pos", "Operations resume"],
  ["Zydus launches first generic Riociguat tablets in US", "pos", "Product launch"],
  ["Dr Reddy's rolls out new generic Ozempic brands amid Obeda supply disruption: Report", "pos", "Product launch"],
  ["Bharti Airtel Shares Jump on Rs 50 Postpaid Tariff Hike", "pos", "Price hike"],
  ["DLF Announces Complete Sell-Out of The Aureva, Achieving ~₹1985 Crore in Sales", "pos", "Strong sales"],
  // People.
  ["Siemens Energy India finance head resigns to join parent group", "neg", "Senior exit"],
  ["Waaree Energies accepts CPO Sanjeev Pushkarna's resignation", "neg", "Senior exit"],
  ["NTPC Government Nominee Director Cessation: Piyush Singh Resigns 5 Oct 2026", "neu", "Board change"],
  ["ABB India appoints Suneel Kumar Munaga as CFO effective Jan 2027", "neu", "Appointment"],
  ["Lupin Appoints Brian Savage as President, Chief Legal Officer", "neu", "Appointment"],
  ["HDFC Bank shares steady as Bagchi takes charge as MD & CEO", "neu", "Appointment"],
  ["BHEL appoints Manepalli Sridhar as Director (HR) effective Oct 22, 2026", "neu", "Appointment"],
  // Deals and partnerships are routine until they show up in the numbers.
  ["Tata Motors completes Iveco acquisition to turbocharge global play", "neu", "Acquisition"],
  ["Aurobindo Pharma Acquires A1 Labs LLC For ₹127.32 Crore", "neu", "Acquisition"],
  ["Cochin Shipyard completes 23% equity stake acquisition in Conoship", "neu", "Acquisition"],
  ["Siemens partners with NVIDIA to advance AI-driven autonomous factories", "neu", "Partnership"],
];

const PRICE: Case[] = [
  ["Larsen & Toubro Share Price Falls in Streak", "neg", "Shares fall"],
  ["Explained - Why Paytm, Pine Labs, MobiKwik shares fell up to 10% on Thursday", "neg", "Shares fall"],
  ["Paytm, One MobiKwik, Pine Labs Shares Fall Up 10% Amid Reports Of Likely Deferment Of UPI MDR Rollout", "neg", "Shares fall"],
  ["HDFC Bank stock dips 2% on huge volume; trades lower for third straight day", "neg", "Shares fall"],
  ["Waaree Energies Slips 2.39% to ₹2455 as Solar Stocks Consolidate Below Resistance - ATR Trailing Stop", "neg", "Shares fall"],
  ["Paytm Shares Fall 10%: Why Is One97 Communications Stock Down Today?", "neg", "Shares fall"],
  ["Adani Enterprises, APSEZ, Adani Green: Why are Adani Group stocks falling on October 8?", "neg", "Shares fall"],
  ["No MDR on UPI above ₹2,000? Here’s why Paytm shares are tumbling", "neg", "Shares fall"],
  ["Infosys shares shed ₹25,000 crore in market cap across two-day fall as AI trade rebounds", "neg", "Shares fall"],
  ["Larsen & Toubro slides Wednesday, outperforms competitors", "neg", "Shares fall"],
  ["TCS Market Cap Falls Out of Top 5 as Jio Platforms Lists", "neg", "Shares fall"],
  ["Healthcare, pharma shares extend decline for 3rd day; Sun Pharma, Dr. Reddy's among top losers", "neg", "Shares fall"],
  ["Ola Electric shares fall 4% post Rs 1,000-crore rights issue proposal; check details", "neg", "Shares fall"],
  ["Infosys shares jump 3% ahead of Q2 earnings announcement. What to expect?", "pos", "Shares rise"],
  ["TCS shares jump 6%: Q2 results boost sentiment; US PERM suspension unlikely to have an impact", "pos", "Shares rise"],
  ["Tata Power Company Ltd Rallies 3.04% and Approaches Key Moving Averages Amid Mixed Market Momentum", "pos", "Shares rise"],
  ["Aurobindo Pharma Share Price update: stock up 2.19% today", "pos", "Shares rise"],
  ["OLA Electric Share Price Rise: 6.29% Gain Today", "pos", "Shares rise"],
  ["Ola shares rebound sharply, climb 17%: What should investors watch now?", "pos", "Shares rise"],
  ["HAL Shares Climb 3% on 2,000th Aero-Engine Delivery", "pos", "Shares rise"],
  ["Jio IPO: Why Bharti Airtel share price is rising ahead of Rs 30,213 crore offer", "pos", "Shares rise"],
  ["Paytm, Pine Labs shares recover after falling up to 7% as UPI MDR rollout delayed beyond Diwali", "pos", "Shares rise"],
  ["Tejas Networks - Positive Breakout: These 9 stocks cross above their 200 DMAs", "pos", "Shares rise"],
  ["Mazagon Dock Shipbuilders Ltd. (MAZDOCK) Share Price Hits Fresh 52-Week Low", "neg", "52-week low"],
  ["Mahindra Finance Share Price Down 2.8% at Fresh 52-Week Low", "neg", "52-week low"],
  ["Tata Power Company Share Price near yearly low, key view", "neg", "52-week low"],
  ["Mazagon Dock shares crash 13% after Q2 results to hit 52-week low; check fresh price targets", "neg", "52-week low"],
  ["Bharat Heavy Electricals Share Price Near One-Year High", "pos", "52-week high"],
  ["BHEL stock hits record high, rises for fifth day; What's driving the rally?", "pos", "Record high"],
  ["Vedanta Iron shares hit 5% lower circuit after Q2 FY27 results", "neg", "Lower circuit"],
  ["Ola Electric and 9 Other Stocks That Hit 20% Upper Circuit Today: Do You Hold Any?", "pos", "Upper circuit"],
  // A distance from the high is not a new high.
  ["NTPC invites 26 percent equity partners: NTPC stock sits 23.55 percent below its 52-week high", "neu"],
];

const ROUTINE: Case[] = [
  ["Bharat Electronics Limited Share Price and Technical Levels", "neu", ""],
  ["Where Could HAL Share Price Potentially be in the Next 5 Years?", "neu", ""],
  ["Suzlon Energy vs BHEL vs Siemens vs ABB: Which Energy Infra Stock Will Give You The Best Dividend In 2026?", "neu", ""],
  ["Does Turbine Supply Deal Change The Bull Case For Siemens Energy Stock?", "neu", ""],
  ["Larsen and Toubro Ltd Share Price: What a Rs. 1 Lakh Investment Would Be Worth Today", "neu", ""],
  ["Godrej Properties Ltd. Key Financial Ratios – Valuation, Profitability & More", "neu", ""],
  ["IndusInd Bank Makes Timely Interest Payment of ₹227.08 Crore on Tier 2 Bonds", "neu"],
  ["Infosys shares: Should you buy the IT stock after Q2 results, dividend 2026 announcement? Expert view on what to do", "pos", "Dividend"],
  ["BHEL Q2 results 2026 today: Should you buy, sell or hold PSU stock ahead of earnings announcement?", "neu"],
  ["Sun Pharma stock at INR 1,760.00, 14.0 percent below high on October 9, 2026", "neu"],
];

const ALL: Case[] = [...RESULTS, ...EVENTS, ...PRICE, ...ROUTINE];

function check(cases: Case[]) {
  const misses: string[] = [];
  for (const [headline, tone, reason] of cases) {
    const got = classifyTone(headline);
    if (got.tone !== tone || (reason && got.reason !== reason)) misses.push(`${headline}\n    want ${tone}${reason ? ` "${reason}"` : ""}, got ${got.tone} "${got.reason}"`);
  }
  assert.deepEqual(misses, [], `${misses.length} misclassified:\n  ${misses.join("\n  ")}`);
}

test("results headlines: direction per metric, beats / misses, losses and mixed quarters", () => check(RESULTS));
test("company events: orders, regulators, legal, stakes, ratings, corporate actions, people", () => check(EVENTS));
test("share-price moves, levels and circuits", () => check(PRICE));
test("explainers, questions and price-level pages stay neutral", () => check(ROUTINE));

// Rules the October corpus did not exercise, in the wording Indian business media use.
const RULE_CASES: Case[] = [
  ["Lupin receives USFDA warning letter for Pithampur unit", "neg", "USFDA warning letter"],
  ["USFDA issues import alert on Granules' Gagillapur facility", "neg", "USFDA import alert"],
  ["Aurobindo Unit VII classified OAI by USFDA", "neg", "USFDA OAI status"],
  ["Sun Pharma's Halol plant gets EIR from USFDA", "pos", "USFDA clearance"],
  ["Dr Reddy's Bachupally plant classified VAI by USFDA", "pos", "USFDA clearance"],
  ["Zydus Ahmedabad unit clears USFDA inspection with zero observations", "pos", "USFDA clearance"],
  ["Glenmark gets ANDA approval for generic acne cream", "pos", "USFDA approval"],
  ["Paytm Q2 loss widens to Rs 550 crore on higher costs", "neg", "Loss widens"],
  ["Ola Electric turns profitable at EBITDA level for first time", "pos", "Returns to profit"],
  ["Zomato swings to loss in Q4 as quick commerce costs bite", "neg", "Net loss"],
  ["Infosys Q2 profit rises but revenue misses estimates", "neu", "Mixed results"],
  ["Dixon net profit down 12% YoY", "neg", "Profit down"],
  ["Waaree revenue up 14% YoY", "pos", "Revenue up"],
  ["Tata Steel Q3 PAT -18% YoY, EBITDA margin up 120 bps", "neg", "Profit down"],
  ["Income Tax department raids Kaynes Technology offices", "neg", "Raid or search"],
  ["SEBI order bars promoter of Tejas Networks from securities market", "neg", "Regulatory action"],
  ["Fire breaks out at Dixon's Noida plant; no casualties", "neg", "Fire or accident"],
  ["Workers' strike halts production at Bosch plant", "neg", "Labour strike"],
  ["Lender files insolvency plea against Vodafone Idea in NCLT", "neg", "Default or insolvency"],
  ["IRB Infra defaults on bond payment", "neg", "Default or insolvency"],
  ["Accounting fraud alleged at Gensol Engineering", "neg", "Fraud concern"],
  ["HAL announces 1:5 stock split", "pos", "Stock split"],
  ["Infosys board approves Rs 18,000 crore buyback", "pos", "Buyback"],
  ["Godrej Properties launches Rs 6,000 crore QIP", "neu", "Fundraise"],
  ["Premier Energies to commission 1.2 GW cell plant; capex of Rs 1,500 crore", "pos", "Capacity added"],
  ["Tata Power plans new plant in Tamil Nadu", "pos", "Expansion"],
  ["Bharti Airtel CEO resigns with immediate effect", "neg", "Senior exit"],
  ["HDFC Bank MD steps down", "neg", "Senior exit"],
  ["Siemens appoints new company secretary", "neu", "Appointment"],
  ["Kaynes Technology company secretary resigns", "neu", "Board change"],
  ["Lodha board appoints statutory auditor", "neu", "Appointment"],
  ["Mazagon Dock AGM on September 25", "neu", "AGM"],
  ["Cochin Shipyard fixes record date for interim dividend", "pos", "Dividend"],
  ["Coal India fixes record date for share consolidation", "neu", "Record date"],
  ["Promoter sells 5% stake in Kaynes via block deal", "neg", "Stake sale"],
  ["Promoter increases stake in Premier Energies", "pos", "Stake buy"],
  ["Promoter pledge released on 2% stake in Ola Electric", "pos", "Pledge released"],
  ["Dixon shares tank 8% as Motorola order shifts", "neg", "Shares fall"],
  ["Waaree Energies stock crashes 12%", "neg", "Shares fall"],
  ["HAL Q2 net profit up 14%", "pos", "Profit up"],
  ["BEL net profit falls 38%", "neg", "Profit down"],
  ["Lupin recalls 30,000 bottles of blood pressure drug in US", "neg", "Product recall"],
  ["", "neu", ""],
];
test("rules beyond the corpus: USFDA closures, losses, raids, splits, stakes, people", () => check(RULE_CASES));

// Misreads found by QA on the live /updates page (October 2026), fixed by general rules.
const QA_CASES: Case[] = [
  ["Polycab India Shares Gain as NCLAT Cancels Insolvency Proceedings", "pos", "Legal relief"],
  ["Asian Paints' Price Hikes Couldn't Cover Higher Costs", "neg", "Costs up"],
  ["SBI Q2 FY27 Results Tuesday: Can the Bank Beat a Record Rs 21,121 Crore Profit?", "neu", "Results preview"],
  // As Google News serves it, with curly apostrophes.
  ["Asian Paints’ Price Hikes Couldn’t Cover Higher Costs", "neg", "Costs up"],
  ["Asian Paints' strokes of price hikes to fight inflation yet to brighten margins", "neu", "Yet to pay off"],
  ["Margin pressures remain a major headwind for Asian Paints stocks", "neg", "Margin pressure"],
  ["Single-Digit Revenue Growth Stocks 2026: Infosys, Asian Paints", "neu", ""],
  ["KPIT Technologies Limited Just Missed Earnings - But Analysts Have Updated Their Models", "neg", "Results miss"],
  ["Samvardhana Motherson subsidiary faces potential €20,001 fine for air quality breach", "neg", "Penalty"],
  ["Bharti Airtel faces INR 54,06,000 disincentive from TRAI", "neg", "Penalty"],
  ["Pricol Dividend History: Last ₹2.00, Yield & Record Dates", "neu", ""],
  // Same rules, other wording.
  ["NCLT dismisses insolvency petition against Kaynes Technology", "pos", "Legal relief"],
  ["Tribunal quashes tax notice against Dixon", "pos"],
  ["Karnataka High Court Dismisses JSW Steel’s Pleas Against PMLA Attachment", "neg", "Court case"],
  ["Dabur's price increases failed to offset input cost inflation", "neg", "Costs up"],
  ["Rising raw material costs put pressure on Asian Paints' margins", "neg", "Margin pressure"],
  ["Stocks With Low Debt 2026: Polycab, KEI Industries, Havells", "neu", ""],
  ["Infosys dividend dates and history: full list", "neu", ""],
];
test("QA misreads from the live page", () => check(QA_CASES));

test("every returned reason is in the published list and is short Title-case text", () => {
  for (const [headline] of [...ALL, ...RULE_CASES, ...QA_CASES]) {
    const { tone, reason } = classifyTone(headline);
    // The only empty reason is the plain amber fallback.
    if (reason === "") assert.equal(tone, "neu", headline);
    else assert.ok(TONE_REASONS.includes(reason), headline);
  }
  assert.ok(!TONE_REASONS.includes("") && !TONE_REASONS.includes("General update"));
  for (const reason of TONE_REASONS) {
    assert.match(reason, /^[A-Z0-9]/, reason);
    assert.doesNotMatch(reason, /\.$/, reason);
    assert.ok(reason.split(/\s+/).length <= 5, reason);
  }
});

test("is fast enough to run on every render", () => {
  const headlines = ALL.map(([h]) => h);
  const t0 = performance.now();
  for (let i = 0; i < 20; i++) for (const h of headlines) classifyTone(h);
  const perHeadline = (performance.now() - t0) / (20 * headlines.length);
  assert.ok(perHeadline < 1, `${perHeadline.toFixed(3)} ms per headline`);
});
