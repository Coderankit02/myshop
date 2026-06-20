/**
 * checkout-location-react.js
 * Rinku Kirana Store — React Checkout Location Integration
 *
 * This file is a SELF-CONTAINED script you add just before </body> in index.html.
 * It monkey-patches the checkout flow by:
 *   1. Injecting the "Use Current Location" button into the address card
 *      after the checkout form mounts.
 *   2. Computing delivery charge from GPS coordinates.
 *   3. Passing delivery data into the existing order creation pipeline.
 *
 * NO changes to the main React JSX are required — this works as a post-render hook.
 *
 * For deeper React integration, see the companion code block at the bottom
 * of this file (CheckoutFormWithLocation) which you can splice directly into
 * the index.html Babel script to fully replace CheckoutForm.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// OPTION A — Non-invasive post-render injection (zero JSX changes)
//
// Add this to index.html right before </body>, AFTER the Babel/React script.
// It uses a MutationObserver to wait for the checkout form to appear.
// ═══════════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // Wait until dependencies are loaded.
  function whenReady(cb) {
    if (window.RKLocation && window.RKDelivery && window.RKCheckoutLocation) {
      cb();
    } else {
      setTimeout(() => whenReady(cb), 120);
    }
  }

  whenReady(() => {
    const observer = new MutationObserver(() => {
      // Look for the address section of the checkout form.
      const addrCard = document.querySelector('.co-card .addr-add-btn, .co-card .addr-card');
      if (!addrCard) return;

      const coCard = addrCard.closest('.co-card');
      if (!coCard || coCard.dataset.rkLocInjected) return;
      coCard.dataset.rkLocInjected = '1';

      // Build the injection point.
      const btnContainer = document.createElement('div');
      btnContainer.id = 'rk-co-loc-btn-wrap';

      const statusContainer = document.createElement('div');
      statusContainer.id    = 'rk-co-loc-status';
      statusContainer.className = 'rk-ds-container';
      statusContainer.style.display = 'none';

      // Insert at the top of the address card body.
      const cardTitle = coCard.querySelector('.co-card-title');
      if (cardTitle && cardTitle.nextSibling) {
        coCard.insertBefore(statusContainer, cardTitle.nextSibling);
        coCard.insertBefore(btnContainer, statusContainer);
      } else {
        coCard.prepend(statusContainer);
        coCard.prepend(btnContainer);
      }

      // Initialise the location widget.
      window.RKCheckoutLocation.init({
        btnContainerId   : 'rk-co-loc-btn-wrap',
        statusContainerId: 'rk-co-loc-status',
        onSuccess(info) {
          // Bubble to global so the place-order handler can read it.
          window._rkDeliveryInfo = info;
          // Patch the total display if we're adding a charge.
          _updateTotalDisplay(info);
          // Best-effort: fill the address form fields from reverse geocoding.
          _autoFillAddressFromLocation(info);
        },
        onError() {
          window._rkDeliveryInfo = null;
        },
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Patch the place-order button click to validate delivery before proceeding.
    document.body.addEventListener('click', function (e) {
      const btn = e.target.closest('.place-order-btn');
      if (!btn) return;

      const info = window._rkDeliveryInfo;
      if (!info) return; // No location — allow through (user may not have used GPS).

      if (!info.available) {
        e.preventDefault();
        e.stopImmediatePropagation();
        window.RKCheckoutLocation.showToast(
          '❌ Delivery aapke location par available nahi hai. Kripya doosra address use karein.'
        );
      }
    }, true /* capture phase — fires before React's handler */);
  });

  /**
   * Reverse-geocodes the detected GPS position and fills the address form
   * fields (line1, city, pincode) if they're present and empty. If the "Naya
   * Address Add Karo" form isn't open yet, it's opened automatically so the
   * customer can see the filled-in fields and just confirm/edit them.
   */
  async function _autoFillAddressFromLocation(info) {
    if (!window.RKDelivery?.reverseGeocode || info.lat == null || info.lng == null) return;

    // If the new-address form isn't visible yet, click "Naya Address Add Karo"
    // to open it (re-use the existing button instead of duplicating its logic).
    let line1Input = document.getElementById('addr-line1');
    if (!line1Input) {
      const addNewBtn = document.querySelector('.addr-add-btn');
      if (addNewBtn && addNewBtn.textContent.includes('Naya Address')) {
        addNewBtn.click();
      }
    }

    const addr = await window.RKDelivery.reverseGeocode(info.lat, info.lng);
    if (!addr) return;

    // Re-query after the form may have just opened.
    const line1El = document.getElementById('addr-line1');
    const cityEl  = document.getElementById('addr-city');
    const pinEl   = document.getElementById('addr-pin');

    // Only fill fields that are currently empty, so we never overwrite
    // something the customer already typed.
    if (line1El && !line1El.value.trim() && addr.line1) {
      line1El.value = addr.line1;
      line1El.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (cityEl && addr.city) {
      // City has a default ('Jaunpur'), so only overwrite if detected city differs
      // and the field still holds the default placeholder value.
      if (!cityEl.value.trim() || cityEl.value.trim() === 'Jaunpur') {
        cityEl.value = addr.city;
        cityEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    if (pinEl && addr.pincode) {
      if (!pinEl.value.trim() || pinEl.value.trim() === '222001') {
        pinEl.value = addr.pincode;
        pinEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    if (line1El && addr.line1) {
      window.RKCheckoutLocation.showToast('📍 Address auto-fill ho gaya — check karke confirm karein', 3500);
    }
  }

  function _updateTotalDisplay(info) {
    // Find total row and add delivery charge if applicable.
    const rows = document.querySelectorAll('.total-row');
    rows.forEach(row => {
      if (row.dataset.rkDeliveryInjected) return;
      row.dataset.rkDeliveryInjected = '1';

      if (info.charge > 0) {
        const delivRow = document.createElement('div');
        delivRow.className = 'osi';
        delivRow.id = 'rk-delivery-charge-row';
        delivRow.style.cssText = 'font-size:.78rem;color:#1D4ED8;font-weight:600;';
        delivRow.innerHTML = `<span>🚚 Delivery Charge</span><span>₹${info.charge}</span>`;
        row.parentElement.insertBefore(delivRow, row);
      }
    });
  }
})();


// ═══════════════════════════════════════════════════════════════════════════════
// OPTION B — Full React replacement (paste over CheckoutForm in index.html's
// Babel script).  Search for "function CheckoutForm(" and replace with this.
// ═══════════════════════════════════════════════════════════════════════════════
/*

function CheckoutForm({ cart, total: cartTotal, showToast, onSuccess, user }) {
  const [pay, setPay] = React.useState('');
  const [f, setF] = React.useState({ name: user?.name || '', phone: '' });
  const [addresses, setAddresses] = React.useState([]);
  const [loadingAddrs, setLoadingAddrs] = React.useState(true);
  const [selectedAddrId, setSelectedAddrId] = React.useState(null);
  const [showNewForm, setShowNewForm] = React.useState(false);
  const [newAddr, setNewAddr] = React.useState({ label: 'Home', line1: '', line2: '', city: 'Jaunpur', pincode: '222001', is_default: false });
  const [savingAddr, setSavingAddr] = React.useState(false);
  const [phoneTouched, setPhoneTouched] = React.useState(false);
  const [placing, setPlacing] = React.useState(false);
  const [orderError, setOrderError] = React.useState('');

  // Location state
  const [locState, setLocState] = React.useState('idle'); // idle | loading | success | denied
  const [deliveryInfo, setDeliveryInfo] = React.useState(null);
  const [deliveryCharge, setDeliveryCharge] = React.useState(0);

  const total = cartTotal + deliveryCharge;

  // ── Load saved addresses ──────────────────────────────────────────
  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!user || !window.RKProfile) { setShowNewForm(true); setLoadingAddrs(false); return; }
      try {
        const [addrs, profile] = await Promise.all([
          window.RKProfile.loadAddresses(user.uid),
          window.RKProfile.loadProfile(user.uid),
        ]);
        if (!active) return;
        setAddresses(addrs || []);
        const def = (addrs || []).find(a => a.is_default) || (addrs || [])[0];
        if (def) setSelectedAddrId(def.id); else setShowNewForm(true);
        setF(prev => ({ name: prev.name || profile?.name || '', phone: prev.phone || profile?.phone || '' }));
      } catch (_) { if (active) setShowNewForm(true); }
      finally { if (active) setLoadingAddrs(false); }
    })();
    return () => { active = false; };
  }, [user]);

  // ── GPS: detect location and compute delivery ──────────────────────
  async function handleUseLocation() {
    if (!window.RKLocation || !window.RKDelivery) { showToast('Location module load nahi hua'); return; }
    setLocState('loading');
    try {
      const pos = await window.RKLocation.getCurrentPosition(locState === 'success');
      const info = window.RKDelivery.calculate(pos.lat, pos.lng);
      setDeliveryInfo({ ...info, lat: pos.lat, lng: pos.lng });
      setDeliveryCharge(info.charge);
      setLocState('success');
      if (!info.available) showToast('❌ Delivery is area mein available nahi hai.', 4500);
      else if (info.charge === 0) showToast('✅ Free delivery available! ETA: ' + info.eta, 3000);
      else showToast('🚚 Delivery charge: ₹' + info.charge + ' | ETA: ' + info.eta, 3500);
    } catch (err) {
      setLocState(err.code === 1 ? 'denied' : 'error');
      setDeliveryInfo(null);
      showToast(err.message || 'Location fetch failed', 4000);
    }
  }

  // ── Save new address ──────────────────────────────────────────────
  async function saveNewAddress() {
    if (!newAddr.line1.trim() || !newAddr.city.trim() || !/^\d{6}$/.test(newAddr.pincode.trim())) {
      showToast('Address, city aur 6-digit pincode zaroori hai!'); return;
    }
    if (!window.RKProfile || !user) { showToast('Login zaroori hai!'); return; }
    setSavingAddr(true);
    try {
      const addrPayload = {
        ...newAddr,
        latitude   : deliveryInfo?.lat  || null,
        longitude  : deliveryInfo?.lng  || null,
        distance_km: deliveryInfo?.distanceKm || null,
      };
      const saved = await window.RKProfile.saveAddress(user.uid, addrPayload);
      if (saved) {
        setAddresses(prev => {
          const next = newAddr.is_default ? prev.map(a => ({ ...a, is_default: false })) : prev;
          return [...next, saved];
        });
        setSelectedAddrId(saved.id);
        setShowNewForm(false);
        setNewAddr({ label: 'Home', line1: '', line2: '', city: 'Jaunpur', pincode: '222001', is_default: false });
        showToast('Address save ho gaya! 📍');
      } else {
        showToast('Address save nahi hua.');
      }
    } catch (_) { showToast('Error! Dobara try karo.'); }
    finally { setSavingAddr(false); }
  }

  // ── Place order ───────────────────────────────────────────────────
  async function handlePlaceOrder() {
    setPhoneTouched(true);
    setOrderError('');

    if (!f.name.trim()) { showToast('Naam zaroori hai!'); return; }
    if (!/^[6-9]\d{9}$/.test(f.phone.trim())) { showToast('Sahi 10-digit mobile number daalein!'); return; }
    if (!pay) { showToast('Payment method chunein!'); return; }

    const selectedAddr = addresses.find(a => a.id === selectedAddrId) || null;
    if (!selectedAddr) { showToast('Delivery address chunein ya add karein!'); return; }

    // ── Second-layer delivery validation ──────────────────────────
    if (deliveryInfo) {
      const validation = window.RKDelivery.validate(deliveryInfo.lat, deliveryInfo.lng);
      if (!validation.valid) {
        setOrderError(validation.reason);
        showToast('❌ ' + validation.reason, 5000);
        return;
      }
    }

    const addressPayload = {
      name    : f.name.trim(),
      phone   : f.phone.trim(),
      line1   : selectedAddr.line1,
      line2   : selectedAddr.line2 || '',
      city    : selectedAddr.city  || 'Jaunpur',
      pincode : selectedAddr.pincode || '',
    };

    // ── Location payload for Supabase ──────────────────────────────
    const locationPayload = deliveryInfo ? {
      latitude        : deliveryInfo.lat,
      longitude       : deliveryInfo.lng,
      distance_km     : deliveryInfo.distanceKm,
      delivery_charge : deliveryInfo.charge,
      delivery_status : deliveryInfo.tier.id,
      maps_link       : deliveryInfo.mapsLink,
      maps_nav_link   : deliveryInfo.mapsNavLink,
    } : {
      delivery_charge: 0,
      delivery_status: 'unknown',
    };

    setPlacing(true);
    try {
      let result = null;
      if (window.RKOrders && user) {
        result = await window.RKOrders.createOrder(user.uid, {
          cart,
          total,
          address      : addressPayload,
          paymentMethod: pay,
          ...locationPayload,
        });
      }
      if (window.RKOrders && user && !result) {
        setPlacing(false);
        setOrderError('⚠️ Order save nahi hua. Kripya dobara try karein.');
        showToast('Order place nahi ho saka, dobara try karein');
        return;
      }
      const orderNumber = result?.orderNumber || ('RK' + Math.floor(1000 + Math.random() * 9000));
      setPlacing(false);
      if (window.RKCart) window.RKCart.clearCart();
      if (window.RKLocation) window.RKLocation.clearCache();
      onSuccess(orderNumber, pay);
    } catch (err) {
      setPlacing(false);
      setOrderError('⚠️ Kuch galat ho gaya. Kripya dobara try karein.');
      showToast('Order place nahi ho saka');
    }
  }

  const isPhoneValid = /^[6-9]\d{9}$/.test(f.phone.trim());
  const selectedAddr = addresses.find(a => a.id === selectedAddrId) || null;
  const isOutOfRange = deliveryInfo && !deliveryInfo.available;

  // ── Render: location button ───────────────────────────────────────
  function LocationButton() {
    const stateMap = {
      idle   : { text: '📍 Use Current Location', cls: 'rk-loc-btn' },
      loading: { text: '⏳ Getting Location…', cls: 'rk-loc-btn rk-loc-btn--loading', disabled: true },
      success: { text: '✅ Location Detected — Tap to refresh', cls: 'rk-loc-btn rk-loc-btn--success' },
      denied : { text: '🔓 Retry Location Access', cls: 'rk-loc-btn rk-loc-btn--denied' },
      error  : { text: '⚠️ Retry Location', cls: 'rk-loc-btn rk-loc-btn--denied' },
    };
    const s = stateMap[locState] || stateMap.idle;
    return (
      <button
        type="button"
        className={s.cls}
        disabled={!!s.disabled}
        onClick={handleUseLocation}
      >
        {s.text}
      </button>
    );
  }

  // ── Render: delivery status card ──────────────────────────────────
  function DeliveryStatusCard() {
    if (!deliveryInfo) return null;
    const info = deliveryInfo;
    const dist = info.distanceKm < 1 ? Math.round(info.distanceKm * 1000) + ' m' : info.distanceKm.toFixed(1) + ' km';
    return (
      <div className={`rk-ds-container rk-ds-visible dr-status-card ${info.badgeClass}`} style={{ marginBottom: 14 }}>
        <div className="dr-status-header">
          <span className="dr-status-emoji">{info.emoji}</span>
          <div className="dr-status-text">
            <div className="dr-status-label">{info.label}</div>
            {info.available
              ? <div className="dr-status-sub">
                  Delivery: {info.charge === 0 ? <span className="dr-free-tag">FREE</span> : <span className="dr-charge-val">₹{info.charge}</span>}
                </div>
              : <div className="dr-status-sub dr-status-sub--warn">
                  Hum is location par deliver nahi karte.
                </div>
            }
          </div>
        </div>
        <div className="dr-meta-row">
          <div className="dr-meta-item">
            <span className="dr-meta-icon">📍</span>
            <div>
              <div className="dr-meta-label">Distance</div>
              <div className="dr-meta-val">{dist}</div>
            </div>
          </div>
          {info.available && <>
            <div className="dr-meta-item">
              <span className="dr-meta-icon">💰</span>
              <div>
                <div className="dr-meta-label">Delivery</div>
                <div className="dr-meta-val">{info.charge === 0 ? 'FREE' : '₹' + info.charge}</div>
              </div>
            </div>
            <div className="dr-meta-item">
              <span className="dr-meta-icon">⏱️</span>
              <div>
                <div className="dr-meta-label">ETA</div>
                <div className="dr-meta-val">{info.eta}</div>
              </div>
            </div>
          </>}
        </div>
        {!info.available && (
          <div className="dr-unavail-msg">
            ❌ Aapka location hamari 8 km delivery range se bahar hai ({info.distanceKm.toFixed(1)} km).
            Abhi hum sirf Jaunpur aur aas-paas ke areas mein deliver karte hain.
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="co-card">
        <div className="co-card-title">📋 Order Summary</div>
        {cart.slice(0, 4).map(i => (
          <div key={i.id} className="osi">
            <span>{i.name} ×{i.qty}</span>
            <span><b>₹{(i.price * i.qty).toFixed(0)}</b></span>
          </div>
        ))}
        {cart.length > 4 && <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>+{cart.length - 4} more items</div>}
        {deliveryInfo && deliveryInfo.charge > 0 && (
          <div className="osi" style={{ color: '#1D4ED8', fontWeight: 600 }}>
            <span>🚚 Delivery Charge</span>
            <span>₹{deliveryInfo.charge}</span>
          </div>
        )}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem' }}>
          <span>Total</span>
          <span style={{ color: 'var(--primary)' }}>₹{total.toFixed(0)}</span>
        </div>
      </div>

      <div className="co-card">
        <div className="co-card-title">🙋 Contact Details</div>
        <label className="field-label" htmlFor="co-name">Aapka naam</label>
        <input id="co-name" className="inp" placeholder="Aapka naam *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <label className="field-label" htmlFor="co-phone">Mobile number</label>
        <input id="co-phone" className="inp" type="tel" inputMode="numeric" maxLength="10" placeholder="10-digit mobile number *" value={f.phone}
          onChange={e => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
          onBlur={() => setPhoneTouched(true)} />
        {phoneTouched && !isPhoneValid && (
          <div className="phone-error">⚠️ Sahi 10-digit mobile number daalein (jaise 9876543210)</div>
        )}
      </div>

      <div className="co-card">
        <div className="co-card-title">📍 Delivery Address</div>

        <LocationButton />
        <DeliveryStatusCard />

        {loadingAddrs
          ? <div style={{ fontSize: '0.8rem', color: 'var(--gray)', padding: '8px 0' }}>Addresses load ho rahe hain…</div>
          : <>
            {addresses.map(a => (
              <div key={a.id} className={`addr-card ${selectedAddrId === a.id ? 'sel' : ''}`}
                onClick={() => { setSelectedAddrId(a.id); setShowNewForm(false); }}>
                <div className="addr-card-label-row">
                  <span className="addr-card-label">{a.label}</span>
                  {a.is_default && <span className="addr-default-tag">DEFAULT</span>}
                </div>
                <div className="addr-card-text">
                  {a.line1}{a.line2 ? ', ' + a.line2 : ''}<br />
                  {a.city}{a.pincode ? ' - ' + a.pincode : ''}
                  {a.distance_km ? <span style={{ color: 'var(--gray)', fontSize: '0.68rem' }}> ({Number(a.distance_km).toFixed(1)} km)</span> : null}
                </div>
              </div>
            ))}
            {!showNewForm && <button className="addr-add-btn" onClick={() => setShowNewForm(true)}>+ Naya Address Add Karo</button>}
          </>
        }

        {showNewForm && (
          <div style={{ border: '1.5px dashed var(--border)', borderRadius: 12, padding: 12, marginTop: 6 }}>
            <label className="field-label">Label</label>
            <input className="inp" placeholder="Label (Home/Office)" value={newAddr.label} onChange={e => setNewAddr({ ...newAddr, label: e.target.value })} />
            <label className="field-label">Pura pata *</label>
            <input className="inp" placeholder="Ghar ka pura pata, gali, makaan no. *" value={newAddr.line1} onChange={e => setNewAddr({ ...newAddr, line1: e.target.value })} />
            <label className="field-label">Landmark</label>
            <input className="inp" placeholder="Mohalla / Landmark (optional)" value={newAddr.line2} onChange={e => setNewAddr({ ...newAddr, line2: e.target.value })} />
            <div className="addr-form-grid">
              <div>
                <label className="field-label">City *</label>
                <input className="inp" placeholder="City *" value={newAddr.city} onChange={e => setNewAddr({ ...newAddr, city: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Pincode *</label>
                <input className="inp" placeholder="222001 *" value={newAddr.pincode} onChange={e => setNewAddr({ ...newAddr, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
              </div>
            </div>
            {deliveryInfo && <DeliveryStatusCard />}
            <button className="addr-add-btn" disabled={savingAddr} onClick={saveNewAddress} style={{ background: 'var(--primary)', color: '#fff' }}>
              {savingAddr ? 'Saving…' : '💾 Address Save Karke Use Karo'}
            </button>
            {addresses.length > 0 && <button className="addr-add-btn" style={{ marginTop: 6 }} onClick={() => setShowNewForm(false)}>Cancel</button>}
          </div>
        )}

        <a href="account.html?tab=addresses" rel="noopener" className="addr-manage-link">✏️ Saare Addresses Manage Karo →</a>
      </div>

      <div className="co-card">
        <div className="co-card-title">💳 Payment Method</div>
        <div className="pay-grid">
          <div className={`pay-card ${pay === 'cod' ? 'sel' : ''}`} onClick={() => setPay('cod')}>
            <div className="pi">💵</div><div className="pl">Cash on Delivery</div><div className="pd">Ghar pe cash dena</div>
          </div>
          <div className={`pay-card ${pay === 'upi' ? 'sel' : ''}`} onClick={() => setPay('upi')}>
            <div className="pi">📱</div><div className="pl">UPI / QR Code</div><div className="pd">Scan karke pay karo</div>
          </div>
        </div>
      </div>

      {orderError && <div className="order-error-banner" role="alert">⚠️ {orderError.replace(/^⚠️\s+/, '')}</div>}

      {isOutOfRange && (
        <div className="order-error-banner" role="alert">
          ❌ Sorry, aapka location hamari delivery area se bahar hai.
          Order place karna possible nahi hai.
        </div>
      )}

      <button
        className="place-order-btn"
        disabled={placing || isOutOfRange}
        style={isOutOfRange ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        onClick={handlePlaceOrder}
      >
        {placing
          ? '⏳ Order Place Ho Raha Hai...'
          : isOutOfRange
            ? '❌ Delivery Not Available in Your Area'
            : pay === 'upi' ? '📲 Order Confirm Karein' : '🚚 Order Place Karo'} →
      </button>
    </>
  );
}

*/
