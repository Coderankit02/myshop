import { useState, useRef } from 'react';

// ── Product Detail Page ───────────────────────────────────
export function ProductDetail({product,cart,addToCart,updQty,onBack}){
  const [selImg,setSelImg]=useState(()=>{
    // Start on default image
    const imgs=product.images||[];
    const defIdx=imgs.findIndex(i=>i.is_default);
    return defIdx>=0?defIdx:0;
  });
  const inC=cart.find(i=>i.id===product.id);
  const disc=product.discount;
  const oos=product.stock_quantity<=0;
  const atMax=inC&&typeof product.stock_quantity==='number'&&inC.qty>=product.stock_quantity;
  const [imgErr,setImgErr]=useState({});
  const touchStartX=useRef(null);
  const touchStartY=useRef(null);
  const isDragging=useRef(false);

  const images=product.images||[];
  const mainSrc=images[selImg]?.image_url||null;

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
      if(dx<0&&selImg<images.length-1){setSelImg(s=>s+1);setImgErr({});}
      else if(dx>0&&selImg>0){setSelImg(s=>s-1);setImgErr({});}
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
      if(dx<0&&selImg<images.length-1){setSelImg(s=>s+1);setImgErr({});}
      else if(dx>0&&selImg>0){setSelImg(s=>s-1);setImgErr({});}
    }
    touchStartX.current=null;touchStartY.current=null;
  }
  function handleMouseLeave(){
    isDragging.current=false;
    touchStartX.current=null;touchStartY.current=null;
  }

  return(
    <div className="product-detail-page">
      <button className="pdp-back" onClick={onBack}>← Wapas Jao</button>
      <div className="pdp-gallery" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{userSelect:'none',position:'relative'}}>
        {mainSrc&&!imgErr[selImg]
          ?<img className="pdp-main-img" src={mainSrc} alt={product.name} onError={()=>setImgErr(p=>({...p,[selImg]:true}))} draggable={false}/>
          :<div className="pdp-main-placeholder">🛒</div>
        }
        {images.length>1&&(<>
          <button onClick={()=>{if(selImg>0){setSelImg(s=>s-1);setImgErr({});}}} style={{position:'absolute',top:'50%',left:8,transform:'translateY(-50%)',width:36,height:36,borderRadius:'50%',background:'rgba(0,0,0,0.45)',color:'#fff',fontSize:'1.1rem',display:'flex',alignItems:'center',justifyContent:'center',opacity:selImg===0?0.25:1,cursor:selImg===0?'default':'pointer',border:'none',zIndex:5}}>‹</button>
          <button onClick={()=>{if(selImg<images.length-1){setSelImg(s=>s+1);setImgErr({});}}} style={{position:'absolute',top:'50%',right:8,transform:'translateY(-50%)',width:36,height:36,borderRadius:'50%',background:'rgba(0,0,0,0.45)',color:'#fff',fontSize:'1.1rem',display:'flex',alignItems:'center',justifyContent:'center',opacity:selImg===images.length-1?0.25:1,cursor:selImg===images.length-1?'default':'pointer',border:'none',zIndex:5}}>›</button>
          <div style={{position:'relative'}}>
            <div className="pdp-thumbs">
              {images.map((img,i)=>(
                <img key={img.id||i} className={`pdp-thumb ${selImg===i?'on':''}`} src={img.image_url} alt={`${product.name} ${i+1}`}
                  onClick={()=>{setSelImg(i);setImgErr({});}} onError={()=>setImgErr(p=>({...p,[i]:true}))}/>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'center',gap:6,paddingBottom:10}}>
              {images.map((_,i)=>(
                <span key={i} onClick={()=>{setSelImg(i);setImgErr({});}} style={{width:i===selImg?18:7,height:7,borderRadius:4,background:i===selImg?'var(--primary)':'var(--border)',display:'inline-block',cursor:'pointer',transition:'all .2s'}}/>
              ))}
            </div>
          </div>
        </>)}
      </div>
      <div className="pdp-info">
        {product.categories&&<div className="pdp-cat-label">{product.categories.name}</div>}
        <div className="pdp-name">{product.name}</div>
        <div className="pdp-unit">{product.unit_value}</div>
        <div className="pdp-price-row">
          <div className="pdp-sp">₹{product.selling_price}</div>
          {product.original_price&&<div className="pdp-mrp">MRP ₹{product.original_price}</div>}
          {disc&&!oos&&<div className="pdp-disc-badge">{disc}% OFF</div>}
        </div>
        {oos
          ?<div className="pdp-stock-out">⚠️ Out of Stock</div>
          :<div className="pdp-stock-ok">✓ In Stock ({product.stock_quantity} left)</div>
        }
        {product.description&&<div className="pdp-desc">{product.description}</div>}
      </div>
      {!oos&&(
        <div className="pdp-add-section">
          {inC
            ?<div style={{flex:1}}>
              <div className="pdp-qty-ctrl">
                <button className="pdp-qbtn" aria-label="Quantity kam karein" onClick={()=>updQty(product.id,-1)}>−</button>
                <span className="pdp-qnum">{inC.qty}</span>
                <button className="pdp-qbtn" aria-label="Quantity badhayein" disabled={atMax} onClick={()=>!atMax&&updQty(product.id,1,product.stock_quantity)}>+</button>
              </div>
              {atMax&&<div className="pdp-stock-left">Sirf {product.stock_quantity} stock mein hai</div>}
            </div>
            :<button className="pdp-add-btn" onClick={()=>addToCart(product)}>🛒 Cart Mein Add Karo</button>
          }
          <div style={{fontWeight:800,fontSize:'1rem',color:'var(--primary)'}}>₹{product.selling_price}</div>
        </div>
      )}
    </div>
  );
}
