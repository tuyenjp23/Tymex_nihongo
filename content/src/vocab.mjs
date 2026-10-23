// Từ vựng seed. Tuple: [key, level, word, reading, meaning_vi, pos, topic, exampleJa, exampleVi, imageKey|null, note?]
// Cấp độ là GỢI Ý theo cách phân loại phổ biến (JLPT không công bố danh sách chính thức).
// exampleJa dùng chú âm {漢字|かんじ}.
export const vocab = [
  // ── Thiên nhiên ──
  ["yama", "N5", "山", "やま", "núi", "danh từ", "nature", "{山|やま}に{登|のぼ}る。", "Leo núi.", "yama"],
  ["kawa", "N5", "川", "かわ", "sông", "danh từ", "nature", "{川|かわ}で{泳|およ}ぐ。", "Bơi ở sông.", "kawa"],
  ["ki", "N5", "木", "き", "cây", "danh từ", "nature", "{庭|にわ}に{木|き}がある。", "Trong vườn có cây.", "ki"],
  ["hana", "N5", "花", "はな", "hoa", "danh từ", "nature", "{花|はな}がきれいです。", "Hoa đẹp.", "hana"],
  ["sora", "N5", "空", "そら", "bầu trời", "danh từ", "nature", "{空|そら}が{青|あお}い。", "Bầu trời xanh.", "sora"],
  ["ame", "N5", "雨", "あめ", "mưa", "danh từ", "nature", "{今日|きょう}は{雨|あめ}です。", "Hôm nay trời mưa.", "ame"],
  ["tsuki", "N5", "月", "つき", "mặt trăng", "danh từ", "nature", "{月|つき}がきれいです。", "Trăng đẹp.", "tsuki", "月 còn có nghĩa là \"tháng\" (đọc がつ/げつ trong từ ghép)."],
  ["hi", "N5", "火", "ひ", "lửa", "danh từ", "nature", "{火|ひ}を{消|け}す。", "Dập lửa / tắt lửa.", "hi", "Đồng âm với 日 (ひ) — phân biệt nhờ chữ Hán."],
  ["mizu", "N5", "水", "みず", "nước", "danh từ", "nature", "{水|みず}を{飲|の}みます。", "Uống nước.", "mizu"],
  // ── Động vật ──
  ["inu", "N5", "犬", "いぬ", "chó", "danh từ", "animals", "{犬|いぬ}が{好|す}きです。", "Tôi thích chó.", "inu"],
  ["neko", "N5", "猫", "ねこ", "mèo", "danh từ", "animals", "{猫|ねこ}がいます。", "Có một con mèo.", "neko"],
  ["sakana", "N5", "魚", "さかな", "cá", "danh từ", "animals", "{魚|さかな}が{好|す}きです。", "Tôi thích cá.", "sakana"],
  // ── Cơ thể ──
  ["me", "N5", "目", "め", "mắt", "danh từ", "body", "{目|め}が{痛|いた}いです。", "Tôi bị đau mắt.", "me"],
  ["kuchi", "N5", "口", "くち", "miệng", "danh từ", "body", "{口|くち}を{開|あ}けてください。", "Hãy há miệng ra.", "kuchi"],
  ["te", "N5", "手", "て", "tay", "danh từ", "body", "{手|て}を{洗|あら}います。", "Rửa tay.", "te"],
  ["mimi", "N5", "耳", "みみ", "tai", "danh từ", "body", "{耳|みみ}がいいです。", "Thính tai (nghe tốt).", "mimi"],
  ["ashi", "N5", "足", "あし", "chân; bàn chân", "danh từ", "body", "{足|あし}が{長|なが}いです。", "Chân dài.", "ashi"],
  // ── Đồ ăn thức uống ──
  ["ringo", "N5", "りんご", "りんご", "táo", "danh từ", "food", "りんごを{食|た}べます。", "Ăn táo.", "ringo", "Thường viết bằng hiragana; chữ Hán 林檎 ít dùng."],
  ["ocha", "N5", "お茶", "おちゃ", "trà", "danh từ", "food", "{お茶|おちゃ}を{飲|の}みます。", "Uống trà.", "ocha"],
  ["pan", "N5", "パン", "パン", "bánh mì", "danh từ", "food", "パンを{食|た}べます。", "Ăn bánh mì.", "pan"],
  ["tamago", "N5", "卵", "たまご", "trứng", "danh từ", "food", "{卵|たまご}を{食|た}べます。", "Ăn trứng.", "tamago"],
  ["gohan", "N5", "ご飯", "ごはん", "cơm; bữa ăn", "danh từ", "food", "{朝|あさ}ご{飯|はん}を{食|た}べます。", "Ăn sáng.", "gohan", "Nghĩa gốc là cơm; cũng chỉ bữa ăn (朝ご飯 = bữa sáng)."],
  ["gyunyu", "N5", "牛乳", "ぎゅうにゅう", "sữa bò", "danh từ", "food", "{牛乳|ぎゅうにゅう}を{飲|の}みます。", "Uống sữa bò.", "gyunyu"],
  ["niku", "N5", "肉", "にく", "thịt", "danh từ", "food", "{肉|にく}を{焼|や}きます。", "Nướng thịt.", null],
  // ── Đồ vật & địa điểm ──
  ["hon", "N5", "本", "ほん", "sách", "danh từ", "things", "{本|ほん}を{読|よ}みます。", "Đọc sách.", "hon"],
  ["kuruma", "N5", "車", "くるま", "ô tô; xe", "danh từ", "things", "{車|くるま}で{行|い}きます。", "Đi bằng ô tô.", "kuruma"],
  ["densha", "N5", "電車", "でんしゃ", "tàu điện", "danh từ", "things", "{電車|でんしゃ}に{乗|の}ります。", "Đi tàu điện.", "densha"],
  ["ie", "N5", "家", "いえ", "nhà", "danh từ", "things", "{家|いえ}に{帰|かえ}ります。", "Về nhà.", "ie", "家 cũng đọc là うち (nhà mình, gia đình) tùy ngữ cảnh."],
  ["gakkou", "N5", "学校", "がっこう", "trường học", "danh từ", "places", "{学校|がっこう}へ{行|い}きます。", "Đi đến trường.", "gakkou"],
  ["tokei", "N5", "時計", "とけい", "đồng hồ", "danh từ", "things", "{時計|とけい}を{見|み}ます。", "Xem đồng hồ.", "tokei"],
  ["kasa", "N5", "傘", "かさ", "ô; dù", "danh từ", "things", "{傘|かさ}を{持|も}っていきます。", "Mang ô theo.", "kasa"],
  ["kutsu", "N5", "靴", "くつ", "giày", "danh từ", "things", "{靴|くつ}をはきます。", "Đi giày.", "kutsu"],
  ["mado", "N5", "窓", "まど", "cửa sổ", "danh từ", "things", "{窓|まど}を{開|あ}けます。", "Mở cửa sổ.", "mado"],
  ["tsukue", "N5", "机", "つくえ", "bàn học; bàn làm việc", "danh từ", "things", "{机|つくえ}の{上|うえ}に{本|ほん}があります。", "Trên bàn có sách.", "tsukue"],
  ["isu", "N5", "椅子", "いす", "ghế", "danh từ", "things", "{椅子|いす}に{座|すわ}ります。", "Ngồi xuống ghế.", "isu"],
  ["denwa", "N5", "電話", "でんわ", "điện thoại; cuộc gọi", "danh từ", "things", "{電話|でんわ}をかけます。", "Gọi điện thoại.", "denwa"],
  ["eki", "N5", "駅", "えき", "nhà ga", "danh từ", "places", "{駅|えき}で{友達|ともだち}に{会|あ}います。", "Gặp bạn ở ga.", null],
  // ── Con người ──
  ["watashi", "N5", "私", "わたし", "tôi", "đại từ", "people", "{私|わたし}は{学生|がくせい}です。", "Tôi là học sinh/sinh viên.", null],
  ["tomodachi", "N5", "友達", "ともだち", "bạn bè", "danh từ", "people", "{友達|ともだち}と{遊|あそ}びます。", "Chơi với bạn.", null],
  ["sensei", "N5", "先生", "せんせい", "thầy giáo; cô giáo", "danh từ", "people", "{先生|せんせい}は{優|やさ}しいです。", "Thầy/cô giáo hiền.", null],
  ["gakusei", "N5", "学生", "がくせい", "học sinh; sinh viên", "danh từ", "people", "{弟|おとうと}は{学生|がくせい}です。", "Em trai tôi là học sinh/sinh viên.", null],
  ["kodomo", "N5", "子供", "こども", "trẻ em", "danh từ", "people", "{子供|こども}が{公園|こうえん}で{遊|あそ}びます。", "Trẻ con chơi ở công viên.", null],
  ["haha", "N5", "母", "はは", "mẹ (của mình)", "danh từ", "people", "{母|はは}は{医者|いしゃ}です。", "Mẹ tôi là bác sĩ.", null, "Nói về mẹ của mình với người ngoài; mẹ người khác thường là お母さん."],
  ["chichi", "N5", "父", "ちち", "bố (của mình)", "danh từ", "people", "{父|ちち}は{会社員|かいしゃいん}です。", "Bố tôi là nhân viên công ty.", null, "Bố người khác thường là お父さん."],
  // ── Thời gian ──
  ["kyou", "N5", "今日", "きょう", "hôm nay", "danh từ", "time", "{今日|きょう}は{月曜日|げつようび}です。", "Hôm nay là thứ Hai.", null, "Cách đọc đặc biệt của 今日 (không phải こんにち trong từ này)."],
  ["ashita", "N5", "明日", "あした", "ngày mai", "danh từ", "time", "{明日|あした}は{休|やす}みです。", "Ngày mai được nghỉ.", null, "Cách đọc đặc biệt; trang trọng hơn có thể nói みょうにち."],
  ["kinou", "N5", "昨日", "きのう", "hôm qua", "danh từ", "time", "{昨日|きのう}、{映画|えいが}を{見|み}ました。", "Hôm qua tôi đã xem phim.", null],
  ["mainichi", "N5", "毎日", "まいにち", "mỗi ngày", "danh từ/phó từ", "time", "{毎日|まいにち}{日本語|にほんご}を{勉強|べんきょう}します。", "Ngày nào tôi cũng học tiếng Nhật.", null],
  ["jikan", "N5", "時間", "じかん", "thời gian; giờ", "danh từ", "time", "{時間|じかん}がありません。", "Tôi không có thời gian.", null],
  ["yasumi", "N5", "休み", "やすみ", "ngày nghỉ; sự nghỉ ngơi", "danh từ", "time", "{日曜日|にちようび}は{休|やす}みです。", "Chủ nhật là ngày nghỉ.", null],
  // ── Công việc & học tập ──
  ["shigoto", "N5", "仕事", "しごと", "công việc", "danh từ", "work", "{仕事|しごと}は{九時|くじ}からです。", "Công việc bắt đầu từ 9 giờ.", null],
  ["kaisha", "N5", "会社", "かいしゃ", "công ty", "danh từ", "work", "{会社|かいしゃ}で{働|はたら}きます。", "Làm việc ở công ty.", null],
  ["benkyou", "N5", "勉強", "べんきょう", "học tập (勉強する: học)", "danh từ/する", "work", "{図書館|としょかん}で{勉強|べんきょう}します。", "Học ở thư viện.", null],
  // ── Động từ ──
  ["taberu", "N5", "食べる", "たべる", "ăn", "động từ nhóm 2", "verbs", "{朝|あさ}ご{飯|はん}を{食|た}べます。", "Ăn sáng.", null],
  ["nomu", "N5", "飲む", "のむ", "uống", "động từ nhóm 1", "verbs", "{水|みず}を{飲|の}みます。", "Uống nước.", null],
  ["iku", "N5", "行く", "いく", "đi", "động từ nhóm 1", "verbs", "{学校|がっこう}へ{行|い}きます。", "Đi đến trường.", null, "Dạng て của 行く là 行って (ngoại lệ)."],
  ["kuru", "N5", "来る", "くる", "đến", "động từ bất quy tắc", "verbs", "{友達|ともだち}が{来|き}ます。", "Bạn tôi đến.", null],
  ["miru", "N5", "見る", "みる", "xem; nhìn", "động từ nhóm 2", "verbs", "{映画|えいが}を{見|み}ます。", "Xem phim.", null],
  ["kau", "N5", "買う", "かう", "mua", "động từ nhóm 1", "verbs", "{本|ほん}を{買|か}います。", "Mua sách.", null],
  // ── Tính từ ──
  ["ookii", "N5", "大きい", "おおきい", "to; lớn", "tính từ い", "adjectives", "{大|おお}きい{犬|いぬ}です。", "Đó là con chó to.", null],
  ["chiisai", "N5", "小さい", "ちいさい", "nhỏ", "tính từ い", "adjectives", "{小|ちい}さい{猫|ねこ}です。", "Đó là con mèo nhỏ.", null],
  ["takai", "N5", "高い", "たかい", "cao; đắt", "tính từ い", "adjectives", "{山|やま}が{高|たか}いです。", "Núi cao.", null, "Một từ hai nghĩa: 高い = cao / đắt (tùy ngữ cảnh: この本は高いです = quyển sách này đắt)."],
  ["yasui", "N5", "安い", "やすい", "rẻ", "tính từ い", "adjectives", "この{本|ほん}は{安|やす}いです。", "Quyển sách này rẻ.", null],
  ["atarashii", "N5", "新しい", "あたらしい", "mới", "tính từ い", "adjectives", "{新|あたら}しい{靴|くつ}を{買|か}いました。", "Tôi đã mua đôi giày mới.", null],
  ["furui", "N5", "古い", "ふるい", "cũ", "tính từ い", "adjectives", "{古|ふる}い{家|いえ}です。", "Đó là ngôi nhà cũ.", null],
  ["suki", "N5", "好き", "すき", "thích", "tính từ な", "adjectives", "{犬|いぬ}が{好|す}きです。", "Tôi thích chó.", null],

  // ───────── N4 (gợi ý) ─────────
  ["umi", "N4", "海", "うみ", "biển", "danh từ", "nature", "{夏|なつ}は{海|うみ}へ{行|い}きます。", "Mùa hè tôi đi biển.", "umi"],
  ["hoshi", "N4", "星", "ほし", "ngôi sao", "danh từ", "nature", "{夜|よる}、{星|ほし}が{見|み}えます。", "Ban đêm nhìn thấy sao.", "hoshi"],
  ["yuki", "N4", "雪", "ゆき", "tuyết", "danh từ", "nature", "{北海道|ほっかいどう}は{雪|ゆき}が{多|おお}いです。", "Hokkaido có nhiều tuyết.", "yuki"],
  ["kaigi", "N4", "会議", "かいぎ", "cuộc họp", "danh từ", "work", "{明日|あした}の{会議|かいぎ}は{十時|じゅうじ}からです。", "Cuộc họp ngày mai bắt đầu từ 10 giờ.", null],
  ["junbi", "N4", "準備", "じゅんび", "chuẩn bị", "danh từ/する", "work", "{会議|かいぎ}の{準備|じゅんび}をします。", "Chuẩn bị cho cuộc họp.", null],
  ["setsumei", "N4", "説明", "せつめい", "giải thích; thuyết minh", "danh từ/する", "work", "{先生|せんせい}が{文法|ぶんぽう}を{説明|せつめい}します。", "Thầy/cô giải thích ngữ pháp.", null],
  ["yotei", "N4", "予定", "よてい", "dự định; kế hoạch", "danh từ/する", "work", "{来週|らいしゅう}の{予定|よてい}を{教|おし}えてください。", "Hãy cho tôi biết lịch dự định tuần sau.", null],
  ["renraku", "N4", "連絡", "れんらく", "liên lạc", "danh từ/する", "work", "{後|あと}で{連絡|れんらく}します。", "Lát nữa tôi sẽ liên lạc.", null],
  ["tsugou", "N4", "都合", "つごう", "điều kiện thuận tiện; hoàn cảnh", "danh từ", "work", "{明日|あした}は{都合|つごう}が{悪|わる}いです。", "Ngày mai tôi không tiện.", null],
  ["byouin", "N4", "病院", "びょういん", "bệnh viện", "danh từ", "places", "{病院|びょういん}へ{行|い}きます。", "Đi bệnh viện.", null],
  ["oshieru", "N4", "教える", "おしえる", "dạy; chỉ cho biết", "động từ nhóm 2", "verbs", "{私|わたし}は{日本語|にほんご}を{教|おし}えます。", "Tôi dạy tiếng Nhật.", null],
  ["wasureru", "N4", "忘れる", "わすれる", "quên", "động từ nhóm 2", "verbs", "{傘|かさ}を{忘|わす}れました。", "Tôi đã quên ô.", null],

  // ───────── N3 (gợi ý) — từ trừu tượng: KHÔNG gán một hình duy nhất ─────────
  ["keiken", "N3", "経験", "けいけん", "kinh nghiệm; trải nghiệm", "danh từ/する", "abstract", "{日本|にほん}で{働|はたら}いた{経験|けいけん}があります。", "Tôi có kinh nghiệm làm việc ở Nhật.", null],
  ["sekinin", "N3", "責任", "せきにん", "trách nhiệm", "danh từ", "abstract", "この{仕事|しごと}は{私|わたし}の{責任|せきにん}です。", "Công việc này là trách nhiệm của tôi.", null],
  ["yakusoku", "N3", "約束", "やくそく", "lời hứa; cuộc hẹn", "danh từ/する", "abstract", "{友達|ともだち}と{約束|やくそく}があります。", "Tôi có hẹn với bạn.", null],
  ["soudan", "N3", "相談", "そうだん", "bàn bạc; xin ý kiến", "danh từ/する", "work", "{上司|じょうし}に{相談|そうだん}します。", "Tôi xin ý kiến cấp trên.", null],
  ["kakunin", "N3", "確認", "かくにん", "xác nhận; kiểm tra lại", "danh từ/する", "work", "メールを{確認|かくにん}してください。", "Hãy kiểm tra email.", null],
  ["houkoku", "N3", "報告", "ほうこく", "báo cáo", "danh từ/する", "work", "{課長|かちょう}に{報告|ほうこく}します。", "Tôi báo cáo với trưởng phòng.", null],
  ["sanka", "N3", "参加", "さんか", "tham gia", "danh từ/する", "work", "{会議|かいぎ}に{参加|さんか}します。", "Tôi tham dự cuộc họp.", null],

  // ───────── N2 (gợi ý) ─────────
  ["kentou", "N2", "検討", "けんとう", "xem xét; cân nhắc", "danh từ/する", "work", "{新|あたら}しい{案|あん}を{検討|けんとう}します。", "Xem xét phương án mới.", null],
  ["nouki", "N2", "納期", "のうき", "thời hạn giao hàng", "danh từ", "work", "{納期|のうき}に{間|ま}に{合|あ}わせます。", "Làm kịp thời hạn giao hàng.", null],
  ["taiou", "N2", "対応", "たいおう", "ứng phó; xử lý", "danh từ/する", "work", "{客|きゃく}からの{問|と}い{合|あ}わせに{対応|たいおう}します。", "Xử lý yêu cầu hỏi đáp của khách.", null],
  ["eikyou", "N2", "影響", "えいきょう", "ảnh hưởng", "danh từ/する", "abstract", "{雨|あめ}は{農業|のうぎょう}に{影響|えいきょう}します。", "Mưa ảnh hưởng đến nông nghiệp.", null],

  // ───────── N1 (gợi ý) ─────────
  ["haaku", "N1", "把握", "はあく", "nắm bắt; hiểu rõ", "danh từ/する", "abstract", "{状況|じょうきょう}を{把握|はあく}します。", "Nắm rõ tình hình.", null],
  ["kenen", "N1", "懸念", "けねん", "lo ngại", "danh từ/する", "abstract", "{品質|ひんしつ}に{懸念|けねん}があります。", "Có lo ngại về chất lượng.", null],
  ["mikomi", "N1", "見込み", "みこみ", "dự kiến; triển vọng", "danh từ", "work", "{来月|らいげつ}には{完成|かんせい}する{見込|みこ}みです。", "Dự kiến tháng sau sẽ hoàn thành.", null],
  ["todokooru", "N1", "滞る", "とどこおる", "đình trệ; chậm trễ", "động từ nhóm 1", "abstract", "{支払|しはら}いが{滞|とどこお}ります。", "Việc thanh toán bị chậm trễ.", null],
];

export const topicLabels = {
  nature: "Thiên nhiên",
  animals: "Động vật",
  body: "Cơ thể",
  food: "Đồ ăn thức uống",
  things: "Đồ vật",
  places: "Địa điểm",
  people: "Con người",
  time: "Thời gian",
  work: "Công việc & học tập",
  verbs: "Động từ",
  adjectives: "Tính từ",
  abstract: "Từ trừu tượng",
  life: "Đời sống",
};
