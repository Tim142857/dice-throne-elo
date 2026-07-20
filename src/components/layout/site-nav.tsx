"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import { signOutAction } from "@/app/actions/auth";

const linkClassName =
  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-violet-900/80 hover:bg-violet-100 hover:text-violet-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2";

type SiteNavProps = {
  children: ReactNode;
  isLoggedIn: boolean;
  unreadCount?: number;
};

export function SiteNav({ children, isLoggedIn, unreadCount = 0 }: SiteNavProps) {
  const [open, setOpen] = useState(false);

  const notificationsLabel =
    unreadCount > 0 ? `Notifications (${unreadCount})` : "Notifications";

  const publicLinks = (
    <>
      <Link href="/classements" className={linkClassName} onClick={() => setOpen(false)}>
        Classements
      </Link>
      <Link href="/heros" className={linkClassName} onClick={() => setOpen(false)}>
        Héros
      </Link>
      <Link href="/matchs" className={linkClassName} onClick={() => setOpen(false)}>
        Matchs
      </Link>
      <Link href="/confrontations/joueurs" className={linkClassName} onClick={() => setOpen(false)}>
        Confrontations
      </Link>
    </>
  );

  const authLinks = isLoggedIn ? (
    <>
      <Link href="/tableau-de-bord" className={linkClassName} onClick={() => setOpen(false)}>
        Tableau de bord
      </Link>
      <Link href="/mes-matchs" className={linkClassName} onClick={() => setOpen(false)}>
        Mes matchs
      </Link>
      <Link href="/compte" className={linkClassName} onClick={() => setOpen(false)}>
        Compte
      </Link>
      <Link
        href="/notifications"
        className={linkClassName}
        onClick={() => setOpen(false)}
        aria-label={notificationsLabel}
      >
        Notifications
        {unreadCount > 0 ? (
          <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 text-xs font-bold text-amber-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>
      <form action={signOutAction} className="inline-flex">
        <button type="submit" className={linkClassName}>
          Déconnexion
        </button>
      </form>
    </>
  ) : (
    <>
      <Link href="/connexion" className={linkClassName} onClick={() => setOpen(false)}>
        Connexion
      </Link>
      <Link
        href="/inscription"
        className="inline-flex min-h-11 items-center rounded-lg bg-gradient-to-r from-violet-700 to-violet-600 px-3 text-sm font-semibold text-white shadow-md shadow-violet-500/25 hover:from-violet-600 hover:to-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
        onClick={() => setOpen(false)}
      >
        Inscription
      </Link>
    </>
  );

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 py-3">
        {children}

        <div className="flex shrink-0 items-center self-center">
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            {publicLinks}
            {authLinks}
          </nav>

          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-violet-200 text-lg leading-none text-violet-950 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 md:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((pValue) => !pValue)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="menu-mobile"
          className="border-t border-violet-200 pb-3 md:hidden"
          aria-label="Navigation mobile"
        >
          <div className="flex flex-col gap-1 pt-3">
            {publicLinks}
            {authLinks}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
