# Module 10 — Extras (Dark Mode, PWA, Ananya AI)

**Scope followed:** styling/token alignment only. No functionality, IDs, classes,
Supabase calls, or JS logic touched.

## What was already done (found while auditing, before this module)
- Dark mode toggle button (header) and its Sun/Moon icon — already wired to
  `var(--primary)`/`var(--primary-dark)`, already on the new palette.
- Full dark-mode CSS variable set (`html[data-theme="dark"]{...}`) — already
  present in `index.html`, `account.css`, `auth.css`.
- `ananya-ai.css` brand colors (`--an-primary`, `--an-accent`) — already
  matched to `#16A34A` / `#FF9933`.

## What this module actually changed

### `public/pwa.css`
1. `--rk-pwa-primary` now derives from `var(--primary)` instead of a
   hardcoded hex, so it can never drift from the token again.
2. **Fixed a real bug**: the skeleton loaders and part of the install-banner
   dark styling used `@media (prefers-color-scheme: ...)`, which follows the
   *OS* setting — but this app's dark mode is a manual toggle
   (`html[data-theme="dark"]`), per Module 1's rule. That meant a user could
   toggle the app to light mode while their OS was dark and still see dark
   skeleton shimmers / a flipped install banner. Replaced with
   `var(--border)` / `var(--light)` (skeletons) and removed the duplicate
   `prefers-color-scheme` block for the install banner — both now follow the
   in-app toggle only, like everything else on the site.
3. The iOS "Add to Home Screen" bottom sheet was hardcoded white/black in
   both themes. Now uses `var(--card-bg)` / `var(--dark)` / `var(--gray)`,
   so it respects dark mode too.

### `public/css/ananya-ai.css`
- The floating trigger button's gradient used its own approximate hex pair
  (`#1BA672, #FFB800`) in two places, and a third place referenced
  `var(--an-primary, #1BA672)` / `var(--an-accent, #FFB800)` — fallback
  values that didn't even match the real token values (`#16A34A` /
  `#FF9933`) defined a few lines above in the same file. All three now read
  `var(--an-primary)` / `var(--an-accent)` (with correct fallbacks), so the
  trigger button, its pulse ring, and the tab-bar accent all resolve to the
  exact same green/saffron as the rest of the site — and will move together
  automatically if the tokens ever change.
- WhatsApp-style bubble colors (`#25D366`, `#DCF8C6`, `#ECE5DD`, etc.) were
  left untouched — that's the intentional "WhatsApp-style Chat" skin stated
  in the file header, not part of the site's brand palette.

## Not touched (by design)
- `ananya-ai.js` — pure DOM logic, builds markup dynamically; no markup
  lives in HTML for this module to restyle in place, and none of the
  protected IDs (`#ananya-*`) were touched.
- Service worker (`service-worker.js`) — no visual surface, no changes.
- `manifest.json` — icons/theme_color untouched (out of scope; flag
  separately if you want the manifest's `theme_color` re-checked against
  the new palette).

## Manual check before merging
- [ ] Toggle dark mode → confirm install banner, iOS sheet, and any
      skeleton loaders flip correctly.
- [ ] Trigger the Ananya AI widget → trigger button + header gradient look
      the same as before (should be visually identical, just token-driven).
- [ ] Trigger PWA install banner on Android/Chrome + the iOS "Add to Home
      Screen" sheet on Safari (or emulate) → check both themes.
