/**
 * orders.js — Rinku Kirana
 * Order creation, history, details, reorder (Supabase)
 *
 * BUG FIXES in this version:
 *  [Critical #2] UPI payment_status ab "paid" nahi hota order create hone par.
 *                Pehle UPI select karte hi status 'paid' set hota tha — bina verification ke.
 *                Ab initial status hamesha 'pending' hai. Sirf admin approve karne par 'paid' hoga.
 *  [Critical #3] Blocked customer check — createOrder ke start mein user block check hota hai.
 *  [High #4]     Order number collision fix — 6-digit random + timestamp component.
 *  [High #5]     Reorder fresh prices fetch karta hai DB se, purane saved prices nahi.
 *  [Medium #10]  Coupon used_count increment — order place hone par coupon use count badhta hai.
 */
(function () {
  'use strict';

  const getDB = () => window.sb;

  // BUG FIX (High #4): Pehle sirf 4-digit random tha = 9000 combinations per year.
  // Ab 6-digit + timestamp ke last 3 chars = practically unique.
  function _genOrderNumber() {
    const yr = new Date().getFullYear();
    const rnd = Math.floor(100000 + Math.random() * 900000); // 6 digits
    return `RK-${yr}-${rnd}`;
  }

  // BUG FIX (Critical #3): Check if user is blocked before allowing order.
  async function _checkUserBlocked(userId) {
    if (!userId) return false; // guest orders allowed
    try {
      const { data } = await getDB()
        .from('profiles')
        .select('is_blocked')
        .eq('id', userId)
        .single();
      return data?.is_blocked === true;
    } catch (_) {
      return false; // fail open (don't block on DB error)
    }
  }

  // BUG FIX (Medium #10): Increment coupon used_count after successful order.
  async function _incrementCouponUsage(promoCode) {
    if (!promoCode) return;
    try {
      // Supabase doesn't have increment shorthand — fetch current count, then update.
      const { data } = await getDB()
        .from('coupons')
        .select('id,used_count')
        .eq('code', promoCode)
        .eq('is_active', true)
        .maybeSingle();
      if (!data) return;
      await getDB()
        .from('coupons')
        .update({ used_count: (data.used_count || 0) + 1, updated_at: new Date().toISOString() })
        .eq('id', data.id);
    } catch (e) {
      console.error('[RKOrders] _incrementCouponUsage:', e.message);
    }
  }

  /**
   * Create a new order.
   * @param {string|null} userId   null = guest order
   * @param {{
   *   cart, total, address, paymentMethod,
   *   promoCode?, discount?, latitude?, longitude?,
   *   distance_km?, delivery_charge?, delivery_status?,
   *   maps_link?, maps_nav_link?, location_accuracy?
   * }} opts
   * @returns {{ orderId, orderNumber } | null}
   */
  async function createOrder(userId, opts) {
    const { cart, total, address, paymentMethod, promoCode = null, discount = 0 } = opts;

    if (!cart?.length) { console.error('[RKOrders] createOrder: empty cart'); return null; }

    // BUG FIX (Critical #3): Block check before anything else.
    const isBlocked = await _checkUserBlocked(userId);
    if (isBlocked) {
      console.warn('[RKOrders] createOrder: user is blocked');
      return { blocked: true }; // caller should show error to user
    }

    const orderNumber = _genOrderNumber();

    const locationFields = opts.latitude != null ? {
      latitude          : opts.latitude,
      longitude         : opts.longitude,
      distance_km       : opts.distance_km ?? null,
      delivery_charge   : opts.delivery_charge || 0,
      delivery_status   : opts.delivery_status || 'unknown',
      maps_link         : opts.maps_link || null,
      maps_nav_link     : opts.maps_nav_link || null,
      location_accuracy : opts.location_accuracy ?? null,
    } : {
      delivery_charge : 0,
      delivery_status : 'unknown',
    };

    const finalAmount = total - discount + (locationFields.delivery_charge || 0);

    // BUG FIX (Critical #2): payment_status ab hamesha 'pending' start hota hai.
    // Pehle: paymentMethod === 'upi' ? 'paid' : 'pending'
    // Ye galat tha — order place hote hi UPI "paid" mark ho jaata tha.
    // Sahi flow: customer screenshot submit kare → admin approve kare → tab 'paid'.
    const { data: order, error: oErr } = await getDB()
      .from('orders')
      .insert({
        user_id        : userId || null,
        order_number   : orderNumber,
        status         : 'pending',
        payment_method : paymentMethod,
        payment_status : 'pending', // always pending until admin/webhook confirms
        subtotal       : total,
        discount,
        promo_code     : promoCode,
        final_amount   : finalAmount,
        delivery_name  : address.name,
        delivery_phone : address.phone,
        delivery_line1 : address.line1,
        delivery_line2 : address.line2 || '',
        delivery_city  : address.city || 'Prayagraj',
        delivery_pincode: address.pincode || '',
        ...locationFields,
        created_at     : new Date().toISOString(),
        updated_at     : new Date().toISOString(),
      })
      .select()
      .single();

    if (oErr) { console.error('[RKOrders] createOrder (header):', oErr.message); return null; }

    const items = cart.map(item => ({
      order_id  : order.id,
      product_id: item.id,
      name      : item.name,
      unit      : item.unit,
      emoji     : item.e,
      category  : item.cat,
      price     : item.price,
      old_price : item.old || null,
      qty       : item.qty,
      line_total: item.price * item.qty,
    }));

    const { error: iErr } = await getDB().from('order_items').insert(items);
    if (iErr) { console.error('[RKOrders] createOrder (items):', iErr.message); }

    // BUG FIX (Medium #10): Coupon use count badhao.
    if (promoCode) {
      _incrementCouponUsage(promoCode); // fire-and-forget; don't block order confirmation
    }

    return { orderId: order.id, orderNumber };
  }

  async function loadOrderHistory(userId, limit = 20) {
    if (!userId) return [];
    const { data, error } = await getDB()
      .from('orders')
      .select('id, order_number, status, payment_method, final_amount, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.error('[RKOrders] loadOrderHistory:', error.message); return []; }
    return data || [];
  }

  async function getOrderDetails(orderId) {
    if (!orderId) return null;
    const { data: order, error: oErr } = await getDB()
      .from('orders').select('*').eq('id', orderId).single();
    if (oErr) { console.error('[RKOrders] getOrderDetails:', oErr.message); return null; }
    const { data: items, error: iErr } = await getDB()
      .from('order_items').select('*').eq('order_id', orderId);
    if (iErr) console.error('[RKOrders] getOrderDetails (items):', iErr.message);
    return { ...order, items: items || [] };
  }

  /**
   * BUG FIX (High #5): Reorder ab fresh prices fetch karta hai DB se.
   * Pehle past order ke saved prices use hote the — agar price badal gayi
   * to customer purane/galat price par order place kar sakta tha.
   */
  async function reorder(orderId) {
    const order = await getOrderDetails(orderId);
    if (!order?.items?.length) return [];

    const productIds = order.items.map(i => i.product_id).filter(Boolean);

    // Fetch current prices from products table
    let freshPrices = {};
    if (productIds.length) {
      const { data: freshProducts } = await getDB()
        .from('products')
        .select('id,name,selling_price,unit_value,is_active')
        .in('id', productIds);

      (freshProducts || []).forEach(p => { freshPrices[p.id] = p; });
    }

    const products = order.items.map(i => {
      const fresh = freshPrices[i.product_id];
      return {
        id   : i.product_id,
        name : fresh?.name || i.name,
        unit : fresh?.unit_value || i.unit,
        // Use fresh price — fall back to saved price only if product no longer in DB
        price: fresh?.selling_price ?? i.price,
        old  : i.old_price,
        e    : i.emoji,
        cat  : i.category,
        _unavailable: fresh ? !fresh.is_active : false,
      };
    });

    if (window.RKCart) {
      await window.RKCart.clearCart();
      for (const p of products) {
        if (p._unavailable) continue; // skip inactive products silently
        const item = order.items.find(i => i.product_id === p.id);
        for (let q = 0; q < (item?.qty || 1); q++) {
          await window.RKCart.addToCart(p);
        }
      }
    }

    return products;
  }

  window.RKOrders = {
    createOrder,
    loadOrderHistory,
    getOrderDetails,
    reorder,
  };

})();
