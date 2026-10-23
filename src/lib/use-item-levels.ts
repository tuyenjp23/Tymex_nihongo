"use client";
import * as React from "react";
import { flattenItemLevels, type ItemLevelGroups } from "./item-levels";
import type { Level } from "./types";

let pending: Promise<Map<string, Level>> | null = null;

function load(): Promise<Map<string, Level>> {
  pending ??= fetch("/api/item-levels")
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<ItemLevelGroups>;
    })
    .then(flattenItemLevels)
    .catch((e) => {
      pending = null; // cho phép thử lại lần sau
      throw e;
    });
  return pending;
}

/** Map khóa tiến độ → cấp. `null` = đang tải; `"error"` = tải lỗi (giao diện hiện "—" thay vì số sai). */
export function useItemLevels(): Map<string, Level> | null | "error" {
  const [v, setV] = React.useState<Map<string, Level> | null | "error">(null);
  React.useEffect(() => {
    let live = true;
    load().then(
      (m) => live && setV(m),
      () => live && setV("error"),
    );
    return () => {
      live = false;
    };
  }, []);
  return v;
}
