"use client";
import * as React from "react";
import Image from "next/image";
import { AVAILABLE_PHOTOS, SCENES, photoBySlot, type SceneId } from "@/config/japan-photos";
import { JapanArt } from "./japan-art";
import { cn } from "@/lib/utils";

/**
 * Một "cảnh" Nhật Bản: ảnh thật (next/image, đã khai báo width/height → không xô lệch bố cục) nếu đã tải về,
 * nếu chưa có hoặc ảnh lỗi thì dùng tranh SVG. Luôn đổ đầy khung cha (cha cần `relative` + kích thước/aspect-ratio).
 * `decorative`: ảnh chỉ trang trí → alt rỗng (trình đọc màn hình bỏ qua); mặc định ảnh có alt mô tả.
 */
export function JapanScene({
  scene,
  className,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  decorative = false,
  position = "center",
}: {
  scene: SceneId;
  className?: string;
  priority?: boolean;
  sizes?: string;
  decorative?: boolean;
  /** vị trí cắt ảnh (object-position) — mobile/ desktop dùng chung */
  position?: string;
}) {
  const def = SCENES[scene];
  const photo = def.photo ? AVAILABLE_PHOTOS[def.photo] : undefined;
  const [failed, setFailed] = React.useState(false);
  if (!photo || failed) {
    return (
      <span className={cn("absolute inset-0 block", className)} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : def.alt}>
        <JapanArt kind={def.art} className="h-full w-full" />
      </span>
    );
  }
  const src = photoBySlot(def.photo!)!;
  return (
    <Image
      src={photo.file}
      alt={decorative ? "" : src.alt}
      width={photo.width}
      height={photo.height}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      onError={() => setFailed(true)}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
      style={{ objectPosition: position }}
    />
  );
}
