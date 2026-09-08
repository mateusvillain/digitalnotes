import type { ReactNode } from "react";

interface AppShellProps {
  /** Conteúdo desenhado sobre o quadro. Ocupa toda a área do canvas. */
  children?: ReactNode;
  /** Controles flutuantes sobre o canvas — zoom e reset entram aqui na issue #9. */
  controls?: ReactNode;
  /**
   * Ações do documento, no canto superior direito — compartilhar entra aqui (#46).
   *
   * Canto oposto ao do zoom de propósito: navegar o quadro e publicá-lo são coisas
   * diferentes, e vizinhas elas virariam uma fileira de ícones em que o clique errado sai
   * caro (um deles manda o board para fora da máquina).
   */
  actions?: ReactNode;
  /**
   * Ações que criam ou trocam o documento, no canto superior esquerdo — o whiteboard novo
   * entra aqui (#58).
   *
   * Longe do canto de compartilhar por segurança de gesto: uma delas descarta o quadro
   * atual e a outra o publica, e vizinhas o clique errado é caro nos dois sentidos.
   */
  documentActions?: ReactNode;
}

/**
 * Moldura da aplicação: a superfície do quadro e o canto reservado aos controles flutuantes.
 *
 * Não há barra superior. O quadro é a interface inteira, e uma faixa fixa no topo custava
 * altura de tela sem oferecer nada que o próprio quadro não mostre — o nome do app já está
 * no título da aba.
 *
 * O shell não sabe nada sobre post-its nem sobre viewport; ele só garante que a área de
 * canvas ocupe a tela inteira e que os controles tenham onde morar sem disputar espaço com
 * o quadro.
 */
export function AppShell({ children, controls, actions, documentActions }: AppShellProps) {
  return (
    <main className="relative h-dvh overflow-hidden bg-canvas">
      {/*
        O nome continua na árvore, só não na tela: uma página sem cabeçalho nenhum não tem
        como ser anunciada por leitor de tela, e um `h1` invisível custa zero pixel.
      */}
      <h1 className="sr-only">digitalnotes</h1>

      {children}

      {actions === undefined && documentActions === undefined ? null : (
        // Mesmo respiro do canto de baixo: colado na borda o controle parece parte da
        // moldura do navegador, e fica no caminho do gesto de fechar a aba.
        //
        // Uma faixa só para os dois cantos, e não duas sobrepostas: assim eles nunca podem
        // divergir de altura nem cobrir um ao outro.
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-4">
          <div className="pointer-events-auto">{documentActions}</div>
          <div className="pointer-events-auto">{actions}</div>
        </div>
      )}

      {controls === undefined ? null : (
        // Acima do quadro **e** da barra de seleção (`z-20`): um controle da aplicação não
        // pode ser coberto por um overlay que segue os post-its.
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-end p-4">
          <div className="pointer-events-auto rounded-control border border-border bg-surface p-1 shadow-control">
            {controls}
          </div>
        </div>
      )}
    </main>
  );
}
