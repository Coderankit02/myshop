/* ══════════════════════════════════════════════════════════
   UpiPayCard (Module 8: Tailwind restyle — purely presentational,
   no props/logic changed, no external script reads any class here)
══════════════════════════════════════════════════════════ */
export function UpiPayCard({total,upiId}){
  return(
    <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{background:'var(--card-bg)',boxShadow:'0 4px 16px rgba(0,0,0,0.08)'}}>
      <div className="px-4 py-3.5 text-white" style={{background:'linear-gradient(135deg, var(--primary), var(--primary-dark))'}}>
        <div className="text-xs font-bold font-poppins">🛒 RK Grocery Mart</div>
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-[11px] font-poppins opacity-80">Amount to pay</span>
          <span className="text-xl font-extrabold font-poppins">₹{total}</span>
        </div>
      </div>
      <div className="px-4 py-4 flex flex-col items-center">
        <div className="flex items-center gap-1.5 text-[11px] font-poppins font-semibold mb-3" style={{color:'var(--primary-dark)'}}>
          🔒 100% Secure Payment — BHIM UPI
        </div>
        <div className="flex items-center gap-1 font-extrabold text-sm mb-3" style={{color:'var(--dark)'}}>
          <span>BHIM</span>
          <span className="w-2 h-2" style={{background:'#FF9933'}}/>
          <span>UPI</span>
          <span className="w-2 h-2" style={{background:'#16A34A'}}/>
        </div>
        <div className="p-3 rounded-2xl" style={{background:'var(--light)',border:'1px solid var(--border)'}}>
          <div className="w-40 h-40 rounded-xl overflow-hidden bg-white">
            <img src="/images/payment-qr.png" alt="RK Grocery Mart UPI QR Code" className="w-full h-full object-contain"/>
          </div>
        </div>
        <div className="text-[11px] font-poppins mt-2.5" style={{color:'var(--gray)'}}>📷 Kisi bhi UPI app se scan karein</div>
        <div className="text-[11px] font-poppins text-center mt-1.5" style={{color:'var(--dark)'}}>💰 Scan karne ke baad <b>₹{total}</b> amount khud type karein</div>
        <div className="grid grid-cols-5 gap-2 w-full mt-3.5">
          <div className="aspect-square rounded-xl flex items-center justify-center bg-white" style={{border:'1px solid var(--border)'}}>
            <span className="text-sm font-bold"><span style={{color:'#4285F4'}}>G</span><span style={{color:'#EA4335'}}>P</span><span style={{color:'#FBBC05'}}>a</span><span style={{color:'#34A853'}}>y</span></span>
          </div>
          <div className="aspect-square rounded-xl flex items-center justify-center bg-white" style={{border:'1px solid var(--border)'}}>
            <span className="text-xs font-bold italic" style={{color:'#00BAF2'}}>paytm</span>
          </div>
          <div className="aspect-square rounded-xl flex items-center justify-center bg-white" style={{border:'1px solid var(--border)'}}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold italic text-white" style={{background:'#1A1A2E'}}>pay</div>
          </div>
          <div className="aspect-square rounded-xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#7C4DCC,#5F259F)'}}>
            <span className="text-lg font-bold text-white leading-none">पे</span>
          </div>
          <div className="aspect-square rounded-xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#5F259F,#00BAF2)'}}>
            <span className="text-sm font-black italic text-white">Pe</span>
          </div>
        </div>
        <div className="text-[11px] font-poppins mt-3" style={{color:'var(--gray)'}}>🔒 UPI ID: {upiId}</div>
      </div>
    </div>
  );
}
