-- GỘP 4 file migration theo đúng thứ tự — dán MỘT LẦN vào Supabase → SQL Editor rồi bấm Run.
-- Tạo tự động từ supabase/migrations/*.sql (đừng sửa tay). Chạy lại nhiều lần vẫn an toàn.

-- ======== 20261022000001_init.sql ========
-- ============================================================================
-- Nihongo Compass — schema ban đầu
-- Chạy trong Supabase (SQL Editor hoặc `supabase db push`). Chạy lại nhiều lần vẫn an toàn (idempotent).
--
-- Nguyên tắc bảo mật:
--  * Mọi bảng đều bật Row Level Security (RLS).
--  * Khách (anon) chỉ ĐỌC nội dung đã công khai (không nháp, không bị ẩn) và cấu hình giao diện.
--  * Chỉ tài khoản có profiles.role = 'admin' mới được ghi nội dung/cấu hình và đọc nhật ký.
--  * Không bảng nào cho client sửa role của chính mình. Admin đầu tiên được cấp bằng SQL (xem README).
--  * Không cần và không được dùng service_role key trong ứng dụng web.
-- ============================================================================

-- ───────────── Hồ sơ & vai trò ─────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'learner' check (role in ('learner', 'admin')),
  created_at timestamptz not null default now()
);

-- Kiểm tra quyền admin. SECURITY DEFINER để các policy gọi được mà không bị RLS của profiles làm đệ quy.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Người dùng mới luôn là 'learner' (không bao giờ lấy role từ dữ liệu người dùng gửi lên).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(split_part(new.email, '@', 1), ''), 'learner')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Chỉ admin được đổi hồ sơ (kể cả role). Người dùng thường không có policy UPDATE/INSERT/DELETE.
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ───────────── Bảng nội dung (cùng một khuôn) ─────────────
-- Toàn bộ bản ghi nằm trong cột data (jsonb, được Zod kiểm tra ở ứng dụng).
-- Các cột level/status/hidden/origin/source_id được TRIGGER tự suy ra từ data → không thể lệch nhau.

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

  if st not in ('draft', 'ai_generated', 'needs_review', 'verified', 'published') then
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
  if org is not null and org not in ('official_sample', 'self_authored', 'ai_generated') then
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

do $$
declare
  t text;
begin
  foreach t in array array[
    'lesson_sources', 'image_assets', 'vocabulary', 'kanji', 'grammar_points',
    'questions', 'passages', 'conversations', 'lessons'
  ]
  loop
    execute format($f$
      create table if not exists public.%1$I (
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
      )$f$, t);
    execute format('create index if not exists %1$I on public.%2$I (level)', t || '_level_idx', t);
    execute format('create index if not exists %1$I on public.%2$I (status, hidden)', t || '_visibility_idx', t);
    execute format('drop trigger if exists %1$I on public.%2$I', t || '_guard', t);
    execute format('create trigger %1$I before insert or update on public.%2$I for each row execute function public.content_guard()', t || '_guard', t);
    execute format('alter table public.%I enable row level security', t);

    -- Đọc: ai cũng đọc được nội dung công khai (không nháp, không ẩn). Admin đọc tất cả.
    execute format('drop policy if exists %1$I on public.%2$I', t || '_read_public', t);
    execute format($p$create policy %1$I on public.%2$I for select to anon, authenticated using (
      (hidden = false and status <> 'draft') or public.is_admin()
    )$p$, t || '_read_public', t);

    -- Ghi: chỉ admin
    execute format('drop policy if exists %1$I on public.%2$I', t || '_admin_insert', t);
    execute format('create policy %1$I on public.%2$I for insert to authenticated with check (public.is_admin())', t || '_admin_insert', t);
    execute format('drop policy if exists %1$I on public.%2$I', t || '_admin_update', t);
    execute format('create policy %1$I on public.%2$I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_update', t);
    execute format('drop policy if exists %1$I on public.%2$I', t || '_admin_delete', t);
    execute format('create policy %1$I on public.%2$I for delete to authenticated using (public.is_admin())', t || '_admin_delete', t);
  end loop;
end $$;

-- ───────────── Cấu hình (giao diện, menu, dashboard, trò chơi...) ─────────────

create table if not exists public.app_settings (
  key text primary key check (key in ('theme', 'navigation', 'dashboard', 'content', 'games')),
  value jsonb not null,
  version integer not null default 1 check (version >= 1),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.settings_history (
  id bigint generated always as identity primary key,
  key text not null check (key in ('theme', 'navigation', 'dashboard', 'content', 'games')),
  version integer not null,
  value jsonb not null,
  saved_at timestamptz not null default now(),
  saved_by_label text not null default '',
  unique (key, version)
);

alter table public.app_settings enable row level security;
alter table public.settings_history enable row level security;

-- Cấu hình giao diện không bí mật (người học cần đọc để hiển thị đúng) → ai cũng đọc; chỉ admin ghi.
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select to anon, authenticated using (true);
drop policy if exists app_settings_admin_insert on public.app_settings;
create policy app_settings_admin_insert on public.app_settings for insert to authenticated with check (public.is_admin());
drop policy if exists app_settings_admin_update on public.app_settings;
create policy app_settings_admin_update on public.app_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_history_admin_read on public.settings_history;
create policy settings_history_admin_read on public.settings_history for select to authenticated using (public.is_admin());
drop policy if exists settings_history_admin_insert on public.settings_history;
create policy settings_history_admin_insert on public.settings_history for insert to authenticated with check (public.is_admin());

-- ───────────── Nhật ký thao tác (chỉ thêm, không sửa/xóa qua API) ─────────────

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_label text not null default '',
  action text not null check (action in ('create','update','delete','import','settings','reset','restore')),
  collection text not null,
  record_id text,
  summary text not null default '',
  before jsonb,
  after jsonb
);
create index if not exists audit_logs_at_idx on public.audit_logs (at desc);
create index if not exists audit_logs_target_idx on public.audit_logs (collection, record_id);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs for select to authenticated using (public.is_admin());
-- Admin chỉ ghi được nhật ký mang tên chính mình → không giả mạo người khác. Không có policy UPDATE/DELETE → bất biến.
drop policy if exists audit_logs_admin_insert on public.audit_logs;
create policy audit_logs_admin_insert on public.audit_logs for insert to authenticated
  with check (public.is_admin() and actor_id = auth.uid());

-- ───────────── Tiến độ học của từng người (đồng bộ nhiều thiết bị) ─────────────
-- Mỗi người chỉ thấy/sửa dòng của chính mình. Admin KHÔNG có quyền đọc tiến độ học viên.

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 2097152),
  client_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

drop policy if exists user_progress_own_select on public.user_progress;
create policy user_progress_own_select on public.user_progress for select to authenticated using (user_id = auth.uid());
drop policy if exists user_progress_own_insert on public.user_progress;
create policy user_progress_own_insert on public.user_progress for insert to authenticated with check (user_id = auth.uid());
drop policy if exists user_progress_own_update on public.user_progress;
create policy user_progress_own_update on public.user_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists user_progress_own_delete on public.user_progress;
create policy user_progress_own_delete on public.user_progress for delete to authenticated using (user_id = auth.uid());

-- ───────────── Quyền cấp bậc bảng (lớp thứ hai bên cạnh RLS) ─────────────
-- Thu hồi mặc định rồi cấp lại tối thiểu. RLS vẫn quyết định từng dòng.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on
  public.lesson_sources, public.image_assets, public.vocabulary, public.kanji, public.grammar_points,
  public.questions, public.passages, public.conversations, public.lessons, public.app_settings
  to anon, authenticated;

grant select, insert, update, delete on
  public.lesson_sources, public.image_assets, public.vocabulary, public.kanji, public.grammar_points,
  public.questions, public.passages, public.conversations, public.lessons
  to authenticated;

grant insert, update on public.app_settings to authenticated;
grant select, insert on public.settings_history to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_progress to authenticated;
-- settings_history.id là identity → cần quyền dùng sequence khi insert
grant usage on all sequences in schema public to authenticated;

-- ======== 20261023000001_settings_history_prune.sql ========
-- Giữ tối đa 25 phiên bản gần nhất cho mỗi nhóm cấu hình (khớp với giao diện Admin và FileStore).
-- Admin chỉ có quyền select/insert trên settings_history (không có delete) nên việc dọn do trigger SECURITY DEFINER đảm nhiệm.
create or replace function public.prune_settings_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.settings_history h
  where h.key = new.key
    and h.id not in (
      select id from public.settings_history where key = new.key order by version desc limit 25
    );
  return null;
end;
$$;

revoke all on function public.prune_settings_history() from public;

drop trigger if exists settings_history_prune on public.settings_history;
create trigger settings_history_prune
  after insert on public.settings_history
  for each row execute function public.prune_settings_history();

-- ======== 20261023000002_quiz_sets.sql ========
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

-- ======== 20261024000001_import_pipeline.sql ========
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
