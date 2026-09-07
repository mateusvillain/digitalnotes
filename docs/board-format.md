# Formato do board

Referência única do modelo de dados compartilhado por canvas, post-its, persistência e
exportação. O código vive em `src/lib/board/`: `types.ts` (contrato) e `schema.ts`
(validação/normalização).

## Modelo

```ts
Board = { version: number; notes: Note[] }
Note = { id: string; x: number; y: number; w: number; h: number; color: 0..5; text: string; z: number }
```

- `x`/`y` — canto superior esquerdo, em coordenadas de canvas (não de tela).
- `w`/`h` — dimensões em unidades de canvas; padrão 200×200, entre 80 e 2000.
- `color` — **índice** na paleta `NOTE_COLORS`, nunca o nome nem o hexadecimal.
- `text` — texto puro, sem formatação, até 2000 caracteres.
- `z` — ordem de empilhamento; maior fica por cima.

## Por que é compacto

O board inteiro é serializado dentro da URL (issue #11), então cada caractere do modelo
compete com o limite prático de tamanho de link. As decisões que seguem dessa restrição:

1. **Cor como índice, não como string.** `0` custa 1 caractere; `"yellow"` custa 8. Como
   bônus, trocar o valor visual da paleta (issue #8) não invalida nenhum link já
   compartilhado — o índice continua apontando para o mesmo lugar.
2. **Chaves curtas de uma letra** no que é geométrico e repetido em toda note: `x`, `y`,
   `w`, `h`, `z`. Os nomes por extenso ficaram só onde a clareza importa mais que o byte
   (`id`, `color`, `text`).
3. **Sem campos derivados.** Nada que possa ser recalculado (bounding box, seleção,
   viewport) entra no board. O estado de viewport — pan e zoom — é efêmero e nunca é
   serializado.
4. **Sem formatação de texto.** Texto puro elimina toda uma árvore de marcação do payload.
5. **Limites explícitos** (`NOTE_MAX_TEXT_LENGTH`, `CANVAS_LIMIT`, tamanho máximo de note)
   dão um teto previsível ao tamanho do link, que a issue #23 usa para avisar o usuário
   antes de o board estourar.

A compressão e a codificação em si (`#11`) são outra camada: este documento define o que é
serializado, não como.

## Versionamento

`version` acompanha `SCHEMA_VERSION` (hoje `1`) e existe para os links não quebrarem quando
o formato evoluir. As regras de leitura:

- Versão **menor ou igual** à atual: aceita, migrando o que for preciso.
- Versão **maior** que a atual: recusada com mensagem explícita. Um board escrito por uma
  versão mais nova pode ter campos com outro significado, e mostrar dados silenciosamente
  errados é pior do que avisar.

Incrementar `SCHEMA_VERSION` só em mudança incompatível — acrescentar um campo opcional com
padrão razoável não é incompatível.

## Validação

`parseBoard(input: unknown)` é a porta de entrada de todo dado não confiável (URL,
localStorage, link colado). Ela **nunca lança**:

```ts
type ParseBoardResult =
  { ok: true; board: Board; warnings: string[] } | { ok: false; error: string };
```

Um board parcialmente corrompido não derruba a tela: notes irrecuperáveis (sem `id`, sem
posição numérica ou com cor fora da paleta) e ids duplicados são descartados e reportados
em `warnings`; o resto do board é preservado. Valores recuperáveis são normalizados em vez
de descartados — tamanho e coordenadas são limitados aos extremos, texto é truncado, `z`
vira inteiro. Só um board irrecuperável (não é objeto, versão inválida, versão futura, sem
lista de notes) devolve `ok: false`.
