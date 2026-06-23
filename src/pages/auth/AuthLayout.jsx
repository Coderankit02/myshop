export default function AuthLayout({ children }) {
  return (
    <>
      <div className="auth-bg">
        <div className="grid-overlay"/>
        <div className="orb-3"/>
      </div>
      <div className="auth-page">
        <div className="auth-container">
          {children}
        </div>
      </div>
    </>
  );
}

export function BrandBar({ badge1, badge2 }) {
  return (
    <div className="brand-bar">
      <a href="index.html" className="brand-logo">
        <div className="brand-icon">🛒</div>
        <div>
          <div className="brand-name">rinku<span>.</span></div>
          <div className="brand-tagline">KIRANA &amp; GENERAL STORE</div>
        </div>
      </a>
      <div className="trust-badges">
        {badge1 && <div className="badge-item">{badge1}</div>}
        {badge2 && <div className="badge-item">{badge2}</div>}
      </div>
    </div>
  );
}

export function MsgBox({ type, html }) {
  if (!html) return null;
  return (
    <div className={`msg-box ${type}`} style={{display:'flex'}}>
      <span className="msg-icon">{type === 'error' ? '⚠️' : '✅'}</span>
      <span dangerouslySetInnerHTML={{__html: html}}/>
    </div>
  );
}

export function FeatureChips({ chips }) {
  return (
    <div className="features-row">
      {chips.map(c => (
        <div key={c.label} className="feat-chip">
          <span className="fc-icon">{c.icon}</span> {c.label}
        </div>
      ))}
    </div>
  );
}
