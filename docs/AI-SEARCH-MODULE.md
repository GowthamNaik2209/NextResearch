# AI search module (parked)

Status: **parked on 27 Oct 2026** at the owner's request, not on main or staging. It lives on branch
`claude/ask-ai-search`. To pick it up again, merge that branch into a fresh branch from main (see
"Turning it back on").

## What it does

- **"Ask NextResearch" chat button** (bottom right of every page): opens on hover or tap with 3-5
  suggested questions for the page, answered from our own content and the company table. A question
  box under them takes any question.
- **AI answers**: signed-in readers get an answer written by an open model on Groq (gpt-oss-120b) from
  the fact lines of the pages the question names. The answer is kept only if every number in it is
  in those facts; otherwise, or over Groq's free limit, the reader gets those pages' own text.
  Signed-out readers always get the pages' own text (no model call) and a "Log in" link.
- **Landing search box as AI search**: as you type, it suggests questions and the pages your words
  point to (companies, themes, IPOs, help topics), with no model call: instant and free. A typed
  question gets an "Ask AI" row; picking any suggestion opens the panel with the answer.
- **Help guide**: how baskets, projections, weightings, rebalancing, the watchlist, the 3D map, reports
  and IPO decks work, in the site's own words, so "how do projections work?" gets a real answer.

## Files

| File | Role |
|---|---|
| `src/lib/assistant/index.ts` | Each page's suggested questions and code-written answers (from the original assistant). |
| `src/lib/assistant/ai.ts` | Optional rewording of a suggested answer (gpt-oss-20b), number check. |
| `src/lib/assistant/ask.ts` | Typed questions: which pages a question names (`findKeys`), facts for the model, answer checks, fallback. |
| `src/lib/assistant/guide.ts` | Help topics (how the site works), with numbers from the same constants the pages use. |
| `src/lib/assistant/suggest.ts` | Search-box suggestions (questions + pages), no model call. |
| `src/lib/llm/groq.ts` | Groq client (plain fetch, OpenAI-compatible): rate-limit waits, page splitting. |
| `src/app/api/assistant/route.ts` | A page's suggested questions / one answer (CDN-cached). |
| `src/app/api/assistant/ask/route.ts` | GET `{ signedIn, ai }`; POST a typed question (burst limit 6 a minute). |
| `src/app/api/assistant/suggest/route.ts` | Search-box suggestions (CDN-cached). |
| `src/components/AssistantWidget.tsx` | The button and panel (mounted in `src/app/layout.tsx`). |
| `src/components/HeroSearch.tsx` | Landing search box with the Ask AI row and suggestions. |
| `*.test.ts` next to them | Matching, reply parsing, number grouping, guide routing. |

## Decisions made with the owner

- Typed AI answers for **signed-in readers only**; signed-out readers get our pages' own answers.
- **No per-reader daily cap** yet (a 6-a-minute burst guard only).
- The chat button **opens on hover** (mouse) or tap, and the **landing search box doubles as AI search**.

## What we learned

- Groq free plan (this account): gpt-oss-120b / gpt-oss-20b / qwen3.8-27b; **llama-3.1-8b-instant is
  not offered**. Limits 8K tokens a minute, 200K a day per model: roughly 50-70 fresh AI answers a day
  for everyone together; identical questions are cached for 6 hours.
- The 20B model got comparisons wrong (called 0.9% "lower" than 0.7%); typed questions use the 120B.
- Indian digit grouping (3,19,944) made the model misread which figure was larger: it gets thousands
  grouping and its answer is converted back.
- Groq's strict JSON mode sometimes fails server-side; replies are plain text with a "Sources:" line.

## Open items when it comes back

1. Add `GROQ_API_KEY` in Vercel (Production + Preview) and redeploy. It was not active on staging when
   the module was parked.
2. Re-run the neutral QA pass on the newest pieces (search suggestions, sparkle icon, help guide): the
   first pass covered the earlier version.
3. Not done from QA: the IPO deck covers the button; "hal" also matches "Mohali" in the search box.
4. A daily cap per reader, if usage grows (needs a DB table).

## Turning it back on

```bash
git fetch origin
git checkout -b ai-search-revival origin/main
git merge origin/claude/ask-ai-search
```

Then fix any conflicts, run `npx tsc --noEmit -p .`, `npm test`, `next build`, the neutral QA pass,
and release through staging as usual.
