import { createHash } from "node:crypto";

import { MATCH_RULES } from "@/domain/constants";
import { validateMatchFinalHealth } from "@/domain/matches/final-health";
import { normalizeText, slugify } from "@/lib/text";
import { normalizePseudo } from "@/validation/pseudo";

export type HistoricalMatchRawRow = {
  rowNumber: number;
  playedAt: string;
  player1: string;
  hero1: string;
  player2: string;
  hero2: string;
  winner: string;
  winnerRemainingHealth: string;
  player2RemainingHealth: string;
  notes: string;
};

export type HistoricalMatchParsedRow = {
  rowNumber: number;
  playedAt: string;
  player1Pseudo: string;
  hero1Name: string;
  player2Pseudo: string;
  hero2Name: string;
  winnerPseudo: string;
  winnerRemainingHealth: number;
  player1RemainingHealth: number;
  player2RemainingHealth: number;
  notes: string | null;
  importSourceKey: string;
  validatedAt: string;
};

export type HistoricalMatchRowIssue = {
  rowNumber: number;
  message: string;
};

const HEADER_ALIASES: Record<keyof Omit<HistoricalMatchRawRow, "rowNumber">, string[]> = {
  playedAt: ["playedat", "date", "played_at", "matchdate", "jour"],
  player1: ["player1", "joueur1", "j1"],
  hero1: ["hero1", "heros1", "héros1", "h1"],
  player2: ["player2", "joueur2", "j2"],
  hero2: ["hero2", "heros2", "héros2", "h2"],
  winner: ["winner", "vainqueur", "gagnant"],
  winnerRemainingHealth: [
    "winnerremaininghealth",
    "pv",
    "hp",
    "remaininghealth",
    "pvrestants",
    "winner_hp",
    "differencedepv",
    "differencepv",
    "differencehp",
  ],
  player2RemainingHealth: [
    "player2remaininghealth",
    "pv2",
    "pvjoueur2",
    "pvperdant",
    "loserremaininghealth",
    "loserhp",
    "pvadversaire",
  ],
  notes: ["notes", "note", "commentaire", "comments"],
};

function normalizeHeader(pValue: string): string {
  return pValue
    .trim()
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

export type HistoricalHeaderIndexes = Record<
  keyof Omit<HistoricalMatchRawRow, "rowNumber">,
  number
>;

export function mapCsvHeaders(
  pHeaders: string[],
): { ok: true; indexes: HistoricalHeaderIndexes } | { ok: false; issue: HistoricalMatchRowIssue } {
  const indexByField: Partial<HistoricalHeaderIndexes> = {};

  pHeaders.forEach((pHeader, pIndex) => {
    const normalized = normalizeHeader(pHeader);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<
      [keyof typeof HEADER_ALIASES, string[]]
    >) {
      if (aliases.includes(normalized)) {
        indexByField[field] = pIndex;
      }
    }
  });

  const required: Array<keyof typeof HEADER_ALIASES> = [
    "playedAt",
    "player1",
    "hero1",
    "player2",
    "hero2",
    "winner",
    "winnerRemainingHealth",
  ];

  for (const field of required) {
    if (indexByField[field] === undefined) {
      return {
        ok: false,
        issue: {
          rowNumber: 0,
          message: `Colonne obligatoire manquante : ${field}.`,
        },
      };
    }
  }

  return {
    ok: true,
    indexes: {
      playedAt: indexByField.playedAt!,
      player1: indexByField.player1!,
      hero1: indexByField.hero1!,
      player2: indexByField.player2!,
      hero2: indexByField.hero2!,
      winner: indexByField.winner!,
      winnerRemainingHealth: indexByField.winnerRemainingHealth!,
      player2RemainingHealth: indexByField.player2RemainingHealth ?? -1,
      notes: indexByField.notes ?? -1,
    },
  };
}

