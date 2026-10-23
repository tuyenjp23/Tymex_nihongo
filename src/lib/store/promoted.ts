export type AnyRec = Record<string, unknown> & { id: string };

/** Cột "nâng lên" để lọc/RLS; toàn bộ bản ghi nằm trong cột data (jsonb). */
export function promotedColumns(r: AnyRec) {
  return {
    level: (r.level as string) ?? (r.level_hint as string) ?? null,
    status: (r.status as string) ?? (r.verification_status as string) ?? "draft",
    hidden: (r.hidden as boolean) ?? false,
    origin: (r.origin as string) ?? null,
    source_id: (r.source_id as string) ?? null,
  };
}

