import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-secondary/30">
      <header className="container flex h-16 items-center">
        <Link href="/" className="text-lg font-extrabold tracking-tight">
          Projeto Leve
        </Link>
      </header>
      <main className="container flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
