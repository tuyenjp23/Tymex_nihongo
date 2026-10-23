import * as React from "react";

/**
 * Tranh minh họa Nhật Bản VẼ BẰNG SVG (do dự án tự tạo, không dùng tài sản của bên thứ ba → không vướng bản quyền).
 * Dùng làm hình mặc định khi chưa có ảnh thật (xem docs/ANH-VA-GIAY-PHEP.md) và làm dự phòng khi ảnh lỗi.
 * Màu lấy từ biến theme (--ink, --accent, --gold, --background) nên tự đổi theo giao diện sáng/tối.
 */
export type ArtKind = "fuji" | "torii" | "sakura" | "pagoda" | "momiji" | "lantern" | "train" | "office" | "city" | "brush";

const INK = "var(--ink)";
const RED = "var(--accent)";
const GOLD = "var(--gold)";
const PAPER = "color-mix(in oklab, var(--background) 88%, var(--gold))";
const INK_SOFT = "color-mix(in oklab, var(--ink) 55%, var(--background))";
const INK_MIST = "color-mix(in oklab, var(--ink) 22%, var(--background))";

function Fuji() {
  return (
    <>
      <rect width="400" height="240" fill={PAPER} />
      <circle cx="292" cy="78" r="34" fill={RED} opacity="0.92" />
      <path d="M0 190 L128 96 L168 70 L206 62 L246 96 L400 196 V240 H0Z" fill={INK_MIST} />
      <path d="M40 200 L150 112 L190 56 L214 56 L252 112 L372 204 V240 H40Z" fill={INK} />
      <path d="M190 56 L214 56 L233 88 L214 80 L204 96 L192 82 L174 90Z" fill="#fff" opacity="0.95" />
      <path d="M0 206 Q100 184 200 206 T400 200 V240 H0Z" fill={INK_SOFT} />
      <path d="M0 226 Q100 208 200 226 T400 222 V240 H0Z" fill={INK} />
      <g stroke={GOLD} strokeWidth="1.5" fill="none" opacity="0.8"><path d="M20 50 h60 M44 60 h60 M300 30 h50"/></g>
    </>
  );
}

function Torii() {
  return (
    <>
      <rect width="400" height="240" fill={PAPER} />
      <path d="M0 170 Q90 120 180 160 T400 150 V240 H0Z" fill={INK_MIST} />
      <path d="M0 200 Q120 160 240 196 T400 190 V240 H0Z" fill={INK_SOFT} />
      <rect x="112" y="92" width="16" height="118" fill={RED} />
      <rect x="272" y="92" width="16" height="118" fill={RED} />
      <rect x="126" y="122" width="148" height="9" fill={RED} />
      <path d="M92 84 Q200 98 308 84 L316 66 Q200 82 84 66Z" fill={INK} />
      <rect x="104" y="204" width="32" height="8" fill={INK} />
      <rect x="264" y="204" width="32" height="8" fill={INK} />
      <circle cx="320" cy="40" r="16" fill={GOLD} opacity="0.85" />
    </>
  );
}

function Petals({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-9" rx="6" ry="9" fill={RED} opacity="0.4" transform={`rotate(${a})`} />
      ))}
      <circle r="3" fill={GOLD} />
    </g>
  );
}

function Sakura() {
  return (
    <>
      <rect width="400" height="240" fill={PAPER} />
      <path d="M-10 210 C80 170 140 150 210 120 S330 70 420 40" stroke={INK} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M150 150 C170 120 190 112 214 108 M250 100 C262 74 276 60 296 52" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
      {[[110, 168, 1.2], [168, 128, 1.5], [214, 104, 1.1], [260, 92, 1.4], [300, 56, 1.2], [342, 48, 1], [196, 150, 0.9], [236, 126, 0.8], [70, 190, 0.9], [330, 78, 0.9]].map(([x, y, s], i) => (
        <Petals key={i} x={x} y={y} s={s} />
      ))}
      <circle cx="60" cy="60" r="26" fill={GOLD} opacity="0.7" />
    </>
  );
}

