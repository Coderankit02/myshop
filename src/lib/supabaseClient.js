import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL='https://pffaflasgwhydkmxwkky.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable__tFDYhkM3blZ0pIVT0YxLA_YvkKq79L';
// Reuse an existing client if one was already created on this page (avoids
// duplicate Supabase clients / duplicate realtime subscriptions).
export const supabase=window.sb||createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
window.sb=supabase;
