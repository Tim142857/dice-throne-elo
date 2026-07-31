-- Preference: auto-validate matches declared by opponents.
alter table public.profiles
  add column if not exists auto_validate_matches boolean not null default false;

comment on column public.profiles.auto_validate_matches is
  'When true, matches declared by an opponent are validated automatically without manual confirmation.';
