'use client';

import { FormEvent, useEffect, useState } from 'react';
import { authenticate, readCurrentUser } from '../auth.api';
import type { User } from '../types';
import { Workspace } from '../../dashboard/components/workspace';

type Mode = 'login' | 'register';
export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('register'); const [user, setUser] = useState<User | null>(null); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => { readCurrentUser().then(setUser).catch(() => undefined); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setMessage(''); try { setUser(await authenticate(mode, Object.fromEntries(new FormData(event.currentTarget).entries()))); } catch (error) { setMessage(error instanceof Error ? error.message : 'Connection failed. Is the API running?'); } finally { setLoading(false); } }
  if (user) return <Workspace user={user} onSignOut={() => setUser(null)} />;
  return <section className="shell"><div className="hero"><div className="brand"><span className="brand-mark">M</span> mailflow</div><span className="eyebrow">CAMPAIGNS, THOUGHTFULLY SENT</span><h1>Outreach that puts people first.</h1><p>Build trusted sender relationships with personal, deliberate campaigns—never volume for volume&apos;s sake.</p><div className="trust"><span>✓ Secure sessions</span><span>✓ Private by design</span><span>✓ No Gmail password</span></div></div><div className="auth-card"><div className="tabs"><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setMessage(''); }}>Create account</button><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMessage(''); }}>Sign in</button></div><h2>{mode === 'register' ? 'Start with a secure account' : 'Welcome back'}</h2><p className="subcopy">{mode === 'register' ? 'Create your workspace in a few seconds.' : 'Sign in to continue to your workspace.'}</p><form onSubmit={submit}><label>{mode === 'register' && <>Full name<input name="name" autoComplete="name" required minLength={2} placeholder="Alex Morgan" /></>}</label><label>Email address<input name="email" type="email" autoComplete="email" required placeholder="alex@company.com" /></label><label>Password<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 12 : 1} placeholder={mode === 'register' ? 'At least 12 characters' : 'Your password'} /></label>{message && <div className="message" role="alert">{message}</div>}<button className="button" disabled={loading}>{loading ? 'Please wait…' : mode === 'register' ? 'Create secure account' : 'Sign in securely'}</button></form><p className="fineprint">By continuing, you agree to our responsible sending principles.</p></div></section>;
}
