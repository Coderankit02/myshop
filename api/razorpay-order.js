/**
 * /api/razorpay-order — Razorpay Online Payment (server-side order creation)
 * Rinku Kirana & General Store
 *
 * WHY server-side: Razorpay order creation needs RAZORPAY_KEY_SECRET which
 * must NEVER be exposed in browser code. This Vercel serverless function
 * creates the order using the secret from env vars and returns only the
 * public order id + key id that the checkout SDK needs.
 *
 * POST body: { amount (in paise, integer), receipt?, notes? }
 * Response:  { orderId, keyId, amount, currency }  (or 400/500 with error)
 */
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

function authHeader() {
  return 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ error: 'Razorpay keys not configured on server' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  const amount = Math.round(Number(body.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const payload = {
    amount,                          // already in paise (client sends ₹→paise)
    currency: 'INR',
    payment_capture: 1,
    receipt: String(body.receipt || `rcpt_${Date.now()}`).slice(0, 40),
  };
  if (body.notes && typeof body.notes === 'object') {
    payload.notes = Object.fromEntries(
      Object.entries(body.notes).map(([k, v]) => [k, String(v).slice(0, 250)])
    );
  }

  try {
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('[razorpay-order] upstream error:', r.status, JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: data?.error?.description || 'Razorpay order create failed' });
    }
    return res.status(200).json({
      orderId: data.id,
      keyId: RAZORPAY_KEY_ID,
      amount: data.amount,
      currency: data.currency || 'INR',
      receipt: data.receipt,
    });
  } catch (err) {
    console.error('[razorpay-order] error:', err?.message || err);
    return res.status(500).json({ error: 'Razorpay order create failed' });
  }
};
