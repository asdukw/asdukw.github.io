drop function if exists public.get_comments(text, text);
drop function if exists public.add_comment(text, text, text, bigint);
drop function if exists public.ensure_post(text, text);
drop function if exists public.get_bookmarks();
drop function if exists public.set_bookmark(text, text, boolean);
drop table if exists public.bookmarks;
drop function if exists public.upsert_post_translation(text, text, date, boolean, text, text, text, text[], smallint, text, text, jsonb);
drop function if exists public.save_post_translation(text, text, date, boolean, text, text, text[], text, text, jsonb);
drop function if exists public.save_post_translation_by_id(bigint, text, date, boolean, text, text, text, text[], text, text, jsonb);
drop index if exists public.ix_posts_category;
alter table public.posts drop constraint if exists uq_posts_category_slug;
alter table public.posts drop constraint if exists ck_posts_category;
alter table public.posts drop column if exists category;
alter table public.posts drop column if exists slug;

create or replace function public.save_post_translation_by_id(
  p_post_id bigint, p_published_on date, p_is_published boolean, p_lang text,
  p_title text, p_excerpt text, p_tags text[], p_source_mdx text,
  p_body_html text, p_toc jsonb
) returns public.post_translations
language plpgsql security definer set search_path=public as $$
declare v_user_id bigint:=public.current_user_id(); v_post public.posts; v_translation public.post_translations;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_lang not in ('zh','en') or nullif(btrim(coalesce(p_title,'')),'') is null or nullif(btrim(coalesce(p_source_mdx,'')),'') is null or nullif(btrim(coalesce(p_body_html,'')),'') is null then raise exception 'invalid_post' using errcode='22023'; end if;
  if p_post_id is null then
    insert into public.posts(published_on,is_published,author_id) values(coalesce(p_published_on,current_date),coalesce(p_is_published,false),v_user_id) returning * into v_post;
  else
    select * into v_post from public.posts where id=p_post_id for update;
    if not found then raise exception 'post_not_found' using errcode='P0002'; end if;
    if not public.current_user_is_admin() and v_post.author_id is distinct from v_user_id then raise exception 'not_authorized' using errcode='42501'; end if;
    update public.posts set published_on=coalesce(p_published_on,current_date),is_published=coalesce(p_is_published,false),updated_at=now() where id=p_post_id returning * into v_post;
  end if;
  insert into public.post_translations(post_id,lang,title,excerpt,tags,reading_time,source_mdx,body_html,toc)
  values(v_post.id,p_lang,btrim(p_title),coalesce(p_excerpt,''),coalesce(p_tags,'{}'),greatest(1,ceil(array_length(regexp_split_to_array(btrim(p_source_mdx),'\\s+'),1)/200.0))::smallint,p_source_mdx,p_body_html,coalesce(p_toc,'[]'))
  on conflict(post_id,lang) do update set title=excluded.title,excerpt=excluded.excerpt,tags=excluded.tags,reading_time=excluded.reading_time,source_mdx=excluded.source_mdx,body_html=excluded.body_html,toc=excluded.toc,updated_at=now() returning * into v_translation;
  return v_translation;
end; $$;
grant execute on function public.save_post_translation_by_id(bigint,date,boolean,text,text,text,text[],text,text,jsonb) to authenticated;

create or replace function public.get_comments_by_post_id(p_post_id bigint)
returns table (
  id bigint, body text, created_at timestamptz, updated_at timestamptz,
  parent_id bigint, author_id text, author_login text,
  author_avatar_url text, author_name text, author_html_url text,
  thumbs_up bigint, viewer_has_reacted boolean
)
language sql stable security definer set search_path=public as $$
  select c.id, c.body, c.created_at, c.updated_at, c.parent_id,
    u.id::text, u.login::text, u.avatar_url::text, u.name::text,
    u.html_url::text, count(r.user_id)::bigint,
    coalesce(bool_or(r.user_id=public.current_user_id()),false)
  from public.comments c
  join public.users u on u.id=c.author_id
  left join public.comment_reactions r on r.comment_id=c.id
  where c.post_id=p_post_id
    and (c.status='published' or public.current_user_is_admin())
  group by c.id,u.id
  order by c.created_at,c.id;
$$;

create or replace function public.add_comment_by_post_id(
  p_post_id bigint, p_body text, p_parent_id bigint default null
) returns bigint
language plpgsql security definer set search_path=public as $$
declare v_author_id bigint:=public.current_user_id(); v_body text:=btrim(coalesce(p_body,'')); v_id bigint;
begin
  if v_author_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not exists(select 1 from public.posts where id=p_post_id and is_published) then raise exception 'post_not_found' using errcode='P0002'; end if;
  if char_length(v_body) not between 1 and 5000 then raise exception 'invalid_comment_body' using errcode='22023'; end if;
  if p_parent_id is not null and not exists(select 1 from public.comments where id=p_parent_id and post_id=p_post_id and status='published') then raise exception 'invalid_parent' using errcode='22023'; end if;
  insert into public.comments(post_id,author_id,parent_id,body)
  values(p_post_id,v_author_id,p_parent_id,v_body) returning id into v_id;
  return v_id;
end; $$;

revoke all on function public.get_comments_by_post_id(bigint) from public,anon,authenticated;
revoke all on function public.add_comment_by_post_id(bigint,text,bigint) from public,anon,authenticated;
revoke all on function public.save_post_translation_by_id(bigint,date,boolean,text,text,text,text[],text,text,jsonb) from public,anon,authenticated;
grant execute on function public.get_comments_by_post_id(bigint) to anon,authenticated;
grant execute on function public.add_comment_by_post_id(bigint,text,bigint) to authenticated;
grant execute on function public.save_post_translation_by_id(bigint,date,boolean,text,text,text,text[],text,text,jsonb) to authenticated;
