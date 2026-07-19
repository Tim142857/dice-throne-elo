"use client";

import Link from "next/link";
import { useState } from "react";

import { signOutAction } from "@/app/actions/auth";

const linkClassName =
  "inline-flex min-h-11 items-center rounded-md px-3 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2";

type SiteNavProps = {
  isLoggedIn: boolean;
  unreadCount?: number;
};

export function SiteNav({ isLoggedIn, unreadCount = 0 }: SiteNavProps) {
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
          <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-xs font-medium text-white">
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
        className="inline-flex min-h-11 items-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        onClick={() => setOpen(false)}
      >
        Inscription
      </Link>
    </>
  );

  return (
    <div className="flex w-full flex-col gap-3 md:w-auto">
      <div className="flex items-center justify-end gap-1">
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
          {publicLinks}
          {authLinks}
        </nav>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 md:hidden"
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((pValue) => !pValue)}
        >
          {open ? "Fermer" : "Menu"}
        </button>
      </div>

      {open ? (
        <nav
          id="menu-mobile"
          className="flex flex-col gap-1 border-t border-zinc-200 pt-3 md:hidden"
          aria-label="Navigation mobile"
        >
          {publicLinks}
          {authLinks}
        </nav>
      ) : null}
    </div>
  );
}
