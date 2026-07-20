import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import { getAuthContext } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";
import {
  countUnreadNotifications,
  listNotificationsForProfile,
} from "@/lib/notifications/service";

export const metadata: Metadata = {
  title: "Notifications",
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/notifications");
  }
  if (!context.profile) {
    redirect("/tableau-de-bord");
  }

  const [notifications, unreadCount] = await Promise.all([
    listNotificationsForProfile(context.profile.id),
    countUnreadNotifications(context.profile.id),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-2 text-sm text-zinc-600">
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
              : "Toutes vos notifications sont lues."}
          </p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-50"
            >
              Tout marquer comme lu
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          Aucune notification pour le moment.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((pNotification) => {
            const isUnread = !pNotification.readAt;
            return (
              <li
                key={pNotification.id}
                className={
                  isUnread
                    ? "rounded-md border border-zinc-300 bg-white p-4"
                    : "rounded-md border border-zinc-200 bg-zinc-50 p-4"
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-950">
                      {isUnread ? (
                        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-zinc-900" aria-hidden />
                      ) : null}
                      {pNotification.title}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">{pNotification.message}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {formatDateTime(pNotification.createdAt)}
                    </p>
                    {pNotification.relatedMatchId ? (
                      <Link
                        href={`/mes-matchs/${pNotification.relatedMatchId}`}
                        className="mt-2 inline-flex min-h-11 items-center text-sm font-medium underline hover:text-zinc-950"
                      >
                        Voir le match
                      </Link>
                    ) : null}
                  </div>
                  {isUnread ? (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="notificationId" value={pNotification.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm hover:bg-white"
                      >
                        Marquer lu
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
