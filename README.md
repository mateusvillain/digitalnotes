# digitalnotes

Whiteboard de anotações em post-its, sem cadastro. O board vive na própria URL.

O planejamento da primeira versão está em [`docs/prd/`](docs/prd/) e no
[milestone "Whiteboard de Post-its"](https://github.com/mateusvillain/digitalnotes/milestones).

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

Stack: Next.js (App Router) · TypeScript · Tailwind CSS · Vitest · deploy na Vercel.
