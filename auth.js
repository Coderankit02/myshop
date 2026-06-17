/* ============================================
   RINKU KIRANA — AUTH.JS
   Supabase Auth Logic (Shared)
   ============================================ */

// ── SUPABASE CONFIG ───────────────────────────
console.log("AUTH START");
const SUPABASE_URL     = 'https://pffaflasgwhydkmxwkky.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__tFDYhkM3blZ0pIVT0YxLA_YvkKq79L';
const { createClient } = window.supabase;

window.rkSupabase =
  window.rkSupabase ||
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const supabase = window.rkSupabase;

// ── SESSION HELPERS ───────────────────────────
async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function redirectIfLoggedIn() {
  const session = await getSession();
  if (session) window.location.href = '../index.html';
}

function saveUserLocal(user) {
  const meta = user.user_metadata || {};
  const profile = {
    uid:   user.id,
    email: user.email,
    name:  meta.name || user.email.split('@')[0],
    avatar: meta.avatar_url || null,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem('rk_user', JSON.stringify(profile));
  } catch(e) {}
  return profile;
}

function getUserLocal() {
  try {
    const raw = localStorage.getItem('rk_user');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function clearUserLocal() {
  localStorage.removeItem('rk_user');
}

// ── UI HELPERS ────────────────────────────────
function showMsg(el, type, html) {
  if (!el) return;
  el.className = `msg-box ${type}`;
  el.innerHTML = `<span class="msg-icon">${type === 'error' ? '⚠️' : '✅'}</span><span>${html}</span>`;
  el.style.display = 'flex';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideMsg(el) {
  if (el) el.style.display = 'none';
}

function setLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.innerHTML = `<span class="spinner"></span> Ek second…`;
  } else {
    btn.innerHTML = label;
  }
}

function togglePass(inputId, btnEl) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  if (btnEl) btnEl.textContent = isText ? '👁️' : '🙈';
}

// ── PASSWORD STRENGTH ─────────────────────────
function getStrength(pw) {
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function updateStrengthUI(pw, segs, label) {
  if (!segs || !label) return;
  const score = getStrength(pw);
  const colors = ['#E2E8F0','#E63946','#FF6B35','#FFB800','#1BA672','#0EA86A'];
  const labels = ['','Bahut kamzor','Kamzor','Theek hai','Achha','Bahut achha'];
  const labelColors = ['','#E63946','#FF6B35','#FFB800','#1BA672','#0EA86A'];
  segs.forEach((s, i) => {
    s.style.background = i < score ? colors[score] : '#E2E8F0';
  });
  label.textContent = pw.length ? labels[score] || '' : '';
  label.style.color = labelColors[score] || '#94A3B8';
}

// ── SUPABASE AUTH FUNCTIONS ───────────────────

async function doSignup({ name, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: name.trim() },
    },
  });
  return { data, error };
}

async function doLogin({ email, password, remember }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error && data.user) {
    const profile = saveUserLocal(data.user);
    if (!remember) {
      // Still save, but mark as session-only
      profile.sessionOnly = true;
      localStorage.setItem('rk_user', JSON.stringify(profile));
    }
  }
  return { data, error };
}

async function doForgotPassword(email) {
  const redirectUrl = window.location.origin + '/auth/login.html';
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  return { error };
}

// Friendly error messages
function friendlyError(err) {
  if (!err) return '';
  const msg = err.message || '';
  if (msg.includes('User already registered') || msg.includes('already registered'))
    return 'Yeh email pehle se registered hai! <a href="login.html">Login karein →</a>';
  if (msg.includes('Invalid login credentials'))
    return 'Email ya password galat hai. Dobara try karein.';
  if (msg.includes('Email not confirmed'))
    return 'Pehle email verify karein. Inbox check karein.';
  if (msg.includes('rate limit') || msg.includes('Too many'))
    return 'Zyada try kiya. 1 minute baad dobara karein.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Network error. Internet check karein.';
  if (msg.includes('Password should be'))
    return 'Password kam se kam 6 characters ka hona chahiye.';
  return msg || 'Kuch error hua. Dobara try karein.';
}

// ── EXPORT (for modules) or GLOBAL ───────────
window.RKAuth = {
  supabase,
  getSession,
  redirectIfLoggedIn,
  saveUserLocal,
  getUserLocal,
  clearUserLocal,
  showMsg,
  hideMsg,
  setLoading,
  togglePass,
  getStrength,
  updateStrengthUI,
  doSignup,
  doLogin,
  doForgotPassword,
  friendlyError,
};
console.log("AUTH START");
