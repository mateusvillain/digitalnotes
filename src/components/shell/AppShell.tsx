import type { ReactNode } from "react";

interface AppShellProps {
  /** Conteúdo desenhado sobre o quadro. Ocupa toda a área do canvas. */
  children?: ReactNode;
  /** Controles flutuantes sobre o canvas — zoom e reset entram aqui na issue #9. */
  controls?: ReactNode;
}

/**
 * Moldura da aplicação: barra superior, superfície do quadro e a faixa reservada aos
 * controles flutuantes.
 *
 * O shell não sabe nada sobre post-its nem sobre viewport; ele só garante que a área de
 * canvas ocupe a tela inteira e que os controles tenham onde morar sem disputar espaço com
 * o quadro.
 */
export function AppShell({ children, controls }: AppShellProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="z-10 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-semibold tracking-tight text-ink">digitalnotes</h1>
          <p className="hidden text-xs text-ink-muted sm:block">
            O board vive na própria URL — copie o link para compartilhar.
          </p>
        </div>
        {/* Reservado às ações do board (exportar Markdown, na issue #24). */}
        <div className="flex items-center gap-2" />
      </header>

      <main className="whiteboard-surface relative min-h-0 flex-1">
        {children}
        {controls === undefined ? null : (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
            <div className="pointer-events-auto rounded-control border border-border bg-surface p-1 shadow-control">
              {controls}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
