import { PageHeader } from "@/components/game/page-header";

export default function PrivacyPage() {
  return (
    <div className="px-4 pt-6">
      <PageHeader title="Privacidade" />
      <div className="mt-4 space-y-3 text-sm text-muted-foreground">
        <p>Seus dados são privados. Cada usuário só acessa suas próprias informações.</p>
        <p>
          Usamos seus registros de missões, check-ins e peso apenas para mostrar seu progresso
          pessoal dentro do app.
        </p>
        <p>Não vendemos seus dados e não criamos rankings públicos com informações sensíveis.</p>
        <p>O GameFit não realiza diagnósticos nem substitui orientação profissional de saúde.</p>
      </div>
    </div>
  );
}
