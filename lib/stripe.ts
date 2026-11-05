import 'server-only';
import Stripe from 'stripe';
export function stripeClient(){const key=process.env.STRIPE_SECRET_KEY;if(!key)throw new Error('Stripe is not configured. Add a test-mode STRIPE_SECRET_KEY.');if(/^(sk|rk)_live_/.test(key)&&process.env.ALLOW_LIVE_PAYMENTS!=='true')throw new Error('Live payments are disabled. Set ALLOW_LIVE_PAYMENTS=true only after launch approval.');return new Stripe(key);}
export function stripePriceId(sku:string){const key='STRIPE_PRICE_'+sku.toUpperCase().replace(/-/g,'_');const id=process.env[key];if(!id)throw new Error(`Missing Stripe Price ID: ${key}`);return id;}
