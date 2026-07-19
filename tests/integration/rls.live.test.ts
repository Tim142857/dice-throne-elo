import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { getPublicEnv, getServerEnv } from "@/lib/env";
import { SEED_IDS } from "@/types/database";

import { integrationEnvReady } from "./env";

const describeLive = integrationEnvReady() ? describe : describe.skip;

describeLive("RLS live (anon client)", () => {
  function createAnonClient() {
    const env = getPublicEnv();
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  function createAdminClient() {
    const env = getServerEnv();
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  it("allows reading public ratings and heroes", async () => {
    const anon = createAnonClient();
    const [ratings, heroes] = await Promise.all([
      anon.from("player_ratings").select("profile_id,rating").limit(1),
      anon.from("heroes").select("id,name").limit(1),
    ]);
    expect(ratings.error).toBeNull();
    expect(heroes.error).toBeNull();
  });

  it("rejects anon insert into matches", async () => {
    const anon = createAnonClient();
    const result = await anon.from("matches").insert({
      season_id: SEED_IDS.globalSeasonId,
      created_by_profile_id: SEED_IDS.profiles.ewenn,
      player1_id: SEED_IDS.profiles.ewenn,
      player2_id: SEED_IDS.profiles.tim,
      status: "validated",
      played_at: "2099-01-01",
    });
    expect(result.error).not.toBeNull();
  });

  it("prevents anon from changing player_ratings", async () => {
    const anon = createAnonClient();
    const admin = createAdminClient();

    const before = await admin
      .from("player_ratings")
      .select("rating")
      .eq("profile_id", SEED_IDS.profiles.tim)
      .eq("season_id", SEED_IDS.globalSeasonId)
      .single();
    expect(before.error).toBeNull();
    const original = Number(before.data?.rating);

    await anon
      .from("player_ratings")
      .update({ rating: original + 1234 })
      .eq("profile_id", SEED_IDS.profiles.tim)
      .eq("season_id", SEED_IDS.globalSeasonId);

    const after = await admin
      .from("player_ratings")
      .select("rating")
      .eq("profile_id", SEED_IDS.profiles.tim)
      .eq("season_id", SEED_IDS.globalSeasonId)
      .single();
    expect(after.error).toBeNull();
    expect(Number(after.data?.rating)).toBe(original);
  });

  it("hides non-validated matches from anon", async () => {
    const admin = createAdminClient();
    const anon = createAnonClient();

    const inserted = await admin
      .from("matches")
      .insert({
        season_id: SEED_IDS.globalSeasonId,
        created_by_profile_id: SEED_IDS.profiles.ewenn,
        player1_id: SEED_IDS.profiles.ewenn,
        player2_id: SEED_IDS.profiles.tim,
        status: "pendingOpponent",
        played_at: "2099-02-01",
        import_source_key: `rls-test:${Date.now()}`,
      })
      .select("id")
      .single();

    expect(inserted.error).toBeNull();
    const matchId = inserted.data?.id as string;

    try {
      const visible = await anon.from("matches").select("id").eq("id", matchId).maybeSingle();
      expect(visible.error).toBeNull();
      expect(visible.data).toBeNull();
    } finally {
      await admin.from("matches").delete().eq("id", matchId);
    }
  });
});
