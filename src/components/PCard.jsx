import { ProdImg } from './ProdImg';

// ── Product Card (Module 3: Tailwind restyle — same props/logic as before) ──
export function PCard({p,cart,addToCart,updQty,onDetail}){
  const inC=cart.find(i=>i.id===p.id);
  const disc=p.discount;
  const oos=p.stock_quantity<=0;
  const atMax=inC&&typeof p.stock_quantity==='number'&&inC.qty>=p.stock_quantity;
  return(
    <div className="rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full"
      style={{background:'var(--card-bg)',boxShadow:'0 2px 10px rgba(0,0,0,0.06)'}}
      onClick={()=>onDetail&&onDetail(p)}>
      {/* Fix: overflow-hidden — image apni natural aspect-ratio se container ko
          kheench kar non-square (144x151/144x199) na bana de. Iske bina 3:4
          portrait images se cards alag-size dikhte the + detail page par
          horizontal overflow hota tha. */}
      <div className="relative aspect-square overflow-hidden" style={{background:'var(--light)'}}>
        {/* Fix #7 (preserved): no discount tag on a card already covered by the out-of-stock overlay */}
        {disc&&!oos&&(
          <span className="absolute top-2 left-2 z-10 text-white text-[10px] font-bold font-poppins px-1.5 py-0.5 rounded-md"
            style={{background:'var(--red)'}}>{disc}% OFF</span>
        )}
        {oos&&(
          <div className="absolute inset-0 z-10 flex items-center justify-center text-xs font-bold font-poppins text-white"
            style={{background:'rgba(0,0,0,0.45)'}}>Out of Stock</div>
        )}
        <ProdImg src={p.primary_image} alt={p.name}/>
      </div>
      <div className="p-2.5 flex-1 flex flex-col">
        <div className="text-xs font-semibold font-poppins line-clamp-2 leading-snug" style={{color:'var(--dark)'}}>{p.name}</div>
        <div className="text-[10px] font-poppins mt-0.5" style={{color:'var(--gray)'}}>{p.unit_value}</div>
        <div className="flex items-end justify-between mt-auto pt-2 gap-1">
          <div className="min-w-0">
            {p.original_price&&<div className="text-[10px] line-through font-poppins" style={{color:'var(--gray)'}}>₹{p.original_price}</div>}
            <div className="text-sm font-extrabold font-poppins" style={{color:'var(--dark)'}}>₹{p.selling_price}</div>
          </div>
          {!oos&&(!inC
            ?<button onClick={e=>{e.stopPropagation();addToCart(p);}}
              className="flex-shrink-0 text-[10px] font-bold font-poppins px-3 py-1.5 rounded-lg text-white"
              style={{background:'var(--primary)'}}>ADD</button>
            :<div className="flex-shrink-0 flex items-center gap-1.5 rounded-lg px-1.5 py-1" style={{background:'var(--primary-light)'}} onClick={e=>e.stopPropagation()}>
              <button aria-label="Quantity kam karein" onClick={()=>updQty(p.id,-1)}
                className="w-5 h-5 flex items-center justify-center font-bold text-sm" style={{color:'var(--primary-dark)'}}>−</button>
              <span className="text-xs font-bold font-poppins w-3 text-center" style={{color:'var(--primary-dark)'}}>{inC.qty}</span>
              <button aria-label="Quantity badhayein" disabled={atMax} onClick={()=>!atMax&&updQty(p.id,1,p.stock_quantity)}
                className="w-5 h-5 flex items-center justify-center font-bold text-sm disabled:opacity-40" style={{color:'var(--primary-dark)'}}>+</button>
            </div>
          )}
        </div>
        {atMax&&<div className="text-[10px] font-semibold font-poppins mt-1" style={{color:'var(--red)'}}>Sirf {p.stock_quantity} stock mein hai</div>}
      </div>
    </div>
  );
}
