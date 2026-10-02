import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente com service_role: ignora RLS. SOMENTE no servidor.
 * Usado, por exemplo, para gravar os tokens do Google Drive criptografados.
 * NUNCA importe este arquivo em componentes client.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
