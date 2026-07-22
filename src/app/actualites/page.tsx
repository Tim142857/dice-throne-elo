import type { Metadata } from "next";
import Link from "next/link";

import { ActivityFeedList } from "@/components/activity/activity-feed-list";
import { listActivityFeed } from "@/lib/activity/service";

export const metadata: Metadata = {
  title: "Actualités",
  description: "Badges, records, matchs marquants et nouveaux joueurs.",
};

export const dynamic = "force-dynamic";

export default async function ActualitesPage() {
  let items: Awaited<ReturnType<typeof listActivityFeed>> = [];
  let loadError: string | null = null;

  try {
    items = await listActivityFeed(50);
  } catch (pError) {
    loadError =
      pError instanceof Error ? pError.message : "Impossible de charger les actualités.";
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Actualités</h1>
        <p className="mt-2 text-zinc-600">
          Les faits marquants du club : badges, records, upsets et nouvelles têtes.
        </p>
      </header>

      {loadError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {loadError.includes("activity_events") || loadError.includes("schema cache")
            ? "Le mur d’actualités n’est pas encore disponible en base. Appliquez la migration activity_events."
            : loadError}
        </p>
      ) : (
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <ActivityFeedList items={items} />
        </section>
      )}

      <p className="text-sm text-zinc-500">
        <Link href="/" className="font-medium text-violet-700 hover:underline">
          ← Retour à l’accueil
        </Link>
      </p>
    </main>
  );
}
