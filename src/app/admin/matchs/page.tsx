import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MatchStatus } from "@/types/domain";

export const metadata: Metadata = {
  title: "Matchs · Admin",
};

export const dynamic = "force-dynamic";

const tabs = [
  {
    key: "attente",
    label: "En attente",
    statuses: ["pendingOpponent", "pendingCreatorConfirmation"] as MatchStatus[],
  },
  { key: "litiges", label: "Litiges", statuses: ["disputed"] as MatchStatus[] },
  { key: "valides", label: "Validés", statuses: ["validated"] as MatchStatus[] },
  { key: "tous", label: "Tous", statuses: null },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const STATUS_LABELS: Record<string, string> = {
  pendingOpponent: "En attente adversaire",
  pendingCreatorConfirmation: "Correction à confirmer",
  disputed: "Litige",
  validated: "Validé",
  rejected: "Refusé",
  cancelled: "Annulé",
  cancelledByAdmin: "Annulé (admin)",
};

type PageProps = {
  searchParams: Promise<{ onglet?: string }>;
};

export default async function AdminMatchesPage({ searchParams }: PageProps) {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/admin/matchs");
  }
  if (context.profile?.role !== "admin" || context.profile.status !== "active") {
    redirect("/tableau-de-bord");
  }

  const params = await searchParams;
  const activeTab: TabKey =
    tabs.find((pTab) => pTab.key === params.onglet)?.key ?? "attente";
  const activeStatuses = tabs.find((pTab) => pTab.key === activeTab)?.statuses ?? null;

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("matches")
    .select("id, status, played_at, player1_id, player2_id, created_at, validated_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (activeStatuses) {
    query = query.in("status", activeStatuses);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    status: string;
    played_at: string;
    player1_id: string;
    player2_id: string;
    created_at: string;
    validated_at: string | null;
  }>;

  const countsResponse = await admin.from("matches").select("status");
  if (countsResponse.error) {
    throw new Error(countsResponse.error.message);
  }
  const allStatuses = ((countsResponse.data ?? []) as Array<{ status: string }>).map(
    (pRow) => pRow.status,
  );
  const countFor = (pStatuses: MatchStatus[] | null) => {
    if (!pStatuses) {
      return allStatuses.length;
    }
    return allStatuses.filter((pStatus) => pStatuses.includes(pStatus as MatchStatus)).length;
  };

  const profileIds = [...new Set(rows.flatMap((pRow) => [pRow.player1_id, pRow.player2_id]))];
  const profilesResponse =
    profileIds.length > 0
      ? await admin.from("profiles").select("id, pseudo").in("id", profileIds)
      : { data: [], error: null };

  if (profilesResponse.error) {
    throw new Error(profilesResponse.error.message);
  }

  const pseudoById = new Map(
    ((profilesResponse.data ?? []) as Array<{ id: string; pseudo: string }>).map((pRow) => [
      pRow.id,
      pRow.pseudo,
    ]),
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/admin" className="text-sm text-zinc-600 hover:text-zinc-950">
          ← Administration
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Matchs</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Consultation des matchs en attente, litiges et historique (100 derniers par filtre).
        </p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Filtres de matchs admin">
        {tabs.map((pTab) => {
          const isActive = pTab.key === activeTab;
          const count = countFor(pTab.statuses);
          return (
            <Link
              key={pTab.key}
              href={`/admin/matchs?onglet=${pTab.key}`}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "inline-flex min-h-10 items-center rounded-md bg-zinc-900 px-3 text-sm text-white"
                  : "inline-flex min-h-10 items-center rounded-md border border-zinc-300 px-3 text-sm text-zinc-700 hover:bg-zinc-50"
              }
            >
              {pTab.label} ({count})
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          Aucun match dans cet onglet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Joueurs</th>
                <th className="px-4 py-3 font-medium">Date jouée</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Lien</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((pRow) => (
                <tr key={pRow.id}>
                  <td className="px-4 py-3">
                    {pseudoById.get(pRow.player1_id) ?? "?"} vs{" "}
                    {pseudoById.get(pRow.player2_id) ?? "?"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(pRow.played_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        pRow.status === "pendingOpponent" ||
                        pRow.status === "pendingCreatorConfirmation"
                          ? "font-medium text-amber-800"
                          : pRow.status === "disputed"
                            ? "font-medium text-red-800"
                            : "text-zinc-700"
                      }
                    >
                      {STATUS_LABELS[pRow.status] ?? pRow.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/mes-matchs/${pRow.id}`}
                      className="font-medium underline hover:text-zinc-950"
                    >
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
