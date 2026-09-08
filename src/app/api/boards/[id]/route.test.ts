import { beforeEach, describe, expect, it, vi } from "vitest";

const getBoard = vi.fn();

vi.mock("@/lib/db/boards", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/boards")>("@/lib/db/boards");
  return { ...actual, getBoard: (...args: unknown[]) => getBoard(...args) };
});

const { GET } = await import("./route");

function get(id: string) {
  const request = new Request(`https://example.com/api/boards/${id}`);
  return GET(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  getBoard.mockReset();
});

describe("GET /api/boards/:id", () => {
  it("devolve o content do board quando ele existe", async () => {
    getBoard.mockResolvedValueOnce({ content: { version: 1, notes: [] } });

    const response = await get("abcdefghijkl");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ content: { version: 1, notes: [] } });
    expect(getBoard).toHaveBeenCalledWith("abcdefghijkl");
  });

  it("responde 404 quando o board não existe", async () => {
    getBoard.mockResolvedValueOnce(null);

    const response = await get("abcdefghijkl");

    expect(response.status).toBe(404);
  });

  it("responde exatamente a mesma coisa para id inexistente e id malformado", async () => {
    getBoard.mockResolvedValue(null);

    const inexistente = await get("abcdefghijkl");
    const malformado = await get("id-invalido!");

    expect(malformado.status).toBe(inexistente.status);
    expect(await malformado.json()).toEqual(await inexistente.json());
  });

  it("não vaza o motivo da indisponibilidade no corpo do 404", async () => {
    getBoard.mockResolvedValueOnce(null);

    const body = JSON.stringify(await (await get("id-invalido!")).json());

    expect(body).not.toMatch(/inválid|malformad|removid|expirad/i);
  });

  it("responde 500 tratado quando o banco falha, sem vazar o erro", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    getBoard.mockRejectedValueOnce(new Error("conexão recusada com o banco"));

    const response = await get("abcdefghijkl");
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).not.toMatch(/conexão recusada/);

    consoleError.mockRestore();
  });
});
