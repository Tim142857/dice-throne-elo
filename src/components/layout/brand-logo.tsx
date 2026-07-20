import Image from "next/image";
import Link from "next/link";

import { brandImages, brandName } from "@/lib/branding";

type BrandLogoProps = {
  compact?: boolean;
};

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <Link
      href="/"
      className="inline-flex min-w-0 flex-1 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 sm:gap-3"
    >
      <Image
        src={brandImages.logo}
        alt=""
        width={compact ? 36 : 40}
        height={compact ? 36 : 40}
        className="size-10 shrink-0 rounded-lg shadow-sm ring-1 ring-violet-200 sm:size-11"
        priority
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={`font-bold tracking-tight text-violet-950 ${compact ? "text-sm" : "text-base"}`}>
          {brandName}
        </span>
        {!compact ? (
          <span className="hidden text-[11px] font-medium tracking-wide text-violet-600 uppercase sm:block">
            Classements & matchs
          </span>
        ) : null}
      </span>
    </Link>
  );
}
