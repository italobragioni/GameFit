'use client';

import { useState } from 'react';
import { Mail, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, Input, Label, Spinner } from '@/components/ui/primitives';

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) setError('Não foi possível enviar o link. Confira o e-mail e tente de novo.');
    else setSent(true);
  }

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) setError('Login com Google indisponível. Use o e-mail.');
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand text-white">
          <Video size={32} aria-hidden />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Editor de Vídeos</h1>
        <p className="text-slate-600">Entre para começar a editar seus vídeos em fila.</p>
      </div>

      <Card className="flex flex-col gap-4">
        {sent ? (
          <div className="text-center" role="status">
            <p className="text-lg font-semibold text-slate-900">Verifique seu e-mail ✉️</p>
            <p className="mt-2 text-slate-600">
              Enviamos um link de acesso para <strong>{email}</strong>. Toque no link para entrar.
            </p>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="email">Seu e-mail</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner /> : <Mail size={20} aria-hidden />}
              Entrar com e-mail
            </Button>
          </form>
        )}

        {!sent && (
          <>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              ou
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <Button type="button" variant="secondary" onClick={signInWithGoogle}>
              Entrar com Google
            </Button>
          </>
        )}

        {error && (
          <p className="text-center text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
      </Card>

      <p className="text-center text-xs text-slate-400">
        Ao entrar, você concorda em usar a ferramenta apenas com conteúdo que você tem direito de
        editar.
      </p>
    </main>
  );
}
