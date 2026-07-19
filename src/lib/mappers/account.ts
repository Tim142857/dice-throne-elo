import type { AccountStatus, ProfileRole } from "@/types/domain";
import type { AccountRequestRow, AccountRequestStatus, ProfileRow } from "@/types/database";

export type ProfileDbRow = {
  id: string;
  auth_user_id: string | null;
  pseudo: string;
  normalized_pseudo: string;
  slug: string;
  status: AccountStatus;
  role: ProfileRole;
  created_at: string;
  approved_at: string | null;
  suspended_at: string | null;
};

export type AccountRequestDbRow = {
  id: string;
  auth_user_id: string;
  requested_pseudo: string;
  normalized_pseudo: string;
  presentation_message: string | null;
  status: AccountRequestStatus;
  linked_profile_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
};

export function mapProfileRow(pRow: ProfileDbRow): ProfileRow {
  return {
    id: pRow.id,
    authUserId: pRow.auth_user_id,
    pseudo: pRow.pseudo,
    normalizedPseudo: pRow.normalized_pseudo,
    slug: pRow.slug,
    status: pRow.status,
    role: pRow.role,
    createdAt: pRow.created_at,
    approvedAt: pRow.approved_at,
    suspendedAt: pRow.suspended_at,
  };
}

export function mapAccountRequestRow(pRow: AccountRequestDbRow): AccountRequestRow {
  return {
    id: pRow.id,
    authUserId: pRow.auth_user_id,
    requestedPseudo: pRow.requested_pseudo,
    normalizedPseudo: pRow.normalized_pseudo,
    presentationMessage: pRow.presentation_message,
    status: pRow.status,
    linkedProfileId: pRow.linked_profile_id,
    reviewedBy: pRow.reviewed_by,
    reviewedAt: pRow.reviewed_at,
    rejectionReason: pRow.rejection_reason,
    createdAt: pRow.created_at,
  };
}
