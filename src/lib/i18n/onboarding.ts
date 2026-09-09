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
  /**
   * A frase sob o título.
   *
   * Não conta os itens, e é uma só para as duas listas — que não têm o mesmo tamanho. Um
   * número aqui estaria errado em metade dos aparelhos, e prenderia a frase ao comprimento
   * da lista: acrescentar uma linha exigiria lembrar de reescrever o texto acima dela.
   */
  subtitle: string;
  /** Quem tem teclado: os atalhos que abrem o quadro inteiro. */
  shortcuts: readonly OnboardingShortcut[];
  /** Quem tem só o dedo — onde não existe tecla nenhuma para apertar. */
  touch: readonly OnboardingGesture[];
}

/**
 * As linhas que aparecem no quadro vazio (onboarding do canvas).
 *
 * Poucas, e não a lista inteira de atalhos: quem acabou de chegar não decora um manual, e o
 * resto da interface se explica ao ser tocada. As escolhidas são as que não têm como ser
 * descobertas por tentativa — nada na tela sugere que existe uma tecla que cria nota, outra
 * que navega, outra que desenha, e que o quadro precisa ser salvo para sobreviver à aba
 * fechada.
 *
 * O lápis (#72) entrou como quarta linha, e não no lugar de nenhuma: quatro ainda se leem de
 * relance, e a partir da quinta a peça começa a virar manual. É o teto — a próxima
 * ferramenta que quiser uma linha aqui vai ter de tirar outra.
 *
 * As duas listas existem porque o quadro responde a coisas diferentes em cada aparelho
 * (#57): no toque não há teclado, um dedo navega e a pinça amplia. Ensinar `Ctrl+S` num
 * celular é pior do que não ensinar nada — é mandar apertar uma tecla que não existe.
 *
 * E é por isso que o lápis **não** ganhou linha na lista de toque: lá ele não é gesto
 * nenhum, é um botão que está na tela o tempo todo. A apresentação existe para ensinar o
 * que não se descobre olhando; mandar tocar num botão visível é gastar uma das poucas
 * linhas com o que a própria tela já diz.
 *
 * A linha de toque continuou dizendo "Nova nota", e não "Nova nota adesiva" (#81). Ela é a
 * única das duas listas escrita como resultado de um gesto, e não como nome de ferramenta:
 * lá não há tecla `N` para associar a um nome, há um duplo toque e o que ele produz. O nome
 * completo da peça importa onde ela é **escolhida** — o botão e a linha de teclado —, e não
 * onde só se ensina o gesto que a cria. Foi a largura que fez olhar para esta linha (é a
 * mais apertada da peça, num aparelho de 320px), mas não foi a largura que decidiu.
 *
 * O cursor (#83) foi a primeira ferramenta a bater no teto de quatro, e não entrou. Não foi
 * por falta de espaço: `V` leva à ferramenta em que o quadro **já começa**, e ensinar como
 * chegar onde a pessoa está é a linha menos útil que esta lista poderia ter. O botão dele
 * fica visível na moldura o tempo todo, que é a mesma razão pela qual o lápis não entrou na
 * lista de toque.
 */
export const ONBOARDING: Record<Locale, OnboardingCopy> = {
  en: {
    title: "Welcome to Virtual Notes",
    subtitle: "An empty board. A few things and you're set.",
    shortcuts: [
      { keys: ["N"], label: "Sticky Note" },
      { keys: ["P"], label: "Pencil" },
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
    subtitle: "O quadro está vazio. Só isso e você já sabe usar.",
    shortcuts: [
      { keys: ["N"], label: "Nota adesiva" },
      { keys: ["P"], label: "Lápis" },
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
