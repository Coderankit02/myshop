# Module 11 — Testing + Cleanup + Deploy

## 1. Protected selectors — verified intact ✅
Cross-checked every ID/class from the risk analysis (`#addr-*`, `#af_*`,
`#ananya-*`, `.bottom-nav`, `.total-row`, `.co-card .addr-card`, etc.)
against every `.html`, `.jsx`, and `public/js/*.js` file. All 34 are still
present somewhere in the markup — none were accidentally removed across
Modules 0–10.

## 2. CSS cleanup — candidates found, NOT auto-deleted
Ran a static reference check: every class *defined* in `account.css` /
`auth.css` vs. every class *used* across all `.html`/`.jsx`/`public/js/*.js`.

- **`auth.css`** — 0 unused classes. Login/signup still use it directly
  (Module 7 wasn't converted to Tailwind in this build), so nothing to
  clean here.
- **`account.css`** — **141 of 168 classes** now appear unused. This
  matches what Module 9's own file comment already flagged: AccountPage.jsx
  was fully rewritten in Tailwind utilities, so most of the old
  hand-written `account.css` (hero, tabs, order rows, wishlist rows,
  settings rows, modals, etc.) is now dead weight — nothing renders it.
  Full list is in `account-css-unused-candidates.txt` (included in this
  zip) so you can eyeball it before deleting.

**Why I didn't delete them outright:** I don't have a live browser here to
actually render the pages and visually confirm nothing depends on these
classes (e.g. a dynamically-built class string I couldn't `grep` for, or
a leftover admin/legacy view). Static text-matching is a strong signal but
not 100% proof. Recommend: do one visual pass through Account (all tabs,
mobile + desktop) after deploying, then delete the flagged block from
`account.css` in one commit so it's easy to revert if something breaks.

## 3. Manual QA checklist (run through before/after deploy)

**Auth**
- [ ] Signup → email verify → login
- [ ] Login with existing account, wrong password error shows correctly
- [ ] Forgot password → reset flow

**Shop / Home / PDP**
- [ ] Categories, banners, product grid load with live Supabase data
- [ ] Product detail → qty selector, add to cart, related products

**Cart & Checkout**
- [ ] Add/remove items, cart persists across reload
- [ ] Address save (`#addr-*` / `#af_*` fields) — both add-new and edit
- [ ] Delivery slot selection, UPI/QR payment card renders
- [ ] Order places successfully, confirmation shows

**Account (Module 9)**
- [ ] Desktop: sidebar layout renders; Mobile: tab strip renders
- [ ] Order history + tracking, addresses, wallet, wishlist, rewards,
      refer & earn, settings — each tab loads real data
- [ ] Avatar upload still works (Cloudinary)

**Extras (Module 10)**
- [ ] Dark mode toggle flips theme app-wide, persists on reload
- [ ] PWA install banner (Android/Chrome) + iOS "Add to Home Screen" sheet
      — check both light and dark mode
- [ ] Ananya AI widget opens/closes, sends a message, FAQ tab works

**PWA / Cache**
- [ ] `CACHE_VERSION` bumped to `v8` in `public/service-worker.js` ✅ (done)
- [ ] After deploy, hard-refresh or wait for the "Naya version available"
      update banner to confirm the service worker picked up the new cache

## 4. Deploy
- `vercel.json` already configured (`buildCommand: npm run build`,
  `outputDirectory: dist`) — no changes needed.
- Confirm env vars are still set in the Vercel dashboard:
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.
- Push → Vercel builds → do the QA checklist above against the preview URL
  before promoting to production.
