-- Elo snapshots, events, notifications and audit log.

create table public.player_ratings (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  season_id uuid not null references public.seasons (id) on delete cascade,
  rating numeric(12, 6) not null default 1000,
  matches_count integer not null default 0,
  wins_count integer not null default 0,
  losses_count integer not null default 0,
  current_streak integer not null default 0,
  best_rating numeric(12, 6) not null default 1000,
  worst_rating numeric(12, 6),
  last_validated_match_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, season_id),
  constraint player_ratings_counts_valid check (
    matches_count >= 0
    and wins_count >= 0
    and losses_count >= 0
    and wins_count + losses_count = matches_count
  )
);

create index player_ratings_season_rating_idx
  on public.player_ratings (season_id, rating desc);

create trigger player_ratings_set_updated_at
before update on public.player_ratings
for each row
execute function public.set_updated_at();

create table public.player_hero_ratings (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  hero_id uuid not null references public.heroes (id) on delete cascade,
  season_id uuid not null references public.seasons (id) on delete cascade,
  rating numeric(12, 6) not null default 1000,
  matches_count integer not null default 0,
  wins_count integer not null default 0,
  losses_count integer not null default 0,
  last_used_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, hero_id, season_id),
  constraint player_hero_ratings_counts_valid check (
    matches_count >= 0
    and wins_count >= 0
    and losses_count >= 0
    and wins_count + losses_count = matches_count
  )
);

create index player_hero_ratings_season_rating_idx
  on public.player_hero_ratings (season_id, rating desc);

create index player_hero_ratings_hero_id_idx
  on public.player_hero_ratings (hero_id);

create trigger player_hero_ratings_set_updated_at
before update on public.player_hero_ratings
for each row
execute function public.set_updated_at();

create table public.rating_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  season_id uuid not null references public.seasons (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  hero_id uuid references public.heroes (id) on delete restrict,
  rating_type public.rating_type not null,
  rating_before numeric(12, 6) not null,
  expected_score numeric(12, 6) not null,
  actual_score numeric(12, 6) not null,
  rating_change numeric(12, 6) not null,
  rating_after numeric(12, 6) not null,
  processed_at timestamptz not null default timezone('utc', now()),
  constraint rating_events_actual_score_binary check (actual_score in (0, 1)),
  constraint rating_events_hero_consistency check (
    (rating_type = 'general' and hero_id is null)
    or (rating_type = 'playerHero' and hero_id is not null)
  )
);

create index rating_events_match_id_idx
  on public.rating_events (match_id);

create index rating_events_profile_id_idx
  on public.rating_events (profile_id);

create index rating_events_season_processed_idx
  on public.rating_events (season_id, processed_at);

create unique index rating_events_unique_general_uidx
  on public.rating_events (match_id, profile_id)
  where rating_type = 'general';

create unique index rating_events_unique_player_hero_uidx
  on public.rating_events (match_id, profile_id, hero_id)
  where rating_type = 'playerHero';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  message text not null,
  related_match_id uuid references public.matches (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notifications_title_not_blank check (char_length(trim(title)) > 0),
  constraint notifications_message_not_blank check (char_length(trim(message)) > 0)
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_profile_id, created_at desc);

create index notifications_recipient_unread_idx
  on public.notifications (recipient_profile_id)
  where read_at is null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint audit_logs_action_not_blank check (char_length(trim(action)) > 0),
  constraint audit_logs_entity_type_not_blank check (char_length(trim(entity_type)) > 0)
);

create index audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);
