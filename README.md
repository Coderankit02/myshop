# myshop — Vite MPA (Multi-Page App)

Original `myshop` (vanilla HTML/CSS/JS + in-browser Babel React) ko **Vite MPA** mein convert kiya gaya hai. Functionality, design, backend connections — sab kuch 100% same hai. Sirf structure modular + properly bundled ho gaya hai.

## Kya badla
- `index.html` ka `<script type="text/babel">` block (1430+ lines, sab kuch ek jagah) ko proper React modules mein toda gaya: `src/App.jsx`, `src/hooks/`, `src/components/`, `src/lib/`.
- CDN se load ho rahe React/ReactDOM/Babel/Supabase-js scripts hata diye — ab npm packages (`react`, `react-dom`, `@supabase/supabase-js`) se Vite bundle karta hai.
- `account.html`, `login.html`, `signup.html`, `forgot-password.html`, `reset-password.html`, `email-verified.html`, `offline.html` — yeh sab **bilkul untouched** hain (byte-for-byte identical), kyunki yeh already vanilla JS the.
- Saare static assets (`js/`, `css/`, `icons/`, `images/`, `manifest.json`, `service-worker.js`, `pwa.js`, `auth.js`, `auth.css`, etc.) `public/` folder mein move kiye gaye — bilkul same content, sirf Vite convention ke hisaab se location.
- `api/chat.js` (Vercel serverless function / Ananya AI backend) — bilkul untouched.

## Setup

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Deploy (Vercel)
`vercel.json` already configured: `buildCommand: npm run build`, `outputDirectory: dist`. Environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`) Vercel dashboard mein set karein — `.env.example` dekhein.

## Project Structure
```
index.html              # React home page entry (Vite + React)
account.html, login.html, ... # vanilla pages (untouched)
src/
  main.jsx              # React entry point
  App.jsx               # main Home page component (same logic as original)
  hooks/dataHooks.js     # useCategories, useBanners, useProducts, useSearch
  components/           # PCard, ProductDetail, CheckoutForm, UpiPayCard, etc.
  lib/                  # supabaseClient.js, helpers.js
public/                 # all static assets (js/, css/, icons/, images/, manifest, sw, etc.)
api/chat.js             # Ananya AI serverless backend (untouched)
vite.config.js          # multi-page (MPA) entry configuration
```
