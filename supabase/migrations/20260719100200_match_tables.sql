-- Match workflow tables.

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete restrict,
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  player1_id uuid not null references public.profiles (id) on delete restrict,
  player2_id uuid not null references public.profiles (id) on delete restrict,
  current_proposal_id uuid,
  status public.match_status not null,
  played_at date not null,
  validated_at timestamptz,
  validated_by_profile_id uuid references public.profiles (id) on delete set null,
  cancelled_at timestamptz,
  import_source_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint matches_players_distinct check (player1_id <> player2_id),
  constraint matches_creator_is_participant check (
    created_by_profile_id = player1_id or created_by_profile_id = player2_id
  ),
  constraint matches_played_at_not_future check (
    played_at <= (timezone('utc', now()))::date
  ),
  constraint matches_validated_consistency check (
    (
      status = 'validated'
      and validated_at is not null
    )
    or (
      status <> 'validated'
      and validated_at is null
      and validated_by_profile_id is null
    )
  ),
  constraint matches_cancelled_consistency check (
    (
      status in ('cancelled', 'cancelledByAdmin')
      and cancelled_at is not null
    )
    or (
      status not in ('cancelled', 'cancelledByAdmin')
      and cancelled_at is null
    )
  )
);

create unique index matches_import_source_key_uidx
  on public.matches (import_source_key)
  where import_source_key is not null;

create index matches_status_idx
  on public.matches (status);

create index matches_season_id_idx
  on public.matches (season_id);

create index matches_player1_id_idx
  on public.matches (player1_id);

create index matches_player2_id_idx
  on public.matches (player2_id);

create index matches_played_at_idx
  on public.matches (played_at);

create index matches_validated_at_idx
  on public.matches (validated_at);

create index matches_created_by_profile_id_idx
  on public.matches (created_by_profile_id);

create trigger matches_set_updated_at
before update on public.matches
for each row
execute function public.set_updated_at();

create table public.match_proposals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  version_number integer not null,
  proposed_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  player1_id uuid not null references public.profiles (id) on delete restrict,
  hero1_id uuid not null references public.heroes (id) on delete restrict,
  player2_id uuid not null references public.profiles (id) on delete restrict,
  hero2_id uuid not null references public.heroes (id) on delete restrict,
  winner_profile_id uuid not null references public.profiles (id) on delete restrict,
  winner_remaining_health integer not null,
  notes text,
  played_at date not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint match_proposals_version_positive check (version_number >= 1),
  constraint match_proposals_players_distinct check (player1_id <> player2_id),
  constraint match_proposals_winner_is_participant check (
    winner_profile_id = player1_id or winner_profile_id = player2_id
  ),
  constraint match_proposals_health_range check (
    winner_remaining_health between 0 and 50
  ),
  constraint match_proposals_notes_length check (
    notes is null or char_length(notes) <= 500
  ),
  constraint match_proposals_played_at_not_future check (
    played_at <= (timezone('utc', now()))::date
  ),
  constraint match_proposals_unique_version unique (match_id, version_number)
);

create index match_proposals_match_id_idx
  on public.match_proposals (match_id);

create index match_proposals_proposed_by_idx
  on public.match_proposals (proposed_by_profile_id);

alter table public.matches
  add constraint matches_current_proposal_id_fkey
  foreign key (current_proposal_id)
  references public.match_proposals (id)
  on delete set null;

create table public.match_actions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  action_type public.match_action_type not null,
  from_status public.match_status,
  to_status public.match_status not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint match_actions_reason_length check (
    reason is null or char_length(reason) <= 1000
  )
);

create index match_actions_match_id_idx
  on public.match_actions (match_id);

create index match_actions_created_at_idx
  on public.match_actions (created_at);
