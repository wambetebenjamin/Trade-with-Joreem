'use client';
/* eslint-disable @next/next/no-img-element -- Sheet image URLs are managed by the catalog editor and may use arbitrary HTTPS hosts. */
import { useEffect, useState } from 'react';
import { AddToCart } from '@/components/cart';
import { getSheetRows, type SheetRow } from '@/lib/google-script';
type BookRow = SheetRow & { id:string; title:string; desc:string; price:number; kind:string; image:string; active?:boolean };
export function SheetBookCatalog({limit}:{limit?:number}){
  const [rows,setRows]=useState<BookRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{let alive=true;getSheetRows<BookRow>('Books').then((data)=>{if(alive)setRows(data.filter(row=>row.active===undefined||row.active===true||String(row.active).toLowerCase()==='true'))}).catch(cause=>{if(alive)setError(cause instanceof Error?cause.message:'Could not load the sheet catalog.')}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[]);
  if(loading)return <p className="muted" role="status">Loading the Google Sheets book catalog…</p>;
  if(error)return <p className="notice" role="status">The live catalog is not available: {error}</p>;
  if(!rows.length)return <p className="muted">No active books are listed in the connected Books sheet yet.</p>;
  return <div className="grid two">{(limit?rows.slice(0,limit):rows).map(book=><article className="book open-panel" key={book.id}><img src={book.image} alt={`${book.title} book cover`} width="180" height="240"/><div><span className="pill">{book.kind==='digital'?'Digital':book.kind==='bundle'?'Digital + print':'Print'}</span><h2>{book.title}</h2><p className="muted">{book.desc}</p><p><b>${Number(book.price).toFixed(2)} USD</b></p><AddToCart sku={book.id} title={book.title} price={Number(book.price)}/></div></article>)}</div>;
}
