import type { Metadata } from "next";
import Link from "next/link";

import { listHeroStats } from "@/lib/stats/queries";

export const metadata: Metadata = {
  title: "Héros",
  description: "Statistiques publiques des héros Dice Throne.",
};

export const dynamic = "force-dynamic";

type HeroesPageProps = {
  searchParams: Promise<{ min?: string }>;
};

export default async function HeroesPublicPage({ searchParams }: HeroesPageProps) {
  const params = await searchParams;
  const minMatches = Math.max(0, Number(params.min || 0) || 0);

  let rows: Awaited<ReturnType<typeof listHeroStats>> = [];
  let loadError: string | null = null;

  try {
    rows = await listHeroStats();
  } catch (pError) {
    loadError = pError instanceof Error ? pError.message : "Chargement impossible.";
  }

  const filtered = rows
    .filter((pRow) => pRow.matchesCount >= minMatches)
    .sort((pLeft, pRight) => pRight.matchesCount - pLeft.matchesCount);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Héros</h1>
        <p className="text-zinc-600">
          Popularité, taux de victoire et accessibilité.{" "}
          <Link href="/confrontations/heros" className="font-medium underline">
            Comparer deux héros
          </Link>
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Matchs minimum</span>
          <input
            name="min"
            type="number"
            min={0}
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
          Stats indisponibles ({loadError}).
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          Aucun héros ne correspond au filtre.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                <th className="px-3 py-3">Héros</th>
                <th className="px-3 py-3">MJ</th>
                <th className="px-3 py-3">V</th>
                <th className="px-3 py-3">D</th>
                <th className="px-3 py-3">%V</th>
                <th className="px-3 py-3">Joueurs</th>
                <th className="px-3 py-3">Popularité</th>
                <th className="px-3 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pRow) => (
                <tr key={pRow.id} className="border-t border-zinc-200">
                  <td className="px-3 py-3">
                    <Link href={`/heros/${pRow.slug}`} className="font-medium hover:underline">
                      {pRow.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{pRow.matchesCount}</td>
                  <td className="px-3 py-3">{pRow.winsCount}</td>
                  <td className="px-3 py-3">{pRow.lossesCount}</td>
                  <td className="px-3 py-3">
                    {pRow.winRateLabel}
                    <span className="text-zinc-400"> ({pRow.matchesCount})</span>
                  </td>
                  <td className="px-3 py-3">{pRow.distinctPlayers}</td>
                  <td className="px-3 py-3">
                    {Math.round(pRow.popularityShare * 1000) / 10} %
                  </td>
                  <td className="px-3 py-3">
                    {pRow.isActive ? (
                      <span className="text-emerald-700">Actif</span>
                    ) : (
                      <span className="text-zinc-500">Inactif</span>
                    )}
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
