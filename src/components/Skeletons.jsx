// Shaped skeleton placeholders that mirror real content layout (PCard, banner-card, cat-chip)
// so loading states don't cause layout shift and look intentional, not like blank flashes.

export const SkelCard=()=>(
  <div className="prod-card skel-card" aria-hidden="true">
    <div className="prod-img-box">
      <div className="skel skel-card-img"/>
    </div>
    <div className="prod-body">
      <div className="skel skel-line skel-line-nm"/>
      <div className="skel skel-line skel-line-wt"/>
      <div className="prod-price-row">
        <div className="skel skel-line skel-line-price"/>
        <div className="skel skel-card-btn"/>
      </div>
    </div>
  </div>
);

export const SkelBanner=()=>(
  <div className="banner-card skel-banner" aria-hidden="true">
    <div className="skel skel-banner-fill"/>
  </div>
);

export const SkelCat=()=>(
  <div className="cat-chip skel-cat" aria-hidden="true">
    <div className="skel skel-cat-img"/>
    <div className="skel skel-cat-name"/>
  </div>
);
