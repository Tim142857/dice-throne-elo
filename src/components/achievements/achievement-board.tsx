import Link from "next/link";

import type { AchievementDefinition } from "@/domain/achievements/definitions";
import { formatDate } from "@/lib/dates";
import type { PlayerAchievementRow } from "@/lib/achievements/service";
import type { AchievementProgress } from "@/domain/achievements/evaluate";

type AchievementBoardProps = {
  owned: PlayerAchievementRow[];
  progress: AchievementProgress[];
  definitions: AchievementDefinition[];
};

export function AchievementBoard({ owned, progress, definitions }: AchievementBoardProps) {
  const ownedByCode = new Map(owned.map((pItem) => [pItem.achievementCode, pItem]));
  const progressByCode = new Map(progress.map((pItem) => [pItem.code, pItem]));

  return (
    <section className="brand-card rounded-2xl p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-violet-950">Badges et succès</h2>
          <p className="mt-1 text-sm text-brand-muted">
            {owned.length} / {definitions.length} obtenus · les matchs historiques ne comptent pas
          </p>
        </div>
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {definitions.map((pDef) => {
          const unlocked = ownedByCode.get(pDef.code);
          const prog = progressByCode.get(pDef.code);
          const isLocked = !unlocked;
          if (isLocked && pDef.isSecret) {
            return (
              <li
                key={pDef.code}
                className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 opacity-60"
              >
                <p className="font-semibold text-zinc-500">???</p>
                <p className="mt-1 text-xs text-zinc-400">Badge secret</p>
              </li>
            );
          }

          return (
            <li
              key={pDef.code}
              className={
                unlocked
                  ? "rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-4 py-3 shadow-sm"
                  : "rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 opacity-70"
              }
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {pDef.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-violet-950">{pDef.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-600">{pDef.description}</p>
                  <p className="mt-1 text-xs text-zinc-500">{pDef.conditionLabel}</p>
                  {unlocked ? (
                    <p className="mt-2 text-xs font-medium text-amber-800">
                      Obtenu le {formatDate(unlocked.unlockedAt)}
                      {unlocked.triggerMatchId ? (
                        <>
                          {" · "}
                          <Link
                            href={`/matchs#match-${unlocked.triggerMatchId}`}
                            className="underline hover:text-violet-800"
                          >
                            Match
                          </Link>
                        </>
                      ) : null}
                    </p>
                  ) : prog && prog.target !== null && prog.target > 0 ? (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>
                          {prog.current} / {prog.target}
                        </span>
                        <span>{Math.round((prog.current / prog.target) * 100)}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{ width: `${Math.min(100, (prog.current / prog.target) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
