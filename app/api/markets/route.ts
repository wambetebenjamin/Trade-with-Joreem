import {NextResponse} from 'next/server';
export const revalidate=300;
async function getJson(url:string){const r=await fetch(url,{next:{revalidate:300},headers:{'User-Agent':'TradeWithJoreem/1.0'}});if(!r.ok)throw new Error('Quote provider unavailable');return r.json()}
export async function GET(){const asOf=new Date().toISOString();const quotes=[] as {symbol:string;label:string;price:string;source:string}[];const out=await Promise.allSettled([
 getJson('https://api.frankfurter.app/latest?from=EUR&to=USD'),getJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),getJson('https://api.gold-api.com/price/XAU')]);
 if(out[0].status==='fulfilled'&&out[0].value.rates?.USD)quotes.push({symbol:'EURUSD',label:'EUR / USD',price:`$${Number(out[0].value.rates.USD).toFixed(4)}`,source:'Frankfurter reference rate'});
 if(out[1].status==='fulfilled'&&out[1].value.bitcoin?.usd)quotes.push({symbol:'BTCUSD',label:'BTC / USD',price:`$${Number(out[1].value.bitcoin.usd).toLocaleString('en-US',{maximumFractionDigits:0})}`,source:'CoinGecko spot reference'});
 const gold=out[2];if(gold.status==='fulfilled'){const perOunce=Number(gold.value.price)||Number(gold.value.price_gram_24k)*31.1034768;if(Number.isFinite(perOunce)&&perOunce>0)quotes.push({symbol:'XAUUSD',label:'Gold / USD per troy oz',price:`$${perOunce.toLocaleString('en-US',{maximumFractionDigits:2})}`,source:'Gold API reference'})}
 return NextResponse.json({quotes,asOf},{headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=600'}})}
