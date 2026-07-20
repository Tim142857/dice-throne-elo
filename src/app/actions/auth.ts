"use server";

import { redirect } from "next/navigation";

import { provisionAccountForUser } from "@/lib/auth/provision-account";
import { actionError, actionSuccess, firstZodError, type ActionResult } from "@/lib/actions/result";
import { buildAuthCallbackUrl, getAppBaseUrl } from "@/lib/app-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  completeRegistrationSchema,
  signInSchema,
  signUpSchema,
} from "@/validation/auth";
import { evaluatePseudoAvailability } from "@/domain/auth/pseudo-availability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePseudo } from "@/validation/pseudo";

async function assertPseudoCanBeRequested(pPseudo: string): Promise<ActionResult> {
  const admin = createSupabaseAdminClient();
  const normalized = normalizePseudo(pPseudo);

  const [profileResponse, pendingRequestResponse] = await Promise.all([
    admin
      .from("profiles")
      .select("id, pseudo, status")
      .eq("normalized_pseudo", normalized)
      .maybeSingle(),
    admin
      .from("account_requests")
      .select("id, status")
      .eq("normalized_pseudo", normalized)
      .eq("status", "pending")
      .maybeSingle(),
  ]);

  if (profileResponse.error) {
    return actionError(profileResponse.error.message);
  }
  if (pendingRequestResponse.error) {
    return actionError(pendingRequestResponse.error.message);
  }

  const availability = evaluatePseudoAvailability({
    existingProfile: profileResponse.data
      ? {
          id: profileResponse.data.id as string,
          pseudo: profileResponse.data.pseudo as string,
          status: profileResponse.data.status as
            | "preloaded"
            | "pendingApproval"
            | "active"
            | "rejected"
            | "suspended",
        }
      : null,
    existingPendingRequest: pendingRequestResponse.data
      ? {
          id: pendingRequestResponse.data.id as string,
          status: "pending",
        }
      : null,
  });

  if (availability.kind === "taken") {
    return actionError(availability.reason);
  }

  return actionSuccess(undefined);
}

export async function signUpAction(pFormData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    email: pFormData.get("email"),
    password: pFormData.get("password"),
    passwordConfirm: pFormData.get("passwordConfirm"),
    pseudo: pFormData.get("pseudo"),
    presentationMessage: pFormData.get("presentationMessage") || undefined,
  });

  if (!parsed.success) {
    return actionError(firstZodError(parsed.error));
  }

  const pseudoCheck = await assertPseudoCanBeRequested(parsed.data.pseudo);
  if (!pseudoCheck.ok) {
    return pseudoCheck;
  }

  const appBaseUrl = await getAppBaseUrl();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(appBaseUrl),
      data: {
        requested_pseudo: parsed.data.pseudo,
        presentation_message: parsed.data.presentationMessage,
      },
    },
  });

  if (error) {
    return actionError(error.message);
  }

  if (data.user && data.user.email_confirmed_at) {
    const provision = await provisionAccountForUser(data.user);
    if (provision.status === "error") {
      return actionError(provision.message);
    }
  }

  return actionSuccess(
    undefined,
    "Compte créé. Vérifiez votre email pour confirmer l’adresse, puis connectez-vous.",
  );
}

export async function signInAction(pFormData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse({
    email: pFormData.get("email"),
    password: pFormData.get("password"),
  });

  if (!parsed.success) {
    return actionError(firstZodError(parsed.error));
  }

  const nextPath = String(pFormData.get("next") || "/tableau-de-bord");
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return actionError("Email ou mot de passe incorrect.");
  }

  if (data.user) {
    const provision = await provisionAccountForUser(data.user);
    if (provision.status === "needsPseudo") {
      return actionSuccess({ redirectTo: "/inscription/finaliser" });
    }
    if (provision.status === "error") {
      return actionError(provision.message);
    }
  }

  return actionSuccess({ redirectTo: nextPath.startsWith("/") ? nextPath : "/tableau-de-bord" });
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function completeRegistrationAction(pFormData: FormData): Promise<ActionResult> {
  const parsed = completeRegistrationSchema.safeParse({
    pseudo: pFormData.get("pseudo"),
    presentationMessage: pFormData.get("presentationMessage") || undefined,
  });

  if (!parsed.success) {
    return actionError(firstZodError(parsed.error));
  }

  const pseudoCheck = await assertPseudoCanBeRequested(parsed.data.pseudo);
  if (!pseudoCheck.ok) {
    return pseudoCheck;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return actionError("Vous devez être connecté pour finaliser l’inscription.");
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      requested_pseudo: parsed.data.pseudo,
      presentation_message: parsed.data.presentationMessage,
    },
  });

  if (metadataError) {
    return actionError(metadataError.message);
  }

  const {
    data: { user: refreshedUser },
  } = await supabase.auth.getUser();

  if (!refreshedUser) {
    return actionError("Impossible de recharger le compte.");
  }

  const provision = await provisionAccountForUser(refreshedUser);
  if (provision.status === "error") {
    return actionError(provision.message);
  }
  if (provision.status === "needsPseudo") {
    return actionError("Le pseudo est obligatoire.");
  }
  if (provision.status === "waitingEmailVerification") {
    return actionError("Vérifiez d’abord votre adresse email.");
  }

  return actionSuccess(undefined, "Demande d’inscription enregistrée.");
}

export async function getGoogleOAuthUrlAction(pNextPath = "/tableau-de-bord"): Promise<ActionResult<{ url: string }>> {
  const appBaseUrl = await getAppBaseUrl();
  const supabase = await createSupabaseServerClient();
  const redirectTo = buildAuthCallbackUrl(appBaseUrl, pNextPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error || !data.url) {
    return actionError(error?.message ?? "Impossible de démarrer Google Auth.");
  }

  return actionSuccess({ url: data.url });
}
