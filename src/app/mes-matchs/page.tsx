import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { listMatchesForProfile } from "@/lib/matches/match-service";
import type { MatchStatus } from "@/types/domain";

export const metadata: Metadata = {
  title: "Mes matchs",
};

export const dynamic = "force-dynamic";

const tabs: Array<{ key: string; label: string; statuses: MatchStatus[] }> = [
  {
    key: "a-valider",
    label: "À valider",
    statuses: ["pendingOpponent"],
  },
  {
    key: "en-attente",
    label: "En attente",
    statuses: ["pendingOpponent", "pendingCreatorConfirmation"],
  },
  { key: "valides", label: "Validés", statuses: ["validated"] },
  { key: "refuses", label: "Refusés", statuses: ["rejected"] },
  { key: "litiges", label: "Litiges", statuses: ["disputed"] },
];

type MesMatchsPageProps = {
  searchParams: Promise<{ onglet?: string }>;
};

function statusLabel(pStatus: MatchStatus): string {
  switch (pStatus) {
    case "pendingOpponent":
      return "En attente adversaire";
    case "pendingCreatorConfirmation":
      return "Correction à confirmer";
    case "validated":
      return "Validé";
    case "rejected":
      return "Refusé";
    case "disputed":
      return "Litige";
    case "cancelled":
      return "Annulé";
    case "cancelledByAdmin":
      return "Annulé (admin)";
    default:
      return pStatus;
  }
}

export default async function MyMatchesPage({ searchParams }: MesMatchsPageProps) {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/mes-matchs");
  }
  if (!context.profile) {
    redirect("/tableau-de-bord");
  }

  const params = await searchParams;
  const activeTab = tabs.find((pTab) => pTab.key === params.onglet) ?? tabs[0]!;
  const matches = await listMatchesForProfile(context.profile.id);

  const filtered = matches.filter((pItem) => {
    if (!activeTab.statuses.includes(pItem.match.status)) {
      return false;
    }
    if (activeTab.key === "a-valider") {
      return (
        pItem.match.status === "pendingOpponent" &&
        pItem.match.createdByProfileId !== context.profile!.id
      );
    }
    if (activeTab.key === "en-attente") {
      return (
        (pItem.match.status === "pendingOpponent" &&
          pItem.match.createdByProfileId === context.profile!.id) ||
        (pItem.match.status === "pendingCreatorConfirmation" &&
          pItem.match.createdByProfileId === context.profile!.id)
      );
    }
    return true;
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Mes matchs</h1>
        {context.profile.status === "active" ? (
          <Link
            href="/matchs/nouveau"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Nouveau match
          </Link>
        ) : null}
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Filtres de matchs">
        {tabs.map((pTab) => {
          const isActive = pTab.key === activeTab.key;
          return (
            <Link
              key={pTab.key}
              href={`/mes-matchs?onglet=${pTab.key}`}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "inline-flex min-h-11 items-center rounded-md bg-zinc-900 px-3 text-sm text-white"
                  : "inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm text-zinc-700 hover:bg-zinc-50"
              }
            >
              {pTab.label}
            </Link>
          );
        })}
      </nav>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          Aucun match dans cet onglet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((pItem) => (
            <li key={pItem.match.id}>
              <Link
                href={`/mes-matchs/${pItem.match.id}`}
                className="block rounded-md border border-zinc-200 bg-white px-4 py-3 hover:bg-zinc-50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-zinc-950">
                    {pItem.player1.pseudo} vs {pItem.player2.pseudo}
                  </p>
                  <span className="text-xs text-zinc-500">{statusLabel(pItem.match.status)}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-600">
                  Joué le {formatDate(pItem.proposal.playedAt)} · vainqueur{" "}
                  {pItem.proposal.winnerProfileId === pItem.player1.id
                    ? pItem.player1.pseudo
                    : pItem.player2.pseudo}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
