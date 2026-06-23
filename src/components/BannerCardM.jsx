// ── Banner Card ───────────────────────────────────────────
export const BannerCardM=({b,active,onClick})=>{
  const grad=b.bg_gradient||'linear-gradient(135deg,#064E3B,#047857)';
  return(
    <div className="banner-card" style={{background:grad,opacity:active?1:0.4,transform:active?'scale(1)':'scale(0.97)',transition:'all 0.4s',cursor:'pointer'}} onClick={onClick}>
      {b.image_url&&<img src={b.image_url} alt={b.title} className="banner-card-bg-img"/>}
      <div style={{flex:1,position:'relative',zIndex:1}}>
        <div className="banner-tag">LIMITED OFFER</div>
        <div className="banner-title">{b.title}<br/><span className="banner-glow">{b.subtitle||''}</span></div>
        <button className="banner-btn-sm">{b.button_text||'Shop Now'} →</button>
      </div>
      {/* Fix #5: only show the decorative cart emoji when there's no real banner image,
          so a real product/lifestyle photo never gets a mismatched cart icon overlaid on it. */}
      {!b.image_url&&<div className="banner-emoji">🛒</div>}
    </div>
  );
};
