'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/primitives';
import { currentSubscription, disablePush, enablePush, isPushSupported } from '@/lib/push';

export function PushToggle() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const ok = isPushSupported();
    setSupported(ok);
    if (ok) void currentSubscription().then((s) => setEnabled(!!s));
  }, []);

  if (supported === null) return null;

  if (!supported) {
    return (
      <p className="text-sm text-slate-500">
        Seu navegador não suporta notificações. No iPhone, adicione o app à tela inicial primeiro
        (iOS 16.4+).
      </p>
    );
  }

  async function toggle() {
    setBusy(true);
    setMsg(null);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
        setMsg('Notificações desativadas.');
      } else {
        const r = await enablePush();
        if (r.ok) {
          setEnabled(true);
          setMsg('Notificações ativadas! Você será avisado quando o lote terminar.');
        } else {
          setMsg(r.error ?? 'Não foi possível ativar.');
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant={enabled ? 'secondary' : 'primary'} onClick={toggle} disabled={busy}>
        {busy ? <Spinner /> : <Bell size={20} aria-hidden />}
        {enabled ? 'Desativar notificações' : 'Ativar notificações'}
      </Button>
      {msg && <p className="text-sm text-slate-600" role="status">{msg}</p>}
    </div>
  );
}
