import type { Metadata } from "next";
import Link from "next/link";

import { getHeroConfrontation, listHeroesForSelect } from "@/lib/stats/queries";

export const metadata: Metadata = {
  title: "Confrontation héros",
  description: "Comparer le face-à-face entre deux héros.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ a?: string; b?: string }>;
};

export default async function HeroConfrontationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const slugA = params.a ?? "";
  const slugB = params.b ?? "";

  let heroes: Awaited<ReturnType<typeof listHeroesForSelect>> = [];
  let view: Awaited<ReturnType<typeof getHeroConfrontation>> = null;
  let loadError: string | null = null;

  try {
    heroes = await listHeroesForSelect();
    if (slugA && slugB) {
      view = await getHeroConfrontation(slugA, slugB);
    }
  } catch (pError) {
    loadError = pError instanceof Error ? pError.message : "Chargement impossible.";
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Confrontation héros</h1>
        <p className="mt-2 text-zinc-600">
          Match-up direct entre deux héros.{" "}
          <Link href="/confrontations/joueurs" className="underline">
            Voir les joueurs
          </Link>
        </p>
      </header>

      <form className="grid gap-3 rounded-md border border-zinc-200 bg-white p-5 sm:grid-cols-3 sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Héros A</span>
          <select name="a" defaultValue={slugA} className="rounded-md border border-zinc-300 px-3 py-2">
            <option value="">Choisir…</option>
            {heroes.map((pHero) => (
              <option key={pHero.slug} value={pHero.slug}>
                {pHero.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Héros B</span>
          <select name="b" defaultValue={slugB} className="rounded-md border border-zinc-300 px-3 py-2">
            <option value="">Choisir…</option>
            {heroes.map((pHero) => (
              <option key={pHero.slug} value={pHero.slug}>
                {pHero.name}
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

      {view ? (
        <div className="flex flex-col gap-6">
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-zinc-200 bg-white p-4">
              <Link href={`/heros/${view.heroA.slug}`} className="text-lg font-semibold hover:underline">
                {view.heroA.name}
              </Link>
              <p className="mt-2 text-sm text-zinc-600">
                {view.winsA} victoires · {view.winRateALabel} ({view.matchesCount})
              </p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white p-4">
              <Link href={`/heros/${view.heroB.slug}`} className="text-lg font-semibold hover:underline">
                {view.heroB.name}
              </Link>
              <p className="mt-2 text-sm text-zinc-600">
                {view.winsB} victoires · {view.winRateBLabel} ({view.matchesCount})
              </p>
            </div>
          </section>

          <section className="rounded-md border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-medium">Joueurs concernés</h2>
            {view.players.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Aucun.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {view.players.map((pPlayer) => (
                  <li key={pPlayer.slug}>
                    <Link
                      href={`/joueurs/${pPlayer.slug}`}
                      className="rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-50"
                    >
                      {pPlayer.pseudo}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-md border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-medium">Derniers matchs</h2>
            {view.recentMatches.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Aucune confrontation.</p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-100 text-sm">
                {view.recentMatches.map((pMatch) => (
                  <li key={pMatch.id} className="py-2">
                    <Link href={`/matchs/${pMatch.id}`} className="font-medium hover:underline">
                      {pMatch.playedAt} · {pMatch.player1Pseudo} vs {pMatch.player2Pseudo}
                    </Link>
                    <p className="text-zinc-500">Vainqueur héros : {pMatch.winnerHeroName}</p>
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
