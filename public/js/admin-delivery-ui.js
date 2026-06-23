/**
 * admin-delivery-ui.js
 * Rinku Kirana Store — Admin Panel Delivery Display Helpers
 *
 * Provides functions to render delivery data in the admin orders table.
 * Depends on: maps-utils.js, delivery-radius.js
 *
 * Usage:
 *   const rowHTML = AdminDelivery.orderRowHTML(order);
 *   const detailHTML = AdminDelivery.orderDetailHTML(order);
 */

'use strict';

(function (window) {

  const AdminDelivery = {

    /**
     * Returns an HTML string for an admin order table row.
     * Includes: address, distance badge, delivery charge, maps buttons.
     *
     * @param {Object} order — row from orders / v_orders_admin
     * @returns {string}
     */
    orderRowHTML(order) {
      const o = order;
      const hasCoords = o.latitude && o.longitude;

      const mapBtns = window.RKMaps
        ? window.RKMaps.adminButtonsHTML(o.latitude, o.longitude, o.delivery_name)
        : '';

      const distBadge = window.RKMaps
        ? window.RKMaps.distanceBadgeHTML(
            o.distance_km,
            o.delivery_charge,
            o.delivery_status !== 'unavailable'
          )
        : '';

      const fullAddr = [o.delivery_line1, o.delivery_line2, o.delivery_city, o.delivery_pincode]
        .filter(Boolean).join(', ');

      return `
      <tr class="admin-order-row" data-order-id="${o.id}">
        <td class="ao-cell ao-cell--num">
          <div class="ao-order-num">${o.order_number}</div>
          <div class="ao-order-date">${_fmtDate(o.created_at)}</div>
        </td>
        <td class="ao-cell">
          <div class="ao-cust-name">${o.delivery_name || '–'}</div>
          <div class="ao-cust-phone">${o.delivery_phone || ''}</div>
        </td>
        <td class="ao-cell ao-cell--addr">
          <div class="ao-addr">${fullAddr}</div>
          ${mapBtns}
        </td>
        <td class="ao-cell ao-cell--dist">
          ${distBadge}
        </td>
        <td class="ao-cell ao-cell--amt">
          <div class="ao-amount">₹${Number(o.final_amount || 0).toLocaleString('en-IN')}</div>
          ${o.delivery_charge > 0
            ? `<div class="ao-deliv-charge">+₹${o.delivery_charge} delivery</div>`
            : o.delivery_status === 'free'
              ? `<div class="ao-deliv-free">FREE delivery</div>`
              : ''
          }
        </td>
        <td class="ao-cell">
          <span class="ao-status-badge ao-status-badge--${o.status}">${_statusLabel(o.status)}</span>
        </td>
      </tr>`;
    },

    /**
     * Returns an HTML card for the detailed order view in admin panel.
     * Shows static map thumbnail + full location data.
     *
     * @param {Object} order
     * @returns {string}
     */
    orderDetailHTML(order) {
      const o = order;
      const hasCoords = o.latitude && o.longitude;
      const fullAddr = [o.delivery_line1, o.delivery_line2, o.delivery_city, o.delivery_pincode]
        .filter(Boolean).join(', ');

      let delivStatusHTML = '';
      if (o.delivery_status === 'free') {
        delivStatusHTML = `<div class="ao-detail-badge ao-detail-badge--free">✅ Free Delivery</div>`;
      } else if (o.delivery_status === 'paid') {
        delivStatusHTML = `<div class="ao-detail-badge ao-detail-badge--paid">🚚 Delivery Charge: ₹${o.delivery_charge}</div>`;
      } else if (o.delivery_status === 'unavailable') {
        delivStatusHTML = `<div class="ao-detail-badge ao-detail-badge--unavail">❌ Out of Range</div>`;
      }

      return `
      <div class="ao-detail-card">
        <div class="ao-detail-section">
          <div class="ao-detail-title">📍 Delivery Location</div>
          <div class="ao-detail-addr">${fullAddr}</div>
          ${hasCoords ? `
          <div class="ao-detail-meta">
            <span>📐 ${Number(o.distance_km || 0).toFixed(1)} km from shop</span>
            <span>🌐 ${Number(o.latitude).toFixed(5)}, ${Number(o.longitude).toFixed(5)}</span>
          </div>
          ${delivStatusHTML}
          ${window.RKMaps ? `<div style="margin-top:12px;">${window.RKMaps.adminButtonsHTML(o.latitude, o.longitude, o.delivery_name)}</div>` : ''}
          ${window.RKMaps ? `<div style="margin-top:12px;">${window.RKMaps.staticMapImageHTML(o.latitude, o.longitude)}</div>` : ''}
          ` : `<div style="font-size:.76rem;color:var(--gray);margin-top:8px;">GPS data unavailable for this order.</div>`}
        </div>
      </div>`;
    },

    /**
     * Renders a summary stats bar for the admin orders page header.
     * Shows breakdown by delivery tier.
     *
     * @param {Array} orders — array of order objects
     * @returns {string}
     */
    statsBarHTML(orders) {
      const free    = orders.filter(o => o.delivery_status === 'free').length;
      const paid    = orders.filter(o => o.delivery_status === 'paid').length;
      const unavail = orders.filter(o => o.delivery_status === 'unavailable').length;
      const noGPS   = orders.filter(o => !o.latitude).length;
      const totalDelivCharges = orders.reduce((s, o) => s + (Number(o.delivery_charge) || 0), 0);

      return `
      <div class="ao-stats-bar">
        <div class="ao-stat">
          <div class="ao-stat-val" style="color:var(--primary)">${free}</div>
          <div class="ao-stat-lbl">✅ Free Delivery</div>
        </div>
        <div class="ao-stat">
          <div class="ao-stat-val" style="color:#1D4ED8">${paid}</div>
          <div class="ao-stat-lbl">🚚 Paid Delivery</div>
        </div>
        <div class="ao-stat">
          <div class="ao-stat-val" style="color:var(--red)">${unavail}</div>
          <div class="ao-stat-lbl">❌ Out of Range</div>
        </div>
        <div class="ao-stat">
          <div class="ao-stat-val" style="color:var(--orange)">₹${totalDelivCharges.toLocaleString('en-IN')}</div>
          <div class="ao-stat-lbl">💰 Delivery Revenue</div>
        </div>
        ${noGPS > 0 ? `
        <div class="ao-stat">
          <div class="ao-stat-val" style="color:var(--muted)">${noGPS}</div>
          <div class="ao-stat-lbl">📵 No GPS</div>
        </div>` : ''}
      </div>`;
    },
  };

  // ── Private helpers ───────────────────────────────────────────────

  function _fmtDate(d) {
    return new Date(d).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  function _statusLabel(s) {
    return {
      pending         : 'Pending',
      confirmed       : 'Confirmed',
      out_for_delivery: 'Out for Delivery',
      delivered       : 'Delivered',
      cancelled       : 'Cancelled',
    }[s] || s;
  }

  window.RKAdminDelivery = AdminDelivery;

})(window);


/* ══════════════════════════════════════════════════════════════════════
   Admin panel CSS (inject into <head> or your admin stylesheet)
══════════════════════════════════════════════════════════════════════ */
(function () {
  const style = document.createElement('style');
  style.textContent = `
  .ao-stats-bar{
    display:flex;gap:12px;flex-wrap:wrap;
    background:#fff;border-radius:14px;padding:16px 20px;
    margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.06);
    border:1px solid var(--border,#E2E8F0);
  }
  .ao-stat{text-align:center;flex:1;min-width:80px;}
  .ao-stat-val{font-size:1.35rem;font-weight:900;letter-spacing:-.04em;}
  .ao-stat-lbl{font-size:.65rem;font-weight:700;color:var(--gray,#718096);margin-top:2px;text-transform:uppercase;letter-spacing:.4px;}

  .admin-order-row{transition:background .15s;}
  .admin-order-row:hover{background:#FAFBFC;}
  .ao-cell{padding:12px 10px;font-size:.8rem;vertical-align:middle;border-bottom:1px solid var(--border,#E2E8F0);}
  .ao-cell--num .ao-order-num{font-weight:800;color:var(--dark,#1A1A2E);}
  .ao-cell--num .ao-order-date{font-size:.68rem;color:var(--gray,#718096);margin-top:2px;}
  .ao-cust-name{font-weight:700;}
  .ao-cust-phone{font-size:.7rem;color:var(--gray,#718096);margin-top:2px;}
  .ao-cell--addr .ao-addr{font-size:.74rem;color:var(--gray,#718096);margin-bottom:6px;line-height:1.4;}
  .ao-amount{font-weight:800;font-size:.88rem;}
  .ao-deliv-charge{font-size:.66rem;color:#1D4ED8;font-weight:700;margin-top:2px;}
  .ao-deliv-free{font-size:.66rem;color:var(--primary,#1BA672);font-weight:700;margin-top:2px;}

  .ao-status-badge{
    display:inline-block;padding:3px 10px;border-radius:50px;
    font-size:.62rem;font-weight:800;letter-spacing:.3px;
  }
  .ao-status-badge--pending        {background:#FEF9C3;color:#854D0E;}
  .ao-status-badge--confirmed      {background:#DBEAFE;color:#1D4ED8;}
  .ao-status-badge--out_for_delivery{background:#F3E8FF;color:#7C3AED;}
  .ao-status-badge--delivered      {background:#DCFCE7;color:#166534;}
  .ao-status-badge--cancelled      {background:#FEE2E2;color:#DC2626;}

  .ao-detail-card{
    background:#fff;border-radius:14px;padding:18px;
    border:1.5px solid var(--border,#E2E8F0);
    box-shadow:0 2px 8px rgba(0,0,0,.06);
    margin-top:12px;
  }
  .ao-detail-title{font-weight:800;font-size:.88rem;margin-bottom:8px;color:var(--dark,#1A1A2E);}
  .ao-detail-addr{font-size:.82rem;color:var(--gray,#718096);line-height:1.6;margin-bottom:10px;}
  .ao-detail-meta{display:flex;gap:12px;flex-wrap:wrap;font-size:.72rem;color:var(--gray,#718096);margin-bottom:10px;}
  .ao-detail-badge{
    display:inline-flex;align-items:center;gap:6px;
    padding:6px 14px;border-radius:50px;
    font-size:.75rem;font-weight:700;margin-bottom:10px;
  }
  .ao-detail-badge--free    {background:#D1FAE5;color:#065F46;}
  .ao-detail-badge--paid    {background:#DBEAFE;color:#1E40AF;}
  .ao-detail-badge--unavail {background:#FEE2E2;color:#B91C1C;}

  /* Dark mode */
  html[data-theme="dark"] .ao-stats-bar,
  html[data-theme="dark"] .ao-detail-card{background:#151B26;border-color:#2D3B4E;}
  html[data-theme="dark"] .admin-order-row:hover{background:#1A2332;}
  html[data-theme="dark"] .ao-cell{border-bottom-color:#1A2332;}
  html[data-theme="dark"] .ao-detail-badge--free    {background:#11241C;color:#2ECC82;}
  html[data-theme="dark"] .ao-detail-badge--paid    {background:#142A3D;color:#7CB4FF;}
  html[data-theme="dark"] .ao-detail-badge--unavail {background:#2A1414;color:#FF8A8A;}
  `;
  document.head.appendChild(style);
})();
