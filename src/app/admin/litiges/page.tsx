import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DisputeResolvePanel } from "@/components/admin/dispute-resolve-panel";
import { listActiveHeroes } from "@/lib/admin/hero-admin";
import { getAuthContext } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { formatMatchFinalHealthScore } from "@/domain/matches/final-health";
import {
  listDisputedMatches,
  listProposalsForMatch,
} from "@/lib/matches/match-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Litiges · Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminDisputesPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/admin/litiges");
  }
  if (context.profile?.role !== "admin" || context.profile.status !== "active") {
    redirect("/tableau-de-bord");
  }

  const disputed = await listDisputedMatches();
  const heroes = await listActiveHeroes();
  const heroNameById = new Map(heroes.map((pHero) => [pHero.id, pHero.name]));
  const admin = createSupabaseAdminClient();

  const cards = await Promise.all(
    disputed.map(async (pItem) => {
      const proposals = await listProposalsForMatch(pItem.match.id);
      const heroIds = [
        ...new Set(proposals.flatMap((pProposal) => [pProposal.hero1Id, pProposal.hero2Id])),
      ];
      if (heroIds.length > 0) {
        const extra = await admin.from("heroes").select("id, name").in("id", heroIds);
        for (const row of (extra.data ?? []) as Array<{ id: string; name: string }>) {
          heroNameById.set(row.id, row.name);
        }
      }

      return {
        item: pItem,
        proposals: proposals.map((pProposal) => {
          const winnerPseudo =
            pProposal.winnerProfileId === null
              ? null
              : pProposal.winnerProfileId === pItem.player1.id
                ? pItem.player1.pseudo
                : pItem.player2.pseudo;
          return {
            id: pProposal.id,
            versionNumber: pProposal.versionNumber,
            label: `${heroNameById.get(pProposal.hero1Id) ?? "?"} vs ${heroNameById.get(pProposal.hero2Id) ?? "?"} · ${formatMatchFinalHealthScore(pProposal.player1RemainingHealth, pProposal.player2RemainingHealth)} · ${winnerPseudo ? `gagnant ${winnerPseudo}` : "match nul"}`,
            playedAt: pProposal.playedAt,
            hero1Id: pProposal.hero1Id,
            hero2Id: pProposal.hero2Id,
            winnerProfileId: pProposal.winnerProfileId,
            player1RemainingHealth: pProposal.player1RemainingHealth,
            player2RemainingHealth: pProposal.player2RemainingHealth,
            notes: pProposal.notes,
          };
        }),
      };
    }),
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/admin" className="text-sm text-zinc-600 hover:text-zinc-950">
          ← Administration
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Litiges</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Trancher les matchs en désaccord : valider une version, corriger, ou annuler.
        </p>
      </div>

      {cards.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          Aucun litige en cours.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {cards.map(({ item, proposals }) => (
            <article key={item.match.id} className="flex flex-col gap-4">
              <header>
                <h2 className="text-xl font-medium">
                  {item.player1.pseudo} vs {item.player2.pseudo}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Joué le {formatDate(item.proposal.playedAt)} ·{" "}
                  <Link href={`/mes-matchs/${item.match.id}`} className="underline hover:text-zinc-950">
                    voir le détail
                  </Link>
                </p>
              </header>
              <DisputeResolvePanel
                matchId={item.match.id}
                player1Id={item.player1.id}
                player2Id={item.player2.id}
                player1Pseudo={item.player1.pseudo}
                player2Pseudo={item.player2.pseudo}
                currentProposalId={item.match.currentProposalId ?? proposals[0]?.id ?? ""}
                proposals={proposals}
                heroes={heroes.map((pHero) => ({ id: pHero.id, label: pHero.name }))}
              />
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
