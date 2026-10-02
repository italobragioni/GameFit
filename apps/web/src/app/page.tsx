import Link from 'next/link';
import { FolderOpen, Layers, Plus, Settings, Video } from 'lucide-react';
import { requireUser } from '@/lib/data';
import { SignOutButton } from '@/components/sign-out-button';

const tiles = [
  { href: '/batches/new', label: 'Novo lote', icon: Plus, primary: true },
  { href: '/batches', label: 'Meus lotes', icon: Layers },
  { href: '/templates', label: 'Templates', icon: FolderOpen },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export default async function HomePage() {
  await requireUser();
  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4">
      <header className="safe-top flex items-center gap-3 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
          <Video size={22} aria-hidden />
        </div>
        <h1 className="flex-1 text-2xl font-bold text-slate-900">Editor de Vídeos</h1>
        <SignOutButton />
      </header>

      <nav aria-label="Menu principal" className="grid grid-cols-1 gap-4 pt-2">
        {tiles.map(({ href, label, icon: Icon, primary }) => (
          <Link
            key={href}
            href={href}
            className={[
              'flex min-h-20 items-center gap-4 rounded-3xl border-2 px-6 text-xl font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40',
              primary
                ? 'border-brand bg-brand text-white'
                : 'border-slate-200 bg-white text-slate-900 hover:border-brand',
            ].join(' ')}
          >
            <Icon size={28} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <p className="mt-10 text-center text-sm text-slate-400">
        Dica: adicione este app à tela inicial do celular para abrir como um aplicativo.
      </p>
    </main>
  );
}
