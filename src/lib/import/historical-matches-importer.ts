import { readFileSync } from "node:fs";
import path from "node:path";

import * as XLSX from "xlsx";

import {
  ensureSlugFromName,
  parseCsv,
  parseHistoricalMatchRow,
  rawRowsFromCsvMatrix,
  type HistoricalMatchParsedRow,
  type HistoricalMatchRowIssue,
} from "@/domain/import/historical-matches";
import { recomputeSeasonRatings } from "@/lib/matches/recompute-ratings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeText } from "@/lib/text";
import { SEED_IDS } from "@/types/database";
import { normalizePseudo } from "@/validation/pseudo";

export type ImportSummary = {
  filePath: string;
  rowsRead: number;
  imported: number;
  skipped: number;
  rejected: number;
  issues: HistoricalMatchRowIssue[];
  recomputeFingerprint: string | null;
};

function loadRawRowsFromFile(pFilePath: string) {
  const absolutePath = path.resolve(pFilePath);
  const extension = path.extname(absolutePath).toLocaleLowerCase("en-US");

  if (extension === ".csv") {
    const content = readFileSync(absolutePath, "utf8");
    return rawRowsFromCsvMatrix(parseCsv(content));
  }

  if (extension === ".xlsx" || extension === ".xls") {
    const workbook = XLSX.readFile(absolutePath);
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { rowNumber: 0, message: "Classeur Excel vide." };
    }
    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) {
      return { rowNumber: 0, message: "Feuille Excel introuvable." };
    }
    const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
    }) as string[][];
    return rawRowsFromCsvMatrix(matrix);
  }

  return {
    rowNumber: 0,
    message: "Format non supporté. Utilisez .csv, .xlsx ou .xls.",
  };
}

async function ensureHistoricalPlayer(pPseudo: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const normalized = normalizePseudo(pPseudo);
  const existing = await admin
    .from("profiles")
    .select("id")
    .eq("normalized_pseudo", normalized)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }
  if (existing.data) {
    return existing.data.id as string;
  }

  const inserted = await admin
    .from("profiles")
    .insert({
      auth_user_id: null,
      pseudo: pPseudo,
      normalized_pseudo: normalized,
      slug: ensureSlugFromName(pPseudo),
      status: "preloaded",
      role: "player",
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data) {
    throw new Error(inserted.error?.message ?? `Impossible de créer le joueur ${pPseudo}.`);
  }

  await admin.from("player_ratings").upsert(
    {
      profile_id: inserted.data.id,
      season_id: SEED_IDS.globalSeasonId,
      rating: 1000,
      best_rating: 1000,
    },
    { onConflict: "profile_id,season_id", ignoreDuplicates: true },
  );

  return inserted.data.id as string;
}

async function ensureHero(pName: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const normalized = normalizeText(pName);
  const existing = await admin
    .from("heroes")
    .select("id")
    .eq("normalized_name", normalized)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }
  if (existing.data) {
    return existing.data.id as string;
  }

  const inserted = await admin
    .from("heroes")
    .insert({
      name: pName,
      normalized_name: normalized,
      slug: ensureSlugFromName(pName),
      is_active: true,
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data) {
    throw new Error(inserted.error?.message ?? `Impossible de créer le héros ${pName}.`);
  }
  return inserted.data.id as string;
}

