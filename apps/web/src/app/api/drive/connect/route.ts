import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';
import { withUser } from '@/lib/api';

/** Inicia o fluxo OAuth do Google Drive. */
export async function GET() {
  const ctx = await withUser();
  if (ctx instanceof Response) return ctx;

  // state anti-CSRF guardado em cookie httpOnly e verificado no callback
  const state = randomBytes(16).toString('hex');
  const res = NextResponse.redirect(getAuthUrl(state));
  res.cookies.set('drive_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
