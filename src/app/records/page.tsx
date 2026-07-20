import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/layout/page-hero";
import { formatEloDisplay } from "@/domain/elo/calculate";
import { brandImages } from "@/lib/branding";
import { formatDate } from "@/lib/dates";
import { listPublicRecords } from "@/lib/records/service";

export const metadata: Metadata = {
  title: "Records",
  description: "Records compétitifs Dice Throne Elo : séries, Elo, PV et rivalités.",
};

export const dynamic = "force-dynamic";

const ELO_RECORD_CODES = new Set([
  "highest_elo",
  "best_ten_match_progression",
  "largest_single_elo_gain",
  "biggest_upset",
]);

function formatRecordValue(pCode: string, pValue: number): string {
  if (ELO_RECORD_CODES.has(pCode)) {
    return formatEloDisplay(pValue);
  }
  if (pCode === "closest_win" || pCode === "largest_win") {
    return `${pValue} PV`;
  }
  return String(pValue);
}

export default async function RecordsPage() {
  let records: Awaited<ReturnType<typeof listPublicRecords>> = [];
  let loadError: string | null = null;

  try {
    records = await listPublicRecords();
  } catch (pError) {
    loadError = pError instanceof Error ? pError.message : "Chargement impossible.";
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 lg:py-14">
      <PageHero
        eyebrow="Hall of Fame"
        title="Records"
        description="Les plus beaux exploits du ladder — historiques inclus. Les égalités exactes sont toutes affichées."
        imageSrc={brandImages.diceAction}
      />

      {loadError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Records indisponibles ({loadError}).
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {records.map((pRecord) => (
            <li key={pRecord.code} className="brand-card rounded-xl px-3.5 py-3">
              <h2 className="text-sm font-bold text-violet-950">{pRecord.title}</h2>
              <p className="mt-0.5 text-xs leading-snug text-brand-muted">{pRecord.subtitle}</p>
              {pRecord.holders.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500">Pas encore de détenteur.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {pRecord.holders.map((pHolder, pIndex) => (
                    <li
                      key={`${pRecord.code}-${pIndex}-${pHolder.relatedMatchId ?? "none"}`}
                      className="rounded-lg border border-violet-100 bg-violet-50/50 px-2.5 py-1.5"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-base font-bold tabular-nums text-violet-950">
                          {formatRecordValue(pRecord.code, pHolder.value)}
                          {pRecord.holders.length > 1 ? (
                            <span className="ml-1.5 text-[10px] font-medium text-violet-600">
                              ex æquo
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-zinc-700">
                          {pHolder.relatedProfiles.length > 1 ? (
                            <>
                              {pHolder.relatedProfiles.map((pProfile, pProfileIndex) => (
                                <span key={pProfile.slug || pProfileIndex}>
                                  {pProfileIndex > 0 ? " · " : null}
                                  {pProfile.slug ? (
                                    <Link
                                      href={`/joueurs/${pProfile.slug}`}
                                      className="font-medium text-violet-800 hover:underline"
                                    >
                                      {pProfile.pseudo}
                                    </Link>
                                  ) : (
                                    pProfile.pseudo
                                  )}
                                </span>
                              ))}
                            </>
                          ) : pHolder.profile ? (
                            <Link
                              href={`/joueurs/${pHolder.profile.slug}`}
                              className="font-medium text-violet-800 hover:underline"
                            >
                              {pHolder.profile.pseudo}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {pHolder.establishedAt ? formatDate(pHolder.establishedAt) : "—"}
                        {pHolder.relatedMatchId ? (
                          <>
                            {" · "}
                            <Link
                              href={`/matchs#match-${pHolder.relatedMatchId}`}
                              className="underline hover:text-violet-800"
                            >
                              Voir le match
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
