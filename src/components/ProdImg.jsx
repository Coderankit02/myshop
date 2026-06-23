import { useState } from 'react';

export const ProdImg=({src,alt,style,className})=>{
  const [err,setErr]=useState(false);
  if(!src||err) return <div className="prod-img-placeholder">🛒</div>;
  return <img src={src} alt={alt||''} style={style} className={className} onError={()=>setErr(true)}/>;
};
