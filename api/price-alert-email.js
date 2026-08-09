/**
 * /api/price-alert-email — price-drop / back-in-stock EMAIL alerts (server-side)
 * Rinku Kirana & General Store
 *
 * Flow: Supabase trigger `notify_price_alerts()` (products UPDATE par) in-app
 * notification insert karta hai AUR pg_net ke through ise POST karta hai
 * (secret-validated). Ye function Resend se customer ko email bhejta hai.
 *
 * POST body (from trigger):
 *   { secret, email, productName, title, message, type }
 *   type: 'offer' (price drop) | 'stock' (back in stock)
 *
 * Env vars (Vercel):
 *   RESEND_API_KEY        — https://resend.com/api-keys
 *   ALERT_WEBHOOK_SECRET  — DB ke app_config.alert_webhook_secret se match karna chahiye
 *   ALERT_FROM_EMAIL      — verified sender, e.g. "RK Grocery Mart <alerts@rinkukirana.com>"
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const ALERT_WEBHOOK_SECRET = process.env.ALERT_WEBHOOK_SECRET || '';
const ALERT_FROM_EMAIL = process.env.ALERT_FROM_EMAIL || 'RK Grocery Mart <onboarding@resend.dev>';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const { secret, email, productName, title, message, type } = body || {};

  // ── Secret guard: sirf hamara Supabase trigger hi bhej sakta hai ──
  if (!ALERT_WEBHOOK_SECRET || secret !== ALERT_WEBHOOK_SECRET) {
    console.warn('[price-alert-email] UNAUTHORIZED attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!RESEND_API_KEY) {
    console.warn('[price-alert-email] RESEND_API_KEY not configured');
    return res.status(500).json({ error: 'Resend not configured' });
  }
  if (!email) return res.status(400).json({ error: 'Missing email' });

  const subject = type === 'stock'
    ? `📢 ${productName || 'Product'} wapas stock mein aa gaya!`
    : `💰 ${productName || 'Product'} ki price kam ho gayi!`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;">
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:42px;line-height:1;">${type === 'stock' ? '📢' : '💰'}</div>
        <h1 style="margin:8px 0 4px;font-size:20px;color:#0f172a;">${title || 'RK Grocery Mart Alert'}</h1>
      </div>
      <div style="background:#ffffff;border-radius:12px;padding:18px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 12px;font-size:15px;color:#1e293b;line-height:1.6;">${message || ''}</p>
        <p style="margin:0;font-size:13px;color:#64748b;">
          Order karne ke liye: <a href="https://rinkukiranastore.vercel.app" style="color:#16a34a;font-weight:bold;">rinkukiranastore.vercel.app</a>
        </p>
      </div>
      <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:18px;">
        Ye alert aapne RK Grocery Mart par price-alert set kiya tha isliye bheja gaya hai.
      </p>
    </div>
  `;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: ALERT_FROM_EMAIL, to: [email], subject, html }),
      signal: AbortSignal.timeout(10000),
    });
    const text = await resendRes.text();
    if (!resendRes.ok) {
      console.error('[price-alert-email] Resend error:', resendRes.status, text.slice(0, 300));
      return res.status(502).json({ error: 'Resend send failed', detail: text.slice(0, 200) });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[price-alert-email] error:', e?.message || e);
    return res.status(500).json({ error: 'Send failed' });
  }
};
