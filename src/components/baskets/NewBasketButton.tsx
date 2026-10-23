// What to tell someone whose new basket wasn't made. (Every "start from" button now opens the
// unsaved draft on Create basket instead of saving a basket first, so only this message is left.)
export function basketCreateError(json: { error?: string; max?: number } | null): string {
  return json?.error === "limit"
    ? `You have ${json.max ?? "the most"} baskets, the limit. Delete one to make another.`
    : "Couldn\u2019t create it right now. Try again.";
}