export function buildImportSourceKey(pInput: {
  playedAt: string;
  player1Pseudo: string;
  hero1Name: string;
  player2Pseudo: string;
  hero2Name: string;
  winnerPseudo: string;
  winnerRemainingHealth: number;
  notes: string | null;
  rowNumber: number;
}): string {
  const payload = [
    pInput.playedAt,
    normalizePseudo(pInput.player1Pseudo),
    normalizeText(pInput.hero1Name),
    normalizePseudo(pInput.player2Pseudo),
    normalizeText(pInput.hero2Name),
    normalizePseudo(pInput.winnerPseudo),
    String(pInput.winnerRemainingHealth),
    pInput.notes ?? "",
    String(pInput.rowNumber),
  ].join("|");

  const digest = createHash("sha256").update(payload).digest("hex").slice(0, 24);
  return `import:v1:${digest}:r${pInput.rowNumber}`;
}

export function normalizePlayedAt(pValue: string): string | null {
  const trimmed = pValue.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const frenchMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (frenchMatch) {
    const day = frenchMatch[1]!.padStart(2, "0");
    const month = frenchMatch[2]!.padStart(2, "0");
    const year = frenchMatch[3]!;
    return `${year}-${month}-${day}`;
  }

  return null;
}

export function buildValidatedAtForImport(pPlayedAt: string, pRowNumber: number): string {
  const epoch = Date.parse(`${pPlayedAt}T00:00:00.000Z`);
  if (Number.isNaN(epoch)) {
    throw new Error(`Date invalide : ${pPlayedAt}`);
  }
  return new Date(epoch + pRowNumber).toISOString();
}

export function parseHistoricalMatchRow(
  pRaw: HistoricalMatchRawRow,
): { ok: true; row: HistoricalMatchParsedRow } | { ok: false; issue: HistoricalMatchRowIssue } {
  const playedAt = normalizePlayedAt(pRaw.playedAt);
  if (!playedAt) {
    return {
      ok: false,
      issue: {
        rowNumber: pRaw.rowNumber,
        message: "Date invalide (attendu YYYY-MM-DD ou DD/MM/YYYY).",
      },
    };
  }

  const player1Pseudo = pRaw.player1.trim().replace(/\s+/g, " ");
  const player2Pseudo = pRaw.player2.trim().replace(/\s+/g, " ");
  const hero1Name = pRaw.hero1.trim().replace(/\s+/g, " ");
  const hero2Name = pRaw.hero2.trim().replace(/\s+/g, " ");
  const winnerPseudo = pRaw.winner.trim().replace(/\s+/g, " ");

  if (player1Pseudo.length < 3 || player2Pseudo.length < 3) {
    return {
      ok: false,
      issue: { rowNumber: pRaw.rowNumber, message: "Pseudo joueur trop court." },
    };
  }
  if (normalizePseudo(player1Pseudo) === normalizePseudo(player2Pseudo)) {
    return {
      ok: false,
      issue: { rowNumber: pRaw.rowNumber, message: "Les deux joueurs doivent être différents." },
    };
  }
  if (
    normalizePseudo(winnerPseudo) !== normalizePseudo(player1Pseudo) &&
    normalizePseudo(winnerPseudo) !== normalizePseudo(player2Pseudo)
  ) {
    return {
      ok: false,
      issue: {
        rowNumber: pRaw.rowNumber,
        message: "Le vainqueur doit être l’un des deux joueurs.",
      },
    };
  }
  if (!hero1Name || !hero2Name) {
    return {
      ok: false,
      issue: { rowNumber: pRaw.rowNumber, message: "Les héros sont obligatoires." },
    };
  }

  const health = Number(pRaw.winnerRemainingHealth);
  if (
    !Number.isInteger(health) ||
    health < MATCH_RULES.minRemainingHealth ||
    health > MATCH_RULES.maxRemainingHealth
  ) {
    return {
      ok: false,
      issue: {
        rowNumber: pRaw.rowNumber,
        message: `PV restants invalides (0-${MATCH_RULES.maxRemainingHealth}).`,
      },
    };
  }

  const loserHealthRaw = (pRaw.player2RemainingHealth ?? "").trim();
  let loserHealth = 0;
  if (loserHealthRaw.length > 0) {
    loserHealth = Number(loserHealthRaw);
    if (
      !Number.isInteger(loserHealth) ||
      loserHealth < MATCH_RULES.minRemainingHealth ||
      loserHealth > MATCH_RULES.maxRemainingHealth
    ) {
      return {
        ok: false,
        issue: {
          rowNumber: pRaw.rowNumber,
          message: `PV restants du perdant invalides (0-${MATCH_RULES.maxRemainingHealth}).`,
        },
      };
    }
  }

  const winnerIsPlayer1 = normalizePseudo(winnerPseudo) === normalizePseudo(player1Pseudo);
  const player1RemainingHealth = winnerIsPlayer1 ? health : loserHealth;
  const player2RemainingHealth = winnerIsPlayer1 ? loserHealth : health;
  const healthError = validateMatchFinalHealth({
    player1Id: "player1",
    player2Id: "player2",
    winnerProfileId: winnerIsPlayer1 ? "player1" : "player2",
    player1RemainingHealth,
    player2RemainingHealth,
  });
  if (healthError) {
    return {
      ok: false,
      issue: { rowNumber: pRaw.rowNumber, message: healthError },
    };
  }

  const notesRaw = pRaw.notes.trim();
  if (notesRaw.length > MATCH_RULES.maxNotesLength) {
    return {
      ok: false,
      issue: { rowNumber: pRaw.rowNumber, message: "Notes trop longues." },
    };
  }

  const notes = notesRaw.length > 0 ? notesRaw : null;
  const importSourceKey = buildImportSourceKey({
    playedAt,
    player1Pseudo,
    hero1Name,
    player2Pseudo,
    hero2Name,
    winnerPseudo,
    winnerRemainingHealth: health,
    notes,
    rowNumber: pRaw.rowNumber,
  });

  return {
    ok: true,
    row: {
      rowNumber: pRaw.rowNumber,
      playedAt,
      player1Pseudo,
      hero1Name,
      player2Pseudo,
      hero2Name,
      winnerPseudo,
      winnerRemainingHealth: health,
      player1RemainingHealth,
      player2RemainingHealth,
      notes,
      importSourceKey,
      validatedAt: buildValidatedAtForImport(playedAt, pRaw.rowNumber),
    },
  };
}

