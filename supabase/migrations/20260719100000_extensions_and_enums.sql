-- Extensions, shared helpers and domain enums.

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.normalize_text(p_value text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(trim(both from regexp_replace(coalesce(p_value, ''), '\s+', ' ', 'g')));
$$;

-- Wrapper so slugify can be used safely from SQL helpers.
create or replace function public.unaccent_text(p_value text)
returns text
language sql
immutable
parallel safe
as $$
  select public.unaccent(p_value);
$$;

create or replace function public.slugify(p_value text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(
    both '-' from
    regexp_replace(
      regexp_replace(
        public.normalize_text(public.unaccent_text(p_value)),
        '[^a-z0-9]+',
        '-',
        'g'
      ),
      '-{2,}',
      '-',
      'g'
    )
  );
$$;

create type public.account_request_status as enum (
  'pending',
  'approved',
  'rejected'
);

create type public.profile_status as enum (
  'preloaded',
  'pendingApproval',
  'active',
  'rejected',
  'suspended'
);

create type public.profile_role as enum (
  'player',
  'admin'
);

create type public.match_status as enum (
  'pendingOpponent',
  'pendingCreatorConfirmation',
  'validated',
  'rejected',
  'disputed',
  'cancelled',
  'cancelledByAdmin'
);

create type public.rating_type as enum (
  'general',
  'playerHero'
);

create type public.match_action_type as enum (
  'created',
  'updated',
  'cancelledByCreator',
  'validatedByOpponent',
  'rejectedByOpponent',
  'correctionProposed',
  'correctionAccepted',
  'correctionRejected',
  'disputed',
  'resolvedByAdmin',
  'cancelledByAdmin'
);

create type public.notification_type as enum (
  'accountApproved',
  'accountRejected',
  'matchPendingValidation',
  'matchValidated',
  'matchRejected',
  'correctionProposed',
  'correctionAccepted',
  'correctionRejected',
  'matchDisputed',
  'adminDecision'
);
