import type { User } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import { slugify } from "@/lib/text";
import { normalizePseudo } from "@/validation/pseudo";
import { mapProfileRow, type ProfileDbRow } from "@/lib/mappers/account";
import type { ProfileRow } from "@/types/database";

/**
 * Promotes the configured ADMIN_EMAIL user to the unique admin role.
 * Safe to call repeatedly; never exposes an admin switch in the public UI.
 */
export async function ensureAdminBootstrap(pUser: User): Promise<ProfileRow | null> {
  if (!pUser.email || !pUser.email_confirmed_at) {
    return null;
  }

  let env;
  try {
    env = getServerEnv();
  } catch {
    return null;
  }

  if (pUser.email.toLocaleLowerCase("en-US") !== env.ADMIN_EMAIL.toLocaleLowerCase("en-US")) {
    return null;
  }

  const admin = createSupabaseAdminClient();

  const existingAdminResponse = await admin
    .from("profiles")
    .select("*")
    .eq("role", "admin")
    .maybeSingle();

  if (existingAdminResponse.error) {
    throw new Error(existingAdminResponse.error.message);
  }

  const existingOwnProfileResponse = await admin
    .from("profiles")
    .select("*")
    .eq("auth_user_id", pUser.id)
    .maybeSingle();

  if (existingOwnProfileResponse.error) {
    throw new Error(existingOwnProfileResponse.error.message);
  }

  if (existingAdminResponse.data) {
    const existingAdmin = mapProfileRow(existingAdminResponse.data as ProfileDbRow);
    if (existingAdmin.authUserId === pUser.id) {
      if (existingAdmin.status !== "active") {
        const { data, error } = await admin
          .from("profiles")
          .update({
            status: "active",
            approved_at: existingAdmin.approvedAt ?? new Date().toISOString(),
            suspended_at: null,
          })
          .eq("id", existingAdmin.id)
          .select("*")
          .single();
        if (error) {
          throw new Error(error.message);
        }
        return mapProfileRow(data as ProfileDbRow);
      }
      return existingAdmin;
    }
    // Another admin already exists: do not steal the role.
    return existingOwnProfileResponse.data
      ? mapProfileRow(existingOwnProfileResponse.data as ProfileDbRow)
      : null;
  }

  if (existingOwnProfileResponse.data) {
    const { data, error } = await admin
      .from("profiles")
      .update({
        role: "admin",
        status: "active",
        approved_at: new Date().toISOString(),
        suspended_at: null,
      })
      .eq("id", existingOwnProfileResponse.data.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await admin
      .from("account_requests")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: data.id,
        rejection_reason: null,
      })
      .eq("auth_user_id", pUser.id)
      .eq("status", "pending");

    return mapProfileRow(data as ProfileDbRow);
  }

  const accountRequestResponse = await admin
    .from("account_requests")
    .select("requested_pseudo")
    .eq("auth_user_id", pUser.id)
    .maybeSingle();

  if (accountRequestResponse.error) {
    throw new Error(accountRequestResponse.error.message);
  }

  const metadataPseudo =
    typeof pUser.user_metadata?.requested_pseudo === "string"
      ? pUser.user_metadata.requested_pseudo.trim()
      : "";
  const localPart = pUser.email.split("@")[0] ?? "Admin";
  const emailPseudo = localPart.slice(0, 24).replace(/[^A-Za-z0-9 _-]/g, "") || "Admin";
  const pseudo =
    (accountRequestResponse.data?.requested_pseudo as string | undefined) ||
    metadataPseudo ||
    emailPseudo;
  const normalized = normalizePseudo(pseudo);

  const { data, error } = await admin
    .from("profiles")
    .insert({
      auth_user_id: pUser.id,
      pseudo,
      normalized_pseudo: normalized,
      slug: slugify(pseudo),
      status: "active",
      role: "admin",
      approved_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapProfileRow(data as ProfileDbRow);
}
