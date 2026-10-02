import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { exchangeCode, getUserEmail } from '@/lib/google';
import { encrypt } from '@/lib/crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { appUrl } from '@/lib/utils';

/** Callback do OAuth do Google Drive: troca o código e guarda os tokens. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const base = appUrl();

  const expectedState = cookies().get('drive_oauth_state')?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${base}/settings?drive=error`);
  }

  // identifica o usuário logado
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/login`);

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      // sem refresh token não conseguimos processar em segundo plano
      return NextResponse.redirect(`${base}/settings?drive=norefresh`);
    }
    const email = await getUserEmail(tokens.access_token);
    const expiry = Date.now() + tokens.expires_in * 1000;

    const service = createServiceClient();
    const { error } = await service.from('drive_connections').upsert(
      {
        user_id: user.id,
        access_token_enc: encrypt(tokens.access_token),
        refresh_token_enc: encrypt(tokens.refresh_token),
        expiry,
        email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) throw error;

    const res = NextResponse.redirect(`${base}/settings?drive=connected`);
    res.cookies.delete('drive_oauth_state');
    return res;
  } catch {
    return NextResponse.redirect(`${base}/settings?drive=error`);
  }
}
