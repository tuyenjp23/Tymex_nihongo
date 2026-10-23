// Bài đọc/nghe và câu hỏi dạng JLPT — TỰ BIÊN SOẠN BỞI AI, chưa xác minh. KHÔNG phải đề thi chính thức.
// Câu hỏi tuple: [level, skill, topic, stem, options[], correctIndex, explanation_vi, optionExplanations|null, difficulty, ref|null, passageKey|null]
// ref = "vocabulary:<key>" | "kanji:<key>" | "grammar:<key>" (key của bản ghi tương ứng).

export const passages = [
  {
    key: "n5-morning",
    level: "N5",
    kind: "reading",
    title: "わたしの朝",
    body: "{私|わたし}は{毎朝|まいあさ}{七時|しちじ}に{起|お}きます。{朝|あさ}ご{飯|はん}を{食|た}べて、{八時|はちじ}に{家|いえ}を{出|で}ます。{電車|でんしゃ}で{会社|かいしゃ}へ{行|い}きます。",
    body_vi: "Mỗi sáng tôi dậy lúc 7 giờ. Ăn sáng xong, 8 giờ tôi ra khỏi nhà. Tôi đến công ty bằng tàu điện.",
    script: [],
  },
  {
    key: "n5-note",
    level: "N5",
    kind: "reading",
    title: "メモ",
    body: "{田中|たなか}さんへ\n{今日|きょう}は{雨|あめ}です。{傘|かさ}を{持|も}って{来|き}てください。\n{明日|あした}は{休|やす}みです。\n{山田|やまだ}",
    body_vi: "Gửi anh/chị Tanaka,\nHôm nay trời mưa. Hãy mang ô đến nhé.\nNgày mai được nghỉ.\nYamada",
    script: [],
  },
  {
    key: "n5-listen-shop",
    level: "N5",
    kind: "listening",
    title: "みせで",
    body: "",
    body_vi: "",
    script: [
      { speaker: "店員", text: "いらっしゃいませ。", vi: "Xin chào quý khách." },
      { speaker: "客", text: "すみません、りんごはいくらですか。", vi: "Xin lỗi, táo giá bao nhiêu ạ?" },
      { speaker: "店員", text: "{一|ひと}つ{百円|ひゃくえん}です。", vi: "Một quả 100 yên ạ." },
      { speaker: "客", text: "じゃあ、{三|みっ}つください。", vi: "Vậy cho tôi 3 quả." },
    ],
  },
  {
    key: "n5-listen-plan",
    level: "N5",
    kind: "listening",
    title: "にちようびの よてい",
    body: "",
    body_vi: "",
    script: [
      { speaker: "山田", text: "{田中|たなか}さん、{日曜日|にちようび}は{何|なに}をしますか。", vi: "Anh Tanaka, Chủ nhật anh làm gì?" },
      { speaker: "田中", text: "{友達|ともだち}と{映画|えいが}を{見|み}に{行|い}きます。", vi: "Tôi đi xem phim với bạn." },
      { speaker: "山田", text: "いいですね。{何時|なんじ}からですか。", vi: "Hay quá. Từ mấy giờ vậy?" },
      { speaker: "田中", text: "{午後|ごご}{二時|にじ}からです。", vi: "Từ 2 giờ chiều." },
    ],
  },
];

