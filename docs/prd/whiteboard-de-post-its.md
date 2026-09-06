# Whiteboard de Post-its

## Objetivo

Oferecer um whiteboard de anotações em post-its que funciona no primeiro clique, sem
cadastro e sem onboarding: a pessoa abre a URL, dá um duplo clique e já está escrevendo.
O board inteiro vive na própria URL, então compartilhar ou salvar é copiar um link.

## Problema

Ferramentas de anotação visual (Miro, FigJam, Notion) resolvem o caso pesado, mas cobram
um pedágio alto para o caso leve: criar conta, criar workspace, criar arquivo, convidar
gente. Para "jogar cinco ideias soltas na tela e mandar para alguém", esse pedágio é maior
que a tarefa em si. O resultado é que esse uso acaba caindo em bloco de notas ou mensagem
para si mesmo, onde se perde o arranjo espacial — que é justamente o valor do post-it.

## Solução

Uma SPA de página única onde o canvas é o produto. Todo o estado do board (post-its,
posição, tamanho, cor, texto, ordem) é serializado e comprimido no fragmento da URL, e
espelhado em `localStorage` como autosave da sessão. Sem backend, sem banco, sem conta:
a URL *é* o documento.

Alternativas descartadas: backend com IDs curtos (adiciona storage, retenção e privacidade
para um ganho que só aparece em boards grandes, fora do caso de uso alvo); estado só em
`localStorage` (quebra o requisito de link compartilhável).

## Usuários

- **Pensador solo** — quer descarregar ideias rápido, espacialmente, sem fricção. Ganha
  um canvas instantâneo e um link para retomar depois em qualquer máquina.
- **Quem compartilha um rascunho** — quer mandar um agrupamento de ideias para alguém sem
  pedir que a pessoa crie conta. Ganha um link que abre o board exatamente como estava.
- **Quem quer levar o conteúdo embora** — precisa que as anotações não fiquem presas na
  ferramenta. Ganha exportação em Markdown.

## Fluxo principal

1. Usuário abre a aplicação em uma URL limpa e vê um whiteboard vazio em light mode.
2. Dá um duplo clique com o botão esquerdo em qualquer ponto do canvas; um post-it é criado
   naquela posição, já em modo de edição com o cursor ativo.
3. Digita a anotação (texto simples, múltiplas linhas) e clica fora para confirmar.
4. Arrasta o post-it para reposicioná-lo, redimensiona pelo canto, e escolhe uma das cores
   predefinidas na paleta do post-it.
5. Repete a criação para outras anotações; usa scroll/atalhos/controles para dar zoom e
   arrasta o fundo para navegar pelo board.
6. Seleciona um ou mais post-its e pressiona `Delete` para removê-los.
7. A URL é atualizada a cada mudança (com debounce); o usuário copia a URL da barra de
   endereços e a guarda ou envia para outra pessoa.
8. Ao abrir essa URL depois, o board é reconstruído idêntico ao momento em que o link foi
   copiado.
9. A qualquer momento, o usuário aciona "Exportar Markdown" e baixa um `.md` com todas as
   anotações.

Fluxos alternativos relevantes:
- Abrir a raiz sem estado na URL restaura o último board do `localStorage`, se existir.
- Board grande demais para caber com segurança na URL: o usuário é avisado de forma
  explícita, com o autosave local continuando a funcionar normalmente.

## Critérios de aceite

- [ ] A aplicação é utilizável sem qualquer cadastro, login ou identificação.
- [ ] Duplo clique com o botão esquerdo no canvas cria um post-it na posição do cursor, já
      em modo de edição.
- [ ] Post-its aceitam texto simples multi-linha, sem formatação rica.
- [ ] Post-its podem ser arrastados e soltos em qualquer posição do canvas.
- [ ] Post-its podem ser redimensionados, respeitando um tamanho mínimo.
- [ ] Cada post-it pode assumir qualquer uma das 6 cores predefinidas do sistema.
- [ ] Clicar em um post-it o traz para a frente dos demais (z-index).
- [ ] É possível selecionar múltiplos post-its (shift-clique e retângulo de seleção).
- [ ] A tecla `Delete` remove o(s) post-it(s) selecionado(s).
- [ ] O canvas suporta pan (arrastar o fundo) e zoom in/out, com limites definidos.
- [ ] A URL é atualizada conforme post-its são criados, editados, movidos ou removidos.
- [ ] Abrir uma URL gerada pela aplicação reconstrói o board de forma idêntica (round-trip
      encode→decode sem perda, coberto por teste automatizado).
- [ ] Recarregar a página sem estado na URL restaura o último board salvo localmente.
- [ ] Existe uma ação que exporta todos os post-its em um arquivo Markdown.
- [ ] A interface é light mode, moderna, e responde adequadamente em telas de desktop.
- [ ] Quando o board excede o tamanho seguro de URL, o usuário é avisado explicitamente.

## Fora do escopo

- Dark mode.
- Colaboração em tempo real / edição simultânea por múltiplos usuários.
- Imagens, anexos ou qualquer mídia dentro dos post-its.
- Conexões, setas ou linhas entre post-its.
- Contas de usuário, autenticação e boards persistidos em servidor.
- Formatação rica (negrito, itálico, listas) dentro do post-it.
- Múltiplos boards gerenciados dentro da mesma sessão.
- Suporte a toque/mobile como caso de uso primário.

## Dependências

- Nenhuma dependência de outro time ou serviço externo: a aplicação não tem backend.
- Hospedagem na Vercel (projeto ainda não criado).
- Limite prático de tamanho de URL imposto pelos navegadores (~2000 caracteres como alvo
  conservador) — é a restrição técnica que define o teto de post-its por link e precisa
  ser respeitada pela estratégia de serialização.

## Métricas de sucesso

- Tempo entre abrir a aplicação e ter o primeiro post-it com texto: abaixo de 10 segundos
  para um usuário novo, medido em teste de uso informal com 3 pessoas.
- Round-trip de serialização sem perda em 100% dos casos de teste automatizado.
- Um board típico de 15 post-its curtos cabe em uma URL abaixo do limite de 2000
  caracteres.
- Lighthouse Performance e Accessibility acima de 90 na página principal.

---

## Plano de execução

- **Milestone:** [Whiteboard de Post-its](https://github.com/mateusvillain/digitalnotes/milestone/1)
- **Epics:**
  - [#5 — Fundação do app e canvas](https://github.com/mateusvillain/digitalnotes/issues/5)
  - [#2 — Ciclo de vida do post-it](https://github.com/mateusvillain/digitalnotes/issues/2)
  - [#3 — Persistência e link compartilhável](https://github.com/mateusvillain/digitalnotes/issues/3)
  - [#4 — Exportação em Markdown](https://github.com/mateusvillain/digitalnotes/issues/4)
- **Fila pronta para começar:** [issues sem bloqueio](https://github.com/mateusvillain/digitalnotes/issues?q=is%3Aopen+milestone%3A%22Whiteboard+de+Post-its%22+-label%3Ablocked+-label%3Aepic)
