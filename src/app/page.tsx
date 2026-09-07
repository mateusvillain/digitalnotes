import { AppShell } from "@/components/shell/AppShell";

export default function Home() {
  return (
    <AppShell>
      <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-ink-muted">
        O quadro ainda não faz nada: pan e zoom chegam na issue #9, e os post-its na Epic de ciclo
        de vida.
      </p>
    </AppShell>
  );
}
