import { mapProfileRow, type ProfileDbRow } from "@/lib/mappers/account";
import { mapHeroRow, type HeroDbRow } from "@/lib/mappers/hero";
import {
  mapMatchProposalRow,
  mapMatchRow,
  type MatchDbRow,
  type MatchProposalDbRow,
} from "@/lib/mappers/match";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PublicValidatedMatch = {
  id: string;
  playedAt: string;
  player1: {
    id: string;
    pseudo: string;
    slug: string;
    heroName: string;
  };
  player2: {
    id: string;
    pseudo: string;
    slug: string;
    heroName: string;
  };
  winnerProfileId: string | null;
  player1RemainingHealth: number;
  player2RemainingHealth: number;
};

export async function listPublicValidatedMatches(
  pLimit = 50,
): Promise<PublicValidatedMatch[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "validated")
    .order("validated_at", { ascending: false })
    .limit(pLimit);

  if (error) {
    throw new Error(error.message);
  }

  const matches = ((data ?? []) as MatchDbRow[])
    .map(mapMatchRow)
    .filter((pMatch) => pMatch.currentProposalId);

  if (matches.length === 0) {
    return [];
  }

  const proposalIds = matches.map((pMatch) => pMatch.currentProposalId!);
  const profileIds = [...new Set(matches.flatMap((pMatch) => [pMatch.player1Id, pMatch.player2Id]))];

  const [proposalsResponse, profilesResponse] = await Promise.all([
    supabase.from("match_proposals").select("*").in("id", proposalIds),
    supabase.from("profiles").select("*").in("id", profileIds),
  ]);

  if (proposalsResponse.error) {
    throw new Error(proposalsResponse.error.message);
  }
  if (profilesResponse.error) {
    throw new Error(profilesResponse.error.message);
  }

  const proposalsById = new Map(
    ((proposalsResponse.data ?? []) as MatchProposalDbRow[]).map((pRow) => [
      pRow.id,
      mapMatchProposalRow(pRow),
    ]),
  );
  const profilesById = new Map(
    ((profilesResponse.data ?? []) as ProfileDbRow[]).map((pRow) => [
      pRow.id,
      mapProfileRow(pRow),
    ]),
  );

  const heroIds = [
    ...new Set(
      [...proposalsById.values()].flatMap((pProposal) => [pProposal.hero1Id, pProposal.hero2Id]),
    ),
  ];

  const heroesResponse = await supabase.from("heroes").select("*").in("id", heroIds);
  if (heroesResponse.error) {
    throw new Error(heroesResponse.error.message);
  }

  const heroesById = new Map(
    ((heroesResponse.data ?? []) as HeroDbRow[]).map((pRow) => [pRow.id, mapHeroRow(pRow)]),
  );

  const items: PublicValidatedMatch[] = [];

  for (const match of matches) {
    const proposal = proposalsById.get(match.currentProposalId!);
    const player1 = profilesById.get(match.player1Id);
    const player2 = profilesById.get(match.player2Id);
    const hero1 = proposal ? heroesById.get(proposal.hero1Id) : undefined;
    const hero2 = proposal ? heroesById.get(proposal.hero2Id) : undefined;

    if (!proposal || !player1 || !player2 || !hero1 || !hero2) {
      continue;
    }

    items.push({
      id: match.id,
      playedAt: proposal.playedAt,
      player1: {
        id: player1.id,
        pseudo: player1.pseudo,
        slug: player1.slug,
        heroName: hero1.name,
      },
      player2: {
        id: player2.id,
        pseudo: player2.pseudo,
        slug: player2.slug,
        heroName: hero2.name,
      },
      winnerProfileId: proposal.winnerProfileId,
      player1RemainingHealth: proposal.player1RemainingHealth,
      player2RemainingHealth: proposal.player2RemainingHealth,
    });
  }

  return items;
}
