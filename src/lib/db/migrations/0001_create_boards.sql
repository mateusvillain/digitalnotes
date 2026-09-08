-- Tabela única de whiteboards compartilhados (issue #43).
--
-- O backend armazena `content` como veio, sem conhecer sua estrutura interna — quem
-- valida o formato do board é o próprio frontend (lib/board/schema.ts).
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
