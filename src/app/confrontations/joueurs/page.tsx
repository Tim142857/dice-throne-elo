import type { Metadata } from "next";
import Link from "next/link";

import {
  getPlayerConfrontation,
  listPublicPlayersForSelect,
} from "@/lib/stats/queries";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Confrontation joueurs",
  description: "Comparer le face-à-face entre deux joueurs.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ a?: string; b?: string }>;
};

export default async function PlayerConfrontationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const slugA = params.a ?? "";
  const slugB = params.b ?? "";

  let players: Awaited<ReturnType<typeof listPublicPlayersForSelect>> = [];
  let view: Awaited<ReturnType<typeof getPlayerConfrontation>> = null;
  let loadError: string | null = null;

  try {
    players = await listPublicPlayersForSelect();
    if (slugA && slugB) {
      view = await getPlayerConfrontation(slugA, slugB);
    }
  } catch (pError) {
    loadError = pError instanceof Error ? pError.message : "Chargement impossible.";
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Confrontation joueurs</h1>
        <p className="mt-2 text-zinc-600">
          Historique, héros utilisés et Elo cumulé entre deux profils.{" "}
          <Link href="/confrontations/heros" className="underline">
            Voir les héros
          </Link>
        </p>
      </header>

      <form className="grid gap-3 rounded-md border border-zinc-200 bg-white p-5 sm:grid-cols-3 sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Joueur A</span>
          <select name="a" defaultValue={slugA} className="rounded-md border border-zinc-300 px-3 py-2">
            <option value="">Choisir…</option>
            {players.map((pPlayer) => (
              <option key={pPlayer.slug} value={pPlayer.slug}>
                {pPlayer.pseudo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Joueur B</span>
          <select name="b" defaultValue={slugB} className="rounded-md border border-zinc-300 px-3 py-2">
            <option value="">Choisir…</option>
            {players.map((pPlayer) => (
              <option key={pPlayer.slug} value={pPlayer.slug}>
                {pPlayer.pseudo}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Comparer
        </button>
      </form>

      {loadError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
        </p>
      ) : null}

      {slugA && slugB && !view && !loadError ? (
        <p className="text-sm text-zinc-600">Impossible de charger cette confrontation.</p>
      ) : null}

      {view ? (
        <div className="flex flex-col gap-6">
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-zinc-200 bg-white p-4">
              <Link href={`/joueurs/${view.playerA.slug}`} className="text-lg font-semibold hover:underline">
                {view.playerA.pseudo}
              </Link>
              <p className="mt-2 text-sm text-zinc-600">
                {view.winsA} victoires · {view.winRateALabel}
              </p>
              <p
                className={`mt-1 text-sm font-medium ${view.eloDeltaA >= 0 ? "text-elo-gain" : "text-elo-loss"}`}
              >
                Elo cumulé : {view.eloDeltaA >= 0 ? "+" : ""}
                {Math.round(view.eloDeltaA * 10) / 10}
              </p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white p-4">
              <Link href={`/joueurs/${view.playerB.slug}`} className="text-lg font-semibold hover:underline">
                {view.playerB.pseudo}
              </Link>
              <p className="mt-2 text-sm text-zinc-600">
                {view.winsB} victoires · {view.winRateBLabel}
              </p>
              <p
                className={`mt-1 text-sm font-medium ${view.eloDeltaB >= 0 ? "text-elo-gain" : "text-elo-loss"}`}
              >
                Elo cumulé : {view.eloDeltaB >= 0 ? "+" : ""}
                {Math.round(view.eloDeltaB * 10) / 10}
              </p>
            </div>
          </section>

          <p className="text-sm text-zinc-600">{view.matchesCount} matchs validés entre eux.</p>

          <section className="grid gap-6 lg:grid-cols-2">
            <HeroUsage title={`Héros de ${view.playerA.pseudo}`} rows={view.heroesA} />
            <HeroUsage title={`Héros de ${view.playerB.pseudo}`} rows={view.heroesB} />
          </section>

          <section className="rounded-md border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-medium">Derniers résultats</h2>
            {view.recentMatches.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Aucun match.</p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-100 text-sm">
                {view.recentMatches.map((pMatch) => (
                  <li key={pMatch.id} className="py-2">
                    <Link href={`/matchs#match-${pMatch.id}`} className="font-medium hover:underline">
                      {formatDate(pMatch.playedAt)} · vainqueur {pMatch.winnerPseudo}
                    </Link>
                    <p className="text-zinc-500">
                      {pMatch.heroAName} vs {pMatch.heroBName}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}

function HeroUsage({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ name: string; slug: string; matchesCount: number }>;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Aucun héros.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100 text-sm">
          {rows.map((pRow) => (
            <li key={pRow.slug} className="flex justify-between gap-3 py-2">
              <Link href={`/heros/${pRow.slug}`} className="hover:underline">
                {pRow.name}
              </Link>
              <span className="text-zinc-500">{pRow.matchesCount}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
