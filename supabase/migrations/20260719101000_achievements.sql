-- Achievements eligibility + player achievements storage.

alter type public.notification_type add value 'achievementUnlocked';

alter table public.matches
  add column achievements_eligible boolean not null default true;

-- All rows already present at activation are non-eligible (historical + pending).
update public.matches
set achievements_eligible = false;

create table public.player_achievements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  achievement_code text not null,
  unlocked_at timestamptz not null default timezone('utc', now()),
  trigger_match_id uuid references public.matches (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint player_achievements_code_not_blank check (char_length(trim(achievement_code)) > 0),
  constraint player_achievements_unique unique (profile_id, achievement_code)
);

create index player_achievements_profile_id_idx
  on public.player_achievements (profile_id);

create index player_achievements_code_idx
  on public.player_achievements (achievement_code);

create index player_achievements_unlocked_at_idx
  on public.player_achievements (unlocked_at desc);

alter table public.player_achievements enable row level security;

create policy player_achievements_select_all
  on public.player_achievements
  for select
  using (true);
