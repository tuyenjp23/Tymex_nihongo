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
