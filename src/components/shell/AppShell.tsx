import type { ReactNode } from "react";

interface AppShellProps {
  /** Conteúdo desenhado sobre o quadro. Ocupa toda a área do canvas. */
  children?: ReactNode;
  /** Controles flutuantes sobre o canvas — zoom e reset entram aqui na issue #9. */
  controls?: ReactNode;
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
export function AppShell({ children, controls }: AppShellProps) {
  return (
    <main className="relative h-dvh overflow-hidden bg-canvas">
      {/*
        O nome continua na árvore, só não na tela: uma página sem cabeçalho nenhum não tem
        como ser anunciada por leitor de tela, e um `h1` invisível custa zero pixel.
      */}
      <h1 className="sr-only">digitalnotes</h1>

      {children}

      {controls === undefined ? null : (
        // Acima do quadro **e** da barra de seleção (`z-20`): um controle da aplicação não
        // pode ser coberto por um overlay que segue os post-its.
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-end p-4">
          <div className="pointer-events-auto rounded-control border border-border bg-surface p-1 shadow-control">
            {controls}
          </div>
        </div>
      )}
    </main>
  );
}
