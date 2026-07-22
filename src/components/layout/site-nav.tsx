"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { signOutAction } from "@/app/actions/auth";

const linkClassName =
  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-violet-900/80 hover:bg-violet-100 hover:text-violet-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2";

const menuItemClassName =
  "flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-violet-950 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary";

type SiteNavProps = {
  children: ReactNode;
  isLoggedIn: boolean;
  unreadCount?: number;
};

type NavDropdownProps = {
  label: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
};

function NavDropdown({ label, children, align = "left" }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (pEvent: MouseEvent) => {
      if (!rootRef.current?.contains(pEvent.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (pEvent: KeyboardEvent) => {
      if (pEvent.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={linkClassName}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((pValue) => !pValue)}
      >
        {label}
        <span className="ml-1 text-xs text-violet-500" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`absolute top-full z-50 mt-1 min-w-52 rounded-xl border border-violet-200 bg-white p-1.5 shadow-lg shadow-violet-900/10 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function SiteNav({ children, isLoggedIn, unreadCount = 0 }: SiteNavProps) {
  const [open, setOpen] = useState(false);

  const closeMobile = () => setOpen(false);

  const desktopPublic = (
    <>
      <Link href="/classements" className={linkClassName}>
        Classements
      </Link>
      <Link href="/matchs" className={linkClassName}>
        Matchs
      </Link>
      <NavDropdown label="Explorer">
        <Link href="/actualites" role="menuitem" className={menuItemClassName} onClick={closeMobile}>
          Actualités
        </Link>
        <Link href="/heros" role="menuitem" className={menuItemClassName} onClick={closeMobile}>
          Héros
        </Link>
        <Link href="/records" role="menuitem" className={menuItemClassName} onClick={closeMobile}>
          Records
        </Link>
        <Link
          href="/confrontations/joueurs"
          role="menuitem"
          className={menuItemClassName}
          onClick={closeMobile}
        >
          Confrontations
        </Link>
      </NavDropdown>
    </>
  );

  const desktopAuth = isLoggedIn ? (
    <NavDropdown
      align="right"
      label={
        <span className="inline-flex items-center gap-1.5">
          Mon espace
          {unreadCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 text-xs font-bold text-amber-950">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </span>
      }
    >
      <Link href="/tableau-de-bord" role="menuitem" className={menuItemClassName}>
        Tableau de bord
      </Link>
      <Link href="/mes-matchs" role="menuitem" className={menuItemClassName}>
        Mes matchs
      </Link>
      <Link href="/compte" role="menuitem" className={menuItemClassName}>
        Compte
      </Link>
      <Link href="/notifications" role="menuitem" className={menuItemClassName}>
        Notifications
        {unreadCount > 0 ? (
          <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 text-xs font-bold text-amber-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>
      <div className="my-1 border-t border-violet-100" />
      <form action={signOutAction}>
        <button type="submit" role="menuitem" className={`${menuItemClassName} w-full text-left`}>
          Déconnexion
        </button>
      </form>
    </NavDropdown>
  ) : (
    <>
      <Link href="/connexion" className={linkClassName}>
        Connexion
      </Link>
      <Link
        href="/inscription"
        className="inline-flex min-h-11 items-center rounded-lg bg-gradient-to-r from-violet-700 to-violet-600 px-3 text-sm font-semibold text-white shadow-md shadow-violet-500/25 hover:from-violet-600 hover:to-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
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
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
            {desktopPublic}
            {desktopAuth}
          </nav>

          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-violet-200 text-lg leading-none text-violet-950 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 lg:hidden"
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
          className="border-t border-violet-200 pb-3 lg:hidden"
          aria-label="Navigation mobile"
        >
          <div className="flex flex-col gap-4 pt-3">
            <div className="flex flex-col gap-1">
              <p className="px-3 text-xs font-semibold tracking-wide text-violet-500 uppercase">
                Public
              </p>
              <Link href="/classements" className={linkClassName} onClick={closeMobile}>
                Classements
              </Link>
              <Link href="/matchs" className={linkClassName} onClick={closeMobile}>
                Matchs
              </Link>
              <Link href="/actualites" className={linkClassName} onClick={closeMobile}>
                Actualités
              </Link>
              <Link href="/heros" className={linkClassName} onClick={closeMobile}>
                Héros
              </Link>
              <Link href="/records" className={linkClassName} onClick={closeMobile}>
                Records
              </Link>
              <Link
                href="/confrontations/joueurs"
                className={linkClassName}
                onClick={closeMobile}
              >
                Confrontations
              </Link>
            </div>

            {isLoggedIn ? (
              <div className="flex flex-col gap-1">
                <p className="px-3 text-xs font-semibold tracking-wide text-violet-500 uppercase">
                  Mon espace
                </p>
                <Link href="/tableau-de-bord" className={linkClassName} onClick={closeMobile}>
                  Tableau de bord
                </Link>
                <Link href="/mes-matchs" className={linkClassName} onClick={closeMobile}>
                  Mes matchs
                </Link>
                <Link href="/compte" className={linkClassName} onClick={closeMobile}>
                  Compte
                </Link>
                <Link href="/notifications" className={linkClassName} onClick={closeMobile}>
                  Notifications
                  {unreadCount > 0 ? (
                    <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 text-xs font-bold text-amber-950">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </Link>
                <form action={signOutAction} className="inline-flex">
                  <button type="submit" className={linkClassName} onClick={closeMobile}>
                    Déconnexion
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <p className="px-3 text-xs font-semibold tracking-wide text-violet-500 uppercase">
                  Compte
                </p>
                <Link href="/connexion" className={linkClassName} onClick={closeMobile}>
                  Connexion
                </Link>
                <Link
                  href="/inscription"
                  className="inline-flex min-h-11 items-center rounded-lg bg-gradient-to-r from-violet-700 to-violet-600 px-3 text-sm font-semibold text-white"
                  onClick={closeMobile}
                >
                  Inscription
                </Link>
              </div>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
