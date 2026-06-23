import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = 'https://pffaflasgwhydkmxwkky.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__tFDYhkM3blZ0pIVT0YxLA_YvkKq79L';

// Reuse existing client if already created (avoids duplicate realtime subscriptions)
export const supabase = window.sb || createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Expose on window so vanilla JS scripts (cart.js, profile.js, ananya-ai.js) can find it
window.sb         = supabase;
window.supabase   = supabase;   // ananya-ai.js checks window.supabase
window.supabaseJs = supabase;   // fallback alias also used by ananya-ai.js
