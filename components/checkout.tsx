'use client';
import {useCart} from './cart';
export function PlanCheckout({sku,label='Choose plan'}:{sku:string;label?:string}){const{add}=useCart();return <button className="button" onClick={()=>{add(sku);location.href='/cart'}}>{label}</button>}
