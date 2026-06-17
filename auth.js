/* ============================================
   RINKU KIRANA — AUTH.JS  (FIXED VERSION)
   Supabase Auth Logic (Shared) — Safe Singleton
   ============================================ */
(function () {
  "use strict";

  // ── Guard: agar script kisi reason se dobara execute ho
  // (stale cache / duplicate <script> tag waghera), to dobara
  // setup na ho. Sab kuch IIFE ke andar hai isliye `const`
  // kabhi global scope me clash nahi karega.
  if (window.__RK_AUTH_INITIALIZED__) {
    return;
  }
  window.__RK_AUTH_INITIALIZED__ = true;

  // ── SUPABASE CONFIG ───────────────────────────
  var SUPABASE_URL = "https://pffaflasgwhydkmxwkky.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable__tFDYhkM3blZ0pIVT0YxLA_YvkKq79L";
  // Note: "sb_publishable_" is Supabase's current key prefix (replaces the
  // old JWT anon key). The random portion after it just happens to start
  // with "_" — that's normal, not a typo. Confirm against Settings > API
  // if you ever see auth calls fail with an invalid-key error.

  if (!window.supabase || !window.supabase.createClient) {
    console.error(
      "[RKAuth] @supabase/supabase-js load nahi hui. Check karein ki " +
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2 script " +
        "auth.js se PEHLE load ho rahi hai."
    );
    return;
  }

  var createClient = window.supabase.createClient;

  // Singleton client
  window.rkSupabase =
    window.rkSupabase || createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  var supabase = window.rkSupabase;

  // ── SESSION HELPERS ───────────────────────────
  async function getSession() {
    var res = await supabase.auth.getSession();
    return res.data.session;
  }

  async function redirectIfLoggedIn() {
    var session = await getSession();
    if (session) window.location.href = "index.html";
  }

  function saveUserLocal(user) {
    var meta = user.user_metadata || {};
    var profile = {
      uid: user.id,
      email: user.email,
      name: meta.name || user.email.split("@")[0],
      avatar: meta.avatar_url || null,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem("rk_user", JSON.stringify(profile));
    } catch (e) {}
    return profile;
  }

  function getUserLocal() {
    try {
      var raw = localStorage.getItem("rk_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearUserLocal() {
    localStorage.removeItem("rk_user");
  }

  // ── UI HELPERS ────────────────────────────────
  function showMsg(el, type, html) {
    if (!el) return;
    el.className = "msg-box " + type;
    el.innerHTML =
      '<span class="msg-icon">' +
      (type === "error" ? "⚠️" : "✅") +
      "</span><span>" +
      html +
      "</span>";
    el.style.display = "flex";
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideMsg(el) {
    if (el) el.style.display = "none";
  }

  function setLoading(btn, loading, label) {
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.innerHTML = '<span class="spinner"></span> Ek second…';
    } else {
      btn.innerHTML = label;
    }
  }

  function togglePass(inputId, btnEl) {
    var inp = document.getElementById(inputId);
    if (!inp) return;
    var isText = inp.type === "text";
    inp.type = isText ? "password" : "text";
    if (btnEl) btnEl.textContent = isText ? "👁️" : "🙈";
  }

  // ── PASSWORD STRENGTH ─────────────────────────
  function getStrength(pw) {
    var score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  function updateStrengthUI(pw, segs, label) {
    if (!segs || !label) return;
    var score = getStrength(pw);
    var colors = ["#E2E8F0", "#E63946", "#FF6B35", "#FFB800", "#1BA672", "#0EA86A"];
    var labels = ["", "Bahut kamzor", "Kamzor", "Theek hai", "Achha", "Bahut achha"];
    var labelColors = ["", "#E63946", "#FF6B35", "#FFB800", "#1BA672", "#0EA86A"];
    segs.forEach(function (s, i) {
      s.style.background = i < score ? colors[score] : "#E2E8F0";
    });
    label.textContent = pw.length ? labels[score] || "" : "";
    label.style.color = labelColors[score] || "#94A3B8";
  }

  // ── SUPABASE AUTH FUNCTIONS ───────────────────

  async function doSignup(opts) {
    var name = opts.name,
      email = opts.email,
      password = opts.password;

    var res = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { name: name.trim() },
        // ✅ confirmation email redirects to email-verified.html —
        // kept exactly as-is, signup flow is untouched.
        emailRedirectTo: window.location.origin + "/email-verified.html",
      },
    });
    return { data: res.data, error: res.error };
  }

  async function doLogin(opts) {
    var email = opts.email,
      password = opts.password,
      remember = opts.remember;

    var res = await supabase.auth.signInWithPassword({ email: email, password: password });
    if (!res.error && res.data.user) {
      var profile = saveUserLocal(res.data.user);
      if (!remember) {
        profile.sessionOnly = true;
        localStorage.setItem("rk_user", JSON.stringify(profile));
      }
    }
    return { data: res.data, error: res.error };
  }

  async function doForgotPassword(email) {
    // ✅ FIX: pehle "/login.html" tha — Supabase recovery link login.html
    // par hi land karta tha, jahan ek already-existing session jaisa
    // dikhta tha aur naya-password form kabhi nahi dikhta tha (yehi
    // "auto-login" bug tha). Ab dedicated reset-password.html par jaata
    // hai, jo recovery session ko explicitly detect karke password update
    // form dikhata hai aur update ke baad session clear karta hai.
    var redirectUrl = window.location.origin + "/reset-password.html";
    var res = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error: res.error };
  }

  // Friendly error messages
  function friendlyError(err) {
    if (!err) return "";
    var msg = err.message || "";
    if (msg.indexOf("User already registered") !== -1 || msg.indexOf("already registered") !== -1)
      return 'Yeh email pehle se registered hai! <a href="login.html">Login karein →</a>';
    if (msg.indexOf("Invalid login credentials") !== -1)
      return "Email ya password galat hai. Dobara try karein.";
    if (msg.indexOf("Email not confirmed") !== -1)
      return "Pehle email verify karein. Inbox check karein.";
    if (msg.indexOf("rate limit") !== -1 || msg.indexOf("Too many") !== -1)
      return "Zyada try kiya. 1 minute baad dobara karein.";
    if (msg.indexOf("network") !== -1 || msg.indexOf("fetch") !== -1)
      return "Network error. Internet check karein.";
    if (msg.indexOf("Password should be") !== -1)
      return "Password kam se kam 6 characters ka hona chahiye.";
    if (msg.indexOf("Auth session missing") !== -1 || msg.indexOf("session missing") !== -1)
      return "Reset link expire ho gaya ya pehle use ho chuka hai. Naya link mangwayein.";
    return msg || "Kuch error hua. Dobara try karein.";
  }

  // ── EXPORT (GLOBAL) ───────────────────────────
  window.RKAuth = {
    supabase: supabase,
    getSession: getSession,
    redirectIfLoggedIn: redirectIfLoggedIn,
    saveUserLocal: saveUserLocal,
    getUserLocal: getUserLocal,
    clearUserLocal: clearUserLocal,
    showMsg: showMsg,
    hideMsg: hideMsg,
    setLoading: setLoading,
    togglePass: togglePass,
    getStrength: getStrength,
    updateStrengthUI: updateStrengthUI,
    doSignup: doSignup,
    doLogin: doLogin,
    doForgotPassword: doForgotPassword,
    friendlyError: friendlyError,
  };
})();
