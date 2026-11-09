'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { books, plans } from '@/lib/catalog';
type CartItem = { sku: string; quantity: number; title?: string; price?: number };
type CartContext = { items: CartItem[]; add: (sku:string, detail?:{title?:string;price?:number})=>void; remove:(sku:string)=>void; clear:()=>void };
const Context = createContext<CartContext|null>(null);
export function CartProvider({children}:{children:React.ReactNode}) {
  const [items,setItems]=useState<CartItem[]>([]),[ready,setReady]=useState(false);
  useEffect(()=>{try{const parsed:unknown=JSON.parse(localStorage.getItem('twj_cart_v2')||'[]');if(Array.isArray(parsed))setItems(parsed.filter((x):x is CartItem=>x&&typeof x.sku==='string'&&Number.isInteger(x.quantity)&&x.quantity>0&&(x.price===undefined||typeof x.price==='number'&&Number.isFinite(x.price))&&(x.title===undefined||typeof x.title==='string')))}catch{}setReady(true)},[]);
  useEffect(()=>{if(ready)try{localStorage.setItem('twj_cart_v2',JSON.stringify(items))}catch{}},[items,ready]);
  const value=useMemo(()=>({items,add:(sku:string,detail?:{title?:string;price?:number})=>setItems(xs=>{const found=xs.find(x=>x.sku===sku);return found?xs.map(x=>x.sku===sku?{...x,...detail,quantity:Math.min(5,x.quantity+1)}:x):[...xs,{sku,quantity:1,...detail}]}),remove:(sku:string)=>setItems(xs=>xs.filter(x=>x.sku!==sku)),clear:()=>setItems([])}),[items]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCart(){const value=useContext(Context);if(!value)throw Error('CartProvider missing');return value}
export function CartCount(){const{items}=useCart();const count=items.reduce((n,x)=>n+x.quantity,0);return <Link className="button small secondary" href="/cart">Cart{count?` (${count})`:''}</Link>}
export function AddToCart({sku,label='Add to cart',title,price}:{sku:string;label?:string;title?:string;price?:number}){const{add}=useCart();const[done,setDone]=useState(false);return <button className="button" onClick={()=>{add(sku,{title,price});setDone(true);setTimeout(()=>setDone(false),1800)}}>{done?'Added to cart':label}</button>}
const products=[...books,...plans.flatMap(p=>[{id:`${p.id}-monthly`,title:`${p.name} · Monthly`,price:p.monthly},{id:`${p.id}-annual`,title:`${p.name} · Annual`,price:p.annual}])];
export function CartContents(){const{items,remove,clear}=useCart();const[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[email,setEmail]=useState('');const total=items.reduce((sum,item)=>sum+(item.price??products.find(p=>p.id===item.sku)?.price??0)*item.quantity,0);
  async function checkout(){setMessage('');setBusy(true);try{const response=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,items:items.map(({sku,quantity})=>({sku,quantity})),promoCode:(document.getElementById('promo') as HTMLInputElement|null)?.value.trim()})});const data=await response.json();if(!response.ok)throw Error(data.error||'Checkout unavailable.');if(typeof data.url!=='string')throw Error('Checkout did not return a secure payment link.');location.href=data.url}catch(cause){setMessage(cause instanceof Error?cause.message:'Could not start checkout.')}finally{setBusy(false)}}
  return <div className="open-panel">{!items.length?<p className="muted">Your cart is empty. <Link href="/bookstore">Browse the bookstore</Link> or choose a mentorship plan.</p>:<>
    <div className="download-list">{items.map(item=>{const product=products.find(p=>p.id===item.sku);return <div className="open-panel" key={item.sku}><div style={{display:'flex',justifyContent:'space-between',gap:14}}><div><b>{item.title||product?.title||item.sku}</b><div className="muted">Qty {item.quantity} · ${((item.price??product?.price)??0)*item.quantity}</div></div><button className="button secondary small" onClick={()=>remove(item.sku)}>Remove</button></div></div>})}</div>
    <p className="plan-price">${total.toFixed(2)} <small>before tax</small></p><label>Email for receipt<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254} style={{display:'block',width:'100%',marginTop:6}}/></label>
    <label className="muted">Promo code <input id="promo" placeholder="START20" style={{display:'block',background:'#091321',border:'1px solid #35445a',padding:12,color:'white',marginTop:6}} /></label><p className="notice">START20: 20% off eligible first-month subscriptions when configured in Stripe. Elite, annual plans and books are excluded.</p>
    <button className="button" disabled={busy||!email} onClick={checkout}>{busy?'Opening secure checkout…':'Continue to secure checkout'}</button><button className="button secondary" style={{marginLeft:10}} onClick={clear}>Clear cart</button>{message&&<p role="alert" className="error">{message}</p>}
  </> }</div>
}
