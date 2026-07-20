import Image from "next/image";
import Link from "next/link";

import { brandImages } from "@/lib/branding";
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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-10 lg:py-14">
      <section className="brand-hero relative overflow-hidden rounded-[2rem] px-8 py-10 text-white shadow-2xl shadow-violet-900/20 lg:px-12 lg:py-14">
        <div className="absolute inset-0 opacity-25">
          <Image
            src={brandImages.heroAdventures}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
        <div className="relative z-10 flex max-w-3xl flex-col gap-5">
          <div className="flex items-center gap-4">
            <Image
              src={brandImages.logo}
              alt="Dice Throne"
              width={80}
              height={80}
              className="rounded-2xl bg-white/10 p-2 ring-1 ring-white/25 backdrop-blur"
              priority
            />
            <div>
              <p className="text-sm font-semibold tracking-[0.22em] text-amber-200 uppercase">
                Classement public
              </p>
              <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Dice Throne Elo</h1>
            </div>
          </div>
          <p className="text-lg leading-8 text-violet-100">
            Déclarez vos matchs 1 contre 1, validez les résultats avec votre adversaire et
            consultez les classements Elo général et joueur–héros.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/classements" className="btn-primary min-h-11 px-6">
              Voir les classements
            </Link>
            <Link href="/inscription" className="btn-secondary min-h-11 px-6 text-violet-900">
              Créer un compte
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="brand-card rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-violet-950">Top joueurs</h2>
            <Link href="/classements" className="text-sm font-medium text-violet-700 hover:text-violet-950">
              Tout voir
            </Link>
          </div>
          {topPlayers.length === 0 ? (
            <p className="mt-4 text-sm text-brand-muted">
              Les classements apparaîtront après les premiers matchs validés.
            </p>
          ) : (
            <ol className="mt-5 divide-y divide-violet-100">
              {topPlayers.map((pPlayer) => (
                <li key={pPlayer.profileId} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="rank-badge">{pPlayer.rank}</span>
                    <Link
                      href={`/joueurs/${pPlayer.slug}`}
                      className="font-semibold text-violet-950 hover:text-violet-700"
                    >
                      {pPlayer.pseudo}
                    </Link>
                  </div>
                  <span className="font-mono font-semibold text-violet-800">{pPlayer.ratingDisplay}</span>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="brand-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-violet-950">Comment ça marche</h2>
          <ol className="mt-5 space-y-4 text-sm leading-6 text-brand-muted">
            <li className="rounded-xl bg-violet-50 px-4 py-3">
              <span className="font-semibold text-violet-900">1.</span> Inscrivez-vous et faites
              valider votre compte.
            </li>
            <li className="rounded-xl bg-amber-50 px-4 py-3">
              <span className="font-semibold text-amber-900">2.</span> Déclarez un match avec votre
              adversaire.
            </li>
            <li className="rounded-xl bg-rose-50 px-4 py-3">
              <span className="font-semibold text-rose-900">3.</span> Validez ensemble et suivez
              votre Elo.
            </li>
          </ol>
          <Link href="/matchs" className="btn-secondary mt-6 w-full">
            Explorer les matchs
          </Link>
        </article>
      </section>
    </main>
  );
}
