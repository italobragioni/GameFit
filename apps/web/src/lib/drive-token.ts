import { decrypt, encrypt } from '@/lib/crypto';
import { refreshAccessToken } from '@/lib/google';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Devolve um access token válido do Google Drive para o usuário, renovando-o
 * automaticamente (e persistindo) quando estiver expirado.
 * Retorna null se o usuário não tem Drive conectado.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const service = createServiceClient();
  const { data } = await service
    .from('drive_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return null;

  const now = Date.now();
  // margem de 60s para evitar usar um token prestes a expirar
  if (data.expiry && data.expiry - 60_000 > now) {
    return decrypt(data.access_token_enc);
  }

  // precisa renovar
  const refreshToken = decrypt(data.refresh_token_enc);
  const refreshed = await refreshAccessToken(refreshToken);
  const newExpiry = now + refreshed.expires_in * 1000;
  await service
    .from('drive_connections')
    .update({
      access_token_enc: encrypt(refreshed.access_token),
      expiry: newExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  return refreshed.access_token;
}
