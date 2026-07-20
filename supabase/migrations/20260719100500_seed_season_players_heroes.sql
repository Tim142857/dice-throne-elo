-- Seed initial season, historical players and heroes.

insert into public.seasons (id, name, starts_at, ends_at, is_active)
values (
  '00000000-0000-4000-8000-000000000001',
  'Saison globale',
  timestamptz '2020-01-01 00:00:00+00',
  null,
  true
);

insert into public.profiles (
  id,
  auth_user_id,
  pseudo,
  normalized_pseudo,
  slug,
  status,
  role,
  created_at,
  approved_at,
  suspended_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    null,
    'Ewenn',
    public.normalize_text('Ewenn'),
    public.slugify('Ewenn'),
    'preloaded',
    'player',
    timezone('utc', now()),
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    null,
    'Lomig',
    public.normalize_text('Lomig'),
    public.slugify('Lomig'),
    'preloaded',
    'player',
    timezone('utc', now()),
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    null,
    'Florine',
    public.normalize_text('Florine'),
    public.slugify('Florine'),
    'preloaded',
    'player',
    timezone('utc', now()),
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    null,
    'Flo',
    public.normalize_text('Flo'),
    public.slugify('Flo'),
    'preloaded',
    'player',
    timezone('utc', now()),
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    null,
    'Adrien',
    public.normalize_text('Adrien'),
    public.slugify('Adrien'),
    'preloaded',
    'player',
    timezone('utc', now()),
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    null,
    'Tim',
    public.normalize_text('Tim'),
    public.slugify('Tim'),
    'preloaded',
    'player',
    timezone('utc', now()),
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000007',
    null,
    'Anaelle',
    public.normalize_text('Anaelle'),
    public.slugify('Anaelle'),
    'preloaded',
    'player',
    timezone('utc', now()),
    null,
    null
  );

insert into public.player_ratings (profile_id, season_id, rating, best_rating)
select p.id, '00000000-0000-4000-8000-000000000001', 1000, 1000
from public.profiles p
where p.status = 'preloaded';

insert into public.heroes (name, normalized_name, slug, is_active)
select
  hero.name,
  public.normalize_text(hero.name),
  public.slugify(hero.name),
  true
from (
  values
    ('Barbare'),
    ('Elfe lunaire'),
    ('Moine'),
    ('Paladin'),
    ('Pyromancienne'),
    ('Voleur de l’ombre'),
    ('Tréant'),
    ('Ninja'),
    ('As de la gâchette'),
    ('Samouraï'),
    ('Séraphine'),
    ('Reine vampire'),
    ('Artificier'),
    ('Pirate maudite'),
    ('Tacticien'),
    ('Chasseresse'),
    ('Krampus'),
    ('Père Noël'),
    ('Black Panther'),
    ('Captain Marvel'),
    ('Black Widow'),
    ('Dr Strange'),
    ('Thor'),
    ('Loki'),
    ('Spiderman'),
    ('Scarlet Witch'),
    ('Cyclope'),
    ('Gambit'),
    ('Malicia'),
    ('Jean Grey'),
    ('Iceberg'),
    ('Psylocke'),
    ('Tornade'),
    ('Wolverine'),
    ('Deadpool'),
    ('Druide'),
    ('Elfe solaire'),
    ('Forgeron'),
    ('Duelliste'),
    ('Alchimiste'),
    ('Cavalier sans tête'),
    ('Nécromancien'),
    ('Dame pale'),
    ('Corbelle')
) as hero(name);
