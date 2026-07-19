import { config as loadEnv } from "dotenv";
import path from "node:path";

import { importHistoricalMatchesFile } from "@/lib/import/historical-matches-importer";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv();

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run import:matches -- <fichier.csv|xlsx>");
    console.error("Exemple: npm run import:matches -- data/demo/historical-matches.demo.csv");
    process.exitCode = 1;
    return;
  }

  const summary = await importHistoricalMatchesFile(filePath);

  console.log("=== Import historique Dice Throne Elo ===");
  console.log(`Fichier     : ${summary.filePath}`);
  console.log(`Lignes lues : ${summary.rowsRead}`);
  console.log(`Importées   : ${summary.imported}`);
  console.log(`Ignorées    : ${summary.skipped}`);
  console.log(`Rejetées    : ${summary.rejected}`);
  if (summary.recomputeFingerprint) {
    console.log(`Recalcul    : OK (${summary.recomputeFingerprint.slice(0, 48)}…)`);
  } else {
    console.log("Recalcul    : non exécuté");
  }

  if (summary.issues.length > 0) {
    console.log("\nRapport d’erreurs :");
    for (const issue of summary.issues.slice(0, 50)) {
      console.log(`- Ligne ${issue.rowNumber}: ${issue.message}`);
    }
    if (summary.issues.length > 50) {
      console.log(`… et ${summary.issues.length - 50} autres.`);
    }
  }
}

main().catch((pError: unknown) => {
  console.error(pError instanceof Error ? pError.message : pError);
  process.exitCode = 1;
});
