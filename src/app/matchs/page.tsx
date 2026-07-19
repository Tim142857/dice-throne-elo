import type { Metadata } from "next";
import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapMatchRow, mapMatchProposalRow, type MatchDbRow, type MatchProposalDbRow } from "@/lib/mappers/match";
import { mapProfileRow, type ProfileDbRow } from "@/lib/mappers/account";

export const metadata: Metadata = {
  title: "Matchs",
  description: "Historique public des matchs validés Dice Throne Elo.",
};

export const dynamic = "force-dynamic";

export default async function PublicMatchesPage() {
  const items: Array<{
    id: string;
    playedAt: string;
    player1: string;
    player2: string;
    winner: string;
  }> = [];
  let loadError: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("status", "validated")
      .order("validated_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      const match = mapMatchRow(row as MatchDbRow);
      if (!match.currentProposalId) {
        continue;
      }
      const [proposalResponse, p1Response, p2Response] = await Promise.all([
        supabase.from("match_proposals").select("*").eq("id", match.currentProposalId).single(),
        supabase.from("profiles").select("*").eq("id", match.player1Id).single(),
        supabase.from("profiles").select("*").eq("id", match.player2Id).single(),
      ]);
      if (proposalResponse.error || p1Response.error || p2Response.error) {
        continue;
      }
      const proposal = mapMatchProposalRow(proposalResponse.data as MatchProposalDbRow);
      const player1 = mapProfileRow(p1Response.data as ProfileDbRow);
      const player2 = mapProfileRow(p2Response.data as ProfileDbRow);
      items.push({
        id: match.id,
        playedAt: proposal.playedAt,
        player1: player1.pseudo,
        player2: player2.pseudo,
        winner:
          proposal.winnerProfileId === player1.id ? player1.pseudo : player2.pseudo,
      });
    }
  } catch (pError) {
    loadError = pError instanceof Error ? pError.message : "Chargement impossible.";
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Matchs validés</h1>
        <p className="mt-2 text-zinc-600">Historique public, du plus récent au plus ancien.</p>
      </header>

      {loadError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Historique indisponible tant que Supabase n’est pas configuré ({loadError}).
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          Aucun match validé pour le moment.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
          {items.map((pItem) => (
            <li key={pItem.id} className="px-4 py-3">
              <Link href={`/matchs/${pItem.id}`} className="block hover:bg-zinc-50">
                <p className="font-medium text-zinc-950">
                  {pItem.player1} vs {pItem.player2}
                </p>
                <p className="text-sm text-zinc-600">
                  {pItem.playedAt} · vainqueur {pItem.winner}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
