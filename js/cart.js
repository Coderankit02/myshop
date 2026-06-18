/**
 * cart.js — Rinku Kirana
 * Guest (localStorage) + Logged-in (Supabase) + Merge on login
 * ─────────────────────────────────────────────────────────────
 * Public API (window.RKCart):
 *   addToCart(product)
 *   removeFromCart(productId)
 *   updateQuantity(productId, delta)   delta = +1 / -1
 *   clearCart()
 *   getCart()                          → [{...product, qty}]
 *   getCount()                         → total item count
 *   getTotal()                         → ₹ total
 *   onCartChange(fn)                   → subscribe to changes
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  const LS_KEY = 'rk_cart_v1';

  /* ── Supabase client (the actual client created in account.html/index.html,
        NOT the raw SDK namespace — that's why it must be window.sb) ───── */
  const getDB = () => window.sb;

  /* ── Subscribers ────────────────────────────────────────── */
  const listeners = [];
  function notify(cart) {
    listeners.forEach(fn => fn([...cart]));
  }

  /* ── In-memory state ────────────────────────────────────── */
  let _cart = [];
  let _userId = null;   // set by setUser()

  /* ══════════════════════════════════════════════════════════
     LOCAL STORAGE (Guest)
  ══════════════════════════════════════════════════════════ */
  function lsSave(cart) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cart)); } catch (_) {}
  }

  function lsLoad() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (_) { return []; }
  }

  function lsClear() {
    try { localStorage.removeItem(LS_KEY); } catch (_) {}
  }

  /* ══════════════════════════════════════════════════════════
     SUPABASE (Logged-in)
  ══════════════════════════════════════════════════════════ */
  async function dbLoad(userId) {
    const { data, error } = await getDB()
      .from('cart_items')
      .select('*')
      .eq('user_id', userId);
    if (error) { console.error('[RKCart] dbLoad:', error.message); return []; }
    return (data || []).map(r => ({
      id: r.product_id,
      name: r.name,
      unit: r.unit,
      price: r.price,
      old: r.old_price,
      e: r.emoji,
      cat: r.category,
      bg: r.bg_color,
      qty: r.qty,
    }));
  }

  async function dbUpsert(userId, item) {
    const { error } = await getDB()
      .from('cart_items')
      .upsert({
        user_id: userId,
        product_id: item.id,
        name: item.name,
        unit: item.unit,
        price: item.price,
        old_price: item.old || null,
        emoji: item.e,
        category: item.cat,
        bg_color: item.bg || null,
        qty: item.qty,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,product_id' });
    if (error) console.error('[RKCart] dbUpsert:', error.message);
  }

  async function dbDelete(userId, productId) {
    const { error } = await getDB()
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
    if (error) console.error('[RKCart] dbDelete:', error.message);
  }

  async function dbClear(userId) {
    const { error } = await getDB()
      .from('cart_items')
      .delete()
      .eq('user_id', userId);
    if (error) console.error('[RKCart] dbClear:', error.message);
  }

  /* ══════════════════════════════════════════════════════════
     CART MERGE  (Guest → User on login)
     Strategy: user cart wins on conflict (higher qty kept)
  ══════════════════════════════════════════════════════════ */
  async function mergeGuestCart(userId) {
    const guestItems = lsLoad();
    if (!guestItems.length) return;

    const dbItems = await dbLoad(userId);
    const merged = [...dbItems];

    for (const g of guestItems) {
      const existing = merged.find(i => i.id === g.id);
      if (existing) {
        existing.qty = Math.max(existing.qty, g.qty);
      } else {
        merged.push(g);
      }
    }

    // Save merged back to Supabase
    for (const item of merged) {
      await dbUpsert(userId, item);
    }

    lsClear();
    _cart = merged;
    notify(_cart);
  }

  /* ══════════════════════════════════════════════════════════
     INIT / SESSION CHANGE
  ══════════════════════════════════════════════════════════ */
  async function setUser(user) {
    if (user && user.uid) {
      _userId = user.uid;
      await mergeGuestCart(_userId);          // merge then load
      _cart = await dbLoad(_userId);
      notify(_cart);
    } else {
      // Logout — persist current cart to LS if any items remain
      if (_cart.length) lsSave(_cart);
      _userId = null;
      _cart = lsLoad();
      notify(_cart);
    }
  }

  async function init() {
    // Try restoring from Supabase session
    const { data: { session } } = await getDB().auth.getSession();
    if (session?.user) {
      _userId = session.user.id;
      await mergeGuestCart(_userId);
      _cart = await dbLoad(_userId);
    } else {
      _cart = lsLoad();
    }
    notify(_cart);
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC MUTATIONS
  ══════════════════════════════════════════════════════════ */
  async function addToCart(product) {
    const idx = _cart.findIndex(i => i.id === product.id);
    if (idx > -1) {
      _cart[idx].qty += 1;
    } else {
      _cart = [..._cart, { ...product, qty: 1 }];
    }
    _persist(_userId ? _cart.find(i => i.id === product.id) : null, product.id);
    notify(_cart);
  }

  async function removeFromCart(productId) {
    _cart = _cart.filter(i => i.id !== productId);
    if (_userId) { await dbDelete(_userId, productId); }
    else { lsSave(_cart); }
    notify(_cart);
  }

  async function updateQuantity(productId, delta) {
    const idx = _cart.findIndex(i => i.id === productId);
    if (idx === -1) return;
    _cart[idx].qty += delta;
    if (_cart[idx].qty <= 0) {
      await removeFromCart(productId);
      return;
    }
    _persist(_cart[idx], productId);
    notify(_cart);
  }

  async function clearCart() {
    _cart = [];
    if (_userId) { await dbClear(_userId); }
    else { lsClear(); }
    notify(_cart);
  }

  /* internal helper */
  async function _persist(item, productId) {
    if (_userId) {
      if (item) { await dbUpsert(_userId, item); }
      else { await dbDelete(_userId, productId); }
    } else {
      lsSave(_cart);
    }
  }

  /* ── Reads ─────────────────────────────────────────────── */
  function getCart()  { return [..._cart]; }
  function getCount() { return _cart.reduce((s, i) => s + i.qty, 0); }
  function getTotal() { return _cart.reduce((s, i) => s + i.price * i.qty, 0); }

  function onCartChange(fn) {
    listeners.push(fn);
    fn([..._cart]);   // immediate call with current state
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }

  /* ══════════════════════════════════════════════════════════
     EXPOSE
  ══════════════════════════════════════════════════════════ */
  window.RKCart = {
    init,
    setUser,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCart,
    getCount,
    getTotal,
    onCartChange,
  };

})();
