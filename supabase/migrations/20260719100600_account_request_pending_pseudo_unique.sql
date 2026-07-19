-- Prevent two pending registrations from claiming the same pseudo.

create unique index account_requests_pending_normalized_pseudo_uidx
  on public.account_requests (normalized_pseudo)
  where status = 'pending';
