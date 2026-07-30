import type { Metadata } from "next";
import Link from "next/link";

import { CHANGELOG_ENTRIES } from "@/content/changelog";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Historique des nouveautés et corrections de Dice Throne Elo.",
};

export default function ChangelogPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Changelog</h1>
        <p className="mt-2 text-zinc-600">
          Les nouveautés et corrections déployées sur Dice Throne Elo.
        </p>
      </header>

      <ol className="flex flex-col gap-6">
        {CHANGELOG_ENTRIES.map((pEntry) => (
          <li
            key={`${pEntry.date}-${pEntry.title}`}
            className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <time
                dateTime={pEntry.date}
                className="text-xs font-semibold tracking-wide text-violet-500 uppercase"
              >
                {formatDate(pEntry.date)}
              </time>
              <h2 className="text-lg font-semibold text-violet-950">{pEntry.title}</h2>
            </div>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-700">
              {pEntry.items.map((pItem) => (
                <li key={pItem}>{pItem}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <p className="text-sm text-zinc-500">
        <Link href="/" className="font-medium text-violet-700 hover:underline">
          ← Retour à l’accueil
        </Link>
      </p>
    </main>
  );
}
