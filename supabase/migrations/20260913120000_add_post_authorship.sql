alter table public.posts
  add column if not exists author_id bigint references public.users(id) on delete set null;

create index if not exists ix_posts_author_id on public.posts (author_id);

create or replace function public.save_post_translation(
  p_category text,
  p_slug text,
  p_published_on date,
  p_is_published boolean,
  p_lang text,
  p_title text,
  p_excerpt text,
  p_tags text[],
  p_source_mdx text,
  p_body_html text,
  p_toc jsonb
)
returns public.post_translations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id bigint := public.current_user_id();
  v_post public.posts;
  v_translation public.post_translations;
  v_reading_time smallint;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_category not in ('blog', 'tech')
     or p_slug !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$'
     or p_lang not in ('zh', 'en')
     or nullif(btrim(coalesce(p_title, '')), '') is null
     or nullif(btrim(coalesce(p_source_mdx, '')), '') is null
     or nullif(btrim(coalesce(p_body_html, '')), '') is null
     or jsonb_typeof(coalesce(p_toc, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_post' using errcode = '22023';
  end if;

  select * into v_post from public.posts
  where category = p_category and slug = p_slug
  for update;

  if found and not public.current_user_is_admin() and v_post.author_id is distinct from v_user_id then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  insert into public.posts (category, slug, published_on, is_published, author_id)
  values (p_category, p_slug, coalesce(p_published_on, current_date), coalesce(p_is_published, false), v_user_id)
  on conflict (category, slug) do update set
    published_on = excluded.published_on,
    is_published = excluded.is_published,
    updated_at = now()
  returning * into v_post;

  v_reading_time := greatest(1, ceil(array_length(regexp_split_to_array(btrim(p_source_mdx), '\\s+'), 1) / 200.0))::smallint;

  insert into public.post_translations (
    post_id, lang, title, excerpt, tags, reading_time, source_mdx, body_html, toc
  ) values (
    v_post.id, p_lang, btrim(p_title), coalesce(p_excerpt, ''), coalesce(p_tags, '{}'),
    v_reading_time, p_source_mdx, p_body_html, coalesce(p_toc, '[]'::jsonb)
  )
  on conflict (post_id, lang) do update set
    title = excluded.title,
    excerpt = excluded.excerpt,
    tags = excluded.tags,
    reading_time = excluded.reading_time,
    source_mdx = excluded.source_mdx,
    body_html = excluded.body_html,
    toc = excluded.toc,
    updated_at = now()
  returning * into v_translation;

  return v_translation;
end;
$$;

revoke all on function public.save_post_translation(
  text, text, date, boolean, text, text, text, text[], text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.save_post_translation(
  text, text, date, boolean, text, text, text, text[], text, text, jsonb
) to authenticated;

drop policy if exists posts_select_published on public.posts;
create policy posts_select_published on public.posts
for select to anon, authenticated
using (
  is_published = true
  or public.current_user_is_admin()
  or author_id = public.current_user_id()
);

drop policy if exists post_translations_select_published on public.post_translations;
create policy post_translations_select_published on public.post_translations
for select to anon, authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and (
        p.is_published = true
        or public.current_user_is_admin()
        or p.author_id = public.current_user_id()
      )
  )
);
