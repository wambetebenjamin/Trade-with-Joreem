export const plans = [
  { id:'foundation', name:'Foundation', featured:false, blurb:'Build your trading foundations, one clear step at a time.', monthly:49, annual:470, features:['Structured beginner curriculum','Risk and position-sizing essentials','Community study access'] },
  { id:'pro', name:'Pro Trader', blurb:'A complete system for traders ready to build consistency.', monthly:59, annual:399, featured:true, features:['Full curriculum and replays','Weekly trade reviews','Monthly group Q&A','Community access','Digital book library'] },
  { id:'elite', name:'Elite Desk', featured:false, blurb:'More direct coaching for traders ready for focused feedback.', monthly:119, annual:999, features:['Everything in Pro','Personal coaching sessions','Priority trade reviews','Capped cohort access'] }
] as const;
export const books = [
  { id:'forex-mastery', title:'Forex Mastery', desc:'A practical guide to market structure, liquidity and disciplined execution.', price:59, kind:'physical', image:'/assets/books/forex-mastery.jpg' },
  { id:'crypto-signals', title:'Crypto Signals Handbook', desc:'Understand crypto market structure and risk before taking a position.', price:29, kind:'digital', image:'/assets/books/crypto-signals.jpg' },
  { id:'trading-psychology', title:'Trading Psychology', desc:'Build routines that help you make steadier decisions under pressure.', price:49, kind:'physical', image:'/assets/books/psychology.jpg' },
  { id:'stocks-from-zero', title:'Stocks from Zero', desc:'A straightforward introduction to stocks, markets and risk.', price:25, kind:'digital', image:'/assets/books/stocks-from-zero.jpg' },
  { id:'bundle', title:'The Complete Library', desc:'All four books: digital titles plus print editions of Forex Mastery and Trading Psychology.', price:99, kind:'bundle', image:'/assets/books/forex-mastery.jpg' }
] as const;
export const checkoutProducts = [...plans.flatMap(p=>[
 {sku:`${p.id}-monthly`,name:`${p.name} · Monthly`,amount:p.monthly,mode:'subscription' as const},
 {sku:`${p.id}-annual`,name:`${p.name} · Annual`,amount:p.annual,mode:'subscription' as const}
]), ...books.map(b=>({sku:b.id,name:b.title,amount:b.price,mode:'payment' as const}))];
