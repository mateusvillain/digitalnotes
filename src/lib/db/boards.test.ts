import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();

vi.mock("./client", () => ({
  getDbClient: () => ({ execute }),
}));

const { BoardPayloadTooLargeError, MAX_BOARD_CONTENT_BYTES, createBoard, getBoard } =
  await import("./boards");

beforeEach(() => {
  execute.mockReset();
});

describe("createBoard", () => {
  it("insere o board e devolve um id novo", async () => {
    execute.mockResolvedValueOnce({});

    const { id } = await createBoard({ version: 1, notes: [] });

    expect(id).toEqual(expect.any(String));
    expect(id.length).toBeGreaterThan(0);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({
      sql: "INSERT INTO boards (id, content) VALUES (?, ?)",
      args: [id, JSON.stringify({ version: 1, notes: [] })],
    });
  });

  it("gera um id diferente a cada chamada", async () => {
    execute.mockResolvedValue({});

    const first = await createBoard({ version: 1, notes: [] });
    const second = await createBoard({ version: 1, notes: [] });

    expect(first.id).not.toEqual(second.id);
  });

  it("rejeita conteúdo maior que o limite sem tentar inserir", async () => {
    const hugeContent = { text: "x".repeat(MAX_BOARD_CONTENT_BYTES + 1) };

    await expect(createBoard(hugeContent)).rejects.toBeInstanceOf(BoardPayloadTooLargeError);
    expect(execute).not.toHaveBeenCalled();
  });

  it("tenta de novo com outro id em caso de colisão", async () => {
    execute
      .mockRejectedValueOnce(new Error("UNIQUE constraint failed: boards.id"))
      .mockResolvedValueOnce({});

    const { id } = await createBoard({ version: 1, notes: [] });

    expect(id).toEqual(expect.any(String));
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("propaga erros que não são de colisão de id", async () => {
    execute.mockRejectedValueOnce(new Error("conexão recusada"));

    await expect(createBoard({ version: 1, notes: [] })).rejects.toThrow("conexão recusada");
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe("getBoard", () => {
  it("devolve o content desserializado quando o board existe", async () => {
    execute.mockResolvedValueOnce({ rows: [{ content: '{"version":1,"notes":[]}' }] });

    const board = await getBoard("abcdefghijkl");

    expect(board).toEqual({ content: { version: 1, notes: [] } });
    expect(execute).toHaveBeenCalledWith({
      sql: "SELECT content FROM boards WHERE id = ?",
      args: ["abcdefghijkl"],
    });
  });

  it("devolve null quando o board não existe", async () => {
    execute.mockResolvedValueOnce({ rows: [] });

    expect(await getBoard("abcdefghijkl")).toBeNull();
  });

  it.each([
    ["vazio", ""],
    ["curto demais", "abc"],
    ["longo demais", "abcdefghijklm"],
    ["caractere inválido", "abcdefghijk!"],
    ["com barra", "abcdefghij/k"],
    ["com espaço", "abcdefghij k"],
  ])("devolve null para id malformado (%s) sem consultar o banco", async (_caso, id) => {
    expect(await getBoard(id)).toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });

  it("aceita o formato de id gerado pela própria aplicação", async () => {
    execute.mockResolvedValueOnce({});
    const { id } = await createBoard({ version: 1, notes: [] });
    execute.mockResolvedValueOnce({ rows: [{ content: "{}" }] });

    expect(await getBoard(id)).toEqual({ content: {} });
  });

  it("devolve null quando o content gravado não é JSON legível", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    execute.mockResolvedValueOnce({ rows: [{ content: "{isso não é json" }] });

    expect(await getBoard("abcdefghijkl")).toBeNull();

    consoleError.mockRestore();
  });
});
