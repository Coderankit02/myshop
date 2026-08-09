import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Search, MapPin, ChevronDown, ShoppingCart, User, Download, Home, ShoppingBag, SlidersHorizontal, X, Zap, Leaf, BadgePercent, ShieldCheck, Package, Headphones, Send, MessageCircle } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { TICKER, calcDiscount, catEmoji } from './lib/helpers';
import { useCategories, useBanners, useProducts, useSearch, useHomeSections, useHomepageConfig, useReviews, useShopSettings, DEFAULT_HOMEPAGE_SECTIONS } from './hooks/dataHooks';
import { SkelCard, SkelBanner, SkelCat } from './components/Skeletons';
import { PCard } from './components/PCard';
import { ProductDetail } from './components/ProductDetail';
import { CheckoutForm } from './components/CheckoutForm';
import AuthModal from './components/AuthModal';

// ── Mobile Category Row (outside App to prevent remount on every render) ──
// ── Mobile Category Row (Module 4: Tailwind restyle — same props/onClick
//     contract as before, so App.jsx's usage on the Shop page is unchanged) ──
function MobileCatRow({cats,catsLoading,activeCatId,catEmoji,onClick}){
  return(
    <div className="flex gap-3 overflow-x-auto pb-1 snap-x scrollbar-hide">
      {catsLoading
        ?[...Array(6)].map((_,i)=><SkelCat key={i}/>)
        :cats.map(c=>{
          const active=activeCatId===c.id;
          return(
            <button key={c.id} onClick={()=>onClick(c.id)} className="flex flex-col items-center gap-1 flex-shrink-0 snap-start w-[60px]">
              <div className="w-full aspect-square rounded-2xl flex items-center justify-center text-xl overflow-hidden transition-shadow"
                style={{background:'var(--primary-light)',boxShadow:active?'0 0 0 2px var(--primary)':'none'}}>
                {(c.display_image||c.image_url)
                  ?<img src={c.display_image||c.image_url} alt={c.name} className="w-full h-full object-cover"/>
                  :<span>{catEmoji(c)}</span>
                }
              </div>
              <span className="text-[10px] font-poppins text-center leading-tight line-clamp-1"
                style={{color:active?'var(--primary)':'var(--dark)',fontWeight:active?700:500}}>{c.name}</span>
            </button>
          );
        })
      }
    </div>
  );
}

// ── Module 13: scroll-reset fix ─────────────────────────────
// These components were previously defined INSIDE App(). App re-renders every
// 4s (banner autoplay timer) and re-creates inner component types on every
// render — so React unmounted & remounted the whole homepage each time,
// wiping every horizontal section's scroll position back to 0 (swipe to item
// 5 → a few seconds later it snapped back to item 1). Moving them to module
// level (stable types, same pattern as FlashSale/WhyChooseUs) stops that
// remount. All state/handlers stay in App and come in as props.

const SORT_OPTIONS=[
  {v:'default',l:'Recommended'},
  {v:'price-low',l:'Price: Low to High'},
  {v:'price-high',l:'Price: High to Low'},
];

