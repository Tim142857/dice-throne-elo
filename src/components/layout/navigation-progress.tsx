"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function isInternalNavigationLink(pAnchor: HTMLAnchorElement): boolean {
  const href = pAnchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  if (pAnchor.target === "_blank" || pAnchor.hasAttribute("download")) {
    return false;
  }
  if (href.startsWith("http")) {
    try {
      return new URL(href).origin === window.location.origin;
    } catch {
      return false;
    }
  }
  return true;
}

function isSameLocation(pHref: string, pPathname: string, pSearch: string): boolean {
  const url = new URL(pHref, window.location.origin);
  const search = url.searchParams.toString();
  return url.pathname === pPathname && (search ? `?${search}` : "") === pSearch;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const currentSearch = search ? `?${search}` : "";
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, search]);

  useEffect(() => {
    const handleClick = (pEvent: MouseEvent) => {
      if (
        pEvent.defaultPrevented ||
        pEvent.button !== 0 ||
        pEvent.metaKey ||
        pEvent.ctrlKey ||
        pEvent.shiftKey ||
        pEvent.altKey
      ) {
        return;
      }

      const anchor = (pEvent.target as HTMLElement).closest("a");
      if (!anchor || !isInternalNavigationLink(anchor)) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || isSameLocation(href, pathname, currentSearch)) {
        return;
      }

      setIsNavigating(true);
    };

    const handlePopState = () => {
      setIsNavigating(true);
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname, currentSearch]);

  if (!isNavigating) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-violet-100/80"
    >
      <div className="navigation-progress-bar h-full bg-gradient-to-r from-violet-700 via-amber-400 to-violet-700" />
    </div>
  );
}
