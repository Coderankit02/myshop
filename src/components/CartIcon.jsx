// ── Cart Icon (crisp SVG, renders consistently across all devices unlike the 🛒 emoji) ──
export const CartIcon=({size=18})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    <circle cx="9" cy="21" r="1"/>
    <circle cx="19" cy="21" r="1"/>
    <path d="M2.5 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.5L21.5 8H6"/>
  </svg>
);
