import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/layout/page-hero";
import { brandImages } from "@/lib/branding";
import { formatDate } from "@/lib/dates";
import { listGeneralRankings, type GeneralRankingSort } from "@/lib/rankings/queries";

export const metadata: Metadata = {
  title: "Classement général",
  description: "Classement Elo général des joueurs Dice Throne.",
};

export const dynamic = "force-dynamic";

type ClassementsPageProps = {
  searchParams: Promise<{ tri?: string; q?: string }>;
};

function parseSort(pValue: string | undefined): GeneralRankingSort {
  if (pValue === "winRate" || pValue === "matches" || pValue === "wins") {
    return pValue;
  }
  return "rating";
}

export default async function ClassementsPage({ searchParams }: ClassementsPageProps) {
  const params = await searchParams;
  const sort = parseSort(params.tri);
  const search = params.q ?? "";

  let rows: Awaited<ReturnType<typeof listGeneralRankings>> = [];
  let loadError: string | null = null;

  try {
    rows = await listGeneralRankings({ sort, search });
  } catch (pError) {
    loadError = pError instanceof Error ? pError.message : "Chargement impossible.";
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:py-14">
      <PageHero
        eyebrow="Classements"
        title="Classement général"
        description="Elo calculé sur les matchs validés. Les égalités utilisent la valeur décimale exacte (ex æquo en méthode compétition)."
        imageSrc={brandImages.diceAction}
      />
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/classements/joueurs-heros" className="font-semibold text-violet-700 underline">
          Classement joueur–héros
        </Link>
      </div>

      <form className="brand-card flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-violet-900">Recherche</span>
          <input
            name="q"
            defaultValue={search}
            placeholder="Pseudo"
            className="brand-input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-violet-900">Trier par</span>
          <select name="tri" defaultValue={sort} className="brand-input">
            <option value="rating">Elo</option>
            <option value="winRate">Taux de victoire</option>
            <option value="matches">Nombre de matchs</option>
            <option value="wins">Victoires</option>
          </select>
        </label>
        <button type="submit" className="btn-primary">
          Filtrer
        </button>
      </form>

      {loadError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Classement indisponible ({loadError}).
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          Aucun joueur classé pour le moment.
        </p>
      ) : (
        <div className="brand-card overflow-x-auto rounded-2xl">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-violet-50 text-xs tracking-wide text-violet-700 uppercase">
              <tr>
                <th className="px-3 py-3">Rang</th>
                <th className="px-3 py-3">Joueur</th>
                <th className="px-3 py-3">Elo</th>
                <th className="px-3 py-3">MJ</th>
                <th className="px-3 py-3">V</th>
                <th className="px-3 py-3">D</th>
                <th className="px-3 py-3">%V</th>
                <th className="px-3 py-3">Série</th>
                <th className="px-3 py-3">Adv.</th>
                <th className="px-3 py-3">Dernier</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((pRow) => (
                <tr key={pRow.profileId} className="border-t border-violet-100 even:bg-violet-50/40">
                  <td className="px-3 py-3">
                    <span className="rank-badge">{pRow.rank}</span>
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/joueurs/${pRow.slug}`} className="font-semibold text-violet-950 hover:text-violet-700">
                      {pRow.pseudo}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{pRow.ratingDisplay}</td>
                  <td className="px-3 py-3">{pRow.matchesCount}</td>
                  <td className="px-3 py-3">{pRow.winsCount}</td>
                  <td className="px-3 py-3">{pRow.lossesCount}</td>
                  <td className="px-3 py-3">{pRow.winRateLabel}</td>
                  <td className="px-3 py-3">{pRow.currentStreak}</td>
                  <td className="px-3 py-3">{pRow.distinctOpponents}</td>
                  <td className="px-3 py-3 text-zinc-600">
                    {pRow.lastValidatedMatchAt ? formatDate(pRow.lastValidatedMatchAt) : "—"}
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
