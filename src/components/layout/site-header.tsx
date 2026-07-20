import { BrandLogo } from "@/components/layout/brand-logo";
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
    <header className="sticky top-0 z-40 border-b border-violet-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <SiteNav isLoggedIn={isLoggedIn} unreadCount={unreadCount}>
          <BrandLogo />
        </SiteNav>
      </div>
    </header>
  );
}
