import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/** Cabeçalho simples com botão "voltar" e título grande. */
export function AppShell({
  title,
  backHref,
  children,
  action,
}: {
  title: string;
  backHref?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-4">
      <header className="safe-top sticky top-0 z-10 -mx-4 flex items-center gap-3 bg-slate-50/90 px-4 py-4 backdrop-blur">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Voltar"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-slate-700"
          >
            <ArrowLeft size={22} aria-hidden />
          </Link>
        ) : null}
        <h1 className="flex-1 text-2xl font-bold text-slate-900">{title}</h1>
        {action}
      </header>
      <div className="safe-bottom pb-10 pt-2">{children}</div>
    </div>
  );
}
