// Traffic-light tone for a company headline: green ("pos") = good news for the company, red
// ("neg") = bad news, amber ("neu") = routine, mixed or unclear - plus a 2-5 word reason the UI
// shows next to it ("Order win", "Profit down", "USFDA observations").
//
// Rules only: keyword / regex matching over the headline text. No model, no network, no state,
// so it is cheap enough to run on every server render. The company is already known from the
// feed, so the headline is read as being about that company.
//
// Limits: it reads the headline, not the article, and it is not advice. Sarcasm, multi-company
// round-ups ("Sun Pharma gains, Dr Reddy's falls") and stories where our company is the
// counterparty ("Power Mech bags order from Vedanta") can be misread. When nothing matches the
// answer is amber with an empty reason, never a guess.
//
// How a headline is decided - the first group that matches wins, strongest evidence first:
//   1. Clarifications / denials (neutral) and legal or regulatory relief (positive).
//   2. Regulatory and legal trouble: USFDA warning letter / 483 / import alert, raids, probes,
//      penalties, fraud, default, fire, strike, shutdown, recall, data breach (negative).
//   3. Index inclusion / exclusion, guidance raised / cut / growth outlook, rating upgrade /
//      downgrade (broker or credit: "upgrade on stronger earnings" is about the upgrade).
//   4. Reported results, scored per metric (see scoreResults): profit, revenue, margin, beat /
//      miss, loss narrows / widens. Mixed headlines: each side is weighted (profit 3, revenue 2,
//      beat/miss 2, margin 1, volumes 1) and the stronger side wins only if it is at least twice
//      the weaker one; otherwise the answer is amber "Mixed results".
//      So "profit falls 45%, revenue jumps 47%" is Mixed, "profit surges despite margin
//      pressure" is Profit up. A guidance cut outweighs reported numbers (it is forward-looking).
//   5. Company events: senior exits, pledges, stake sales / buys, orders, buy / sell calls and
//      target changes, approvals, dividends / bonus / buyback / split, capex and capacity.
//   6. Share-price moves (52-week high / low, circuits, "shares jump 5%"). These rank below
//      company events: in "BEL falls despite ₹770 crore order" the order is the news.
//   7. Routine items (neutral): hold calls, fundraise, board meeting, results date, earnings
//      call, AGM, record date, appointments, acquisitions, partnerships, results out.
//   Questions and explainers ("Which stock will give the best dividend?") stay neutral.

export type Tone = "pos" | "neg" | "neu";
export type ToneResult = { tone: Tone; reason: string };

const r = (tone: Tone, reason: string): ToneResult => ({ tone, reason });
// Nothing specific matched: amber with no reason, so the UI shows the light alone.
const GENERAL = r("neu", "");

// ---------------------------------------------------------------------------------------------
// Vocabulary

// Direction words for a metric that comes before them ("profit rises", "revenue down 12%").
const UP = String.raw`ris(?:e|es|en|ing)|rose|jump(?:s|ed)?|surg(?:e|es|ed|ing)|soar(?:s|ed)?|climb(?:s|ed)?|gr(?:ow|ows|ew|own|owth)|up|higher|increas(?:e|es|ed)|advanc(?:e|es|ed)|gain(?:s|ed)?|doubl(?:e|es|ed)|tripl(?:e|es|ed)|spik(?:e|es|ed)|zoom(?:s|ed)?|improv(?:e|es|ed)|expand(?:s|ed)?|rebound(?:s|ed)?|recover(?:s|ed)?|skyrocket(?:s|ed)?|leap(?:s|t)?|swell(?:s|ed)?|accelerat(?:e|es|ed)|strong|robust|record|tops?|\+\s?\d[\d,.]*%?`;
const DOWN = String.raw`fall(?:s|en|ing)?|fell|drop(?:s|ped)?|declin(?:e|es|ed|ing)|dip(?:s|ped)?|slump(?:s|ed)?|plung(?:e|es|ed)|tumbl(?:e|es|ed)|slid(?:e|es)?|down|lower|contract(?:s|ed)?|shr(?:ink|inks|ank|unk)|eas(?:e|es|ed)|collaps(?:e|es|ed)|halv(?:e|es|ed)|crash(?:es|ed)?|s(?:ink|inks|ank)|weak(?:er|ens)?|erod(?:e|es|ed)|squeez(?:e|es|ed)|compress(?:es|ed)?|slip(?:s|ped)?|plummet(?:s|ed)?|nosediv(?:e|es|ed)|tank(?:s|ed)?|decreas(?:e|es|ed)|dent(?:s|ed)?|worr(?:y|ies)|pressure|lag(?:s|ged)?|trail(?:s|ed)?|slow(?:s|er|ed)?|sluggish|[-−–]\s?\d[\d,.]*%?`;
const UP_RE = new RegExp(String.raw`^(?:${UP})$`, "i");
const DOWN_RE = new RegExp(String.raw`^(?:${DOWN})$`, "i");
// Adjectives in front of a metric ("higher Q2 profit", "lower Revlimid sales", "record EBITDA").
const PRE_UP = /^(?:aids?|aided|lifts?|boosts?|drives?|rising|growing|improving|expanding|growth|higher|strong|stronger|robust|stellar|record|healthy|solid|bumper|blockbuster|best-ever|highest|highest-ever)$/i;
const PRE_DOWN = /^(?:hits?|dents?|drags?|squeezes?|squeezed|hurts?|weighs?|erodes?|shrinking|falling|declining|slowing|lower|weak|weaker|muted|subdued|soft|poor|disappointing|tepid|lowest)$/i;

type Metric = "profit" | "revenue" | "margin" | "ops";
// Checked in this order; an earlier match claims the words so "operating profit" is a margin,
// not a profit, and "retail sales" is volumes, not revenue.
const METRICS: [Metric, RegExp][] = [
  ["margin", /\b(?:ebitda margins?|operating margins?|margins?|ebitda|ebit|operating profit)\b/gi],
  ["ops", /\b(?:(?:operational |installed )?capacity|order ?book|order inflows?|order intake|deal wins|deal bookings|tcv|volumes?|deliveries|dispatches|wholesales?|retail sales|bookings|pre-?sales|deposits|loan book|loans|aum|installations|subscribers|arpu|realisations?|realizations?|production|output)\b/gi],
  ["profit", /\b(?:net income|net profit|profits?|pat|earnings|eps|bottom ?line)\b/gi],
  ["revenue", /\b(?:revenues?|sales|top ?line|total income|net interest income|nii|income|turnover)\b/gi],
];
const WEIGHT: Record<Metric, number> = { profit: 3, revenue: 2, margin: 1, ops: 1 };
const REASON: Record<Metric, [string, string]> = {
  profit: ["Profit up", "Profit down"],
  revenue: ["Revenue up", "Revenue down"],
  margin: ["Margin up", "Margin down"],
  ops: ["Business growth", "Business slowdown"],
};

