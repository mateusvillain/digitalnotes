import type { ReactNode } from "react";
import { Fuzzy_Bubbles, Geist, Geist_Mono } from "next/font/google";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { HTML_LANG, type Locale } from "@/lib/seo/site";
import "@/app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * A letra manuscrita das mensagens que flutuam sobre o quadro.
 *
 * Só existe em dois pesos e não tem itálico, por isso fica fora do texto de interface: um
 * `font-medium` nela cairia num peso sintetizado pelo navegador. O lugar dela é a prosa
 * solta sobre o canvas, onde ela faz o quadro parecer escrito à mão em vez de renderizado.
 */
const fuzzyBubbles = Fuzzy_Bubbles({
  variable: "--font-fuzzy-bubbles",
  weight: ["400", "700"],
  subsets: ["latin"],
});

/**
 * O documento HTML da aplicação, com o idioma como parâmetro.
 *
 * Existe porque cada idioma tem o seu próprio layout raiz — é o que permite ao `<html>`
 * declarar `lang="en"` na raiz e `lang="pt-BR"` em `/pt`. Esse atributo não é detalhe de
 * acessibilidade só: é o sinal que o buscador cruza com o `hreflang` para confirmar que a
 * página traduzida é mesmo aquela que a outra prometeu, e que o leitor de tela usa para
 * escolher a voz.
 *
 * Sem esta função, os dois layouts seriam cópias que se separam no primeiro ajuste de
 * fonte — e as fontes seriam carregadas duas vezes, cada uma com o seu nome de variável.
 */
export function Document({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html
      lang={HTML_LANG[locale]}
      className={`${geistSans.variable} ${geistMono.variable} ${fuzzyBubbles.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {/*
          O mesmo idioma do `lang` acima, agora legível pelos componentes de cliente: é o
          layout raiz o único lugar da árvore que sabe a resposta sem precisar olhar a URL.
        */}
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
