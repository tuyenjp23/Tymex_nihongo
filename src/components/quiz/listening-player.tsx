"use client";
import * as React from "react";
import type { QuizPassage } from "@/lib/quiz";
import { stripRuby } from "@/lib/furigana";
import { Button } from "@/components/ui/button";
import { Square, Play } from "lucide-react";
import { useSpeechSupport } from "@/components/content/speak-button";

/**
 * Phát bài nghe bằng giọng tổng hợp của trình duyệt (không phải file ghi âm). Người nói khác nhau dùng cao độ khác nhau.
 * Kịch bản KHÔNG hiển thị cho tới khi trang cha cho phép (sau khi trả lời).
 */
export function ListeningPlayer({ passage }: { passage: QuizPassage }) {
  const supported = useSpeechSupport();
  const [playing, setPlaying] = React.useState(false);
  const stopRef = React.useRef(false);

  const stop = React.useCallback(() => {
    stopRef.current = true;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlaying(false);
  }, []);

  React.useEffect(() => stop, [stop]);
  React.useEffect(() => {
    stop();
  }, [passage.id, stop]);

  function play() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    stopRef.current = false;
    setPlaying(true);
    const speakers = [...new Set(passage.script.map((l) => l.speaker))];
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("ja"));
    passage.script.forEach((line, i) => {
      const u = new SpeechSynthesisUtterance(stripRuby(line.text));
      u.lang = "ja-JP";
      u.rate = 0.9;
      const si = speakers.indexOf(line.speaker);
      u.pitch = si % 2 === 0 ? 1 : 1.35;
      if (voices.length > 0) u.voice = voices[si % voices.length];
      if (i === passage.script.length - 1) u.onend = () => !stopRef.current && setPlaying(false);
      u.onerror = () => setPlaying(false);
      window.speechSynthesis.speak(u);
    });
  }

  if (!supported) {
    return <p className="rounded-md border border-warning/60 p-3 text-sm">Thiết bị này không hỗ trợ đọc giọng nói nên không phát được bài nghe. Hãy thử trình duyệt khác (Chrome, Edge, Safari).</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted p-3">
      {playing ? (
        <Button onClick={stop} variant="outline"><Square size={16} aria-hidden="true" /> Dừng</Button>
      ) : (
        <Button onClick={play}><Play size={16} aria-hidden="true" /> Nghe bài</Button>
      )}
      <p className="text-xs text-muted-foreground">Giọng tổng hợp của trình duyệt — chất lượng tùy thiết bị, không phải giọng người thật.</p>
    </div>
  );
}
