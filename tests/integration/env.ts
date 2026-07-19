import { config as loadEnv } from "dotenv";
import path from "node:path";

import { hasServerEnv } from "@/lib/env";

let loaded = false;

export function loadTestEnv(): void {
  if (loaded) {
    return;
  }
  loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
  loadEnv();
  loaded = true;
}

export function integrationEnvReady(): boolean {
  loadTestEnv();
  return hasServerEnv();
}
