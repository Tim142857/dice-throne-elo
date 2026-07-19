import Link from "next/link";

import { listGeneralRankings } from "@/lib/rankings/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let topPlayers: Awaited<ReturnType<typeof listGeneralRankings>> = [];
  try {
    topPlayers = (await listGeneralRankings({ sort: "rating" })).slice(0, 5);
  } catch {
    topPlayers = [];
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">Classement public</p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">Dice Throne Elo</h1>
        <p className="max-w-2xl text-lg leading-8 text-zinc-600">
          Déclarez vos matchs 1 contre 1, validez les résultats avec votre adversaire et consultez
          les classements Elo général et joueur–héros.
        </p>
      </header>

      <section className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/classements"
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          Voir les classements
        </Link>
        <Link
          href="/inscription"
          className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
        >
          Créer un compte
        </Link>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Top joueurs</h2>
          <Link href="/classements" className="text-sm text-zinc-600 hover:text-zinc-950">
            Tout voir
          </Link>
        </div>
        {topPlayers.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            Les classements apparaîtront après les premiers matchs validés.
          </p>
        ) : (
          <ol className="mt-4 divide-y divide-zinc-100">
            {topPlayers.map((pPlayer) => (
              <li key={pPlayer.profileId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-6 font-medium text-zinc-500">{pPlayer.rank}</span>
                  <Link href={`/joueurs/${pPlayer.slug}`} className="font-medium hover:underline">
                    {pPlayer.pseudo}
                  </Link>
                </div>
                <span>{pPlayer.ratingDisplay}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
