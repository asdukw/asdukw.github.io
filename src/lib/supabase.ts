import { createClient } from "@supabase/supabase-js";

declare const process: { env: Record<string, string | undefined> };

const supabaseUrl = process.env.BUN_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Supabase is not configured. Set BUN_PUBLIC_SUPABASE_URL and BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
