"use client";

import { iconButtonClass } from "@/components/ui/iconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useUi } from "@/lib/i18n/LocaleProvider";

interface PencilButtonProps {
  /** O modo lápis está ligado agora. */
  active: boolean;
  /** Liga ou desliga o modo — a mesma ação da tecla `P`. */
  onToggle: () => void;
}

/** Ícone de lápis: o corpo e a ponta, no mesmo traço do resto da interface. */
function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16.5 3.5 20 7 8 19l-4.5 1L4.5 15.5z" />
      <path d="M14.5 5.5 18 9" />
    </svg>
  );
}

/**
 * Liga e desliga o modo lápis (issue #68).
 *
 * É a indicação visível que o modo exige. Sem ela, ligar o lápis faria a seleção por
 * retângulo simplesmente parar de funcionar, sem nada na tela explicando por quê — e no
 * toque, onde não há tecla `P` nem cursor que mude de forma, este botão é a única maneira
 * de saber que o modo existe e de sair dele.
 *
 * `aria-pressed`, e não um segundo rótulo para o estado ligado: é o atributo que os leitores
 * de tela já anunciam como "pressionado", e o nome do botão continua sendo a ação.
 */
export function PencilButton({ active, onToggle }: PencilButtonProps) {
  const ui = useUi();

  return (
    <div className="rounded-control border border-border bg-surface p-1 shadow-control">
      <Tooltip label={ui.pencil.action} align="start">
        <button
          type="button"
          // O fundo do estado ligado é o mesmo que o `hover` já usa: o botão fica com a
          // aparência de quem está sendo apontado, que é o que "ligado" quer dizer aqui.
          className={`${iconButtonClass} ${active ? "bg-canvas text-ink" : ""}`}
          onClick={onToggle}
          aria-label={ui.pencil.action}
          aria-pressed={active}
        >
          <PencilIcon />
        </button>
      </Tooltip>
    </div>
  );
}
