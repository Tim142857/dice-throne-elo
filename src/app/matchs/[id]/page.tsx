import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { mapProfileRow, type ProfileDbRow } from "@/lib/mappers/account";
import { mapHeroRow, type HeroDbRow } from "@/lib/mappers/hero";
import {
  mapMatchProposalRow,
  mapMatchRow,
  type MatchDbRow,
  type MatchProposalDbRow,
} from "@/lib/mappers/match";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { HeroRow, MatchProposalRow, MatchRow, ProfileRow } from "@/types/database";

type PublicMatchPageProps = {
  params: Promise<{ id: string }>;
};

type PublicMatchView = {
  match: MatchRow;
  proposal: MatchProposalRow;
  player1: ProfileRow;
  player2: ProfileRow;
  heroesById: Map<string, HeroRow>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PublicMatchPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Match ${id.slice(0, 8)}` };
}

async function loadValidatedMatch(pMatchId: string): Promise<PublicMatchView | null> {
  const supabase = await createSupabaseServerClient();
  const matchResponse = await supabase
    .from("matches")
    .select("*")
    .eq("id", pMatchId)
    .eq("status", "validated")
    .maybeSingle();

  if (matchResponse.error || !matchResponse.data) {
    return null;
  }

  const match = mapMatchRow(matchResponse.data as MatchDbRow);
  if (!match.currentProposalId) {
    return null;
  }

  const [proposalResponse, p1Response, p2Response] = await Promise.all([
    supabase.from("match_proposals").select("*").eq("id", match.currentProposalId).single(),
    supabase.from("profiles").select("*").eq("id", match.player1Id).single(),
    supabase.from("profiles").select("*").eq("id", match.player2Id).single(),
  ]);

  if (proposalResponse.error || p1Response.error || p2Response.error) {
    return null;
  }

  const proposal = mapMatchProposalRow(proposalResponse.data as MatchProposalDbRow);
  const player1 = mapProfileRow(p1Response.data as ProfileDbRow);
  const player2 = mapProfileRow(p2Response.data as ProfileDbRow);

  const heroesResponse = await supabase
    .from("heroes")
    .select("*")
    .in("id", [proposal.hero1Id, proposal.hero2Id]);

  const heroesById = new Map(
    ((heroesResponse.data ?? []) as HeroDbRow[]).map((pRow) => [pRow.id, mapHeroRow(pRow)]),
  );

  return { match, proposal, player1, player2, heroesById };
}

export default async function PublicMatchDetailPage({ params }: PublicMatchPageProps) {
  const { id } = await params;
  let view: PublicMatchView | null = null;

  try {
    view = await loadValidatedMatch(id);
  } catch {
    notFound();
  }

  if (!view) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <Link href="/matchs" className="text-sm text-zinc-600 hover:text-zinc-950">
        ← Matchs validés
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">
        {view.player1.pseudo} vs {view.player2.pseudo}
      </h1>
      <dl className="grid gap-3 rounded-md border border-zinc-200 bg-white p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Date</dt>
          <dd className="font-medium">{view.proposal.playedAt}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Vainqueur</dt>
          <dd className="font-medium">
            {view.proposal.winnerProfileId === view.player1.id
              ? view.player1.pseudo
              : view.player2.pseudo}{" "}
            ({view.proposal.winnerRemainingHealth} PV)
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">{view.player1.pseudo}</dt>
          <dd className="font-medium">{view.heroesById.get(view.proposal.hero1Id)?.name}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">{view.player2.pseudo}</dt>
          <dd className="font-medium">{view.heroesById.get(view.proposal.hero2Id)?.name}</dd>
        </div>
      </dl>
    </main>
  );
}
