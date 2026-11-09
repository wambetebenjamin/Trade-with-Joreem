import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripeClient, stripePriceId } from '@/lib/stripe';
import { checkoutProducts } from '@/lib/catalog';
import { isSameOrigin } from '@/lib/request-security';

const schema = z.object({ email: z.email().max(254), items: z.array(z.object({ sku: z.string().min(1).max(80), quantity: z.number().int().min(1).max(5) })).min(1).max(10), promoCode: z.string().optional() });
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Request rejected.' }, { status: 403 });
  const raw = await req.text(); if (raw.length > 8192) return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
  let body: unknown; try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid cart.' }, { status: 400 }); }
  const parsed = schema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email and cart.' }, { status: 400 });
  const mapped = parsed.data.items.map((item) => ({ item: checkoutProducts.find((product) => product.sku === item.sku), quantity: item.quantity }));
  if (mapped.some((entry) => !entry.item)) return NextResponse.json({ error: 'One or more cart items are unavailable.' }, { status: 400 });
  const modes = new Set(mapped.map((entry) => entry.item!.mode));
  if (modes.size !== 1 || (mapped.some((entry) => entry.item!.mode === 'subscription') && mapped.length !== 1)) return NextResponse.json({ error: 'Memberships and books must be checked out separately.' }, { status: 400 });
  const mode = [...modes][0];
  if (mode === 'subscription' && process.env.MEMBERSHIP_DELIVERY_ENABLED !== 'true') return NextResponse.json({ error: 'Membership sales are paused until access and delivery are ready.' }, { status: 503 });
  const needsShipping = mapped.some(({ item }) => ['forex-mastery', 'trading-psychology', 'bundle'].includes(item!.sku));
  if (needsShipping && (process.env.PRINT_FULFILLMENT_ENABLED !== 'true' || !process.env.STRIPE_SHIPPING_RATE_ID)) return NextResponse.json({ error: 'Print fulfilment and shipping are not enabled yet.' }, { status: 503 });
  const hasDigital = mapped.some(({ item }) => ['crypto-signals', 'stocks-from-zero', 'bundle'].includes(item!.sku));
  if (hasDigital && process.env.DIGITAL_DELIVERY_ENABLED !== 'true') return NextResponse.json({ error: 'Digital delivery is not enabled yet.' }, { status: 503 });
  const promo = parsed.data.promoCode?.trim().toUpperCase();
  if (promo && promo !== 'START20') return NextResponse.json({ error: 'That promo code is not valid.' }, { status: 400 });
  const eligible = promo === 'START20' && mode === 'subscription' && mapped.length === 1 && mapped[0].item!.sku.endsWith('-monthly') && !mapped[0].item!.sku.startsWith('elite');
  if (promo && !eligible) return NextResponse.json({ error: 'START20 is for eligible monthly Foundation and Pro subscriptions only; Elite, annual plans, and books are excluded.' }, { status: 400 });
  if (eligible && !process.env.STRIPE_START20_COUPON_ID) return NextResponse.json({ error: 'START20 is not enabled in Stripe yet.' }, { status: 503 });
  try {
    const origin = req.nextUrl.origin;
    const session = await stripeClient().checkout.sessions.create({
      mode, line_items: mapped.map(({ item, quantity }) => ({ price: stripePriceId(item!.sku), quantity })), customer_email: parsed.data.email,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/cancel`, allow_promotion_codes: false,
      ...(process.env.STRIPE_AUTOMATIC_TAX === 'true' ? { automatic_tax: { enabled: true } } : {}),
      ...(eligible ? { discounts: [{ coupon: process.env.STRIPE_START20_COUPON_ID! }] } : {}),
      metadata: { customer_email: parsed.data.email, sku_list: mapped.map(({ item, quantity }) => `${item!.sku}:${quantity}`).join(','), promo_code: eligible ? 'START20' : '' },
      ...(mode === 'subscription' ? { subscription_data: { metadata: { customer_email: parsed.data.email, sku: mapped[0].item!.sku } } } : {}),
      ...(needsShipping ? { shipping_address_collection: { allowed_countries: ['US','CA','GB','KE','UG','TZ','RW','NG','ZA','GH'] }, shipping_options: [{ shipping_rate: process.env.STRIPE_SHIPPING_RATE_ID! }] } : {}),
    });
    return NextResponse.json({ url: session.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Checkout is temporarily unavailable.' }, { status: 503 }); }
}
