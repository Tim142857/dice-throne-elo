import type { User } from "@supabase/supabase-js";

import { ensureAdminBootstrap } from "@/lib/auth/admin-bootstrap";
import { provisionAccountForUser } from "@/lib/auth/provision-account";
import {
  mapAccountRequestRow,
  mapProfileRow,
  type AccountRequestDbRow,
  type ProfileDbRow,
} from "@/lib/mappers/account";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AccountRequestRow, ProfileRow } from "@/types/database";

export type AuthContext = {
  user: User;
  profile: ProfileRow | null;
  accountRequest: AccountRequestRow | null;
  emailVerified: boolean;
};

export async function getAuthUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user;
}

export async function requireAuthUser(): Promise<User> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Authentification requise.");
  }
  return user;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const user = await getAuthUser();
  if (!user) {
    return null;
  }

  const emailVerified = Boolean(user.email_confirmed_at);

  if (emailVerified) {
    await provisionAccountForUser(user);
    await ensureAdminBootstrap(user);
  }

  const admin = createSupabaseAdminClient();

  const [profileResponse, requestResponse] = await Promise.all([
    admin.from("profiles").select("*").eq("auth_user_id", user.id).maybeSingle(),
    admin.from("account_requests").select("*").eq("auth_user_id", user.id).maybeSingle(),
  ]);

  if (profileResponse.error || requestResponse.error) {
    throw new Error(profileResponse.error?.message ?? requestResponse.error?.message);
  }

  return {
    user,
    profile: profileResponse.data ? mapProfileRow(profileResponse.data as ProfileDbRow) : null,
    accountRequest: requestResponse.data
      ? mapAccountRequestRow(requestResponse.data as AccountRequestDbRow)
      : null,
    emailVerified,
  };
}

export async function requireAdminContext(): Promise<AuthContext & { profile: ProfileRow }> {
  const context = await getAuthContext();
  if (!context?.profile || context.profile.role !== "admin" || context.profile.status !== "active") {
    throw new Error("Accès administrateur requis.");
  }
  return { ...context, profile: context.profile };
}

export function getAccountStatusLabel(pContext: AuthContext): string {
  if (!pContext.emailVerified) {
    return "Vérification de l’email en attente";
  }
  if (pContext.profile?.role === "admin" && pContext.profile.status === "active") {
    return "Administrateur";
  }
  if (!pContext.accountRequest) {
    return "Finalisation de l’inscription requise";
  }
  if (pContext.accountRequest.status === "pending") {
    return "En attente de validation par l’administrateur";
  }
  if (pContext.accountRequest.status === "rejected") {
    return "Demande refusée";
  }
  if (pContext.profile?.status === "suspended") {
    return "Compte suspendu";
  }
  if (pContext.profile?.status === "active") {
    return "Compte actif";
  }
  return "Statut inconnu";
}

export function canDeclareMatches(pContext: AuthContext): boolean {
  return pContext.profile?.status === "active";
}
