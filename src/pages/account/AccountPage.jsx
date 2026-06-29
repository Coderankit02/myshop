import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { uploadToCloudinary } from '../../lib/cloudinary';

/* ─── helpers ─────────────────────────────── */
const fmt      = n => '₹' + Number(n).toLocaleString('en-IN');
const fmtDate  = d => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
const fmtTime  = d => new Date(d).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
const memberSince = d => { const dt=new Date(d); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]+' '+dt.getFullYear(); };
const loyaltyLevel = n => {
  if (n>=50) return { label:'🥇 Gold Member',  color:'#F59E0B' };
  if (n>=20) return { label:'🥈 Silver Member', color:'#94A3B8' };
  if (n>=5)  return { label:'🥉 Bronze Member', color:'#B45309' };
  return { label:'🌱 New Member', color:'#10B981' };
};
const statusLabel = s => ({ pending:'Pending', confirmed:'Confirmed', out_for_delivery:'Out for Delivery', delivered:'Delivered', cancelled:'Cancelled' }[s]||s);
const notifColor  = t => ({ offer:'#FFF7ED', order:'#EFF6FF', delivery:'#F5F3FF', stock:'#F0FDF4', system:'#F8FAFC' }[t]||'#F8FAFC');
const notifIcon   = t => ({ offer:'🎁', order:'📦', delivery:'🚴', stock:'📢', system:'ℹ️' }[t]||'🔔');
const addrIcon    = l => { const s=(l||'').toLowerCase(); if(s.includes('home')) return '🏠'; if(s.includes('office')||s.includes('work')) return '🏢'; return '📍'; };

const TABS = [
  { id:'overview',      icon:'🏠', label:'Overview' },
  { id:'orders',        icon:'📦', label:'Orders' },
  { id:'addresses',     icon:'📍', label:'Addresses' },
  { id:'profile',       icon:'👤', label:'Profile' },
  { id:'wishlist',      icon:'❤️', label:'Wishlist' },
  { id:'notifications', icon:'🔔', label:'Alerts' },
  { id:'rewards',       icon:'⭐', label:'Rewards' },
  { id:'settings',      icon:'⚙️', label:'Settings' },
];

function Toast({ msg }) {
  return msg ? <div className="toast" style={{display:'block'}}>{msg}</div> : null;
}

function Modal({ html, onClose }) {
  if (!html) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()} dangerouslySetInnerHTML={{__html:html}}/>
    </div>
  );
}