function HeroBanner({banners,bannersLoading,bannerIdx,setBannerIdx,wrapRef,handleBannerClick}){
  return(
    <div className="relative rounded-2xl overflow-hidden h-40 md:h-64">
      <div ref={wrapRef} className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide">
        {bannersLoading
          ?<SkelBanner/>
          :banners.map(b=>(
            <div key={b.id} className="relative w-full h-full flex-shrink-0 snap-start cursor-pointer"
              style={{background:b.bg_gradient||'linear-gradient(135deg,#064E3B,#047857)'}}
              onClick={()=>handleBannerClick(b)}>
              {b.image_url&&<img src={b.image_url} alt={b.title} className="absolute inset-0 w-full h-full object-cover opacity-70"/>}
              {/* Fix #5 (preserved): decorative emoji only when there's no real banner image */}
              {!b.image_url&&<div className="absolute right-2 bottom-2 text-6xl opacity-20">🛒</div>}
              <div className="absolute inset-0 p-4 md:p-10 flex flex-col justify-end md:justify-center max-w-md"
                style={{background:'linear-gradient(0deg, rgba(0,0,0,0.35), transparent 60%)'}}>
                <span className="inline-block bg-white/20 text-white text-[10px] md:text-xs font-bold font-poppins px-2 py-1 rounded-lg mb-1 w-fit">LIMITED OFFER</span>
                <p className="text-white font-bold text-base md:text-3xl font-poppins leading-tight">{b.title}</p>
                {b.subtitle&&<p className="text-white/80 text-xs md:text-base mt-0.5">{b.subtitle}</p>}
                <button onClick={e=>{e.stopPropagation();handleBannerClick(b);}}
                  className="mt-2 md:mt-4 inline-flex w-fit items-center gap-1 bg-white text-charcoal text-xs md:text-sm font-bold font-poppins px-3 py-1.5 rounded-xl">
                  {b.button_text||'Shop Now'} →
                </button>
              </div>
            </div>
          ))
        }
      </div>
      {banners.length>1&&(
        <div className="absolute bottom-3 left-4 flex gap-1.5">
          {banners.map((_,i)=>(
            <button key={i} aria-label={`Banner ${i+1} dikhayein`} onClick={()=>setBannerIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i===bannerIdx?'w-5 bg-white':'w-1.5 bg-white/50'}`}/>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryGrid({cats,catsLoading,catEmoji,onPick}){
  return(
    <div>
      <h2 className="text-base md:text-xl font-bold font-poppins" style={{color:'var(--dark)'}}>Shop by Category</h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 md:gap-4 mt-3">
        {catsLoading
          ?[...Array(8)].map((_,i)=>(
            <div key={i} aria-hidden="true" className="flex flex-col items-center gap-1.5">
              <div className="w-full aspect-square rounded-2xl animate-pulse" style={{background:'var(--light)'}}/>
              <div className="h-2.5 w-10 rounded animate-pulse" style={{background:'var(--light)'}}/>
            </div>
          ))
          :cats.map(c=>(
            <button key={c.id} onClick={()=>onPick(c.id)}
              className="flex flex-col items-center gap-1.5 group">
              <div className="w-full aspect-square rounded-2xl flex items-center justify-center text-2xl md:text-3xl overflow-hidden transition-transform group-active:scale-95 group-hover:-translate-y-0.5"
                style={{background:'var(--primary-light)'}}>
                {(c.display_image||c.image_url)
                  ?<img src={c.display_image||c.image_url} alt={c.name} className="w-full h-full object-cover"/>
                  :<span>{catEmoji(c)}</span>
                }
              </div>
              <span className="text-[10px] md:text-xs font-medium font-poppins text-center leading-tight line-clamp-2" style={{color:'var(--dark)'}}>{c.name}</span>
            </button>
          ))
        }
      </div>
    </div>
  );
}

function ProductRail({title,loading,products,onSeeAll,cart,addToCart,updQty,onDetail}){
  if(!loading&&(!products||products.length===0))return null;
  return(
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base md:text-xl font-bold font-poppins" style={{color:'var(--dark)'}}>{title}</h2>
        <button onClick={onSeeAll} className="text-xs md:text-sm font-semibold font-poppins flex items-center gap-0.5" style={{color:'var(--primary)'}}>See All →</button>
      </div>
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-1 snap-x scrollbar-hide">
        {loading||!products
          ?[...Array(4)].map((_,i)=><div key={i} className="flex-shrink-0 w-36 md:w-44 snap-start"><SkelCard/></div>)
          :products.map(p=>(
            <div key={p.id} className="flex-shrink-0 w-36 md:w-44 snap-start">
              <PCard p={p} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={onDetail}/>
            </div>
          ))
        }
      </div>
    </div>
  );
}

function DesktopSidebar({allCats,activeCatId,catEmoji,onPick}){
  return(
    <div className="sticky rounded-2xl p-3 mr-4 my-4 flex-shrink-0"
      style={{width:200,background:'var(--card-bg)',top:'var(--header-h)',boxShadow:'0 2px 10px rgba(0,0,0,0.06)',maxHeight:'calc(100vh - var(--header-h) - 20px)',overflowY:'auto'}}>
      <div className="text-[11px] font-bold font-poppins uppercase tracking-wide pb-2 mb-1.5" style={{color:'var(--gray)',borderBottom:'1px solid var(--border)'}}>Categories</div>
      {allCats.map(c=>{
        const active=activeCatId===c.id;
        return(
          <div key={c.id} onClick={()=>onPick(c.id)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer text-[13px] font-semibold font-poppins active:scale-[0.97] hover:bg-black/[0.03] transition-colors"
            style={{color:active?'var(--primary)':'var(--dark)',background:active?'var(--primary-light)':'transparent'}}>
            {(c.display_image||c.image_url)
              ?<img src={c.display_image||c.image_url} alt={c.name} className="w-7 h-7 rounded-lg object-cover flex-shrink-0"/>
              :<div className="w-7 h-7 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{background:'var(--primary-light)'}}>{catEmoji(c)}</div>
            }
            <span className="truncate">{c.name}</span>
          </div>
        );
      })}
    </div>
  );
}

function Footer({shopSettings,onNav}){
  const s=shopSettings;
  const socials=[
    s.social_facebook&&{href:s.social_facebook,icon:'📘',label:'Facebook'},
    s.social_instagram&&{href:s.social_instagram,icon:'📸',label:'Instagram'},
    s.social_whatsapp&&{href:s.social_whatsapp,icon:'💬',label:'WhatsApp'},
    s.social_youtube&&{href:s.social_youtube,icon:'▶️',label:'YouTube'},
  ].filter(Boolean);
  const legal=[{k:'about',l:'About Us'},{k:'privacy',l:'Privacy Policy'},{k:'terms',l:'Terms'},{k:'shipping',l:'Shipping'},{k:'support',l:'Help & Support'}];
  return(
    <div className="text-center font-poppins px-5 py-6 md:px-6 md:py-8 rounded-none md:rounded-2xl mb-0 md:mb-4"
      style={{background:`linear-gradient(135deg, var(--primary), var(--primary-dark))`,color:'rgba(255,255,255,0.85)',fontSize:'0.78rem',lineHeight:2}}>
      <div className="flex items-center justify-center gap-2.5" style={{marginBottom:8}}>
        <img src={s.logo_url||'/icons/rk-logo.svg'} alt={s.shop_name||'RK Grocery Mart'} style={{width:38,height:38,borderRadius:12}}/>
        <div className="text-left">
          <div className="text-white font-extrabold font-poppins" style={{fontSize:'1.15rem',lineHeight:1.1}}>{s.shop_name||'RK Grocery Mart'}</div>
          <div className="text-white/75 font-poppins" style={{fontSize:'0.7rem'}}>{s.footer_text||'हर घर की पसंद'}</div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 flex-wrap" style={{margin:'8px 0'}}>
        <span className="flex items-center gap-1"><span>⚡</span><span className="text-xs">Fast delivery</span></span>
        <span className="flex items-center gap-1"><span>🌿</span><span className="text-xs">Aapke mohalle ki dukaan</span></span>
      </div>
      {s.contact&&<div>📞 Call/WhatsApp: {s.contact}</div>}
      <div>⏰ {s.open_time||'7:00 AM'} – {s.close_time||'10:00 PM'}</div>
      {socials.length>0&&(
        <div className="flex items-center justify-center gap-3" style={{margin:'6px 0'}}>
          {socials.map(x=>(
            <a key={x.label} href={x.href} target="_blank" rel="noopener noreferrer" aria-label={x.label}
              style={{color:'#fff',background:'rgba(255,255,255,0.14)',width:34,height:34,borderRadius:'50%',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'0.95rem'}}>{x.icon}</a>
          ))}
        </div>
      )}
      <div className="flex items-center justify-center gap-3 flex-wrap" style={{margin:'6px 0'}}>
        {legal.map(x=>x.k==='support'
          ?<a key={x.k} href="support.html" style={{color:'#fff',textDecoration:'underline'}}>{x.l}</a>
          :<button key={x.k} onClick={()=>onNav(x.k)} style={{color:'#fff',textDecoration:'underline',background:'none'}}>{x.l}</button>)}
      </div>
      <a href="support.html"
        style={{display:'inline-flex',alignItems:'center',gap:7,color:'#fff',background:'rgba(255,255,255,0.16)',padding:'9px 20px',borderRadius:50,fontWeight:700,fontSize:'.78rem',textDecoration:'none',marginTop:10,transition:'transform .15s'}}>
        <MessageCircle size={15}/> Help &amp; Support — Ananya AI
      </a>
      <div style={{marginTop:8,opacity:0.7}}>© {new Date().getFullYear()} {s.shop_name||'RK Grocery Mart'} — {s.footer_text||'हर घर की पसंद'}</div>
    </div>
  );
}

function HomeContent({homepageSections,banners,bannersLoading,bannerIdx,setBannerIdx,bannerWrapRef,handleBannerClick,homeSections,homeLoading,cart,addToCart,updQty,onDetail,cats,catsLoading,catEmoji,sectionProds,sectionProdsReady,featLoading,featuredProds,dbReviews,shopSettings,showToast,setPage,onPickCategory}){
  return(
    <div className="max-w-site mx-auto px-4 md:px-8 pt-4 pb-6 md:pb-8">
      {/* Admin Homepage Builder: sections configured order mein + sirf enabled walay */}
      {(() => {
        const ordered = homepageSections.length ? homepageSections : DEFAULT_HOMEPAGE_SECTIONS;
        const sectionsMap = {
          hero: <HeroBanner banners={banners} bannersLoading={bannersLoading} bannerIdx={bannerIdx} setBannerIdx={setBannerIdx} wrapRef={bannerWrapRef} handleBannerClick={handleBannerClick}/>,
          flash_sale: <FlashSale prods={homeSections.flash} loading={homeLoading} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={onDetail}/>,
          today_deals: <ProductRail title="🔥 Today's Deals" loading={homeLoading} products={homeSections.deals} onSeeAll={()=>setPage('shop')} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={onDetail}/>,
          categories: <div><CategoryGrid cats={cats} catsLoading={catsLoading} catEmoji={catEmoji} onPick={onPickCategory}/></div>,
          featured: <ProductRail title="⭐ Featured Products" loading={featLoading} products={featuredProds} onSeeAll={()=>setPage('shop')} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={onDetail}/>,
          best_sellers: <ProductRail title="🏆 Best Sellers" loading={homeLoading} products={homeSections.bestSellers} onSeeAll={()=>setPage('shop')} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={onDetail}/>,
          new_arrivals: <ProductRail title="✨ New Arrivals" loading={homeLoading} products={homeSections.newArrivals} onSeeAll={()=>setPage('shop')} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={onDetail}/>,
          // SABHI categories ke sections (pehle sirf 6) + har category ke saare
          // products — page scroll karte hi har category apne poore section ke
          // saath dikhti hai. 0 products wali category bhi dikhti hai (chhota
          // empty state) taaki admin me jo bhi category hai wo site par visible ho.
          category_sections: cats.map(c=>{
            const items=sectionProds[c.id];
            if(sectionProdsReady&&(!items||items.length===0)){
              return(
                <div key={c.id} className="rounded-2xl p-5 text-center" style={{background:'var(--card-bg)'}}>
                  <div className="font-extrabold font-poppins text-sm md:text-base" style={{color:'var(--dark)'}}>{c.name}</div>
                  <p className="text-xs font-poppins mt-1.5" style={{color:'var(--gray)'}}>Is category ke products jald aa rahe hain 🛒</p>
                </div>
              );
            }
            return(
              <ProductRail key={c.id} title={c.name} loading={!sectionProdsReady} products={items}
                onSeeAll={()=>onPickCategory(c.id)} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={onDetail}/>
            );
          }),
          why_choose_us: <WhyChooseUs/>,
          reviews: <CustomerReviews reviews={dbReviews}/>,
          download_app: <DownloadApp onInstall={()=>{if(window.RKPwa?.promptInstall){window.RKPwa.promptInstall();}else{showToast('Browser ke ⋮ menu se “Add to Home Screen” chunein 📱');}}}/>,
          newsletter: <Newsletter showToast={showToast}/>,
          how_it_works: (
            <div className="rounded-2xl p-5 md:p-6" style={{background:'var(--card-bg)'}}>
              <div className="font-extrabold font-poppins text-sm md:text-base" style={{color:'var(--dark)'}}>How It Works</div>
              <div className="grid grid-cols-3 gap-3 md:gap-6 mt-4">
                {[{i:'📱',t:'Open the app',s:'Search what you need'},{i:'🛒',t:'Place an order',s:'Add items to cart & checkout'},{i:'🚴',t:'Get fast delivery',s:'Delivered in 1-2 hours'}].map((h,i)=>(
                  <div key={i} className="text-center">
                    <div className="text-2xl md:text-3xl mb-1.5">{h.i}</div>
                    <div className="font-bold font-poppins text-xs md:text-sm" style={{color:'var(--dark)'}}>{h.t}</div>
                    <div className="text-[10px] md:text-xs font-poppins mt-0.5" style={{color:'var(--gray)'}}>{h.s}</div>
                  </div>
                ))}
              </div>
            </div>
          ),
        };
        let firstSection=true;
        return ordered.map(key=>{
          const el=sectionsMap[key];
          if(!el)return null;
          // UNIFORM SECTION GAP: pehla section container ke pt-4 par flush rehta
          // hai, baaki har section ko SAME top margin (mt-6 md:mt-8) milta hai.
          // Pehle har section ka apna baked-in margin tha (flash mt-5, rails mt-8,
          // hero 0) — isliye Homepage Builder me reorder karne par kabhi gap
          // jyada hota tha (flash upar to), kabhi carousel 'sata' dikhta tha
          // (hero kisi section ke turant neeche). Ab kisi bhi order me spacing
          // hamesha consistent.
          // category_sections ek ARRAY hai (har category ka rail) — flatten karke
          // HAR rail ko apna gap wrapper mile, warna saare rails ek div ke andar
          // bina margin ke atak jate.
          const items=Array.isArray(el)?el:[el];
          return items.map((item,i)=>{
            const cls=firstSection?'':'mt-6 md:mt-8 empty:hidden';
            firstSection=false;
            return <div key={`${key}-${i}`} className={cls}>{item}</div>;
          });
        });
      })()}

      <div className="mt-6 md:mt-8"><Footer shopSettings={shopSettings} onNav={setPage}/></div>
    </div>
  );
}

function DesktopShop({allCats,activeCatId,catEmoji,visibleShopProds,shopIsLoading,isSearchActive,searchResults,shopTotal,inStockOnly,search,sortBy,setSortBy,cart,addToCart,updQty,onDetail,totalPages,shopPage,setShopPage,onSidebarPick}){
  const prods=visibleShopProds;
  const isLoading=shopIsLoading;
  const activeCatName=allCats.find(c=>c.id===activeCatId)?.name||'All Products';
  const countLabel=isLoading?'Loading…':(inStockOnly?`${prods.length} in stock`:`${isSearchActive?searchResults.length:shopTotal} Products`);
  return(
    <div className="flex items-start max-w-site mx-auto px-4 md:px-7">
      <DesktopSidebar allCats={allCats} activeCatId={activeCatId} catEmoji={catEmoji} onPick={onSidebarPick}/>
      <div className="flex-1 min-w-0 py-4">
        <div className="rounded-2xl p-4 md:p-5" style={{background:'var(--card-bg)'}}>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="min-w-0">
              <div className="font-extrabold font-poppins text-sm" style={{color:'var(--dark)'}}>{countLabel}</div>
              <div className="text-xs font-poppins truncate" style={{color:'var(--gray)'}}>{activeCatName}{search?` • "${search}"`:''}</div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} aria-label="Sort products"
                className="text-xs font-poppins font-semibold rounded-xl px-3 py-2 outline-none"
                style={{border:'1.5px solid var(--border)',background:'var(--page-bg)',color:'var(--dark)'}}>
                {SORT_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-xs font-semibold font-poppins cursor-pointer select-none" style={{color:'var(--dark)'}}>
                <input type="checkbox" checked={inStockOnly} onChange={e=>setInStockOnly(e.target.checked)} style={{accentColor:'var(--primary)',width:15,height:15}}/>
                In stock only
              </label>
            </div>
          </div>
          {isLoading
            ?<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4" aria-busy="true" aria-label="Products load ho rahe hain">{[...Array(8)].map((_,i)=><SkelCard key={i}/>)}</div>
            :prods.length===0
              ?<div className="text-center py-16">
                <div style={{fontSize:'3rem'}}>🔍</div>
                <p className="mt-2.5 font-semibold font-poppins text-sm" style={{color:'var(--gray)'}}>"{search||activeCatName}" mein koi product nahi mila</p>
                {inStockOnly&&<button onClick={()=>setInStockOnly(false)} className="text-xs font-bold font-poppins mt-2" style={{color:'var(--primary)'}}>"In stock only" filter hataayein</button>}
              </div>
              :<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">{prods.map(p=><PCard key={p.id} p={p} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={onDetail}/>)}</div>
          }
          {!search&&totalPages>1&&(
            <div className="flex justify-center flex-wrap gap-2 mt-6">
              {[...Array(totalPages)].map((_,i)=>{
                const on=shopPage===i+1;
                return(
                  <button key={i} onClick={()=>setShopPage(i+1)}
                    className="w-8 h-8 rounded-lg text-[13px] font-bold font-poppins flex items-center justify-center"
                    style={{border:`1.5px solid ${on?'var(--primary)':'var(--border)'}`,background:on?'var(--primary)':'transparent',color:on?'#fff':'var(--gray)'}}>
                    {i+1}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Module 12: Premium homepage sections ────────────────────
// All standalone (stable component types, like MobileCatRow) so their
// internal timers/state never remount when App re-renders.

function useCountdownToMidnight(){
  const [left,setLeft]=useState(()=>{const n=new Date();const e=new Date(n);e.setHours(24,0,0,0);return Math.max(0,e-n);});
  useEffect(()=>{
    const tick=()=>{const n=new Date();const e=new Date(n);e.setHours(24,0,0,0);setLeft(Math.max(0,e-n));};
    const t=setInterval(tick,1000);
    return()=>clearInterval(t);
  },[]);
  return left;
}

// ⚡ Flash Sale — real discounted products from useHomeSections, countdown to midnight
function FlashSale({prods,loading,cart,addToCart,updQty,onDetail}){
  const left=useCountdownToMidnight();
  if(!loading&&prods.length===0)return null;
  const pad=n=>String(n).padStart(2,'0');
  const h=Math.floor(left/3.6e6),m=Math.floor(left%3.6e6/6e4),s=Math.floor(left%6e4/1e3);
  const chips=[{v:h,l:'Hours'},{v:m,l:'Min'},{v:s,l:'Sec'}];
  return(
    <div className="rounded-3xl p-4 md:p-6"
      style={{background:'linear-gradient(120deg,#14532D,#15803D 55%,#166534)',boxShadow:'0 10px 30px rgba(21,128,61,0.35)'}}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xl md:text-2xl animate-pulse">⚡</span>
          <h2 className="text-white font-extrabold font-poppins text-base md:text-xl">Flash Sale</h2>
          <span className="hidden sm:inline-block text-white/70 text-xs font-poppins">Sirf aaj ke liye!</span>
        </div>
        <div className="flex items-center gap-1.5" role="timer" aria-label="Flash sale countdown">
          <span className="text-white/80 text-[10px] md:text-xs font-bold font-poppins mr-1">Ends in</span>
          {chips.map(t=>(
            <div key={t.l} className="flex flex-col items-center bg-white/15 backdrop-blur rounded-xl px-2 py-1 md:px-3 md:py-1.5 min-w-[50px]">
              <span className="text-white font-black font-poppins text-sm md:text-lg tabular-nums">{pad(t.v)}</span>
              <span className="text-white/70 text-[8px] md:text-[9px] font-poppins uppercase tracking-wide">{t.l}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-1 mt-4 snap-x scrollbar-hide">
        {loading
          ?[...Array(4)].map((_,i)=><div key={i} className="flex-shrink-0 w-36 md:w-44 snap-start"><SkelCard/></div>)
          :prods.map(p=>(
            <div key={p.id} className="flex-shrink-0 w-36 md:w-44 snap-start">
              <PCard p={p} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={onDetail}/>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// 💚 Why Choose Us — static premium feature grid
function WhyChooseUs(){
  const feats=[
    {icon:Zap,title:'Lightning Delivery',desc:'1-2 ghante mein order aapke ghar tak'},
    {icon:Leaf,title:'Fresh & Natural',desc:'Roz subah mandi se fresh fruits-sabziyan'},
    {icon:BadgePercent,title:'Best Prices',desc:'Market se saste — daily deals & coupons'},
    {icon:ShieldCheck,title:'100% Safe Payments',desc:'UPI, cards, netbanking — secure checkout'},
    {icon:Package,title:'Wide Selection',desc:'1500+ products, 16+ categories — sab kuch ek jagah'},
    {icon:Headphones,title:'24x7 Support',desc:'Ananya AI + WhatsApp — kabhi bhi help'},
  ];
  return(
    <div>
      <h2 className="text-base md:text-xl font-bold font-poppins" style={{color:'var(--dark)'}}>Why Choose <span style={{color:'var(--primary)'}}>RK Grocery Mart?</span></h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-4">
        {feats.map(f=>{
          const Icon=f.icon;
          return(
            <div key={f.title} className="rounded-2xl p-4 md:p-5 transition-transform hover:-translate-y-1"
              style={{background:'var(--card-bg)',boxShadow:'0 2px 10px rgba(0,0,0,0.06)'}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'var(--primary-light)'}}>
                <Icon size={20} style={{color:'var(--primary)'}}/>
              </div>
              <div className="mt-2.5 font-bold font-poppins text-xs md:text-sm" style={{color:'var(--dark)'}}>{f.title}</div>
              <div className="mt-0.5 text-[10px] md:text-xs font-poppins leading-snug" style={{color:'var(--gray)'}}>{f.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ⭐ Customer Reviews — admin-approved reviews (reviews table) with fallback grid
function CustomerReviews({reviews=[]}){
  const fallback=[
    {name:'Priya Sharma',place:'Jaunpur',stars:5,text:'Roj ka saman ab online — fresh sabziyan aur 1-2 ghante mein delivery! Bahut badhiya service.'},
    {name:'Rahul Verma',place:'Safiabad',stars:5,text:'Rate market se kam hain aur coupons se aur bachat. UPI payment ekdum aasaan.'},
    {name:'Sunita Devi',place:'Shahganj',stars:4,text:'Ananya AI se pooch kar order kiya — bilkul sahi product mila. Highly recommended!'},
    {name:'Amit Yadav',place:'Machhlishahr',stars:5,text:'COD option hone se ghar walon ko bhi bharosa hai. RK Grocery Mart = ghar ki dukaan.'},
  ];
  // Admin ke Reviews page par APPROVED reviews hi yahan aate hain; agar koi
  // nahi hai to purana curated fallback dikhta hai (khaali section kabhi nahi).
  const list=reviews.length
    ?reviews.map(r=>({name:r.customer_name||'Customer',place:'Verified ✓',stars:Math.max(1,Math.min(5,r.rating||5)),text:r.comment||'',reply:r.admin_reply}))
    :fallback;
  return(
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base md:text-xl font-bold font-poppins" style={{color:'var(--dark)'}}>Kya Kehte Hain <span style={{color:'var(--primary)'}}>Hamare Customers?</span></h2>
        <span className="hidden md:flex items-center gap-1 text-xs font-bold font-poppins px-3 py-1.5 rounded-full" style={{background:'var(--primary-light)',color:'var(--primary-dark)'}}>⭐ 4.8/5 average</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {reviews.map(r=>(
          <div key={r.name} className="rounded-2xl p-4 md:p-5" style={{background:'var(--card-bg)',boxShadow:'0 2px 10px rgba(0,0,0,0.06)'}}>
            <div className="text-[#FFB800] text-sm tracking-tight">{"★★★★★".slice(0,r.stars)}{"☆".repeat(5-r.stars)}</div>
            <p className="mt-2.5 text-xs md:text-[13px] font-poppins leading-relaxed" style={{color:'var(--text)'}}>“{r.text}”</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:'linear-gradient(135deg,var(--primary),var(--orange))'}}>{r.name[0]}</div>
              <div>
                <div className="text-xs font-bold font-poppins" style={{color:'var(--dark)'}}>{r.name}</div>
                <div className="text-[10px] font-poppins" style={{color:'var(--gray)'}}>{r.place} ✓ Verified</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 📱 Download App — PWA install CTA
function DownloadApp({onInstall}){
  return(
    <div className="rounded-3xl p-5 md:p-8 flex flex-col md:flex-row items-center gap-5 md:gap-8"
      style={{background:'linear-gradient(135deg,#16A34A,#15803D)'}}>
      <div className="flex-1 text-center md:text-left">
        <h2 className="text-white font-extrabold font-poppins text-lg md:text-2xl">App Install Karein 📱</h2>
        <p className="text-white/80 text-xs md:text-sm font-poppins mt-1.5 leading-relaxed">Fast loading, offline access aur home screen se ek-tap shopping — bilkul free!</p>
        <ul className="mt-3 space-y-1.5 text-left inline-block">
          {['Offline mein bhi browse karein','Weekly app-exclusive offers','1-tap reorder & notifications'].map(t=>(
            <li key={t} className="flex items-center gap-2 text-white/90 text-xs md:text-[13px] font-poppins"><span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[9px]">✓</span>{t}</li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2.5 justify-center md:justify-start">
          <button onClick={onInstall} className="flex items-center gap-2 bg-white text-[#15803D] font-extrabold font-poppins text-xs md:text-sm px-4 md:px-5 py-2.5 rounded-xl shadow-lg hover:scale-[1.03] active:scale-95 transition-transform">
            <Download size={16}/> Get the App
          </button>
          <span className="text-white/70 text-[10px] md:text-xs font-poppins self-center">Android • iOS • Desktop</span>
        </div>
      </div>
      <div className="text-7xl md:text-8xl select-none" aria-hidden="true">🛒</div>
    </div>
  );
}

// 📬 Newsletter — frontend-only subscribe (toast confirmation)
function Newsletter({showToast}){
  const [email,setEmail]=useState('');
  const submit=e=>{
    e.preventDefault();
    if(!email||!/\S+@\S+\.\S+/.test(email)){showToast('Sahi email daalein 🙏');return;}
    setEmail('');
    showToast('Subscribe ho gaye! Offers aapke inbox mein 🎉');
  };
  return(
    <div className="rounded-3xl p-5 md:p-8 text-center" style={{background:'var(--primary-light)'}}>
      <h2 className="font-extrabold font-poppins text-base md:text-xl" style={{color:'var(--primary-dark)'}}>Weekly Offers &amp; Deals 📬</h2>
      <p className="text-xs md:text-sm font-poppins mt-1" style={{color:'var(--gray)'}}>Register karein — har hafte naye coupons aur flash sale alerts seedha inbox mein.</p>
      <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto">
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="aapka@email.com" aria-label="Newsletter email"
          className="flex-1 rounded-xl px-4 py-3 text-sm font-poppins outline-none"
          style={{border:'1.5px solid var(--border)',background:'var(--card-bg)',color:'var(--dark)'}}/>
        <button type="submit" className="text-white font-bold font-poppins text-sm rounded-xl px-5 py-3 flex items-center justify-center gap-2"
          style={{background:'linear-gradient(135deg,var(--primary),var(--primary-dark))'}}>
          <Send size={15}/> Subscribe
        </button>
      </form>
    </div>
  );
}

// ℹ️ Static pages (About / Privacy / Terms / Shipping) — content admin Settings se
function InfoPage({title,body}){
  return(
    <div className="max-w-site mx-auto px-4 md:px-8 py-8">
      <div className="rounded-3xl p-6 md:p-8" style={{background:'var(--card-bg)',boxShadow:'0 2px 10px rgba(0,0,0,0.06)'}}>
        <h1 className="font-extrabold font-poppins text-lg md:text-2xl mb-4" style={{color:'var(--dark)'}}>{title}</h1>
        <div className="text-sm font-poppins leading-relaxed whitespace-pre-wrap" style={{color:'var(--text)'}}>{body||'Content abhi add nahi hua — admin Settings se update hota hai.'}</div>
      </div>
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
  // Module 4: listing-page sort + in-stock filter. These are purely
  // display-layer — they re-order/filter the products array that
  // useProducts() already fetched for the current page. They do NOT touch
  // the Supabase query in dataHooks.js, so pagination/category/search logic
  // is 100% unchanged. (Trade-off: since pagination is server-side, "Price:
  // Low to High" etc. sorts within the current page of results, not across
  // the entire catalog — flagged here for the next session.)
  const [sortBy,setSortBy]=useState('default');
  const [inStockOnly,setInStockOnly]=useState(false);
  const [filterDrawerOpen,setFilterDrawerOpen]=useState(false);
  const sortFilterProds=(list)=>{
    let out=inStockOnly?list.filter(p=>!(p.stock_quantity<=0)):list;
    if(sortBy==='price-low') out=[...out].sort((a,b)=>a.selling_price-b.selling_price);
    else if(sortBy==='price-high') out=[...out].sort((a,b)=>b.selling_price-a.selling_price);
    return out;
  };
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

  // Module 4: shared derived state for the listing page (desktop + mobile
  // both read from this so sort/filter/search logic isn't duplicated).
  const isSearchActive=search.trim().length>1;
  const rawShopProds=isSearchActive?searchResults:shopProds;
  const shopIsLoading=isSearchActive?searchLoading:shopLoading;
  const visibleShopProds=sortFilterProds(rawShopProds);

  // Featured products for home
  const {products:featuredProds,loading:featLoading}=useProducts({featured:true,pageSize:8});

  // Module 12: premium homepage sections (flash sale / deals / best sellers / new arrivals)
  const {sections:homeSections,loading:homeLoading}=useHomeSections();
  // Admin Homepage Builder: section order/visibility + approved reviews + live shop settings
  const {sections:homepageSections}=useHomepageConfig();
  const {reviews:dbReviews}=useReviews();
  const {settings:shopSettings}=useShopSettings();

  // Section products per category — SABHI categories + har category ke SABHI
  // products (pehle sirf 6 cats × 8 items dikhte the). Ek hi query me saare
  // active products lo aur client-side category_id se group karo (16 alag
  // queries ki jagah 1) — home page par scroll karte hi har category ka pura
  // section apne saare products ke saath dikhta hai.
  const [sectionProds,setSectionProds]=useState({});
  // Ready flag: query complete hone par true — iske bina 0-products wali category
  // par `items` undefined rehta aur rail hamesha skeleton dikhati thi. Ab ready
  // hone par undefined/[] dono ko empty state milta hai.
  const [sectionProdsReady,setSectionProdsReady]=useState(false);
  useEffect(()=>{
    if(!cats.length)return;
    let cancelled=false;
    (async()=>{
      // try/catch: query fail hone par bhi ready=true set hota hai — warna saari
      // category rails hamesha skeleton dikhati rehti thin (useHomeSections jaisa
      // pattern). limit(1000): PostgREST/Supabase ka default cap — catalog 1000
      // se zyada ho to yahan pagination chahiye (aaj 150 products hain).
      let data=null;
      try{
        const res=await supabase.from('products')
          .select('*,product_images(image_url,is_default,sort_order)')
          .eq('is_active',true)
          .order('is_featured',{ascending:false})
          .order('created_at',{ascending:false})
          .limit(1000);
        data=res.data;
      }catch(e){data=null;}
      if(cancelled)return;
      const map={};
      for(const pr of (data||[])){
        // BUG FIX: images sorted by sort_order; primary_image = admin ka ⭐ DEFAULT
        // (is_default flag) — dataHooks.js jaisa hi shape. Default nahi hai to
        // pehli sorted image fallback.
        const imgs=(pr.product_images||[]).slice().sort((a,b)=>a.sort_order-b.sort_order);
        const enriched={
          ...pr,
          discount:calcDiscount(pr.selling_price,pr.original_price),
          // `images` array + primary_image dono — ProductDetail gallery/thumbnails
          // aur cards ke liye (dataHooks.js jaisa hi shape).
          images:imgs,
          primary_image:(imgs.find(i=>i.is_default)||imgs[0])?.image_url||null,
        };
        if(!map[pr.category_id])map[pr.category_id]=[];
        map[pr.category_id].push(enriched);
      }
      setSectionProds(map);
      setSectionProdsReady(true);
    })();
    return()=>{cancelled=true;};
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
    // Admin Settings se theme color (agar set ho to) site accent par apply karo
    if(shopSettings.theme_color&&/^#[0-9a-fA-F]{6}$/.test(shopSettings.theme_color)){
      document.documentElement.style.setProperty('--primary',shopSettings.theme_color);
    }
    const m=document.querySelector('meta[name="theme-color"]');
    if(m)m.setAttribute('content',theme==='dark'?'#0F1521':(shopSettings.theme_color||'#15803D'));
  },[theme,shopSettings.theme_color]);

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
  // V4.1: dark-mode toggle moved to Account → Settings → Appearance (see
  // AccountPage.jsx SettingsTab). The main page keeps the saved theme applied
  // via the useEffect above, but no longer shows the header switch.

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

  // Module 7: auth is now an in-place modal instead of a full navigation to
  // login.html/signup.html. `rk_redirect` sessionStorage + the existing
  // `useEffect(()=>{...},[user])` above (unchanged) still does the actual
  // "land on checkout after login" redirect once `user` updates via the
  // existing onAuthStateChange listener — this just decides when to show it.
  const [authModal,setAuthModal]=useState(null); // null | 'login' | 'signup'
  const openLogin=()=>setAuthModal('login');
  const openLoginForCheckout=()=>{sessionStorage.setItem('rk_redirect','checkout');setAuthModal('login');};

  const goToCheckout=()=>{setCartOpen(false);if(user)setPage('checkout');else openLoginForCheckout();};

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

  // HeroBanner & CategoryGrid → hoisted to module level (Module 13: scroll-reset fix).

  // ProductRail & DesktopSidebar → hoisted to module level (Module 13).

  // Footer & HomeContent → hoisted to module level (Module 13).

  // DesktopShop → hoisted to module level (Module 13).

  return(
    <div style={{background:'var(--page-bg)',minHeight:'100vh'}}>
      {/* ── HEADER (Module 2: unified Tailwind header, same look on mobile+desktop
           as the new design — replaces the old separate desktop-header/.header
           blocks). All state/handlers below are UNCHANGED from before: setPage,
           showToast, search/setSearch/setShopPage, toggleTheme, isPWA, user,
           openLogin (Module 7: opens AuthModal in place of the old goLogin
           full-page nav), setCartOpen, count. desktopHeaderRef stays attached so the
           --header-h ResizeObserver (used by the desktop sidebar's sticky
           offset) keeps working. */}
      <header className="sticky top-0 z-50" ref={desktopHeaderRef}
        style={{background:'var(--card-bg)',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
        <div className="max-w-site mx-auto px-4 md:px-8 pt-3 md:pt-4 pb-3">
          <div className="flex items-center justify-between gap-3 md:gap-6">
            {/* Logo + location */}
            <div className="min-w-0">
              <button onClick={()=>setPage('home')} className="flex items-center gap-2 text-left" style={{background:'none'}}>
                <img src={shopSettings.logo_url||'/icons/rk-logo.svg'} alt={shopSettings.shop_name||'RK Grocery Mart'} className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex-shrink-0"/>
                <span className="flex flex-col min-w-0">
                  <span className="text-[13px] sm:text-base md:text-lg font-extrabold font-poppins leading-none truncate" style={{color:'var(--dark)'}}>{shopSettings.shop_name||'RK Grocery Mart'}</span>
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] font-poppins font-medium mt-0.5 truncate" style={{color:'var(--primary)'}}>{shopSettings.footer_text||'हर घर की पसंद'}</span>
                </span>
              </button>
              <button className="flex items-center gap-1 mt-0.5 max-w-[150px] sm:max-w-[220px]" style={{background:'none'}}
                onClick={()=>showToast('📍 Location change abhi available nahi hai')}>
                <MapPin size={12} style={{color:'var(--primary)'}} className="flex-shrink-0"/>
                <span className="text-xs font-poppins truncate" style={{color:'var(--gray)',...headerLabelStyle}}>{headerLabel}</span>
                <ChevronDown size={11} style={{color:'var(--gray)'}} className="flex-shrink-0"/>
              </button>
            </div>

            {/* Search — desktop only, center (mobile gets a full-width row below) */}
            <div className="hidden md:block flex-1 max-w-xl mx-auto">
              <div className="w-full flex items-center gap-3 rounded-2xl p-2.5"
                style={{background:'var(--light)',border:'1.5px solid var(--border)',opacity:searchDisabled?0.5:1}}>
                <Search size={18} style={{color:'var(--gray)'}} className="flex-shrink-0"/>
                <input placeholder="Search groceries, snacks, dairy..." value={search} disabled={searchDisabled}
                  onFocus={()=>{if(searchDisabled)showToast('Pehle yeh kaam poora karein 🙏');}}
                  onChange={e=>{setSearch(e.target.value);setPage('shop');setShopPage(1);}}
                  className="flex-1 bg-transparent text-sm font-poppins outline-none" style={{color:'var(--dark)'}}/>
                {search&&!searchDisabled&&<button onClick={()=>setSearch('')} style={{color:'#A0AEC0',background:'none'}}>✕</button>}
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isPWA&&(
                <button onClick={()=>window.RKPwa&&window.RKPwa.promptInstall()}
                  className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-poppins whitespace-nowrap"
                  style={{background:'var(--primary-light)',color:'var(--primary-dark)'}}>
                  <Download size={14}/> Get App
                </button>
              )}

              <button onClick={()=>setCartOpen(true)} aria-label="Cart"
                className="relative flex items-center gap-1.5 px-3 h-9 rounded-xl text-white font-poppins font-bold text-sm"
                style={{background:`linear-gradient(135deg, var(--primary), var(--primary-dark))`, boxShadow:'0 4px 12px rgba(22,163,74,0.3)'}}>
                <ShoppingCart size={17}/>
                <span className="hidden md:inline">Cart</span>
                {count>0&&<span className="absolute -top-1.5 -right-1.5 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center font-poppins" style={{background:'var(--orange)'}}>{count>9?'9+':count}</span>}
              </button>

              {user?
                <button onClick={()=>window.location.href='account.html'} aria-label="Account"
                  className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl font-poppins font-bold text-xs"
                  style={{background:'var(--primary-light)',color:'var(--primary-dark)'}}>
                  <User size={16}/> <span className="max-w-[64px] truncate">{user.name.split(' ')[0]}</span>
                </button>
                :<button onClick={openLogin} className="flex items-center gap-1.5 h-9 px-3 rounded-xl font-poppins font-bold text-xs text-white"
                  style={{background:'var(--primary)'}}>
                  <User size={16}/> Login
                </button>
              }
            </div>
          </div>

          {/* Mobile search — full width row below logo/actions */}
          <div className="md:hidden w-full mt-3">
            <div className="w-full flex items-center gap-3 rounded-2xl p-3"
              style={{background:'var(--light)',border:'1.5px solid var(--border)',opacity:searchDisabled?0.5:1}}>
              <Search size={16} style={{color:'var(--gray)'}} className="flex-shrink-0"/>
              <input placeholder="Search groceries, snacks, dairy..." value={search} disabled={searchDisabled}
                onFocus={()=>{if(searchDisabled)showToast('Pehle yeh kaam poora karein 🙏');}}
                onChange={e=>{setSearch(e.target.value);setPage('shop');setShopPage(1);}}
                className="flex-1 bg-transparent text-sm font-poppins outline-none" style={{color:'var(--dark)',fontSize:16}}/>
              {search&&!searchDisabled&&<button onClick={()=>setSearch('')} style={{color:'#A0AEC0',background:'none'}}>✕</button>}
            </div>
          </div>
        </div>
      </header>
      {/* Ticker */}
      <div className="ticker">
        <div className="ticker-track">
          {(shopSettings.announcement
            ?[shopSettings.announcement,shopSettings.announcement]
            :[...TICKER,...TICKER]
          ).map((t,i)=><span key={i} className="ticker-item">✦ {t}</span>)}
        </div>
      </div>

      <div className="page-pad">
        {/* ── HOME (Module 3: single unified Tailwind homepage, no more
             separate mobile/desktop markup — see HomeContent above) ── */}
        {page==='home'&&<HomeContent
          homepageSections={homepageSections}
          banners={banners} bannersLoading={bannersLoading}
          bannerIdx={bannerIdx} setBannerIdx={setBannerIdx}
          bannerWrapRef={bannerWrapRef} handleBannerClick={handleBannerClick}
          homeSections={homeSections} homeLoading={homeLoading}
          cart={cart} addToCart={addToCart} updQty={updQty} onDetail={openDetail}
          cats={cats} catsLoading={catsLoading} catEmoji={catEmoji}
          sectionProds={sectionProds} sectionProdsReady={sectionProdsReady} featLoading={featLoading} featuredProds={featuredProds}
          dbReviews={dbReviews} shopSettings={shopSettings} showToast={showToast}
          setPage={setPage}
          onPickCategory={(id)=>{setActiveCatId(id);setPage('shop');setShopPage(1);setSearch('');}}
        />}
        {page==='about'&&<InfoPage title="About Us" body={shopSettings.about_text}/>}
        {page==='privacy'&&<InfoPage title="Privacy Policy" body={shopSettings.privacy_policy}/>}
        {page==='terms'&&<InfoPage title="Terms & Conditions" body={shopSettings.terms_text}/>}
        {page==='shipping'&&<InfoPage title="Delivery & Shipping" body={shopSettings.shipping_rules}/>}

        {/* ── SHOP ── */}
        {page==='shop'&&(
          <>
            <div className="d-view"><DesktopShop
              allCats={allCats} activeCatId={activeCatId} catEmoji={catEmoji}
              visibleShopProds={visibleShopProds} shopIsLoading={shopIsLoading}
              isSearchActive={isSearchActive} searchResults={searchResults} shopTotal={shopTotal}
              inStockOnly={inStockOnly} search={search}
              sortBy={sortBy} setSortBy={setSortBy}
              cart={cart} addToCart={addToCart} updQty={updQty} onDetail={openDetail}
              totalPages={totalPages} shopPage={shopPage} setShopPage={setShopPage}
              onSidebarPick={(id)=>{setActiveCatId(id);setShopPage(1);setSearch('');}}
            /></div>
            <div className="m-view">
              <div className="px-4 pt-3" style={{background:'var(--card-bg)'}}>
                <MobileCatRow cats={allCats} catsLoading={catsLoading} activeCatId={activeCatId} catEmoji={catEmoji} onClick={id=>{setActiveCatId(id);setShopPage(1);setSearch('');}}/>
              </div>
              <div className="px-4 pt-3 pb-2" style={{background:'var(--card-bg)'}}>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="min-w-0">
                    <div className="font-extrabold font-poppins text-sm" style={{color:'var(--dark)'}}>
                      {shopIsLoading?'Loading…':(inStockOnly?`${visibleShopProds.length} in stock`:`${isSearchActive?searchResults.length:shopTotal} products`)}
                    </div>
                    <div className="text-[11px] font-poppins truncate" style={{color:'var(--gray)'}}>{allCats.find(c=>c.id===activeCatId)?.name||'All'}{search?` • "${search}"`:''}</div>
                  </div>
                  <button onClick={()=>setFilterDrawerOpen(true)}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold font-poppins rounded-xl px-3 py-2"
                    style={{border:'1.5px solid var(--border)',background:(sortBy!=='default'||inStockOnly)?'var(--primary-light)':'transparent',color:(sortBy!=='default'||inStockOnly)?'var(--primary-dark)':'var(--dark)'}}>
                    <SlidersHorizontal size={14}/> Filters
                  </button>
                </div>
                {shopIsLoading
                  ?<div className="grid grid-cols-2 gap-2.5" aria-busy="true" aria-label="Products load ho rahe hain">{[...Array(6)].map((_,i)=><SkelCard key={i}/>)}</div>
                  :<>
                    {visibleShopProds.length>0
                      ?<div className="grid grid-cols-2 gap-2.5">
                        {visibleShopProds.map(p=><PCard key={p.id} p={p} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={openDetail}/>)}
                      </div>
                      :<div className="text-center py-10">
                        <div style={{fontSize:'3rem'}}>🔍</div>
                        <p className="mt-2 text-[0.88rem] font-semibold font-poppins" style={{color:'var(--gray)'}}>Koi product nahi mila</p>
                        {inStockOnly&&<button onClick={()=>setInStockOnly(false)} className="text-xs font-bold font-poppins mt-2" style={{color:'var(--primary)'}}>"In stock only" filter hataayein</button>}
                      </div>
                    }
                  </>
                }
                {!search&&totalPages>1&&(
                  <div className="flex justify-center gap-2 py-3">
                    {shopPage>1&&<button onClick={()=>setShopPage(p=>p-1)} className="px-4 py-2 rounded-lg font-bold font-poppins text-sm" style={{border:'1.5px solid var(--border)',background:'transparent',color:'var(--dark)'}}>← Prev</button>}
                    <span className="px-4 py-2 font-bold font-poppins text-sm" style={{color:'var(--gray)'}}>Page {shopPage} of {totalPages}</span>
                    {shopPage<totalPages&&<button onClick={()=>setShopPage(p=>p+1)} className="px-4 py-2 rounded-lg font-bold font-poppins text-sm text-white" style={{border:'1.5px solid var(--primary)',background:'var(--primary)'}}>Next →</button>}
                  </div>
                )}
              </div>
            </div>
            <style>{`.d-view{display:none}.m-view{display:block}@media(min-width:768px){.d-view{display:block}.m-view{display:none}}`}</style>

            {/* Mobile filter/sort bottom sheet (Module 4) */}
            {filterDrawerOpen&&(
              <div className="fixed inset-0 z-[70] flex items-end md:hidden" onClick={()=>setFilterDrawerOpen(false)}>
                <div className="absolute inset-0" style={{background:'rgba(0,0,0,0.4)'}}/>
                <div className="relative w-full rounded-t-2xl p-4" style={{background:'var(--card-bg)',maxHeight:'80vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-bold font-poppins" style={{color:'var(--dark)'}}>Filters &amp; Sort</div>
                    <button onClick={()=>setFilterDrawerOpen(false)} aria-label="Band karein"><X size={20} style={{color:'var(--gray)'}}/></button>
                  </div>
                  <div className="mb-5">
                    <div className="text-xs font-bold font-poppins mb-2 uppercase tracking-wide" style={{color:'var(--gray)'}}>Sort by</div>
                    <div className="flex flex-col gap-1.5">
                      {SORT_OPTIONS.map(o=>(
                        <button key={o.v} onClick={()=>setSortBy(o.v)}
                          className="text-left text-sm font-poppins px-3 py-2.5 rounded-xl"
                          style={{background:sortBy===o.v?'var(--primary-light)':'transparent',color:sortBy===o.v?'var(--primary-dark)':'var(--dark)',fontWeight:sortBy===o.v?700:500}}>
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-poppins cursor-pointer mb-6" style={{color:'var(--dark)'}}>
                    <input type="checkbox" checked={inStockOnly} onChange={e=>setInStockOnly(e.target.checked)} style={{accentColor:'var(--primary)',width:16,height:16}}/>
                    In stock only
                  </label>
                  <button onClick={()=>setFilterDrawerOpen(false)}
                    className="w-full text-white font-bold font-poppins py-3 rounded-xl" style={{background:'var(--primary)'}}>
                    {visibleShopProds.length} results dikhayein
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── PRODUCT DETAIL ── */}
        {page==='detail'&&detailProduct&&(
          <ProductDetail key={detailProduct.id} product={detailProduct} cart={cart} addToCart={addToCart} updQty={updQty} onBack={()=>setPage('shop')} onDetail={openDetail}/>
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
            <p>{success.pay==='cod'?'💵 Delivery par cash dena':success.pay==='razorpay'?'💳 Online payment successful — order confirm ho gaya!':'⏳ Payment verify ho rahi hai — 10-15 min mein confirm ho jayega'}</p>
            <p>⏰ 1-2 ghante mein delivery hogi</p>
            <button className="home-btn" onClick={()=>{setSuccess(null);setPage('home');}}>🏠 Home Par Jao</button>
          </div>
        )}
      </div>

      {/* ── CART DRAWER (Module 6: Tailwind restyle) ──
           NOTE: ".drawer-bg" and ".cart-drawer" class names are KEPT — their
           CSS (position:fixed, the bottom-sheet slideUp animation, z-index
           stacking above the bottom-nav, dark-mode background) already
           works and isn't worth re-deriving in Tailwind. ".total-row" is
           ALSO kept exactly — checkout-location-react.js does
           `querySelectorAll('.total-row')` to inject a delivery-charge line
           above it once a location is picked, so removing/renaming it would
           silently break that. Only the inner item markup/colors changed. ── */}
      {cartOpen&&(
        <>
          <div className="drawer-bg" onClick={()=>setCartOpen(false)}/>
          <div className="cart-drawer flex flex-col" style={{background:'var(--card-bg)'}}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 flex-shrink-0" style={{background:'var(--border)'}}/>
            <div className="flex items-center justify-between px-5 pt-3 pb-2.5 flex-shrink-0" style={{borderBottom:'1px solid var(--border)'}}>
              <div className="font-extrabold font-poppins text-base" style={{color:'var(--dark)'}}>🛒 Mera Cart ({count} items)</div>
              <button aria-label="Cart band karein" onClick={()=>setCartOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{color:'var(--gray)'}}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {cart.length===0
                ?<div className="text-center py-10">
                  <div className="text-5xl animate-bounce">🛒</div>
                  <p className="mt-3 text-sm font-bold font-poppins" style={{color:'var(--gray)'}}>Cart khali hai!</p>
                </div>
                :cart.map(i=>{
                  // Bug fix #1 (preserved): resolve a known stock_quantity for this cart
                  // line so the '+' button here respects the same stock ceiling as the
                  // product card / PDP.
                  const knownStock=productById.current[i.id]?.stock_quantity;
                  const atMax=typeof knownStock==='number'&&i.qty>=knownStock;
                  return(
                    <div key={i.id} className="flex items-center gap-3 py-2.5" style={{borderBottom:'1px solid var(--border)'}}>
                      {i.image
                        ?<img src={i.image} alt={i.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" style={{background:'var(--light)'}}/>
                        :<div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{background:'var(--light)'}}>🛒</div>}
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-bold font-poppins truncate" style={{color:'var(--dark)'}}>{i.name} <span className="font-normal" style={{color:'var(--gray)',fontSize:'0.7rem'}}>({i.unit})</span></div>
                        <div className="text-xs font-poppins font-semibold mt-0.5" style={{color:'var(--primary)'}}>₹{i.price} × {i.qty} = <b>₹{(i.price*i.qty).toFixed(0)}</b></div>
                        {atMax&&<div className="text-[10px] font-poppins font-semibold mt-0.5" style={{color:'var(--red)'}}>Sirf {knownStock} stock mein hai</div>}
                      </div>
                      <div className="flex items-center rounded-lg overflow-hidden flex-shrink-0" style={{border:'1.5px solid var(--primary)'}}>
                        <button aria-label="Quantity kam karein" onClick={()=>updQty(i.id,-1)}
                          className="w-7 h-7 flex items-center justify-center text-white font-bold" style={{background:'var(--primary)'}}>−</button>
                        <span className="w-6 text-center text-xs font-bold font-poppins" style={{color:'var(--dark)'}}>{i.qty}</span>
                        <button aria-label="Quantity badhayein" disabled={atMax} onClick={()=>!atMax&&updQty(i.id,1,knownStock)}
                          className="w-7 h-7 flex items-center justify-center text-white font-bold disabled:opacity-40" style={{background:'var(--primary)'}}>+</button>
                      </div>
                    </div>
                  );
                })
              }
            </div>
            {cart.length>0&&(
              <div className="px-5 flex-shrink-0" style={{borderTop:'1.5px solid var(--border)',paddingTop:14,paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 16px)'}}>
                {!user&&
                  <div className="flex items-center gap-2 rounded-xl px-2.5 py-2 mb-2.5 text-xs font-semibold font-poppins" style={{background:'#FFF8E1',border:'1px solid #FFE0A3',color:'#92600B'}}>
                    🔐 Checkout se pehle login zaroori hai
                  </div>
                }
                <div className="total-row font-poppins" style={{color:'var(--dark)'}}><span>Total</span><span style={{color:'var(--primary)'}}>₹{total.toFixed(0)}</span></div>
                <button onClick={goToCheckout}
                  className="w-full text-white font-extrabold font-poppins rounded-2xl py-3.5 text-sm"
                  style={{background:'linear-gradient(135deg, var(--primary), var(--primary-dark))',boxShadow:'0 6px 16px rgba(22,163,74,0.35)'}}>
                  {user?`Checkout — ₹${total.toFixed(0)} →`:'Login & Checkout →'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── BOTTOM NAV (Module 2: Tailwind + lucide restyle) ──
           NOTE: the outer element KEEPS the "bottom-nav" class — ananya-ai.js
           does `querySelector('.bottom-nav')` to position the chat widget
           above it, so this class name must never be removed. */}
      <div className="bottom-nav flex" style={{background:'var(--card-bg)'}}>
        {[
          {id:'home',icon:Home,l:'Home'},
          {id:'shop',icon:ShoppingBag,l:'Shop'},
        ].map(n=>{
          const Icon=n.icon;const active=page===n.id;
          return(
            <div key={n.id} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
              onClick={()=>setPage(n.id)}>
              <Icon size={21} strokeWidth={active?2.5:1.8} style={{color:active?'var(--primary)':'var(--gray)'}}/>
              <span className="text-[10px] font-medium font-poppins" style={{color:active?'var(--primary)':'var(--gray)'}}>{n.l}</span>
            </div>
          );
        })}
        <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
          onClick={()=>window.location.href='support.html'}>
          <Headphones size={21} strokeWidth={1.8} style={{color:'var(--gray)'}}/>
          <span className="text-[10px] font-medium font-poppins" style={{color:'var(--gray)'}}>Help</span>
        </div>
        {!isPWA&&(
          <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5" onClick={()=>window.RKPwa&&window.RKPwa.promptInstall()}>
            <Download size={21} strokeWidth={1.8} style={{color:'var(--primary)'}}/>
            <span className="text-[10px] font-bold font-poppins" style={{color:'var(--primary)'}}>Get App</span>
          </div>
        )}
        <div className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5" onClick={()=>setCartOpen(true)}>
          {count>0&&<span className="absolute top-1 right-1/4 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center font-poppins" style={{background:'var(--orange)'}}>{count>9?'9+':count}</span>}
          <ShoppingCart size={21} strokeWidth={page==='cart'?2.5:1.8} style={{color:page==='cart'?'var(--primary)':'var(--gray)'}}/>
          <span className="text-[10px] font-medium font-poppins" style={{color:page==='cart'?'var(--primary)':'var(--gray)'}}>Cart</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
          onClick={()=>{if(user)window.location.href='account.html';else openLogin();}}>
          <User size={21} strokeWidth={page===(user?'account':'login')?2.5:1.8} style={{color:page===(user?'account':'login')?'var(--primary)':'var(--gray)'}}/>
          <span className="text-[10px] font-medium font-poppins" style={{color:page===(user?'account':'login')?'var(--primary)':'var(--gray)'}}>{user?'Account':'Login'}</span>
        </div>
      </div>

      {toast&&<div className="toast" role="status" aria-live="polite">{toast}</div>}

      {/* ── AUTH MODAL (Module 7) ── */}
      {authModal&&(
        <AuthModal mode={authModal} onClose={()=>setAuthModal(null)} onSwitchMode={m=>setAuthModal(m)}/>
      )}
    </div>
  );
}