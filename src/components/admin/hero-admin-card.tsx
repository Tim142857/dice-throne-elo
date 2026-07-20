"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setHeroActiveAction, updateHeroAction } from "@/app/actions/admin-heroes";
import { formatDateTime } from "@/lib/dates";

type HeroAdminCardProps = {
  heroId: string;
  name: string;
  slug: string;
  isActive: boolean;
  updatedAt: string;
};

export function HeroAdminCard({ heroId, name, slug, isActive, updatedAt }: HeroAdminCardProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-medium text-zinc-950">{name}</h2>
          <p className="text-xs text-zinc-500">
            /{slug} · {isActive ? "Actif" : "Inactif"} · maj{" "}
            {formatDateTime(updatedAt)}
          </p>
        </div>
        <form
          onSubmit={(pEvent) => {
            pEvent.preventDefault();
            const formData = new FormData(pEvent.currentTarget);
            startTransition(async () => {
              setError("");
              setMessage("");
              const result = await setHeroActiveAction(formData);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setMessage(result.message ?? "Statut mis à jour.");
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="heroId" value={heroId} />
          <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
          <button
            type="submit"
            disabled={isPending}
            className="text-sm font-medium text-zinc-800 hover:underline disabled:opacity-60"
          >
            {isActive ? "Désactiver" : "Activer"}
          </button>
        </form>
      </div>

      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(pEvent) => {
          pEvent.preventDefault();
          const formData = new FormData(pEvent.currentTarget);
          if (!formData.get("isActive")) {
            formData.set("isActive", "false");
          }
          startTransition(async () => {
            setError("");
            setMessage("");
            const result = await updateHeroAction(formData);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setMessage(result.message ?? "Mis à jour.");
            router.refresh();
          });
        }}
      >
        <input type="hidden" name="heroId" value={heroId} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Nom</span>
          <input
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={48}
            defaultValue={name}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="isActive" type="checkbox" value="true" defaultChecked={isActive} />
          <span>Actif</span>
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
        >
          Enregistrer
        </button>
      </form>

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
    </article>
  );
}
