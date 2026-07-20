import { Spinner } from "@/components/layout/spinner";

export function PageLoading() {
  return (
    <main
      aria-live="polite"
      aria-busy="true"
      className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-4 px-6 py-24"
    >
      <Spinner className="size-10" />
      <p className="text-sm font-medium text-brand-muted">Chargement de la page…</p>
    </main>
  );
}
