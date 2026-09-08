import { SITE_NAME, type Locale } from "./site";

/**
 * O texto que os buscadores mostram de cada página, por idioma.
 *
 * Escrito para a busca, não para a interface: o `title` cabe nos ~60 caracteres que o
 * Google renderiza antes de cortar, e a `description` fica na casa dos 155 porque ela não
 * é sinal de ranqueamento — é o anúncio que decide o clique depois que a página já apareceu.
 *
 * Os termos foram escolhidos pelo que as pessoas realmente digitam ("quadro branco online",
 * "online sticky notes"), e não pelo vocabulário interno do projeto ("board", "canvas").
 * Nenhum deles é empilhado: repetir palavra-chave não ranqueia melhor há duas décadas, e
 * uma descrição que soa como lista não é clicada.
 */
interface LocaleCopy {
  /** `<title>` da home. Curto de propósito: o nome do site já é acrescentado nas outras. */
  title: string;
  /** Sufixo das demais páginas, para que toda aba diga de que produto ela é. */
  titleTemplate: string;
  description: string;
  /** Uma frase só, para o `og:image` e o JSON-LD. */
  tagline: string;
  keywords: string[];
  /** Nome da ação principal, usado no botão do cartão de compartilhamento. */
  ogAlt: string;
  board: {
    title: string;
    description: string;
  };
  notFound: {
    title: string;
    description: string;
  };
}

export const COPY: Record<Locale, LocaleCopy> = {
  en: {
    title: "Virtual Notes — Online sticky notes whiteboard",
    titleTemplate: `%s — ${SITE_NAME}`,
    description:
      "A free online whiteboard for sticky notes. No account and nothing to install — write, drag and colour your notes, then share the whole board with a single link.",
    tagline: "Online sticky notes whiteboard. No signup.",
    keywords: [
      "online whiteboard",
      "sticky notes online",
      "virtual sticky notes",
      "online post-it notes",
      "free whiteboard",
      "whiteboard without signup",
      "brainstorming board",
      "digital notes board",
    ],
    ogAlt: `${SITE_NAME} — a whiteboard full of colourful sticky notes`,
    board: {
      title: "Shared whiteboard",
      description: "A whiteboard of sticky notes shared with you on Virtual Notes.",
    },
    notFound: {
      title: "Page not found",
      description: "This page does not exist. Go back to the whiteboard to start a new board.",
    },
  },
  pt: {
    title: "Virtual Notes — Quadro branco online",
    titleTemplate: `%s — ${SITE_NAME}`,
    description:
      "Quadro branco online e gratuito para organizar ideias em post-its. Sem cadastro e sem instalar: escreva, arraste e compartilhe o quadro inteiro por um link.",
    tagline: "Quadro branco online com post-its. Sem cadastro.",
    keywords: [
      "quadro branco online",
      "post-it online",
      "mural de recados online",
      "quadro de anotações online",
      "post-it virtual",
      "quadro branco gratuito",
      "brainstorming online",
      "bloco de notas online",
    ],
    ogAlt: `${SITE_NAME} — um quadro cheio de notas coloridas`,
    board: {
      title: "Whiteboard compartilhado",
      description: "Um quadro de post-its compartilhado com você no Virtual Notes.",
    },
    notFound: {
      title: "Página não encontrada",
      description: "Esta página não existe. Volte para o quadro e comece um whiteboard novo.",
    },
  },
};
