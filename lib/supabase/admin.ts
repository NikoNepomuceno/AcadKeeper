import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  }
  return createSupabaseClient(url, serviceKey)
}


