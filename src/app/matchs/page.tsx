import type { Metadata } from "next";

import { ValidatedMatchCard } from "@/components/matches/validated-match-card";
import { listPublicValidatedMatches } from "@/lib/matches/public-matches";

export const metadata: Metadata = {
  title: "Matchs",
  description: "Historique public des matchs validés Dice Throne Elo.",
};

export const dynamic = "force-dynamic";

export default async function PublicMatchesPage() {
  let items: Awaited<ReturnType<typeof listPublicValidatedMatches>> = [];
  let loadError: string | null = null;

  try {
    items = await listPublicValidatedMatches();
  } catch (pError) {
    loadError = pError instanceof Error ? pError.message : "Chargement impossible.";
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Matchs validés</h1>
        <p className="mt-2 text-zinc-600">Historique public, du plus récent au plus ancien.</p>
      </header>

      {loadError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Historique indisponible tant que Supabase n’est pas configuré ({loadError}).
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          Aucun match validé pour le moment.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((pItem) => (
            <li key={pItem.id}>
              <ValidatedMatchCard match={pItem} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
