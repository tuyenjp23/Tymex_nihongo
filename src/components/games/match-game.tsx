"use client";
import * as React from "react";
import type { MatchPair } from "@/lib/games/builders";
import { shuffle, mulberry32, randomSeed } from "@/lib/rng";
import { Ja } from "@/components/ja";
import { Figure } from "@/components/content/figure";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface MatchOutcome {
  pairs: MatchPair[];
  /** số lần chọn sai theo id cặp */
  mistakes: Record<string, number>;
  moves: number;
  startedAt: number;
}

type Face = MatchPair["a"] | MatchPair["b"];

function FaceView({ f, big }: { f: Face; big?: boolean }) {
  if (f.kind === "image") return <Figure src={f.src} alt={f.alt} className={big ? "h-24 w-24" : "h-20 w-20"} />;
  return f.ja ? <Ja text={f.text} className="text-xl" /> : <span className="text-sm font-medium">{f.text}</span>;
}

/** Image Matching: chọn một hình ở cột trái rồi chọn từ tương ứng ở cột phải. */
export function ImageMatchGame({ pairs, onFinish }: { pairs: MatchPair[]; onFinish: (o: MatchOutcome) => void }) {
  const [right] = React.useState(() => shuffle(pairs, mulberry32(randomSeed())));
  const [selected, setSelected] = React.useState<string | null>(null);
  const [matched, setMatched] = React.useState<Set<string>>(new Set());
  const [wrongFlash, setWrongFlash] = React.useState<string | null>(null);
  const [mistakes, setMistakes] = React.useState<Record<string, number>>({});
  const [moves, setMoves] = React.useState(0);
  const startedAt = React.useRef(Date.now());
  const reported = React.useRef(false);

  function pickLeft(id: string) {
    if (matched.has(id)) return;
    setSelected(id);
  }
  function pickRight(id: string) {
    if (!selected || matched.has(id)) return;
    setMoves((m) => m + 1);
    if (selected === id) {
      const next = new Set(matched).add(id);
      setMatched(next);
      setSelected(null);
      if (next.size === pairs.length && !reported.current) {
        reported.current = true;
        onFinish({ pairs, mistakes, moves: moves + 1, startedAt: startedAt.current });
      }
    } else {
      setMistakes((m) => ({ ...m, [selected]: (m[selected] ?? 0) + 1 }));
      setWrongFlash(id);
      setTimeout(() => setWrongFlash(null), 400);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between text-sm"><span>Đã ghép {matched.size}/{pairs.length}</span><span>Lượt thử: {moves}</span></div>
      <Progress value={matched.size} max={pairs.length} label="Số cặp đã ghép" tone="accent" />
      <Card>
        <p className="mb-3 text-sm text-muted-foreground">Chọn một hình, rồi chọn từ tiếng Nhật đúng với hình đó.</p>
        <div className="grid grid-cols-2 gap-4">
          <ul className="space-y-2" aria-label="Hình">
            {pairs.map((p) => (
              <li key={p.id}>
                <button type="button" disabled={matched.has(p.id)} aria-pressed={selected === p.id} onClick={() => pickLeft(p.id)}
                  className={cn("nc-touch grid w-full place-items-center rounded-md border p-2", matched.has(p.id) ? "border-success opacity-60" : selected === p.id ? "border-primary bg-muted" : "border-border hover:bg-muted")}>
                  <FaceView f={p.a} />
                </button>
              </li>
            ))}
          </ul>
          <ul className="space-y-2" aria-label="Từ">
            {right.map((p) => (
              <li key={p.id}>
                <button type="button" disabled={matched.has(p.id) || !selected} onClick={() => pickRight(p.id)}
                  className={cn("nc-touch grid min-h-24 w-full place-items-center rounded-md border p-2", matched.has(p.id) ? "border-success bg-[color-mix(in_oklab,var(--success)_14%,var(--card))]" : wrongFlash === p.id ? "nc-shake border-danger" : "border-border hover:bg-muted disabled:opacity-60")}>
                  <FaceView f={p.b} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}

interface MemoryCard {
  uid: string;
  pairId: string;
  face: Face;
}

/** Memory Match: lật hai thẻ, trùng cặp thì giữ mở. */
export function MemoryGame({ pairs, onFinish }: { pairs: MatchPair[]; onFinish: (o: MatchOutcome) => void }) {
  const [cards] = React.useState<MemoryCard[]>(() =>
    shuffle(pairs.flatMap((p) => [{ uid: `${p.id}-a`, pairId: p.id, face: p.a }, { uid: `${p.id}-b`, pairId: p.id, face: p.b }]), mulberry32(randomSeed())),
  );
  const [open, setOpen] = React.useState<string[]>([]);
  const [matched, setMatched] = React.useState<Set<string>>(new Set());
  const [moves, setMoves] = React.useState(0);
  const [mistakes, setMistakes] = React.useState<Record<string, number>>({});
  const lock = React.useRef(false);
  const startedAt = React.useRef(Date.now());
  const reported = React.useRef(false);

  function flip(c: MemoryCard) {
    if (lock.current || open.includes(c.uid) || matched.has(c.pairId)) return;
    const next = [...open, c.uid];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((u) => cards.find((x) => x.uid === u)!);
      if (a.pairId === b.pairId) {
        const m = new Set(matched).add(a.pairId);
        setMatched(m);
        setOpen([]);
        if (m.size === pairs.length && !reported.current) {
          reported.current = true;
          onFinish({ pairs, mistakes, moves: moves + 1, startedAt: startedAt.current });
        }
      } else {
        lock.current = true;
        setMistakes((x) => ({ ...x, [a.pairId]: (x[a.pairId] ?? 0) + 1, [b.pairId]: (x[b.pairId] ?? 0) + 1 }));
        setTimeout(() => {
          setOpen([]);
          lock.current = false;
        }, 900);
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between text-sm"><span>Đã tìm {matched.size}/{pairs.length} cặp</span><span>Lượt lật: {moves}</span></div>
      <Progress value={matched.size} max={pairs.length} label="Số cặp đã tìm" tone="accent" />
      <Card>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {cards.map((c) => {
            const shown = open.includes(c.uid) || matched.has(c.pairId);
            return (
              <li key={c.uid}>
                <button type="button" onClick={() => flip(c)} aria-label={shown ? undefined : "Thẻ úp"} aria-pressed={shown}
                  className={cn("nc-touch grid aspect-square w-full place-items-center rounded-md border p-1 text-center transition-colors", matched.has(c.pairId) ? "border-success bg-[color-mix(in_oklab,var(--success)_14%,var(--card))]" : shown ? "border-primary bg-card" : "border-border bg-muted hover:bg-[color-mix(in_oklab,var(--muted),var(--foreground)_8%)]")}>
                  {shown ? <FaceView f={c.face} /> : <span aria-hidden="true" className="text-2xl text-muted-foreground">?</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
