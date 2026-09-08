import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const deleteEmptyBoards = vi.fn();

vi.mock("@/lib/db/boards", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/boards")>("@/lib/db/boards");
  return { ...actual, deleteEmptyBoards: () => deleteEmptyBoards() };
});

const { GET } = await import("./route");

const SECRET = "segredo-do-agendador";

function request(authorization?: string) {
  return new Request("https://example.com/api/cron/cleanup-boards", {
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  deleteEmptyBoards.mockReset();
  vi.stubEnv("CRON_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/cleanup-boards", () => {
  it("limpa e informa quantos boards apagou", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    deleteEmptyBoards.mockResolvedValueOnce({ deleted: 2 });

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: 2 });
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("2"));

    consoleLog.mockRestore();
  });

  it.each([
    ["sem cabeçalho", undefined],
    ["cabeçalho vazio", ""],
    ["segredo errado", "Bearer outro-segredo"],
    ["sem o prefixo Bearer", SECRET],
    ["segredo como prefixo do esperado", `Bearer ${SECRET.slice(0, -1)}`],
    ["outro esquema de autenticação", `Basic ${SECRET}`],
  ])("responde 401 e não apaga nada: %s", async (_caso, authorization) => {
    const response = await GET(request(authorization));

    expect(response.status).toBe(401);
    expect(deleteEmptyBoards).not.toHaveBeenCalled();
  });

  it("aceita o esquema em minúsculas, que a RFC 7235 declara case-insensitive", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    deleteEmptyBoards.mockResolvedValueOnce({ deleted: 0 });

    const response = await GET(request(`bearer ${SECRET}`));

    expect(response.status).toBe(200);

    consoleLog.mockRestore();
  });

  it("recusa a limpeza quando CRON_SECRET não está configurada", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(401);
    expect(deleteEmptyBoards).not.toHaveBeenCalled();
  });

  it("responde 500 quando a limpeza falha", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    deleteEmptyBoards.mockRejectedValueOnce(new Error("conexão recusada"));

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(500);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
