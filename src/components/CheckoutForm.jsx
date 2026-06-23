import { useState, useEffect } from 'react';
import { UpiPayCard } from './UpiPayCard';

/* ══════════════════════════════════════════════════════════
   CheckoutForm
══════════════════════════════════════════════════════════ */
export function CheckoutForm({cart,total:cartTotal,showToast,onSuccess,user,onLocationResolved}){
  const [pay,setPay]=useState('');
  const [f,setF]=useState({name:user?.name||'',phone:''});
  const [addresses,setAddresses]=useState([]);
  const [loadingAddrs,setLoadingAddrs]=useState(true);
  const [selectedAddrId,setSelectedAddrId]=useState(null);
  const [showNewForm,setShowNewForm]=useState(false);
  const [newAddr,setNewAddr]=useState({label:'Home',line1:'',line2:'',city:'Jaunpur',pincode:'222001',is_default:false});
  const [savingAddr,setSavingAddr]=useState(false);
  const [phoneTouched,setPhoneTouched]=useState(false);
  const [placing,setPlacing]=useState(false);
  const [orderError,setOrderError]=useState('');
  const [orderInfo,setOrderInfo]=useState(null);
  const [showVerifyForm,setShowVerifyForm]=useState(false);
  const [utr,setUtr]=useState('');
  const [screenshotFile,setScreenshotFile]=useState(null);
  const [screenshotPreview,setScreenshotPreview]=useState(null);
  const [submittingVerify,setSubmittingVerify]=useState(false);
  const [pendingOrder,setPendingOrder]=useState(null);
  // GPS / delivery-radius state — GPS stays OPTIONAL. If the user denies or
  // it fails, checkout still works with the manually-entered/saved address.
  // It only auto-triggers (asks for permission) once an address is on screen.
  const [locState,setLocState]=useState('idle'); // idle | loading | success | denied | error
  const [deliveryInfo,setDeliveryInfo]=useState(null);
  const total=cartTotal;
  const COUNTDOWN_SEC=600;
  const REMINDER_AFTER_SEC=120;
  const [remainingSec,setRemainingSec]=useState(COUNTDOWN_SEC);
  useEffect(()=>{
    if(!showVerifyForm)return;
    setRemainingSec(COUNTDOWN_SEC);
    const t=setInterval(()=>setRemainingSec(s=>{
      if(s<=1){
        clearInterval(t);
        setShowVerifyForm(false);
        setPendingOrder(null);
        // Polish fix: timer expiry now keeps the user on the checkout form (so they can
        // retry payment / pick COD instead) rather than bouncing them all the way home
        // and risking the impression their cart got cleared.
        showToast('⏰ Time khatam ho gaya — dobara try karein');
        return 0;
      }
      return s-1;
    }),1000);
    return()=>clearInterval(t);
  },[showVerifyForm]);
  const fmtTime=s=>{const m=Math.floor(s/60);const ss=String(s%60).padStart(2,'0');return`${m}:${ss}`;};
  const showWaitHint=remainingSec<=COUNTDOWN_SEC-REMINDER_AFTER_SEC;
  const UPI_ID='Q025544077@ybl';
  useEffect(()=>{
    let active=true;
    (async()=>{
      if(!user||!window.RKProfile){setShowNewForm(true);setLoadingAddrs(false);return;}
      try{
        const [addrs,profile]=await Promise.all([window.RKProfile.loadAddresses(user.uid),window.RKProfile.loadProfile(user.uid)]);
        if(!active)return;
        setAddresses(addrs||[]);
        const def=(addrs||[]).find(a=>a.is_default)||(addrs||[])[0];
        // Bug fix: explicitly close the new-address form when a saved address is found.
        // Previously only the "no address" branch touched showNewForm, so if it had
        // been set true on an earlier run, the form stayed open even after a saved
        // address loaded — showing both the address card and the empty form together.
        if(def){setSelectedAddrId(def.id);setShowNewForm(false);}else setShowNewForm(true);
        setF(prev=>({name:prev.name||profile?.name||'',phone:prev.phone||profile?.phone||''}));
      }catch(err){if(active)setShowNewForm(true);}
      finally{if(active)setLoadingAddrs(false);}
    })();
    return()=>{active=false;};
  },[user]);

  // ── GPS: optional, best-effort delivery-distance check ──────────────
  // Never blocks checkout. If denied/unsupported/failed, user proceeds
  // with their saved/manual address exactly as before.
  const handleUseLocation=async()=>{
    if(!window.RKLocation||!window.RKDelivery){return;}
    setLocState('loading');
    try{
      const pos=await window.RKLocation.getCurrentPosition(locState==='success');
      const info=window.RKDelivery.calculate(pos.lat,pos.lng);
      setDeliveryInfo({...info,lat:pos.lat,lng:pos.lng});
      setLocState('success');
      // Bubble the resolved distance up to the header (App level). This never
      // triggers GPS itself — it only reacts to checkout's own optional fetch.
      if(onLocationResolved)onLocationResolved(info.distanceKm);
    }catch(err){
      setLocState(err && err.code===1?'denied':'error');
      setDeliveryInfo(null);
    }
  };

  // Auto-trigger the GPS prompt as soon as an address is on screen (either a
  // saved address card, or the new-address form) — mirrors the same
  // auto-trigger pattern used on the Account → Addresses page. Fires once;
  // if the user denies, we don't ask again automatically.
  useEffect(()=>{
    if(loadingAddrs)return;
    if(!selectedAddrId&&!showNewForm)return;
    if(locState!=='idle')return;
    handleUseLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[loadingAddrs,selectedAddrId,showNewForm]);

  const isPhoneValid=/^[6-9]\d{9}$/.test(f.phone.trim());
  const selectedAddr=addresses.find(a=>a.id===selectedAddrId)||null;
  const saveNewAddress=async()=>{
    if(!newAddr.line1.trim()||!newAddr.line2.trim()||!newAddr.city.trim()||!/^\d{6}$/.test(newAddr.pincode.trim())){showToast('Address, landmark, city aur 6-digit pincode zaroori hai!');return;}
    if(!window.RKProfile||!user){showToast('Login zaroori hai!');return;}
    setSavingAddr(true);
    try{
      const saved=await window.RKProfile.saveAddress(user.uid,newAddr);
      if(saved){setAddresses(prev=>{const next=newAddr.is_default?prev.map(a=>({...a,is_default:false})):prev;return[...next,saved];});setSelectedAddrId(saved.id);setShowNewForm(false);setNewAddr({label:'Home',line1:'',line2:'',city:'Jaunpur',pincode:'222001',is_default:false});showToast('Address save ho gaya! 📍');}
      else showToast('Address save nahi hua.');
    }catch(err){showToast('Error! Dobara try karo.');}
    finally{setSavingAddr(false);}
  };
  const handleScreenshotChange=e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    if(file.size>5*1024*1024){showToast('Screenshot 5MB se chhota hona chahiye');return;}
    setScreenshotFile(file);
    const r=new FileReader();r.onload=()=>setScreenshotPreview(r.result);r.readAsDataURL(file);
  };
  const handlePlaceOrder=async()=>{
    setPhoneTouched(true);
    setOrderError('');
    if(!f.name.trim()){showToast('Naam zaroori hai!');return;}
    if(!isPhoneValid){showToast('Sahi 10-digit mobile number daalein!');return;}
    if(!pay){showToast('Payment method chunein!');return;}
    if(!selectedAddr){showToast('Delivery address chunein ya add karein!');return;}
    const addressPayload={name:f.name.trim(),phone:f.phone.trim(),line1:selectedAddr.line1,line2:selectedAddr.line2||'',city:selectedAddr.city||'Jaunpur',pincode:selectedAddr.pincode||''};
    // GPS is optional and never blocks checkout. If it resolved and the
    // location looks out of the normal delivery range, we don't stop the
    // order — we just flag it so the admin can verify and accept/reject.
    let locationPayload={};
    if(deliveryInfo){
      const validation=window.RKDelivery.validate(deliveryInfo.lat,deliveryInfo.lng);
      locationPayload={
        latitude:deliveryInfo.lat,longitude:deliveryInfo.lng,distance_km:deliveryInfo.distanceKm,
        delivery_status:deliveryInfo.tier.id,admin_review_needed:!validation.valid,
      };
      if(!validation.valid){
        showToast('📍 Out of service area — your order is confirmed after admin verification.',4500);
      }
    }
    if(pay==='cod'){
      setPlacing(true);
      try{
        let result=null;
        if(window.RKOrders&&user)result=await window.RKOrders.createOrder(user.uid,{cart,total,address:addressPayload,paymentMethod:pay,...locationPayload});
        // Frontend-only fix: previously a failed/null createOrder() still showed the
        // success screen with a randomly-generated fake order number. Now we only
        // show success if the order actually saved (or if no backend hook exists at all,
        // which preserves old behaviour for environments without window.RKOrders).
        if(window.RKOrders&&user&&!result){
          setPlacing(false);
          setOrderError('⚠️ Order save nahi hua. Kripya dobara try karein ya thodi der baad try karein.');
          showToast('Order place nahi ho saka, dobara try karein');
          return;
        }
        const orderNumber=result?.orderNumber||('RK'+Math.floor(1000+Math.random()*9000));
        setPlacing(false);
        if(window.RKCart)window.RKCart.clearCart();
        onSuccess(orderNumber,'cod');
      }catch(err){
        setPlacing(false);
        setOrderError('⚠️ Kuch galat ho gaya. Kripya dobara try karein.');
        showToast('Order place nahi ho saka');
      }
      return;
    }
    // Bug fix #3: don't fabricate/display a fake order number before any order actually
    // exists. The QR/verification screen now shows "Pending" until createOrder() succeeds
    // inside handleSubmitVerification, avoiding the confusing temp-number swap.
    setPendingOrder({address:addressPayload,paymentMethod:pay,locationPayload});
    setOrderInfo({orderId:null,orderNumber:null});
    setShowVerifyForm(true);
  };
  const handleSubmitVerification=async()=>{
    const utrClean=utr.trim();
    if(!/^\d{12}$/.test(utrClean)){showToast('Sahi 12-digit UTR / Transaction ID daalein');return;}
    if(!screenshotFile){showToast('Payment screenshot upload karein');return;}
    if(!window.RKPayment){showToast('Verification system load nahi hua');return;}
    if(!pendingOrder){showToast('Order data missing');return;}
    setSubmittingVerify(true);
    let result=null;
    if(window.RKOrders&&user)result=await window.RKOrders.createOrder(user.uid,{cart,total,address:pendingOrder.address,paymentMethod:pendingOrder.paymentMethod,...(pendingOrder.locationPayload||{})});
    if(!result){setSubmittingVerify(false);showToast('Order create nahi hua');return;}
    const realOrderId=result.orderId;
    const realOrderNumber=result.orderNumber||('RK'+Math.floor(1000+Math.random()*9000));
    const screenshotUrl=await window.RKPayment.uploadScreenshot(screenshotFile,realOrderNumber);
    if(!screenshotUrl){setSubmittingVerify(false);showToast('Screenshot upload fail hua');return;}
    const saved=await window.RKPayment.submitVerification(user?.uid,{orderId:realOrderId,orderNumber:realOrderNumber,customerName:f.name.trim(),mobile:f.phone.trim(),utr:utrClean,screenshotUrl,amount:total});
    setSubmittingVerify(false);
    if(saved){if(window.RKCart)window.RKCart.clearCart();onSuccess(realOrderNumber,'upi');}
    else showToast('Verification submit nahi hua');
  };
  if(showVerifyForm){
    return(
      <div className="qr-fullscreen">
        <div className="qr-fs-header">
          <button className="qr-fs-close" aria-label="Band karein" onClick={()=>{setShowVerifyForm(false);setPendingOrder(null);}}>✕</button>
          <div className="qr-fs-title">Payment Karein</div>
          <div className={`qr-fs-timer ${remainingSec<=60?'urgent':''}`}>⏱ {fmtTime(remainingSec)}</div>
        </div>
        <div className="qr-fs-body">
          <div className="qr-fs-amt-label">{orderInfo?.orderNumber?`Order #${orderInfo.orderNumber}`:'Order pending — verification ke baad confirm hoga'}</div>
          <div className="qr-fs-amt">₹{total}</div>
          <UpiPayCard total={total} upiId={UPI_ID}/>
          {showWaitHint&&<div className="payment-wait-hint"><span>⏰</span><span>QR dobara scan karein ya UPI ID <b>{UPI_ID}</b> par manually pay karein</span></div>}
          <div className="co-card" style={{width:'100%',marginTop:14}}>
            <div className="co-card-title">🧾 Payment Verification</div>
            <label className="field-label" htmlFor="utr-input">UTR / Transaction ID</label>
            <input id="utr-input" className="inp" placeholder="UTR / Transaction ID *" value={utr} onChange={e=>setUtr(e.target.value.replace(/\s/g,''))}/>
            <div className="utr-hint">UTR aapke UPI app ke payment history mein milega (12 digit number)</div>
            <label className={`upload-box ${screenshotFile?'has-file':''}`}>
              <input type="file" accept="image/*" onChange={handleScreenshotChange} aria-label="Payment screenshot upload karein"/>
              {!screenshotPreview?<><div style={{fontSize:'1.8rem'}}>📷</div><div style={{fontWeight:700,fontSize:'0.85rem',marginTop:6}}>Payment Screenshot Upload Karein</div><div style={{fontSize:'0.7rem',color:'var(--gray)',marginTop:2}}>JPG/PNG • Max 5MB</div></>
                :<img className="upload-preview" src={screenshotPreview} alt="Screenshot preview"/>}
            </label>
          </div>
          <button className="place-order-btn" style={{marginTop:14}} disabled={submittingVerify} onClick={handleSubmitVerification}>
            {submittingVerify?'⏳ Submitting...':'✅ Verification Submit Karein'}
          </button>
        </div>
      </div>
    );
  }
  return(
    <>
      <div className="co-card">
        <div className="co-card-title">📋 Order Summary</div>
        {cart.slice(0,4).map(i=><div key={i.id} className="osi"><span>{i.name} ×{i.qty}</span><span><b>₹{(i.price*i.qty).toFixed(0)}</b></span></div>)}
        {cart.length>4&&<div style={{fontSize:'0.72rem',color:'var(--gray)'}}>+{cart.length-4} more items</div>}
        <div style={{borderTop:'1px solid var(--border)',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:'0.9rem'}}><span>Total</span><span style={{color:'var(--primary)'}}>₹{total.toFixed(0)}</span></div>
      </div>
      <div className="co-card">
        <div className="co-card-title">🙋 Contact Details</div>
        <label className="field-label" htmlFor="co-name">Aapka naam</label>
        <input id="co-name" className="inp" placeholder="Aapka naam *" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
        <label className="field-label" htmlFor="co-phone">Mobile number</label>
        <input id="co-phone" className="inp" type="tel" inputMode="numeric" maxLength="10" placeholder="10-digit mobile number *" value={f.phone} onChange={e=>setF({...f,phone:e.target.value.replace(/\D/g,'').slice(0,10)})} onBlur={()=>setPhoneTouched(true)}/>
        {phoneTouched&&!isPhoneValid&&<div className="phone-error">⚠️ Sahi 10-digit mobile number daalein (jaise 9876543210)</div>}
      </div>
      <div className="co-card">
        <div className="co-card-title">📍 Delivery Address</div>
        {(selectedAddrId||showNewForm)&&(
          <div style={{marginBottom:10}}>
            <button type="button" className="loc-detect-btn" disabled={locState==='loading'} onClick={handleUseLocation}>
              {locState==='loading'?'⏳ Location detect ho rahi hai…'
                :locState==='success'?'✅ Location Detected — Tap to refresh'
                :locState==='denied'?'🔓 Retry Location Access'
                :locState==='error'?'⚠️ Retry Location'
                :'📍 Use Current Location'}
            </button>
            {deliveryInfo&&(
              <div className={`dr-status-card ${deliveryInfo.badgeClass}`} style={{marginTop:8}}>
                <div className="dr-status-header">
                  <span className="dr-status-emoji">{deliveryInfo.emoji}</span>
                  <div className="dr-status-text">
                    <div className="dr-status-label">{deliveryInfo.label}</div>
                    {deliveryInfo.available
                      ?<div className="dr-status-sub">Delivery charge: {deliveryInfo.charge===0?<span className="dr-free-tag">FREE</span>:<span className="dr-charge-val">₹{deliveryInfo.charge}</span>}</div>
                      :<div className="dr-status-sub dr-status-sub--warn">Hum is location par deliver nahi karte.</div>}
                  </div>
                </div>
                <div className="dr-meta-row">
                  <div className="dr-meta-item">
                    <span className="dr-meta-icon">📍</span>
                    <div>
                      <div className="dr-meta-label">Distance</div>
                      <div className="dr-meta-val">{deliveryInfo.distanceKm<1?Math.round(deliveryInfo.distanceKm*1000)+' m':deliveryInfo.distanceKm.toFixed(1)+' km'}</div>
                    </div>
                  </div>
                  {deliveryInfo.available&&<>
                    <div className="dr-meta-item">
                      <span className="dr-meta-icon">💰</span>
                      <div>
                        <div className="dr-meta-label">Delivery</div>
                        <div className="dr-meta-val">{deliveryInfo.charge===0?'FREE':'₹'+deliveryInfo.charge}</div>
                      </div>
                    </div>
                    <div className="dr-meta-item">
                      <span className="dr-meta-icon">⏱️</span>
                      <div>
                        <div className="dr-meta-label">ETA</div>
                        <div className="dr-meta-val">{deliveryInfo.eta}</div>
                      </div>
                    </div>
                  </>}
                </div>
                {!deliveryInfo.available&&(
                  <div className="dr-unavail-msg">
                    ❌ Sorry, aapka location hamari 8 km delivery range se bahar hai.
                    <br/>Abhi hum sirf Jaunpur aur aas-paas ke areas mein deliver karte hain.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {loadingAddrs?<div style={{fontSize:'0.8rem',color:'var(--gray)',padding:'8px 0'}}>Addresses load ho rahe hain…</div>
          :<>
            {addresses.map(a=>(
              <div key={a.id} className={`addr-card ${selectedAddrId===a.id?'sel':''}`} onClick={()=>{setSelectedAddrId(a.id);setShowNewForm(false);}}>
                <div className="addr-card-label-row"><span className="addr-card-label">{a.label}</span>{a.is_default&&<span className="addr-default-tag">DEFAULT</span>}</div>
                <div className="addr-card-text">{a.line1}{a.line2?', '+a.line2:''}<br/>{a.city}{a.pincode?' - '+a.pincode:''}</div>
              </div>
            ))}
            {!showNewForm&&<button className="addr-add-btn" onClick={()=>setShowNewForm(true)}>+ Naya Address Add Karo</button>}
          </>
        }
        {showNewForm&&(
          <div style={{border:'1.5px dashed var(--border)',borderRadius:12,padding:12,marginTop:6}}>
            <label className="field-label" htmlFor="addr-label">Label</label>
            <input id="addr-label" className="inp" placeholder="Label (Home/Office)" value={newAddr.label} onChange={e=>setNewAddr({...newAddr,label:e.target.value})}/>
            <label className="field-label" htmlFor="addr-line1">Pura pata *</label>
            <input id="addr-line1" className="inp" placeholder="Ghar ka pura pata, gali, makaan no. *" value={newAddr.line1} onChange={e=>setNewAddr({...newAddr,line1:e.target.value})} required/>
            <label className="field-label" htmlFor="addr-line2">Landmark *</label>
            <input id="addr-line2" className="inp" placeholder="Mohalla / Landmark *" value={newAddr.line2} onChange={e=>setNewAddr({...newAddr,line2:e.target.value})} required/>
            <div className="addr-form-grid">
              <div>
                <label className="field-label" htmlFor="addr-city">City *</label>
                <input id="addr-city" className="inp" placeholder="City *" value={newAddr.city} onChange={e=>setNewAddr({...newAddr,city:e.target.value})} required/>
              </div>
              <div>
                <label className="field-label" htmlFor="addr-pin">Pincode *</label>
                <input id="addr-pin" className="inp" placeholder="222001 *" value={newAddr.pincode} onChange={e=>setNewAddr({...newAddr,pincode:e.target.value.replace(/\D/g,'').slice(0,6)})} required/>
              </div>
            </div>
            <button className="addr-add-btn" disabled={savingAddr} onClick={saveNewAddress} style={{background:'var(--primary)',color:'#fff'}}>{savingAddr?'Saving…':'💾 Address Save Karke Use Karo'}</button>
            {addresses.length>0&&<button className="addr-add-btn" style={{marginTop:6}} onClick={()=>setShowNewForm(false)}>Cancel</button>}
          </div>
        )}
        {/* Polish fix: removed target="_blank" — opening a new tab for a simple address-manage
            link felt jarring on mobile. It now navigates in the same tab/flow. */}
        <a href="account.html?tab=addresses" rel="noopener" className="addr-manage-link">✏️ Saare Addresses Manage Karo →</a>
      </div>
      <div className="co-card">
        <div className="co-card-title">💳 Payment Method</div>
        <div className="pay-grid">
          <div className={`pay-card ${pay==='cod'?'sel':''}`} onClick={()=>setPay('cod')}><div className="pi">💵</div><div className="pl">Cash on Delivery</div><div className="pd">Ghar pe cash dena</div></div>
          <div className={`pay-card ${pay==='upi'?'sel':''}`} onClick={()=>setPay('upi')}><div className="pi">📱</div><div className="pl">UPI / QR Code</div><div className="pd">Scan karke pay karo</div></div>
        </div>
      </div>
      {orderError&&<div className="order-error-banner" role="alert">⚠️ {orderError.replace(/^⚠️\s*/,'')}</div>}
      {deliveryInfo&&!deliveryInfo.available&&(
        <div className="order-error-banner order-error-banner--info" role="status">
          📍 Aapka location hamari normal delivery area (8 km) se bahar lag raha hai.
          Aap order place kar sakte hain — admin location verify karke order confirm ya cancel karega.
        </div>
      )}
      <button className="place-order-btn" disabled={placing} onClick={handlePlaceOrder}>
        {placing?'⏳ Order Place Ho Raha Hai...':(pay==='upi'?'📲 Order Confirm Karein':'🚚 Order Place Karo')} →
      </button>
    </>
  );
}
