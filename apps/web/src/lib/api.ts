import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export interface AuthedContext {
  user: User;
  supabase: ReturnType<typeof createClient>;
}

/** Resolve o usuário logado em um Route Handler, ou devolve 401. */
export async function withUser(): Promise<AuthedContext | NextResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  return { user, supabase };
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function ok<T>(data: T) {
  return NextResponse.json(data);
}
