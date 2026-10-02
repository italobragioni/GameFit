import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getBatches } from '@/lib/data';
import { AppShell } from '@/components/app-shell';
import { batchStatusEmoji, batchStatusLabel } from '@/lib/status';

export const dynamic = 'force-dynamic';

export default async function BatchesPage() {
  const batches = await getBatches();
  return (
    <AppShell title="Meus lotes" backHref="/">
      <Link
        href="/batches/new"
        className="mb-5 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-lg font-semibold text-white"
      >
        <Plus size={22} aria-hidden /> Novo lote
      </Link>

      {batches.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-slate-500">
          Você ainda não criou nenhum lote.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {batches.map((b) => {
            const done = b.completed_videos + b.failed_videos;
            return (
              <li key={b.id}>
                <Link
                  href={`/batches/${b.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 hover:border-brand"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-900">{b.name}</p>
                    <p className="text-sm text-slate-500">
                      {b.total_videos} vídeos
                      {b.failed_videos > 0 ? ` · ${b.failed_videos} falharam` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-right text-sm font-semibold text-slate-700">
                    <span aria-hidden>{batchStatusEmoji[b.status]}</span>{' '}
                    {b.status === 'processing'
                      ? `${done}/${b.total_videos}`
                      : batchStatusLabel[b.status]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
