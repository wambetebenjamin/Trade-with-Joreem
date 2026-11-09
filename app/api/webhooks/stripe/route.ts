import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripeClient } from '@/lib/stripe';
import { writeVerifiedSheetRows } from '@/lib/google-script-server';
export const runtime='nodejs';
export async function POST(request:NextRequest){
  const signature=request.headers.get('stripe-signature'), secret=process.env.STRIPE_WEBHOOK_SECRET;
  if(!signature||!secret)return NextResponse.json({error:'Stripe webhook is not configured.'},{status:503});
  let event:Stripe.Event;
  try{event=stripeClient().webhooks.constructEvent(await request.text(),signature,secret)}catch{return NextResponse.json({error:'Invalid Stripe webhook signature.'},{status:400})}
  const rows:Record<string,unknown>[]=[{event_id:event.id,event_type:event.type,event_created_at:new Date(event.created*1000).toISOString(),received_at:new Date().toISOString()}];
  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
    const session=event.data.object as Stripe.Checkout.Session;
    const email=session.customer_details?.email||session.customer_email||session.metadata?.customer_email||'';
    const skuList=String(session.metadata?.sku_list||'');
    if(!email||!session.id||!skuList)return NextResponse.json({error:'Checkout event is missing order metadata.'},{status:400});
    rows[0]={...rows[0],object_id:session.id,customer_email:email,sku_list:skuList,payment_status:session.payment_status,amount_total:session.amount_total||0,currency:session.currency||'',stripe_customer_id:typeof session.customer==='string'?session.customer:'',stripe_subscription_id:typeof session.subscription==='string'?session.subscription:'',promo_code:session.metadata?.promo_code||'',mode:session.mode||''};
  }else if(event.type==='checkout.session.async_payment_failed'){
    const session=event.data.object as Stripe.Checkout.Session;rows[0]={...rows[0],object_id:session.id,payment_status:'failed',customer_email:session.customer_details?.email||session.customer_email||''};
  }else if(event.type==='customer.subscription.updated'||event.type==='customer.subscription.deleted'){
    const subscription=event.data.object as Stripe.Subscription;rows[0]={...rows[0],object_id:subscription.id,customer_email:subscription.metadata.customer_email||'',subscription_status:subscription.status,plan_sku:subscription.metadata.sku||''};
  }else if(event.type==='charge.refunded'){
    const charge=event.data.object as Stripe.Charge;rows[0]={...rows[0],object_id:charge.id,payment_intent_id:typeof charge.payment_intent==='string'?charge.payment_intent:'',refunded:charge.refunded,amount_refunded:charge.amount_refunded};
  }
  try{await writeVerifiedSheetRows('StripeEvents',rows);return NextResponse.json({received:true})}
  catch(error){console.error('Google Sheets Stripe event forwarding failed',error);return NextResponse.json({error:'Verified event could not be recorded. Stripe may retry.'},{status:503})}
}
