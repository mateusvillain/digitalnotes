import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * O ícone que o iOS usa quando alguém adiciona o quadro à tela inicial.
 *
 * Existe separado do favicon porque o iOS ignora SVG: sem este arquivo ele geraria um
 * quadrado com uma captura da página.
 *
 * A marca não é redesenhada aqui — é o próprio `icon.svg` embutido. Redesenhá-la em JSX
 * daria dois donos do mesmo desenho, e eles se separariam no primeiro ajuste de forma.
 *
 * O fundo escuro com a nota por dentro, e não a nota sangrando até a borda, porque o iOS
 * arredonda o ícone por conta própria: sangrando, a ponta dobrada — que fica justamente no
 * canto — seria a primeira coisa que o recorte comeria.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * A marca, lida do disco na hora do build — a raiz do projeto é o diretório de trabalho.
 *
 * Duas limpezas antes de embutir, porque o Satori (quem desenha esta imagem) é mais
 * restrito que um navegador: ele não engole o comentário XML antes do `<svg>`, e ignora
 * `clip-path`, o que faria o grupo inteiro sumir. O recorte é redundante aqui — ele corta
 * exatamente no `viewBox` —, então tirá-lo não muda o desenho.
 */
const ICON_SVG = readFileSync(join(process.cwd(), "src/app/icon.svg"), "utf8");
const MARK = ICON_SVG.slice(ICON_SVG.indexOf("<svg")).replace(/ clip-path="url\(#a\)"/, "");

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#27272a",
      }}
    >
      {/* `img` e não `next/image`: quem desenha aqui é o Satori, fora do navegador. */}
      <img
        width={124}
        height={124}
        alt=""
        src={`data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`}
      />
    </div>,
    size,
  );
}