export function ensureSlugFromName(pName: string): string {
  const slug = slugify(pName);
  if (!slug) {
    throw new Error(`Impossible de générer un slug pour « ${pName} ».`);
  }
  return slug;
}

/**
 * Minimal CSV parser supporting quotes and commas.
 */
export function parseCsv(pContent: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < pContent.length; index += 1) {
    const char = pContent[index]!;
    const next = pContent[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(current);
      current = "";
      continue;
    }
    if (char === "\n") {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }
    if (char === "\r") {
      continue;
    }
    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((pRow) => pRow.some((pCell) => pCell.trim().length > 0));
}

export function rawRowsFromCsvMatrix(pMatrix: string[][]): HistoricalMatchRawRow[] | HistoricalMatchRowIssue {
  if (pMatrix.length === 0) {
    return { rowNumber: 0, message: "Fichier vide." };
  }

  const headerMap = mapCsvHeaders(pMatrix[0] ?? []);
  if (!headerMap.ok) {
    return headerMap.issue;
  }

  const indexes = headerMap.indexes;
  const rows: HistoricalMatchRawRow[] = [];
  for (let index = 1; index < pMatrix.length; index += 1) {
    const cells = pMatrix[index] ?? [];
    const rowNumber = index + 1;
    rows.push({
      rowNumber,
      playedAt: cells[indexes.playedAt] ?? "",
      player1: cells[indexes.player1] ?? "",
      hero1: cells[indexes.hero1] ?? "",
      player2: cells[indexes.player2] ?? "",
      hero2: cells[indexes.hero2] ?? "",
      winner: cells[indexes.winner] ?? "",
      winnerRemainingHealth: cells[indexes.winnerRemainingHealth] ?? "",
      player2RemainingHealth:
        indexes.player2RemainingHealth >= 0
          ? (cells[indexes.player2RemainingHealth] ?? "")
          : "",
      notes: indexes.notes >= 0 ? (cells[indexes.notes] ?? "") : "",
    });
  }
  return rows;
}
