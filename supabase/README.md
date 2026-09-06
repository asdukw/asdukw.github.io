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
5. Run `migrations/20260906120000_initial.sql` in the Supabase SQL Editor.
6. Set `BUN_PUBLIC_SUPABASE_URL` and `BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the local `.env` and in the Cloudflare Pages build environment.

After the first GitHub login, promote the site owner explicitly in SQL:

```sql
update public.users
set is_admin = true
where auth_user_id = 'your-supabase-auth-user-id';
```

The migration keeps the legacy table names so existing comments can be retained when the old schema is already present, but it removes the need for a long-running API process. Apply it to a non-production project first if the database already contains important data.
