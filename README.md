# digitalnotes

Whiteboard de anotações em post-its, sem cadastro. O board vive na própria URL.

O planejamento da primeira versão está em [`docs/prd/`](docs/prd/) e no
[milestone "Whiteboard de Post-its"](https://github.com/mateusvillain/digitalnotes/milestones).

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

Stack: Next.js (App Router) · TypeScript · Tailwind CSS · Vitest · deploy na Vercel.
