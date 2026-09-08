# Virtual Notes

Whiteboard de anotações em post-its, sem cadastro. O board vive na própria URL.
Em produção: [virtualnot.es](https://virtualnot.es).

> O repositório e o pacote ainda se chamam `digitalnotes` em alguns lugares (o remoto do
> Git, o banco local no navegador). Onde o nome é visível — título, cartão social, dados
> estruturados — vale **Virtual Notes**.

O planejamento da primeira versão está no
[PRD na Wiki](https://github.com/mateusvillain/digitalnotes/wiki/Whiteboard-de-Post-its)
e no [milestone "Whiteboard de Post-its"](https://github.com/mateusvillain/digitalnotes/milestone/1).

O formato de dados do board está documentado em
[`docs/board-format.md`](docs/board-format.md).

## Desenvolvimento

```bash
npm install
npm run dev        # sobe em http://localhost:3000
```

Scripts disponíveis:

| Script                 | O que faz                   |
| ---------------------- | --------------------------- |
| `npm run dev`          | Servidor de desenvolvimento |
| `npm run build`        | Build de produção           |
| `npm run typecheck`    | TypeScript em modo estrito  |
| `npm run lint`         | ESLint                      |
| `npm run format`       | Checa formatação (Prettier) |
| `npm run format:write` | Aplica formatação           |
| `npm test`             | Testes unitários (Vitest)   |

> Os tipos de rota (`LayoutProps`, `PageProps`) são gerados pelo Next. Em um clone novo,
> rode `npm run typecheck` (que já executa `next typegen`) ou `npm run dev` antes de confiar
> no TypeScript do editor.

O deploy é feito pela Vercel. O framework fica declarado em `vercel.json` em vez de
depender da detecção automática no painel: foi justamente ela que falhou no import
inicial, procurando uma pasta `public/` estática depois de um build de Next bem-sucedido.

Uma rotina diária apaga os boards que ficaram sem nenhum post-it por mais de 24 horas
(`/api/cron/cleanup-boards`, agendada em `vercel.json`). O endpoint exige o cabeçalho
`Authorization: Bearer $CRON_SECRET`, então a variável `CRON_SECRET` precisa estar definida
no projeto da Vercel — sem ela a rota recusa toda chamada, inclusive a do agendador.

## Idiomas e SEO

O site é servido em dois idiomas, cada um na sua URL — é o que torna o `hreflang` possível,
e sem ele o Google escolhe uma versão só e ignora a outra:

| Idioma              | URL                      |
| ------------------- | ------------------------ |
| Inglês (padrão)     | `/` e `/board/[id]`      |
| Português do Brasil | `/pt` e `/pt/board/[id]` |

Cada idioma tem o seu **layout raiz** (`src/app/(en)` e `src/app/(pt)`), porque o que muda
entre eles é o `lang` do `<html>` — atributo que só um layout raiz controla. Os grupos entre
parênteses não aparecem na URL: o `/pt` vem do segmento de pasta, e o inglês fica na raiz.

O texto que os buscadores leem mora em `src/lib/seo/`:

| Arquivo        | O que guarda                                               |
| -------------- | ---------------------------------------------------------- |
| `site.ts`      | Nome, domínio, idiomas e o cálculo de canonical/`hreflang` |
| `copy.ts`      | Título, descrição e palavras-chave de cada idioma          |
| `metadata.ts`  | A metadata do layout de cada idioma e a dos boards         |
| `JsonLd.tsx`   | Os dados estruturados (schema.org) da home                 |
| `og-image.tsx` | O cartão social, gerado por idioma                         |

`robots.txt`, `sitemap.xml`, o manifesto e os ícones são gerados por `src/app/robots.ts`,
`sitemap.ts`, `manifest.ts`, `icon.svg` e `apple-icon.tsx`.

Os boards compartilhados são `noindex` e ficam fora do sitemap e do `robots.txt`: o conteúdo
é de quem criou o link. Eles também apagam o canonical que herdariam do layout — herdado,
ele diria que todo board é uma cópia da home.

A origem canônica é fixa (`https://virtualnot.es`), e não derivada de `VERCEL_URL`: cada
preview tem um host próprio, e um canonical apontando para um deles ensinaria o buscador a
indexar uma URL que morre na semana seguinte. Para apontar para outro domínio, defina
`NEXT_PUBLIC_SITE_URL`.

Stack: Next.js (App Router) · TypeScript · Tailwind CSS · Vitest · deploy na Vercel.
