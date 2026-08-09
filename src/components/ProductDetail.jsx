import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { ProdImg } from './ProdImg';
import { PCard } from './PCard';
import { SkelCard } from './Skeletons';
import { useProducts } from '../hooks/dataHooks';

// ── Product Detail Page (Module 5: Tailwind restyle — same product-fetch,
//    add-to-cart, and stock-guard logic as before. Only new *data* usage is
//    "related products", which reuses the exact same useProducts(categoryId)
//    hook the Shop page already calls elsewhere — no new query shape. ──
export function ProductDetail({product,cart,addToCart,updQty,onBack,onDetail}){
  const [selImg,setSelImg]=useState(()=>{
    const imgs=product.images||[];
    const defIdx=imgs.findIndex(i=>i.is_default);
    return defIdx>=0?defIdx:0;
  });
  const inC=cart.find(i=>i.id===product.id);
  const disc=product.discount;
  const oos=product.stock_quantity<=0;
  const atMax=inC&&typeof product.stock_quantity==='number'&&inC.qty>=product.stock_quantity;
  const savings=product.original_price&&product.original_price>product.selling_price?product.original_price-product.selling_price:0;
  const touchStartX=useRef(null);
  const touchStartY=useRef(null);
  const isDragging=useRef(false);

  const images=product.images||[];
  const mainSrc=images[selImg]?.image_url||null;

  // Component is remounted (via key={product.id} at the call site) whenever a
  // different product is opened — e.g. from "Related products" below — so
  // this just scrolls back to the top on that fresh mount.
  useEffect(()=>{ window.scrollTo(0,0); },[]);

  // Related products: same category, same useProducts() hook already used by
  // the Shop page — no new backend query shape, just a different call site.
  const {products:relatedRaw,loading:relatedLoading}=useProducts({categoryId:product.category_id,pageSize:9});
  const related=(relatedRaw||[]).filter(p=>p.id!==product.id).slice(0,8);

  // Touch (mobile)
  function handleTouchStart(e){
    touchStartX.current=e.touches[0].clientX;
    touchStartY.current=e.touches[0].clientY;
  }
  function handleTouchEnd(e){
    if(touchStartX.current===null)return;
    const dx=e.changedTouches[0].clientX-touchStartX.current;
    const dy=e.changedTouches[0].clientY-touchStartY.current;
    if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>40){
      if(dx<0&&selImg<images.length-1)setSelImg(s=>s+1);
      else if(dx>0&&selImg>0)setSelImg(s=>s-1);
    }
    touchStartX.current=null;touchStartY.current=null;
  }
  // Mouse (laptop/desktop)
  function handleMouseDown(e){
    touchStartX.current=e.clientX;
    touchStartY.current=e.clientY;
    isDragging.current=true;
  }
  function handleMouseUp(e){
    if(!isDragging.current)return;
    isDragging.current=false;
    if(touchStartX.current===null)return;
    const dx=e.clientX-touchStartX.current;
    const dy=e.clientY-touchStartY.current;
    if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>40){
      if(dx<0&&selImg<images.length-1)setSelImg(s=>s+1);
      else if(dx>0&&selImg>0)setSelImg(s=>s-1);
    }
    touchStartX.current=null;touchStartY.current=null;
  }
  function handleMouseLeave(){
    isDragging.current=false;
    touchStartX.current=null;touchStartY.current=null;
  }

  const AddToCartControl=({full})=>(
    inC
      ?<div className={`flex items-center rounded-xl overflow-hidden flex-shrink-0 ${full?'flex-1':''}`} style={{border:'2px solid var(--primary)'}}>
        <button aria-label="Quantity kam karein" onClick={()=>updQty(product.id,-1)}
          className="w-11 h-11 flex items-center justify-center text-white flex-shrink-0" style={{background:'var(--primary)'}}>
          <Minus size={17}/>
        </button>
        <span className="flex-1 text-center font-extrabold font-poppins text-base" style={{color:'var(--dark)'}}>{inC.qty}</span>
        <button aria-label="Quantity badhayein" disabled={atMax} onClick={()=>!atMax&&updQty(product.id,1,product.stock_quantity)}
          className="w-11 h-11 flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40" style={{background:'var(--primary)'}}>
          <Plus size={17}/>
        </button>
      </div>
      :<button onClick={()=>addToCart(product)}
        className={`font-bold font-poppins text-white rounded-xl px-6 py-3.5 flex items-center justify-center gap-2 ${full?'flex-1':''}`}
        style={{background:'linear-gradient(135deg, var(--primary), var(--primary-dark))'}}>
        🛒 Cart Mein Add Karo
      </button>
  );

  return(
    <div className="max-w-site mx-auto px-4 md:px-8 pt-4 pb-8">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-poppins font-semibold mb-3" style={{color:'var(--gray)'}}>
        <ChevronLeft size={16}/> Wapas Jao
      </button>

      <div className="grid md:grid-cols-2 gap-6 md:gap-10">
        {/* ── Gallery ── */}
        {/* Fix: grid child par min-w-0 (Tailwind default 'auto' nahi) — warna
            image ki intrinsic sizing grid track ko 440px tak kheench deti thi
            (grid 358px hota hua bhi), jisse detail page mobile par horizontal
            overflow hota tha aur poori page shrink ho jaati thi. */}
        <div className="min-w-0">
          <div className="relative aspect-square rounded-2xl overflow-hidden select-none"
            style={{background:'var(--light)',border:'1.5px solid var(--border)'}}
            onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}>
            <ProdImg src={mainSrc} alt={product.name} className={oos?'grayscale':''}/>
            {disc&&!oos&&(
              <span className="absolute top-3 left-3 text-white text-xs font-bold font-poppins px-2.5 py-1 rounded-lg" style={{background:'var(--red)'}}>{disc}% OFF</span>
            )}
            {oos&&(
              <div className="absolute inset-0 flex items-center justify-center" style={{background:'rgba(0,0,0,0.45)'}}>
                <span className="bg-white text-sm font-bold font-poppins px-3 py-1.5 rounded-lg" style={{color:'var(--dark)'}}>Out of Stock</span>
              </div>
            )}
            {images.length>1&&(<>
              <button aria-label="Pichli image" disabled={selImg===0} onClick={()=>setSelImg(s=>s-1)}
                className="absolute top-1/2 left-2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-25"
                style={{background:'rgba(0,0,0,0.45)'}}><ChevronLeft size={18}/></button>
              <button aria-label="Agli image" disabled={selImg===images.length-1} onClick={()=>setSelImg(s=>s+1)}
                className="absolute top-1/2 right-2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-25"
                style={{background:'rgba(0,0,0,0.45)'}}><ChevronRight size={18}/></button>
            </>)}
          </div>

          {images.length>1&&(
            <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
              {images.map((img,i)=>(
                <button key={img.id||i} onClick={()=>setSelImg(i)}
                  className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                  style={{border:`2px solid ${selImg===i?'var(--primary)':'var(--border)'}`}}>
                  {/* thumbnails: fixed h-14 + overflow-hidden — portrait images yahan bhi
                      container ko nahi kheench sakti */}
                  <div className="w-full h-full"><ProdImg src={img.image_url} alt={`${product.name} ${i+1}`}/></div>
                </button>
              ))}
            </div>
          )}

          {/* Trust badges — desktop only */}
          <div className="hidden md:grid grid-cols-3 gap-3 mt-6">
            {[{i:'⚡',t:'Fast delivery'},{i:'🌿',t:'100% Fresh guarantee'},{i:'↩️',t:'Easy returns'}].map((b,i)=>(
              <div key={i} className="flex flex-col items-center text-center gap-1.5 rounded-xl p-3" style={{background:'var(--card-bg)',border:'1px solid var(--border)'}}>
                <span className="text-lg">{b.i}</span>
                <p className="text-[11px] font-poppins leading-tight" style={{color:'var(--gray)'}}>{b.t}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Info ── */}
        <div className="min-w-0">
          {product.categories&&<div className="text-[11px] font-bold font-poppins uppercase tracking-wide mb-1.5" style={{color:'var(--primary)'}}>{product.categories.name}</div>}
          <h1 className="text-xl md:text-2xl font-extrabold font-poppins leading-snug" style={{color:'var(--dark)'}}>{product.name}</h1>
          <div className="text-xs font-poppins mt-1" style={{color:'var(--gray)'}}>{product.unit_value}</div>

          <div className="flex items-baseline gap-2 mt-4 flex-wrap">
            <span className="text-2xl md:text-3xl font-extrabold font-poppins" style={{color:'var(--dark)'}}>₹{product.selling_price}</span>
            {product.original_price&&product.original_price>product.selling_price&&(
              <>
                <span className="text-sm font-poppins line-through" style={{color:'var(--gray)'}}>₹{product.original_price}</span>
                {savings>0&&<span className="text-sm font-bold font-poppins" style={{color:'var(--primary)'}}>Save ₹{savings}</span>}
              </>
            )}
          </div>
          <p className="text-xs font-poppins mt-1" style={{color:'var(--gray)'}}>Sabhi taxes included</p>

          <div className="mt-3">
            {oos
              ?<span className="text-xs font-bold font-poppins" style={{color:'var(--red)'}}>⚠️ Out of Stock</span>
              :<span className="text-xs font-bold font-poppins" style={{color:'var(--primary)'}}>✓ In Stock ({product.stock_quantity} left)</span>
            }
          </div>

          {/* Add to cart — desktop inline */}
          {!oos&&(
            <div className="hidden md:flex items-center gap-3 mt-6">
              <AddToCartControl full/>
            </div>
          )}

          {product.description&&(
            <div className="mt-6 pt-6" style={{borderTop:'1px solid var(--border)'}}>
              <p className="text-sm font-bold font-poppins mb-2" style={{color:'var(--dark)'}}>Product Description</p>
              <p className="text-sm font-poppins leading-relaxed" style={{color:'var(--gray)'}}>{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Related products ── */}
      {(relatedLoading||related.length>0)&&(
        <div className="mt-10 pt-6" style={{borderTop:'1px solid var(--border)'}}>
          <p className="text-base font-bold font-poppins mb-4" style={{color:'var(--dark)'}}>Aapko Ye Bhi Pasand Aa Sakta Hai</p>
          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-1 snap-x scrollbar-hide">
            {relatedLoading
              ?[...Array(4)].map((_,i)=><div key={i} className="flex-shrink-0 w-36 md:w-44 snap-start"><SkelCard/></div>)
              :related.map(p=>(
                <div key={p.id} className="flex-shrink-0 w-36 md:w-44 snap-start min-w-0">
                  <PCard p={p} cart={cart} addToCart={addToCart} updQty={updQty} onDetail={onDetail}/>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── Sticky add-to-cart bar (mobile) — offset above the fixed bottom-nav,
           same "70px + safe-area" clearance the old .pdp-add-section used. ── */}
      {!oos&&(
        <div className="md:hidden fixed left-0 right-0 z-[900] flex items-center gap-3 px-4 py-3"
          style={{background:'var(--card-bg)',borderTop:'1px solid var(--border)',bottom:'max(70px, calc(70px + env(safe-area-inset-bottom, 0px)))',boxShadow:'0 -4px 16px rgba(0,0,0,0.08)'}}>
          <AddToCartControl full/>
          <div className="text-right flex-shrink-0">
            <div className="font-extrabold font-poppins text-base" style={{color:'var(--primary)'}}>₹{product.selling_price}</div>
            {product.original_price&&product.original_price>product.selling_price&&
              <div className="text-[10px] font-poppins line-through" style={{color:'var(--gray)'}}>₹{product.original_price}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
