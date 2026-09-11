"use client";

import { iconButtonClass } from "@/components/ui/iconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useUi } from "@/lib/i18n/LocaleProvider";

interface EraserButtonProps {
  /** O modo borracha está ligado agora. */
  active: boolean;
  /** Liga ou desliga o modo — a mesma ação da tecla `E`. */
  onToggle: () => void;
}

/**
 * Ícone de borracha, no mesmo traço do resto da interface.
 *
 * O mesmo desenho é o cursor do modo, em `.cursor-eraser` (src/app/globals.css). As duas
 * cópias precisam andar juntas, como o lápis já faz.
 */
function EraserIcon() {
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
      <path d="M4.5 14.5 12.5 6.5a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L11.5 19.5H7z" />
      <path d="M7 19.5H20" />
    </svg>
  );
}

/**
 * Liga e desliga o modo borracha (issue #98).
 *
 * Mesma razão do botão do lápis: sem indicação visível, ligar a borracha faria a seleção por
 * retângulo parar de funcionar sem nada na tela explicando por quê, e no toque este botão é
 * a única forma de saber que o modo existe e de sair dele.
 */
export function EraserButton({ active, onToggle }: EraserButtonProps) {
  const ui = useUi();

  return (
    <div className="rounded-control border border-border bg-surface p-1 shadow-control">
      <Tooltip label={ui.eraser.action} align="start">
        <button
          type="button"
          className={`${iconButtonClass} ${active ? "bg-canvas text-ink" : ""}`}
          onClick={onToggle}
          aria-label={ui.eraser.action}
          aria-pressed={active}
        >
          <EraserIcon />
        </button>
      </Tooltip>
    </div>
  );
}
