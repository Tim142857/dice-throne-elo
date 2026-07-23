"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

import { createMatchAction } from "@/app/actions/matches";
import { describeMatchOutcomeFromHealth } from "@/domain/matches/final-health";

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
  const [opponentDuplicateIds, setOpponentDuplicateIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const submitLockRef = useRef(false);
  const [player1Id, setPlayer1Id] = useState(currentProfileId);
  const [player2Id, setPlayer2Id] = useState(opponents[0]?.id ?? "");
  const [player1Health, setPlayer1Health] = useState(15);
  const [player2Health, setPlayer2Health] = useState(0);

  const playerOptions = useMemo(
    () => [{ id: currentProfileId, label: `${currentPseudo} (vous)` }, ...opponents],
    [currentProfileId, currentPseudo, opponents],
  );

  const player1Label =
    playerOptions.find((pOption) => pOption.id === player1Id)?.label ?? "Joueur 1";
  const player2Label =
    playerOptions.find((pOption) => pOption.id === player2Id)?.label ?? "Joueur 2";

  const outcomeLabel = describeMatchOutcomeFromHealth({
    player1Id,
    player2Id,
    player1Label,
    player2Label,
    player1RemainingHealth: player1Health,
    player2RemainingHealth: player2Health,
  });

  function submitDeclaration(pForm: HTMLFormElement, pAcknowledgeDuplicates: boolean) {
    if (submitLockRef.current || isPending) {
      return;
    }
    submitLockRef.current = true;
    const formData = new FormData(pForm);
    if (pAcknowledgeDuplicates) {
      formData.set("acknowledgeDuplicates", "true");
    }
    startTransition(async () => {
      setError("");
      setMessage("");
      try {
        const result = await createMatchAction(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (result.data.status === "needs_confirmation") {
          setOpponentDuplicateIds(result.data.opponentDuplicateIds);
          setMessage(
            result.message ??
              "L’adversaire a déjà déclaré un match identique. Confirmez pour continuer.",
          );
          return;
        }
        setOpponentDuplicateIds([]);
        setMessage(result.message ?? "Match déclaré.");
        if (result.data.probableDuplicateIds.length > 0) {
          setCreatedMatchId(result.data.matchId);
          setDuplicateIds(result.data.probableDuplicateIds);
          return;
        }
        router.push(`/mes-matchs/${result.data.matchId}`);
        router.refresh();
      } finally {
        submitLockRef.current = false;
      }
    });
  }

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
        submitDeclaration(pEvent.currentTarget, false);
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
            onChange={(pEvent) => setPlayer1Id(pEvent.target.value)}
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
            onChange={(pEvent) => setPlayer2Id(pEvent.target.value)}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">PV restants — joueur 1</span>
          <input
            name="player1RemainingHealth"
            type="number"
            required
            min={0}
            max={50}
            value={player1Health}
            onChange={(pEvent) => setPlayer1Health(Number(pEvent.target.value))}
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
            value={player2Health}
            onChange={(pEvent) => setPlayer2Health(Number(pEvent.target.value))}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>
      <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
        Résultat calculé : <span className="font-medium">{outcomeLabel}</span>
      </p>
      <p className="text-xs text-zinc-500">
        Le vainqueur (ou le match nul) est déduit automatiquement des PV restants. PV égaux = nul,
        y compris 0-0.
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

      {opponentDuplicateIds.length > 0 ? (
        <div
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">
            Attention : l’adversaire a déjà déclaré un match avec la même date, les mêmes joueurs et
            les mêmes héros.
          </p>
          <p className="mt-1">
            Vérifiez qu’il ne s’agit pas du même affrontement avant de confirmer. En cas de doute,
            ouvrez sa déclaration et validez-la plutôt que d’en créer une seconde.
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {opponentDuplicateIds.map((pId) => (
              <li key={pId}>
                <Link href={`/mes-matchs/${pId}`} className="font-medium underline hover:text-zinc-950">
                  Voir le match déjà déclaré ({pId.slice(0, 8)}…)
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
              onClick={(pEvent) => {
                const form = pEvent.currentTarget.form;
                if (form) {
                  submitDeclaration(form, true);
                }
              }}
            >
              {isPending ? "Déclaration…" : "Confirmer ma déclaration quand même"}
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
              onClick={() => {
                setOpponentDuplicateIds([]);
                setMessage("");
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error.includes("/mes-matchs/") ? (
            <>
              {error.split("/mes-matchs/")[0]}
              <Link
                href={`/mes-matchs/${error.split("/mes-matchs/")[1]}`}
                className="font-medium underline"
              >
                ouvrir le match existant
              </Link>
            </>
          ) : (
            error
          )}
        </p>
      ) : null}
      {message && opponentDuplicateIds.length === 0 ? (
        <p
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {opponentDuplicateIds.length === 0 ? (
        <button
          type="submit"
          disabled={isPending || heroes.length === 0 || opponents.length === 0}
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {isPending ? "Déclaration…" : "Déclarer le match"}
        </button>
      ) : null}
    </form>
  );
}
