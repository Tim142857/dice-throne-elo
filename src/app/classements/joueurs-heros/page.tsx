import type { Metadata } from "next";
import Link from "next/link";

import { listPlayerHeroRankings } from "@/lib/rankings/queries";

export const metadata: Metadata = {
  title: "Classement joueur–héros",
  description: "Classement Elo des combinaisons joueur–héros.",
};

export const dynamic = "force-dynamic";

type PlayerHeroRankingsPageProps = {
  searchParams: Promise<{ q?: string; min?: string }>;
};

export default async function PlayerHeroRankingsPage({
  searchParams,
}: PlayerHeroRankingsPageProps) {
  const params = await searchParams;
  const search = params.q ?? "";
  const minMatches = Math.max(1, Number(params.min || 1) || 1);

  let rows: Awaited<ReturnType<typeof listPlayerHeroRankings>> = [];
  let loadError: string | null = null;

  try {
    rows = await listPlayerHeroRankings({ search, minMatches });
  } catch (pError) {
    loadError = pError instanceof Error ? pError.message : "Chargement impossible.";
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <Link href="/classements" className="text-sm text-zinc-600 hover:text-zinc-950">
          ← Classement général
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Classement joueur–héros</h1>
        <p className="text-zinc-600">
          Une combinaison apparaît après au moins un match validé. Coefficient K = 40.
        </p>
      </header>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Recherche</span>
          <input
            name="q"
            defaultValue={search}
            placeholder="Joueur ou héros"
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Matchs min.</span>
          <input
            name="min"
            type="number"
            min={1}
            defaultValue={minMatches}
            className="w-28 rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Filtrer
        </button>
      </form>

      {loadError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Classement indisponible ({loadError}).
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          Aucune combinaison classée.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                <th className="px-3 py-3">Rang</th>
                <th className="px-3 py-3">Joueur</th>
                <th className="px-3 py-3">Héros</th>
                <th className="px-3 py-3">Elo</th>
                <th className="px-3 py-3">MJ</th>
                <th className="px-3 py-3">V</th>
                <th className="px-3 py-3">D</th>
                <th className="px-3 py-3">%V</th>
                <th className="px-3 py-3">Dernière</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((pRow) => (
                <tr key={`${pRow.profileId}-${pRow.heroId}`} className="border-t border-zinc-200">
                  <td className="px-3 py-3 font-medium">{pRow.rank}</td>
                  <td className="px-3 py-3">
                    <Link href={`/joueurs/${pRow.playerSlug}`} className="hover:underline">
                      {pRow.pseudo}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/heros/${pRow.heroSlug}`} className="hover:underline">
                      {pRow.heroName}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{pRow.ratingDisplay}</td>
                  <td className="px-3 py-3">{pRow.matchesCount}</td>
                  <td className="px-3 py-3">{pRow.winsCount}</td>
                  <td className="px-3 py-3">{pRow.lossesCount}</td>
                  <td className="px-3 py-3">{pRow.winRateLabel}</td>
                  <td className="px-3 py-3 text-zinc-600">
                    {pRow.lastUsedAt
                      ? new Date(pRow.lastUsedAt).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
