import { badRequest, ok, serverError, withUser } from '@/lib/api';

/** Salva a inscrição de push do navegador do usuário. */
export async function POST(request: Request) {
  const ctx = await withUser();
  if (ctx instanceof Response) return ctx;
  const { user, supabase } = ctx;

  let body: { endpoint?: string; p256dh?: string; auth?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest('Corpo inválido.');
  }
  if (!body.endpoint || !body.p256dh || !body.auth) {
    return badRequest('Inscrição de push incompleta.');
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
    },
    { onConflict: 'endpoint' },
  );
  if (error) return serverError('Não foi possível salvar a inscrição.');
  return ok({ subscribed: true });
}

/** Remove a inscrição (ao desativar as notificações). */
export async function DELETE(request: Request) {
  const ctx = await withUser();
  if (ctx instanceof Response) return ctx;
  const { user, supabase } = ctx;

  let body: { endpoint?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest('Corpo inválido.');
  }
  if (!body.endpoint) return badRequest('Endpoint ausente.');

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', body.endpoint);
  return ok({ unsubscribed: true });
}
