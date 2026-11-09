import type {Metadata} from 'next';
import {LoginForm} from '@/components/login-form';
export const metadata:Metadata={title:'Request member access',robots:{index:false,follow:false}};
export default function Login(){return <section className="section shell"><div className="section-head"><span className="eyebrow">Member access</span><h1>Request access by email.</h1><p className="muted">Accounts and secure sign-in are not available in the Google Sheets setup. This form records an access request only; do not send passwords or payment details.</p></div><LoginForm/></section>}
