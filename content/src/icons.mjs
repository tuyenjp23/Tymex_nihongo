// Bộ hình minh họa SVG TỰ VẼ cho Nihongo Compass (thiết kế đơn giản, cùng bảng màu, nền 128×128).
// Chủ dự án giữ quyền sử dụng; không sao chép từ bất kỳ hình ảnh nào bên ngoài.
// Chạy `npm run gen:images` để sinh file vào public/images/vocab/.

const INK = "#243b53";
const BLUE = "#4c8bf5";
const SKY = "#dbeafe";
const GREEN = "#3fa66b";
const LGREEN = "#a7d7a1";
const RED = "#e5484d";
const ORANGE = "#f59e42";
const YELLOW = "#f7c948";
const BROWN = "#a0674b";
const GRAY = "#9aa5b1";
const LIGHT = "#eef4fb";
const SKIN = "#f6c7a1";
const PINK = "#f472b6";
const W = "#ffffff";

const S = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;

export const icons = {
  yama: {
    alt: "Ngọn núi có đỉnh phủ tuyết dưới mặt trời",
    concepts: ["山", "núi"],
    bg: SKY,
    body: `<circle cx="100" cy="28" r="11" fill="${YELLOW}" ${S}/>
<path d="M6 106 L52 34 L82 80 L98 60 L124 106 Z" fill="#6b8f71" ${S}/>
<path d="M52 34 L41 53 L49 49 L55 58 L61 49 L68 54 Z" fill="${W}" ${S}/>
<rect x="0" y="106" width="128" height="22" fill="${LGREEN}"/>`,
  },
  kawa: {
    alt: "Dòng sông uốn lượn giữa hai bờ cỏ",
    concepts: ["川", "sông"],
    bg: LGREEN,
    body: `<path d="M-4 44 Q34 26 60 54 T132 66 L132 104 Q96 92 62 108 T-4 92 Z" fill="${BLUE}" ${S}/>
<path d="M18 62 q8 -6 16 0 M70 80 q8 -6 16 0 M96 66 q8 -6 16 0 M30 84 q8 -6 16 0" fill="none" stroke="${W}" stroke-width="3" stroke-linecap="round"/>
<path d="M14 24 v10 M22 22 v12 M104 112 v10 M112 110 v12" stroke="${GREEN}" stroke-width="3" stroke-linecap="round"/>`,
  },
  ki: {
    alt: "Cái cây có thân nâu và tán lá xanh",
    concepts: ["木", "cây"],
    bg: SKY,
    body: `<rect x="56" y="70" width="16" height="40" rx="3" fill="${BROWN}" ${S}/>
<circle cx="64" cy="48" r="26" fill="${GREEN}" ${S}/>
<circle cx="44" cy="62" r="17" fill="${GREEN}" ${S}/>
<circle cx="84" cy="62" r="17" fill="${GREEN}" ${S}/>
<rect x="0" y="108" width="128" height="20" fill="${LGREEN}"/>`,
  },
  hana: {
    alt: "Bông hoa hồng nhạt có cuống và lá xanh",
    concepts: ["花", "hoa"],
    bg: LIGHT,
    body: `<path d="M64 62 V112" stroke="${GREEN}" stroke-width="6" stroke-linecap="round"/>
<path d="M64 96 q-26 -2 -28 -22 q22 0 28 22 Z" fill="${GREEN}" ${S}/>
<g fill="${PINK}" ${S}><circle cx="64" cy="30" r="14"/><circle cx="86" cy="46" r="14"/><circle cx="78" cy="70" r="14"/><circle cx="50" cy="70" r="14"/><circle cx="42" cy="46" r="14"/></g>
<circle cx="64" cy="54" r="12" fill="${YELLOW}" ${S}/>`,
  },
  sora: {
    alt: "Bầu trời xanh có mây trắng và mặt trời",
    concepts: ["空", "bầu trời"],
    bg: "#8ec5ff",
    body: `<circle cx="96" cy="34" r="13" fill="${YELLOW}" ${S}/>
<path d="M22 86 a16 16 0 0 1 14 -24 a22 22 0 0 1 42 4 a15 15 0 0 1 14 20 Z" fill="${W}" ${S}/>
<path d="M70 108 a11 11 0 0 1 8 -18 a15 15 0 0 1 28 3 a10 10 0 0 1 8 15 Z" fill="${W}" ${S}/>`,
  },
  ame: {
    alt: "Đám mây xám đang mưa",
    concepts: ["雨", "mưa"],
    bg: "#cbd5e1",
    body: `<path d="M30 72 a20 20 0 0 1 12 -36 a28 28 0 0 1 52 6 a19 19 0 0 1 4 30 Z" fill="${W}" ${S}/>
<g stroke="${BLUE}" stroke-width="5" stroke-linecap="round"><path d="M42 86 l-6 16"/><path d="M62 86 l-6 16"/><path d="M82 86 l-6 16"/><path d="M52 104 l-5 14"/><path d="M72 104 l-5 14"/><path d="M92 90 l-5 14"/></g>`,
  },
  tsuki: {
    alt: "Trăng lưỡi liềm vàng trên bầu trời đêm",
    concepts: ["月", "mặt trăng"],
    bg: "#1e3a5f",
    body: `<path d="M84 22 a42 42 0 1 0 22 64 a34 34 0 0 1 -22 -64 Z" fill="${YELLOW}" stroke="#fff6cc" stroke-width="3" stroke-linejoin="round"/>
<g fill="${W}"><circle cx="30" cy="30" r="2.5"/><circle cx="108" cy="30" r="2"/><circle cx="100" cy="100" r="2.5"/><circle cx="22" cy="92" r="2"/></g>`,
  },
  hi: {
    alt: "Ngọn lửa đỏ cam trên mấy khúc củi",
    concepts: ["火", "lửa"],
    bg: LIGHT,
    body: `<path d="M64 14 C74 36 96 46 94 72 C93 90 80 100 64 100 C48 100 34 90 34 72 C34 56 46 50 50 36 C56 44 58 48 62 48 C66 38 62 26 64 14 Z" fill="${RED}" ${S}/>
<path d="M64 52 C70 64 82 68 80 82 C79 92 72 96 64 96 C56 96 49 92 49 82 C49 72 58 68 64 52 Z" fill="${ORANGE}" ${S}/>
<path d="M64 74 C68 80 72 82 71 88 C70 92 67 94 64 94 C61 94 58 92 58 88 C58 82 62 80 64 74 Z" fill="${YELLOW}"/>
<rect x="26" y="102" width="76" height="12" rx="6" fill="${BROWN}" ${S}/>`,
  },
  mizu: {
    alt: "Giọt nước xanh và những làn sóng nhỏ",
    concepts: ["水", "nước"],
    bg: LIGHT,
    body: `<path d="M64 14 C84 42 96 58 96 76 a32 32 0 0 1 -64 0 C32 58 44 42 64 14 Z" fill="${BLUE}" ${S}/>
<path d="M48 78 a16 16 0 0 0 10 14" fill="none" stroke="${W}" stroke-width="5" stroke-linecap="round"/>
<path d="M18 112 q10 -8 20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="${BLUE}" stroke-width="4" stroke-linecap="round"/>`,
  },
  inu: {
    alt: "Mặt chú chó nâu với tai cụp và lưỡi hồng",
    concepts: ["犬", "chó"],
    bg: "#fff3e0",
    body: `<ellipse cx="30" cy="60" rx="14" ry="28" fill="${BROWN}" ${S} transform="rotate(14 30 60)"/>
<ellipse cx="98" cy="60" rx="14" ry="28" fill="${BROWN}" ${S} transform="rotate(-14 98 60)"/>
<ellipse cx="64" cy="66" rx="36" ry="38" fill="#e8c39e" ${S}/>
<ellipse cx="64" cy="82" rx="18" ry="14" fill="${W}" ${S}/>
<circle cx="50" cy="58" r="5" fill="${INK}"/><circle cx="78" cy="58" r="5" fill="${INK}"/>
<ellipse cx="64" cy="76" rx="7" ry="5" fill="${INK}"/>
<path d="M64 81 v6 M56 90 q8 6 16 0" fill="none" ${S}/>
<path d="M60 90 q4 14 8 0 Z" fill="${PINK}" ${S}/>`,
  },
  neko: {
    alt: "Mặt chú mèo xám với tai nhọn và ria mép",
    concepts: ["猫", "mèo"],
    bg: "#f1f5f9",
    body: `<path d="M24 56 L28 14 L58 36 Z" fill="${GRAY}" ${S}/>
<path d="M104 56 L100 14 L70 36 Z" fill="${GRAY}" ${S}/>
<ellipse cx="64" cy="68" rx="42" ry="38" fill="${GRAY}" ${S}/>
<ellipse cx="48" cy="62" rx="5" ry="7" fill="${INK}"/><ellipse cx="80" cy="62" rx="5" ry="7" fill="${INK}"/>
<path d="M60 76 h8 l-4 5 Z" fill="${PINK}" ${S}/>
<path d="M64 81 v5 M56 90 q8 5 16 0" fill="none" ${S}/>
<path d="M20 74 l18 4 M20 86 l18 -2 M108 74 l-18 4 M108 86 l-18 -2" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  },
  me: {
    alt: "Con mắt với mống mắt xanh và lông mi",
    concepts: ["目", "mắt"],
    bg: LIGHT,
    body: `<path d="M10 66 Q64 14 118 66 Q64 112 10 66 Z" fill="${W}" ${S}/>
<circle cx="64" cy="64" r="22" fill="#5b8def" ${S}/>
<circle cx="64" cy="64" r="10" fill="${INK}"/>
<circle cx="58" cy="57" r="4" fill="${W}"/>
<path d="M30 40 l-6 -10 M64 28 v-12 M98 40 l6 -10" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  },
  kuchi: {
    alt: "Cái miệng mở với môi đỏ, răng và lưỡi",
    concepts: ["口", "miệng"],
    bg: "#fde8e8",
    body: `<path d="M12 62 Q36 38 64 52 Q92 38 116 62 Q92 108 64 108 Q36 108 12 62 Z" fill="${RED}" ${S}/>
<path d="M24 64 Q64 76 104 64 Q92 96 64 96 Q36 96 24 64 Z" fill="#7f1d1d"/>
<path d="M28 63 Q64 74 100 63 L96 72 Q64 80 32 72 Z" fill="${W}"/>
<path d="M46 92 q18 -14 36 0 q-18 8 -36 0 Z" fill="${PINK}"/>`,
  },
  te: {
    alt: "Bàn tay mở với năm ngón",
    concepts: ["手", "tay"],
    bg: LIGHT,
    body: `<g fill="${SKIN}" ${S}>
<rect x="30" y="38" width="14" height="42" rx="7"/>
<rect x="47" y="18" width="14" height="56" rx="7"/>
<rect x="64" y="14" width="14" height="60" rx="7"/>
<rect x="81" y="24" width="14" height="52" rx="7"/>
<path d="M30 80 q-14 -10 -20 -28 q-2 -8 6 -8 q10 4 14 18"/>
<path d="M26 74 L100 74 Q104 112 66 116 Q32 118 28 88 Z"/></g>`,
  },
  mimi: {
    alt: "Cái tai người nhìn nghiêng",
    concepts: ["耳", "tai"],
    bg: LIGHT,
    body: `<path d="M64 12 C100 12 108 44 96 66 C88 82 86 90 78 102 C68 118 44 112 44 94 L50 88 C34 78 24 56 32 36 C38 20 50 12 64 12 Z" fill="${SKIN}" ${S}/>
<path d="M64 32 C84 30 90 50 80 62 C72 72 70 78 62 74" fill="none" ${S}/>
<path d="M54 56 C54 48 62 46 66 50" fill="none" ${S}/>`,
  },
  ashi: {
    alt: "Hai dấu chân với năm ngón",
    concepts: ["足", "chân"],
    bg: "#fff3e0",
    body: `<g fill="${SKIN}" ${S}>
<path d="M34 54 C26 54 24 78 30 90 C34 102 52 102 54 90 C56 76 50 54 34 54 Z"/>
<circle cx="24" cy="44" r="5"/><circle cx="34" cy="38" r="5.5"/><circle cx="45" cy="38" r="5"/><circle cx="53" cy="44" r="4.5"/>
<path d="M92 38 C84 38 82 62 88 74 C92 86 110 86 112 74 C114 60 108 38 92 38 Z"/>
<circle cx="82" cy="28" r="5"/><circle cx="92" cy="22" r="5.5"/><circle cx="103" cy="22" r="5"/><circle cx="111" cy="28" r="4.5"/></g>`,
  },
  ringo: {
    alt: "Quả táo đỏ có cuống và lá xanh",
    concepts: ["りんご", "táo", "林檎"],
    bg: "#fef9e7",
    body: `<path d="M64 36 C48 24 18 34 20 68 C22 96 44 116 58 112 C62 111 66 111 70 112 C84 116 106 96 108 68 C110 34 80 24 64 36 Z" fill="${RED}" ${S}/>
<path d="M64 36 C64 26 68 18 74 12" fill="none" stroke="${BROWN}" stroke-width="5" stroke-linecap="round"/>
<path d="M70 28 C80 14 98 16 100 24 C92 34 78 34 70 28 Z" fill="${GREEN}" ${S}/>
<path d="M34 60 q2 -14 14 -18" fill="none" stroke="#ffd1d1" stroke-width="5" stroke-linecap="round"/>`,
  },
  ocha: {
    alt: "Tách trà xanh nóng có hơi bốc lên",
    concepts: ["お茶", "trà"],
    bg: "#eef7ee",
    body: `<path d="M44 20 q-8 10 0 20 M64 14 q-8 12 0 24 M84 20 q-8 10 0 20" fill="none" stroke="${GRAY}" stroke-width="4" stroke-linecap="round"/>
<path d="M24 50 H104 L98 92 Q94 108 64 108 Q34 108 30 92 Z" fill="${W}" ${S}/>
<ellipse cx="64" cy="50" rx="40" ry="8" fill="${GREEN}" ${S}/>
<path d="M104 58 q22 0 20 16 q-2 14 -22 14" fill="none" ${S}/>
<ellipse cx="64" cy="112" rx="40" ry="6" fill="${LGREEN}" ${S}/>`,
  },
  pan: {
    alt: "Ổ bánh mì nâu có vết rạch",
    concepts: ["パン", "bánh mì"],
    bg: "#fff3e0",
    body: `<path d="M16 76 C10 48 34 28 64 28 C94 28 118 48 112 76 C110 90 104 98 98 98 H30 C24 98 18 90 16 76 Z" fill="#e0a458" ${S}/>
<path d="M42 40 l12 24 M64 36 l12 28 M86 40 l8 24" fill="none" stroke="#b9772f" stroke-width="5" stroke-linecap="round"/>
<path d="M30 98 H98 V106 Q98 112 92 112 H36 Q30 112 30 106 Z" fill="#c98a3e" ${S}/>`,
  },
  sakana: {
    alt: "Con cá xanh có đuôi, vây và mắt",
    concepts: ["魚", "cá"],
    bg: SKY,
    body: `<path d="M96 64 L122 40 L118 64 L122 88 Z" fill="${BLUE}" ${S}/>
<ellipse cx="58" cy="64" rx="44" ry="28" fill="#6aa9ff" ${S}/>
<path d="M54 38 L70 20 L78 40 Z" fill="${BLUE}" ${S}/>
<path d="M30 52 q-6 12 0 24" fill="none" stroke="${W}" stroke-width="4" stroke-linecap="round"/>
<circle cx="34" cy="58" r="5" fill="${W}" ${S}/><circle cx="33" cy="58" r="2" fill="${INK}"/>
<path d="M60 52 q6 12 0 24 M74 52 q6 12 0 24" fill="none" stroke="${W}" stroke-width="3" stroke-linecap="round"/>`,
  },
  tamago: {
    alt: "Quả trứng màu kem đặt trên đĩa nhỏ",
    concepts: ["卵", "trứng"],
    bg: LIGHT,
    body: `<ellipse cx="64" cy="108" rx="34" ry="8" fill="${GRAY}" ${S}/>
<path d="M64 14 C90 14 102 52 102 76 C102 96 86 108 64 108 C42 108 26 96 26 76 C26 52 38 14 64 14 Z" fill="#fff4dc" ${S}/>
<path d="M44 52 q4 -16 14 -22" fill="none" stroke="${W}" stroke-width="5" stroke-linecap="round"/>`,
  },
  gohan: {
    alt: "Bát cơm trắng với đôi đũa",
    concepts: ["ご飯", "cơm", "ごはん"],
    bg: "#fff3e0",
    body: `<path d="M22 66 C22 30 106 30 106 66 Z" fill="${W}" ${S}/>
<path d="M44 46 q4 -6 8 0 M64 40 q4 -6 8 0 M82 48 q4 -6 8 0" fill="none" stroke="${GRAY}" stroke-width="3" stroke-linecap="round"/>
<path d="M14 66 H114 Q112 106 64 108 Q16 106 14 66 Z" fill="${RED}" ${S}/>
<path d="M90 8 L66 52 M100 12 L74 56" stroke="${BROWN}" stroke-width="5" stroke-linecap="round"/>`,
  },
  gyunyu: {
    alt: "Hộp sữa trắng với mái xanh",
    concepts: ["牛乳", "sữa"],
    bg: LIGHT,
    body: `<path d="M36 40 L64 14 L92 40 Z" fill="${BLUE}" ${S}/>
<rect x="36" y="40" width="56" height="70" fill="${W}" ${S}/>
<rect x="36" y="40" width="56" height="12" fill="${BLUE}" ${S}/>
<path d="M64 64 C74 78 80 84 80 92 a16 16 0 0 1 -32 0 C48 84 54 78 64 64 Z" fill="#8ec5ff" ${S}/>`,
  },
  hon: {
    alt: "Quyển sách đang mở với các dòng chữ",
    concepts: ["本", "sách"],
    bg: LIGHT,
    body: `<path d="M64 36 C48 24 28 24 10 32 V104 C28 96 48 96 64 108 Z" fill="${W}" ${S}/>
<path d="M64 36 C80 24 100 24 118 32 V104 C100 96 80 96 64 108 Z" fill="#f8fafc" ${S}/>
<path d="M22 46 q16 -4 30 4 M22 60 q16 -4 30 4 M22 74 q16 -4 30 4 M76 50 q14 -8 30 -4 M76 64 q14 -8 30 -4 M76 78 q14 -8 30 -4" fill="none" stroke="${BLUE}" stroke-width="3.5" stroke-linecap="round"/>`,
  },
  kuruma: {
    alt: "Chiếc ô tô xanh nhìn nghiêng",
    concepts: ["車", "ô tô", "xe hơi"],
    bg: SKY,
    body: `<path d="M12 84 V70 Q12 62 22 60 L38 56 L52 36 Q56 32 62 32 H84 Q90 32 94 36 L108 56 L116 60 Q122 62 122 70 V84 Z" fill="${BLUE}" ${S}/>
<path d="M50 56 L60 40 H80 L90 56 Z" fill="${W}" ${S}/>
<circle cx="38" cy="86" r="14" fill="${INK}" ${S}/><circle cx="38" cy="86" r="6" fill="${GRAY}"/>
<circle cx="94" cy="86" r="14" fill="${INK}" ${S}/><circle cx="94" cy="86" r="6" fill="${GRAY}"/>
<rect x="0" y="102" width="128" height="26" fill="#cbd5e1"/>`,
  },
  densha: {
    alt: "Đoàn tàu điện màu xanh lá chạy trên đường ray",
    concepts: ["電車", "tàu điện"],
    bg: SKY,
    body: `<rect x="8" y="34" width="112" height="56" rx="14" fill="${W}" ${S}/>
<rect x="8" y="62" width="112" height="14" fill="${GREEN}" ${S}/>
<g fill="${SKY}" ${S}><rect x="18" y="42" width="22" height="16" rx="3"/><rect x="48" y="42" width="22" height="16" rx="3"/><rect x="78" y="42" width="22" height="16" rx="3"/></g>
<path d="M24 20 H104 M64 20 V34" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
<circle cx="32" cy="98" r="7" fill="${INK}"/><circle cx="96" cy="98" r="7" fill="${INK}"/>
<path d="M0 108 H128 M0 116 H128" stroke="${GRAY}" stroke-width="4"/>`,
  },
  ie: {
    alt: "Ngôi nhà có mái đỏ, cửa ra vào và cửa sổ",
    concepts: ["家", "nhà"],
    bg: SKY,
    body: `<rect x="26" y="56" width="76" height="52" fill="#fff4dc" ${S}/>
<path d="M14 60 L64 18 L114 60 Z" fill="${RED}" ${S}/>
<rect x="54" y="76" width="20" height="32" rx="2" fill="${BROWN}" ${S}/>
<rect x="34" y="68" width="16" height="16" fill="${SKY}" ${S}/>
<rect x="80" y="68" width="16" height="16" fill="${SKY}" ${S}/>
<rect x="0" y="108" width="128" height="20" fill="${LGREEN}"/>`,
  },
  gakkou: {
    alt: "Tòa nhà trường học có tháp đồng hồ và lá cờ",
    concepts: ["学校", "trường học"],
    bg: SKY,
    body: `<rect x="14" y="58" width="100" height="50" fill="#fff4dc" ${S}/>
<rect x="46" y="28" width="36" height="30" fill="#fff4dc" ${S}/>
<path d="M42 30 L64 12 L86 30 Z" fill="${RED}" ${S}/>
<circle cx="64" cy="44" r="8" fill="${W}" ${S}/><path d="M64 39 v5 h4" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
<g fill="${SKY}" ${S}><rect x="22" y="68" width="14" height="14"/><rect x="92" y="68" width="14" height="14"/><rect x="46" y="68" width="14" height="14"/><rect x="68" y="68" width="14" height="14"/></g>
<rect x="54" y="88" width="20" height="20" fill="${BROWN}" ${S}/>
<path d="M104 58 V30 M104 30 L122 36 L104 42" fill="${YELLOW}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
<rect x="0" y="108" width="128" height="20" fill="${LGREEN}"/>`,
  },
  tokei: {
    alt: "Chiếc đồng hồ tròn có kim giờ và kim phút",
    concepts: ["時計", "đồng hồ"],
    bg: LIGHT,
    body: `<circle cx="64" cy="66" r="46" fill="${W}" ${S}/>
<circle cx="64" cy="66" r="38" fill="none" stroke="${GRAY}" stroke-width="2"/>
<g stroke="${INK}" stroke-width="4" stroke-linecap="round"><path d="M64 34 v6"/><path d="M64 92 v6"/><path d="M32 66 h6"/><path d="M90 66 h6"/></g>
<path d="M64 66 V46" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
<path d="M64 66 L80 76" stroke="${RED}" stroke-width="4" stroke-linecap="round"/>
<circle cx="64" cy="66" r="4" fill="${INK}"/>
<path d="M40 20 l8 8 M88 20 l-8 8" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
  },
  kasa: {
    alt: "Chiếc ô đỏ mở rộng với tay cầm cong",
    concepts: ["傘", "ô", "dù"],
    bg: "#cbd5e1",
    body: `<path d="M10 70 C10 36 38 16 64 16 C90 16 118 36 118 70 Q106 60 96 70 Q86 60 76 70 Q64 60 52 70 Q42 60 32 70 Q20 60 10 70 Z" fill="${RED}" ${S}/>
<path d="M64 16 V96 Q64 112 50 110 Q42 108 42 100" fill="none" ${S}/>
<path d="M64 16 L52 68 M64 16 L76 68" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" fill="none"/>`,
  },
  kutsu: {
    alt: "Chiếc giày thể thao nhìn nghiêng có dây buộc",
    concepts: ["靴", "giày"],
    bg: LIGHT,
    body: `<path d="M12 84 V54 Q12 46 20 46 H44 Q50 62 70 66 L104 74 Q118 78 118 90 V96 H12 Z" fill="${BLUE}" ${S}/>
<path d="M12 90 H118 V102 Q118 108 112 108 H18 Q12 108 12 102 Z" fill="${W}" ${S}/>
<path d="M50 58 l8 -6 M58 64 l8 -6 M66 68 l8 -6" stroke="${W}" stroke-width="4" stroke-linecap="round"/>
<path d="M12 70 H36" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  },
  mado: {
    alt: "Khung cửa sổ bốn ô nhìn ra bầu trời",
    concepts: ["窓", "cửa sổ"],
    bg: "#fde8e8",
    body: `<rect x="24" y="18" width="80" height="88" rx="4" fill="${SKY}" ${S}/>
<path d="M64 18 V106 M24 62 H104" stroke="${INK}" stroke-width="4"/>
<path d="M36 40 a8 8 0 0 1 8 -10 a10 10 0 0 1 18 2 a7 7 0 0 1 2 8 Z" fill="${W}"/>
<rect x="18" y="106" width="92" height="8" rx="2" fill="${BROWN}" ${S}/>
<path d="M24 18 Q40 40 24 74 M104 18 Q88 40 104 74" fill="none" stroke="${PINK}" stroke-width="5" stroke-linecap="round"/>`,
  },
  tsukue: {
    alt: "Bàn học bằng gỗ có ngăn kéo",
    concepts: ["机", "bàn học"],
    bg: LIGHT,
    body: `<rect x="12" y="44" width="104" height="14" rx="4" fill="${BROWN}" ${S}/>
<rect x="20" y="58" width="10" height="52" fill="${BROWN}" ${S}/>
<rect x="98" y="58" width="10" height="52" fill="${BROWN}" ${S}/>
<rect x="64" y="58" width="34" height="26" fill="#c98a5e" ${S}/>
<circle cx="81" cy="71" r="3" fill="${INK}"/>
<rect x="30" y="22" width="22" height="22" fill="${BLUE}" ${S}/>
<rect x="56" y="30" width="16" height="14" fill="${YELLOW}" ${S}/>`,
  },
  isu: {
    alt: "Chiếc ghế có lưng tựa và bốn chân",
    concepts: ["椅子", "ghế"],
    bg: LIGHT,
    body: `<rect x="34" y="14" width="46" height="46" rx="6" fill="${ORANGE}" ${S}/>
<rect x="28" y="58" width="72" height="14" rx="5" fill="${ORANGE}" ${S}/>
<path d="M36 72 L30 112 M92 72 L98 112 M50 72 V104 M78 72 V104" stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
  },
  denwa: {
    alt: "Chiếc điện thoại thông minh với màn hình sáng",
    concepts: ["電話", "điện thoại"],
    bg: LIGHT,
    body: `<rect x="34" y="10" width="60" height="108" rx="12" fill="${INK}" ${S}/>
<rect x="40" y="22" width="48" height="76" rx="4" fill="#8ec5ff"/>
<path d="M50 44 h28 M50 56 h20 M50 68 h24" stroke="${W}" stroke-width="4" stroke-linecap="round"/>
<circle cx="64" cy="108" r="4" fill="${GRAY}"/>
<path d="M104 30 q10 10 0 20 M112 24 q16 16 0 32" fill="none" stroke="${BLUE}" stroke-width="4" stroke-linecap="round"/>`,
  },
  umi: {
    alt: "Biển xanh có sóng, mặt trời và thuyền buồm",
    concepts: ["海", "biển"],
    bg: SKY,
    body: `<circle cx="100" cy="30" r="12" fill="${YELLOW}" ${S}/>
<rect x="0" y="62" width="128" height="66" fill="#5b9bf5"/>
<path d="M0 62 q16 -8 32 0 t32 0 t32 0 t32 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
<path d="M0 88 q12 -8 24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="${W}" stroke-width="4" stroke-linecap="round"/>
<path d="M44 58 V22 L72 58 Z" fill="${W}" ${S}/><path d="M36 60 H80 L74 70 H42 Z" fill="${RED}" ${S}/>`,
  },
  hoshi: {
    alt: "Ngôi sao vàng năm cánh trên bầu trời đêm",
    concepts: ["星", "ngôi sao"],
    bg: "#1e3a5f",
    body: `<path d="M64 14 L77 48 L113 50 L85 72 L95 108 L64 88 L33 108 L43 72 L15 50 L51 48 Z" fill="${YELLOW}" stroke="#fff6cc" stroke-width="3" stroke-linejoin="round"/>
<g fill="${W}"><circle cx="20" cy="22" r="2"/><circle cx="108" cy="20" r="2.5"/><circle cx="112" cy="102" r="2"/><circle cx="16" cy="100" r="2.5"/></g>`,
  },
  yuki: {
    alt: "Bông tuyết trắng trên nền xanh lạnh",
    concepts: ["雪", "tuyết"],
    bg: "#6aa9ff",
    body: `<g stroke="${W}" stroke-width="6" stroke-linecap="round" fill="none">
<path d="M64 14 V114 M21 39 L107 89 M21 89 L107 39"/>
<path d="M54 22 L64 32 L74 22 M54 106 L64 96 L74 106"/>
<path d="M22 56 L36 54 L32 40 M106 72 L92 74 L96 88"/>
<path d="M22 72 L36 74 L32 88 M106 56 L92 54 L96 40"/></g>`,
  },
};

export function iconSvg(key) {
  const i = icons[key];
  if (!i) throw new Error(`Không có icon ${key}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="${i.alt}">
<title>${i.alt}</title>
<rect width="128" height="128" rx="16" fill="${i.bg}"/>
${i.body}
</svg>
`;
}
