"use client";
import * as React from "react";
import { stripRuby } from "@/lib/furigana";
import { Volume2 } from "@/components/icons";
import { cn } from "@/lib/utils";

/** Cache danh sách giọng (getVoices() có thể rỗng ở lần gọi đầu). */
function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang.toLowerCase().startsWith("ja")) ?? null;
}

export function speakJapanese(text: string, rate = 0.9): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const u = new SpeechSynthesisUtterance(stripRuby(text));
  u.lang = "ja-JP";
  u.rate = rate;
  const v = pickJapaneseVoice();
  if (v) u.voice = v;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return true;
}

export function useSpeechSupport(): boolean {
  const [ok, setOk] = React.useState(true);
  React.useEffect(() => {
    setOk("speechSynthesis" in window);
  }, []);
  return ok;
}

/**
 * Nút nghe bằng giọng tổng hợp của trình duyệt (Web Speech API). Chất lượng phụ thuộc thiết bị — KHÔNG phải
 * giọng người thật. Nếu thiết bị không hỗ trợ, nút bị vô hiệu hóa và nói rõ lý do.
 */
export function SpeakButton({ text, label = "Nghe phát âm", className, rate }: { text: string; label?: string; className?: string; rate?: number }) {
  const supported = useSpeechSupport();
  return (
    <button
      type="button"
      onClick={() => speakJapanese(text, rate)}
      disabled={!supported}
      aria-label={supported ? label : "Thiết bị này không hỗ trợ đọc giọng nói"}
      title={supported ? label : "Thiết bị này không hỗ trợ đọc giọng nói"}
      className={cn("nc-touch inline-grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card hover:bg-muted disabled:opacity-40", className)}
    >
      <Volume2 size={16} aria-hidden="true" />
    </button>
  );
}
