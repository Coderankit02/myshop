import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AuthLayout, { BrandBar, MsgBox, FeatureChips } from './AuthLayout.jsx';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = 'index.html';
    });
  }, []);

  function friendly(err) {
    const m = err?.message || '';
    if (m.includes('Invalid login credentials')) return 'Email ya password galat hai. Dobara try karein.';
    if (m.includes('Email not confirmed'))       return 'Pehle email verify karein. Inbox check karein.';
    if (m.includes('rate limit') || m.includes('Too many')) return 'Zyada try kiya. 1 minute baad dobara karein.';
    if (m.includes('network') || m.includes('fetch'))       return 'Network error. Internet check karein.';
    return m || 'Kuch error hua. Dobara try karein.';
  }

  async function handleLogin(e) {
    e?.preventDefault();
    setError(''); setSuccess('');
    if (!email || !email.includes('@')) { setError('Sahi email address daalein!'); return; }
    if (!password)                       { setError('Password daalein!'); return; }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(friendly(err));
      setLoading(false);
      return;
    }
    if (!remember) {
      try {
        const meta = data.user?.user_metadata || {};
        const profile = { uid: data.user.id, email: data.user.email, name: meta.name || email.split('@')[0], savedAt: Date.now(), sessionOnly: true };
        localStorage.setItem('rk_user', JSON.stringify(profile));
      } catch(e) {}
    }
    setSuccess(`Welcome back, <b>${data.user?.user_metadata?.name || email.split('@')[0]}</b>! 🎉 Redirect ho rahe hain…`);
    setLoading(false);
    setTimeout(() => { window.location.href = 'index.html'; }, 1200);
  }

  return (
    <AuthLayout>
      <BrandBar badge1="⚡ 10-min delivery" badge2="🔒 100% Secure"/>

      <div className="illus-strip">
        {[['🥦','Sabzi'],['🥛','Dairy'],['🌾','Atta'],['🍿','Snacks'],['🥤','Drinks']].map(([e,l]) => (
          <div key={l} className="illus-item"><div className="illus-emoji">{e}</div><div className="illus-label">{l}</div></div>
        ))}
      </div>

      <div className="glass-card">
        <div className="card-head">
          <div className="head-icon">🔑</div>
          <div className="card-title">Wapas Aao!</div>
          <div className="card-subtitle">Apne account mein login karein<br/>aur grocery order karo</div>
        </div>

        <div className="social-grid">
          <button className="social-btn" onClick={() => alert('🚧 Social login coming soon!\nAbhi email se login karein.')}>
            <span className="social-icon">🌐</span> Google
          </button>
          <button className="social-btn" onClick={() => alert('🚧 Social login coming soon!\nAbhi email se login karein.')}>
            <span className="social-icon">📱</span> Mobile OTP
          </button>
        </div>
        <div className="social-note">Social login coming soon • Abhi email se login karein</div>

        <div className="divider">
          <div className="divider-line"/><div className="divider-text">ya email se</div><div className="divider-line"/>
        </div>

        {error   && <MsgBox type="error"   html={error}/>}
        {success && <MsgBox type="success" html={success}/>}

        <div className="field-group">
          <div className="field-label">📧 Email Address</div>
          <div className="field-wrap">
            <span className="field-icon">✉️</span>
            <input className="field-input" type="email" inputMode="email" autoComplete="email"
              placeholder="aapka@email.com" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
          </div>
        </div>

        <div className="field-group">
          <div className="field-label">🔒 Password</div>
          <div className="field-wrap">
            <span className="field-icon">🔐</span>
            <input className="field-input" type={showPw ? 'text' : 'password'} autoComplete="current-password"
              placeholder="Apna password daalein" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{paddingRight:44}}/>
            <button className="pass-toggle" type="button" onClick={() => setShowPw(v => !v)}>
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18,marginTop:-2}}>
          <label className="check-row" style={{marginBottom:0,cursor:'pointer'}}>
            <input type="checkbox" className="check-box" checked={remember} onChange={e => setRemember(e.target.checked)}/>
            <span className="check-label" style={{fontSize:'.74rem',color:'#64748B'}}>Yaad rakhein (30 din)</span>
          </label>
          <div className="forgot-link" style={{margin:0}}>
            <a href="forgot-password.html">🔄 Bhool gaye?</a>
          </div>
        </div>

        <button className="submit-btn" onClick={handleLogin} disabled={loading}>
          {loading ? <><span className="spinner"/> Ek second…</> : '🔑 Login Karo'}
        </button>

        <div className="secure-badge">🔒 256-bit SSL encrypted • Supabase Auth</div>
      </div>

      <div className="bottom-link">
        Naya account? <a href="signup.html">✨ Abhi Signup Karein →</a>
      </div>

      <FeatureChips chips={[
        {icon:'🚀',label:'10-min delivery'},
        {icon:'💳',label:'UPI & COD'},
        {icon:'🛡️',label:'Secure login'},
        {icon:'📦',label:'500+ products'},
      ]}/>
    </AuthLayout>
  );
}
