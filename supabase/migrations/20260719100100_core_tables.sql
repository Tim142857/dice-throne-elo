-- Core identity, heroes and seasons.

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint seasons_name_not_blank check (char_length(trim(name)) > 0),
  constraint seasons_date_range_valid check (ends_at is null or ends_at >= starts_at)
);

create unique index seasons_one_active_idx
  on public.seasons ((is_active))
  where is_active;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  pseudo text not null,
  normalized_pseudo text not null,
  slug text not null,
  status public.profile_status not null,
  role public.profile_role not null default 'player',
  created_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz,
  suspended_at timestamptz,
  constraint profiles_pseudo_length check (char_length(pseudo) between 3 and 24),
  constraint profiles_pseudo_charset check (
    pseudo ~ '^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$'
  ),
  constraint profiles_normalized_pseudo_matches check (
    normalized_pseudo = public.normalize_text(pseudo)
  ),
  constraint profiles_slug_not_blank check (char_length(slug) > 0),
  constraint profiles_approved_requires_active check (
    approved_at is null or status = 'active'
  ),
  constraint profiles_suspended_consistency check (
    (status = 'suspended' and suspended_at is not null)
    or (status <> 'suspended' and suspended_at is null)
  ),
  constraint profiles_preloaded_has_no_auth check (
    status <> 'preloaded' or auth_user_id is null
  )
);

create unique index profiles_normalized_pseudo_uidx
  on public.profiles (normalized_pseudo);

create unique index profiles_slug_uidx
  on public.profiles (slug);

create index profiles_status_idx
  on public.profiles (status);

create index profiles_role_idx
  on public.profiles (role);

create table public.account_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  requested_pseudo text not null,
  normalized_pseudo text not null,
  presentation_message text,
  status public.account_request_status not null default 'pending',
  linked_profile_id uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint account_requests_pseudo_length check (
    char_length(requested_pseudo) between 3 and 24
  ),
  constraint account_requests_pseudo_charset check (
    requested_pseudo ~ '^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$'
  ),
  constraint account_requests_normalized_pseudo_matches check (
    normalized_pseudo = public.normalize_text(requested_pseudo)
  ),
  constraint account_requests_presentation_length check (
    presentation_message is null or char_length(presentation_message) <= 500
  ),
  constraint account_requests_rejection_reason_length check (
    rejection_reason is null or char_length(rejection_reason) <= 1000
  ),
  constraint account_requests_review_consistency check (
    (
      status = 'pending'
      and reviewed_by is null
      and reviewed_at is null
      and rejection_reason is null
    )
    or (
      status = 'approved'
      and reviewed_by is not null
      and reviewed_at is not null
      and rejection_reason is null
    )
    or (
      status = 'rejected'
      and reviewed_by is not null
      and reviewed_at is not null
    )
  )
);

create index account_requests_status_idx
  on public.account_requests (status);

create index account_requests_normalized_pseudo_idx
  on public.account_requests (normalized_pseudo);

create table public.heroes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  slug text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint heroes_name_not_blank check (char_length(trim(name)) > 0),
  constraint heroes_normalized_name_matches check (
    normalized_name = public.normalize_text(name)
  ),
  constraint heroes_slug_not_blank check (char_length(slug) > 0)
);

create unique index heroes_normalized_name_uidx
  on public.heroes (normalized_name);

create unique index heroes_slug_uidx
  on public.heroes (slug);

create index heroes_is_active_idx
  on public.heroes (is_active);

create trigger heroes_set_updated_at
before update on public.heroes
for each row
execute function public.set_updated_at();
