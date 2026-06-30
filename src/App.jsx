import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import { goLogin, goLoginForCheckout, TICKER, calcDiscount, catEmoji } from './lib/helpers';
import { useCategories, useBanners, useProducts, useSearch } from './hooks/dataHooks';
import { SkelCard, SkelBanner, SkelCat } from './components/Skeletons';
import { CartIcon } from './components/CartIcon';
import { PCard } from './components/PCard';
import { ProductDetail } from './components/ProductDetail';
import { CheckoutForm } from './components/CheckoutForm';
import { BannerCardM } from './components/BannerCardM';

// ── Mobile Category Row (outside App to prevent remount on every render) ──
function MobileCatRow({cats,catsLoading,activeCatId,catEmoji,onClick}){
  return(
    <div className="cats-row">
      {catsLoading
        ?[...Array(6)].map((_,i)=><SkelCat key={i}/>)
        :cats.map(c=>(
          <div key={c.id} className={`cat-chip ${activeCatId===c.id?'on':''}`} onClick={()=>onClick(c.id)}>
            <div className="cat-chip-img-box" style={{background:'var(--primary-light)'}}>
              {(c.display_image||c.image_url)?<img src={c.display_image||c.image_url} alt={c.name}/>:<span className="cat-emoji">{catEmoji(c)}</span>}
            </div>
            <div className="cat-chip-name">{c.name}</div>
          </div>
        ))
      }
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App(){
  const [page,setPage]=useState('home');
  const [cart,setCart]=useState([]);
  const [cartOpen,setCartOpen]=useState(false);
  const [activeCatId,setActiveCatId]=useState('all');
  const [search,setSearch]=useState('');
  const [toast,setToast]=useState('');
  const [bannerIdx,setBannerIdx]=useState(0);
  const bannerWrapRef=useRef(null);
  const [success,setSuccess]=useState(null);
  const [user,setUser]=useState(null);
  const [detailProduct,setDetailProduct]=useState(null);
  const [shopPage,setShopPage]=useState(1);
  // Header "📍 Aapka Mohalla ▾" → becomes the user's saved address city once
  // known. Distance gets appended in two ways: (1) silently on every page
  // load/refresh IF the browser has already granted geolocation permission
  // (no prompt — see the silent-geo effect below), or (2) reused from
  // checkout's own (user-initiated) GPS fetch. If no address is saved at
  // all, header stays fully on the hardcoded "Aapka Mohalla" fallback,
  // regardless of distance. GPS is NEVER prompted for on the home page —
  // only read silently when permission already exists.
  const [headerCity,setHeaderCity]=useState(null);
  const [headerDistanceKm,setHeaderDistanceKm]=useState(null);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || document.referrer.includes('android-app://');
  const [theme,setTheme]=useState(()=>{
    try{const s=localStorage.getItem('rk_theme');if(s==='dark'||s==='light')return s;}catch(e){}
    return window.matchMedia?.('(prefers-color-scheme:dark)').matches?'dark':'light';
  });

  // Pages where the search field should not auto-redirect away from the current flow
  const SEARCH_LOCKED_PAGES=['checkout','detail','success'];
  const searchDisabled=SEARCH_LOCKED_PAGES.includes(page);

  // Header height measurement (fix #10): keep desktop sidebar's sticky offset in sync
  // with the *actual* rendered header height instead of a hardcoded 80px, so a wrapped
  // ticker or taller header never gets overlapped by the sidebar.
  const desktopHeaderRef=useRef(null);
  useLayoutEffect(()=>{
    const el=desktopHeaderRef.current;
    if(!el)return;
    const setVar=()=>document.documentElement.style.setProperty('--header-h',(el.offsetHeight+8)+'px');
    setVar();
    const ro=new ResizeObserver(setVar);
    ro.observe(el);
    return()=>ro.disconnect();
  },[]);

  // Data hooks
  const {cats,loading:catsLoading}=useCategories();
  const {banners,loading:bannersLoading}=useBanners();
  // Bug fix #4: only let the search hook run while the search UI is actually active/visible
  const {results:searchResults,loading:searchLoading}=useSearch(search,!searchDisabled);

  // Bug fix #4 (continued): clear stale search text when navigating to a page where
  // search is locked, so re-opening shop/home doesn't silently resume an old query.
  useEffect(()=>{
    if(searchDisabled&&search) setSearch('');
  },[page]);

  // Shop products (filtered)
  const shopOpts={
    categoryId:activeCatId==='all'?null:activeCatId,
    search:search.trim().length>1?search:'',
    page:shopPage,pageSize:24
  };
  const {products:shopProds,loading:shopLoading,total:shopTotal,totalPages}=useProducts(shopOpts);

  // Featured products for home
  const {products:featuredProds,loading:featLoading}=useProducts({featured:true,pageSize:8});

  // Section products per category (first 3 cats)
  const [sectionProds,setSectionProds]=useState({});
  useEffect(()=>{
    if(!cats.length)return;
    const topCats=cats.slice(0,6);
    topCats.forEach(async(c)=>{
      const {data}=await supabase.from('products')
        .select('*,product_images(image_url,is_default,sort_order)')
        .eq('category_id',c.id).eq('is_active',true)
        .order('is_featured',{ascending:false})
        .limit(8);
      setSectionProds(p=>({...p,[c.id]:(data||[]).map(pr=>{
        // BUG FIX: pehle yahan sirf sort_order ke hisaab se pehli image le li jaati thi,
        // admin ka "⭐ Default" (is_default) flag ignore ho jaata tha. Ab dataHooks.js
        // jaisa hi logic — is_default wali image ko priority milti hai.
        const imgs=(pr.product_images||[]).slice().sort((a,b)=>a.sort_order-b.sort_order);
        const defImg=imgs.find(i=>i.is_default)||imgs[0];
        return{
          ...pr,
          discount:calcDiscount(pr.selling_price,pr.original_price),
          primary_image:defImg?.image_url||null,
        };
      })}));
    });
  },[cats]);

  useEffect(()=>{
    if(!banners.length)return;
    const t=setInterval(()=>setBannerIdx(i=>(i+1)%banners.length),4000);
    return()=>clearInterval(t);
  },[banners.length]);

  // Keep carousel scroll position in sync with bannerIdx (fixes auto-rotate not scrolling).
  // Frontend-only fix: scrollIntoView() used to scroll the *whole page* vertically back up
  // to bring an off-screen banner into view every 4s. Scoping the scroll to just this
  // container (scrollTo on el, not scrollIntoView on the child) stops that page-jump bug.
  useEffect(()=>{
    const el=bannerWrapRef.current;
    const child=el&&el.children[bannerIdx];
    if(!el||!child)return;
    el.scrollTo({left:child.offsetLeft,behavior:'smooth'});
  },[bannerIdx]);

  // Frontend-only fix: when the user manually swipes the banner carousel, detect which
  // card is now closest to the scroll position and sync bannerIdx to it. This makes the
  // 4-second auto-rotate continue from where the user actually swiped to, instead of
  // jumping from a stale index. Debounced so it only fires once scrolling settles.
  const bannerScrollTimer=useRef(null);
  useEffect(()=>{
    const el=bannerWrapRef.current;
    if(!el)return;
    const onScroll=()=>{
      clearTimeout(bannerScrollTimer.current);
      bannerScrollTimer.current=setTimeout(()=>{
        const children=Array.from(el.children);
        if(!children.length)return;
        let closest=0,minDist=Infinity;
        children.forEach((c,i)=>{
          const dist=Math.abs(c.offsetLeft-el.scrollLeft);
          if(dist<minDist){minDist=dist;closest=i;}
        });
        setBannerIdx(closest);
      },120);
    };
    el.addEventListener('scroll',onScroll,{passive:true});
    return()=>{el.removeEventListener('scroll',onScroll);clearTimeout(bannerScrollTimer.current);};
  },[banners.length]);

  useEffect(()=>{
    document.documentElement.setAttribute('data-theme',theme);
    try{localStorage.setItem('rk_theme',theme);}catch(e){}
    const m=document.querySelector('meta[name="theme-color"]');
    if(m)m.setAttribute('content',theme==='dark'?'#0F1521':'#15803D');
  },[theme]);

  useEffect(()=>{
    if(window.RKCart)window.RKCart.init();
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){
        const meta=session.user.user_metadata;
        const u={uid:session.user.id,email:session.user.email,name:meta?.name||session.user.email.split('@')[0]};
        setUser(u);
        if(window.RKCart)window.RKCart.setUser(u);
        if(window.RKProfile)window.RKProfile.loadProfile(session.user.id);
        _loadHeaderCity(u.uid);
      }
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      if(session?.user){
        const meta=session.user.user_metadata;
        const u={uid:session.user.id,email:session.user.email,name:meta?.name||session.user.email.split('@')[0]};
        setUser(u);
        if(window.RKCart)window.RKCart.setUser(u);
        _loadHeaderCity(u.uid);
      } else {setUser(null);if(window.RKCart)window.RKCart.setUser(null);setHeaderCity(null);setHeaderDistanceKm(null);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  // Pulls the city from the user's default (or first) saved address — no
  // GPS involved. Used to populate the header label as soon as we know who
  // the user is, without ever prompting for location on the home page.
  async function _loadHeaderCity(uid){
    if(!window.RKProfile?.loadAddresses)return;
    try{
      const addrs=await window.RKProfile.loadAddresses(uid);
      const def=(addrs||[]).find(a=>a.is_default)||(addrs||[])[0];
      if(def?.city)setHeaderCity(def.city);
    }catch(_){/* header stays on hardcoded fallback */}
  }

  // Builds the "📍 ..." header label: city (once known) plus a live distance
  // once GPS resolves at checkout. Falls back to the generic placeholder when
  // neither piece of info is available yet.
  const headerLabel=headerCity
    ?(headerDistanceKm!=null
        ?`${headerCity} • ${headerDistanceKm<1?Math.round(headerDistanceKm*1000)+' m':headerDistanceKm.toFixed(1)+' km'}`
        :headerCity)
    :'Aapka Mohalla';
  // The label can get long once distance is appended (e.g. "Jaunpur • 2.3 km").
  // Rather than truncate it with "...", shrink the font a notch so the FULL
  // text always stays visible — wrapping is also allowed in CSS as a backstop
  // for extreme cases.
  const headerLabelStyle=headerLabel.length>13?{fontSize:'0.7rem'}:headerLabel.length>9?{fontSize:'0.76rem'}:undefined;

  // Called by CheckoutForm once its own (optional, best-effort) GPS fetch
  // resolves a distance — lets the header pick up a live "X km away" without
  // ever triggering a GPS prompt itself.
  const handleLocationResolved=useCallback((distanceKm)=>{
    if(typeof distanceKm==='number')setHeaderDistanceKm(distanceKm);
  },[]);

  // Silent header distance on load/refresh: ONLY runs the actual GPS read if
  // the browser reports geolocation permission as already 'granted' — i.e.
  // no permission popup will appear. If it's 'prompt' or 'denied' (or the
  // Permissions API isn't supported), this does nothing and the header
  // simply waits for checkout's own user-initiated fetch instead. This means
  // a returning user who already said "yes" once gets their distance back
  // automatically on every page load, without us ever asking again.
  useEffect(()=>{
    if(!navigator.permissions||!window.RKLocation||!window.RKDelivery)return;
    let cancelled=false;
    navigator.permissions.query({name:'geolocation'}).then(status=>{
      if(cancelled||status.state!=='granted')return;
      window.RKLocation.getCurrentPosition(false).then(pos=>{
        if(cancelled)return;
        const info=window.RKDelivery.calculate(pos.lat,pos.lng);
        if(info&&typeof info.distanceKm==='number')setHeaderDistanceKm(info.distanceKm);
      }).catch(()=>{/* best-effort only — header just stays without distance */});
    }).catch(()=>{/* Permissions API unsupported in this browser — skip silently */});
    return()=>{cancelled=true;};
  },[]);

  useEffect(()=>{
    if(!window.RKCart)return;
    return window.RKCart.onCartChange(c=>setCart(c));
  },[]);

  useEffect(()=>{
    if(user){const r=sessionStorage.getItem('rk_redirect');if(r==='checkout'){sessionStorage.removeItem('rk_redirect');setPage('checkout');}}
  },[user]);

  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(''),2200);};
  const toggleTheme=()=>setTheme(t=>t==='dark'?'light':'dark');

  // Build a quick id → product lookup across everything we've already fetched, so the
  // cart drawer (and anywhere else) can resolve a live stock_quantity for stock-guarding.
  const productById=useRef({});
  useEffect(()=>{
    const all=[...shopProds,...featuredProds,...Object.values(sectionProds).flat()];
    all.forEach(p=>{ if(p&&p.id) productById.current[p.id]=p; });
  },[shopProds,featuredProds,sectionProds]);

  const addToCart=p=>{
    if(window.RKCart)window.RKCart.addToCart({id:p.id,name:p.name,price:p.selling_price,unit:p.unit_value,image:p.primary_image,e:p.emoji||null,cat:p.categories?.name||null,old:p.original_price||null});
    else setCart(prev=>{const ex=prev.find(i=>i.id===p.id);return ex?prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...prev,{id:p.id,name:p.name,price:p.selling_price,unit:p.unit_value,image:p.primary_image,e:p.emoji||null,cat:p.categories?.name||null,old:p.original_price||null,qty:1}];});
    showToast(`${p.name} cart mein add hua! 🛒`);
  };

  // Frontend-only stock guard: prevents qty from exceeding available stock when known.
  // Bug fix #1: when no explicit stockLimit is passed (as from the cart drawer's '+'
  // button), fall back to looking up the known stock_quantity for that product id so the
  // same guard applies everywhere quantity can be changed, not just on product cards/PDP.
  const updQty=(id,d,stockLimit)=>{
    const limit=typeof stockLimit==='number'?stockLimit:productById.current[id]?.stock_quantity;
    if(d>0&&typeof limit==='number'){
      const existing=cart.find(i=>i.id===id);
      if(existing&&existing.qty>=limit){
        showToast(`Sirf ${limit} stock mein hai`);
        return;
      }
    }
    if(window.RKCart)window.RKCart.updateQuantity(id,d);
    else setCart(prev=>prev.map(i=>i.id===id?{...i,qty:i.qty+d}:i).filter(i=>i.qty>0));
  };

  const total=cart.reduce((s,i)=>s+(i.price||0)*(i.qty||1),0);
  const count=cart.reduce((s,i)=>s+(i.qty||1),0);

  const goToCheckout=()=>{setCartOpen(false);if(user)setPage('checkout');else goLoginForCheckout();};

  const openDetail=p=>{setDetailProduct(p);setPage('detail');};

  // "All" virtual category
  const allCats=[{id:'all',name:'All',image_url:null,icon_emoji:'🛍️',slug:'all'},...cats];

  // BUG FIX: admin ke Banners page mein "Link URL" field save hota tha, par customer
  // site par banner click hamesha generic "shop" page kholta tha — link_url kabhi
  // padha hi nahi jaata tha. Ab is_url ko resolve karte hain:
  //  • "/category/<slug>"  → us category ke products dikhao
  //  • pura URL (http/https) → naye tab mein wahi page kholo
  //  • blank ya unresolved  → fallback: generic shop page
  const handleBannerClick=useCallback((b)=>{
    const link=(b?.link_url||'').trim();
    if(!link){setPage('shop');setShopPage(1);return;}
    if(/^https?:\/\//i.test(link)){window.open(link,'_blank','noopener');return;}
    const catMatch=link.match(/^\/?category\/([\w-]+)\/?$/i);
    if(catMatch){
      const key=catMatch[1];
      const found=cats.find(c=>c.slug===key||String(c.id)===key);
      if(found){setActiveCatId(found.id);setPage('shop');setShopPage(1);setSearch('');return;}
    }
    // Unrecognised path — safe fallback so the click never feels broken
    setPage('shop');setShopPage(1);
  },[cats]);

  // ── Desktop Banner Row ────────────────────────────────
  const DesktopBannerRow=()=>{
    if(bannersLoading)return(<div className="desktop-banner-row">{[0,1,2].map(i=><SkelBanner key={i}/>)}</div>);
    if(!banners.length)return null;
    const shown=banners.slice(0,3);
    return(
      <div className="desktop-banner-row">
        {shown.map((b,i)=>(
          <div key={b.id} className="banner-card-d" style={{background:b.bg_gradient||'linear-gradient(135deg,#064E3B,#047857)'}} onClick={()=>handleBannerClick(b)}>
            {b.image_url&&<img src={b.image_url} alt={b.title} className="banner-card-d-img"/>}
            <div style={{flex:1,position:'relative',zIndex:1}}>
              <div className="banner-tag">SPECIAL OFFER</div>
              <div className="banner-title" style={{color:'#fff'}}>{b.title}</div>
              <div className="banner-sub" style={{color:'rgba(255,255,255,0.8)'}}>{b.subtitle}</div>
              <button className="banner-btn-sm" onClick={(e)=>{e.stopPropagation();handleBannerClick(b);}}>{b.button_text||'Shop Now'} →</button>
            </div>
            {/* Fix #5: hide decorative emoji when a real banner image is present */}
            {!b.image_url&&<div className="banner-emoji-d">🛒</div>}
          </div>
        ))}
      </div>
    );
  };

  // ── Desktop Category Grid ─────────────────────────────
  const DesktopCatGrid=()=>(
    <div className="desktop-cats-wrap">
      <div style={{fontWeight:800,fontSize:'0.95rem'}}>Shop by Category</div>
      {catsLoading
        ?<div style={{display:'flex',gap:10,marginTop:12,flexWrap:'wrap'}} aria-busy="true" aria-label="Categories load ho rahi hain">{[...Array(8)].map((_,i)=><div key={i} className="skel" style={{width:110,height:80,borderRadius:12}}/>)}</div>
        :<div className="desktop-cat-grid">
          {allCats.map(c=>(
            <div key={c.id} className={`desktop-cat-item ${activeCatId===c.id?'on':''}`} onClick={()=>{setActiveCatId(c.id);setPage('shop');setShopPage(1);setSearch('');}}>
              {(c.display_image||c.image_url)
                ?<img src={c.display_image||c.image_url} alt={c.name}/>
                :<div className="cat-emoji-box">{catEmoji(c)}</div>
              }
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      }
    </div>
  );

  // ── Desktop Sidebar ───────────────────────────────────
  const DesktopSidebar=()=>(
    <div className="desktop-sidebar">
      <div className="sidebar-title">Categories</div>
      {allCats.map(c=>(
        <div key={c.id} className={`sidebar-cat ${activeCatId===c.id?'on':''}`} onClick={()=>{setActiveCatId(c.id);setShopPage(1);setSearch('');}}>
          {(c.display_image||c.image_url)
            ?<img src={c.display_image||c.image_url} alt={c.name} className="sidebar-cat-img"/>
            :<div className="sidebar-cat-emoji">{catEmoji(c)}</div>
          }
          <span>{c.name}</span>
        </div>
      ))}
    </div>
  );

  // MobileCatRow — App ke bahar move kar diya (scroll reset fix)

  // ── Footer ────────────────────────────────────────────
  const Footer=({mobile=false})=>(
    <div style={{background:'#1A1A2E',color:'rgba(255,255,255,0.6)',padding:mobile?'20px 16px':'28px 24px',textAlign:'center',fontSize:'0.75rem',lineHeight:2,borderRadius:mobile?0:16,marginBottom:mobile?0:16}}>
      <div style={{color:'#fff',fontWeight:900,fontSize:'1.1rem',marginBottom:8}}>🛒 rinku<span style={{color:'#FFB800'}}>.</span> kirana</div>
      <div>📍 Aapke mohalle ki dukaan</div>
      <div>📞 Call/WhatsApp: 6393196765</div>
      <div>⏰ Subah 7am – Raat 10pm</div>
      <div style={{marginTop:8,opacity:0.4}}>© {new Date().getFullYear()} Rinku Kirana &amp; General Store</div>
    </div>
  );

  // ── Desktop Home ──────────────────────────────────────
  const DesktopHome=()=>(
    <div className="desktop-wrap" style={{paddingTop:16,paddingBottom:24}}>
      <DesktopBannerRow/>
      <div className="desktop-offer-row">
        <div className="offer-banner-full"><span className="ob-icon">🎁</span><div><div className="ob-title">Pehli order par ₹50 OFF!</div><div className="ob-sub">Code: RINKU50 • Min order ₹199</div></div></div>
        <div className="offer-banner-ref"><span className="ob-icon">👥</span><div><div className="ob-title-b">Dost ko refer karein!</div><div className="ob-sub-b">Dono ko ₹30 cashback milega</div></div></div>
      </div>
      <DesktopCatGrid/>
      {/* Featured */}
      {(featLoading||featuredProds.length>0)&&(
        <div style={{background:'var(--card-bg)',borderRadius:16,padding:'18px 20px',marginBottom:14}}>
          <div className="dsec-hd">
            <div className="dsec-title">⭐ Featured Products</div>
            <button className="see-all" onClick={()=>setPage('shop')}>See All →</button>
          </div>
          {featLoading
            ?<div className="desktop-prod-grid" aria-busy="true" aria-label="Products load ho rahe hain">{[...Array(6)].map((_,i)=><SkelCard key={i}/>)}</div>
            :<div className="desktop-prod-grid">{featuredProds.map(p=><PCard key={p.id} p={p} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={openDetail}/>)}</div>
          }
        </div>
      )}
      {/* Category sections */}
      {cats.slice(0,6).map(c=>{
        const items=sectionProds[c.id];
        if(items&&items.length===0)return null;
        return(
          <div key={c.id} style={{background:'var(--card-bg)',borderRadius:16,padding:'18px 20px',marginBottom:14}}>
            <div className="dsec-hd">
              <div className="dsec-title">{c.name}</div>
              <button className="see-all" onClick={()=>{setActiveCatId(c.id);setPage('shop');setShopPage(1);setSearch('');}}>See All →</button>
            </div>
            {!items
              ?<div className="desktop-prod-grid" aria-busy="true" aria-label="Products load ho rahe hain">{[...Array(4)].map((_,i)=><SkelCard key={i}/>)}</div>
              :<div className="desktop-prod-grid">{items.slice(0,6).map(p=><PCard key={p.id} p={p} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={openDetail}/>)}</div>
            }
          </div>
        );
      })}
      <div className="how-section">
        <div style={{fontWeight:800,fontSize:'0.95rem',color:'var(--dark)'}}>How It Works</div>
        <div className="how-grid">
          {[{i:'📱',t:'Open the app',s:'Search what you need'},{i:'🛒',t:'Place an order',s:'Add items to cart & checkout'},{i:'🚴',t:'Get fast delivery',s:'Delivered in 1-2 hours'}].map((h,i)=>(
            <div key={i} className="how-card"><div className="how-icon">{h.i}</div><div className="how-title">{h.t}</div><div className="how-sub">{h.s}</div></div>
          ))}
        </div>
      </div>
      <Footer/>
    </div>
  );

  // ── Desktop Shop ──────────────────────────────────────
  const DesktopShop=()=>{
    const prods=search.trim().length>1?searchResults:shopProds;
    const isLoading=search.trim().length>1?searchLoading:shopLoading;
    const activeCatName=allCats.find(c=>c.id===activeCatId)?.name||'All Products';
    return(
      <div className="desktop-shop-layout">
        <DesktopSidebar/>
        <div className="desktop-content">
          <div style={{background:'var(--card-bg)',borderRadius:16,padding:'18px 20px'}}>
            <div style={{fontWeight:800,fontSize:'0.95rem',marginBottom:4}}>{isLoading?'Loading…':`${search.trim().length>1?searchResults.length:shopTotal} Products`}</div>
            <div style={{fontSize:'0.78rem',color:'var(--gray)',marginBottom:14}}>{activeCatName}{search?` • "${search}"`:''}</div>
            {isLoading
              ?<div className="desktop-prod-grid" aria-busy="true" aria-label="Products load ho rahe hain">{[...Array(8)].map((_,i)=><SkelCard key={i}/>)}</div>
              :prods.length===0
                ?<div style={{textAlign:'center',padding:'60px 0',color:'var(--gray)'}}><div style={{fontSize:'3rem'}}>🔍</div><p style={{marginTop:10,fontWeight:600}}>"{search||activeCatName}" mein koi product nahi mila</p></div>
                :<div className="desktop-prod-grid">{prods.map(p=><PCard key={p.id} p={p} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={openDetail}/>)}</div>
            }
            {!search&&totalPages>1&&(
              <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:20}}>
                {[...Array(totalPages)].map((_,i)=>(
                  <button key={i} onClick={()=>setShopPage(i+1)} style={{width:34,height:34,borderRadius:8,border:'1.5px solid',borderColor:shopPage===i+1?'var(--primary)':'var(--border)',background:shopPage===i+1?'var(--primary)':'none',color:shopPage===i+1?'#fff':'var(--gray)',fontWeight:700,fontSize:'0.82rem'}}>{i+1}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return(
    <div style={{background:'var(--page-bg)',minHeight:'100vh'}}>
      {/* Desktop header */}
      <div className="desktop-header" ref={desktopHeaderRef}>
        <div className="dh-inner">
          <div className="logo" onClick={()=>setPage('home')}>rinku<span>.</span></div>
          <div className="dh-location" onClick={()=>showToast('📍 Location change abhi available nahi hai')}>
            <div className="dh-location-label">Delivery in</div>
            <div className="dh-location-addr" style={headerLabelStyle}>📍 {headerLabel} ▾</div>
          </div>
          <div className="dh-search" style={searchDisabled?{opacity:0.5}:{}}>
            <span>🔍</span>
            <input placeholder="Search groceries, snacks, dairy..." value={search} disabled={searchDisabled}
              onFocus={()=>{if(searchDisabled)showToast('Pehle yeh kaam poora karein 🙏');}}
              onChange={e=>{setSearch(e.target.value);setPage('shop');setShopPage(1);}}/>
            {search&&!searchDisabled&&<button onClick={()=>setSearch('')} style={{color:'#A0AEC0',background:'none'}}>✕</button>}
          </div>
          <div className="dh-nav">
            <button className={`dh-nav-btn ${page==='home'?'on':''}`} onClick={()=>setPage('home')}>🏠 <span className="dh-nav-label">Home</span></button>
            <button className={`dh-nav-btn ${page==='shop'?'on':''}`} onClick={()=>setPage('shop')}>🛍️ <span className="dh-nav-label">Shop</span></button>
            <button className="dh-theme-btn" aria-label="Theme badlein" onClick={toggleTheme}>{theme==='dark'?'☀️':'🌙'}</button>
            {user?<button className="dh-user-btn" onClick={()=>window.location.href='account.html'}>👤 <span>{user.name.split(' ')[0]}</span></button>
              :<button className="dh-user-btn" onClick={goLogin}>👤 Login</button>}
            {!isPWA&&<button className="dh-getapp-btn" onClick={()=>window.RKPwa&&window.RKPwa.promptInstall()}>📲 Get App</button>}
            <button className="dh-cart-btn" onClick={()=>setCartOpen(true)}><CartIcon/> <span className="dh-cart-label">Cart</span> {count>0&&<span className="c-badge">{count}</span>}</button>
          </div>
        </div>
      </div>
      {/* Mobile header */}
      <div className="header">
        <div className="header-top">
          <div className="logo-sm">rinku<span>.</span></div>
          <div className="delivery-info" onClick={()=>showToast('📍 Location change abhi available nahi hai')}><div className="delivery-min">Delivery in</div><div className="delivery-addr" style={headerLabelStyle}><span className="delivery-pin">📍 </span>{headerLabel} ▾</div></div>
          <div className="header-right">
            <button className="theme-toggle-btn" aria-label="Theme badlein" onClick={toggleTheme}>{theme==='dark'?'☀️':'🌙'}</button>
            {user?<button className="user-pill-btn" onClick={()=>window.location.href='account.html'}>👤 <span className="upn">{user.name.split(' ')[0]}</span></button>
              :<button className="user-pill-btn" onClick={goLogin}>👤 <span className="upn">Login</span></button>}
            <button className="cart-icon-btn" onClick={()=>setCartOpen(true)}><CartIcon size={17}/> {count>0&&<span className="c-badge">{count}</span>}</button>
          </div>
        </div>
        <div className="search-bar" style={searchDisabled?{opacity:0.5}:{}}>
          <span style={{fontSize:'1rem'}}>🔍</span>
          <input placeholder="Search groceries, snacks, dairy..." value={search} disabled={searchDisabled}
            onFocus={()=>{if(searchDisabled)showToast('Pehle yeh kaam poora karein 🙏');}}
            onChange={e=>{setSearch(e.target.value);setPage('shop');setShopPage(1);}}/>
          {search&&!searchDisabled&&<button onClick={()=>setSearch('')} style={{color:'#A0AEC0',fontSize:'1rem',background:'none'}}>✕</button>}
        </div>
      </div>
      {/* Ticker */}
      <div className="ticker">
        <div className="ticker-track">
          {[...TICKER,...TICKER].map((t,i)=><span key={i} className="ticker-item">✦ {t}</span>)}
        </div>
      </div>

      <div className="page-pad">
        {/* ── HOME ── */}
        {page==='home'&&(
          <>
            {/* Desktop */}
            <div className="d-view"><DesktopHome/></div>
            {/* Mobile */}
            <div className="m-view">
              {/* Banner */}
              <div className="banner-slider">
                <div className="banner-wrap" ref={bannerWrapRef}>
                  {bannersLoading
                    ?<SkelBanner/>
                    :banners.map((b,i)=><BannerCardM key={b.id} b={b} active={i===bannerIdx} onClick={()=>handleBannerClick(b)}/>)
                  }
                </div>
                {banners.length>1&&<div className="banner-dots">{banners.map((_,i)=><div key={i} className={`bdot ${i===bannerIdx?'on':''}`} onClick={()=>setBannerIdx(i)}/>)}</div>}
              </div>
              {/* Offers */}
              <div className="offer-banner-full" style={{margin:'0 16px 8px'}}>
                <span className="ob-icon">🎁</span>
                <div><div className="ob-title">Pehli order par ₹50 OFF!</div><div className="ob-sub">Code: RINKU50 • Min order ₹199</div></div>
              </div>
              {/* Shop by category */}
              <div style={{background:'var(--card-bg)',marginBottom:8,paddingBottom:4}}>
                <div style={{padding:'12px 16px 0',fontWeight:800,fontSize:'0.92rem'}}>Shop by Category</div>
                <MobileCatRow cats={allCats} catsLoading={catsLoading} activeCatId={activeCatId} catEmoji={catEmoji} onClick={id=>{setActiveCatId(id);setPage('shop');setShopPage(1);setSearch('');}}/>
              </div>
              {/* Featured */}
              {(featLoading||featuredProds.length>0)&&(
                <div style={{background:'var(--card-bg)',marginBottom:8,padding:'14px 0 4px'}}>
                  <div className="section-hd">
                    <div className="section-hd-title">⭐ Featured Products</div>
                    <button className="see-all" onClick={()=>setPage('shop')}>See All →</button>
                  </div>
                  <div className="prods-row">
                    {featLoading?[...Array(4)].map((_,i)=><div key={i} className="skel" style={{width:140,height:190,borderRadius:14,flexShrink:0}} aria-hidden="true"/>)
                      :featuredProds.map(p=><PCard key={p.id} p={p} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={openDetail}/>)}
                  </div>
                </div>
              )}
              {/* Category sections */}
              {cats.slice(0,6).map(c=>{
                const items=sectionProds[c.id];
                if(items&&items.length===0)return null;
                return(
                  <div key={c.id} style={{background:'var(--card-bg)',marginBottom:8,padding:'14px 0 4px'}}>
                    <div className="section-hd">
                      <div className="section-hd-title">{c.name}</div>
                      <button className="see-all" onClick={()=>{setActiveCatId(c.id);setPage('shop');setShopPage(1);setSearch('');}}>See All →</button>
                    </div>
                    <div className="prods-row">
                      {!items?[...Array(4)].map((_,i)=><div key={i} className="skel" style={{width:140,height:190,borderRadius:14,flexShrink:0}} aria-hidden="true"/>)
                        :items.map(p=><PCard key={p.id} p={p} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={openDetail}/>)}
                    </div>
                  </div>
                );
              })}
              <div className="how-section" style={{borderRadius:0,margin:'0 0 8px'}}>
                <div style={{fontWeight:800,fontSize:'0.95rem'}}>How It Works</div>
                <div className="how-grid">
                  {[{i:'📱',t:'Open the app',s:'Search what you need'},{i:'🛒',t:'Place an order',s:'Add items to cart & checkout'},{i:'🚴',t:'Get fast delivery',s:'Delivered in 1-2 hours'}].map((h,i)=>(
                    <div key={i} className="how-card"><div className="how-icon">{h.i}</div><div className="how-title">{h.t}</div><div className="how-sub">{h.s}</div></div>
                  ))}
                </div>
              </div>
              <Footer mobile/>
            </div>
            <style>{`.d-view{display:none}.m-view{display:block}@media(min-width:768px){.d-view{display:block}.m-view{display:none}}`}</style>
          </>
        )}

        {/* ── SHOP ── */}
        {page==='shop'&&(
          <>
            <div className="d-view"><DesktopShop/></div>
            <div className="m-view">
              <div style={{background:'var(--card-bg)',marginBottom:8}}>
                <MobileCatRow cats={allCats} catsLoading={catsLoading} activeCatId={activeCatId} catEmoji={catEmoji} onClick={id=>{setActiveCatId(id);setShopPage(1);setSearch('');}}/>
              </div>
              <div style={{background:'var(--card-bg)',padding:'10px 0 4px'}}>
                {((shopLoading&&search.trim().length<2)||(searchLoading&&search.trim().length>1))
                  ?<>
                    <div style={{fontWeight:800,fontSize:'0.9rem',marginBottom:2,padding:'0 16px'}}>Loading…</div>
                    <div className="mobile-shop-grid" aria-busy="true" aria-label="Products load ho rahe hain">{[...Array(6)].map((_,i)=><SkelCard key={i}/>)}</div>
                  </>
                  :<>
                    <div style={{fontWeight:800,fontSize:'0.9rem',marginBottom:2,padding:'0 16px'}}>{search.trim().length>1?searchResults.length:shopTotal} products</div>
                    <div style={{fontSize:'0.72rem',color:'var(--gray)',marginBottom:10,padding:'0 16px'}}>{allCats.find(c=>c.id===activeCatId)?.name||'All'}{search?` • "${search}"`:''}</div>
                    <div className="mobile-shop-grid">
                      {(search.trim().length>1?searchResults:shopProds).map(p=><PCard key={p.id} p={p} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={openDetail}/>)}
                    </div>
                    {(search.trim().length>1?searchResults:shopProds).length===0&&
                      <div style={{textAlign:'center',padding:'40px 0',color:'var(--gray)'}}><div style={{fontSize:'3rem'}}>🔍</div><p style={{marginTop:8,fontSize:'0.88rem',fontWeight:600}}>Koi product nahi mila</p></div>}
                  </>
                }
                {!search&&totalPages>1&&(
                  <div style={{display:'flex',justifyContent:'center',gap:8,padding:'12px 16px'}}>
                    {shopPage>1&&<button onClick={()=>setShopPage(p=>p-1)} style={{padding:'8px 16px',borderRadius:8,border:'1.5px solid var(--border)',background:'none',fontWeight:700}}>← Prev</button>}
                    <span style={{padding:'8px 16px',fontWeight:700,color:'var(--gray)'}}>Page {shopPage} of {totalPages}</span>
                    {shopPage<totalPages&&<button onClick={()=>setShopPage(p=>p+1)} style={{padding:'8px 16px',borderRadius:8,border:'1.5px solid var(--primary)',background:'var(--primary)',color:'#fff',fontWeight:700}}>Next →</button>}
                  </div>
                )}
              </div>
            </div>
            <style>{`.d-view{display:none}.m-view{display:block}@media(min-width:768px){.d-view{display:block}.m-view{display:none}}`}</style>
          </>
        )}

        {/* ── PRODUCT DETAIL ── */}
        {page==='detail'&&detailProduct&&(
          <ProductDetail product={detailProduct} cart={cart} addToCart={addToCart} updQty={updQty} onBack={()=>setPage('shop')}/>
        )}

        {/* ── CHECKOUT ── */}
        {page==='checkout'&&(
          <div className="checkout-page">
            <button className="pdp-back" style={{marginBottom:6}} onClick={()=>setPage('home')}>← Checkout se Bahar Jao</button>
            <h2>🚚 Checkout</h2>
            <CheckoutForm cart={cart} total={total} showToast={showToast} user={user}
              onLocationResolved={handleLocationResolved}
              onSuccess={(id,pay)=>{setSuccess({id,pay});setPage('success');}}/>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {page==='success'&&success&&(
          <div className="success-page">
            <div className="success-anim">🎉</div>
            <h2>Order Place Ho Gaya!</h2>
            <div className="order-pill">Order #{success.id}</div>
            <p>{success.pay==='cod'?'💵 Delivery par cash dena':'⏳ Payment verify ho rahi hai — 10-15 min mein confirm ho jayega'}</p>
            <p>⏰ 1-2 ghante mein delivery hogi</p>
            <button className="home-btn" onClick={()=>{setSuccess(null);setPage('home');}}>🏠 Home Par Jao</button>
          </div>
        )}
      </div>

      {/* ── CART DRAWER ── */}
      {cartOpen&&(
        <>
          <div className="drawer-bg" onClick={()=>setCartOpen(false)}/>
          <div className="cart-drawer">
            <div className="drawer-handle"/>
            <div className="drawer-head">
              <div className="drawer-title">🛒 Mera Cart ({count} items)</div>
              <button aria-label="Cart band karein" style={{fontSize:'1.1rem',color:'var(--gray)',background:'none'}} onClick={()=>setCartOpen(false)}>✕</button>
            </div>
            <div className="drawer-body">
              {cart.length===0
                ?<div className="cart-empty"><div className="ei">🛒</div><p style={{marginTop:12,fontSize:'0.88rem',color:'var(--gray)',fontWeight:600}}>Cart khali hai!</p></div>
                :cart.map(i=>{
                  // Bug fix #1: resolve a known stock_quantity for this cart line (if we've
                  // seen the product anywhere) so the '+' button here respects the same
                  // stock ceiling as the product card / PDP.
                  const knownStock=productById.current[i.id]?.stock_quantity;
                  const atMax=typeof knownStock==='number'&&i.qty>=knownStock;
                  return(
                    <div key={i.id} className="ci">
                      {i.image
                        ?<img src={i.image} alt={i.name} className="ci-img"/>
                        :<div className="ci-emoji">🛒</div>}
                      <div className="ci-info">
                        <div className="ci-name">{i.name} <span style={{color:'var(--gray)',fontSize:'0.7rem'}}>({i.unit})</span></div>
                        <div className="ci-price">₹{i.price} × {i.qty} = <b>₹{(i.price*i.qty).toFixed(0)}</b></div>
                        {atMax&&<div className="ci-stock-warn">Sirf {knownStock} stock mein hai</div>}
                      </div>
                      <div className="qty-ctrl" style={{marginLeft:'auto'}}>
                        <button className="qbtn" aria-label="Quantity kam karein" onClick={()=>updQty(i.id,-1)}>−</button>
                        <span className="qnum">{i.qty}</span>
                        <button className="qbtn" aria-label="Quantity badhayein" disabled={atMax} onClick={()=>!atMax&&updQty(i.id,1,knownStock)}>+</button>
                      </div>
                    </div>
                  );
                })
              }
            </div>
            {cart.length>0&&(
              <div className="drawer-foot">
                {!user&&<div style={{display:'flex',alignItems:'center',gap:8,background:'#FFF8E1',border:'1px solid #FFE0A3',borderRadius:10,padding:'8px 10px',marginBottom:10,fontSize:'0.72rem',color:'#92600B',fontWeight:600}}>🔐 Checkout se pehle login zaroori hai</div>}
                <div className="total-row"><span>Total</span><span style={{color:'var(--primary)'}}>₹{total.toFixed(0)}</span></div>
                <button className="proceed-btn" onClick={goToCheckout}>{user?`Checkout — ₹${total.toFixed(0)} →`:'Login & Checkout →'}</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── BOTTOM NAV ── */}
      <div className="bottom-nav">
        {[
          {id:'home',i:'🏠',l:'Home'},
          {id:'shop',i:'🛍️',l:'Shop'},
        ].map(n=>(
          <div key={n.id} className={`bn-item ${page===n.id?'on':''}`}
            onClick={()=>setPage(n.id)}>
            <span className="bn-icon">{n.i}</span>
            <span className="bn-label">{n.l}</span>
          </div>
        ))}
        {!isPWA&&(
          <div className="bn-getapp-item" onClick={()=>window.RKPwa&&window.RKPwa.promptInstall()}>
            <span className="bn-getapp-icon">📲</span>
            <span className="bn-getapp-label">Get App</span>
          </div>
        )}
        <div className={`bn-item ${page==='cart'?'on':''}`} onClick={()=>setCartOpen(true)}>
          <span className="bn-icon">🛒</span>
          <span className="bn-label">{`Cart${count>0?` (${count})`:''}`}</span>
        </div>
        <div className={`bn-item ${page===(user?'account':'login')?'on':''}`}
          onClick={()=>{if(user)window.location.href='account.html';else goLogin();}}>
          <span className="bn-icon">👤</span>
          <span className="bn-label">{user?'Account':'Login'}</span>
        </div>
      </div>

      {toast&&<div className="toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}