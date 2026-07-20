import Image from "next/image";

import { brandImages } from "@/lib/branding";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  imageSrc?: string;
};

export function PageHero({
  eyebrow,
  title,
  description,
  imageSrc = brandImages.artwork,
}: PageHeroProps) {
  return (
    <header className="brand-hero relative overflow-hidden rounded-3xl px-8 py-10 text-white shadow-xl shadow-violet-900/15">
      <div className="absolute inset-y-0 right-0 hidden w-2/5 opacity-30 lg:block">
        <Image src={imageSrc} alt="" fill className="object-cover object-center" sizes="40vw" />
      </div>
      <div className="relative z-10 max-w-2xl">
        <p className="text-sm font-semibold tracking-[0.18em] text-amber-200 uppercase">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-4 text-base leading-7 text-violet-100">{description}</p>
      </div>
    </header>
  );
}
