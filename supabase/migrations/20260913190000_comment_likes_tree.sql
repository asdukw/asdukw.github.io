alter table public.comment_reactions rename to comment_likes;
alter index if exists public.ix_comment_reactions_user_id rename to ix_comment_likes_user_id;
alter table public.comment_likes rename constraint comment_reactions_pkey to comment_likes_pkey;
alter table public.comment_likes rename constraint comment_reactions_comment_id_fkey to comment_likes_comment_id_fkey;
alter table public.comment_likes rename constraint comment_reactions_user_id_fkey to comment_likes_user_id_fkey;

create or replace function public.get_comments_by_post_id(p_post_id bigint)
returns table (id bigint, body text, created_at timestamptz, updated_at timestamptz, parent_id bigint, author_id text, author_login text, author_avatar_url text, author_name text, author_html_url text, thumbs_up bigint, viewer_has_reacted boolean)
language sql stable security definer set search_path=public as $$
  select c.id, c.body, c.created_at, c.updated_at, c.parent_id, u.id::text, u.login::text, u.avatar_url::text, u.name::text, u.html_url::text, count(l.user_id)::bigint, coalesce(bool_or(l.user_id=public.current_user_id()),false)
  from public.comments c join public.users u on u.id=c.author_id left join public.comment_likes l on l.comment_id=c.id
  where c.post_id=p_post_id and (c.status='published' or public.current_user_is_admin())
  group by c.id,u.id order by c.created_at,c.id;
$$;

create or replace function public.set_comment_like(p_comment_id bigint, p_liked boolean)
returns table (comment_id bigint, liked boolean, thumbs_up bigint)
language plpgsql security definer set search_path=public as $$
declare viewer_id bigint;
begin
  viewer_id := public.current_user_id();
  if viewer_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not exists (select 1 from public.comments where id=p_comment_id and status='published') then raise exception 'comment_not_found' using errcode='P0002'; end if;
  if p_liked then
    insert into public.comment_likes(comment_id,user_id) values(p_comment_id,viewer_id) on conflict (comment_id,user_id) do nothing;
  else
    delete from public.comment_likes where comment_id=p_comment_id and user_id=viewer_id;
  end if;
  return query select p_comment_id,p_liked,count(*)::bigint from public.comment_likes where comment_id=p_comment_id;
end; $$;

revoke all on function public.set_comment_reaction(bigint,boolean) from public,anon,authenticated;
drop function public.set_comment_reaction(bigint,boolean);
revoke all on function public.set_comment_like(bigint,boolean) from public,anon,authenticated;
grant execute on function public.set_comment_like(bigint,boolean) to authenticated;
