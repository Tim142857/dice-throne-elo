-- Store final health for both players (knockout or timer end).

alter table public.match_proposals
  add column player1_remaining_health integer,
  add column player2_remaining_health integer;

update public.match_proposals
set
  player1_remaining_health = case
    when winner_profile_id = player1_id then winner_remaining_health
    else 0
  end,
  player2_remaining_health = case
    when winner_profile_id = player2_id then winner_remaining_health
    else 0
  end;

alter table public.match_proposals
  alter column player1_remaining_health set not null,
  alter column player2_remaining_health set not null;

alter table public.match_proposals
  add constraint match_proposals_player1_health_range check (
    player1_remaining_health between 0 and 50
  ),
  add constraint match_proposals_player2_health_range check (
    player2_remaining_health between 0 and 50
  ),
  add constraint match_proposals_final_health_not_both_zero check (
    player1_remaining_health > 0 or player2_remaining_health > 0
  );
