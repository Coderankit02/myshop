import { ProdImg } from './ProdImg';

// ── Product Card ──────────────────────────────────────────
export function PCard({p,cart,addToCart,updQty,onDetail}){
  const inC=cart.find(i=>i.id===p.id);
  const disc=p.discount;
  const oos=p.stock_quantity<=0;
  const atMax=inC&&typeof p.stock_quantity==='number'&&inC.qty>=p.stock_quantity;
  return(
    <div className="prod-card" onClick={()=>onDetail&&onDetail(p)}>
      <div className="prod-img-box" style={{background:'#F7FAFC'}}>
        {/* Fix #7: don't show a discount tag on a card that's already covered by the out-of-stock overlay */}
        {disc&&!oos&&<span className="disc-tag">{disc}% OFF</span>}
        {oos&&<div className="out-of-stock-tag">Out of Stock</div>}
        <ProdImg src={p.primary_image} alt={p.name}/>
      </div>
      <div className="prod-body">
        <div className="prod-nm">{p.name}</div>
        <div className="prod-wt">{p.unit_value}</div>
        <div className="prod-price-row">
          <div>
            {p.original_price&&<div className="prod-mrp">₹{p.original_price}</div>}
            <div className="prod-sp">₹{p.selling_price}</div>
          </div>
          {!oos&&(!inC
            ?<button className="add-btn" onClick={e=>{e.stopPropagation();addToCart(p);}}>ADD</button>
            :<div className="qty-ctrl" onClick={e=>e.stopPropagation()}>
              <button className="qbtn" aria-label="Quantity kam karein" onClick={()=>updQty(p.id,-1)}>−</button>
              <span className="qnum">{inC.qty}</span>
              <button className="qbtn" aria-label="Quantity badhayein" disabled={atMax} onClick={()=>!atMax&&updQty(p.id,1,p.stock_quantity)}>+</button>
            </div>
          )}
        </div>
        {atMax&&<div style={{fontSize:'0.62rem',color:'var(--red)',marginTop:4,fontWeight:600}}>Sirf {p.stock_quantity} stock mein hai</div>}
      </div>
    </div>
  );
}
