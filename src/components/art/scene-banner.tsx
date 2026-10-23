import * as React from "react";
import { JapanScene } from "./japan-scene";
import type { SceneId } from "@/config/japan-photos";
import { cn } from "@/lib/utils";

/**
 * Dải ảnh có lớp phủ tối phía dưới để chữ trắng luôn đọc được (độ tương phản đo trên nền #141b36 ≥ 0.88 alpha).
 * Khung có aspect-ratio cố định → không xô lệch bố cục khi ảnh tải xong. Chữ nằm ở `children` (góc dưới trái).
 */
export function SceneBanner({
  scene,
  children,
  className,
  sizes,
  position,
  priority,
}: {
  scene: SceneId;
  children?: React.ReactNode;
  className?: string;
  sizes?: string;
  position?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative isolate overflow-hidden rounded-xl bg-ink", className)}>
      <JapanScene scene={scene} decorative sizes={sizes} position={position} priority={priority} />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[rgb(20_27_54/0.92)] via-[rgb(20_27_54/0.55)] to-[rgb(20_27_54/0.08)]" />
      {children ? <div className="absolute inset-x-0 bottom-0 p-4 text-white">{children}</div> : null}
    </div>
  );
}
