/**
 * orders.js — Rinku Kirana
 * Order creation, history, details, reorder (Supabase)
 * ─────────────────────────────────────────────────────────────
 * Public API (window.RKOrders):
 *   createOrder(userId, { cart, total, address, paymentMethod })
 *     → { orderId, orderNumber }
 *   loadOrderHistory(userId, limit?)  → [order]
 *   getOrderDetails(orderId)          → order with items
 *   reorder(orderId)                  → [{...product, qty}]  (re-adds to cart)
 * ─────────────────────────────────────────────────────────────
 * Order statuses: pending → confirmed → out_for_delivery → delivered
 * Payment:        cod | upi
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  const getDB = () => window.supabase;

  /* ── Readable order number  e.g. RK-2024-4521 ──────────── */
  function _genOrderNumber() {
    const yr = new Date().getFullYear();
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `RK-${yr}-${rnd}`;
  }

  /* ══════════════════════════════════════════════════════════
     CREATE ORDER
  ══════════════════════════════════════════════════════════ */
  /**
   * @param {string|null} userId   null = guest order
   * @param {{
   *   cart: Array,
   *   total: number,
   *   address: { name, phone, line1, line2?, city, pincode },
   *   paymentMethod: 'cod'|'upi',
   *   promoCode?: string,
   *   discount?: number,
   * }} opts
   * @returns {{ orderId: string, orderNumber: string } | null}
   */
  async function createOrder(userId, opts) {
    const { cart, total, address, paymentMethod, promoCode = null, discount = 0 } = opts;

    if (!cart?.length) { console.error('[RKOrders] createOrder: empty cart'); return null; }

    const orderNumber = _genOrderNumber();
    const finalAmount = total - discount;

    /* ── Insert order header ── */
    const { data: order, error: oErr } = await getDB()
      .from('orders')
      .insert({
        user_id: userId || null,
        order_number: orderNumber,
        status: 'pending',
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'upi' ? 'paid' : 'pending',
        subtotal: total,
        discount,
        promo_code: promoCode,
        final_amount: finalAmount,
        delivery_name: address.name,
        delivery_phone: address.phone,
        delivery_line1: address.line1,
        delivery_line2: address.line2 || '',
        delivery_city: address.city || 'Prayagraj',
        delivery_pincode: address.pincode || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (oErr) { console.error('[RKOrders] createOrder (header):', oErr.message); return null; }

    /* ── Insert order items ── */
    const items = cart.map(item => ({
      order_id: order.id,
      product_id: item.id,
      name: item.name,
      unit: item.unit,
      emoji: item.e,
      category: item.cat,
      price: item.price,
      old_price: item.old || null,
      qty: item.qty,
      line_total: item.price * item.qty,
    }));

    const { error: iErr } = await getDB().from('order_items').insert(items);
    if (iErr) { console.error('[RKOrders] createOrder (items):', iErr.message); }

    return { orderId: order.id, orderNumber };
  }

  /* ══════════════════════════════════════════════════════════
     ORDER HISTORY
  ══════════════════════════════════════════════════════════ */
  /**
   * @param {string} userId
   * @param {number} limit  default 20
   */
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

  /* ══════════════════════════════════════════════════════════
     ORDER DETAILS
  ══════════════════════════════════════════════════════════ */
  /** Full order with items */
  async function getOrderDetails(orderId) {
    if (!orderId) return null;

    const { data: order, error: oErr } = await getDB()
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (oErr) { console.error('[RKOrders] getOrderDetails:', oErr.message); return null; }

    const { data: items, error: iErr } = await getDB()
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (iErr) console.error('[RKOrders] getOrderDetails (items):', iErr.message);

    return { ...order, items: items || [] };
  }

  /* ══════════════════════════════════════════════════════════
     REORDER
     Loads items from a past order and adds them to RKCart
  ══════════════════════════════════════════════════════════ */
  async function reorder(orderId) {
    const order = await getOrderDetails(orderId);
    if (!order?.items?.length) return [];

    const products = order.items.map(i => ({
      id: i.product_id,
      name: i.name,
      unit: i.unit,
      price: i.price,
      old: i.old_price,
      e: i.emoji,
      cat: i.category,
    }));

    // Add each to cart using RKCart if available
    if (window.RKCart) {
      await window.RKCart.clearCart();
      for (const p of products) {
        const item = order.items.find(i => i.product_id === p.id);
        for (let q = 0; q < (item?.qty || 1); q++) {
          await window.RKCart.addToCart(p);
        }
      }
    }

    return products;
  }

  /* ══════════════════════════════════════════════════════════
     EXPOSE
  ══════════════════════════════════════════════════════════ */
  window.RKOrders = {
    createOrder,
    loadOrderHistory,
    getOrderDetails,
    reorder,
  };

})();
