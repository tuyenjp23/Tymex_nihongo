"use client";
import * as React from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Đã xảy ra lỗi</h1>
        <p className="mt-2 text-muted-foreground">Rất tiếc, có sự cố khi tải trang này. Tiến độ học của bạn vẫn an toàn trong trình duyệt.</p>
        {error.digest ? <p className="mt-1 text-xs text-muted-foreground">Mã lỗi: {error.digest}</p> : null}
        <button type="button" onClick={reset} className="mt-5 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground">Thử lại</button>
      </div>
    </main>
  );
}
