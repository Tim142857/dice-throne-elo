import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MatchActionsPanel } from "@/components/matches/match-actions-panel";
import { listActiveHeroes } from "@/lib/admin/hero-admin";
import { getAuthContext } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/dates";
import { mapHeroRow, type HeroDbRow } from "@/lib/mappers/hero";
import { getMatchDetails } from "@/lib/matches/match-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type MatchDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: MatchDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Match ${id.slice(0, 8)}` };
}

export default async function MyMatchDetailPage({ params }: MatchDetailPageProps) {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/mes-matchs");
  }
  if (!context.profile) {
    redirect("/tableau-de-bord");
  }

  const { id } = await params;
  let details;
  try {
    details = await getMatchDetails(id);
  } catch {
    notFound();
  }

  const isParticipant =
    context.profile.id === details.match.player1Id ||
    context.profile.id === details.match.player2Id;

  if (!isParticipant && context.profile.role !== "admin") {
    notFound();
  }

  const admin = createSupabaseAdminClient();
  const heroesResponse = await admin
    .from("heroes")
    .select("*")
    .in("id", [details.proposal.hero1Id, details.proposal.hero2Id]);

  if (heroesResponse.error) {
    throw new Error(heroesResponse.error.message);
  }

  const heroesById = new Map(
    ((heroesResponse.data ?? []) as HeroDbRow[]).map((pRow) => [pRow.id, mapHeroRow(pRow)]),
  );

  const activeHeroes = await listActiveHeroes();
  const isCreator = context.profile.id === details.match.createdByProfileId;
  const isOpponent =
    isParticipant && context.profile.id !== details.match.createdByProfileId;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/mes-matchs" className="text-sm text-zinc-600 hover:text-zinc-950">
          ← Mes matchs
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {details.player1.pseudo} vs {details.player2.pseudo}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">Statut : {details.match.status}</p>
      </div>

      <dl className="grid gap-3 rounded-md border border-zinc-200 bg-white p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Date jouée</dt>
          <dd className="font-medium">{formatDate(details.proposal.playedAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Vainqueur</dt>
          <dd className="font-medium">
            {details.proposal.winnerProfileId === details.player1.id
              ? details.player1.pseudo
              : details.player2.pseudo}{" "}
            ({details.proposal.winnerRemainingHealth} PV)
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">{details.player1.pseudo}</dt>
          <dd className="font-medium">
            {heroesById.get(details.proposal.hero1Id)?.name ?? "Héros"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">{details.player2.pseudo}</dt>
          <dd className="font-medium">
            {heroesById.get(details.proposal.hero2Id)?.name ?? "Héros"}
          </dd>
        </div>
        {details.proposal.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Notes</dt>
            <dd className="font-medium">{details.proposal.notes}</dd>
          </div>
        ) : null}
        {details.match.validatedAt ? (
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Validé le</dt>
            <dd className="font-medium">
              {formatDateTime(details.match.validatedAt)}
            </dd>
          </div>
        ) : null}
      </dl>

      <MatchActionsPanel
        matchId={details.match.id}
        status={details.match.status}
        isCreator={isCreator}
        isOpponent={isOpponent}
        proposal={details.proposal}
        player1Pseudo={details.player1.pseudo}
        player2Pseudo={details.player2.pseudo}
        heroes={activeHeroes.map((pHero) => ({ id: pHero.id, label: pHero.name }))}
      />
    </main>
  );
}
