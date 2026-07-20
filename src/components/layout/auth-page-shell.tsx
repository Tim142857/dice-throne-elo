import Image from "next/image";
import type { ReactNode } from "react";

import { brandImages } from "@/lib/branding";

type AuthPageShellProps = {
  title: string;
  description: ReactNode;
  children: ReactNode;
};

export function AuthPageShell({ title, description, children }: AuthPageShellProps) {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
      <section className="brand-hero relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl shadow-violet-900/20">
        <div className="absolute inset-0 opacity-35">
          <Image
            src={brandImages.heroesMarvel}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>
        <div className="relative z-10 flex h-full min-h-72 flex-col justify-between gap-8">
          <div className="flex flex-col gap-4">
            <Image
              src={brandImages.logo}
              alt="Dice Throne"
              width={72}
              height={72}
              className="rounded-2xl bg-white/10 p-2 ring-1 ring-white/20 backdrop-blur"
            />
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-amber-200 uppercase">
                Communauté Elo
              </p>
              <h2 className="mt-2 max-w-md text-3xl font-bold tracking-tight">
                Lancez les dés, validez vos matchs, grimpez au classement.
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-white/20">
              <Image
                src={brandImages.diceAction}
                alt=""
                fill
                className="object-cover"
                sizes="200px"
              />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-white/20">
              <Image
                src={brandImages.boxArt}
                alt=""
                fill
                className="object-cover"
                sizes="200px"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="brand-card rounded-3xl p-8">
        <h1 className="text-3xl font-bold tracking-tight text-violet-950">{title}</h1>
        <div className="mt-2 text-sm leading-6 text-brand-muted">{description}</div>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}