export const questions = [
  // ───────────── N5 · Chữ Hán (cách đọc) ─────────────
  ["N5", "kanji", "reading", "「山」はひらがなでどう書きますか。", ["やま", "かわ", "うみ", "そら"], 0, "山 đọc là やま (núi).", null, 1, "kanji:san"],
  ["N5", "kanji", "reading", "「川」はひらがなでどう書きますか。", ["かわ", "やま", "みず", "あめ"], 0, "川 đọc là かわ (sông).", null, 1, "kanji:sen"],
  ["N5", "kanji", "reading", "「水」はひらがなでどう書きますか。", ["みず", "ひ", "き", "つき"], 0, "水 đọc là みず (nước).", null, 1, "kanji:sui"],
  ["N5", "kanji", "reading", "「火曜日」はひらがなでどう書きますか。", ["かようび", "げつようび", "すいようび", "もくようび"], 0, "火 = か (hỏa) → 火曜日 là thứ Ba.", ["Đây là cách đọc đúng: thứ Ba.", "月曜日 = げつようび (thứ Hai).", "水曜日 = すいようび (thứ Tư).", "木曜日 = もくようび (thứ Năm)."], 1, "kanji:ka"],
  ["N5", "kanji", "reading", "「電車」はひらがなでどう書きますか。", ["でんしゃ", "でんくるま", "てんしゃ", "でんじゃ"], 0, "電 = でん, 車 = しゃ → でんしゃ (tàu điện).", null, 1, "vocabulary:densha"],
  ["N5", "kanji", "reading", "「学校」はひらがなでどう書きますか。", ["がっこう", "がくこう", "がっこ", "がくごう"], 0, "学校 đọc là がっこう (có âm ngắt っ).", null, 2, "vocabulary:gakkou"],
  ["N5", "kanji", "reading", "「先生」はひらがなでどう書きますか。", ["せんせい", "せいせん", "さきなま", "せんしょう"], 0, "先生 đọc là せんせい (thầy/cô giáo).", null, 1, "vocabulary:sensei"],
  ["N5", "kanji", "reading", "「毎日」はひらがなでどう書きますか。", ["まいにち", "まいひ", "まいじつ", "ごとにち"], 0, "毎日 đọc là まいにち (mỗi ngày).", null, 1, "vocabulary:mainichi"],
  ["N5", "kanji", "reading", "「友達」はひらがなでどう書きますか。", ["ともだち", "ゆうだち", "ともたち", "ともだつ"], 0, "友達 đọc là ともだち (bạn bè).", ["Đây là cách đọc đúng.", "ゆうだち (夕立) nghĩa là mưa rào buổi chiều — không phải 友達.", "Dạng này sai: đuôi là だち (có dấu).", "Không có từ này."], 2, "vocabulary:tomodachi"],
  ["N5", "kanji", "reading", "「左」はひらがなでどう書きますか。", ["ひだり", "みぎ", "うえ", "した"], 0, "左 đọc là ひだり (bên trái).", null, 1, "kanji:sa"],
  // ───────────── N5 · Chữ Hán (cách viết) ─────────────
  ["N5", "kanji", "writing", "「みず」を漢字で書くと、どれですか。", ["水", "木", "火", "土"], 0, "水 = みず (nước). 木 = き, 火 = ひ, 土 = つち.", null, 1, "kanji:sui"],
  ["N5", "kanji", "writing", "「やま」を漢字で書くと、どれですか。", ["山", "川", "田", "木"], 0, "山 = やま. 川 = かわ, 田 = た (ruộng), 木 = き.", null, 1, "kanji:san"],
  ["N5", "kanji", "writing", "「がっこう」を漢字で書くと、どれですか。", ["学校", "字校", "学枚", "字枚"], 0, "学校: 学 (học) + 校 (trường). 字 và 学 hay bị nhầm; 校 và 枚 cũng dễ nhầm.", null, 2, "vocabulary:gakkou"],
  ["N5", "kanji", "writing", "「でんしゃ」を漢字で書くと、どれですか。", ["電車", "雷車", "電事", "雷事"], 0, "電車: 電 (điện) + 車 (xe). 雷 là sấm (かみなり); 事 là việc (こと).", null, 2, "vocabulary:densha"],
  // ───────────── N5 · Từ vựng ─────────────
  ["N5", "vocabulary", "context", "{私|わたし}は{毎朝|まいあさ}（　）を{飲|の}みます。", ["{お茶|おちゃ}", "{本|ほん}", "{靴|くつ}", "{窓|まど}"], 0, "Chỉ có お茶 (trà) mới \"uống\" (飲みます) được.", ["Trà — uống được.", "Sách — đọc chứ không uống.", "Giày — đi chứ không uống.", "Cửa sổ — mở chứ không uống."], 1, "vocabulary:ocha"],
  ["N5", "vocabulary", "context", "（　）で{電車|でんしゃ}に{乗|の}ります。", ["{駅|えき}", "{家|いえ}", "{窓|まど}", "{机|つくえ}"], 0, "Lên tàu điện ở ga (駅).", null, 1, "vocabulary:eki"],
  ["N5", "vocabulary", "context", "{雨|あめ}ですから、（　）を{持|も}って{行|い}きます。", ["{傘|かさ}", "{靴|くつ}", "{時計|とけい}", "{窓|まど}"], 0, "Trời mưa nên mang ô (傘).", null, 1, "vocabulary:kasa"],
  ["N5", "vocabulary", "context", "（　）を{見|み}ると、{今|いま}は{三時|さんじ}です。", ["{時計|とけい}", "{傘|かさ}", "{机|つくえ}", "{犬|いぬ}"], 0, "Xem đồng hồ (時計) để biết giờ.", null, 1, "vocabulary:tokei"],
  ["N5", "vocabulary", "antonym", "「{安|やす}い」の{反対|はんたい}は{何|なん}ですか。", ["{高|たか}い", "{小|ちい}さい", "{新|あたら}しい", "{古|ふる}い"], 0, "Đối nghĩa với 安い (rẻ) là 高い (đắt).", ["Đúng — 高い cũng có nghĩa là đắt.", "小さい (nhỏ) đối nghĩa với 大きい.", "新しい (mới) đối nghĩa với 古い.", "古い (cũ) đối nghĩa với 新しい."], 2, "vocabulary:yasui"],
  ["N5", "vocabulary", "antonym", "「{大|おお}きい」の{反対|はんたい}は{何|なん}ですか。", ["{小|ちい}さい", "{古|ふる}い", "{安|やす}い", "{新|あたら}しい"], 0, "Đối nghĩa với 大きい (to) là 小さい (nhỏ).", null, 1, "vocabulary:ookii"],
  // ───────────── N5 · Ngữ pháp ─────────────
  ["N5", "grammar", "particle", "{私|わたし}は{学生|がくせい}（　）。", ["です", "ます", "が", "を"], 0, "Câu danh từ lịch sự kết thúc bằng です.", ["Đúng.", "ます đi với động từ, không đi với danh từ.", "が là trợ từ, không đứng cuối câu như thế.", "を là trợ từ tân ngữ."], 1, "grammar:wa-desu"],
  ["N5", "grammar", "particle", "パン（　）{食|た}べます。", ["を", "が", "に", "で"], 0, "Tân ngữ của 食べる dùng trợ từ を.", null, 1, "grammar:o-particle"],
  ["N5", "grammar", "particle", "{学校|がっこう}（　）{行|い}きます。", ["に", "を", "が", "で"], 0, "Đích đến của 行く dùng に (hoặc へ).", ["Đúng: chỉ đích đến.", "を không dùng để chỉ đích đến ở mẫu câu này.", "が không dùng sau địa điểm đích.", "で chỉ nơi hành động diễn ra, không phải đích đến."], 1, "grammar:ni-particle"],
  ["N5", "grammar", "particle", "{私|わたし}は{友達|ともだち}（　）{映画|えいが}を{見|み}ます。", ["と", "を", "が", "で"], 0, "と = cùng với (友達と: cùng với bạn).", null, 2, null],
  ["N5", "grammar", "existence", "{机|つくえ}の{上|うえ}に{本|ほん}（　）あります。", ["が", "を", "に", "と"], 0, "Câu tồn tại: 場所に N が あります.", null, 1, "grammar:ga-arimasu"],
  ["N5", "grammar", "existence", "{犬|いぬ}は{庭|にわ}（　）います。", ["に", "を", "が", "と"], 0, "Nơi tồn tại của người/động vật dùng に: 庭にいます.", null, 1, "grammar:ga-arimasu"],
  ["N5", "grammar", "tai", "{水|みず}が{飲|の}み（　）です。", ["たい", "ます", "ない", "て"], 0, "Bỏ ます + たい + です = muốn uống: 飲みたいです.", ["Đúng.", "飲みますです — sai ngữ pháp.", "飲みないです — sai; phủ định phải là 飲みたくない.", "飲みてです — sai."], 1, "grammar:tai-desu"],
  ["N5", "grammar", "invite", "{友達|ともだち}を{誘|さそ}うとき、どう{言|い}いますか。", ["いっしょに{食|た}べませんか。", "いっしょに{食|た}べましたか。", "いっしょに{食|た}べません。", "いっしょに{食|た}べていません。"], 0, "Mời/rủ ai làm gì cùng nhau: 〜ませんか.", ["Đúng — lời mời lịch sự.", "Đây là câu hỏi \"đã ăn chưa\".", "Đây là câu phủ định (không ăn).", "Đây là \"đang không ăn / chưa ăn\"."], 2, "grammar:masen-ka"],
  ["N5", "grammar", "request", "ここに{名前|なまえ}を{書|か}い（　）ください。", ["て", "ます", "た", "ない"], 0, "Nhờ làm gì: thể て + ください.", null, 1, "grammar:te-kudasai"],
  ["N5", "grammar", "tense", "{昨日|きのう}、{映画|えいが}を{見|み}（　）。", ["ました", "ます", "ません", "ましょう"], 0, "\"Hôm qua\" → quá khứ: 見ました.", null, 1, null],
  ["N5", "grammar", "adjective", "この{靴|くつ}は（　）ありません。", ["{高|たか}く", "{高|たか}い", "{高|たか}さ", "{高|たか}で"], 0, "Phủ định của tính từ い: bỏ い + くありません (高くありません).", null, 2, null],
  // ───────────── N5 · Đọc hiểu ─────────────
  ["N5", "reading", "passage", "この{人|ひと}は{何時|なんじ}に{家|いえ}を{出|で}ますか。", ["{七時|しちじ}", "{八時|はちじ}", "{九時|くじ}", "{十時|じゅうじ}"], 1, "Bài đọc: 八時に家を出ます (8 giờ ra khỏi nhà). 7 giờ là lúc dậy.", ["Đây là lúc dậy (起きます).", "Đúng: 八時に家を出ます.", "Bài đọc không nhắc 9 giờ.", "Bài đọc không nhắc 10 giờ."], 1, null, "n5-morning"],
  ["N5", "reading", "passage", "この{人|ひと}はどうやって{会社|かいしゃ}へ{行|い}きますか。", ["{車|くるま}", "{電車|でんしゃ}", "バス", "{自転車|じてんしゃ}"], 1, "Bài đọc: 電車で会社へ行きます (đi bằng tàu điện).", null, 1, null, "n5-morning"],
  ["N5", "reading", "passage", "{田中|たなか}さんは{何|なに}を{持|も}って{来|き}ますか。", ["{傘|かさ}", "{本|ほん}", "{靴|くつ}", "{時計|とけい}"], 0, "Ghi chú viết: 傘を持って来てください (hãy mang ô).", null, 1, null, "n5-note"],
  ["N5", "reading", "passage", "{明日|あした}はどうですか。", ["{休|やす}みです", "{仕事|しごと}です", "{雨|あめ}です", "{会議|かいぎ}です"], 0, "Ghi chú viết: 明日は休みです (ngày mai nghỉ). Hôm nay mới là ngày mưa.", ["Đúng.", "Ghi chú không nói là có việc.", "Trời mưa là hôm nay (今日は雨です), không phải ngày mai.", "Ghi chú không nhắc cuộc họp."], 2, null, "n5-note"],
  // ───────────── N5 · Nghe hiểu ─────────────
  ["N5", "listening", "passage", "お{客|きゃく}さんはりんごをいくつ{買|か}いますか。", ["{一|ひと}つ", "{二|ふた}つ", "{三|みっ}つ", "{四|よっ}つ"], 2, "Khách nói: 三つください (cho tôi 3 quả).", null, 1, null, "n5-listen-shop"],
  ["N5", "listening", "passage", "りんご{一|ひと}つはいくらですか。", ["{五十円|ごじゅうえん}", "{百円|ひゃくえん}", "{二百円|にひゃくえん}", "{三百円|さんびゃくえん}"], 1, "Nhân viên nói: 一つ百円です (một quả 100 yên).", ["Số tiền này không xuất hiện trong bài.", "Đúng: 100 yên.", "Đừng nhầm với 2 quả (mỗi quả 100 yên).", "300 yên là tổng 3 quả — không phải giá một quả."], 2, null, "n5-listen-shop"],
  ["N5", "listening", "passage", "{田中|たなか}さんは{日曜日|にちようび}に{何|なに}をしますか。", ["{映画|えいが}を{見|み}に{行|い}きます", "{本|ほん}を{読|よ}みます", "{勉強|べんきょう}します", "{友達|ともだち}の{家|いえ}に{行|い}きます"], 0, "Tanaka nói: 友達と映画を見に行きます.", ["Đúng.", "Không được nhắc đến.", "Không được nhắc đến.", "Đi với bạn nhưng là đi xem phim, không phải đến nhà bạn."], 1, null, "n5-listen-plan"],
  ["N5", "listening", "passage", "{映画|えいが}は{何時|なんじ}からですか。", ["{午後|ごご}{一時|いちじ}", "{午後|ごご}{二時|にじ}", "{午後|ごご}{三時|さんじ}", "{午前|ごぜん}{二時|にじ}"], 1, "Tanaka nói: 午後二時からです (từ 2 giờ chiều).", null, 1, null, "n5-listen-plan"],

  // ───────────── N4 ─────────────
  ["N4", "vocabulary", "reading", "「会議」はひらがなでどう書きますか。", ["かいぎ", "かいき", "がいぎ", "かいごう"], 0, "会議 đọc là かいぎ (cuộc họp).", null, 1, "vocabulary:kaigi"],
  ["N4", "vocabulary", "reading", "「準備」はひらがなでどう書きますか。", ["じゅんび", "しゅんび", "じゅんぴ", "じゅうび"], 0, "準備 đọc là じゅんび (chuẩn bị).", null, 2, "vocabulary:junbi"],
  ["N4", "vocabulary", "reading", "「連絡」はひらがなでどう書きますか。", ["れんらく", "れんろく", "れんらき", "れんらっく"], 0, "連絡 đọc là れんらく (liên lạc).", null, 2, "vocabulary:renraku"],
  ["N4", "grammar", "nagara", "{音楽|おんがく}を{聞|き}き（　）{勉強|べんきょう}します。", ["ながら", "たり", "ので", "ように"], 0, "Hai hành động đồng thời: V（ます語幹）+ ながら.", null, 1, "grammar:nagara"],
  ["N4", "grammar", "experience", "{日本|にほん}へ{行|い}った（　）があります。", ["こと", "もの", "ため", "ところ"], 0, "Kinh nghiệm: V（た形）+ ことがあります.", null, 1, "grammar:koto-ga-aru"],
  ["N4", "grammar", "reason", "{雨|あめ}が{降|ふ}っている（　）、{出|で}かけません。", ["ので", "のに", "ながら", "ても"], 0, "Nêu lý do: ので (vì trời mưa nên không ra ngoài).", ["Đúng.", "のに diễn tả \"mặc dù\" — mâu thuẫn với vế sau.", "ながら diễn tả đồng thời.", "ても diễn tả \"dù cho\" — không hợp nghĩa."], 2, "grammar:node"],

  // ───────────── N3 ─────────────
  ["N3", "vocabulary", "reading", "「経験」はひらがなでどう書きますか。", ["けいけん", "けいげん", "きょうけん", "げいけん"], 0, "経験 đọc là けいけん (kinh nghiệm).", null, 2, "vocabulary:keiken"],
  ["N3", "vocabulary", "reading", "「責任」はひらがなでどう書きますか。", ["せきにん", "しゃくにん", "せきじん", "せつにん"], 0, "責任 đọc là せきにん (trách nhiệm).", null, 2, "vocabulary:sekinin"],
  ["N3", "vocabulary", "reading", "「約束」はひらがなでどう書きますか。", ["やくそく", "よくそく", "やくぞく", "やくしょく"], 0, "約束 đọc là やくそく (lời hứa).", null, 2, "vocabulary:yakusoku"],
  ["N3", "grammar", "purpose", "{日本語|にほんご}が{話|はな}せる（　）、{毎日|まいにち}{練習|れんしゅう}しています。", ["ように", "ために", "ばかり", "ながら"], 0, "Với thể khả năng (話せる), mục đích dùng ように; ために thường đi với động từ chủ ý.", null, 2, "grammar:you-ni"],

  // ───────────── N2 ─────────────
  ["N2", "vocabulary", "reading", "「検討」はひらがなでどう書きますか。", ["けんとう", "けんどう", "げんとう", "けんしょう"], 0, "検討 đọc là けんとう (xem xét).", null, 2, "vocabulary:kentou"],
  ["N2", "vocabulary", "reading", "「納期」はひらがなでどう書きますか。", ["のうき", "なっき", "のうぎ", "おさめき"], 0, "納期 đọc là のうき (thời hạn giao hàng): 納 đọc ノウ ở đây.", ["Đúng.", "なっ- là cách đọc của 納 trong 納得 (なっとく), không phải trong 納期.", "期 đọc き (không có dấu).", "Đây là đọc kun (おさめる) — không dùng trong từ ghép này."], 3, "vocabulary:nouki"],
  ["N2", "grammar", "obligation", "{明日|あした}は{大切|たいせつ}な{会議|かいぎ}があるので、{休|やす}む（　）にはいかない。", ["わけ", "もの", "はず", "こと"], 0, "V辞書形 + わけにはいかない: không thể làm vì lý do hoàn cảnh.", null, 3, "grammar:wake-ni-wa-ikanai"],

  // ───────────── N1 ─────────────
  ["N1", "vocabulary", "reading", "「把握」はひらがなでどう書きますか。", ["はあく", "はわく", "はにぎ", "はつく"], 0, "把握 đọc là はあく (nắm bắt).", null, 3, "vocabulary:haaku"],
  ["N1", "vocabulary", "reading", "「懸念」はひらがなでどう書きますか。", ["けねん", "けんねん", "けいねん", "げんねん"], 0, "懸念 đọc là けねん: 懸 đọc ケ trong từ này (khác với 懸命 đọc けんめい).", null, 3, "vocabulary:kenen"],
  ["N1", "grammar", "obligation", "{雨|あめ}が{降|ふ}ってきたので、{試合|しあい}を{中止|ちゅうし}せ（　）を{得|え}なかった。", ["ざる", "ない", "ず", "ぬ"], 0, "V ない形（ない bỏ）+ ざるを得ない; する → せざるを得ない.", null, 3, "grammar:zaru-wo-enai"],
];
