'use client';
import {useCart} from './cart';
export function PlanCheckout({sku,label='Choose plan',title,price}:{sku:string;label?:string;title?:string;price?:number}){const{add}=useCart();return <button className="button" onClick={()=>{add(sku,{title,price});location.href='/cart'}}>{label}</button>}
