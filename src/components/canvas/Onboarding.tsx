"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { MOD_KEY, ONBOARDING, type OnboardingIcon } from "@/lib/i18n/onboarding";
import { useIsMac } from "@/lib/dom/useIsMac";
import { useTouchPrimary } from "@/lib/dom/useTouchPrimary";

/** Traço comum a todos os desenhos, igual ao dos ícones dos controles. */
const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Post-it com um `+`: o que o toque duplo produz. */
function NoteIcon() {
  return (
    <>
      <path d="M3.5 5A1.5 1.5 0 0 1 5 3.5h8A1.5 1.5 0 0 1 14.5 5v6L11 14.5H5A1.5 1.5 0 0 1 3.5 13z" />
      <path d="M14.5 11H12a1 1 0 0 0-1 1v2.5" />
      <path d="M18.5 15v6M15.5 18h6" />
    </>
  );
}

/** Setas para os quatro lados: navegar é mover o quadro, não um objeto dele. */
function MoveIcon() {
  return (
    <>
      <path d="M12 4v16M4 12h16" />
      <path d="M12 4 9.8 6.2M12 4l2.2 2.2M12 20l-2.2-2.2M12 20l2.2-2.2" />
      <path d="M4 12l2.2-2.2M4 12l2.2 2.2M20 12l-2.2-2.2M20 12l-2.2 2.2" />
    </>
  );
}

/** Lupa com `+`: ampliar. */
function ZoomIcon() {
  return (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 20.5 20.5" />
      <path d="M10.5 8v5M8 10.5h5" />
    </>
  );
}

const ICONS: Record<OnboardingIcon, () => React.JSX.Element> = {
  note: NoteIcon,
  move: MoveIcon,
  zoom: ZoomIcon,
};

function Icon({ name }: { name: OnboardingIcon }) {
  const Shape = ICONS[name];

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 text-ink-muted"
      {...strokeProps}
      aria-hidden="true"
    >
      <Shape />
    </svg>
  );
}

/**
 * Uma tecla desenhada como tecla.
 *
 * `<kbd>` e não `<span>`: é o elemento que existe para isto, e é o que faz um leitor de
 * tela anunciar "N" como entrada de teclado em vez de ler a letra solta no meio da frase.
 */
function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-note border border-border bg-surface px-1.5 font-mono text-xs text-ink shadow-control">
      {children}
    </kbd>
  );
}

/**
 * A apresentação que ocupa o quadro vazio.
 *
 * O quadro não tem barra de ferramentas nem menu: quem chega vê uma superfície em branco e
 * nenhuma pista do que fazer com ela. Estas três linhas são essa pista, e por isso vivem no
 * lugar onde a ação acontece — no meio do canvas — em vez de num balão preso a um botão
 * que não existe.
 *
 * `pointer-events-none` no invólucro é o detalhe que faz a peça funcionar: o quadro
 * continua clicável por baixo dela, então o duplo clique que cria o primeiro post-it (e a
 * dispensa) pode ser dado em cima do texto sem ser engolido.
 *
 * Quem decide se ela aparece é o quadro, e não este componente: a condição é o estado do
 * board, que é assunto de lá.
 */
export function Onboarding() {
  const locale = useLocale();
  const touchPrimary = useTouchPrimary();
  const isMac = useIsMac();
  const copy = ONBOARDING[locale];

  return (
    <div
      data-testid="onboarding"
      className="pointer-events-none absolute inset-0 flex items-center justify-center p-6"
    >
      <div className="onboarding-enter flex flex-col items-center gap-7 text-center">
        <div className="flex flex-col gap-1 font-handwritten">
          {/*
            `h2` e não `h1`: o `h1` da moldura já nomeia a página, e um segundo título de
            mesmo nível quebraria a hierarquia que o leitor de tela usa para navegar.
          */}
          <h2 className="text-xl text-ink">{copy.title}</h2>
          <p className="text-base text-ink-muted">{copy.subtitle}</p>
        </div>

        {/*
          Duas colunas: o que a ação faz à esquerda, como se faz à direita.
          O nome vem primeiro porque é por ele que se procura — quem quer criar uma nota
          varre a coluna da esquerda até achar "Nota" e só então olha a tecla. As teclas
          ficam encostadas à direita para formarem uma coluna própria, alinhada pela borda
          de dentro, em vez de uma serrilha de larguras diferentes.
        */}
        <ul className="flex w-full max-w-xs flex-col gap-3">
          {touchPrimary
            ? copy.touch.map((hint) => (
                <li key={hint.icon} className="flex items-center justify-between gap-6">
                  {/*
                    Mesma leitura da versão de teclado: o que a ação faz à esquerda, como se
                    faz à direita. Invertido, o dedo leria ao contrário do teclado — e é a
                    mesma pessoa trocando de aparelho.
                  */}
                  <span className="font-handwritten text-base text-ink">{hint.label}</span>
                  <span className="flex items-center gap-2 text-ink-muted">
                    <span className="font-handwritten text-sm">{hint.gesture}</span>
                    <Icon name={hint.icon} />
                  </span>
                </li>
              ))
            : copy.shortcuts.map((hint) => (
                <li key={hint.label} className="flex items-center justify-between gap-6">
                  <span className="font-handwritten text-base text-ink">{hint.label}</span>
                  <span className="flex items-center gap-1.5">
                    {hint.keys.map((key, index) => (
                      <span key={key} className="flex items-center gap-1.5">
                        {/* O `+` entre as teclas: elas se apertam juntas, não em sequência. */}
                        {index === 0 ? null : <span className="text-xs text-ink-muted">+</span>}
                        <Key>{key === MOD_KEY ? (isMac ? "⌘" : "Ctrl") : key}</Key>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
        </ul>
      </div>
    </div>
  );
}
