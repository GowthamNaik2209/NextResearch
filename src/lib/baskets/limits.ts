// Basket limits, in a module of their own so the browser (the stock picker) can read them without
// pulling in the content and financials that industry.ts loads.

/** Upper bound on a saved basket (the largest industry, real estate, has 57). */
export const MAX_BASKET_STOCKS = 75;
/** Saved baskets one account may keep. */
export const MAX_BASKETS_PER_USER = 50;
