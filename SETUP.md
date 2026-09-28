# Setup: Supabase project (auth + Postgres)

Needed for login/signup to actually work, and eventually as the real database
(local dev can use `npx prisma dev` instead — see README.md).

## 1. Create the project

1. Go to https://supabase.com/dashboard and sign in (or create an account).
2. **New project** — pick an org, name it (e.g. `nextresearch`), set a database
   password (save it somewhere — you'll need it for `DATABASE_URL`), pick a region
   close to your users (e.g. Mumbai/Singapore for India).
3. Wait ~2 minutes for it to provision.

## 2. Auth values → `.env.local`

The sidebar label for this moves around between Supabase dashboard versions
("API", "Data API", "API Keys"), so the reliable way to get there:

1. Open your project so the URL bar shows
   `https://supabase.com/dashboard/project/`**`<something>`**`/...` — that
   `<something>` (a random string of letters/numbers) is your project ref.
2. Go directly to:
   `https://supabase.com/dashboard/project/<your-project-ref>/settings/api`
   (paste your actual ref in place of `<your-project-ref>`).
3. If the sidebar has a working link instead, it's the ⚙️ gear icon near the
   bottom-left ("Project Settings") → **API** / **API Keys** in the settings menu.

On that page:

- **Project URL** (`https://xxxxx.supabase.co`) → `NEXT_PUBLIC_SUPABASE_URL`
- **Project API keys** → the row labeled `anon` `public` (a long string starting
  `eyJ...`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Don't use `service_role` for
  this — that key is secret/server-only and not used anywhere in this app yet.

## 3. Database connection → `.env`

**Settings → Database → Connection string → Transaction pooler** (port 6543,
`?pgbouncer=true`) — this is the one to use from a serverless/Next.js environment,
not the direct connection. Paste it as `DATABASE_URL` in `.env` (not `.env.local` —
Prisma only reads `.env`), with the database password you set in step 1.

## 4. Enable Google sign-in (optional)

**Authentication → Providers → Google** in the dashboard:

1. You need a Google Cloud OAuth client (console.cloud.google.com → APIs & Services
   → Credentials → Create OAuth client ID → Web application). Add Supabase's
   callback URL (shown on the Providers page) as an authorized redirect URI.
2. Paste the Google client ID + secret into Supabase's Google provider settings and
   toggle it on.

If you skip this, email/password sign-in still works — the "Continue with Google"
button will just error until this is done.

## 5. Turn off email confirmation (recommended for now)

**Authentication → Providers → Email → Confirm email** — turn this off while
testing locally, so signup logs you in immediately instead of needing a real email
round-trip (the code already handles both cases either way).

## 6. Apply the schema and seed data

```bash
npx prisma migrate dev
npm run db:seed
```

## Razorpay (later — Step 4, billing)

Not needed yet. When we get there: create a Razorpay account, get test-mode API
keys from the dashboard, and I'll wire up `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
/ `RAZORPAY_WEBHOOK_SECRET`.
