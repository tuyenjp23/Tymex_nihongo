"use client";
import * as React from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/states";
import { Icon } from "@/components/icons";
import { SaveBar, SettingHistory, useSettingEditor, type VersionInfo } from "./setting-parts";
import { gameModeDefs, defaultGamesSettings } from "@/config/games";
import { LEVELS } from "@/lib/types";
import type { GamesSettings } from "@/lib/settings-schemas";

export interface GamesAdminData {
  settings: GamesSettings;
  history: VersionInfo[];
  topics: { id: string; label: string; count: number }[];
  /** Số mục sẵn sàng cho từng chế độ (tính từ dữ liệu thật) */
  ready: Record<string, number>;
  readyNote: Record<string, string>;
}

export function GamesEditor({ data }: { data: GamesAdminData }) {
  const ed = useSettingEditor<GamesSettings>("games", data.settings, data.history[0]?.version ?? 0);
  const v = ed.value;
  const err = (p: string) => ed.errors.find((e) => e.path === p || e.path.startsWith(`${p}.`))?.message;
  const toggle = <T extends string>(list: T[], x: T) => (list.includes(x) ? list.filter((i) => i !== x) : [...list, x]);

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div>
          <CardTitle>Chế độ chơi</CardTitle>
          <CardDescription className="mt-1">Bật/tắt từng chế độ. Chế độ &quot;sắp có&quot; chưa được lập trình nên không bật được. Cột &quot;Sẵn sàng&quot; đếm mục dữ liệu thật đủ điều kiện (đang hiển thị với người học).</CardDescription>
        </div>
        <ul className="divide-y divide-border">
          {gameModeDefs.map((m) => {
            const planned = m.status === "planned";
            const on = v.enabledModes.includes(m.id);
            const n = data.ready[m.id];
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                <Icon name={m.icon} size={20} className="shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {m.title} <span lang="ja" className="text-sm text-muted-foreground">{m.titleJa}</span> {planned ? <Badge tone="warning">Sắp có — chưa lập trình</Badge> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                  {!planned ? (
                    <p className={`text-xs ${n === 0 ? "text-danger" : "text-muted-foreground"}`}>
                      Sẵn sàng: {n} mục{data.readyNote[m.id] ? ` · ${data.readyNote[m.id]}` : ""}
                    </p>
                  ) : null}
                </div>
                <Switch checked={on && !planned} disabled={planned} onChange={(b) => ed.update((c) => ({ ...c, enabledModes: b ? [...c.enabledModes, m.id] : c.enabledModes.filter((x) => x !== m.id) }))} label={`Bật chế độ ${m.title}`} />
              </li>
            );
          })}
        </ul>
        {err("enabledModes") ? <p role="alert" className="text-sm text-danger">{err("enabledModes")}</p> : null}
      </Card>

      <Card className="space-y-4">
        <CardTitle>Phạm vi câu hỏi</CardTitle>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Cấp độ được dùng trong trò chơi</legend>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <label key={l} className="nc-touch flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
                <input type="checkbox" checked={v.levels.includes(l)} onChange={() => ed.update((c) => ({ ...c, levels: toggle(c.levels, l) }))} />
                {l}
              </label>
            ))}
          </div>
          {err("levels") ? <p role="alert" className="mt-1 text-xs font-medium text-danger">{err("levels")}</p> : null}
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Chủ đề từ vựng</legend>
          <p className="mb-2 text-xs text-muted-foreground">Không chọn chủ đề nào = dùng tất cả.</p>
          <div className="flex flex-wrap gap-2">
            {data.topics.map((t) => (
              <label key={t.id} className="nc-touch flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
                <input type="checkbox" checked={v.topics.includes(t.id)} onChange={() => ed.update((c) => ({ ...c, topics: toggle(c.topics, t.id) }))} />
                {t.label} <span className="text-xs text-muted-foreground">({t.count})</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Số câu mỗi lượt (5–50)" htmlFor="gm-qpr" error={err("questionsPerRound")}>
            <Input id="gm-qpr" type="number" inputMode="numeric" min={5} max={50} value={v.questionsPerRound} onChange={(e) => ed.update((c) => ({ ...c, questionsPerRound: Number(e.target.value) }))} />
          </Field>
        </div>
        <div className="flex items-start gap-3">
          <Switch id="gm-img" checked={v.requireImageForPictureGames} onChange={(b) => ed.update((c) => ({ ...c, requireImageForPictureGames: b }))} label="Trò chơi hình ảnh chỉ dùng mục có hình" />
          <label htmlFor="gm-img" className="text-sm">
            <span className="font-medium">Trò chơi dựa vào hình chỉ dùng từ cụ thể có hình minh họa</span>
            <span className="block text-muted-foreground">Nên giữ bật: từ trừu tượng (như 経験, 責任) không có một hình duy nhất đúng nên không đưa vào trò chơi hình ảnh.</span>
          </label>
        </div>
      </Card>

      {v.enabledModes.length === 0 ? <Alert tone="warning">Chưa bật chế độ nào — trang Kanji Quest sẽ trống với người học.</Alert> : null}
      <SaveBar dirty={ed.dirty} pending={ed.pending} onSave={ed.save} errors={ed.errors} conflict={ed.conflict} onDefaults={() => ed.replace(defaultGamesSettings)} />
      <SettingHistory settingKey="games" history={data.history} />
    </div>
  );
}
