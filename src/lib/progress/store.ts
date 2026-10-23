"use client";
/**
 * Kho tiến độ phía trình duyệt (localStorage) — nguồn dữ liệu cho người học chưa đăng nhập.
 * - useSyncExternalStore: mọi component thấy cùng một state, không lệch hydrate (server luôn trả null).
 * - Đọc dữ liệu hỏng: không ghi đè; bản gốc được sao lưu sang khóa riêng và người dùng được báo.
 * - Ghi thất bại (hết dung lượng / chế độ riêng tư): app vẫn chạy bằng bộ nhớ tạm và cảnh báo.
 * - Nhiều tab: lắng nghe sự kiện "storage" để đồng bộ.
 */
import * as React from "react";
import { emptyProgress, mergeProgress, parseProgress, type Progress } from "./model";

export const PROGRESS_STORAGE_KEY = "nc.progress.v1";
const BACKUP_PREFIX = "nc.progress.corrupt.";

type Status = { loadError: string | null; persistError: string | null; backupKey: string | null };

let state: Progress | null = null;
let status: Status = { loadError: null, persistError: null, backupKey: null };
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const raw = safeGet(PROGRESS_STORAGE_KEY);
  if (!raw) {
    state = emptyProgress();
    return;
  }
  try {
    const parsed = parseProgress(JSON.parse(raw));
    if (parsed.ok) {
      state = parsed.value;
      return;
    }
    handleCorrupt(raw, parsed.error);
  } catch {
    handleCorrupt(raw, "Không đọc được JSON trong bộ nhớ trình duyệt");
  }
}

const MAX_BACKUPS = 3;

/** Sao lưu bản hỏng — không tạo bản trùng nội dung khi tải lại trang nhiều lần; giữ tối đa MAX_BACKUPS bản mới nhất. */
function handleCorrupt(raw: string, error: string) {
  let backupKey: string | null = null;
  try {
    const keys = Object.keys(window.localStorage)
      .filter((k) => k.startsWith(BACKUP_PREFIX))
      .sort();
    backupKey = keys.find((k) => window.localStorage.getItem(k) === raw) ?? null;
    if (!backupKey) {
      backupKey = `${BACKUP_PREFIX}${Date.now()}`;
      window.localStorage.setItem(backupKey, raw);
      for (const old of keys.slice(0, Math.max(0, keys.length + 1 - MAX_BACKUPS))) window.localStorage.removeItem(old);
    }
  } catch {
    /* bỏ qua: không sao lưu được */
  }
  status = { ...status, loadError: error, backupKey };
  state = emptyProgress();
}

function persist() {
  if (!state) return;
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state));
    if (status.persistError) status = { ...status, persistError: null };
  } catch {
    status = { ...status, persistError: "Không lưu được vào trình duyệt (hết dung lượng hoặc đang ở chế độ riêng tư). Tiến độ chỉ tồn tại tới khi bạn đóng tab — hãy xuất file sao lưu." };
  }
}

export const progressStore = {
  get(): Progress | null {
    load();
    return state;
  },
  /** Cập nhật bằng hàm thuần: update((p) => reviewItem(p, ...)) */
  update(fn: (p: Progress) => Progress) {
    load();
    if (!state) return;
    const next = fn(state);
    if (next === state) return;
    state = next;
    persist();
    emit();
  },
  replace(next: Progress) {
    load();
    state = next;
    persist();
    emit();
  },
  reset() {
    load();
    state = emptyProgress();
    persist();
    emit();
  },
  /** Nhập JSON từ file sao lưu. mode=merge: gộp với tiến độ hiện có; replace: thay hoàn toàn. */
  importJson(text: string, mode: "merge" | "replace"): { ok: true } | { ok: false; error: string } {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return { ok: false, error: "File không phải JSON hợp lệ" };
    }
    const parsed = parseProgress(raw);
    if (!parsed.ok) return parsed;
    load();
    this.replace(mode === "merge" && state ? mergeProgress(state, parsed.value) : parsed.value);
    return { ok: true };
  },
  exportJson(): string {
    load();
    return JSON.stringify(state ?? emptyProgress(), null, 2);
  },
  clearLoadError() {
    status = { ...status, loadError: null };
    emit();
  },
  getStatus(): Status {
    return status;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== PROGRESS_STORAGE_KEY) return;
    loaded = false;
    load();
    emit();
  });
}

/** Trả về null trước khi hydrate xong (và trên server) → component hiển thị skeleton, không lệch HTML. */
export function useProgress(): Progress | null {
  return React.useSyncExternalStore(
    progressStore.subscribe,
    () => progressStore.get(),
    () => null,
  );
}

export function useProgressStatus(): Status {
  return React.useSyncExternalStore(
    progressStore.subscribe,
    () => progressStore.getStatus(),
    () => status,
  );
}
