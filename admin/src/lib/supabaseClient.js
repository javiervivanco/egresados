import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env.local."
  );
}

export const supabaseClient = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
  db: { schema: "public" },
});
