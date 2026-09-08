import type { Locale } from "@/lib/seo/site";

/** Qual desenho acompanha a dica de gesto. O componente decide como cada um é traçado. */
export type OnboardingIcon = "note" | "move" | "zoom";

/** Uma dica de teclado: as teclas e o que elas fazem. */
export interface OnboardingShortcut {
  /**
   * As teclas do atalho, na ordem em que se apertam.
   *
   * `"mod"` é o marcador do modificador do sistema — o componente o troca por `⌘` ou por
   * `Ctrl` conforme a máquina. Sai daqui como marcador, e não já resolvido, porque a
   * resposta só existe no navegador e este arquivo é lido também no servidor.
   */
  keys: readonly string[];
  label: string;
}

/** Uma dica de gesto, para quem não tem teclado. */
export interface OnboardingGesture {
  icon: OnboardingIcon;
  /** O gesto, destacado: é a parte que a pessoa precisa levar da tela. */
  gesture: string;
  /** O que o gesto faz. Segue o gesto na mesma frase, em tom secundário. */
  label: string;
}

export interface OnboardingCopy {
  title: string;
  subtitle: string;
  /** Quem tem teclado: os três atalhos que abrem o quadro inteiro. */
  shortcuts: readonly OnboardingShortcut[];
  /** Quem tem só o dedo — onde não existe tecla nenhuma para apertar. */
  touch: readonly OnboardingGesture[];
}

/**
 * As três linhas que aparecem no quadro vazio (onboarding do canvas).
 *
 * Três, e não a lista inteira de atalhos: quem acabou de chegar não decora um manual, e o
 * resto da interface se explica ao ser tocada. As escolhidas são as que não têm como ser
 * descobertas por tentativa — nada na tela sugere que existe uma tecla que cria nota,
 * outra que navega, e que o quadro precisa ser salvo para sobreviver à aba fechada.
 *
 * As duas listas existem porque o quadro responde a coisas diferentes em cada aparelho
 * (#57): no toque não há teclado, um dedo navega e a pinça amplia. Ensinar `Ctrl+S` num
 * celular é pior do que não ensinar nada — é mandar apertar uma tecla que não existe.
 */
export const ONBOARDING: Record<Locale, OnboardingCopy> = {
  en: {
    title: "Welcome to Virtual Notes",
    subtitle: "An empty board. Three things and you're set.",
    shortcuts: [
      { keys: ["N"], label: "Note" },
      { keys: ["Space"], label: "Movement" },
      { keys: ["mod", "S"], label: "Save" },
    ],
    touch: [
      { icon: "note", gesture: "Double-tap", label: "New note" },
      { icon: "move", gesture: "Drag one finger", label: "Movement" },
      { icon: "zoom", gesture: "Pinch", label: "Zoom" },
    ],
  },
  pt: {
    title: "Boas-vindas ao Virtual Notes",
    subtitle: "O quadro está vazio. Três coisas e você já sabe usar.",
    shortcuts: [
      { keys: ["N"], label: "Nota" },
      { keys: ["Espaço"], label: "Movimentação" },
      { keys: ["mod", "S"], label: "Salvar" },
    ],
    touch: [
      { icon: "note", gesture: "Toque duas vezes", label: "Nova nota" },
      { icon: "move", gesture: "Arraste um dedo", label: "Movimentação" },
      { icon: "zoom", gesture: "Junte dois dedos", label: "Zoom" },
    ],
  },
};

/** O marcador que o componente troca pelo modificador da máquina. */
export const MOD_KEY = "mod";
