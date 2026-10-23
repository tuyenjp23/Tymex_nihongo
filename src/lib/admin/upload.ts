/** Nhận dạng định dạng ảnh theo "chữ ký" đầu file (không tin vào tên/ Content-Type do client gửi). SVG cố ý KHÔNG được phép (có thể chứa script). */
export function sniffImage(b: Uint8Array): { ext: "png" | "jpg" | "webp" | "gif" } | null {
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png" };
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg" };
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return { ext: "webp" };
  if (b.length > 6 && String.fromCharCode(...b.slice(0, 4)) === "GIF8") return { ext: "gif" };
  return null;
}

