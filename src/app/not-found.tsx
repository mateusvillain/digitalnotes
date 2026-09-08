import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { panelButtonClass } from "@/components/ui/iconButton";

/**
 * Qualquer endereço que não existe na aplicação (issue #47).
 *
 * Sem esta tela, uma URL digitada errado cairia no 404 padrão do framework — texto técnico,
 * em inglês, fora da identidade do produto. A mensagem é diferente da tela de link de
 * whiteboard inválido de propósito: ali o endereço até tem a forma certa e o documento é
 * que não está disponível; aqui a página nunca existiu.
 */
export default function NotFound() {
  return (
    <AppShell>
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
      >
        <h2 className="text-lg text-ink">Esta página não existe.</h2>

        <Link href="/" className={panelButtonClass}>
          Voltar para a página inicial
        </Link>
      </div>
    </AppShell>
  );
}
