"use server";

import { revalidatePath } from "next/cache";

import { getAuthContext } from "@/lib/auth/session";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/service";

export async function markNotificationReadAction(pFormData: FormData): Promise<void> {
  const context = await getAuthContext();
  if (!context?.profile) {
    return;
  }

  const notificationId = String(pFormData.get("notificationId") || "");
  if (!notificationId) {
    return;
  }

  await markNotificationRead({
    profileId: context.profile.id,
    notificationId,
  });
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction(pFormData: FormData): Promise<void> {
  void pFormData;
  const context = await getAuthContext();
  if (!context?.profile) {
    return;
  }

  await markAllNotificationsRead(context.profile.id);
  revalidatePath("/notifications");
}
