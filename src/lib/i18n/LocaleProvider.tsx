"use client";

import { createContext, use, type ReactNode } from "react";
import { UI, type UiCopy } from "@/lib/i18n/ui";
import { DEFAULT_LOCALE, type Locale } from "@/lib/seo/site";

/**
 * O idioma da rota, disponível para os componentes de cliente.
 *
 * A rota já sabe a resposta — `/` é inglês e `/pt` é português —, mas quem precisa dela é
 * um componente fundo abaixo na árvore. Um contexto evita passar `locale` de mão em mão
 * por camadas que não têm texto nenhum (o quadro, o viewport, a moldura) só para entregá-lo
 * na ponta.
 *
 * O valor padrão é o idioma padrão do site, e não um erro: um componente montado fora do
 * provedor — num teste de unidade, por exemplo — deve renderizar texto, não quebrar.
 */
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

/** O idioma em que esta parte da árvore deve escrever. */
export function useLocale(): Locale {
  return use(LocaleContext);
}

/**
 * O texto da interface no idioma da rota.
 *
 * Atalho para o par `useLocale()` + `UI[locale]`, que apareceria em todo componente com
 * texto. Devolve o dicionário inteiro, e não uma função de tradução por chave: assim uma
 * chave que não existe é erro de compilação, e não uma string vazia descoberta em produção.
 */
export function useUi(): UiCopy {
  return UI[useLocale()];
}