async function importParsedRow(pRow: HistoricalMatchParsedRow): Promise<"imported" | "skipped"> {
  const admin = createSupabaseAdminClient();
  const existing = await admin
    .from("matches")
    .select("id")
    .eq("import_source_key", pRow.importSourceKey)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }
  if (existing.data) {
    return "skipped";
  }

  const [player1Id, player2Id, hero1Id, hero2Id] = await Promise.all([
    ensureHistoricalPlayer(pRow.player1Pseudo),
    ensureHistoricalPlayer(pRow.player2Pseudo),
    ensureHero(pRow.hero1Name),
    ensureHero(pRow.hero2Name),
  ]);

  const winnerId =
    normalizePseudo(pRow.winnerPseudo) === normalizePseudo(pRow.player1Pseudo)
      ? player1Id
      : player2Id;

  const matchInsert = await admin
    .from("matches")
    .insert({
      season_id: SEED_IDS.globalSeasonId,
      created_by_profile_id: player1Id,
      player1_id: player1Id,
      player2_id: player2Id,
      status: "validated",
      played_at: pRow.playedAt,
      validated_at: pRow.validatedAt,
      validated_by_profile_id: player2Id,
      import_source_key: pRow.importSourceKey,
      achievements_eligible: false,
    })
    .select("id")
    .single();

  if (matchInsert.error || !matchInsert.data) {
    throw new Error(matchInsert.error?.message ?? "Impossible de créer le match importé.");
  }

  const matchId = matchInsert.data.id as string;
  const proposalInsert = await admin
    .from("match_proposals")
    .insert({
      match_id: matchId,
      version_number: 1,
      proposed_by_profile_id: player1Id,
      player1_id: player1Id,
      hero1_id: hero1Id,
      player2_id: player2Id,
      hero2_id: hero2Id,
      winner_profile_id: winnerId,
      winner_remaining_health: pRow.winnerRemainingHealth,
      player1_remaining_health: pRow.player1RemainingHealth,
      player2_remaining_health: pRow.player2RemainingHealth,
      notes: pRow.notes,
      played_at: pRow.playedAt,
    })
    .select("id")
    .single();

  if (proposalInsert.error || !proposalInsert.data) {
    throw new Error(proposalInsert.error?.message ?? "Impossible de créer la proposition importée.");
  }

  const link = await admin
    .from("matches")
    .update({ current_proposal_id: proposalInsert.data.id })
    .eq("id", matchId);

  if (link.error) {
    throw new Error(link.error.message);
  }

  await admin.from("match_actions").insert({
    match_id: matchId,
    actor_profile_id: player1Id,
    action_type: "created",
    from_status: null,
    to_status: "validated",
    reason: "historical_import",
    metadata: {
      importSourceKey: pRow.importSourceKey,
      rowNumber: pRow.rowNumber,
    },
  });

  return "imported";
}

export async function importHistoricalMatchesFile(pFilePath: string): Promise<ImportSummary> {
  const loaded = loadRawRowsFromFile(pFilePath);
  if (!Array.isArray(loaded)) {
    return {
      filePath: pFilePath,
      rowsRead: 0,
      imported: 0,
      skipped: 0,
      rejected: 1,
      issues: [loaded],
      recomputeFingerprint: null,
    };
  }

  const issues: HistoricalMatchRowIssue[] = [];
  const parsedRows: HistoricalMatchParsedRow[] = [];

  for (const raw of loaded) {
    const parsed = parseHistoricalMatchRow(raw);
    if (!parsed.ok) {
      issues.push(parsed.issue);
      continue;
    }
    parsedRows.push(parsed.row);
  }

  // Preserve chronological import order: playedAt then original row number.
  parsedRows.sort((pLeft, pRight) => {
    if (pLeft.playedAt !== pRight.playedAt) {
      return pLeft.playedAt < pRight.playedAt ? -1 : 1;
    }
    return pLeft.rowNumber - pRight.rowNumber;
  });

  let imported = 0;
  let skipped = 0;

  for (const row of parsedRows) {
    try {
      const result = await importParsedRow(row);
      if (result === "imported") {
        imported += 1;
      } else {
        skipped += 1;
      }
    } catch (pError) {
      issues.push({
        rowNumber: row.rowNumber,
        message: pError instanceof Error ? pError.message : "Erreur d’import.",
      });
    }
  }

  let recomputeFingerprint: string | null = null;
  if (imported > 0) {
    const summary = await recomputeSeasonRatings({ reason: `historical_import:${pFilePath}` });
    recomputeFingerprint = summary.fingerprint;
  }

  return {
    filePath: pFilePath,
    rowsRead: loaded.length,
    imported,
    skipped,
    rejected: issues.length,
    issues,
    recomputeFingerprint,
  };
}
