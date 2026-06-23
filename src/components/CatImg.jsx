import { useState } from 'react';

// ── Category Image (priority: image_url → DB icon_emoji → generic 🛒) ────
export const CatImg=({src,emoji,name,size=52,style={}})=>{
  const [err,setErr]=useState(false);
  if(!src||err) return(
    <div style={{width:size,height:size,borderRadius:14,background:'var(--primary-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.55,...style}}>{emoji||'🛒'}</div>
  );
  return <img src={src} alt={name} style={{width:size,height:size,borderRadius:14,objectFit:'cover',...style}} onError={()=>setErr(true)}/>;
};