function Pagoda() {
  const tiers = [0, 1, 2, 3, 4];
  return (
    <>
      <rect width="400" height="240" fill={INK_MIST} />
      <path d="M0 200 Q100 150 200 190 T400 170 V240 H0Z" fill={INK_SOFT} />
      <rect x="196" y="20" width="8" height="30" fill={GOLD} />
      {tiers.map((i) => {
        const w = 120 - i * 14;
        const y = 168 - i * 30;
        return (
          <g key={i}>
            <rect x={200 - (w - 24) / 2} y={y - 22} width={w - 24} height="22" fill={INK} />
            <rect x={200 - (w - 40) / 2} y={y - 18} width={w - 40} height="10" fill={RED} opacity="0.85" />
            <path d={`M${200 - w / 2 - 14} ${y - 22} Q200 ${y - 36} ${200 + w / 2 + 14} ${y - 22} L${200 + w / 2} ${y - 14} H${200 - w / 2}Z`} fill={INK} />
          </g>
        );
      })}
      <rect x="0" y="206" width="400" height="34" fill={INK} />
      <circle cx="80" cy="56" r="20" fill={GOLD} opacity="0.85" />
    </>
  );
}

function Leaf({ x, y, r, c }: { x: number; y: number; r: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d="M0 -22 L5 -10 L16 -14 L11 -2 L22 4 L9 8 L10 20 L0 12 L-10 20 L-9 8 L-22 4 L-11 -2 L-16 -14 L-5 -10Z" fill={c} />
      <path d="M0 -12 V28" stroke={INK} strokeWidth="1.5" opacity="0.5" />
    </g>
  );
}

function Momiji() {
  return (
    <>
      <rect width="400" height="240" fill={INK} />
      <circle cx="320" cy="60" r="34" fill={GOLD} opacity="0.25" />
      {[[70, 70, -20, RED], [150, 130, 30, GOLD], [230, 70, 10, RED], [300, 150, -35, GOLD], [110, 190, 50, RED], [350, 80, 20, RED], [200, 190, -10, GOLD], [40, 150, 15, GOLD]].map(([x, y, r, c], i) => (
        <Leaf key={i} x={x as number} y={y as number} r={r as number} c={c as string} />
      ))}
    </>
  );
}

