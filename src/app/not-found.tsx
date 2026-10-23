import Link from "next/link";

export const metadata = { title: "Không tìm thấy trang" };

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-6 text-center">
      <div>
        <p className="jp text-6xl font-bold text-primary" lang="ja">迷</p>
        <h1 className="mt-4 text-2xl font-bold">Không tìm thấy trang này</h1>
        <p className="mt-2 text-muted-foreground">Trang không tồn tại, đã bị tắt bởi quản trị viên, hoặc nội dung đã bị ẩn.</p>
        <Link href="/" className="mt-5 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground">Về trang tổng quan</Link>
      </div>
    </main>
  );
}
