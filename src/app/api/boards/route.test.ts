import { beforeEach, describe, expect, it, vi } from "vitest";
import { BoardPayloadTooLargeError } from "@/lib/db/boards";

const createBoard = vi.fn();

vi.mock("@/lib/db/boards", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/boards")>("@/lib/db/boards");
  return { ...actual, createBoard: (...args: unknown[]) => createBoard(...args) };
});

const { POST } = await import("./route");

function request(body: unknown) {
  return new Request("https://example.com/api/boards", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  createBoard.mockReset();
});

describe("POST /api/boards", () => {
  it("cria um board e devolve id e url públicos", async () => {
    createBoard.mockResolvedValueOnce({ id: "abc123" });

    const response = await POST(request({ content: { version: 1, notes: [] } }));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json).toEqual({ id: "abc123", url: "https://example.com/board/abc123" });
    expect(createBoard).toHaveBeenCalledWith({ version: 1, notes: [] });
  });

  it("rejeita corpo que não é JSON", async () => {
    const response = await POST(request("{ isso não é json"));

    expect(response.status).toBe(400);
    expect(createBoard).not.toHaveBeenCalled();
  });

  it.each([
    ["sem content", {}],
    ["content nulo", { content: null }],
    ["content como string", { content: "board" }],
    ["content como array", { content: [] }],
    ["body é um array", [{ content: {} }]],
  ])("rejeita payload inválido: %s", async (_caso, body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(createBoard).not.toHaveBeenCalled();
  });

  it("responde 413 quando o board excede o tamanho máximo", async () => {
    createBoard.mockRejectedValueOnce(new BoardPayloadTooLargeError());

    const response = await POST(request({ content: { version: 1, notes: [] } }));

    expect(response.status).toBe(413);
  });

  it("responde 500 tratado para qualquer outra falha, sem lançar", async () => {
    createBoard.mockRejectedValueOnce(new Error("conexão recusada com o banco"));

    const response = await POST(request({ content: { version: 1, notes: [] } }));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).not.toMatch(/conexão recusada/);
  });
});
