-- Pipeline nhập dữ liệu học tập:
--  1) thêm hai trạng thái 'imported' và 'machine_translated' và nguồn gốc 'imported_dataset';
--  2) bảng mới "sentences" (kho câu ví dụ dùng chung).
-- Không xóa và không sửa dữ liệu hiện có: các bản ghi cũ vẫn hợp lệ với ràng buộc mới (chỉ nới thêm giá trị cho phép).
-- Hãy sao lưu database (Supabase → Database → Backups) trước khi chạy migration này.

create or replace function public.content_guard()
returns trigger
language plpgsql
as $$
declare
  st text;
  org text;
begin
  if jsonb_typeof(new.data) is distinct from 'object' then
    raise exception 'data phải là một đối tượng JSON' using errcode = '22023';
  end if;
  if new.data ->> 'id' is distinct from new.id then
    raise exception 'data.id (%) không khớp với id (%)', new.data ->> 'id', new.id using errcode = '22023';
  end if;

  st  := coalesce(new.data ->> 'status', new.data ->> 'verification_status', 'draft');
  org := new.data ->> 'origin';

  if st not in ('draft', 'imported', 'machine_translated', 'ai_generated', 'needs_review', 'verified', 'published') then
    raise exception 'Trạng thái không hợp lệ: %', st using errcode = '23514';
  end if;

  -- Lớp bảo vệ thứ hai cho quy tắc nội dung (ứng dụng đã kiểm tra bằng Zod; đây là để chặn ghi trực tiếp qua API)
  if st in ('verified', 'published')
     and (coalesce(btrim(new.data ->> 'reviewed_by'), '') = '' or new.data ->> 'last_verified' is null) then
    raise exception 'Trạng thái verified/published cần reviewed_by và last_verified' using errcode = '23514';
  end if;
  if org = 'official_sample' and coalesce(new.data ->> 'source_id', '') = '' then
    raise exception 'Mẫu chính thức (official_sample) phải có source_id' using errcode = '23514';
  end if;
  if org = 'imported_dataset' and coalesce(new.data ->> 'source_id', '') = '' then
    raise exception 'Nội dung nhập từ bộ dữ liệu (imported_dataset) phải có source_id' using errcode = '23514';
  end if;
  if org is not null and org not in ('official_sample', 'self_authored', 'ai_generated', 'imported_dataset') then
    raise exception 'origin không hợp lệ: %', org using errcode = '23514';
  end if;

  new.status    := st;
  new.level     := coalesce(new.data ->> 'level', new.data ->> 'level_hint');
  new.hidden    := coalesce((new.data ->> 'hidden')::boolean, false);
  new.origin    := org;
  new.source_id := nullif(new.data ->> 'source_id', '');
  new.updated_at := coalesce(new.updated_at, now());
  return new;
end;
$$;

-- Nới ràng buộc cột status ở mọi bảng nội dung (tên mặc định của Postgres: <bảng>_status_check)
do $$
declare
  t text;
begin
  foreach t in array array[
    'lesson_sources', 'image_assets', 'vocabulary', 'kanji', 'grammar_points',
    'questions', 'passages', 'conversations', 'lessons', 'quiz_sets'
  ]
  loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_status_check');
    execute format($f$alter table public.%I add constraint %I check (status in ('draft','imported','machine_translated','ai_generated','needs_review','verified','published'))$f$, t, t || '_status_check');
  end loop;
end $$;

-- Kho câu ví dụ (collection "sentences"): cùng khuôn với các bảng nội dung khác.
create table if not exists public.sentences (
  id text primary key check (id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'),
  level text check (level is null or level in ('N5','N4','N3','N2','N1')),
  status text not null default 'draft' check (status in ('draft','imported','machine_translated','ai_generated','needs_review','verified','published')),
  hidden boolean not null default false,
  origin text,
  source_id text,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists sentences_level_idx on public.sentences (level);
create index if not exists sentences_visibility_idx on public.sentences (status, hidden);
create index if not exists sentences_source_idx on public.sentences (source_id);
create index if not exists sentences_word_refs_idx on public.sentences using gin ((data -> 'word_refs'));

drop trigger if exists sentences_guard on public.sentences;
create trigger sentences_guard before insert or update on public.sentences for each row execute function public.content_guard();

alter table public.sentences enable row level security;

drop policy if exists sentences_read_public on public.sentences;
create policy sentences_read_public on public.sentences for select to anon, authenticated using (
  (hidden = false and status <> 'draft') or public.is_admin()
);
drop policy if exists sentences_admin_insert on public.sentences;
create policy sentences_admin_insert on public.sentences for insert to authenticated with check (public.is_admin());
drop policy if exists sentences_admin_update on public.sentences;
create policy sentences_admin_update on public.sentences for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists sentences_admin_delete on public.sentences;
create policy sentences_admin_delete on public.sentences for delete to authenticated using (public.is_admin());

revoke all on public.sentences from anon, authenticated;
grant select on public.sentences to anon, authenticated;
grant select, insert, update, delete on public.sentences to authenticated;
