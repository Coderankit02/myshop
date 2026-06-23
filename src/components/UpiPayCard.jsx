/* ══════════════════════════════════════════════════════════
   UpiPayCard (unchanged from original)
══════════════════════════════════════════════════════════ */
export function UpiPayCard({total,upiId}){
  return(
    <div className="upi-pay-card">
      <div className="upi-pay-head">
        <div className="upi-pay-head-row"><span>🛒 Rinku Kirana Store</span></div>
        <div className="upi-pay-amt-row"><span className="upi-pay-amt-label">Amount to pay</span><span className="upi-pay-amt">₹{total}</span></div>
      </div>
      <div className="upi-pay-body">
        <div className="upi-trust-badge"><span>🔒 100% Secure Payment — BHIM UPI</span></div>
        <div className="bhim-wordmark"><span>BHIM</span><span className="bhim-flag-arrow saffron"/><span>UPI</span><span className="bhim-flag-arrow green"/></div>
        <div className="upi-qr-wrap"><div className="upi-qr-box"><img src="/images/payment-qr.png" alt="Rinku Kirana UPI QR Code"/></div></div>
        <div className="upi-qr-hint">📷 Kisi bhi UPI app se scan karein</div>
        <div className="upi-amt-notice">💰 Scan karne ke baad <b>₹{total}</b> amount khud type karein</div>
        <div className="upi-app-grid">
          <div className="upi-app-icon white"><div style={{fontSize:'0.95rem',fontWeight:700}}><span style={{color:'#4285F4'}}>G</span><span style={{color:'#EA4335'}}>P</span><span style={{color:'#FBBC05'}}>a</span><span style={{color:'#34A853'}}>y</span></div></div>
          <div className="upi-app-icon white"><span style={{fontSize:'0.75rem',fontWeight:700,color:'#00BAF2',fontStyle:'italic'}}>paytm</span></div>
          <div className="upi-app-icon white"><div style={{width:28,height:28,borderRadius:'50%',background:'#1A1A2E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',fontWeight:700,color:'#fff',fontStyle:'italic'}}>pay</div></div>
          <div className="upi-app-icon" style={{background:'linear-gradient(135deg,#7C4DCC,#5F259F)'}}><span style={{fontSize:'1.1rem',fontWeight:700,color:'#fff',lineHeight:1}}>पे</span></div>
          <div className="upi-app-icon" style={{background:'linear-gradient(135deg,#5F259F,#00BAF2)'}}><span style={{fontSize:'0.82rem',fontWeight:900,color:'#fff',fontStyle:'italic'}}>Pe</span></div>
        </div>
        <div className="upi-pay-id-row"><span>🔒 UPI ID: {upiId}</span></div>
      </div>
    </div>
  );
}
