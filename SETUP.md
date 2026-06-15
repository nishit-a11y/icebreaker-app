# IceBreak — Setup & Deploy Guide

## What's built

Full-stack SaaS icebreaker platform. Everything is in this folder.

```
app/
  page.tsx                    ← Landing page (hero, pricing teaser)
  layout.tsx                  ← Root layout with Clerk provider
  join/page.tsx               ← Player join page (code + random name)
  host/
    page.tsx                  ← Host dashboard (pick a game)
    [roomCode]/
      page.tsx                ← Host lobby (live participant list, start button)
      game/page.tsx           ← Host game view (drives the session)
  room/[roomCode]/
    page.tsx                  ← Player waiting room
    play/page.tsx             ← Player game view
  admin/page.tsx              ← ThoughtBulb super admin
  api/
    rooms/route.ts            ← Create / fetch rooms
    participants/route.ts     ← Join room
    games/start/route.ts      ← Start a game session
    stripe/
      checkout/route.ts       ← Create Stripe checkout session
      webhook/route.ts        ← Handle plan upgrades/cancellations

components/games/
  GameRouter.tsx              ← Picks engine from game config
  SubmitRevealEngine.tsx      ← Two Truths, Hot Take, Worst Advice, Finish Sentence
  VoteEngine.tsx              ← Would You Rather, GIF Battle
  RoundRobinEngine.tsx        ← Hot Seat, Recommendation Round

lib/
  supabase.ts                 ← Browser + admin Supabase clients
  games.ts                    ← All 10 game configs (engine + fields + plan gating)
  names.ts                    ← Random name + room code generators

types/index.ts                ← TypeScript types
middleware.ts                 ← Clerk: protects /host and /admin routes
supabase-schema.sql           ← Run this ONCE in Supabase SQL editor
```

---

## Step 1 — Install dependencies

Open your terminal, cd into this folder, then:

```bash
npm install
```

---

## Step 2 — Create accounts (all free tiers work)

| Service | What for | URL |
|---------|----------|-----|
| Supabase | Database + realtime | supabase.com |
| Clerk | Host authentication | clerk.com |
| Stripe | Subscriptions | stripe.com |
| Vercel | Deployment | vercel.com |

---

## Step 3 — Supabase setup

1. Create a new project at supabase.com
2. Go to **SQL Editor** → paste the entire contents of `supabase-schema.sql` → Run
3. Go to **Project Settings → API**
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 4 — Clerk setup

1. Create a new app at clerk.com
2. Choose: Email + Google sign-in
3. Copy from **API Keys**:
   - Publishable key → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Secret key → `CLERK_SECRET_KEY`

---

## Step 5 — Stripe setup

1. Create a new product at stripe.com called "IceBreak Team" 
2. Create a recurring price: $29/month → copy Price ID → `STRIPE_TEAM_PRICE_ID`
3. Create another product "IceBreak Pro", $79/month → `STRIPE_PRO_PRICE_ID`
4. From API Keys: copy Secret key → `STRIPE_SECRET_KEY` and Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
5. For webhooks (do this AFTER deploying to Vercel):
   - Add endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Listen to: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`

---

## Step 6 — Fill in .env.local

Open `.env.local` in this folder and fill in all values from above.

---

## Step 7 — Run locally

```bash
npm run dev
```

Open http://localhost:3000

Test flow:
1. Go to /join → enter any code → you get a random name → waiting room ✓
2. Go to /host → creates need a Clerk account → pick game → create session → lobby ✓

---

## Step 8 — Deploy to Vercel

```bash
# If Vercel CLI not installed:
npm install -g vercel

vercel
```

Or: push to GitHub → connect repo in Vercel dashboard → add all env vars in Vercel → Deploy.

After deploy, add your production URL's webhook to Stripe (Step 5).

---

## Adding more games

Edit `lib/games.ts` — add a new entry to the `GAMES` array:

```typescript
{
  id: 'my-new-game',
  name: 'My New Game',
  engine: 'submit-reveal',   // one of 4 engines
  plans: ['team', 'pro'],
  // ...
}
```

No new backend code needed. The engine handles it.

---

## Super admin

Go to `/admin` while signed in as `nishit@thethoughtbulb.com` to see:
- Total rooms, active sessions, player count
- Plan breakdown (free/team/pro)
- Recent room log

---

## Routes summary

| URL | Who sees it |
|-----|-------------|
| `/` | Everyone (landing) |
| `/join` | Players |
| `/room/WOLF-42` | Players (waiting) |
| `/room/WOLF-42/play` | Players (in-game) |
| `/host` | Hosts (Clerk auth required) |
| `/host/WOLF-42` | Hosts (lobby) |
| `/host/WOLF-42/game` | Hosts (in-game) |
| `/admin` | nishit@thethoughtbulb.com only |
| `/sign-in` `/sign-up` | Clerk hosted pages |
