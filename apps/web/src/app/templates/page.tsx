import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getTemplates } from '@/lib/data';
import { AppShell } from '@/components/app-shell';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const templates = await getTemplates();
  return (
    <AppShell title="Templates" backHref="/">
      <Link
        href="/templates/new"
        className="mb-5 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-lg font-semibold text-white"
      >
        <Plus size={22} aria-hidden /> Novo template
      </Link>

      {templates.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-slate-500">
          Você ainda não tem templates. Crie o primeiro para posicionar seus vídeos.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4">
          {templates.map((t) => (
            <li key={t.id}>
              <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white">
                <div className="relative aspect-[9/16] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.image_url}
                    alt={`Template ${t.name}`}
                    className="h-full w-full object-cover"
                  />
                  <span
                    className="absolute rounded-md border-2 border-brand/80 bg-brand/20"
                    style={{
                      left: `${(t.video_x / 1080) * 100}%`,
                      top: `${(t.video_y / 1920) * 100}%`,
                      width: `${(t.video_width / 1080) * 100}%`,
                      height: `${(t.video_height / 1920) * 100}%`,
                    }}
                    aria-hidden
                  />
                </div>
                <p className="truncate p-3 text-center text-sm font-semibold text-slate-800">
                  {t.name}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
