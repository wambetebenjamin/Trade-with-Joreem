import type { NextConfig } from 'next';
const config: NextConfig = {
  async redirects() { return [
    ...['mentorship','bookstore','about','contact','terms','risk','privacy','login','member'].map((p) => ({source:`/${p}.html`,destination:p==='member'?'/dashboard':`/${p}`,permanent:true})),
    {source:'/index.html',destination:'/',permanent:true},
    {source:'/thank-you.html',destination:'/contact',permanent:true},
    {source:'/404.html',destination:'/',permanent:false}
  ]; }
};
export default config;
