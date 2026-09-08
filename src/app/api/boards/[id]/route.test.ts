import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();

/**
 * Mock só na conexão com o banco, e não em `getBoard`: o que estes testes precisam provar
 * é que id malformado e board inexistente saem indistinguíveis *de ponta a ponta*. Mockar
 * `getBoard` faria os dois casos passarem pelo mesmo `null` combinado no próprio teste,
 * que continuaria verde mesmo se a rota voltasse a responder diferente para cada motivo.
 */
vi.mock("@/lib/db/client", () => ({
  getDbClient: () => ({ execute }),
}));

const { GET } = await import("./route");

const VALID_ID = "abcdefghijkl";
const MALFORMED_ID = "id-invalido!";

function get(id: string) {
  const request = new Request(`https://example.com/api/boards/${id}`);
  return GET(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  execute.mockReset();
});

describe("GET /api/boards/:id", () => {
  it("devolve o content do board quando ele existe", async () => {
    execute.mockResolvedValueOnce({ rows: [{ content: '{"version":1,"notes":[]}' }] });

    const response = await get(VALID_ID);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ content: { version: 1, notes: [] } });
  });

  it("responde 404 quando o board não existe", async () => {
    execute.mockResolvedValueOnce({ rows: [] });

    expect((await get(VALID_ID)).status).toBe(404);
  });

  it("responde 404 para id malformado, sem consultar o banco", async () => {
    expect((await get(MALFORMED_ID)).status).toBe(404);
    expect(execute).not.toHaveBeenCalled();
  });

  it("responde exatamente a mesma coisa para id inexistente e id malformado", async () => {
    execute.mockResolvedValueOnce({ rows: [] });
    const inexistente = await get(VALID_ID);
    const malformado = await get(MALFORMED_ID);

    expect(malformado.status).toBe(inexistente.status);
    expect(await malformado.json()).toEqual(await inexistente.json());
  });

  it("não vaza o motivo da indisponibilidade no corpo do 404", async () => {
    const body = JSON.stringify(await (await get(MALFORMED_ID)).json());

    expect(body).not.toMatch(/inválid|malformad|removid|expirad/i);
  });

  it("responde 500 tratado quando o banco falha, sem vazar o erro", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    execute.mockRejectedValueOnce(new Error("conexão recusada com o banco"));

    const response = await get(VALID_ID);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).not.toMatch(/conexão recusada/);

    consoleError.mockRestore();
  });
});
