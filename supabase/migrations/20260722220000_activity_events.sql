-- Public activity feed (mur d'actualités).

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  related_profile_ids uuid[] not null default '{}'::uuid[],
  related_match_id uuid references public.matches (id) on delete set null,
  title text not null,
  message text not null,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint activity_events_type_not_blank check (char_length(trim(type)) > 0),
  constraint activity_events_title_not_blank check (char_length(trim(title)) > 0),
  constraint activity_events_message_not_blank check (char_length(trim(message)) > 0)
);

create index activity_events_occurred_at_idx
  on public.activity_events (occurred_at desc);

create index activity_events_type_idx
  on public.activity_events (type);

create index activity_events_match_id_idx
  on public.activity_events (related_match_id)
  where related_match_id is not null;

alter table public.activity_events enable row level security;

create policy activity_events_select_all
  on public.activity_events
  for select
  using (true);
