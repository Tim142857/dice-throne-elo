"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  correctPseudoAction,
  reactivateProfileAction,
  suspendProfileAction,
} from "@/app/actions/admin-accounts";

type UserAdminRowProps = {
  profileId: string;
  pseudo: string;
  status: string;
  role: string;
};

export function UserAdminRow({ profileId, pseudo, status, role }: UserAdminRowProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-t border-zinc-200 align-top">
      <td className="px-3 py-3 text-sm font-medium text-zinc-900">{pseudo}</td>
      <td className="px-3 py-3 text-sm text-zinc-700">{status}</td>
      <td className="px-3 py-3 text-sm text-zinc-700">{role}</td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-2">
          {status === "active" && role !== "admin" ? (
            <form
              onSubmit={(pEvent) => {
                pEvent.preventDefault();
                const formData = new FormData(pEvent.currentTarget);
                startTransition(async () => {
                  const result = await suspendProfileAction(formData);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  router.refresh();
                });
              }}
            >
              <input type="hidden" name="profileId" value={profileId} />
              <button
                type="submit"
                disabled={isPending}
                className="text-sm text-red-700 hover:underline disabled:opacity-60"
              >
                Suspendre
              </button>
            </form>
          ) : null}
          {status === "suspended" ? (
            <form
              onSubmit={(pEvent) => {
                pEvent.preventDefault();
                const formData = new FormData(pEvent.currentTarget);
                startTransition(async () => {
                  const result = await reactivateProfileAction(formData);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  router.refresh();
                });
              }}
            >
              <input type="hidden" name="profileId" value={profileId} />
              <button
                type="submit"
                disabled={isPending}
                className="text-sm text-emerald-700 hover:underline disabled:opacity-60"
              >
                Réactiver
              </button>
            </form>
          ) : null}
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(pEvent) => {
              pEvent.preventDefault();
              const formData = new FormData(pEvent.currentTarget);
              startTransition(async () => {
                const result = await correctPseudoAction(formData);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                router.refresh();
              });
            }}
          >
            <input type="hidden" name="profileId" value={profileId} />
            <input
              name="newPseudo"
              type="text"
              required
              minLength={3}
              maxLength={24}
              placeholder="Nouveau pseudo"
              className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
            />
            <button
              type="submit"
              disabled={isPending}
              className="text-sm text-zinc-800 hover:underline disabled:opacity-60"
            >
              Corriger
            </button>
          </form>
          {error ? <p className="text-xs text-red-700">{error}</p> : null}
        </div>
      </td>
    </tr>
  );
}
