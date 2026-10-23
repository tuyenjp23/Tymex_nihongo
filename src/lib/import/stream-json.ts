import fs from "node:fs";
import { createHash } from "node:crypto";

/**
 * Đọc "dòng chảy" (streaming) các file dữ liệu lớn có dạng
 *   { "metadata": { ... }, "<payloadKey>": [ {...}, {...}, ... ] }
 * mà không nạp cả file vào bộ nhớ: mỗi phần tử của mảng được parse riêng và trả về lần lượt.
 * (words.json của bộ dữ liệu nặng ~48 MB; kho câu đầy đủ có thể hàng trăm MB.)
 *
 * Bộ quét theo dõi độ sâu ngoặc và chuỗi (có xử lý \"), nên đúng với mọi JSON hợp lệ, kể cả khi chuỗi chứa ký tự { [ } ].
 */
export type StreamEvent =
  | { kind: "meta"; key: string; value: unknown }
  | { kind: "item"; value: unknown; index: number };

export class StreamFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamFormatError";
  }
}

export async function* streamDataset(file: string, payloadKey: string, opts: { highWaterMark?: number } = {}): AsyncGenerator<StreamEvent> {
  const rs = fs.createReadStream(file, { encoding: "utf8", highWaterMark: opts.highWaterMark ?? 1 << 20 });

  let depth = 0;
  let inStr = false;
  let esc = false;
  let strBuf = "";
  let lastStr = "";
  let curKey: string | null = null;
  let inPayload = false;
  let payloadSeen = false;
  let cap: string[] | null = null;
  let capFrom = 0;
  let capEndDepth = 0;
  let capIsMeta = false;
  let index = 0;

  for await (const chunk of rs as AsyncIterable<string>) {
    const s = chunk;
    capFrom = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      if (inStr) {
        if (esc) esc = false;
        else if (ch === 92 /* \ */) esc = true;
        else if (ch === 34 /* " */) {
          inStr = false;
          lastStr = strBuf;
        } else if (depth === 1 && cap === null) strBuf += s[i];
        continue;
      }
      switch (ch) {
        case 34: // "
          inStr = true;
          strBuf = "";
          break;
        case 58: // :
          if (depth === 1 && cap === null) curKey = lastStr;
          break;
        case 123: // {
        case 91: {
          // [
          depth++;
          if (cap === null) {
            if (depth === 2 && ch === 91 && curKey === payloadKey && !inPayload && !payloadSeen) {
              inPayload = true;
              payloadSeen = true;
            } else if (depth === 2) {
              cap = [];
              capFrom = i;
              capEndDepth = 1;
              capIsMeta = true;
            } else if (depth === 3 && inPayload) {
              cap = [];
              capFrom = i;
              capEndDepth = 2;
              capIsMeta = false;
            }
          }
          break;
        }
        case 125: // }
        case 93: {
          // ]
          depth--;
          if (cap !== null && depth === capEndDepth) {
            cap.push(s.slice(capFrom, i + 1));
            const text = cap.join("");
            cap = null;
            let value: unknown;
            try {
              value = JSON.parse(text);
            } catch (e) {
              throw new StreamFormatError(`JSON hỏng gần phần tử #${index} của "${payloadKey}" trong ${file}: ${(e as Error).message}`);
            }
            if (capIsMeta) yield { kind: "meta", key: curKey ?? "", value };
            else yield { kind: "item", value, index: index++ };
          } else if (cap === null && inPayload && depth === 1 && ch === 93) {
            inPayload = false;
          }
          break;
        }
        default:
          // Phần tử không phải đối tượng/mảng bên trong payload (số, chuỗi trần…) không được hỗ trợ
          if (inPayload && cap === null && depth === 2 && ch !== 44 && ch !== 32 && ch !== 10 && ch !== 13 && ch !== 9)
            throw new StreamFormatError(`"${payloadKey}" trong ${file} phải là mảng các đối tượng`);
      }
    }
    if (cap !== null) cap.push(s.slice(capFrom));
  }
  if (depth !== 0 || inStr) throw new StreamFormatError(`File ${file} kết thúc đột ngột (JSON không đầy đủ)`);
  if (!payloadSeen) throw new StreamFormatError(`Không thấy mảng "${payloadKey}" trong ${file}`);
}

/** Đọc riêng phần metadata (dừng ngay khi gặp phần tử đầu tiên của payload nếu metadata nằm trước payload). */
export async function readMetadata(file: string, payloadKey: string): Promise<Record<string, unknown>> {
  const meta: Record<string, unknown> = {};
  for await (const ev of streamDataset(file, payloadKey)) {
    if (ev.kind === "meta") meta[ev.key] = ev.value;
    else if (Object.keys(meta).length > 0) break;
  }
  return (meta.metadata as Record<string, unknown>) ?? {};
}

/** SHA-256 của file, tính theo dòng chảy — ghi vào báo cáo để biết chính xác đã nhập từ bản file nào. */
export function sha256File(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = createHash("sha256");
    fs.createReadStream(file)
      .on("data", (d) => h.update(d))
      .on("end", () => resolve(h.digest("hex")))
      .on("error", reject);
  });
}
