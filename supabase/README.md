# Supabase setup

The browser uses the Supabase publishable key, so this project relies on Row Level Security and narrowly scoped RPC functions. Never put a `service_role` key in `BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or any other browser-exposed variable.

## First-time setup

1. Create or open the Supabase project.
2. Enable GitHub under Authentication → Providers.
3. Configure the GitHub OAuth App callback URL as:

   ```text
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

4. Add the production site and local development URL to Supabase Auth URL Configuration.
5. Install the project dependencies, log in, and link the local CLI to the project:

   ```powershell
   bun install
   bun x supabase login
   bun x supabase link --project-ref <project-ref>
   ```

6. Preview and apply all local migrations, including the article migration:

   ```powershell
   bun x supabase db push --dry-run
   bun x supabase db push
   ```

   The article migration stores the former MDX source and its rendered HTML in `public.posts_i18n`. If the SQL was already run manually in the Dashboard, inspect migration history before pushing it again.

7. Set `BUN_PUBLIC_SUPABASE_URL` and `BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the local `.env` and in the Cloudflare Pages build environment.

After the first GitHub login, promote the site owner explicitly in SQL:

```sql
update public.users
set is_admin = true
where auth_user_id = 'your-supabase-auth-user-id';
```

The migrations keep the existing `public.posts` identity so comments, bookmarks and reading progress remain attached to the same article. Apply them to a non-production project first if the database already contains important data. The browser never receives a database connection string or a `service_role` key.
