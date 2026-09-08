import { BoardNotFoundScreen } from "@/components/shell/BoardNotFoundScreen";

/** A mesma tela de link inválido (#47), devolvendo quem clicou para a home em português. */
export default function BoardNotFoundPt() {
  return <BoardNotFoundScreen home="/pt" locale="pt" />;
}
