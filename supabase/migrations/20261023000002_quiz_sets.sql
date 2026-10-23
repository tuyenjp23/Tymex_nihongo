-- Bộ đề do Admin soạn (collection "quiz_sets"): cùng khuôn với các bảng nội dung khác —
-- toàn bộ bản ghi trong cột data (jsonb), trigger content_guard suy ra level/status/hidden/origin/source_id,
-- RLS: ai cũng đọc nội dung công khai (không nháp, không ẩn), chỉ admin ghi.
create table if not exists public.quiz_sets (
  id text primary key check (id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'),
  level text check (level is null or level in ('N5','N4','N3','N2','N1')),
  status text not null default 'draft' check (status in ('draft','ai_generated','needs_review','verified','published')),
  hidden boolean not null default false,
  origin text,
  source_id text,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists quiz_sets_level_idx on public.quiz_sets (level);
create index if not exists quiz_sets_visibility_idx on public.quiz_sets (status, hidden);

drop trigger if exists quiz_sets_guard on public.quiz_sets;
create trigger quiz_sets_guard before insert or update on public.quiz_sets for each row execute function public.content_guard();

alter table public.quiz_sets enable row level security;

drop policy if exists quiz_sets_read_public on public.quiz_sets;
create policy quiz_sets_read_public on public.quiz_sets for select to anon, authenticated using (
  (hidden = false and status <> 'draft') or public.is_admin()
);
drop policy if exists quiz_sets_admin_insert on public.quiz_sets;
create policy quiz_sets_admin_insert on public.quiz_sets for insert to authenticated with check (public.is_admin());
drop policy if exists quiz_sets_admin_update on public.quiz_sets;
create policy quiz_sets_admin_update on public.quiz_sets for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists quiz_sets_admin_delete on public.quiz_sets;
create policy quiz_sets_admin_delete on public.quiz_sets for delete to authenticated using (public.is_admin());

revoke all on public.quiz_sets from anon, authenticated;
grant select on public.quiz_sets to anon, authenticated;
grant select, insert, update, delete on public.quiz_sets to authenticated;
