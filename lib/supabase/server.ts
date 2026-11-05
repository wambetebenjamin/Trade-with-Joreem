import 'server-only';
import {createServerClient,type CookieOptions} from '@supabase/ssr';
import {cookies} from 'next/headers';
export async function createClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return null;const jar=await cookies();return createServerClient(url,key,{cookies:{getAll:()=>jar.getAll(),setAll:(values:{name:string;value:string;options:CookieOptions}[])=>{try{values.forEach(({name,value,options})=>jar.set(name,value,options))}catch{}}}})}
