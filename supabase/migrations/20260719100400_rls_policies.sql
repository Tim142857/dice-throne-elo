-- Auth helper functions and Row Level Security policies.
-- Sensitive writes are expected to go through server actions / service role.
-- Clients get selective read access and no direct Elo/admin mutations.

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_profile_status()
returns public.profile_status
language sql
stable
security definer
set search_path = public
as $$
  select status
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.is_active_player()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and role in ('player', 'admin')
      and status = 'active'
  );
$$;

create or replace function public.is_match_participant(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches m
    where m.id = p_match_id
      and public.current_profile_id() in (m.player1_id, m.player2_id)
  );
$$;

revoke all on function public.current_profile_id() from public;
revoke all on function public.current_profile_status() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_active_player() from public;
revoke all on function public.is_match_participant(uuid) from public;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_profile_status() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_player() to authenticated;
grant execute on function public.is_match_participant(uuid) to authenticated;

alter table public.seasons enable row level security;
alter table public.profiles enable row level security;
alter table public.account_requests enable row level security;
alter table public.heroes enable row level security;
alter table public.matches enable row level security;
alter table public.match_proposals enable row level security;
alter table public.match_actions enable row level security;
alter table public.player_ratings enable row level security;
alter table public.player_hero_ratings enable row level security;
alter table public.rating_events enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- seasons
create policy seasons_select_all
  on public.seasons
  for select
  to anon, authenticated
  using (true);

create policy seasons_admin_write
  on public.seasons
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- profiles
create policy profiles_select_public
  on public.profiles
  for select
  to anon, authenticated
  using (status in ('preloaded', 'active', 'suspended'));

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());

create policy profiles_admin_update
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy profiles_admin_insert
  on public.profiles
  for insert
  to authenticated
  with check (public.is_admin());

-- account_requests
create policy account_requests_select_own_or_admin
  on public.account_requests
  for select
  to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());

create policy account_requests_insert_own
  on public.account_requests
  for insert
  to authenticated
  with check (
    auth_user_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and rejection_reason is null
  );

create policy account_requests_admin_update
  on public.account_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- heroes
create policy heroes_select_all
  on public.heroes
  for select
  to anon, authenticated
  using (true);

create policy heroes_admin_write
  on public.heroes
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- matches
create policy matches_select_validated_public
  on public.matches
  for select
  to anon, authenticated
  using (status = 'validated');

create policy matches_select_participant_or_admin
  on public.matches
  for select
  to authenticated
  using (
    public.is_admin()
    or public.current_profile_id() in (player1_id, player2_id)
  );

-- match_proposals
create policy match_proposals_select_validated_public
  on public.match_proposals
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and m.status = 'validated'
    )
  );

create policy match_proposals_select_participant_or_admin
  on public.match_proposals
  for select
  to authenticated
  using (
    public.is_admin()
    or public.is_match_participant(match_id)
  );

-- match_actions: public can read actions of validated matches; participants see their match trail
create policy match_actions_select_validated_public
  on public.match_actions
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and m.status = 'validated'
    )
  );

create policy match_actions_select_participant_or_admin
  on public.match_actions
  for select
  to authenticated
  using (
    public.is_admin()
    or public.is_match_participant(match_id)
  );

-- Elo tables: readable publicly, no direct client writes
create policy player_ratings_select_all
  on public.player_ratings
  for select
  to anon, authenticated
  using (true);

create policy player_hero_ratings_select_all
  on public.player_hero_ratings
  for select
  to anon, authenticated
  using (true);

create policy rating_events_select_all
  on public.rating_events
  for select
  to anon, authenticated
  using (true);

-- notifications
create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using (
    recipient_profile_id = public.current_profile_id()
    or public.is_admin()
  );

create policy notifications_update_own_read_state
  on public.notifications
  for update
  to authenticated
  using (recipient_profile_id = public.current_profile_id())
  with check (recipient_profile_id = public.current_profile_id());

-- audit logs: admin only
create policy audit_logs_admin_select
  on public.audit_logs
  for select
  to authenticated
  using (public.is_admin());
