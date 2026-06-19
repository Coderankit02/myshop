/**
 * payment.js — Rinku Kirana
 * UPI Payment Verification (Supabase)
 * ─────────────────────────────────────────────────────────────
 * Public API (window.RKPayment):
 *   uploadScreenshot(file, orderNumber)        → publicUrl | null
 *   submitVerification(userId, opts)           → row | null
 *   getVerificationStatus(orderId)             → row | null
 *   loadVerifications({status, search, limit}) → [row]   (admin)
 *   approvePayment(verificationId, orderId)    → boolean (admin)
 *   rejectPayment(verificationId, reason)      → boolean (admin)
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  const getDB = () => window.sb;
  const BUCKET = 'payment-screenshots';

  /* ══════════════════════════════════════════════════════════
     SCREENSHOT UPLOAD
  ══════════════════════════════════════════════════════════ */
  async function uploadScreenshot(file, orderNumber) {
    if (!file) return null;
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const safeName = `${orderNumber || 'order'}_${Date.now()}.${ext}`;
      const path = `${orderNumber || 'misc'}/${safeName}`;

      const { error } = await getDB()
        .storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (error) { console.error('[RKPayment] uploadScreenshot:', error.message); return null; }

      const { data } = getDB().storage.from(BUCKET).getPublicUrl(path);
      return data?.publicUrl || null;
    } catch (err) {
      console.error('[RKPayment] uploadScreenshot (exception):', err);
      return null;
    }
  }

  /* ══════════════════════════════════════════════════════════
     SUBMIT VERIFICATION (customer side)
  ══════════════════════════════════════════════════════════ */
  /**
   * @param {string} userId
   * @param {{orderId, orderNumber, customerName, mobile, utr, screenshotUrl, amount}} opts
   */
  async function submitVerification(userId, opts) {
    const { orderId, orderNumber, customerName, mobile, utr, screenshotUrl, amount } = opts;

    const { data, error } = await getDB()
      .from('payment_verifications')
      .insert({
        user_id: userId || null,
        order_id: orderId,
        order_number: orderNumber,
        customer_name: customerName,
        mobile,
        utr,
        screenshot_url: screenshotUrl || null,
        amount,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) { console.error('[RKPayment] submitVerification:', error.message); return null; }
    return data;
  }

  /* ══════════════════════════════════════════════════════════
     STATUS LOOKUP (customer side — e.g. order tracking page)
  ══════════════════════════════════════════════════════════ */
  async function getVerificationStatus(orderId) {
    if (!orderId) return null;
    const { data, error } = await getDB()
      .from('payment_verifications')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) { console.error('[RKPayment] getVerificationStatus:', error.message); return null; }
    return data;
  }

  /* ══════════════════════════════════════════════════════════
     ADMIN: LIST / SEARCH
  ══════════════════════════════════════════════════════════ */
  /**
   * @param {{status?: 'all'|'pending'|'paid'|'rejected', search?: string, limit?: number}} filters
   */
  async function loadVerifications(filters = {}) {
    const { status = 'all', search = '', limit = 100 } = filters;
    let q = getDB()
      .from('payment_verifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') q = q.eq('status', status);
    if (search && search.trim()) {
      const s = search.trim();
      q = q.or(`utr.ilike.%${s}%,order_number.ilike.%${s}%,mobile.ilike.%${s}%,customer_name.ilike.%${s}%`);
    }

    const { data, error } = await q;
    if (error) { console.error('[RKPayment] loadVerifications:', error.message); return []; }
    return data || [];
  }

  /* ══════════════════════════════════════════════════════════
     ADMIN: APPROVE / REJECT
  ══════════════════════════════════════════════════════════ */
  async function approvePayment(verificationId, orderId) {
    const { error: e1 } = await getDB()
      .from('payment_verifications')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', verificationId);

    if (e1) { console.error('[RKPayment] approvePayment (verification):', e1.message); return false; }

    const { error: e2 } = await getDB()
      .from('orders')
      .update({ status: 'confirmed', payment_status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (e2) { console.error('[RKPayment] approvePayment (order):', e2.message); return false; }
    return true;
  }

  async function rejectPayment(verificationId, reason = '') {
    const { error } = await getDB()
      .from('payment_verifications')
      .update({ status: 'rejected', admin_note: reason, updated_at: new Date().toISOString() })
      .eq('id', verificationId);

    if (error) { console.error('[RKPayment] rejectPayment:', error.message); return false; }
    return true;
  }

  /* ══════════════════════════════════════════════════════════
     EXPOSE
  ══════════════════════════════════════════════════════════ */
  window.RKPayment = {
    uploadScreenshot,
    submitVerification,
    getVerificationStatus,
    loadVerifications,
    approvePayment,
    rejectPayment,
  };

})();
