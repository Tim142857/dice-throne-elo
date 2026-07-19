import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { NotificationRow, NotificationType } from "@/types/database";

type NotificationDbRow = {
  id: string;
  recipient_profile_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_match_id: string | null;
  read_at: string | null;
  created_at: string;
};

function mapNotificationRow(pRow: NotificationDbRow): NotificationRow {
  return {
    id: pRow.id,
    recipientProfileId: pRow.recipient_profile_id,
    type: pRow.type,
    title: pRow.title,
    message: pRow.message,
    relatedMatchId: pRow.related_match_id,
    readAt: pRow.read_at,
    createdAt: pRow.created_at,
  };
}

export async function listNotificationsForProfile(
  pProfileId: string,
  pLimit = 50,
): Promise<NotificationRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("*")
    .eq("recipient_profile_id", pProfileId)
    .order("created_at", { ascending: false })
    .limit(pLimit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as NotificationDbRow[]).map(mapNotificationRow);
}

export async function countUnreadNotifications(pProfileId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { count, error } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_profile_id", pProfileId)
    .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function markNotificationRead(pInput: {
  profileId: string;
  notificationId: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", pInput.notificationId)
    .eq("recipient_profile_id", pInput.profileId)
    .is("read_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    // Already read or not owned — treat as success for idempotency.
  }
}

export async function markAllNotificationsRead(pProfileId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_profile_id", pProfileId)
    .is("read_at", null)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}