function Lantern() {
  return (
    <>
      <rect width="400" height="240" fill={INK} />
      <path d="M0 40 H400" stroke={GOLD} strokeWidth="2" opacity="0.6" />
      {[90, 200, 310].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i === 1 ? 14 : 30})`}>
          <path d="M0 10 V26" stroke={GOLD} strokeWidth="2" />
          <rect x="-16" y="26" width="32" height="8" rx="2" fill={INK_SOFT} />
          <ellipse cx="0" cy="84" rx="38" ry="52" fill={RED} />
          {[56, 70, 84, 98, 112].map((y) => (
            <path key={y} d={`M-${34 - Math.abs(y - 84) / 4} ${y} Q0 ${y + 6} ${34 - Math.abs(y - 84) / 4} ${y}`} stroke="#000" strokeOpacity="0.18" fill="none" />
          ))}
          <rect x="-16" y="132" width="32" height="8" rx="2" fill={INK_SOFT} />
          <text x="0" y="96" textAnchor="middle" fontSize="30" fontWeight="700" fill="#fff" style={{ fontFamily: "var(--font-jp-display)" }}>{["酒", "食", "宿"][i]}</text>
        </g>
      ))}
    </>
  );
}

function Train() {
  return (
    <>
      <rect width="400" height="240" fill={PAPER} />
      <rect y="150" width="400" height="90" fill={INK_MIST} />
      <rect y="196" width="400" height="6" fill={INK} />
      <rect y="214" width="400" height="4" fill={INK_SOFT} />
      <rect x="50" y="64" width="300" height="104" rx="18" fill="#fff" stroke={INK} strokeWidth="3" />
      <rect x="50" y="116" width="300" height="12" fill={RED} />
      {[78, 150, 222, 294].map((x) => (
        <rect key={x} x={x} y="76" width="46" height="34" rx="5" fill={INK} opacity="0.85" />
      ))}
      <circle cx="86" cy="172" r="12" fill={INK} /><circle cx="314" cy="172" r="12" fill={INK} />
      <rect x="20" y="40" width="64" height="40" rx="4" fill={INK} />
      <text x="52" y="66" textAnchor="middle" fontSize="18" fontWeight="700" fill={GOLD} style={{ fontFamily: "var(--font-jp-display)" }}>駅</text>
      <path d="M52 80 V150" stroke={INK} strokeWidth="4" />
    </>
  );
}

function Office() {
  const rows = [0, 1, 2, 3, 4];
  return (
    <>
      <rect width="400" height="240" fill={INK_MIST} />
      {[[30, 70, 90], [130, 30, 110], [250, 56, 100], [330, 96, 70]].map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={240 - y} fill={i % 2 ? INK : INK_SOFT} />
          {rows.map((r) =>
            [0, 1, 2].map((c) => (
              <rect key={`${r}-${c}`} x={x + 10 + c * ((w - 20) / 3)} y={y + 14 + r * 26} width={(w - 20) / 3 - 8} height="14" fill={(r + c + i) % 3 === 0 ? GOLD : "#fff"} opacity={(r + c + i) % 3 === 0 ? 0.9 : 0.25} />
            )),
          )}
        </g>
      ))}
      <circle cx="354" cy="40" r="16" fill={RED} opacity="0.9" />
    </>
  );
}

function City() {
  return (
    <>
      <rect width="400" height="240" fill={INK} />
      {[[10, 80, 70], [90, 40, 80], [180, 100, 60], [250, 60, 90], [350, 90, 50]].map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={240 - y} fill={i % 2 ? INK_SOFT : "color-mix(in oklab, var(--ink) 80%, #000)"} />
      ))}
      {[[24, 96, 40, 20, RED], [100, 60, 56, 24, GOLD], [192, 120, 36, 18, RED], [264, 80, 64, 26, GOLD], [358, 110, 32, 16, RED]].map(([x, y, w, h, c], i) => (
        <rect key={i} x={x as number} y={y as number} width={w as number} height={h as number} rx="3" fill={c as string} opacity="0.92" />
      ))}
      <rect y="214" width="400" height="26" fill="#000" opacity="0.35" />
      {[40, 120, 200, 280, 360].map((x) => (<rect key={x} x={x} y="226" width="30" height="4" fill="#fff" opacity="0.7" />))}
    </>
  );
}

function Brush() {
  return (
    <>
      <rect width="400" height="240" fill={PAPER} />
      <path d="M262 74 C236 38 170 32 134 68 C98 104 104 168 148 190 C192 212 262 196 280 150 C292 120 276 100 258 92" fill="none" stroke={INK} strokeWidth="16" strokeLinecap="round" />
      <path d="M262 74 C236 38 170 32 134 68" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      <text x="200" y="146" textAnchor="middle" fontSize="64" fontWeight="700" fill={INK} style={{ fontFamily: "var(--font-jp-display)" }}>道</text>
      <rect x="318" y="162" width="38" height="38" rx="5" fill={RED} />
      <text x="337" y="190" textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff" style={{ fontFamily: "var(--font-jp-display)" }}>学</text>
    </>
  );
}

const SCENES: Record<ArtKind, () => React.JSX.Element> = { fuji: Fuji, torii: Torii, sakura: Sakura, pagoda: Pagoda, momiji: Momiji, lantern: Lantern, train: Train, office: Office, city: City, brush: Brush };

export function JapanArt({ kind, className }: { kind: ArtKind; className?: string }) {
  const Scene = SCENES[kind];
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className={className} role="presentation" aria-hidden="true" focusable="false">
      <Scene />
    </svg>
  );
}
