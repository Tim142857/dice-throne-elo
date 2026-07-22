import {
  type ActivityEventInput,
  type ActivityEventRow,
  type ActivityEventType,
  ACTIVITY_EVENT_TYPES,
} from "@/domain/activity/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActivityEventDbRow = {
  id: string;
  type: string;
  occurred_at: string;
  actor_profile_id: string | null;
  related_profile_ids: string[] | null;
  related_match_id: string | null;
  title: string;
  message: string;
  href: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function mapActivityEventRow(pRow: ActivityEventDbRow): ActivityEventRow {
  const type = ACTIVITY_EVENT_TYPES.includes(pRow.type as ActivityEventType)
    ? (pRow.type as ActivityEventType)
    : ("notable_match" as ActivityEventType);
  return {
    id: pRow.id,
    type,
    occurredAt: pRow.occurred_at,
    actorProfileId: pRow.actor_profile_id,
    relatedProfileIds: pRow.related_profile_ids ?? [],
    relatedMatchId: pRow.related_match_id,
    title: pRow.title,
    message: pRow.message,
    href: pRow.href,
    metadata: pRow.metadata ?? {},
    createdAt: pRow.created_at,
  };
}

export async function insertActivityEvent(pInput: ActivityEventInput): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("activity_events").insert({
    type: pInput.type,
    occurred_at: pInput.occurredAt ?? new Date().toISOString(),
    actor_profile_id: pInput.actorProfileId ?? null,
    related_profile_ids: pInput.relatedProfileIds ?? [],
    related_match_id: pInput.relatedMatchId ?? null,
    title: pInput.title,
    message: pInput.message,
    href: pInput.href ?? null,
    metadata: pInput.metadata ?? {},
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function insertActivityEvents(pInputs: ActivityEventInput[]): Promise<void> {
  if (pInputs.length === 0) {
    return;
  }
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("activity_events").insert(
    pInputs.map((pInput) => ({
      type: pInput.type,
      occurred_at: pInput.occurredAt ?? new Date().toISOString(),
      actor_profile_id: pInput.actorProfileId ?? null,
      related_profile_ids: pInput.relatedProfileIds ?? [],
      related_match_id: pInput.relatedMatchId ?? null,
      title: pInput.title,
      message: pInput.message,
      href: pInput.href ?? null,
      metadata: pInput.metadata ?? {},
    })),
  );
  if (error) {
    throw new Error(error.message);
  }
}

export type ActivityFeedItem = ActivityEventRow & {
  actorPseudo: string | null;
  actorSlug: string | null;
};

export async function listActivityFeed(pLimit = 30): Promise<ActivityFeedItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("activity_events")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(pLimit);

  if (error) {
    throw new Error(error.message);
  }

  const events = ((data ?? []) as ActivityEventDbRow[]).map(mapActivityEventRow);
  if (events.length === 0) {
    return [];
  }

  const profileIds = [
    ...new Set(
      events.flatMap((pEvent) => [
        ...(pEvent.actorProfileId ? [pEvent.actorProfileId] : []),
        ...pEvent.relatedProfileIds,
      ]),
    ),
  ];

  const profilesResponse =
    profileIds.length > 0
      ? await supabase.from("profiles").select("id, pseudo, slug").in("id", profileIds)
      : { data: [], error: null };

  if (profilesResponse.error) {
    throw new Error(profilesResponse.error.message);
  }

  const profilesById = new Map(
    ((profilesResponse.data ?? []) as Array<{ id: string; pseudo: string; slug: string }>).map(
      (pRow) => [pRow.id, pRow],
    ),
  );

  return events.map((pEvent) => {
    const actor = pEvent.actorProfileId ? profilesById.get(pEvent.actorProfileId) : null;
    return {
      ...pEvent,
      actorPseudo: actor?.pseudo ?? null,
      actorSlug: actor?.slug ?? null,
      href:
        pEvent.href ??
        (actor?.slug ? `/joueurs/${actor.slug}` : pEvent.relatedMatchId ? `/matchs#match-${pEvent.relatedMatchId}` : null),
    };
  });
}
