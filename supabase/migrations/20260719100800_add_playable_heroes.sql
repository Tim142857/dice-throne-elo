-- Add newly playable heroes (idempotent for fresh installs that already include the seed).

insert into public.heroes (name, normalized_name, slug, is_active)
select
  hero.name,
  public.normalize_text(hero.name),
  public.slugify(hero.name),
  true
from (
  values
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
) as hero(name)
on conflict (normalized_name) do nothing;
