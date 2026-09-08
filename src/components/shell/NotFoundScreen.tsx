import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { panelButtonClass } from "@/components/ui/iconButton";
import { UI } from "@/lib/i18n/ui";
import { DEFAULT_LOCALE, type Locale } from "@/lib/seo/site";

/**
 * Qualquer endereço que não existe na aplicação (issue #47).
 *
 * Sem esta tela, uma URL digitada errado cairia no 404 padrão do framework — texto técnico,
 * em inglês, fora da identidade do produto. A mensagem é diferente da tela de link de
 * whiteboard inválido de propósito: ali o endereço até tem a forma certa e o documento é
 * que não está disponível; aqui a página nunca existiu.
 *
 * O destino da volta é parâmetro pelo mesmo motivo da tela de link inválido: quem errou o
 * endereço dentro de `/pt` tem que voltar para a home em português, e não trocar de idioma
 * como efeito colateral de um typo.
 */
export function NotFoundScreen({
  home = "/",
  locale = DEFAULT_LOCALE,
}: {
  home?: string;
  locale?: Locale;
}) {
  // Prop e não contexto: esta tela é um componente de servidor, e o provedor de idioma é
  // de cliente. Quem a monta é a rota, que já sabe em que idioma está.
  const ui = UI[locale].notFound;

  return (
    <AppShell>
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
      >
        <h2 className="text-lg text-ink">{ui.title}</h2>

        <Link href={home} className={panelButtonClass}>
          {ui.back}
        </Link>
      </div>
    </AppShell>
  );
}