// ---------------------------------------------------------------------------------------------
// Rule tables. Each entry: [pattern, tone, reason]. Within a table the first match wins.

type Rule = [RegExp, Tone, string];
const first = (h: string, rules: Rule[]): ToneResult | null => {
  for (const [re, tone, reason] of rules) if (re.test(h)) return r(tone, reason);
  return null;
};

const FDA = String.raw`(?:us ?fda|usfda|fda)`;

// Good-news closures and legal relief - checked before the trouble rules so "GST demand cut"
// or "SEBI drops charges" are not read as a demand or a SEBI action.
const RELIEF: Rule[] = [
  [/\b(?:dismiss\w*|rejects?|junks?)\b[^;:]{0,30}'s (?:pleas?|petitions?|appeals?)\b/i, "neg", "Court case"],
  [new RegExp(String.raw`\b(?:eir|establishment inspection report|vai|voluntary action indicated)\b|\b(?:zero|nil|no) (?:${FDA} )?observations?\b|${FDA} (?:inspection )?(?:clears|clean chit)`, "i"), "pos", "USFDA clearance"],
  [/\b(?:tax|gst|demand|penalty)\b[^;:]{0,30}\b(?:cut|reduced|quashed|dropped|waived|set aside|stayed)\b/i, "pos", "Tax relief"],
  [/\bfavou?rable\b[^;:]{0,40}\b(?:order|ruling|verdict|judgment|judgement)\b|\b(?:sets? aside|scraps?|scrapped|quash\w*|stays?|stayed|halts?|halted|cancels?|cancell?ed|dismiss\w*|withdraws?|withdrawn|terminates?|closes)\b[^;:]{0,30}\b(?:insolvency|order|proceedings|demand|penalty|delisting|attachment|notice|charges|case|fir)\b|\bwins? (?:\S+ ){0,2}(?:case|appeal|arbitration|legal battle)\b|\b(?:court|legal|tax|interim) relief\b|\bwins relief\b|\b(?:reduces?|cuts?)\b[^;:]{0,20}\b(?:contingent )?liabilit\w+|\bdrops? (?:all )?(?:charges|case|probe|proceedings)\b|\bcharges? (?:dropped|quashed)\b|\bquash\w*|\bacquit\w*|\bclean chit\b|\bdismiss\w* (?:the )?(?:case|petition|plea|suit)\b|\b(?:revok\w+|withdraw\w*|lifts?|lifted)\b[^;:]{0,25}\b(?:closure|ban|suspension|curbs?)\b|\b(?:closure|ban|suspension|curbs?)\b[^;:]{0,15}\b(?:revoked|lifted|withdrawn)\b|\bwins? (?:case|appeal|arbitration|legal battle)\b|\bfavourable (?:ruling|order|verdict)\b/i, "pos", "Legal relief"],
];

const TROUBLE: Rule[] = [
  [new RegExp(String.raw`\bwarning letter\b`, "i"), "neg", "USFDA warning letter"],
  [/\bimport alert\b/i, "neg", "USFDA import alert"],
  [/\boai\b|\bofficial action indicated\b/i, "neg", "USFDA OAI status"],
  [new RegExp(String.raw`\bform ?483\b|\b483 (?:observations?|with)\b|${FDA}[^;:]{0,60}\b(?:observations?|flags?|lapses|issues|concerns)\b|\bobservations?\b[^;:]{0,30}${FDA}`, "i"), "neg", "USFDA observations"],
  [/\bdata (?:leak|breach|loss)\b|\bdark web\b|\bcyber ?attack\b|\bhack(?:ed|ers)?\b|\bransomware\b/i, "neg", "Data breach"],
  [/\brecall(?:s|ed)?\b/i, "neg", "Product recall"],
  [/\braids?\b|\b(?:i-?t|income tax|ed|gst) (?:searches|search|survey)\b|\bsearch operations?\b/i, "neg", "Raid or search"],
  [/\b(?:fraud\w*|scam|embezzl\w*|siphon\w*|irregularit\w+|misstat\w+|forensic audit)\b/i, "neg", "Fraud concern"],
  [/\bdefault(?:s|ed)?\b|\binsolven\w+|\bbankrupt\w*|\bliquidation\b|\bmissed (?:interest|coupon|loan) payments?\b/i, "neg", "Default or insolvency"],
  [/\bpenalt\w+|\bfined\b|\bfines\b|\bfine of\b|\bdisincentives?\b|\b(?:faces?|facing|potential|possible)\b[^;:]{0,25}\bfine\b|\bimposes? [^;:]{0,20}\bfine\b/i, "neg", "Penalty"],
  [/\b(?:tax|gst|income tax|customs) (?:demand|notice|order)\b|\bdemand notice\b|\bshow[- ]cause\b/i, "neg", "Tax or legal notice"],
  [/\b(?:sebi|rbi|cci|irdai|trai|dot|nhai|regulators?|pollution control board|gpcb|mpcb|cpcb)\b[^;:]{0,40}\b(?:order|orders|action|curbs?|restrict\w*|bars?|barred|bans?|directs?|directions?|attach\w*|debar\w*)\b|\bregulatory (?:order|action)\b|\bremov\w+ [^;:]{0,40}\bfrom (?:the )?list\b|\bdelist\w*/i, "neg", "Regulatory action"],
  [/\bprobes?\b|\bprobed\b|\binvestigat\w+|\bscrutiny\b|\binquiry\b|\benquiry\b/i, "neg", "Probe"],
  [/\blawsuits?\b|\bsues\b|\bsued\b|\bclass action\b|\blitigation\b|\b(?:court|hc|tribunal|commission|forum)\b[^;:]{0,20}\b(?:orders?|directs?|asks?)\b|\bcourt to\b|\b(?:court|hc|tribunal|supreme court)\b[^;:]{0,15}\b(?:dismiss\w*|rejects?|junks?|refuses?)\b[^;:]{0,40}\b(?:pleas?|petitions?|appeals?)\b|\bloses? (?:an? |the )?(?:\w+ )?(?:appeal|case|arbitration|lawsuit)\b/i, "neg", "Court case"],
  [/\bfire (?:at|in|breaks|broke)\b|\bblaze\b|\bexplosion\b|\bblast at\b|\baccident at\b/i, "neg", "Fire or accident"],
  [/\bon strike\b|\bstrike (?:at|by|over|hits|enters|continues)\b|\bworkers'? strike\b|\blabou?r (?:strike|unrest)\b|\blockout\b/i, "neg", "Labour strike"],
  [/\bshut ?down\b|\bshuts\b|\bclosure (?:notice|directions?|order)\b|\b(?:halts?|suspends?) (?:production|operations|manufacturing)\b|\bproduction halt\b|\bplant closure\b|\bhalt\w*\b[^;:]{0,25}\bproduction\b/i, "neg", "Shutdown"],
  [/\bbann?(?:ed|s)? (?:on|from)\b|\bbanned\b|\bblacklist\w*|\bdebar\w*/i, "neg", "Ban"],
];

const INDEX: Rule[] = [
  [/\bretains? (?:\S+ ){0,2}(?:listing|place|spot)\b[^;:]{0,20}\b(?:index|indices|msci|nifty|sensex)\b|\b(?:largecap|large-cap|midcap|mid-cap) upgrade\b|\bupgraded? to (?:largecap|large-cap)\b|\b(?:enter|entry|inclusion|included|join|joins|added to|addition to)\b[^;:]{0,30}\b(?:index|indices|nifty|sensex|msci|ftse)\b/i, "pos", "Index inclusion"],
  [/\b(?:drop|dropped|drops|exclu\w+|remov\w+|exit|exits|deleted)\b[^;:]{0,40}\b(?:index|indices|nifty 50|sensex|msci)\b|\bmay be dropped\b/i, "neg", "Index exclusion"],
];

const GUIDANCE: Rule[] = [
  [/\b(?:cuts?|lowers?|lowered|trims?|slashes|reduces?|scales? back|pares?)\b[^;:]{0,30}\b(?:guidance|outlook|forecast)\b|\b(?:guidance|outlook|forecast) (?:cut|lowered|trimmed|miss|revised down\w*|disappoint\w*)\b|\b(?:weak|soft|disappointing) (?:\w+ )?guidance\b/i, "neg", "Guidance cut"],
  [/\b(?:expects?|projects?|targets?|guides? for)\b[^;:]{0,40}\b(?:growth|to grow|double[- ]digits?)\b/i, "pos", "Growth outlook"],
  [/\b(?:raises?|ups|lifts?|hikes?|upgrades?|improves?)\b[^;:]{0,30}\b(?:guidance|outlook|forecast)\b|\b(?:guidance|outlook) (?:raised|upgrade[ds]?|hike)\b|\bbeat (?:its )?(?:full-year )?guidance\b/i, "pos", "Guidance raised"],
];

const EXIT_SENIOR = /\b(?:ceo|md|managing director|cfo|coo|cto|cpo|chief|president|chairman|chairperson|founder|head)\b/i;
const EXIT_WORD = /\b(?:resign\w*|steps? down|stepping down|quits?|exits?|cessation|departs?|departure|leaves)\b/i;

const STAKE: Rule[] = [
  [/\bpledg\w*\b[^;:]{0,40}\b(?:releas\w*|revok\w*|reduc\w*|repaid|cuts?|freed)\b|\b(?:releas\w*|revok\w*|reduc\w*|cuts?) [^;:]{0,20}\bpledg\w*/i, "pos", "Pledge released"],
  [/\bpledg\w*/i, "neg", "Promoter pledge"],
  [/\b(?:sells?|sold|offloads?|offloaded|dilutes?|trims?|pares?|cuts?|reduces?|exits?|divests?|dumps?|unloads?)\b[^;:]{0,40}\bstakes?\b|\bstake sale\b|\b(?:block|bulk) deals?\b|\boffer for sale\b|\bofs\b/i, "neg", "Stake sale"],
  [/\b(?:buys?|bought|raises?|ups|hikes?|increases?|adds?|picks? up|boosts?|tops? up)\b[^;:]{0,30}\bstakes?\s+(?:in|to|by)\b|\b(?:buys?|bought|picks? up) [\d.]+% (?:stake|shares|equity)\b|\bstake (?:buy|hike|increase)\b|\bpromoters? (?:buys?|increases?|raises?|ups|hikes?)\b/i, "pos", "Stake buy"],
];

// Regulatory or tax "orders" are not order wins; they are handled by the trouble rules above.
const ORDERS: Rule[] = [
  [/\border (?:cancell?ations?|cancell?ed|deferr\w+|delays?)\b|\bcancels? (?:the )?orders?\b|\borders? (?:cancell?ed|delayed)\b|\bloses? (?:an? )?(?:order|contract|bid|tender)\b|\bre-?invites? bids\b|\bscrap\w* (?:the )?(?:order|contract|tender)\b|\border delays?\b/i, "neg", "Order setback"],
  [/\b(?:wins?|won|bags?|bagged|secures?|secured|receives?|received|gets?|got|lands?|landed|clinch\w*|grabs?|snags?|bag|awarded|adds?|win|signs?|inks?|powers? up|scores?)\b[^;:|]{0,70}?\b(?:orders?|contracts?|contact|loa|letter of (?:award|intent)|work orders?|tenders?|mandates?|supply deal)\b|\borders? (?:worth|win|wins|valued|of rs|of ₹|from|for \d)\b|\b(?:awards?|selected for|chosen for|l1 bidder|lowest bidder)\b[^;:]{0,60}\b(?:contracts?|contact|orders?|projects?|tenders?)\b|\border (?:inflows?|book) (?:crosses|rises|surges|jumps|grows|swells|hits|at record|up)\b|\bset to win\b|\border prospect\b|\b(?:largest|biggest|record|mega|major|repeat|big|maiden)\b(?: \S+){0,3} orders?\b/i, "pos", "Order win"],
];

const SELL_CALL = /['‘’"“”]sell['‘’"“”]|\bsell (?:call|rating)\b|\bdowngrades? [^;:]{0,30}\bto (?:sell|reduce|underperform|underweight)\b|\b(?:recommend\w*|says|advises?) (?:selling|sell)\b|\bconsensus ['‘’"“”]?sell\b|^sell\b|\bsell these\b/i;
const BUY_CALL = /['‘’"“”](?:buy|outperform|overweight|accumulate|add)['‘’"“”]|\b(?:buy|outperform|overweight) (?:rating|call)\b|^buy\b|\bturns? bullish\b|\bbullish (?:ratings?|call|view)\b|\btop pick\b|\binitiates? coverage\b[^;:]{0,30}\bbuy\b|\bfavou?rs\b|\bpreferred by\b|\bbullish on\b|\brecommends? buying\b|\b(?:maintains?|maintain|retains?|keeps?|reiterates?) (?:a |its )?['‘’"“”]?(?:buy|overweight|outperform|add|accumulate)\b/i;
const RATING_QUESTION = /\bshould you\b|\bbuy,? (?:or )?sell\b|\bbuy or\b|\bsell or\b|\bbuy the dip\b|\bbuy-on-dips\b/i;

const RATINGS: Rule[] = [
  [/\bupgrad(?:e|es|ed|ing)\b/i, "pos", "Rating upgrade"],
  [/\bdowngrad(?:e|es|ed|ing)\b/i, "neg", "Rating downgrade"],
  [/\bhighest(?:-ever)? (?:credit )?rating\b/i, "pos", "Rating upgrade"],
];
const TARGETS: Rule[] = [
  [/\b(?:cuts?|lowers?|slashes|trims?|reduces?)\b[^;:]{0,25}\btargets?\b|\btargets? (?:cut|cuts|lowered|slashed|trimmed)\b|\bprice cut\b[^;:]{0,20}\bby\b/i, "neg", "Target cut"],
  [/\b(?:raises?|hikes?|lifts?|ups|increases?|boosts?)\b[^;:]{0,25}\btargets?\b|\btargets? (?:raised|hike|hiked|lifted)\b/i, "pos", "Target raised"],
];
const UPSIDE = /\bupside\b/i;
const DOWNSIDE = /\bdownside\b/i;
const NEUTRAL_CALL = /^(?:neutral|hold)\b|['‘’"“”](?:neutral|hold)['‘’"“”]|\b(?:neutral|hold|equal-weight|market-perform) rating\b|\bmaintains? (?:neutral|hold)\b/i;
const TARGET_KEPT = /\b(?:keeps?|retains?|maintains?|reiterates?)\b[^;:]{0,30}\btargets?\b/i;

const APPROVALS: Rule[] = [
  [new RegExp(String.raw`${FDA}[^;:]{0,40}\b(?:accepts?|accepted)\b|\baccepted for (?:review|filing)\b`, "i"), "pos", "USFDA filing accepted"],
  [new RegExp(String.raw`${FDA}[^;:]{0,50}\b(?:approv\w*|nod|clearance|clears|go-ahead)\b|\b(?:approv\w*|nod|clearance)\b[^;:]{0,40}${FDA}|\banda\b[^;:]{0,20}\bapprov\w*|\btentative approval\b`, "i"), "pos", "USFDA approval"],
  [/\b(?:dcgi|cdsco|ema|mhra|health canada|tga|pmda|nmpa|chmp)\b[^;:]{0,40}\b(?:approv\w*|nod|clearance|positive opinion)\b|\b(?:approv\w*|nod)\b[^;:]{0,20}\b(?:dcgi|cdsco|ema|mhra|health canada)\b|\blabel expansion\b/i, "pos", "Regulatory approval"],
  [/\b(?:gets?|receives?|secures?|wins?|obtains?|bags?|granted)\b[^;:]{0,40}\b(?:approvals?|nod|clearance|licen[cs]e|permit|patent)\b/i, "pos", "Regulatory approval"],
];

const CORPORATE: Rule[] = [
  [/\bbonus\b/i, "pos", "Bonus issue"],
  [/\bbuy-?backs?\b/i, "pos", "Buyback"],
  [/\b(?:stock|share) split\b|\bsplits? (?:its )?(?:shares|stock)\b|\bsub-?division\b/i, "pos", "Stock split"],
  [/\bdividends?\b|\bpayouts?\b/i, "pos", "Dividend"],
  [/\b(?:fully|over)[- ]?subscribed\b|\boversubscri\w+/i, "pos", "Issue fully subscribed"],
];

const OPERATIONS: Rule[] = [
  [/\b(?:resum\w+|restart\w*|restor\w+)\b[^;:]{0,30}\b(?:supply|supplies|production|operations)\b/i, "pos", "Operations resume"],
  [/\bcommission(?:s|ed|ing)?\b|\bcommercial operations?\b|\b(?:adds?|added) [\d.,]+ ?(?:mw|gw|mtpa)\b/i, "pos", "Capacity added"],
  [/\bcapex\b|\bexpan(?:d|ds|ded|sion)\b|\bnew (?:plant|facility|factory|unit|line|capacity)\b|\bcapacity (?:addition|expansion|to|of)\b|\bsets? up\b|\bto set up\b|\binaugurat\w+|\bramps? up\b|\bgreenfield\b|\bbrownfield\b|\bscales? up\b|\bgigafactory\b/i, "pos", "Expansion"],
  [/\b(?:tariff|price)s? hikes?\b|\bhikes? (?:\w+ )?(?:tariffs?|prices)\b|\braises? (?:\w+ )?(?:tariffs?|prices)\b/i, "pos", "Price hike"],
  [/\bsell-?out\b|\bsells out\b|\bsold out\b|\brecord (?:sales|bookings|pre-?sales)\b/i, "pos", "Strong sales"],
  [/\bnew (?:\S+ ){0,3}(?:brands?|models?|products?|variants?)\b|\blaunch(?:es|ed)?\b|\brolls? out\b|\bunveil\w*|\bintroduc(?:es|ed)\b|\bdebuts?\b/i, "pos", "Product launch"],
  [/\b(?:supply|production|operational) (?:disruption|halt|issues?)\b|\bdisruption\b/i, "neg", "Supply disruption"],
];

// Share-price moves. Subject words that make a following up/down word a price move.
const PRICE_SUBJECT = String.raw`(?:shares?|stocks?|scrip|counter|share price|stock price|adrs?|market cap|m-?cap|valuation)`;
const PRICE_UP = String.raw`rall(?:y|ies|ied)|surg(?:e|es|ed)|jump(?:s|ed)?|soar(?:s|ed)?|zoom(?:s|ed)?|climb(?:s|ed)?|gain(?:s|ed)?|ris(?:e|es)|rose|up(?! to\b)|higher|rebound(?:s|ed)?|recover(?:s|ed)?|spurt(?:s|ed)?|advanc(?:e|es|ed)|bounc(?:e|es|ed)|shoot(?:s)?|skyrocket(?:s|ed)?|outperform(?:s|ed)?|breaks? out`;
const PRICE_DOWN = String.raw`fall(?:s)?|fell|drop(?:s|ped)?|declin(?:e|es|ed)|dip(?:s|ped)?|slump(?:s|ed)?|plung(?:e|es|ed)|tumbl(?:e|es|ed)|slid(?:e|es)?|down|lower|crash(?:es|ed)?|sink(?:s)?|sank|slip(?:s|ped)?|tank(?:s|ed)?|shed(?:s)?|los(?:e|es)|plummet(?:s|ed)?|nosediv(?:e|es|ed)|skid(?:s|ded)?|crack(?:s|ed)?|retreat(?:s|ed)?|drift(?:s|ed)?|underperform(?:s|ed)?|extend losses|extend decline|in red|under pressure|sell-?off`;

const PRICE_LEVELS: Rule[] = [
  [/\bupper circuit\b/i, "pos", "Upper circuit"],
  [/\blower circuit\b/i, "neg", "Lower circuit"],
  [/\b(?:record|all-time|lifetime|life-time) highs?\b/i, "pos", "Record high"],
  [/\b(?:52-week|52 week|one-year|1-year|year|yearly|multi-year|\d+-year) highs?\b/i, "pos", "52-week high"],
  [/\b(?:52-week|52 week|one-year|1-year|year|yearly|multi-year|\d+-year|\w+-month|\d+-month) lows?\b/i, "neg", "52-week low"],
  [/\bintraday high\b|\btop (?:gainers?)\b|\bleads? (?:gains|gainers|rally)\b/i, "pos", "Shares rise"],
  [/\bintraday low\b|\bprice pressure\b|\bbefore the (?:drop|fall|crash|slide)\b|\bbears were right\b|\btop losers?\b|\bleads? (?:losses|losers|decline)\b|\bwipe-?out\b|\bwiped out\b/i, "neg", "Shares fall"],
];
// One pattern with two groups so the move word nearest the subject decides: in "shares fell
// up to 10%" it is "fell", not "up".
const PRICE_SUBJ = new RegExp(String.raw`\b${PRICE_SUBJECT}\b(?:\W+\w+){0,3}?\W+(?:(${PRICE_DOWN})|(${PRICE_UP}))\b`, "i");
const PRICE_STREAK_DOWN = /\b(?:shares?|stocks?) (?:falling|tumbling|sliding|slipping|declining|crashing|plunging)\b|\bshare price (?:fall|drop|decline|slide)\b|\bfall(?:s)? (?:in )?streak\b|\bfall streak\b|\b(?:is|are) (?:falling|tumbling|sliding|slipping|declining|crashing|down)\b/i;
const PRICE_STREAK_UP = /\bbreakout\b|\bbreaks? out\b|\b(?:shares?|stocks?) (?:rising|rallying|surging|jumping|gaining|soaring)\b|\bshare price (?:rise|jump|gain)\b|\brise streak\b|\b(?:is|are) (?:rising|rallying|surging|jumping|gaining)\b|\bpositive breakout\b/i;
// "Shares can jump 40%", "stock could rise 10-15% if ..." - a forecast, not a move.
const SPECULATIVE = /\b(?:may|could|can|might|likely to|seen to)\s+(?:(rise|jump|surge|rally|gain|climb|soar|double|zoom)|(fall|drop|decline|slump|crash|plunge|tumble|halve))\b/i;
// "Waaree Energies Slips 2.39%", "Tata Power Rallies 3.04%": a move word right before a percent.
const PRICE_PCT = (words: string) => new RegExp(String.raw`\b(?:${words})\b\W+(?:(?:up to|upto|over|nearly|about|almost|as much as|by|more than|around|another)\s+)?[\d.]+\s?(?:%|per ?cent|pc)`, "i");
const PRICE_PCT_UP = PRICE_PCT(PRICE_UP);
const PRICE_PCT_DOWN = PRICE_PCT(PRICE_DOWN);
// A bare third-person move word ("Larsen & Toubro slides Wednesday") - last resort.
const PRICE_BARE_UP = /\b(?:rallies|surges|jumps|soars|zooms|climbs|gains|rises|rebounds?|spurts|advances|rally|recovers?)\b/i;
const PRICE_BARE_DOWN = /\b(?:falls|drops|declines|dips|slumps|plunges|tumbles|slides|crashes|sinks|slips|tanks|sheds|plummets|skids|cracks|retreats|stumbles)\b/i;

const ROUTINE: Rule[] = [
  [/\b(?:rights issue|qip|qualified institutional placement|fund ?rais\w*|raises? \S*\s?(?:rs|₹|\$|inr)?\s?[\d,.]+\s?(?:crore|cr|bn|billion|million|mn)?\b[^;:]{0,20}\b(?:via|through|from)\b|ncds?|non-convertible|debt issue|bond issue|preferential (?:issue|allotment)|warrants|ipo)\b/i, "neu", "Fundraise"],
  [/\b(?:esop|esos|rsu|stock options|performance share plan)\b/i, "neu", "ESOP allotment"],
  [/\bagm\b|\bannual general meeting\b|\begm\b|\bpostal ballot\b/i, "neu", "AGM"],
  [/\brecord date\b|\bex-date\b|\bex-dividend\b|\bturning ex\b/i, "neu", "Record date"],
  [/\bboard (?:to )?(?:meet|meets|meeting)\b|\bboard meet\b|\bto consider\b/i, "neu", "Board meeting"],
  [/\b(?:results?|earnings) (?:date|schedule|scheduled|on \d|calendar)\b|\bschedules?\b[^;:]{0,40}\b(?:results?|earnings|call)\b|\b(?:earnings|analyst|investor|conference) call (?:date|scheduled|on)\b|\bcall scheduled\b|\bsets? (?:analyst|earnings|investor) call\b|\bresults? schedule\b/i, "neu", "Results date"],
  [/\bearnings call\b|\bconcall\b|\bcall transcript\b|\bcall highlights\b|\binvestor presentation\b|\bslides:|\b(?:q[1-4]\w*|fy\d+|h[12]|investor|earnings) (?:\w+ )?slides\b/i, "neu", "Earnings call"],
  [/\bappoint\w*|\bnames?\b[^;:]{0,30}\bas (?:new )?(?:ceo|md|cfo|chair\w*|director|head|president)\b|\btakes? charge\b|\bre-?designat\w+|\belevat\w+|\bjoins as\b|\bnew (?:ceo|md|cfo|chairman)\b|\b(?:ceo|md|cfo) pick\b/i, "neu", "Appointment"],
  [/\bacqui(?:re|res|red|sition|sitions)\b|\btakeover\b|\bbuyout\b|\bmerger\b|\bamalgamat\w+|\bdemerg\w+|\bopen offer\b|\bstake in\b/i, "neu", "Acquisition"],
  [/\bpartner(?:s|ship|ships|ed|ing)?\b|\bties? up\b|\btie-?ups?\b|\bjoins hands\b|\bmou\b|\bcollaborat\w+|\balliance\b|\bjoint venture\b|\bjv\b|\bsigns?\b[^;:]{0,30}\b(?:deal|agreement|pact)\b/i, "neu", "Partnership"],
  [/\bin line\b|\bin-line\b|\bflat\b|\bsteady\b|\bunchanged\b/i, "neu", "Results in line"],
  [/\breports? (?:earnings )?results\b|\b(?:q[1-4]\w*|quarterly|h[12]) (?:fy\d+ )?(?:net )?(?:results|earnings|numbers|update|review|profit|loss|revenue)\b|\bposts? [^;:]{0,40}\b(?:profit|revenue|income)\b|\bresults\b|\bearnings\b/i, "neu", "Results out"],
];

// Forward-looking results chatter ("PAT may rise 13%", "what to expect", "Q2 preview").
const PREVIEW = /\bpreview\b|\bwhat to expect\b|\bexpectations (?:ahead|for)\b|\blikely to\b|\b(?:may|could|might|seen to|set to|expected to|to likely) (?:rise|fall|see|report|post|grow|jump|decline|dip|surge|beat|miss)\b|\bahead of (?:its |the )?(?:q[1-4]|quarterly|results|earnings|board)\b|\bresults? (?:today|tomorrow)\b|\b(?:eyed|awaited|await)\b|\bpre-?quarter\b|\bpoll\b/i;

const DATA_PAGE = /\bdividend (?:history|dates|calendar|track record)\b|\brecord dates\b|\b(?:key )?financial ratios\b/i;
const NAME = String.raw`[A-Z][\w&.'-]*(?: [A-Z&][\w&.'-]*){0,3}`;
const SCREEN_LIST = new RegExp(String.raw`\b[Ss]tocks?\b[^:]*:\s*${NAME}(?:,\s*${NAME})+(?:,? (?:and|&) [Mm]ore)?\s*$`);
const NOT_ENOUGH = /\b(?:couldn'?t|could not|can'?t|cannot|fail(?:s|ed)? to|unable to|not enough to|insufficient to)\b[^;:]{0,25}\b(?:cover|offset|absorb|pass on|protect|cushion|lift|boost|help|aid|support|save)\b/i;
const NOT_YET = /\byet to (?:brighten|lift|boost|help|show|reflect|aid|support|pay off|translate|improve|revive|pick up)\b/i;
// Margin pressure stated on its own, with no reported number ("Margin pressures remain a headwind").
const MARGIN_PRESSURE = /\bmargin (?:pressures?|squeeze|headwinds?)\b|\bpressure on (?:\S+ ){0,3}margins?\b|\bsqueez\w* (?:\S+ ){0,3}margins?\b|\bheadwinds?\b/i;

// ---------------------------------------------------------------------------------------------
// Results scoring

// Split into clauses so "profit rises, revenue falls" binds each verb to its own metric.
const CLAUSE_SPLIT = /\s*[;|]\s*|,\s+|\s+[-–—]\s+|\s+(?:but|while|whereas|despite|though|although|as|amid|even as|after|with)\s+/i;
const TOKEN = /[+\-−–]?\d[\d,.]*%?|[\p{L}][\p{L}'’&-]*|[+\-−–]/gu;

type Hit = { metric: Metric | "beat" | "loss"; sign: 1 | -1; weight: number; reason: string };

function metricHits(clause: string): Hit[] {
  const hits: Hit[] = [];
  const taken: [number, number][] = [];
  const spans: { metric: Metric; start: number; end: number }[] = [];
  for (const [metric, re] of METRICS) {
    for (const m of clause.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (taken.some(([a, b]) => start < b && end > a)) continue;
      taken.push([start, end]);
      spans.push({ metric, start, end });
    }
  }
  spans.sort((a, b) => a.start - b.start);
  for (const [i, s] of spans.entries()) {
    let sign: 0 | 1 | -1 = 0;
    // Look ahead up to 6 tokens, stopping at the next metric (unless it is a list: "profit and revenue rise").
    const nextStart = spans[i + 1]?.start ?? clause.length;
    const after = clause.slice(s.end, nextStart);
    const tokens = after.match(TOKEN) ?? [];
    if (/^(?:call|calls|calendar|date|preview|season|guidance|outlook|estimates?|potential|opportunity|announcement|momentum)$/i.test(tokens[0] ?? "")) continue;
    for (const t of tokens.slice(0, 6)) {
      // "profit beat" is counted once, as a beat (see BEAT), not as a direction.
      if (/^beats?$/i.test(t)) break;
      if (UP_RE.test(t)) { sign = 1; break; }
      if (DOWN_RE.test(t)) { sign = -1; break; }
      if (/^(?:flat|steady|unchanged|stable|at|of|in line)$/i.test(t)) break;
    }
    if (!sign && spans[i + 1] && /^\s*(?:,|and|&)\s*$/i.test(after)) {
      // A list of metrics shares the verb after the last one.
      const tail = clause.slice(spans[i + 1].end).match(TOKEN) ?? [];
      for (const t of tail.slice(0, 6)) {
        if (UP_RE.test(t)) { sign = 1; break; }
        if (DOWN_RE.test(t)) { sign = -1; break; }
      }
    }
    if (!sign) {
      // Adjective in front: "higher Q2 profit", "lower Revlimid sales", "record EBITDA".
      const before = (clause.slice(0, s.start).match(TOKEN) ?? []).slice(-4);
      for (const t of before.reverse()) {
        if (PRE_UP.test(t)) { sign = 1; break; }
        if (PRE_DOWN.test(t)) { sign = -1; break; }
      }
      // A noun in front: "38% jump in Q2 net profit", "a fall in revenue".
      const lead = clause.slice(0, s.start);
      if (!sign && /\b(?:jump|rise|surge|growth|increase|spike|improvement)s? in (?:\S+ ){0,3}$/i.test(lead)) sign = 1;
      if (!sign && /\b(?:fall|drop|decline|dip|slump|plunge|contraction|slowdown)s? in (?:\S+ ){0,3}$/i.test(lead)) sign = -1;
    }
    if (!sign) {
      // "Revenue of ₹7,328 crore versus ₹5,760 crore": compare the two numbers.
      const vs = after.match(/^[^\d]{0,15}([\d,.]+)[^\d]{0,20}?\b(?:versus|vs\.?|against|from)\b[^\d]{0,15}([\d,.]+)/i);
      if (vs) {
        const a = Number(vs[1].replace(/,/g, ""));
        const b = Number(vs[2].replace(/,/g, ""));
        if (Number.isFinite(a) && Number.isFinite(b) && a !== b) sign = a > b ? 1 : -1;
      }
    }
    if (sign) hits.push({ metric: s.metric, sign, weight: WEIGHT[s.metric], reason: REASON[s.metric][sign > 0 ? 0 : 1] });
  }
  return hits;
}

const GROWTH_PCT = /\b\d[\d.]*%\s+(?:yoy |y-o-y |qoq |annual )?growth\b|\bgrowth of \d[\d.]*%/i;
const LOSS_NARROWS = /\b(?:loss(?:es)?|deficit)\b[^;:,]{0,30}\b(?:narrow\w*|shrinks?|shrank|reduc\w+|lower|declines?|falls?|eases?|trims?|cut)\b|\bnarrow(?:er|s|ed)? (?:\w+ )?loss(?:es)?\b|\b(?:cuts?|trims?|reduces?) (?:\w+ )?loss(?:es)?\b|\bloss reduction\b/i;
const LOSS_WIDENS = /\b(?:loss(?:es)?|deficit)\b[^;:,]{0,30}\b(?:widen\w*|deepen\w*|swell\w*|balloon\w*|jumps?|surges?|rises?|increases?|mounts?)\b|\bwider (?:\w+ )?loss(?:es)?\b/i;
const BACK_TO_PROFIT = /\b(?:returns?|swings?|swung|turns?|turned|bounces?|back) (?:to|in|into)? ?(?:a )?(?:net )?(?:profit|black)\b|\bturns? profitable\b|\bswings? to [^;:]{0,25}\bprofit\b|\bprofit\b[^;:]{0,40}\b(?:against|from|vs\.?|versus) (?:a )?(?:year-ago|year ago|yoy|last year's|loss)\b|\bfirst(?:-ever)? (?:quarterly |annual )?profit\b|\breturns? to profit\b/i;
const INTO_LOSS = /\b(?:swings?|slips?|slides?|turns?|plunges?) (?:in)?to (?:a )?(?:net )?loss\b|\b(?:posts?|reports?) (?:a )?(?:net )?loss\b|\bnet loss (?:at|of)\b|\bloss of (?:rs|₹|inr)\b/i;
const BEAT = /\bbeats?\b|\btops? (?:street |analyst |the )?(?:estimates|expectations|forecasts|consensus)\b|\b(?:above|ahead of|better than) (?:street |analyst )?(?:estimates|expectations|forecasts|consensus)\b|\bbetter-than-expected\b|\bsurpass\w*|\bstrong(?:er)? (?:q[1-4]|quarter|results|numbers|show|earnings|quarterly)\b|\bstellar (?:q[1-4]|quarter|results|show)\b|\brobust (?:q[1-4]|quarter|results)\b|\b(?:strong|solid|robust|stellar) performance\b|\b(?:q[1-4]|results?|quarter) upbeat\b|\bupbeat (?:q[1-4]|results?|quarter)\b/i;
const MISS = /\bmiss(?:es|ed)? (?:street |analyst )?(?:estimates|expectations|forecasts|consensus|eps|earnings|on)\b|\b(?:q[1-4]|results|earnings|eps|revenue|profit)\b[^;:]{0,20}\bmiss(?:es|ed)?\b|\b(?:below|short of|worse than) (?:street |analyst )?(?:estimates|expectations|forecasts|consensus)\b|\b(?:falls?|fell) short\b|\bworse-than-expected\b|\bweak (?:q[1-4]|quarter|results|numbers|show|earnings|quarterly)\b|\bdisappoint\w*\b|\bfails? to (?:cheer|impress)\b/i;
// Words that make a metric match about something other than this quarter's numbers.
const NOT_RESULTS = /\bytd\b|\byear-to-date\b|\bin 20\d\d\b(?! (?:q[1-4]|results))|\bcagr\b|\bfy\d\d-\d\d\b|\bby (?:fy|20)\d\d\b/i;

function scoreResults(h: string): ToneResult | null {
  const hits: Hit[] = [];
  if (BACK_TO_PROFIT.test(h)) hits.push({ metric: "loss", sign: 1, weight: 4, reason: "Returns to profit" });
  else if (LOSS_NARROWS.test(h)) hits.push({ metric: "loss", sign: 1, weight: 3, reason: "Loss narrows" });
  else if (LOSS_WIDENS.test(h)) hits.push({ metric: "loss", sign: -1, weight: 3, reason: "Loss widens" });
  else if (INTO_LOSS.test(h)) hits.push({ metric: "loss", sign: -1, weight: 3, reason: "Net loss" });
  if (BEAT.test(h)) hits.push({ metric: "beat", sign: 1, weight: 2, reason: /\bstrong|stellar|robust|solid|upbeat/i.test(h) && !/\bbeat|estimate|expectation|forecast/i.test(h) ? "Strong results" : "Results beat" });
  else if (MISS.test(h)) hits.push({ metric: "beat", sign: -1, weight: /\bmargins? miss/i.test(h) ? 1 : 2, reason: /\bweak|disappoint|fails? to/i.test(h) && !/\bmiss|estimate|expectation/i.test(h) ? "Weak results" : "Results miss" });

  if (GROWTH_PCT.test(h) && !NOT_RESULTS.test(h)) hits.push({ metric: "ops", sign: 1, weight: 1, reason: "Business growth" });
  const loss = hits.some((x) => x.metric === "loss");
  for (const clause of h.split(CLAUSE_SPLIT)) {
    if (!clause || NOT_RESULTS.test(clause)) continue;
    for (const hit of metricHits(clause)) {
      // "Net profit recovers ... from year-ago loss" is already counted as a return to profit.
      if (loss && hit.metric === "profit") continue;
      hits.push(hit);
    }
  }
  if (!hits.length) return null;

  const pos = hits.filter((x) => x.sign > 0);
  const neg = hits.filter((x) => x.sign < 0);
  const sum = (xs: Hit[]) => xs.reduce((a, x) => a + x.weight, 0);
  const p = sum(pos);
  const n = sum(neg);
  const top = (xs: Hit[]) => xs.reduce((a, x) => (x.weight > a.weight ? x : a)).reason;
  if (p && n) {
    if (p >= 2 * n) return r("pos", top(pos));
    if (n >= 2 * p) return r("neg", top(neg));
    return r("neu", "Mixed results");
  }
  return p ? r("pos", top(pos)) : r("neg", top(neg));
}

// ---------------------------------------------------------------------------------------------

function priceMove(text: string): ToneResult | null {
  const h = text.replace(new RegExp(SPECULATIVE.source + String.raw`[^;:,]*`, "gi"), "");
  // "23% below its 52-week high" is a distance, not a new high.
  const level = first(h.replace(/\bbelow (?:its |the )?(?:52-week|one-year|record|all-time) high\b|\babove (?:its |the )?(?:52-week|one-year) low\b/gi, ""), PRICE_LEVELS);
  if (level) return level;
  // Take whichever subject-bound move comes first in the headline.
  const m = h.match(PRICE_SUBJ);
  if (m) return m[1] ? r("neg", "Shares fall") : r("pos", "Shares rise");
  if (PRICE_STREAK_DOWN.test(h)) return r("neg", "Shares fall");
  if (PRICE_STREAK_UP.test(h)) return r("pos", "Shares rise");
  const pd = h.search(PRICE_PCT_DOWN);
  const pu = h.search(PRICE_PCT_UP);
  if (pd >= 0 || pu >= 0) return pd >= 0 && (pu < 0 || pd < pu) ? r("neg", "Shares fall") : r("pos", "Shares rise");
  return null;
}

/**
 * Tone of one company headline, from keywords in the headline alone (see the header comment for
 * the rule order). Always returns a tone; unknown headlines are amber "General update".
 */
export function classifyTone(headline: string): ToneResult {
  // Curly quotes as straight ones: real headlines arrive with 'Couldn’t', the rules are written with 'Couldn't'.
  const h = headline.replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ").trim();
  if (!h) return GENERAL;

  if (/\b(?:denies|denied|refutes?|clarif(?:ies|ied|ication)|dismisses (?:reports|rumou?rs)|no (?:financial|material) impact)\b/i.test(h) && !/\b(?:demand|penalty)\b[^;:]{0,30}\bcut\b/i.test(h)) return r("neu", "Clarification");

  // Standing data pages and stock screens ("Dividend History: ...", "Revenue Growth Stocks 2026:
  // Infosys, Asian Paints") describe a list, not news about the company.
  if (DATA_PAGE.test(h) || SCREEN_LIST.test(h)) return GENERAL;
  // A positive move that did not work: "price hikes couldn't cover higher costs".
  if (NOT_ENOUGH.test(h)) return r("neg", /\bmargins?\b/i.test(h) ? "Margin pressure" : "Costs up");
  if (NOT_YET.test(h)) return r("neu", "Yet to pay off");

  // Rating changes rank above the quarter: in "rating upgrade on stronger earnings" the upgrade is the news.
  const quick = first(h, RELIEF) ?? first(h, TROUBLE) ?? first(h, INDEX) ?? first(h, GUIDANCE) ?? (RATING_QUESTION.test(h) ? null : first(h, RATINGS));
  if (quick) return quick;

  // Explainers and comparisons phrased as a question ("Which stock will give the best dividend?").
  if ((/^(?:which|does|do|can|is|are|will|should|could|would|where|how much|how)\b/i.test(h) || /\b(?:which|vs\.?)\b/i.test(h)) && /\?\s*$/.test(h)) return GENERAL;

  const preview = PREVIEW.test(h) && !/\b(?:reports?|posts?|announces?|declares?)\b/i.test(h);
  // "Board meets on 27 Oct for results, dividend" schedules a dividend; it has not been declared.
  const scheduled = /\bboard (?:to )?(?:meet|meets|meeting)\b|\bboard meet\b|\bto consider\b|\bto decide\b/i.test(h);
  if (!preview) {
    const results = scoreResults(h);
    if (results) return results;
  }

  if (MARGIN_PRESSURE.test(h)) return r("neg", /\bmargin/i.test(h) ? "Margin pressure" : "Headwinds");

  if (EXIT_WORD.test(h)) {
    if (/\b(?:nominee|independent|non-executive|company secretary|compliance officer|government director|whole-time director|director \(\w+\))\b/i.test(h) || !EXIT_SENIOR.test(h)) return r("neu", "Board change");
    return r("neg", "Senior exit");
  }

  const event = first(h, STAKE) ?? first(h, ORDERS);
  if (event) return event;

  if (!RATING_QUESTION.test(h)) {
    // "Recommends buying X; advises selling Y": the call that comes first is about the headline's company.
    const sell = h.search(SELL_CALL);
    const buy = h.search(BUY_CALL);
    if (sell >= 0 && (buy < 0 || sell < buy)) return r("neg", "Sell rating");
    if (DOWNSIDE.test(h)) return r("neg", "Downside seen");
    const spec = h.match(SPECULATIVE);
    if (spec && !preview) return spec[1] ? r("pos", "Upside seen") : r("neg", "Downside seen");
    if (BUY_CALL.test(h)) return r("pos", "Buy rating");
    if (UPSIDE.test(h)) return r("pos", "Upside seen");
  }
  const target = first(h, TARGETS);
  if (target) return target;

  const fundraise = /\b(?:rights issue|qip|fund ?rais\w*|ncds?|preferential issue|ipo)\b/i.test(h);
  const action = (fundraise ? null : first(h, APPROVALS)) ?? (preview || scheduled ? null : first(h, CORPORATE)) ?? (fundraise ? first(h, CORPORATE.slice(-1)) : first(h, OPERATIONS));
  if (action) return action;

  const price = priceMove(h);
  if (price) return price;
  // Hold calls and unchanged targets are weaker than the day's move ("slips 4% as Nomura keeps 'neutral'").
  if (NEUTRAL_CALL.test(h)) return r("neu", "Neutral rating");
  if (TARGET_KEPT.test(h)) return r("neu", "Target unchanged");

  if (preview && /\b(?:q[1-4]|results?|earnings|quarter|dividend|profit|revenue|pat)\b/i.test(h)) return r("neu", "Results preview");

  const routine = first(h, ROUTINE);
  if (routine) return routine;

  // A bare move word counts only where it reads as a move: "slides Wednesday", "rebound even as ...".
  const bare = (re: RegExp) => new RegExp(String.raw`(?<!\b(?:into|business|the|of|in|a) )` + re.source + String.raw`(?=\s+(?:\d|on|after|as|despite|amid|even|today|in (?:early|late|trade)|\w+day)\b|\W*$)`, "i").test(h);
  const down = bare(PRICE_BARE_DOWN);
  const up = bare(PRICE_BARE_UP);
  if (down !== up) return down ? r("neg", "Shares fall") : r("pos", "Shares rise");
  return GENERAL;
}

/** Every reason string classifyTone can return, for UI legends and tests (plus "" for the plain amber fallback). */
export const TONE_REASONS: readonly string[] = [
  ...new Set([
    "Clarification", "Margin pressure", "Costs up", "Yet to pay off", "Headwinds", "Mixed results", "Returns to profit", "Loss narrows", "Loss widens", "Net loss",
    "Results beat", "Results miss", "Strong results", "Weak results", "Results preview",
    ...Object.values(REASON).flat(),
    "Senior exit", "Board change", "Sell rating", "Buy rating", "Neutral rating", "Target unchanged", "Upside seen", "Downside seen", "Shares rise", "Shares fall",
    ...[RELIEF, TROUBLE, INDEX, GUIDANCE, STAKE, ORDERS, RATINGS, TARGETS, APPROVALS, CORPORATE, OPERATIONS, PRICE_LEVELS, ROUTINE].flat().map(([, , reason]) => reason),
  ]),
];
