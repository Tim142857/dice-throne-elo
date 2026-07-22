import Link from "next/link";

import type { ActivityFeedItem } from "@/lib/activity/service";
import { formatDateTime } from "@/lib/dates";

const TYPE_STYLES: Record<string, string> = {
  achievement_unlocked: "bg-amber-50 text-amber-900 ring-amber-200",
  player_joined: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  notable_match: "bg-violet-50 text-violet-900 ring-violet-200",
  record_broken: "bg-rose-50 text-rose-900 ring-rose-200",
};

function typeLabel(pType: string): string {
  switch (pType) {
    case "achievement_unlocked":
      return "Badge";
    case "player_joined":
      return "Joueur";
    case "notable_match":
      return "Match";
    case "record_broken":
      return "Record";
    default:
      return "Actu";
  }
}

type ActivityFeedListProps = {
  items: ActivityFeedItem[];
  emptyMessage?: string;
};

export function ActivityFeedList({
  items,
  emptyMessage = "Aucune actualité pour le moment. Les prochains badges, matchs marquants et arrivées de joueurs apparaîtront ici.",
}: ActivityFeedListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-brand-muted">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-violet-100">
      {items.map((pItem) => {
        const content = (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${
                  TYPE_STYLES[pItem.type] ?? "bg-zinc-50 text-zinc-800 ring-zinc-200"
                }`}
              >
                {typeLabel(pItem.type)}
              </span>
              <span className="text-xs text-brand-muted">{formatDateTime(pItem.occurredAt)}</span>
            </div>
            <p className="mt-1 font-semibold text-violet-950">{pItem.title}</p>
            <p className="mt-0.5 text-sm text-brand-muted">{pItem.message}</p>
          </>
        );

        return (
          <li key={pItem.id} className="py-3">
            {pItem.href ? (
              <Link href={pItem.href} className="block rounded-lg hover:bg-violet-50/60">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
