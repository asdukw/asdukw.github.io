-- Cloudflare D1 schema for the comment API.
--
--   bun x wrangler d1 execute asdukw-comments --remote --file worker/schema.sql
--
-- Post ids are the `id:` values in src/content/*.mdx. Comments are keyed by that
-- number alone, so deleting an article leaves its comments behind:
--
--   delete from comments where post_id = 3;

create table if not exists users (
  id integer primary key autoincrement,
  github_id integer not null unique,
  login text not null,
  avatar_url text not null default '',
  name text,
  html_url text not null default '',
  is_admin integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create table if not exists sessions (
  token_hash text primary key,
  user_id integer not null references users(id) on delete cascade,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at text not null
);

create index if not exists ix_sessions_user_id on sessions (user_id);

create table if not exists comments (
  id integer primary key autoincrement,
  post_id integer not null,
  author_id integer not null references users(id) on delete cascade,
  parent_id integer references comments(id) on delete set null,
  body text not null,
  status text not null default 'published',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  constraint ck_comments_status check (status in ('published', 'hidden')),
  constraint ck_comments_body_length check (length(body) between 1 and 5000)
);

create index if not exists ix_comments_post_id on comments (post_id);
create index if not exists ix_comments_parent_id on comments (parent_id);
create index if not exists ix_comments_author_id on comments (author_id);

create table if not exists comment_likes (
  comment_id integer not null references comments(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  primary key (comment_id, user_id)
);

create index if not exists ix_comment_likes_user_id on comment_likes (user_id);
