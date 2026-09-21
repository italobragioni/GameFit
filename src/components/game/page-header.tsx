export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="pb-1">
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      <h1 className="text-2xl font-extrabold">{title}</h1>
    </header>
  );
}
