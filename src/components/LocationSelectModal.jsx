import { useEffect, useState } from 'react';
import { MapPin, X, Navigation, Loader2, Truck, CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * LocationSelectModal — Header ka "📍 Aapka Mohalla ▾" pill ab yahan kholta hai.
 *
 * BUG FIX (complete): Pehle pill par click karne par sirf toast aata tha
 * ("Location change abhi available nahi hai") — location change hona hi
 * possible nahi tha, aur label bhi sirf logged-in users ke saved-address
 * city par depend karta tha. Ab:
 *   1. GPS auto-detect → distance + delivery tier (FREE/₹charge/❌) live dikhta hai
 *   2. Reverse-geocode se city + pincode auto-bhar jaata hai (editable)
 *   3. Manual fallback: city + 6-digit pincode bhi daal sakte hain
 *   4. Confirm par localStorage (`rk_header_location`) me save → guest users ke
 *      liye bhi header label update hota hai (sirf logged-in nahi)
 *   5. Checkout par GPS resolve hote hi header me "City • X km" turant dikhega
 *
 * Delivery availability hamesha checkout par GPS se final confirm hoti hai —
 * manual pincode se coords nahi nikalte, isliye modal yahi note dikhata hai.
 */
export default function LocationSelectModal({ open, current, onClose, onConfirm }) {
  const [step, setStep] = useState('idle'); // idle | detecting | detected | error
  const [error, setError] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [geo, setGeo] = useState(null);
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [saving, setSaving] = useState(false);

  // Har open par current (saved) location se prefill + state reset
  useEffect(() => {
    if (!open) return;
    setStep('idle');
    setError('');
    setDeliveryInfo(null);
    setGeo(null);
    setCity(current?.city || '');
    setPincode(current?.pincode || '');
    setSaving(false);
  }, [open, current]);

  // Escape se close + body scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  async function handleDetect() {
    if (!window.RKLocation || !window.RKDelivery) {
      setStep('error');
      setError('Location module load nahi hua — page refresh karein.');
      return;
    }
    setStep('detecting');
    setError('');
    try {
      const pos = await window.RKLocation.getCurrentPosition(true);
      const info = window.RKDelivery.calculate(pos.lat, pos.lng);
      setDeliveryInfo(info);
      setGeo({ lat: pos.lat, lng: pos.lng });
      // Reverse geocode → city + pincode auto-fill (editable, best-effort)
      try {
        const addr = await window.RKDelivery.reverseGeocode(pos.lat, pos.lng);
        if (addr?.city) setCity(addr.city);
        if (addr?.pincode) setPincode(addr.pincode);
      } catch (_) { /* city manual rahega — koi problem nahi */ }
      setStep('detected');
    } catch (err) {
      setStep('error');
      setError(err?.message || 'Location detect nahi ho payi. Manual entry use karein.');
    }
  }

  function handleConfirm() {
    if (!city.trim() || !/^\d{6}$/.test(pincode.trim())) {
      setError('City aur 6-digit pincode zaroori hai.');
      return;
    }
    const loc = {
      city: city.trim(),
      pincode: pincode.trim(),
      mode: geo ? 'gps' : 'manual',
      distanceKm: deliveryInfo?.distanceKm ?? null,
      charge: deliveryInfo?.charge ?? null,
      available: deliveryInfo?.available ?? null,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      ts: Date.now(),
    };
    setSaving(true);
    onConfirm(loc);
    setTimeout(() => { setSaving(false); onClose(); }, 250);
  }

  if (!open) return null;

  const pinValid = /^\d{6}$/.test(pincode.trim());
  const canConfirm = city.trim().length > 0 && pinValid;

  const StatusCard = deliveryInfo ? (
    <div
      className="rounded-2xl p-4 mt-4"
      style={{
        background: !deliveryInfo.available
          ? 'linear-gradient(135deg,#FEF2F2,#FEE2E2)'
          : deliveryInfo.charge === 0
            ? 'linear-gradient(135deg,#E8F8F1,#D1FAE5)'
            : 'linear-gradient(135deg,#EFF6FF,#DBEAFE)',
        border: '1.5px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>
          {!deliveryInfo.available ? '❌' : deliveryInfo.charge === 0 ? '✅' : '🚚'}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-extrabold font-poppins" style={{ color: 'var(--dark)' }}>
            {deliveryInfo.available
              ? (deliveryInfo.charge === 0 ? 'FREE Delivery available!' : 'Delivery available')
              : 'Delivery not available'}
          </div>
          <div className="text-[11px] font-semibold font-poppins" style={{ color: 'var(--gray)' }}>
            {deliveryInfo.available
              ? `${deliveryInfo.distanceKm < 1 ? Math.round(deliveryInfo.distanceKm * 1000) + ' m' : deliveryInfo.distanceKm.toFixed(1) + ' km'} away • ETA ${deliveryInfo.eta}${deliveryInfo.charge > 0 ? ' • ₹' + deliveryInfo.charge : ''}`
              : `${deliveryInfo.distanceKm} km — hamari delivery range se bahar`}
          </div>
        </div>
      </div>
      {!deliveryInfo.available && (
        <div className="mt-2.5 text-[11px] font-semibold font-poppins leading-relaxed" style={{ color: '#B91C1C' }}>
          ❌ Aapka location delivery range se bahar hai. Abhi hum sirf Jaunpur aur aas-paas
          ke areas me deliver karte hain. Phir bhi order kar sakte hain — admin verify karega.
        </div>
      )}
    </div>
  ) : null;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Apna location chunein"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6"
        style={{ background: 'var(--card-bg)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '88vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--primary-light)' }}
            >
              <MapPin size={22} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <div className="text-base font-extrabold font-poppins" style={{ color: 'var(--dark)' }}>
                Apna Delivery Location
              </div>
              <div className="text-[11px] font-semibold font-poppins" style={{ color: 'var(--gray)' }}>
                Delivery charge aur ETA turant dikhegi
              </div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Band karein" className="p-1.5 rounded-lg hover:opacity-70">
            <X size={20} style={{ color: 'var(--gray)' }} />
          </button>
        </div>

        {/* GPS detect button */}
        <button
          onClick={handleDetect}
          disabled={step === 'detecting'}
          className="w-full flex items-center justify-center gap-2 mt-5 rounded-2xl py-3.5 text-sm font-bold font-poppins transition-all"
          style={{
            background: step === 'detected' ? 'var(--primary)' : 'var(--primary-light)',
            color: step === 'detected' ? '#fff' : 'var(--primary-dark)',
            border: '1.5px solid var(--primary)',
            opacity: step === 'detecting' ? 0.7 : 1,
            cursor: step === 'detecting' ? 'not-allowed' : 'pointer',
          }}
        >
          {step === 'detecting' ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Location detect ho rahi hai...
            </>
          ) : step === 'detected' ? (
            <>
              <CheckCircle2 size={18} /> Location mil gayi — dobara detect karein?
            </>
          ) : (
            <>
              <Navigation size={18} /> Use Current Location
            </>
          )}
        </button>

        {step === 'detected' && StatusCard}

        {step === 'error' && error && (
          <div
            className="mt-4 rounded-2xl p-3.5 text-xs font-semibold font-poppins flex items-start gap-2"
            style={{ background: 'var(--primary-light)', color: '#C2410C', border: '1.5px solid #FED7AA' }}
          >
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error} — neeche manual entry use karein.</span>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1" style={{ borderTop: '1px dashed var(--border)' }} />
          <span className="text-[11px] font-bold font-poppins uppercase tracking-wider" style={{ color: 'var(--gray)' }}>
            ya manual daalein
          </span>
          <div className="flex-1" style={{ borderTop: '1px dashed var(--border)' }} />
        </div>

        {/* Manual entry */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold font-poppins mb-1.5 block" style={{ color: 'var(--gray)' }}>
              City / Area *
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Jaunpur"
              className="w-full rounded-xl px-3.5 py-3 text-sm font-poppins outline-none"
              style={{ background: 'var(--light)', border: '1.5px solid var(--border)', color: 'var(--dark)' }}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold font-poppins mb-1.5 block" style={{ color: 'var(--gray)' }}>
              Pincode *
            </label>
            <input
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="222001"
              inputMode="numeric"
              className="w-full rounded-xl px-3.5 py-3 text-sm font-poppins outline-none"
              style={{
                background: 'var(--light)',
                border: '1.5px solid ' + (pincode && !pinValid ? '#FCA5A5' : 'var(--border)'),
                color: 'var(--dark)',
              }}
            />
          </div>
        </div>

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          disabled={!canConfirm || saving}
          className="w-full flex items-center justify-center gap-2 mt-5 rounded-2xl py-3.5 text-sm font-extrabold font-poppins text-white transition-all"
          style={{
            background: canConfirm ? 'var(--primary)' : 'var(--border)',
            cursor: canConfirm && !saving ? 'pointer' : 'not-allowed',
            opacity: saving ? 0.7 : 1,
            boxShadow: canConfirm ? '0 4px 18px rgba(27,166,114,0.28)' : 'none',
          }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
          {saving ? 'Saving...' : 'Confirm Location'}
        </button>

        <p className="text-[10.5px] font-medium font-poppins text-center mt-3 leading-relaxed" style={{ color: 'var(--gray)' }}>
          <Truck size={11} className="inline mr-1" style={{ verticalAlign: '-1px' }} />
          Delivery availability order time par GPS se confirm hoti hai. Location kahin bhi set karein — header me city turant dikhegi.
        </p>
      </div>
    </div>
  );
}
