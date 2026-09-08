import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { panelButtonClass } from "@/components/ui/iconButton";
import { UI } from "@/lib/i18n/ui";
import { DEFAULT_LOCALE, type Locale } from "@/lib/seo/site";

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
 *
 * O destino da volta é parâmetro porque a mesma tela serve as duas versões de idioma do
 * site: mandar quem está em `/pt/board/...` para a raiz em inglês seria trocar o idioma
 * debaixo de quem só errou um link — e um link que atravessa idiomas é exatamente o que o
 * `hreflang` promete ao buscador que não acontece.
 */
export function BoardNotFoundScreen({
  home = "/",
  locale = DEFAULT_LOCALE,
}: {
  home?: string;
  locale?: Locale;
}) {
  // Prop e não contexto, pela mesma razão da tela de página inexistente: aqui é servidor.
  const ui = UI[locale].boardNotFound;

  return (
    <AppShell>
      {/*
        `alert` porque esta tela chega por troca de rota no cliente: sem ele, quem usa
        leitor de tela continuaria ouvindo o contexto anterior, sem saber que o link falhou.
      */}
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-lg text-ink">{ui.title}</h2>
          <p className="text-sm text-ink-muted">{ui.hint}</p>
        </div>

        {/*
          Os dois caminhos levam à home, que hoje é o único lugar onde existe um whiteboard
          de trabalho. São ações separadas porque descrevem intenções diferentes — e no dia
          em que houver mais de um board local, é a principal que ganha destino próprio.
        */}
        <div className="flex items-center gap-3">
          <Link href={home} className={panelButtonClass}>
            {ui.create}
          </Link>
          <Link
            href={home}
            className="rounded-control px-3 py-2 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            {ui.back}
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
