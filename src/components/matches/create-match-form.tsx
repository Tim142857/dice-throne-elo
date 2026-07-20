"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { createMatchAction } from "@/app/actions/matches";

type Option = { id: string; label: string };

type CreateMatchFormProps = {
  currentProfileId: string;
  currentPseudo: string;
  opponents: Option[];
  heroes: Option[];
};

export function CreateMatchForm({
  currentProfileId,
  currentPseudo,
  opponents,
  heroes,
}: CreateMatchFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [player1Id, setPlayer1Id] = useState(currentProfileId);
  const [player2Id, setPlayer2Id] = useState(opponents[0]?.id ?? "");
  const [winnerProfileId, setWinnerProfileId] = useState(currentProfileId);

  const playerOptions = useMemo(
    () => [{ id: currentProfileId, label: `${currentPseudo} (vous)` }, ...opponents],
    [currentProfileId, currentPseudo, opponents],
  );

  const winnerOptions = playerOptions.filter(
    (pOption) => pOption.id === player1Id || pOption.id === player2Id,
  );

  if (createdMatchId && duplicateIds.length > 0) {
    return (
      <div className="flex flex-col gap-4 rounded-md border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm text-amber-950" role="status">
          Match déclaré. Attention : un doublon probable a été détecté. Vérifiez avant de demander
          une validation.
        </p>
        <ul className="flex flex-col gap-2 text-sm">
          {duplicateIds.map((pId) => (
            <li key={pId}>
              <Link href={`/mes-matchs/${pId}`} className="font-medium underline hover:text-zinc-950">
                Match suspect {pId.slice(0, 8)}…
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/mes-matchs/${createdMatchId}`}
            className="inline-flex min-h-11 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Continuer vers mon match
          </Link>
          <Link
            href="/mes-matchs"
            className="inline-flex min-h-11 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium hover:bg-zinc-50"
          >
            Voir mes matchs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(pEvent) => {
        pEvent.preventDefault();
        const formData = new FormData(pEvent.currentTarget);
        startTransition(async () => {
          setError("");
          setMessage("");
          setDuplicateIds([]);
          const result = await createMatchAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setMessage(result.message ?? "Match déclaré.");
          if (result.data.probableDuplicateIds.length > 0) {
            setCreatedMatchId(result.data.matchId);
            setDuplicateIds(result.data.probableDuplicateIds);
            return;
          }
          router.push(`/mes-matchs/${result.data.matchId}`);
          router.refresh();
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Date du match</span>
        <input
          name="playedAt"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Joueur 1</span>
          <select
            name="player1Id"
            required
            value={player1Id}
            onChange={(pEvent) => {
              setPlayer1Id(pEvent.target.value);
              if (winnerProfileId !== pEvent.target.value && winnerProfileId !== player2Id) {
                setWinnerProfileId(pEvent.target.value);
              }
            }}
            className="rounded-md border border-zinc-300 px-3 py-2"
          >
            {playerOptions.map((pOption) => (
              <option key={pOption.id} value={pOption.id}>
                {pOption.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Héros du joueur 1</span>
          <select name="hero1Id" required className="rounded-md border border-zinc-300 px-3 py-2">
            {heroes.map((pHero) => (
              <option key={pHero.id} value={pHero.id}>
                {pHero.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Joueur 2</span>
          <select
            name="player2Id"
            required
            value={player2Id}
            onChange={(pEvent) => {
              setPlayer2Id(pEvent.target.value);
              if (winnerProfileId !== player1Id && winnerProfileId !== pEvent.target.value) {
                setWinnerProfileId(pEvent.target.value);
              }
            }}
            className="rounded-md border border-zinc-300 px-3 py-2"
          >
            {playerOptions.map((pOption) => (
              <option key={pOption.id} value={pOption.id}>
                {pOption.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Héros du joueur 2</span>
          <select name="hero2Id" required className="rounded-md border border-zinc-300 px-3 py-2">
            {heroes.map((pHero) => (
              <option key={pHero.id} value={pHero.id}>
                {pHero.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Vainqueur</span>
        <select
          name="winnerProfileId"
          required
          value={winnerProfileId}
          onChange={(pEvent) => setWinnerProfileId(pEvent.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        >
          {winnerOptions.map((pOption) => (
            <option key={pOption.id} value={pOption.id}>
              {pOption.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">PV restants — joueur 1</span>
          <input
            name="player1RemainingHealth"
            type="number"
            required
            min={0}
            max={50}
            defaultValue={15}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">PV restants — joueur 2</span>
          <input
            name="player2RemainingHealth"
            type="number"
            required
            min={0}
            max={50}
            defaultValue={0}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>
      <p className="text-xs text-zinc-500">
        KO : le perdant est à 0 PV. Fin du timer : indiquez les PV restants des deux joueurs.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Notes (optionnel)</span>
        <textarea
          name="notes"
          maxLength={500}
          rows={3}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || heroes.length === 0 || opponents.length === 0}
        className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {isPending ? "Déclaration…" : "Déclarer le match"}
      </button>
    </form>
  );
}
