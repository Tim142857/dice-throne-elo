import Link from "next/link";

import { SiteNav } from "@/components/layout/site-nav";
import { getAuthContext, getAuthUser } from "@/lib/auth/session";
import { hasPublicEnv, hasServerEnv } from "@/lib/env";
import { countUnreadNotifications } from "@/lib/notifications/service";

export async function SiteHeader() {
  let isLoggedIn = false;
  let unreadCount = 0;

  if (hasPublicEnv() && hasServerEnv()) {
    const context = await getAuthContext().catch(() => null);
    isLoggedIn = Boolean(context?.user);
    if (context?.profile) {
      unreadCount = await countUnreadNotifications(context.profile.id).catch(() => 0);
    }
  } else if (hasPublicEnv()) {
    isLoggedIn = Boolean(await getAuthUser().catch(() => null));
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm font-semibold tracking-tight text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        >
          Dice Throne Elo
        </Link>
        <SiteNav isLoggedIn={isLoggedIn} unreadCount={unreadCount} />
      </div>
    </header>
  );
}
