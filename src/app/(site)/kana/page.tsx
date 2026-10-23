import { ensureModule } from "@/lib/content";
import { PageHeader } from "@/components/ui/card";
import { KanaView } from "@/components/kana/kana-view";

export const metadata = { title: "Bảng chữ cái Hiragana · Katakana" };

export default async function KanaPage() {
  await ensureModule("kana");
  return (
    <>
      <PageHeader
        title="ひらがな・カタカナ"
        description="Học bảng chữ cái tiếng Nhật: xem bảng, nghe phát âm và luyện tập. Mức nhớ từng chữ được lưu theo lịch ôn SM-2."
      />
      <KanaView />
    </>
  );
}
