import type {Metadata} from 'next';import {CartContents} from '@/components/cart';
export const metadata:Metadata={title:'Your cart',robots:{index:false,follow:false}};
export default function Cart(){return <section className="section shell"><div className="section-head"><span className="eyebrow">Secure checkout</span><h1>Your cart</h1><p className="muted">Review your selection, then continue to Stripe Checkout.</p></div><CartContents/></section>}
