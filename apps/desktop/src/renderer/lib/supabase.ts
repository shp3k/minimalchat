import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://lqxtxtfqwfltqcphokqz.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxeHR4dGZxd2ZsdHFjcGhva3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODY1MzIsImV4cCI6MjA5NzM2MjUzMn0.f2zIN2qrDV0WkpCFAfs8rFnIu-zWKEVDBI0zkpJPlI8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: "minimalchat.supabase.auth"
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
