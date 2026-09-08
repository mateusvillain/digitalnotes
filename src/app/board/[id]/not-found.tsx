import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";

/**
 * A tela de um link de whiteboard que não abre (issue #47).
 *
 * Uma mensagem só, igual para todos os motivos: não existe, foi removido, o identificador
 * está malformado. A diferença entre eles não ajuda quem está lendo, e contá-la deixaria
 * qualquer pessoa descobrir quais boards existem testando links — o mesmo motivo pelo qual
 * o backend responde um `404` idêntico em todos os casos (#45).
 *
 * Nada do que está salvo localmente é carregado aqui: o conteúdo local e o de um link são
 * independentes, e mostrar o rascunho de quem clicou faria parecer que o link abriu.
 */
export default function BoardNotFound() {
  return (
    <AppShell>
      <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg text-ink">
            Este whiteboard não existe ou não está mais disponível.
          </h2>
          <p className="text-sm text-ink-muted">
            Confira se o link foi copiado por inteiro, ou comece um quadro novo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/?board=novo"
            className="rounded-control border border-border bg-surface px-4 py-2 text-sm text-ink shadow-control transition-colors hover:bg-canvas"
          >
            Criar um novo whiteboard
          </Link>
          <Link
            href="/"
            className="rounded-control px-3 py-2 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
