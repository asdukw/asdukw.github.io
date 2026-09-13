drop function if exists public.save_post_translation_by_id(bigint, date, boolean, text, text, text, text[], text, text, jsonb);

create or replace function public.save_post_translation_by_id(
  p_post_id bigint, p_published_on date, p_is_published boolean, p_lang text,
  p_title text, p_excerpt text, p_tags text[], p_source_mdx text,
  p_body_html text, p_toc jsonb
) returns bigint
language plpgsql security definer set search_path=public as $$
declare v_user_id bigint:=public.current_user_id(); v_post public.posts; v_reading_time smallint;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_lang not in ('zh','en') or nullif(btrim(coalesce(p_title,'')),'') is null or nullif(btrim(coalesce(p_source_mdx,'')),'') is null or nullif(btrim(coalesce(p_body_html,'')),'') is null or jsonb_typeof(coalesce(p_toc,'[]'::jsonb)) <> 'array' then
    raise exception 'invalid_post' using errcode='22023';
  end if;
  if p_post_id is null then
    insert into public.posts(published_on,is_published,author_id) values(coalesce(p_published_on,current_date),coalesce(p_is_published,false),v_user_id) returning * into v_post;
  else
    select * into v_post from public.posts where id=p_post_id for update;
    if not found then raise exception 'post_not_found' using errcode='P0002'; end if;
    if not public.current_user_is_admin() and v_post.author_id is distinct from v_user_id then raise exception 'not_authorized' using errcode='42501'; end if;
    update public.posts set published_on=coalesce(p_published_on,current_date),is_published=coalesce(p_is_published,false),updated_at=now() where id=p_post_id returning * into v_post;
  end if;
  v_reading_time := greatest(1, ceil(array_length(regexp_split_to_array(btrim(p_source_mdx),'\\s+'),1) / 200.0))::smallint;
  insert into public.post_translations(post_id,lang,title,excerpt,tags,reading_time,source_mdx,body_html,toc)
  values(v_post.id,p_lang,btrim(p_title),coalesce(p_excerpt,''),coalesce(p_tags,'{}'),v_reading_time,p_source_mdx,p_body_html,coalesce(p_toc,'[]'))
  on conflict(post_id,lang) do update set title=excluded.title,excerpt=excluded.excerpt,tags=excluded.tags,reading_time=excluded.reading_time,source_mdx=excluded.source_mdx,body_html=excluded.body_html,toc=excluded.toc,updated_at=now();
  return v_post.id;
end; $$;

revoke all on function public.save_post_translation_by_id(bigint,date,boolean,text,text,text,text[],text,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_post_translation_by_id(bigint,date,boolean,text,text,text,text[],text,text,jsonb) to authenticated;
