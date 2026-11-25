'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PlanCheckout } from '@/components/checkout';
import { getSheetRows, type SheetRow } from '@/lib/google-script';
type PlanRow=SheetRow&{id:string;name:string;blurb:string;monthly:number|string;annual:number|string;featured?:boolean|string;active?:boolean|string;feature_1?:string;feature_2?:string;feature_3?:string;feature_4?:string;feature_5?:string;feature_6?:string};
const enabled=(value:unknown)=>value===undefined||value===true||String(value).toLowerCase()==='true';
export function SheetPlans({variant='detail'}:{variant?:'home'|'detail'}){
 const[rows,setRows]=useState<PlanRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let live=true;getSheetRows<PlanRow>('Plans').then(data=>{if(live)setRows(data.filter(row=>enabled(row.active)))}).catch(cause=>{if(live)setError(cause instanceof Error?cause.message:'Could not load mentorship plans.')}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
 if(loading)return <p className="muted" role="status">Loading plans from Google Sheets…</p>;
 if(error)return <p className="notice" role="status">The mentorship catalog is unavailable: {error}</p>;
 if(!rows.length)return <p className="muted">No active mentorship plans are listed in the Plans sheet.</p>;
 return <div className="grid">{rows.map(plan=>{const features=[plan.feature_1,plan.feature_2,plan.feature_3,plan.feature_4,plan.feature_5,plan.feature_6].filter((value):value is string=>typeof value==='string'&&value.trim().length>0);const monthly=Number(plan.monthly),annual=Number(plan.annual);return <article className={`open-panel plan ${enabled(plan.featured)?'featured':''}`} id={plan.id} key={plan.id}><span className="tag">{plan.name.toUpperCase()}</span><h2>{plan.name}</h2><p className="muted">{plan.blurb}</p><div className="plan-price">${monthly}<small> / month</small></div><p>Annual option: <b>${annual}/year</b></p><ul>{features.map((feature,index)=><li key={`${plan.id}-${index}`}>{feature}</li>)}</ul>{variant==='home'?<Link className="button" href={`/mentorship#${plan.id}`}>See plan details</Link>:<><div className="actions"><PlanCheckout sku={`${plan.id}-monthly`} title={`${plan.name} · Monthly`} price={monthly} label="Choose monthly"/><PlanCheckout sku={`${plan.id}-annual`} title={`${plan.name} · Annual`} price={annual} label="Choose annual"/></div><small className="muted">START20 applies to eligible first-month subscriptions only. Final tax and cancellation terms appear in Checkout.</small></>}</article>})}</div>;
}