/* ─── Overview Tab ────────────────────────── */
function OverviewTab({ state, switchTab }) {
  const p = state.profile;
  const totalOrders = state.orders.length;
  const savings     = state.orders.reduce((s,o)=>s+(o.discount||0),0);
  const unread      = state.notifications.filter(n=>!n.is_read).length;
  const loyalty     = loyaltyLevel(totalOrders);
  const recentOrders = state.orders.slice(0,3);

  return (
    <>
      {/* Hero */}
      <div className="hero-card">
        <div className="hero-bg-circle1"/><div className="hero-bg-circle2"/><div className="hero-bg-dots"/>
        <div className="hero-top">
          <div className="avatar-wrap">
            <div className="avatar">{p?.avatar_url ? <img src={p.avatar_url} alt=""/> : (p?.name?p.name[0].toUpperCase():'👤')}</div>
            <div className="avatar-edit-btn" onClick={()=>switchTab('profile')}>✏️</div>
          </div>
          <div className="hero-info">
            <div className="hero-greeting">👋 Namaste,</div>
            <div className="hero-name">{p?.name||'User'}</div>
            <div className="hero-email">{p?.email||''}</div>
            <div className="loyalty-pill"><span style={{color:loyalty.color}}>{loyalty.label}</span></div>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hstat"><div className="hstat-val">{totalOrders}</div><div className="hstat-lbl">Orders</div></div>
          <div className="hstat"><div className="hstat-val">{fmt(savings)}</div><div className="hstat-lbl">Saved</div></div>
          <div className="hstat"><div className="hstat-val">{memberSince(p?.created_at||state.user?.created_at)}</div><div className="hstat-lbl">Member Since</div></div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="stats-grid">
        {[
          {icon:'📦',val:totalOrders,        lbl:'Orders',    tab:'orders'},
          {icon:'💰',val:fmt(savings),        lbl:'Savings',   tab:'rewards'},
          {icon:'❤️',val:state.wishlist.length,lbl:'Wishlist',  tab:'wishlist'},
          {icon:'📍',val:state.addresses.length,lbl:'Addresses',tab:'addresses'},
          {icon:'🛒',val:state.cartCount,     lbl:'Cart',      tab:null,href:'index.html'},
          {icon:'🔔',val:unread,              lbl:'Alerts',    tab:'notifications'},
        ].map(s=>(
          <div key={s.lbl} className="stat-tile" onClick={()=>s.tab?switchTab(s.tab):(window.location.href='index.html')}>
            <div className="stat-tile-icon">{s.icon}</div>
            <div className="stat-tile-val">{s.val}</div>
            <div className="stat-tile-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="card-head">
          <div className="card-title"><span className="card-title-icon">📦</span> Recent Orders</div>
          <button className="card-action-btn" onClick={()=>switchTab('orders')}>View All</button>
        </div>
        <div className="divider"/>
        {recentOrders.length
          ? recentOrders.map(o=><OrderRow key={o.id} o={o}/>)
          : <EmptyState icon="🛒" title="Koi order nahi abhi tak" sub="Apna pehla order place karo!" cta="Shop Now →" onCta={()=>window.location.href='index.html'}/>}
      </div>

      {/* Quick actions */}
      <div className="card">
        <div className="card-head"><div className="card-title"><span className="card-title-icon">⚡</span> Quick Actions</div></div>
        <div className="divider"/>
        <div className="qa-grid">
          {[
            {i:'🛍️',t:'Shop Now',     s:'Browse products',    fn:()=>window.location.href='index.html'},
            {i:'📍',t:'Add Address',  s:'Save delivery spot', fn:()=>switchTab('addresses')},
            {i:'❤️',t:'My Wishlist',  s:'Saved products',     fn:()=>switchTab('wishlist')},
            {i:'🎁',t:'Refer & Earn', s:'Get ₹30 cashback',   fn:()=>switchTab('rewards')},
          ].map(a=>(
            <div key={a.t} className="qa-tile" onClick={a.fn}>
              <div className="qa-icon">{a.i}</div>
              <div className="qa-title">{a.t}</div>
              <div className="qa-sub">{a.s}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function OrderRow({ o, onClick }) {
  return (
    <div className="order-row" onClick={onClick}>
      <div className="order-icon-box">🛒</div>
      <div className="order-info">
        <div className="order-num">{o.order_number}</div>
        <div className="order-meta">{o.delivery_name||''} • {o.delivery_city||'Jaunpur'}</div>
        <div className="order-date">{fmtTime(o.created_at)}</div>
      </div>
      <div className="order-right">
        <div className="order-amt">{fmt(o.final_amount)}</div>
        <div className={`badge badge-${o.status}`}>{statusLabel(o.status)}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, sub, cta, onCta }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
      {cta && <button className="empty-cta" onClick={onCta}>{cta}</button>}
    </div>
  );
}

/* ─── Orders Tab ──────────────────────────── */
function OrdersTab({ state, showToast }) {
  const [modal, setModal] = useState(null);

  async function viewOrder(o) {
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', o.id);
    const statuses = ['pending','confirmed','out_for_delivery','delivered'];
    const curIdx   = statuses.indexOf(o.status);
    const tlSteps  = [
      { icon:'✅', label:'Order Placed',    sub:fmtTime(o.created_at) },
      { icon:'🏪', label:'Confirmed',        sub:'Store ne accept kiya' },
      { icon:'🚴', label:'Out for Delivery', sub:'Delivery boy on the way' },
      { icon:'🎉', label:'Delivered',        sub:'Order deliver ho gaya' },
    ];
    setModal({ o, items:items||[], tlSteps, curIdx });
  }

  async function reorder(orderId) {
    if (window.RKOrders) { await window.RKOrders.reorder(orderId); showToast('Items cart mein add ho gaye! 🛒'); setTimeout(()=>window.location.href='index.html',1600); }
  }

  return (
    <>
      <div className="card">
        <div className="card-head"><div className="card-title"><span className="card-title-icon">📦</span> My Orders ({state.orders.length})</div></div>
        <div className="divider"/>
        {state.orders.length
          ? state.orders.map(o=><OrderRow key={o.id} o={o} onClick={()=>viewOrder(o)}/>)
          : <EmptyState icon="📦" title="Koi order nahi mila" sub="Pehla order place karo!" cta="Shop Now →" onCta={()=>window.location.href='index.html'}/>}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Order {modal.o.order_number}</div>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div>
                  <div style={{fontSize:'.72rem',color:'var(--muted)',marginBottom:2}}>Total Amount</div>
                  <div style={{fontSize:'1.3rem',fontWeight:900,color:'var(--primary)'}}>{fmt(modal.o.final_amount)}</div>
                </div>
                <div className={`badge badge-${modal.o.status}`} style={{fontSize:'.72rem',padding:'5px 14px'}}>{statusLabel(modal.o.status)}</div>
              </div>

              <div className="section-label">Order Status</div>
              <div className="tl">
                {modal.tlSteps.map((step,i)=>{
                  let cls = i<modal.curIdx?'done':i===modal.curIdx?'active':'waiting';
                  if (modal.o.status==='cancelled') cls='waiting';
                  return (
                    <div key={i} className="tl-item">
                      <div className={`tl-dot ${cls}`}>{step.icon}</div>
                      <div className="tl-content">
                        <div className={`tl-label ${cls}`}>{step.label}</div>
                        <div className="tl-sub">{cls!=='waiting'?step.sub:'Awaited'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="divider" style={{marginBottom:16}}/>
              <div className="section-label">Items Ordered</div>
              {modal.items.map(it=>(
                <div key={it.id} className="oi-row">
                  <div className="oi-left">
                    <span style={{fontSize:'1.5rem'}}>{it.emoji||'🛒'}</span>
                    <div><div className="oi-name">{it.name}</div><div className="oi-unit">{it.unit} × {it.qty}</div></div>
                  </div>
                  <div className="oi-total">{fmt(it.line_total)}</div>
                </div>
              ))}

              <div className="divider" style={{margin:'14px 0'}}/>
              <div className="section-label">Delivery To</div>
              <div style={{fontSize:'.82rem',lineHeight:1.7,color:'var(--text)'}}>
                <b>{modal.o.delivery_name}</b><br/>
                📞 {modal.o.delivery_phone}<br/>
                📍 {modal.o.delivery_line1}{modal.o.delivery_line2?', '+modal.o.delivery_line2:''}, {modal.o.delivery_city}{modal.o.delivery_pincode?' - '+modal.o.delivery_pincode:''}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:18}}>
                {modal.o.status==='delivered'
                  ? <button className="btn-primary" onClick={()=>{reorder(modal.o.id);setModal(null);}}>🔁 Reorder</button>
                  : <div/>}
                <button className="btn-secondary" onClick={()=>setModal(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Addresses Tab ───────────────────────── */
function AddressesTab({ state, setState, showToast }) {
  const [form, setForm] = useState(null); // null = hidden, {} = new, {id,...} = edit

  async function saveAddr() {
    const line1 = form.line1?.trim();
    const line2 = form.line2?.trim();
    const city  = form.city?.trim();
    const pin   = form.pincode?.trim();
    if (!line1||!line2||!city||!/^\d{6}$/.test(pin)) { showToast('Address, landmark, city aur 6-digit pincode zaroori hai!'); return; }
    const payload = { label:form.label||'Home', line1, line2, city, pincode:pin, is_default:!!form.is_default, id:form.id||undefined };
    let saved;
    if (window.RKProfile) saved = await window.RKProfile.saveAddress(state.user.id, payload);
    if (!saved) {
      if (payload.is_default) await supabase.from('addresses').update({is_default:false}).eq('user_id',state.user.id);
      if (payload.id) { const {data}=await supabase.from('addresses').update(payload).eq('id',payload.id).select().single(); saved=data; }
      else { const {data}=await supabase.from('addresses').insert({...payload,user_id:state.user.id}).select().single(); saved=data; }
    }
    if (saved) {
      showToast('Address save ho gaya! 📍');
      const {data}=await supabase.from('addresses').select('*').eq('user_id',state.user.id).order('is_default',{ascending:false});
      setState(s=>({...s,addresses:data||[]}));
      setForm(null);
    } else { showToast('Error! Dobara try karo.'); }
  }

  async function deleteAddr(id) {
    if (!confirm('Yeh address delete karein?')) return;
    if (window.RKProfile) await window.RKProfile.deleteAddress(state.user.id, id);
    else await supabase.from('addresses').delete().eq('id',id).eq('user_id',state.user.id);
    setState(s=>({...s,addresses:s.addresses.filter(a=>a.id!==id)}));
    showToast('Address delete ho gaya!');
  }

  async function setDefault(id) {
    if (window.RKProfile) await window.RKProfile.setDefaultAddress(state.user.id, id);
    else {
      await supabase.from('addresses').update({is_default:false}).eq('user_id',state.user.id);
      await supabase.from('addresses').update({is_default:true}).eq('id',id);
    }
    const {data}=await supabase.from('addresses').select('*').eq('user_id',state.user.id).order('is_default',{ascending:false});
    setState(s=>({...s,addresses:data||[]}));
    showToast('Default address set ho gaya! ✅');
  }

  const f = form||{};
  const upd = v => setForm(s=>({...s,...v}));

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div className="card-title"><span className="card-title-icon">📍</span> Saved Addresses ({state.addresses.length})</div>
          <button className="card-action-btn" onClick={()=>setForm({})}>+ Add New</button>
        </div>
        <div className="divider"/>
        {state.addresses.length
          ? state.addresses.map(a=>(
            <div key={a.id} className="addr-row">
              <div className="addr-icon-box">{addrIcon(a.label)}</div>
              <div className="addr-info">
                <div className="addr-label-row">
                  <span className="addr-label">{a.label}</span>
                  {a.is_default&&<span className="default-tag">DEFAULT</span>}
                </div>
                <div className="addr-text">{a.line1}{a.line2?', '+a.line2:''}<br/>{a.city}{a.pincode?' - '+a.pincode:''}</div>
                <div className="addr-actions">
                  <button className="addr-btn addr-btn-edit" onClick={()=>setForm({...a})}>✏️ Edit</button>
                  <button className="addr-btn addr-btn-del" onClick={()=>deleteAddr(a.id)}>🗑️ Delete</button>
                  {!a.is_default&&<button className="addr-btn addr-btn-default" onClick={()=>setDefault(a.id)}>✓ Set Default</button>}
                </div>
              </div>
            </div>
          ))
          : <EmptyState icon="📍" title="Koi address nahi" sub="Delivery ke liye address add karo" cta="+ Add Address" onCta={()=>setForm({})}/>}
      </div>

      {form!==null && (
        <div className="card" style={{marginTop:0}}>
          <div className="card-head"><div className="card-title">{f.id?'✏️ Edit Address':'➕ New Address'}</div></div>
          <div className="divider"/>
          <div className="card-body">
            <div className="field-group"><label className="field-label">Label</label><input className="inp" placeholder="e.g. Home / Office" value={f.label||''} onChange={e=>upd({label:e.target.value})}/></div>
            <div className="field-group"><label className="field-label">Address Line 1 *</label><input className="inp" placeholder="House no., Street name" value={f.line1||''} onChange={e=>upd({line1:e.target.value})}/></div>
            <div className="field-group"><label className="field-label">Address Line 2 (Landmark) *</label><input className="inp" placeholder="Mohalla, Landmark" value={f.line2||''} onChange={e=>upd({line2:e.target.value})}/></div>
            <div className="form-grid">
              <div className="field-group"><label className="field-label">City *</label><input className="inp" value={f.city||'Jaunpur'} onChange={e=>upd({city:e.target.value})}/></div>
              <div className="field-group"><label className="field-label">Pincode *</label><input className="inp" placeholder="222001" type="tel" value={f.pincode||''} onChange={e=>upd({pincode:e.target.value})}/></div>
            </div>
            <div className="toggle-wrap">
              <div className={`toggle ${f.is_default?'on':''}`} onClick={()=>upd({is_default:!f.is_default})}><div className="toggle-dot"/></div>
              <span className="toggle-label">Set as default delivery address</span>
            </div>
            <button className="btn-primary" onClick={saveAddr}>💾 Save Address</button>
            <div style={{height:10}}/>
            <button className="btn-secondary" onClick={()=>setForm(null)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Profile Tab ─────────────────────────── */
function ProfileTab({ state, setState, showToast }) {
  const [name, setName]    = useState(state.profile?.name||'');
  const [phone, setPhone]  = useState(state.profile?.phone||'');
  const [preview, setPreview] = useState(null);
  const [file, setFile]    = useState(null);
  const [saving, setSaving]= useState(false);

  const p = state.profile||{};

  function previewAvatar(e) {
    const f = e.target.files[0]; if (!f) return;
    setFile(f);
    const r = new FileReader(); r.onload=ev=>setPreview(ev.target.result); r.readAsDataURL(f);
  }

  async function saveProfile() {
    if (!name.trim()) { showToast('Naam zaroori hai!'); return; }
    setSaving(true);
    let avatar_url = p.avatar_url||null;
    if (file) {
      try {
        const { url, error: upErr } = await uploadToCloudinary(file, `myshop/avatars/${state.user.id}`);
        if (upErr || !url) showToast('⚠️ Photo upload fail');
        else avatar_url = url;
      } catch(err) { showToast('⚠️ Photo upload error'); }
    }
    let updated=null;
    try {
      if (window.RKProfile) updated=await window.RKProfile.updateProfile(state.user.id,{name:name.trim(),phone,avatar_url});
      if (!updated) {
        const {data,error}=await supabase.from('profiles').upsert({id:state.user.id,name:name.trim(),phone,avatar_url,email:state.user.email,updated_at:new Date().toISOString()}).select().single();
        if (error) showToast('⚠️ Save error: '+error.message); else updated=data;
      }
    } catch(err) { showToast('⚠️ Error: '+(err.message||err)); }
    setSaving(false);
    if (updated) { setState(s=>({...s,profile:updated})); showToast('Profile update ho gaya! ✅'); }
  }

  return (
    <div className="card">
      <div className="card-head"><div className="card-title"><span className="card-title-icon">👤</span> Edit Profile</div></div>
      <div className="divider"/>
      <div className="card-body">
        <label htmlFor="avatarInput">
          <div className="avatar-upload-row">
            <div className="avatar-big">
              {preview ? <img src={preview} alt=""/> : p.avatar_url ? <img src={p.avatar_url} alt=""/> : (p.name?p.name[0].toUpperCase():'👤')}
            </div>
            <div>
              <div className="avatar-upload-info-title">📷 Photo Change Karo</div>
              <div className="avatar-upload-info-sub">JPG, PNG • Max 2MB</div>
            </div>
          </div>
        </label>
        <input type="file" id="avatarInput" accept="image/*" style={{display:'none'}} onChange={previewAvatar}/>

        <div className="field-group"><label className="field-label">Full Name *</label><input className="inp" value={name} onChange={e=>setName(e.target.value)} placeholder="Aapka naam"/></div>
        <div className="field-group"><label className="field-label">Email</label><input className="inp" value={p.email||''} readOnly placeholder="Email"/></div>
        <div className="field-group"><label className="field-label">Phone Number</label><input className="inp" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="10-digit mobile" type="tel" maxLength={10}/></div>
        <div className="info-box" style={{marginBottom:14}}>
          📅 Member since: <b>{memberSince(p.created_at||state.user?.created_at)}</b>
          &nbsp;•&nbsp; 🆔 ID: <span style={{fontSize:'.65rem',opacity:.6}}>{state.user?.id?.slice(0,8)}…</span>
        </div>
        <button className="btn-primary" onClick={saveProfile} disabled={saving}>{saving?'⏳ Saving...':'💾 Profile Save Karo'}</button>
      </div>
    </div>
  );
}

/* ─── Wishlist Tab ────────────────────────── */
function WishlistTab({ state, setState, showToast }) {
  async function addToCart(w) {
    if (!window.RKCart) return;
    await window.RKCart.addToCart({id:w.product_id,name:w.name,unit:w.unit,price:w.price,e:w.emoji,cat:w.category});
    showToast(`${w.name} cart mein add! 🛒`);
  }
  async function remove(w) {
    const {error}=await supabase.from('wishlist').delete().eq('id',w.id).eq('user_id',state.user.id);
    if (!error) { setState(s=>({...s,wishlist:s.wishlist.filter(x=>x.id!==w.id)})); showToast('Wishlist se hata diya'); }
  }
  return (
    <div className="card">
      <div className="card-head"><div className="card-title"><span className="card-title-icon">❤️</span> My Wishlist ({state.wishlist.length})</div></div>
      <div className="divider"/>
      {state.wishlist.length
        ? state.wishlist.map(w=>(
          <div key={w.id} className="wish-row">
            <div className="wish-emoji-box">{w.emoji||'🛒'}</div>
            <div className="wish-info">
              <div className="wish-name">{w.name}</div>
              <div className="wish-unit">{w.unit||''}</div>
              <div className="wish-price">₹{w.price}</div>
            </div>
            <div className="wish-actions">
              <button className="wish-add-btn" onClick={()=>addToCart(w)}>🛒 Add</button>
              <button className="wish-del-btn" onClick={()=>remove(w)}>🗑️ Remove</button>
            </div>
          </div>
        ))
        : <EmptyState icon="❤️" title="Wishlist khali hai" sub="Products par ❤️ tap karo" cta="Browse Products →" onCta={()=>window.location.href='index.html'}/>}
    </div>
  );
}

/* ─── Notifications Tab ───────────────────── */
function NotificationsTab({ state, setState, showToast }) {
  async function markRead(n) {
    if (n.is_read) return;
    await supabase.from('notifications').update({is_read:true}).eq('id',n.id);
    setState(s=>({...s,notifications:s.notifications.map(x=>x.id===n.id?{...x,is_read:true}:x)}));
  }
  async function markAll() {
    await supabase.from('notifications').update({is_read:true}).eq('user_id',state.user.id).eq('is_read',false);
    setState(s=>({...s,notifications:s.notifications.map(n=>({...n,is_read:true}))}));
    showToast('Sab notifications read mark ho gaye ✅');
  }
  const unread = state.notifications.filter(n=>!n.is_read);
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          <span className="card-title-icon">🔔</span> Notifications
          {unread.length>0&&<span style={{background:'var(--red)',color:'#fff',borderRadius:'50%',width:20,height:20,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'.62rem',fontWeight:800}}>{unread.length}</span>}
        </div>
        {unread.length>0&&<button className="card-action-btn" onClick={markAll}>Mark All Read</button>}
      </div>
      <div className="divider"/>
      {state.notifications.length
        ? state.notifications.map(n=>(
          <div key={n.id} className={`notif-row ${!n.is_read?'unread':''}`} onClick={()=>markRead(n)}>
            <div className="notif-icon-box" style={{background:notifColor(n.type)}}>{notifIcon(n.type)}</div>
            <div className="notif-body">
              <div className="notif-title">{n.title||'Notification'}</div>
              <div className="notif-msg">{n.message||''}</div>
              <div className="notif-time">{fmtTime(n.created_at)}</div>
            </div>
            {!n.is_read?<div className="unread-dot"/>:<div className="read-dot"/>}
          </div>
        ))
        : <EmptyState icon="🔔" title="Koi notification nahi" sub="Offers aur order updates yahan dikhenge"/>}
    </div>
  );
}

/* ─── Rewards Tab ─────────────────────────── */
function RewardsTab({ state }) {
  const totalOrders    = state.orders.length;
  const deliveredCount = state.orders.filter(o=>o.status==='delivered').length;
  const pts            = deliveredCount*10;
  const savings        = state.orders.reduce((s,o)=>s+(o.discount||0),0);
  const refCode        = 'RINKU'+(state.user?.id||'').slice(0,6).toUpperCase();
  const nextTarget     = totalOrders<5?5:totalOrders<20?20:50;
  const progress       = Math.min((totalOrders/nextTarget)*100,100);
  const loyalty        = loyaltyLevel(totalOrders);

  function copy() { navigator.clipboard.writeText(refCode).then(()=>alert('Code copy ho gaya! 📋')); }
  function share() {
    const txt=`Rinku Kirana par order karo!\nMera referral code: ${refCode}\nDono ko ₹30 cashback milega 🎉\nhttps://rinkukirana.com`;
    if (navigator.share) navigator.share({title:'Rinku Kirana',text:txt});
    else window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`);
  }

  return (
    <>
      <div className="rewards-hero">
        <div style={{fontSize:'.68rem',color:'rgba(255,255,255,0.6)',fontWeight:700,letterSpacing:'.8px',textTransform:'uppercase',marginBottom:4}}>Your Points</div>
        <div className="rw-pts">{pts}</div>
        <div className="rw-pts-lbl">Total Reward Points</div>
        <div className="rw-bar-bg"><div className="rw-bar" style={{width:progress+'%'}}/></div>
        <div className="rw-bar-labels"><span>{loyalty.label}</span><span>{totalOrders}/{nextTarget} orders</span></div>
        <div className="rw-chips">
          <div className="rw-chip"><div className="rw-chip-val">{deliveredCount}</div><div className="rw-chip-lbl">Delivered</div></div>
          <div className="rw-chip"><div className="rw-chip-val">{fmt(savings)}</div><div className="rw-chip-lbl">Total Saved</div></div>
          <div className="rw-chip"><div className="rw-chip-val">{pts}</div><div className="rw-chip-lbl">Points</div></div>
        </div>
      </div>

      <div className="referral-box">
        <div style={{fontSize:'.82rem',fontWeight:800,color:'#C2410C'}}>🎁 Dost ko refer karo, dono ko ₹30 cashback!</div>
        <div className="ref-code-box">
          <span className="ref-code">{refCode}</span>
          <button className="ref-copy-btn" onClick={copy}>📋 Copy</button>
        </div>
        <div style={{fontSize:'.71rem',color:'#EA580C',marginBottom:10}}>Minimum order ₹199 • Ek baar per user</div>
        <button className="ref-share-btn" onClick={share}>📤 WhatsApp Par Share Karo</button>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title"><span className="card-title-icon">ℹ️</span> Points Kaise Milenge?</div></div>
        <div className="divider"/>
        <div className="card-body">
          {[
            {i:'🛒',t:'Order Karo',  s:'Har delivered order = 10 points',        bg:'#E8F8F1'},
            {i:'👥',t:'Refer Karo',  s:'Dost ka pehla order = 50 bonus points',  bg:'#EFF6FF'},
            {i:'⭐',t:'Redeem Karo', s:'100 points = ₹10 discount (coming soon)', bg:'#FFFBEB'},
          ].map(r=>(
            <div key={r.t} className="how-row">
              <div className="how-icon" style={{background:r.bg}}>{r.i}</div>
              <div><div className="how-title">{r.t}</div><div className="how-sub">{r.s}</div></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ─── Settings Tab ────────────────────────── */
function SettingsTab({ state, switchTab }) {
  const [dark, setDark] = useState(document.documentElement.getAttribute('data-theme')==='dark');

  function toggleTheme() {
    const t = dark?'light':'dark';
    document.documentElement.setAttribute('data-theme',t);
    try { localStorage.setItem('rk_theme',t); } catch(e){}
    const m=document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content',t==='dark'?'#0F1521':'#15803D');
    setDark(!dark);
  }

  async function logout() {
    if (!confirm('Logout karna chahte hain?')) return;
    await supabase.auth.signOut();
    window.location.href='index.html';
  }

  const rows = [
    {icon:'🔒',bg:'#EFF6FF',label:'Change Password',   sub:'Password update karo',          fn:()=>window.location.href='forgot-password.html'},
    {icon:'🔔',bg:'#FFF7ED',label:'Notifications',     sub:'Offers aur updates manage karo', fn:()=>switchTab('notifications')},
    {icon:'👤',bg:'#F0FDF4',label:'Edit Profile',      sub:'Name, phone update karo',        fn:()=>switchTab('profile')},
    {icon:'📍',bg:'#F5F3FF',label:'Manage Addresses',  sub:'Delivery addresses',             fn:()=>switchTab('addresses')},
    {icon:'⭐',bg:'#FFFBEB',label:'Rewards & Referral',sub:'Points aur cashback',            fn:()=>switchTab('rewards')},
    {icon:'📦',bg:'#F0FDF4',label:'Order History',     sub:'Purane orders dekhein',          fn:()=>switchTab('orders')},
    {icon:'📱',bg:'#F8FAFC',label:'App Version',       sub:'v1.0.0 • Rinku Kirana',          fn:null},
  ];

  return (
    <>
      <div className="card">
        <div className="card-head"><div className="card-title"><span className="card-title-icon">⚙️</span> Settings</div></div>
        <div className="divider"/>
        {rows.map(r=>(
          <div key={r.label} className="settings-row" onClick={r.fn||undefined} style={r.fn?{cursor:'pointer'}:{}}>
            <div className="settings-left">
              <div className="settings-icon" style={{background:r.bg}}>{r.icon}</div>
              <div><div className="settings-label">{r.label}</div><div className="settings-sub">{r.sub}</div></div>
            </div>
            {r.fn&&<div className="settings-arrow">›</div>}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title"><span className="card-title-icon">💳</span> Payment Methods</div></div>
        <div className="divider"/>
        {[{icon:'💵',bg:'#F0FDF4',name:'Cash on Delivery',sub:'Ghar pe cash dena'},{icon:'📱',bg:'#EFF6FF',name:'UPI / QR Code',sub:'rinkukirana@upi'}].map(p=>(
          <div key={p.name} className="payment-row">
            <div className="payment-icon" style={{background:p.bg}}>{p.icon}</div>
            <div className="payment-info"><div className="payment-name">{p.name}</div><div className="payment-sub">{p.sub}</div></div>
            <span className="active-badge">Active</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title"><span className="card-title-icon">🌗</span> Appearance</div></div>
        <div className="divider"/>
        <div className="card-body">
          <div className="toggle-wrap" style={{marginBottom:0}}>
            <div className={`toggle ${dark?'on':''}`} onClick={toggleTheme}><div className="toggle-dot"/></div>
            <span className="toggle-label">Dark Mode</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <button className="btn-danger" onClick={logout}>🚪 Logout</button>
        </div>
      </div>

      <div style={{textAlign:'center',fontSize:'.68rem',color:'var(--muted)',padding:'10px 0 20px',lineHeight:2}}>
        🛒 Rinku Kirana Store • Jaunpur<br/>
        📞 6393196765 • v1.0.0
      </div>
    </>
  );
}

/* ─── Main AccountPage ────────────────────── */
export default function AccountPage() {
  const urlTab = new URLSearchParams(window.location.search).get('tab');
  const VALID  = TABS.map(t=>t.id);
  const [activeTab, setActiveTab] = useState(VALID.includes(urlTab)?urlTab:'overview');
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState('');
  const [state, setState]         = useState({
    user:null, profile:null,
    orders:[], addresses:[], wishlist:[], notifications:[],
    cartCount:0,
  });

  function showToast(msg) {
    setToast(msg);
    setTimeout(()=>setToast(''),2600);
  }

  function switchTab(tab) {
    setActiveTab(tab);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  useEffect(()=>{
    (async()=>{
      const {data:{session}}=await supabase.auth.getSession();
      if (!session?.user) { window.location.href='login.html'; return; }
      const user = session.user;

      const [profileR,ordersR,addrR,wishR,notifR] = await Promise.allSettled([
        (async()=>{ const {data}=await supabase.from('profiles').select('*').eq('id',user.id).single(); return data||{id:user.id,name:user.user_metadata?.name||user.email.split('@')[0],email:user.email,phone:'',avatar_url:null,created_at:user.created_at}; })(),
        (async()=>{ const {data}=await supabase.from('orders').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(25); return data||[]; })(),
        (async()=>{ if(window.RKProfile?.loadAddresses) return await window.RKProfile.loadAddresses(user.id); const {data}=await supabase.from('addresses').select('*').eq('user_id',user.id).order('is_default',{ascending:false}); return data||[]; })(),
        (async()=>{ const {data}=await supabase.from('wishlist').select('*').eq('user_id',user.id).order('created_at',{ascending:false}); return data||[]; })(),
        (async()=>{ const {data}=await supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30); return data||[]; })(),
      ]);

      setState({
        user,
        profile:      profileR.status==='fulfilled'?profileR.value:{id:user.id,name:user.user_metadata?.name||user.email.split('@')[0],email:user.email},
        orders:       ordersR.status==='fulfilled'?ordersR.value:[],
        addresses:    addrR.status==='fulfilled'?addrR.value:[],
        wishlist:     wishR.status==='fulfilled'?wishR.value:[],
        notifications:notifR.status==='fulfilled'?notifR.value:[],
        cartCount:    window.RKCart?window.RKCart.getCount():0,
      });
      setLoading(false);
    })();
  },[]);

  if (loading) return (
    <div id="loadingPage">
      <div className="loader-ring"/>
      <div style={{fontSize:'.85rem',fontWeight:600,color:'var(--muted)'}}>Loading your account…</div>
    </div>
  );

  const tabProps = { state, setState, showToast, switchTab };

  return (
    <>
      <div className="topnav">
        <div className="topnav-left">
          <button className="back-btn" onClick={()=>window.location.href='index.html'}>←</button>
          <span className="topnav-title">My Account</span>
        </div>
        <a href="index.html" className="logo-link">rinku<span>.</span></a>
      </div>

      <div className="tabs-bar">
        {TABS.map(t=>(
          <button key={t.id} className={`tab-btn ${activeTab===t.id?'on':''}`} onClick={()=>switchTab(t.id)}>
            <span className="tb-icon">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div id="app">
        <div className="page">
          {activeTab==='overview'      && <OverviewTab {...tabProps}/>}
          {activeTab==='orders'        && <OrdersTab {...tabProps}/>}
          {activeTab==='addresses'     && <AddressesTab {...tabProps}/>}
          {activeTab==='profile'       && <ProfileTab {...tabProps}/>}
          {activeTab==='wishlist'      && <WishlistTab {...tabProps}/>}
          {activeTab==='notifications' && <NotificationsTab {...tabProps}/>}
          {activeTab==='rewards'       && <RewardsTab {...tabProps}/>}
          {activeTab==='settings'      && <SettingsTab {...tabProps}/>}
        </div>
      </div>

      <nav className="bottom-nav">
        <a href="index.html" className="bn-item"><span className="bn-icon">🏠</span><span className="bn-label">Home</span></a>
        <a href="index.html#shop" className="bn-item"><span className="bn-icon">🛍️</span><span className="bn-label">Shop</span></a>
        <a href="index.html" className="bn-item"><span className="bn-icon">🛒</span><span className="bn-label">Cart</span></a>
        <a href="account.html" className="bn-item on"><span className="bn-icon">👤</span><span className="bn-label">Account</span></a>
      </nav>

      <div id="toastEl" className="toast" style={{display:toast?'block':'none'}}>{toast}</div>
    </>
  );
}