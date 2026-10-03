import { createClient } from "@/utils/supabase/client";

export function createBrowserSupabase() {
  return createClient();
}
