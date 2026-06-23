import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { calcDiscount } from '../lib/helpers';

// ── Data Hooks ────────────────────────────────────────────
export function useCategories(){
  const [cats,setCats]=useState([]);
  const [loading,setLoading]=useState(true);
  const fetch=useCallback(async()=>{
    const {data}=await supabase.from('categories').select('*,category_images(id,image_url,is_default,sort_order)').eq('is_active',true).order('sort_order');
    const enrichedCats=(data||[]).map(c=>{const imgs=(c.category_images||[]).slice().sort((a,b)=>a.sort_order-b.sort_order);const defImg=imgs.find(i=>i.is_default)||imgs[0];return{...c,display_image:defImg?.image_url||c.image_url||null};});
    setCats(enrichedCats);setLoading(false);
  },[]);
  useEffect(()=>{
    fetch();
    const ch=supabase.channel('cats-rt').on('postgres_changes',{event:'*',schema:'public',table:'categories'},fetch).subscribe();
    return()=>supabase.removeChannel(ch);
  },[fetch]);
  return{cats,loading};
}

export function useBanners(){
  const [banners,setBanners]=useState([]);
  const [loading,setLoading]=useState(true);
  const fetch=useCallback(async()=>{
    const {data}=await supabase.from('banners').select('*').eq('is_active',true).order('sort_order');
    setBanners(data||[]);setLoading(false);
  },[]);
  useEffect(()=>{
    fetch();
    const ch=supabase.channel('banners-rt').on('postgres_changes',{event:'*',schema:'public',table:'banners'},fetch).subscribe();
    return()=>supabase.removeChannel(ch);
  },[fetch]);
  return{banners,loading};
}

export function useProducts(options={}){
  const {categoryId,featured,search,page=1,pageSize=24}=options;
  const [products,setProducts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [total,setTotal]=useState(0);
  const instanceId=useRef(Math.random().toString(36).slice(2)).current;
  const fetch=useCallback(async()=>{
    setLoading(true);
    let q=supabase.from('products')
      .select('*,categories(id,name,slug),product_images(id,image_url,is_default,sort_order)',{count:'exact'})
      .eq('is_active',true).order('created_at',{ascending:false});
    if(categoryId&&categoryId!=='all') q=q.eq('category_id',categoryId);
    if(featured) q=q.eq('is_featured',true);
    if(search&&search.trim().length>1)
      q=q.or(`name.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
    const from=(page-1)*pageSize;
    q=q.range(from,from+pageSize-1);
    const {data,count}=await q;
    const enriched=(data||[]).map(p=>({
      ...p,
      discount:calcDiscount(p.selling_price,p.original_price),
      images:(p.product_images||[]).sort((a,b)=>a.sort_order-b.sort_order),
      primary_image:(()=>{const imgs=(p.product_images||[]).slice().sort((a,b)=>a.sort_order-b.sort_order);return(imgs.find(i=>i.is_default)||imgs[0])?.image_url||null;})(),
    }));
    setProducts(enriched);setTotal(count||0);setLoading(false);
  },[categoryId,featured,search,page,pageSize]);
  useEffect(()=>{
    fetch();
   const ch=supabase.channel(`prods-rt-${instanceId}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'products'},fetch)
      .on('postgres_changes',{event:'*',schema:'public',table:'product_images'},fetch)
      .subscribe();
    return()=>supabase.removeChannel(ch);
  },[fetch]);
  return{products,loading,total,totalPages:Math.ceil(total/pageSize),refetch:fetch};
}

export function useSearch(query,active){
  const [results,setResults]=useState([]);
  const [loading,setLoading]=useState(false);
  const timer=useRef(null);
  useEffect(()=>{
    // Bug fix #4: don't run search queries at all when the search UI isn't active
    // (e.g. checkout/detail/success pages) — avoids needless background Supabase calls.
    if(!active||!query||query.trim().length<2){setResults([]);return;}
    clearTimeout(timer.current);
    timer.current=setTimeout(async()=>{
      setLoading(true);
      const {data}=await supabase.from('products')
        .select('*,categories(name),product_images(id,image_url,is_default,sort_order)')
        .eq('is_active',true)
        .or(`name.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`)
        .limit(40);
      setResults((data||[]).map(p=>({
        ...p,
        discount:calcDiscount(p.selling_price,p.original_price),
        images:(p.product_images||[]).slice().sort((a,b)=>a.sort_order-b.sort_order),
        primary_image:(()=>{const imgs=(p.product_images||[]).slice().sort((a,b)=>a.sort_order-b.sort_order);return(imgs.find(i=>i.is_default)||imgs[0])?.image_url||null;})(),
      })));
      setLoading(false);
    },350);
    return()=>clearTimeout(timer.current);
  },[query,active]);
  return{results,loading};
}
