'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Batch, VideoItem } from '@editor/shared';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card, Spinner } from '@/components/ui/primitives';
import {
  batchStatusLabel,
  isBatchActive,
  videoStatusEmoji,
  videoStatusLabel,
} from '@/lib/status';

interface Payload {
  batch: Batch;
  videos: VideoItem[];
}

export default function BatchDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const [retrying, setRetrying] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/batches/${params.id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Não foi possível carregar o lote.');
      const payload = (await res.json()) as Payload;
      setData(payload);
      setError(null);
      // reagenda enquanto houver atividade
      if (isBatchActive(payload.batch.status)) {
        timer.current = setTimeout(load, 3000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
    }
  }, [params.id]);

  useEffect(() => {
    void load();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  async function retry(videoId: string) {
    setRetrying(videoId);
    try {
      await fetch(`/api/videos/${videoId}/retry`, { method: 'POST' });
      if (timer.current) clearTimeout(timer.current);
      await load();
    } finally {
      setRetrying(null);
    }
  }

  if (error && !data) {
    return (
      <AppShell title="Lote" backHref="/batches">
        <p className="text-center text-red-600" role="alert">{error}</p>
      </AppShell>
    );
  }
  if (!data) {
    return (
      <AppShell title="Lote" backHref="/batches">
        <div className="flex justify-center py-10"><Spinner className="h-8 w-8 text-brand" /></div>
      </AppShell>
    );
  }

  const { batch, videos } = data;
  const done = batch.completed_videos + batch.failed_videos;
  const pct = batch.total_videos > 0 ? Math.round((done / batch.total_videos) * 100) : 0;

  return (
    <AppShell title={batch.name} backHref="/batches">
      <Card className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-lg font-semibold text-slate-900">
            {batch.completed_videos} de {batch.total_videos} concluídos
          </span>
          <span className="text-sm font-semibold text-slate-600">{batchStatusLabel[batch.status]}</span>
        </div>
        <div
          className="h-4 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso do lote"
        >
          <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
        {batch.failed_videos > 0 && (
          <p className="mt-2 text-sm font-medium text-red-600">{batch.failed_videos} falharam</p>
        )}
        {isBatchActive(batch.status) && (
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
            <Spinner className="h-4 w-4 text-brand" /> Processando em segundo plano. Você pode fechar o app.
          </p>
        )}
      </Card>

      <ul className="flex flex-col gap-3">
        {videos.map((v) => (
          <li key={v.id}>
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    video-{String(v.position).padStart(3, '0')}
                  </p>
                  <p className="text-sm text-slate-500">
                    <span aria-hidden>{videoStatusEmoji[v.status]}</span> {videoStatusLabel[v.status]}
                    {v.status === 'processing' && v.progress > 0 ? ` · ${v.progress}%` : ''}
                  </p>
                </div>
                {v.status === 'failed' && (
                  <Button
                    size="md"
                    variant="secondary"
                    onClick={() => retry(v.id)}
                    disabled={retrying === v.id}
                  >
                    {retrying === v.id ? <Spinner /> : null} Tentar novamente
                  </Button>
                )}
              </div>

              {v.status === 'failed' && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setOpenDetails((o) => ({ ...o, [v.id]: !o[v.id] }))}
                    className="text-sm font-semibold text-slate-500 underline"
                    aria-expanded={!!openDetails[v.id]}
                  >
                    {openDetails[v.id] ? 'Ocultar detalhes' : 'Ver detalhes'}
                  </button>
                  {openDetails[v.id] && (
                    <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 break-words">
                      {v.error_message || 'Sem detalhes adicionais.'}
                    </p>
                  )}
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
