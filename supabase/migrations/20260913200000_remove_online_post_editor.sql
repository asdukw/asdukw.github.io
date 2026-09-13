revoke all on function public.save_post_translation_by_id(bigint,date,boolean,text,text,text,text[],text,text,jsonb) from public,anon,authenticated;
drop function public.save_post_translation_by_id(bigint,date,boolean,text,text,text,text[],text,text,jsonb);

drop policy if exists posts_select_published on public.posts;
create policy posts_select_published on public.posts
for select to anon,authenticated
using (is_published=true);

drop policy if exists posts_i18n_select_published on public.posts_i18n;
create policy posts_i18n_select_published on public.posts_i18n
for select to anon,authenticated
using (exists(select 1 from public.posts p where p.id=post_id and p.is_published=true));
