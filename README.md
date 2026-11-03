# Holidays Made Simple

Taylor's 2026 holiday guide: a one-page shopping app from the gift guide PDF, with holiday sales you manage yourself and a private click dashboard. No build step. GitHub Pages serves this folder.

The name on the home screen is **Holidays**.

## Turn on holiday sales + click tracking (about 10 minutes, one time)

1. **Make a Supabase project** (or use an existing one) at supabase.com.
2. **Run the setup.** Open SQL Editor > New query. Paste all of `supabase-setup.sql`. Before you click Run, change the email on the `insert into public.admins` line if you'll sign in with a different email than taylor@swapsmadesimple.com. Then click Run.
3. **Make your login.** Authentication > Users > Add user > Create new user. Use that same email and a password. Tick "Auto confirm user".
4. **Connect the app.** Project Settings > API. Copy the Project URL and the `anon` `public` key into `CONFIG` at the top of the `<script>` in `index.html`:
   ```js
   SUPABASE_URL: 'https://xxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJ...',
   ```
   The anon key is meant to be public. The security rules in the setup file are what protect your data.
5. **Push to GitHub.** Pages serves it, e.g. at `gifts.swapsmadesimple.com`.

## Your dashboard
Go to `your-site/#admin` (bookmark it, and add it to your phone's home screen). It isn't linked anywhere in the app.
- **Holiday sales tab:** add a sale with the brand, the deal, a link, and optionally a code, a note, start/end dates, and "tay's pick" to show it first. Sales go live on their start date and drop off the day after they end. You can edit, hide or delete any sale.
- **Clicks tab:** visitors, shop taps, gift views, sale taps, saves and list signups for today / 7 days / 30 days / all time. It also shows shop taps by day, your most shopped / viewed / saved gifts, which sales get tapped, which codes get copied, and what people pick in the quiz.

Visitors can only *add* taps. They can never read them, and they only ever see live sales.

## Files
- `index.html`: the whole app. Gift data is inlined near the top of the script as `GIFTS` and `CODES`.
- `img/`: product photos (transparent .webp pulled from the PDF), named by gift id. Old .jpg files from version 1 aren't used.
- `art/`: the guide's own artwork (gold 2026, glitter, trees, gift box, stocking, deer, cone, spiral tree).
- `supabase-setup.sql`: the tables, security rules and stats function.
- `gifts.json`, `codes.json`: the same data as separate files.

## Gift fields
`id`, `s` (section), `g` (group), `n` (name), `u` (shop link), `w` (who it's for), `v` (vibe for the quiz + basket builder).
Optional: `gd` ("girl" or "boy" for the few gender-specific kid/teen gifts. Leave it off and the gift shows for both), `price` (turns on totals), `why` (1-2 line "why it's a better swap"), `new` (true/false).

## Tay's notes
Add `"tn": "your note here"` to any gift in `gifts.json` (and in the `GIFTS` data inside index.html) to give it a "tay's pick ♥" sticker in the grid and your handwritten-style note in the gift popup. "Tay's picks first" sorting uses these. The current notes come from the top picks page of your PDF.

## Home screen
`manifest.webmanifest` and `icons/` let people add the guide to their home screen as an app. A welcome walkthrough shows on someone's first visit, and the footer link "add this guide to your home screen" reopens it.

## If you already ran the Supabase setup
Run `supabase-setup.sql` again (it's safe to re-run). It now also accepts swipe-mode skips and home screen installs, which show on your dashboard.

## Holiday prep
Gifts in the Holiday Scents, Holiday Treats and Holiday Fun sections (candles, cocoa, candy canes, matching pajamas, ornament kits, advent calendars) show only on the holiday prep page (`#traditions`), not in gift browsing, the quiz, swipe mode or the builders. To change which sections count as prep, edit `PREP_SECTIONS` in index.html.

## 24 days of simple swaps (advent)
Nov 23 to Dec 16 (Thanksgiving week through the shipping cutoffs). The days live in the `ADVENT` list near the middle of the script in index.html: each has a date, a type (swap / magic / gift), a title, the text, and optionally a featured gift id, a swap ("instead of" / "try"), buttons, and a `code`. Days marked `needs:` still need something from you before they go live (Nov 30 + Dec 10 codes, Dec 6 toxin audit link). To check every door before Nov 23, open your dashboard (`#admin`) > clicks tab > "unlock all doors" (this only affects your own device). Door opens show on your dashboard.

Morning alerts are phone notifications, not email. Someone adds the guide to their home screen, opens it from that icon, and taps **notify me each morning**. No account. The phone address is saved on the existing Hearthkeep Supabase project, in `guide_push_subscriptions`, separate from the vault. At 8am Pacific a scheduled job calls the `guide-send-push` edge function, which pings every saved phone with that day's door. Setup lives in `supabase/guide-push.sql` (run once on the Hearthkeep project) and `supabase/functions/guide-send-push`. On iPhone the alert only arrives if they allowed notifications from the home-screen icon.

## Still to hook up
- `FLODESK_FORM` in CONFIG: the "my list" email gate saves emails in the visitor's browser until this is connected.
