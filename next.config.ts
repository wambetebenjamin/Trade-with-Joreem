import type { NextConfig } from 'next';
const securityHeaders=[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
  {key:'Content-Security-Policy',value:"frame-ancestors 'none'"},
  {key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'},
];
const config:NextConfig={
  async headers(){return [{source:'/:path*',headers:securityHeaders}]},
  async rewrites(){return {beforeFiles:[
    {source:'/',destination:'/legacy-site/index.html'},
    ...['about','bookstore','contact','mentorship','member','login','privacy','risk','terms','thank-you'].map((p)=>({source:`/${p}`,destination:`/legacy-site/${p}.html`})),
  ]}},
  async redirects(){return [
    ...['mentorship','bookstore','about','contact','terms','risk','privacy','login','member'].map((p)=>({source:`/${p}.html`,destination:p==='member'?'/dashboard':`/${p}`,permanent:true})),
    {source:'/index.html',destination:'/',permanent:true},{source:'/thank-you.html',destination:'/contact',permanent:true},{source:'/404.html',destination:'/',permanent:false}
  ]}
};
export default config;
