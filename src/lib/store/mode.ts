/** Chế độ dữ liệu: "supabase" khi đủ biến môi trường, ngược lại "local" (demo bằng file JSON). */
export type DataMode = "local" | "supabase";

export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)?.trim();
  if (url && anonKey) return { url, anonKey };
  return null;
}

export function getDataMode(): DataMode {
  return getSupabaseEnv() ? "supabase" : "local";
}
