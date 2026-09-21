import { PageHeader } from "@/components/game/page-header";

export default function TermsPage() {
  return (
    <div className="px-4 pt-6">
      <PageHeader title="Termos de uso" />
      <div className="mt-4 space-y-3 text-sm text-muted-foreground">
        <p>
          O Projeto Leve é uma ferramenta de bem-estar e gamificação de hábitos. O conteúdo tem
          caráter informativo e motivacional.
        </p>
        <p>
          O app não oferece diagnósticos médicos, prescrição de dietas individualizadas nem promessas
          de perda de peso.
        </p>
        <p>
          A assinatura Premium é cobrada mensalmente (R$19/mês) e pode ser cancelada a qualquer momento
          pelo próprio usuário.
        </p>
        <p>Consulte um profissional de saúde antes de iniciar mudanças significativas na sua rotina.</p>
      </div>
    </div>
  );
}
