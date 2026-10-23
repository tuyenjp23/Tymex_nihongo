// Hội thoại seed — TỰ BIÊN SOẠN BỞI AI, chưa được người bản ngữ rà soát.
// Các nhận xét về mức lịch sự là NGUYÊN TẮC PHỔ BIẾN TRONG GIAO TIẾP CÔNG SỞ được dạy trong tiếng Nhật, không khẳng định là
// cách nói của "mọi người Nhật". "ナカシマ" là tên công ty của tổ chức sử dụng; các tên người/công ty khác là hư cấu.
const L = (speaker, ja, vi) => ({ speaker, ja, vi });
const O = (ja, vi, fit, feedback_vi, next = null) => ({ ja, vi, fit, feedback_vi, next });

export const conversations = [
  {
    key: "morning-greeting",
    category: "workplace",
    level_hint: "N5",
    title: "Chào buổi sáng ở công ty",
    context: "Chín giờ kém mười lăm sáng. Nguyễn (nhân viên mới) gặp đồng nghiệp Yamada ở văn phòng ナカシマ.",
    goal: "Chào hỏi lịch sự đầu giờ và xác nhận lịch họp trong ngày.",
    characters: [
      { name: "グエン", role: "Nhân viên mới" },
      { name: "山田", role: "Đồng nghiệp (làm lâu hơn)" },
    ],
    politeness: "polite",
    lines: [
      L("山田", "おはようございます。", "Chào buổi sáng."),
      L("グエン", "おはようございます。{今日|きょう}もよろしくお{願|ねが}いします。", "Chào buổi sáng. Hôm nay cũng mong anh/chị giúp đỡ."),
      L("山田", "こちらこそ、よろしくお{願|ねが}いします。{今日|きょう}は{九時|くじ}から{会議|かいぎ}です。", "Tôi cũng vậy, mong được giúp đỡ. Hôm nay có họp từ 9 giờ."),
      L("グエン", "はい、わかりました。{準備|じゅんび}します。", "Vâng, tôi hiểu rồi. Tôi sẽ chuẩn bị."),
    ],
    vocab_notes: [
      { term: "おはようございます", reading: "おはようございます", meaning_vi: "Chào buổi sáng (lịch sự). Với bạn bè thân có thể nói おはよう." },
      { term: "よろしくお願いします", reading: "よろしくおねがいします", meaning_vi: "Cụm xã giao: mong được giúp đỡ/nhờ cậy; dùng khi bắt đầu quan hệ hoặc nhờ việc." },
      { term: "会議", reading: "かいぎ", meaning_vi: "cuộc họp" },
      { term: "準備", reading: "じゅんび", meaning_vi: "chuẩn bị" },
    ],
    grammar_notes: [
      { pattern: "〜は〜からです", note_vi: "Chỉ thời điểm bắt đầu: 会議は九時からです (cuộc họp bắt đầu từ 9 giờ)." },
      { pattern: "こちらこそ", note_vi: "Đáp lại lời cảm ơn/lời chào: \"tôi mới là người nên nói vậy\"." },
    ],
    alternatives: [
      { ja: "おはようございます。{今日|きょう}も{一日|いちにち}{頑張|がんば}りましょう。", vi: "Chào buổi sáng. Hôm nay cũng cùng cố gắng nhé.", nuance_vi: "Thân thiện, thường dùng với đồng nghiệp cùng nhóm." },
      { ja: "おはよう！", vi: "Chào buổi sáng!", nuance_vi: "Thân mật; thường dành cho bạn bè/đồng nghiệp rất thân, ít dùng với cấp trên." },
    ],
    other_situations: [
      { situation_vi: "Bắt đầu làm việc cùng một đồng nghiệp mới", ja: "これからどうぞよろしくお{願|ねが}いします。", vi: "Từ nay mong được giúp đỡ." },
    ],
    drills: [
      { prompt_vi: "Chào đồng nghiệp lúc đầu giờ và nhờ giúp đỡ trong ngày", model_ja: "おはようございます。{今日|きょう}もよろしくお{願|ねが}いします。", hint_vi: "Bắt đầu bằng lời chào buổi sáng lịch sự." },
      { prompt_vi: "Nói \"Vâng, tôi sẽ chuẩn bị\" khi được báo có họp", model_ja: "はい、{準備|じゅんび}します。", hint_vi: "Dùng thể ます." },
    ],
    roleplay: [
      {
        id: "t1", npc_ja: "おはようございます。", npc_vi: "(Đồng nghiệp chào bạn lúc đầu giờ)",
        options: [
          O("おはようございます。{今日|きょう}もよろしくお{願|ねが}いします。", "Chào buổi sáng. Hôm nay cũng mong anh/chị giúp đỡ.", "best", "Lịch sự và phù hợp đầu giờ làm.", "t2"),
          O("おはよう。", "Chào.", "ok", "Hơi suồng sã nếu chưa thân hoặc người đối diện làm lâu hơn bạn.", "t2"),
          O("こんばんは。", "Chào buổi tối.", "poor", "Sai thời điểm: đây là buổi sáng.", "t2"),
        ],
      },
      {
        id: "t2", npc_ja: "{今日|きょう}は{九時|くじ}から{会議|かいぎ}です。", npc_vi: "Hôm nay có họp từ 9 giờ.",
        options: [
          O("はい、わかりました。{準備|じゅんび}します。", "Vâng, tôi hiểu. Tôi sẽ chuẩn bị.", "best", "Xác nhận đã hiểu và nêu rõ hành động tiếp theo.", null),
          O("ふうん。", "Ừm.", "poor", "Quá thờ ơ trong môi trường làm việc.", null),
          O("{会議|かいぎ}はいやです。", "Tôi không thích họp.", "poor", "Nói thẳng cảm xúc tiêu cực nghe thiếu chuyên nghiệp.", null),
        ],
      },
    ],
    references: [],
  },
  {
    key: "report-to-boss",
    category: "report-contact",
    level_hint: "N4",
    title: "Báo cáo ngắn với trưởng phòng",
    context: "Nguyễn cần báo cáo kết quả kiểm tra tài liệu cho 課長 (trưởng phòng) khi ông ấy đang ngồi ở bàn làm việc.",
    goal: "Xin phép ngắt lời lịch sự, báo cáo kết quả ngắn gọn và nêu thời hạn.",
    characters: [
      { name: "グエン", role: "Nhân viên (cấp dưới)" },
      { name: "課長", role: "Trưởng phòng (cấp trên)" },
    ],
    politeness: "keigo",
    lines: [
      L("グエン", "{課長|かちょう}、{今|いま}、よろしいでしょうか。", "Trưởng phòng, bây giờ có tiện không ạ?"),
      L("課長", "はい、どうぞ。", "Vâng, mời."),
      L("グエン", "{昨日|きのう}の{件|けん}ですが、{資料|しりょう}の{確認|かくにん}が{終|お}わりました。", "Về việc hôm qua, tôi đã kiểm tra xong tài liệu."),
      L("課長", "ありがとう。{問題|もんだい}はありましたか。", "Cảm ơn. Có vấn đề gì không?"),
      L("グエン", "いいえ、{特|とく}にありません。{明日|あした}までに{提出|ていしゅつ}します。", "Không, không có gì đặc biệt. Tôi sẽ nộp trước ngày mai."),
      L("課長", "わかりました。お{願|ねが}いします。", "Hiểu rồi. Nhờ cậu nhé."),
    ],
    vocab_notes: [
      { term: "よろしいでしょうか", reading: "よろしいでしょうか", meaning_vi: "Dạng lịch sự của いいですか — \"có được không/có tiện không ạ\"." },
      { term: "件", reading: "けん", meaning_vi: "việc/vấn đề (đã được nhắc tới trước đó)" },
      { term: "提出", reading: "ていしゅつ", meaning_vi: "nộp (tài liệu, báo cáo)" },
      { term: "特に", reading: "とくに", meaning_vi: "đặc biệt; (đi với phủ định) không có gì đặc biệt" },
    ],
    grammar_notes: [
      { pattern: "〜ですが（前置き）", note_vi: "Dùng が như lời dẫn nhập: 昨日の件ですが… (về việc hôm qua thì…), giúp mở đầu báo cáo nhẹ nhàng." },
      { pattern: "〜までに", note_vi: "\"Trước/chậm nhất vào\" một mốc thời gian (hạn chót). Khác với まで (liên tục cho đến)." },
    ],
    alternatives: [
      { ja: "ご{報告|ほうこく}があります。", vi: "Tôi có việc muốn báo cáo.", nuance_vi: "Rõ mục đích ngay từ đầu; thích hợp khi vấn đề quan trọng." },
      { ja: "お{時間|じかん}、よろしいですか。", vi: "Anh/chị có thời gian không ạ?", nuance_vi: "Cách hỏi thời gian rảnh, ngắn gọn." },
    ],
    other_situations: [
      { situation_vi: "Báo cáo kết quả sau cuộc họp", ja: "{会議|かいぎ}の{結果|けっか}についてご{報告|ほうこく}します。", vi: "Tôi xin báo cáo về kết quả cuộc họp." },
    ],
    drills: [
      { prompt_vi: "Hỏi cấp trên xem có tiện nói chuyện không", model_ja: "{今|いま}、よろしいでしょうか。", hint_vi: "Dùng よろしい thay cho いい." },
      { prompt_vi: "Nói sẽ nộp tài liệu trước ngày mai", model_ja: "{明日|あした}までに{提出|ていしゅつ}します。", hint_vi: "Dùng までに (hạn chót)." },
    ],
    roleplay: [
      {
        id: "t1", npc_ja: "はい、どうぞ。", npc_vi: "(Trưởng phòng cho phép bạn nói)",
        options: [
          O("{昨日|きのう}の{件|けん}ですが、{資料|しりょう}の{確認|かくにん}が{終|お}わりました。", "Về việc hôm qua, tôi đã kiểm tra xong tài liệu.", "best", "Nêu chủ đề rồi báo kết quả: ngắn gọn, rõ ràng.", "t2"),
          O("あのう、えーと、たぶん{終|お}わりました。", "Ừm… chắc là xong rồi.", "poor", "Mơ hồ khiến cấp trên không biết trạng thái thực sự; nên nêu rõ kết quả.", "t2"),
        ],
      },
      {
        id: "t2", npc_ja: "ありがとう。{問題|もんだい}はありましたか。", npc_vi: "Cảm ơn. Có vấn đề gì không?",
        options: [
          O("いいえ、{特|とく}にありません。{明日|あした}までに{提出|ていしゅつ}します。", "Không có gì đặc biệt. Tôi sẽ nộp trước ngày mai.", "best", "Trả lời rõ + nêu thời hạn nộp.", null),
          O("{大丈夫|だいじょうぶ}です。", "Ổn ạ.", "ok", "Chấp nhận được, nhưng nên bổ sung bước tiếp theo/thời hạn.", null),
        ],
      },
    ],
    references: [],
  },
  {
    key: "phone-nakashima",
    category: "phone",
    level_hint: "N3",
    title: "Nghe điện thoại từ khách hàng (ナカシマ)",
    context: "Nguyễn nghe điện thoại tại ナカシマ. Người gọi là Sato của công ty ABC (hư cấu) muốn gặp Yamada, trưởng phòng đang không có ở chỗ.",
    goal: "Nhận cuộc gọi lịch sự, xử lý khi người cần gặp vắng mặt và hẹn gọi lại.",
    characters: [
      { name: "グエン", role: "Nhân viên ナカシマ (người nghe máy)" },
      { name: "佐藤", role: "Khách hàng ở công ty khác" },
    ],
    politeness: "keigo",
    lines: [
      L("グエン", "はい、ナカシマでございます。", "Vâng, ナカシマ xin nghe."),
      L("佐藤", "{株式会社|かぶしきがいしゃ}ABCの{佐藤|さとう}と{申|もう}します。いつもお{世話|せわ}になっております。", "Tôi là Sato của công ty ABC. Xin cảm ơn anh/chị đã luôn giúp đỡ."),
      L("グエン", "こちらこそ、お{世話|せわ}になっております。", "Chúng tôi cũng xin cảm ơn."),
      L("佐藤", "{山田課長|やまだかちょう}はいらっしゃいますか。", "Trưởng phòng Yamada có ở đó không ạ?"),
      L("グエン", "{申|もう}し{訳|わけ}ございません。{山田|やまだ}はただいま{席|せき}を{外|はず}しております。", "Xin lỗi, Yamada hiện đang không có ở chỗ."),
      L("グエン", "{戻|もど}りましたら、{折|お}り{返|かえ}しお{電話|でんわ}いたしましょうか。", "Khi anh ấy quay lại, tôi gọi lại cho anh/chị nhé?"),
      L("佐藤", "はい、お{願|ねが}いします。", "Vâng, nhờ anh/chị."),
      L("グエン", "{佐藤様|さとうさま}ですね。かしこまりました。", "Anh Sato đúng không ạ. Tôi đã rõ."),
    ],
    vocab_notes: [
      { term: "ございます", reading: "ございます", meaning_vi: "Dạng rất lịch sự của あります/です: ナカシマでございます." },
      { term: "と申します", reading: "ともうします", meaning_vi: "Khiêm nhường ngữ của と言います — dùng khi tự giới thiệu." },
      { term: "いらっしゃる", reading: "いらっしゃる", meaning_vi: "Tôn kính ngữ của いる/行く/来る (người nghe/người thứ ba được tôn trọng)." },
      { term: "席を外す", reading: "せきをはずす", meaning_vi: "rời khỏi chỗ ngồi (tạm vắng)" },
      { term: "折り返し", reading: "おりかえし", meaning_vi: "gọi lại/trả lời lại ngay khi có thể" },
    ],
    grammar_notes: [
      { pattern: "内と外（うち・そと）", note_vi: "Khi nói chuyện với người NGOÀI công ty, thường gọi người trong công ty bằng họ trần (山田) chứ không thêm さん/課長 — đây là quy tắc phổ biến trong giao tiếp công sở, thể hiện sự khiêm nhường về phía mình." },
      { pattern: "〜いたします", note_vi: "Khiêm nhường ngữ của します: お電話いたします (tôi xin gọi điện)." },
      { pattern: "〜ましょうか", note_vi: "Đề nghị làm gì giúp người khác: 折り返しお電話いたしましょうか." },
    ],
    alternatives: [
      { ja: "ただいま{電話|でんわ}に{出|で}られません。", vi: "Hiện chưa thể nghe máy.", nuance_vi: "Dùng khi người đó đang bận (họp, tiếp khách)." },
      { ja: "{少々|しょうしょう}お{待|ま}ちください。", vi: "Xin đợi một chút ạ.", nuance_vi: "Dùng khi định chuyển máy hoặc kiểm tra thông tin." },
    ],
    other_situations: [
      { situation_vi: "Khi gọi cho công ty khác và tự giới thiệu", ja: "ナカシマのグエンと{申|もう}します。", vi: "Tôi là Nguyễn của ナカシマ." },
    ],
    drills: [
      { prompt_vi: "Nhấc máy và xưng tên công ty ナカシマ", model_ja: "はい、ナカシマでございます。", hint_vi: "Dùng ございます." },
      { prompt_vi: "Nói trưởng phòng Yamada đang không có ở chỗ (nói với khách)", model_ja: "{山田|やまだ}はただいま{席|せき}を{外|はず}しております。", hint_vi: "Gọi 山田 không kèm chức danh khi nói với người ngoài." },
    ],
    roleplay: [
      {
        id: "t1", npc_ja: "{山田課長|やまだかちょう}はいらっしゃいますか。", npc_vi: "Trưởng phòng Yamada có ở đó không ạ? (Yamada đang vắng)",
        options: [
          O("{申|もう}し{訳|わけ}ございません。{山田|やまだ}はただいま{席|せき}を{外|はず}しております。", "Xin lỗi, Yamada hiện đang không có ở chỗ.", "best", "Xin lỗi + gọi người trong công ty bằng họ trần + lý do vắng ngắn gọn.", "t2"),
          O("{山田課長|やまだかちょう}はいません。", "Trưởng phòng Yamada không có.", "poor", "Gắn chức danh cho người nhà với khách và cách nói quá cụt, thiếu lịch sự.", "t2"),
        ],
      },
      {
        id: "t2", npc_ja: "では、また{後|あと}でかけ{直|なお}します。", npc_vi: "Vậy lát nữa tôi sẽ gọi lại.",
        options: [
          O("{恐|おそ}れ{入|い}ります。{戻|もど}りましたら、こちらからお{電話|でんわ}いたしましょうか。", "Xin lỗi vì sự bất tiện. Khi anh ấy quay lại, chúng tôi gọi lại nhé?", "best", "Chủ động đề nghị gọi lại giúp khách đỡ mất công.", null),
          O("はい、わかりました。", "Vâng, tôi hiểu rồi.", "ok", "Không sai nhưng thiếu chủ động và lời xin lỗi.", null),
        ],
      },
    ],
    references: [],
  },
  {
    key: "request-colleague",
    category: "request-apology",
    level_hint: "N4",
    title: "Nhờ đồng nghiệp kiểm tra giúp tài liệu",
    context: "Nguyễn vừa viết xong một tài liệu bằng tiếng Nhật và muốn nhờ Yamada (đồng nghiệp lâu năm) kiểm tra giúp.",
    goal: "Mở đầu lời nhờ một cách nhẹ nhàng, nêu rõ việc nhờ và hạn chót, cảm ơn.",
    characters: [
      { name: "グエン", role: "Người nhờ" },
      { name: "山田", role: "Đồng nghiệp" },
    ],
    politeness: "polite",
    lines: [
      L("グエン", "{山田|やまだ}さん、すみません。ちょっとお{願|ねが}いがあるんですが…", "Anh/chị Yamada, xin lỗi. Tôi có chút việc muốn nhờ…"),
      L("山田", "はい、{何|なん}ですか。", "Vâng, việc gì vậy?"),
      L("グエン", "この{資料|しりょう}の{日本語|にほんご}を{確認|かくにん}していただけませんか。", "Anh/chị có thể kiểm tra giúp tiếng Nhật của tài liệu này không ạ?"),
      L("山田", "いいですよ。いつまでですか。", "Được chứ. Đến khi nào?"),
      L("グエン", "{明日|あした}の{午前中|ごぜんちゅう}までにお{願|ねが}いできると{助|たす}かります。", "Nếu nhờ được trước trưa mai thì tôi rất mừng."),
      L("山田", "わかりました。{後|あと}で{見|み}ておきますね。", "Được rồi. Lát nữa tôi xem trước nhé."),
      L("グエン", "ありがとうございます。{助|たす}かります。", "Cảm ơn anh/chị. Giúp tôi nhiều lắm."),
    ],
    vocab_notes: [
      { term: "ちょっとお願いがあるんですが", reading: "ちょっとおねがいがあるんですが", meaning_vi: "Mở lời nhờ nhẹ nhàng; が ở cuối để câu mở, chờ phản hồi." },
      { term: "確認", reading: "かくにん", meaning_vi: "kiểm tra lại, xác nhận" },
      { term: "助かります", reading: "たすかります", meaning_vi: "Giúp ích nhiều lắm (cách cảm ơn/đề nghị tự nhiên khi được giúp)." },
    ],
    grammar_notes: [
      { pattern: "〜ていただけませんか", note_vi: "Cách nhờ lịch sự: \"anh/chị có thể làm giúp tôi … được không ạ?\". Lịch sự hơn 〜てください." },
      { pattern: "〜ておく", note_vi: "Làm sẵn/làm trước một việc: 見ておきます (tôi xem trước)." },
    ],
    alternatives: [
      { ja: "{恐|おそ}れ{入|い}りますが、{確認|かくにん}をお{願|ねが}いできますでしょうか。", vi: "Xin lỗi làm phiền, tôi có thể nhờ anh/chị kiểm tra không ạ?", nuance_vi: "Trang trọng hơn; hợp khi nhờ cấp trên hoặc người ở bộ phận khác." },
      { ja: "{確認|かくにん}、お{願|ねが}いしてもいいですか。", vi: "Nhờ anh/chị kiểm tra được không?", nuance_vi: "Thân mật hơn, hợp với đồng nghiệp cùng cấp quen thuộc." },
    ],
    other_situations: [
      { situation_vi: "Nhờ đồng nghiệp đổi ca", ja: "すみません、{来週|らいしゅう}の{金曜日|きんようび}、シフトを{代|か}わっていただけませんか。", vi: "Xin lỗi, thứ Sáu tuần sau anh/chị có thể đổi ca giúp tôi được không?" },
    ],
    drills: [
      { prompt_vi: "Mở lời nhờ nhẹ nhàng", model_ja: "すみません、ちょっとお{願|ねが}いがあるんですが…", hint_vi: "Kết thúc bằng んですが…" },
      { prompt_vi: "Nhờ đồng nghiệp kiểm tra giúp tài liệu", model_ja: "この{資料|しりょう}を{確認|かくにん}していただけませんか。", hint_vi: "Dùng ていただけませんか." },
    ],
    roleplay: [
      {
        id: "t1", npc_ja: "はい、{何|なん}ですか。", npc_vi: "Vâng, việc gì vậy? (sau khi bạn mở lời nhờ)",
        options: [
          O("この{資料|しりょう}の{日本語|にほんご}を{確認|かくにん}していただけませんか。", "Anh/chị có thể kiểm tra giúp tiếng Nhật của tài liệu này không ạ?", "best", "Cách nhờ lịch sự, nêu rõ việc cần nhờ.", "t2"),
          O("これ、{確認|かくにん}してください。", "Kiểm tra cái này đi.", "poor", "Nghe như ra lệnh; không phù hợp khi nhờ đồng nghiệp lâu năm.", "t2"),
        ],
      },
      {
        id: "t2", npc_ja: "いいですよ。いつまでですか。", npc_vi: "Được chứ. Đến khi nào?",
        options: [
          O("{明日|あした}の{午前中|ごぜんちゅう}までにお{願|ねが}いできると{助|たす}かります。", "Nếu nhờ được trước trưa mai thì tôi rất mừng.", "best", "Nêu hạn chót cụ thể và thể hiện lòng biết ơn.", null),
          O("できるだけ{早|はや}くお{願|ねが}いします。", "Càng sớm càng tốt nhé.", "ok", "Không rõ thời hạn nên người nhận khó lên kế hoạch.", null),
        ],
      },
    ],
    references: [],
  },
  {
    key: "apology-late",
    category: "boss-colleague",
    level_hint: "N4",
    title: "Xin lỗi vì đến muộn",
    context: "Tàu điện bị chậm nên Nguyễn đến công ty muộn mười phút. Trưởng phòng đang ở gần cửa.",
    goal: "Xin lỗi ngắn gọn, nêu lý do, tiếp nhận lời nhắc nhở và hứa lần sau.",
    characters: [
      { name: "グエン", role: "Nhân viên" },
      { name: "課長", role: "Trưởng phòng" },
    ],
    politeness: "keigo",
    lines: [
      L("グエン", "{遅|おく}れて{申|もう}し{訳|わけ}ありません。{電車|でんしゃ}が{遅|おく}れていました。", "Xin lỗi vì đến muộn. Tàu điện bị chậm."),
      L("課長", "{大丈夫|だいじょうぶ}ですよ。{次|つぎ}からは{連絡|れんらく}をお{願|ねが}いしますね。", "Không sao đâu. Từ lần sau nhớ liên lạc nhé."),
      L("グエン", "はい、{気|き}をつけます。", "Vâng, tôi sẽ chú ý."),
    ],
    vocab_notes: [
      { term: "申し訳ありません", reading: "もうしわけありません", meaning_vi: "Lời xin lỗi trang trọng (trang trọng hơn すみません)." },
      { term: "遅れる", reading: "おくれる", meaning_vi: "trễ, muộn" },
      { term: "気をつける", reading: "きをつける", meaning_vi: "chú ý, cẩn thận" },
    ],
    grammar_notes: [
      { pattern: "〜て（原因）", note_vi: "遅れて申し訳ありません: dùng て để nêu nguyên nhân/lý do của lời xin lỗi." },
      { pattern: "〜ていました", note_vi: "Trạng thái tiếp diễn trong quá khứ: 電車が遅れていました (tàu đã bị chậm)." },
    ],
    alternatives: [
      { ja: "{大変|たいへん}{申|もう}し{訳|わけ}ございません。", vi: "Thành thật xin lỗi ạ.", nuance_vi: "Trang trọng hơn; hợp lỗi nghiêm trọng hoặc với khách hàng." },
      { ja: "すみません、{遅|おく}れました。", vi: "Xin lỗi, tôi đến muộn.", nuance_vi: "Nhẹ nhàng hơn, hợp với đồng nghiệp thân." },
    ],
    other_situations: [
      { situation_vi: "Báo trước qua điện thoại khi sẽ đến muộn", ja: "{電車|でんしゃ}が{遅|おく}れているので、{十分|じゅっぷん}ほど{遅|おく}れます。", vi: "Vì tàu bị chậm nên tôi sẽ đến muộn khoảng 10 phút." },
    ],
    drills: [
      { prompt_vi: "Xin lỗi vì đến muộn vì tàu chậm", model_ja: "{遅|おく}れて{申|もう}し{訳|わけ}ありません。{電車|でんしゃ}が{遅|おく}れていました。", hint_vi: "Xin lỗi trước, nêu lý do sau." },
      { prompt_vi: "Hứa sẽ chú ý lần sau", model_ja: "はい、{気|き}をつけます。", hint_vi: "Ngắn gọn, không bào chữa thêm." },
    ],
    roleplay: [
      {
        id: "t1", npc_ja: "どうしましたか。", npc_vi: "Có chuyện gì vậy? (khi thấy bạn đến muộn)",
        options: [
          O("{遅|おく}れて{申|もう}し{訳|わけ}ありません。{電車|でんしゃ}が{遅|おく}れていました。", "Xin lỗi vì đến muộn. Tàu bị chậm.", "best", "Xin lỗi trước, nêu lý do ngắn gọn.", null),
          O("{電車|でんしゃ}のせいです。", "Tại tàu điện thôi.", "poor", "Nghe như đổ lỗi, thiếu lời xin lỗi.", null),
        ],
      },
    ],
    references: [],
  },
  {
    key: "meeting-progress",
    category: "meeting",
    level_hint: "N3",
    title: "Báo cáo tiến độ trong cuộc họp",
    context: "Họp tuần của nhóm thiết kế tại ナカシマ. Nguyễn báo cáo tiến độ thiết kế và rủi ro về thời hạn giao linh kiện.",
    goal: "Báo cáo tiến độ theo tỉ lệ, nêu rủi ro, giải thích nguyên nhân khi được hỏi.",
    characters: [
      { name: "司会", role: "Người điều hành họp" },
      { name: "グエン", role: "Kỹ sư thiết kế" },
      { name: "課長", role: "Trưởng phòng" },
    ],
    politeness: "polite",
    lines: [
      L("司会", "では、{進捗|しんちょく}を{報告|ほうこく}してください。", "Vậy xin báo cáo tiến độ."),
      L("グエン", "はい。{現在|げんざい}、{設計|せっけい}は{八割|はちわり}ほど{終|お}わっています。ただ、{部品|ぶひん}の{納期|のうき}が{遅|おく}れる{可能性|かのうせい}があります。", "Vâng. Hiện nay thiết kế đã xong khoảng 80%. Tuy nhiên có khả năng thời hạn giao linh kiện sẽ bị chậm."),
      L("課長", "{原因|げんいん}は{何|なん}ですか。", "Nguyên nhân là gì?"),
      L("グエン", "{仕入先|しいれさき}から、{材料|ざいりょう}の{入荷|にゅうか}が{来週|らいしゅう}になると{連絡|れんらく}がありました。", "Nhà cung cấp báo rằng nguyên liệu sẽ về vào tuần sau."),
      L("課長", "わかりました。{代替案|だいたいあん}を{検討|けんとう}してください。", "Hiểu rồi. Hãy xem xét phương án thay thế."),
    ],
    vocab_notes: [
      { term: "進捗", reading: "しんちょく", meaning_vi: "tiến độ" },
      { term: "納期", reading: "のうき", meaning_vi: "thời hạn giao hàng" },
      { term: "仕入先", reading: "しいれさき", meaning_vi: "nhà cung cấp (nơi nhập hàng)" },
      { term: "代替案", reading: "だいたいあん", meaning_vi: "phương án thay thế" },
    ],
    grammar_notes: [
      { pattern: "〜割（わり）", note_vi: "割 = phần mười: 八割 = 80%. Dùng nhiều khi báo cáo tiến độ." },
      { pattern: "〜可能性がある", note_vi: "Có khả năng (xảy ra): 遅れる可能性があります." },
      { pattern: "ただ、〜", note_vi: "Từ nối \"tuy nhiên\" để thêm điều kiện/rủi ro sau thông tin tích cực." },
    ],
    alternatives: [
      { ja: "{予定|よてい}どおり{進|すす}んでいます。", vi: "Đang tiến hành đúng kế hoạch.", nuance_vi: "Dùng khi không có vấn đề." },
      { ja: "{少|すこ}し{遅|おく}れています。", vi: "Đang hơi chậm.", nuance_vi: "Báo sớm về chậm trễ nhẹ." },
    ],
    other_situations: [
      { situation_vi: "Báo cáo công việc đã hoàn thành", ja: "{図面|ずめん}の{作成|さくせい}は{完了|かんりょう}しました。", vi: "Việc lập bản vẽ đã hoàn thành." },
    ],
    drills: [
      { prompt_vi: "Báo thiết kế đã xong khoảng 80%", model_ja: "{設計|せっけい}は{八割|はちわり}ほど{終|お}わっています。", hint_vi: "Dùng 〜ほど cho \"khoảng\"." },
      { prompt_vi: "Nói có khả năng chậm thời hạn giao hàng", model_ja: "{納期|のうき}が{遅|おく}れる{可能性|かのうせい}があります。", hint_vi: "Dùng 可能性がある." },
    ],
    roleplay: [
      {
        id: "t1", npc_ja: "では、{進捗|しんちょく}を{報告|ほうこく}してください。", npc_vi: "Vậy xin báo cáo tiến độ.",
        options: [
          O("はい。{現在|げんざい}、{設計|せっけい}は{八割|はちわり}ほど{終|お}わっています。ただ、{納期|のうき}が{遅|おく}れる{可能性|かのうせい}があります。", "Hiện thiết kế xong khoảng 80%. Tuy nhiên có khả năng chậm thời hạn giao hàng.", "best", "Nêu tiến độ bằng số + rủi ro — đúng thông tin cần cho cuộc họp.", "t2"),
          O("{順調|じゅんちょう}です。", "Thuận lợi ạ.", "ok", "Quá chung chung; nên cho biết số liệu/mốc cụ thể.", "t2"),
        ],
      },
      {
        id: "t2", npc_ja: "{原因|げんいん}は{何|なん}ですか。", npc_vi: "Nguyên nhân là gì?",
        options: [
          O("{仕入先|しいれさき}から、{材料|ざいりょう}の{入荷|にゅうか}が{来週|らいしゅう}になると{連絡|れんらく}がありました。", "Nhà cung cấp báo nguyên liệu sẽ về tuần sau.", "best", "Nêu nguyên nhân là sự việc cụ thể, không đổ lỗi.", null),
          O("たぶん、{仕入先|しいれさき}が{悪|わる}いと{思|おも}います。", "Chắc do nhà cung cấp không tốt.", "poor", "Đoán và đổ lỗi, thiếu căn cứ.", null),
        ],
      },
    ],
    references: [],
  },
  {
    key: "restaurant-order",
    category: "restaurant",
    level_hint: "N5",
    title: "Gọi món ở nhà hàng",
    context: "Hai người vào một quán ramen. Nhân viên đón khách.",
    goal: "Cho biết số người, gọi món, nhờ thêm nước.",
    characters: [
      { name: "店員", role: "Nhân viên quán" },
      { name: "客", role: "Khách" },
    ],
    politeness: "polite",
    lines: [
      L("店員", "いらっしゃいませ。{何名様|なんめいさま}ですか。", "Xin chào quý khách. Quý khách đi mấy người ạ?"),
      L("客", "{二人|ふたり}です。", "Hai người."),
      L("店員", "こちらへどうぞ。ご{注文|ちゅうもん}はお{決|き}まりですか。", "Mời đi lối này. Quý khách đã quyết định gọi món chưa ạ?"),
      L("客", "ラーメンを{二|ふた}つ、お{願|ねが}いします。", "Cho tôi hai bát ramen."),
      L("店員", "かしこまりました。", "Vâng, tôi hiểu rồi ạ."),
      L("客", "すみません、お{水|みず}をください。", "Xin lỗi, cho tôi xin nước."),
    ],
    vocab_notes: [
      { term: "何名様", reading: "なんめいさま", meaning_vi: "mấy vị (cách hỏi số khách, lịch sự)" },
      { term: "ご注文", reading: "ごちゅうもん", meaning_vi: "việc gọi món (kính ngữ của 注文)" },
      { term: "かしこまりました", reading: "かしこまりました", meaning_vi: "Tôi đã rõ (dùng của nhân viên với khách)." },
    ],
    grammar_notes: [
      { pattern: "〜をください", note_vi: "Cho tôi xin ~: お水をください." },
      { pattern: "数 + つ", note_vi: "Đếm đồ vật: 一つ (ひとつ)、二つ (ふたつ)、三つ (みっつ)…" },
    ],
    alternatives: [
      { ja: "{注文|ちゅうもん}をお{願|ねが}いします。", vi: "Cho tôi gọi món.", nuance_vi: "Dùng khi gọi nhân viên để gọi món." },
      { ja: "おすすめは{何|なん}ですか。", vi: "Quán có món gợi ý nào không?", nuance_vi: "Hỏi món nên gọi." },
    ],
    other_situations: [
      { situation_vi: "Thanh toán", ja: "お{会計|かいけい}をお{願|ねが}いします。", vi: "Cho tôi thanh toán." },
    ],
    drills: [
      { prompt_vi: "Nói bạn đi hai người", model_ja: "{二人|ふたり}です。", hint_vi: "Số người + です." },
      { prompt_vi: "Gọi hai bát ramen", model_ja: "ラーメンを{二|ふた}つ、お{願|ねが}いします。", hint_vi: "Dùng bộ đếm つ." },
    ],
    roleplay: [
      {
        id: "t1", npc_ja: "{何名様|なんめいさま}ですか。", npc_vi: "Quý khách đi mấy người ạ?",
        options: [
          O("{二人|ふたり}です。", "Hai người.", "best", "Trả lời đúng và ngắn gọn.", "t2"),
          O("{二|に}。", "Hai.", "poor", "Quá cụt và dễ gây hiểu lầm khi thiếu です/人.", "t2"),
        ],
      },
      {
        id: "t2", npc_ja: "ご{注文|ちゅうもん}はお{決|き}まりですか。", npc_vi: "Quý khách đã quyết định gọi món chưa ạ?",
        options: [
          O("ラーメンを{二|ふた}つ、お{願|ねが}いします。", "Cho tôi hai bát ramen.", "best", "Nêu món và số lượng, lịch sự.", null),
          O("ラーメン！", "Ramen!", "poor", "Quá cộc lốc với nhân viên.", null),
        ],
      },
    ],
    references: [],
  },
  {
    key: "hospital-reception",
    category: "hospital",
    level_hint: "N4",
    title: "Khám bệnh: nói với lễ tân",
    context: "Nguyễn đến bệnh viện vì khó chịu từ hôm qua và nói chuyện với lễ tân.",
    goal: "Nói triệu chứng đơn giản, xuất trình thẻ bảo hiểm và làm theo hướng dẫn chờ gọi tên.",
    characters: [
      { name: "受付", role: "Lễ tân" },
      { name: "患者", role: "Bệnh nhân" },
    ],
    politeness: "polite",
    lines: [
      L("受付", "どうされましたか。", "Anh/chị bị làm sao ạ?"),
      L("患者", "{昨日|きのう}から{頭|あたま}が{痛|いた}いです。{熱|ねつ}もあります。", "Từ hôm qua tôi bị đau đầu. Tôi cũng bị sốt."),
      L("受付", "{保険証|ほけんしょう}はお{持|も}ちですか。", "Anh/chị có mang thẻ bảo hiểm không ạ?"),
      L("患者", "はい、これです。", "Có, đây ạ."),
      L("受付", "では、{名前|なまえ}を{呼|よ}びますので、あちらでお{待|ま}ちください。", "Vậy chúng tôi sẽ gọi tên, mời anh/chị chờ ở đằng kia."),
    ],
    vocab_notes: [
      { term: "どうされましたか", reading: "どうされましたか", meaning_vi: "Anh/chị bị sao ạ? (hỏi lịch sự về tình trạng)." },
      { term: "保険証", reading: "ほけんしょう", meaning_vi: "thẻ bảo hiểm" },
      { term: "〜が痛い", reading: "〜がいたい", meaning_vi: "bị đau ~ (頭が痛い: đau đầu)" },
    ],
    grammar_notes: [
      { pattern: "〜から（起点）", note_vi: "昨日から: kể từ hôm qua." },
      { pattern: "〜ので〜ください", note_vi: "Vì ~ nên xin hãy ~ (lý do + yêu cầu lịch sự)." },
    ],
    alternatives: [
      { ja: "{予約|よやく}はしていません。", vi: "Tôi chưa đặt lịch.", nuance_vi: "Trả lời khi lễ tân hỏi về lịch hẹn." },
    ],
    other_situations: [
      { situation_vi: "Nói bạn đau họng", ja: "{喉|のど}が{痛|いた}いです。", vi: "Tôi bị đau họng." },
    ],
    drills: [
      { prompt_vi: "Nói từ hôm qua bị đau đầu", model_ja: "{昨日|きのう}から{頭|あたま}が{痛|いた}いです。", hint_vi: "から + が痛い." },
    ],
    roleplay: [
      {
        id: "t1", npc_ja: "どうされましたか。", npc_vi: "Anh/chị bị làm sao ạ?",
        options: [
          O("{昨日|きのう}から{頭|あたま}が{痛|いた}いです。", "Từ hôm qua tôi bị đau đầu.", "best", "Nêu thời điểm bắt đầu và triệu chứng — thông tin cần thiết.", null),
          O("{調子|ちょうし}が{悪|わる}いです。", "Tôi thấy không khỏe.", "ok", "Đúng nhưng chung chung; nên nêu triệu chứng cụ thể.", null),
        ],
      },
    ],
    references: [],
  },
  {
    key: "friends-weekend",
    category: "friends",
    level_hint: "N5",
    title: "Rủ bạn đi ăn cuối tuần",
    context: "Minh (bạn người Việt) nói chuyện với Ken (bạn người Nhật) trong giờ nghỉ.",
    goal: "Rủ bạn đi ăn bằng cách nói thân mật, hỏi ý kiến và hẹn giờ.",
    characters: [
      { name: "ミン", role: "Bạn" },
      { name: "ケン", role: "Bạn" },
    ],
    politeness: "casual",
    lines: [
      L("ミン", "{週末|しゅうまつ}、{何|なに}するの？", "Cuối tuần cậu làm gì thế?"),
      L("ケン", "{特|とく}に{予定|よてい}はないよ。", "Không có kế hoạch gì đặc biệt đâu."),
      L("ミン", "じゃあ、{一緒|いっしょ}にご{飯|はん}{食|た}べに{行|い}かない？", "Vậy thì cùng đi ăn cơm không?"),
      L("ケン", "いいね！どこに{行|い}く？", "Hay đấy! Đi đâu?"),
      L("ミン", "ラーメンはどう？", "Ramen thì sao?"),
      L("ケン", "いいよ。{何時|なんじ}にする？", "Được. Mấy giờ nhỉ?"),
    ],
    vocab_notes: [
      { term: "特に〜ない", reading: "とくに〜ない", meaning_vi: "không có gì đặc biệt" },
      { term: "予定", reading: "よてい", meaning_vi: "dự định, lịch" },
      { term: "〜はどう？", reading: "〜はどう？", meaning_vi: "~ thì sao? (đề xuất nhẹ)" },
    ],
    grammar_notes: [
      { pattern: "〜の？（疑問）", note_vi: "Trong văn nói thân mật, の + giọng lên dùng để hỏi, thay cho か: 何するの？" },
      { pattern: "〜ない？（誘い）", note_vi: "Rủ rê thân mật: 行かない？ ≈ 行きませんか (dạng lịch sự)." },
      { pattern: "〜よ／〜ね", note_vi: "よ: báo thông tin; ね: tìm sự đồng tình. Dùng nhiều trong văn nói thân mật." },
    ],
    alternatives: [
      { ja: "{一緒|いっしょ}にご{飯|はん}を{食|た}べに{行|い}きませんか。", vi: "Anh/chị đi ăn cùng tôi nhé?", nuance_vi: "Dạng lịch sự, dùng với người không quá thân hoặc cấp trên." },
    ],
    other_situations: [
      { situation_vi: "Rủ bạn xem phim", ja: "{今度|こんど}の{日曜日|にちようび}、{映画|えいが}{見|み}に{行|い}かない？", vi: "Chủ nhật tới đi xem phim không?" },
    ],
    drills: [
      { prompt_vi: "Rủ bạn thân đi ăn cơm (thân mật)", model_ja: "{一緒|いっしょ}にご{飯|はん}{食|た}べに{行|い}かない？", hint_vi: "Dùng 〜ない？ khi rủ." },
      { prompt_vi: "Hỏi bạn muốn đi đâu (thân mật)", model_ja: "どこに{行|い}く？", hint_vi: "Bỏ ます và lên giọng." },
    ],
    roleplay: [
      {
        id: "t1", npc_ja: "{週末|しゅうまつ}、{何|なに}するの？", npc_vi: "Cuối tuần cậu làm gì?",
        options: [
          O("{特|とく}に{予定|よてい}はないよ。{一緒|いっしょ}にご{飯|はん}{食|た}べに{行|い}かない？", "Không có gì đặc biệt. Cùng đi ăn cơm không?", "best", "Thân mật, tự nhiên và rủ luôn.", null),
          O("{特|とく}に{予定|よてい}はございません。", "Tôi không có dự định đặc biệt ạ.", "poor", "Quá trang trọng với bạn thân — nghe xa cách.", null),
        ],
      },
    ],
    references: [],
  },
  {
    key: "station-directions",
    category: "transport-life",
    level_hint: "N5",
    title: "Hỏi đường ra nhà ga",
    context: "Nguyễn lạc đường gần nhà ga và hỏi một người đi đường.",
    goal: "Hỏi vị trí, xác nhận hướng đi và khoảng cách.",
    characters: [
      { name: "グエン", role: "Người hỏi đường" },
      { name: "通行人", role: "Người đi đường" },
    ],
    politeness: "polite",
    lines: [
      L("グエン", "すみません、{駅|えき}はどこですか。", "Xin lỗi, nhà ga ở đâu ạ?"),
      L("通行人", "あの{信号|しんごう}を{右|みぎ}に{曲|ま}がってください。", "Anh hãy rẽ phải ở đèn tín hiệu kia."),
      L("グエン", "{右|みぎ}ですね。{遠|とお}いですか。", "Rẽ phải ạ. Có xa không?"),
      L("通行人", "いいえ、{歩|ある}いて{五分|ごふん}ぐらいです。", "Không, đi bộ khoảng 5 phút."),
      L("グエン", "ありがとうございます。", "Cảm ơn bạn."),
    ],
    vocab_notes: [
      { term: "信号", reading: "しんごう", meaning_vi: "đèn tín hiệu giao thông" },
      { term: "曲がる", reading: "まがる", meaning_vi: "rẽ, quẹo" },
      { term: "〜ぐらい", reading: "〜ぐらい", meaning_vi: "khoảng ~" },
    ],
    grammar_notes: [
      { pattern: "〜はどこですか", note_vi: "Hỏi vị trí: 駅はどこですか。" },
      { pattern: "〜てください", note_vi: "Hướng dẫn/nhờ: 右に曲がってください。" },
    ],
    alternatives: [
      { ja: "{駅|えき}までどのくらいかかりますか。", vi: "Đến ga mất bao lâu ạ?", nuance_vi: "Hỏi thời gian cần để đi." },
    ],
    other_situations: [
      { situation_vi: "Hỏi tàu đi Shinjuku", ja: "{新宿|しんじゅく}へ{行|い}く{電車|でんしゃ}は{何番線|なんばんせん}ですか。", vi: "Tàu đi Shinjuku ở đường ray số mấy ạ?" },
    ],
    drills: [
      { prompt_vi: "Hỏi nhà ga ở đâu", model_ja: "すみません、{駅|えき}はどこですか。", hint_vi: "Mở đầu bằng すみません." },
    ],
    roleplay: [
      {
        id: "t1", npc_ja: "あの{信号|しんごう}を{右|みぎ}に{曲|ま}がってください。", npc_vi: "Hãy rẽ phải ở đèn tín hiệu kia.",
        options: [
          O("{右|みぎ}ですね。ありがとうございます。", "Rẽ phải ạ. Cảm ơn bạn.", "best", "Nhắc lại để xác nhận rồi cảm ơn.", null),
          O("はい。（{黙|だま}って{行|い}く）", "Vâng. (đi luôn không nói gì)", "poor", "Nên nói lời cảm ơn khi được chỉ đường.", null),
        ],
      },
    ],
    references: [],
  },
  {
    key: "email-request",
    category: "email",
    level_hint: "N3",
    title: "Email nhờ xác nhận tài liệu",
    context: "Nguyễn gửi email nhờ Yamada (trưởng phòng ở bộ phận khác) xác nhận tài liệu, rồi nhận được thư trả lời.",
    goal: "Viết email công việc có tiêu đề rõ, lời mở, nội dung nhờ, hạn trả lời và lời kết lịch sự.",
    characters: [
      { name: "グエン", role: "Người gửi" },
      { name: "山田", role: "Người nhận" },
    ],
    politeness: "keigo",
    lines: [
      L("グエン（送信）", "{件名|けんめい}：{資料|しりょう}{確認|かくにん}のお{願|ねが}い\n\n{山田様|やまださま}\nお{疲|つか}れ{様|さま}です。ナカシマのグエンです。\n{添付|てんぷ}の{資料|しりょう}をご{確認|かくにん}いただけますでしょうか。\nお{忙|いそが}しいところ{恐|おそ}れ{入|い}りますが、{明日|あした}までにご{返信|へんしん}いただけると{幸|さいわ}いです。\nよろしくお{願|ねが}いいたします。", "Tiêu đề: Nhờ xác nhận tài liệu\n\nAnh Yamada,\nCảm ơn anh đã vất vả. Tôi là Nguyễn của ナカシマ.\nAnh vui lòng xác nhận tài liệu đính kèm giúp tôi được không ạ?\nXin lỗi vì làm phiền khi anh đang bận, nếu anh có thể trả lời trước ngày mai thì tôi rất biết ơn.\nXin nhờ anh giúp đỡ."),
      L("山田（返信）", "グエンさん\nお{疲|つか}れ{様|さま}です。{山田|やまだ}です。\n{資料|しりょう}を{確認|かくにん}しました。{修正|しゅうせい}{点|てん}を{添付|てんぷ}しますので、ご{確認|かくにん}ください。\nよろしくお{願|ねが}いします。", "Nguyễn,\nCảm ơn bạn đã vất vả. Tôi là Yamada.\nTôi đã kiểm tra tài liệu. Tôi đính kèm các điểm cần sửa, bạn xem giúp nhé.\nMong bạn giúp đỡ."),
    ],
    vocab_notes: [
      { term: "件名", reading: "けんめい", meaning_vi: "tiêu đề (email)" },
      { term: "添付", reading: "てんぷ", meaning_vi: "đính kèm" },
      { term: "お疲れ様です", reading: "おつかれさまです", meaning_vi: "Cụm chào xã giao phổ biến trong công sở khi đã quen biết nhau; lịch sự hơn có thể dùng いつもお世話になっております." },
      { term: "ご返信", reading: "ごへんしん", meaning_vi: "việc trả lời (kính ngữ)" },
    ],
    grammar_notes: [
      { pattern: "ご〜いただけますでしょうか", note_vi: "Cách nhờ rất lịch sự: ご確認いただけますでしょうか (xin anh/chị vui lòng xác nhận giúp)." },
      { pattern: "お忙しいところ恐れ入りますが", note_vi: "Mở đầu khi nhờ vả: \"xin lỗi vì làm phiền khi anh/chị đang bận\"." },
    ],
    alternatives: [
      { ja: "いつもお{世話|せわ}になっております。", vi: "Cảm ơn anh/chị đã luôn giúp đỡ.", nuance_vi: "Lời chào đầu thư phổ biến, đặc biệt với người ở công ty khác." },
    ],
    other_situations: [
      { situation_vi: "Kết thư khi cần trả lời", ja: "お{手数|てすう}ですが、ご{返信|へんしん}をお{願|ねが}いいたします。", vi: "Xin lỗi vì làm phiền, mong anh/chị phản hồi." },
    ],
    drills: [
      { prompt_vi: "Nhờ xác nhận tài liệu đính kèm (rất lịch sự)", model_ja: "{添付|てんぷ}の{資料|しりょう}をご{確認|かくにん}いただけますでしょうか。", hint_vi: "ご + danh từ + いただけますでしょうか." },
    ],
    roleplay: [
      {
        id: "t1", npc_ja: "（{山田|やまだ}さんからの{返信|へんしん}）{修正|しゅうせい}{点|てん}を{添付|てんぷ}しますので、ご{確認|かくにん}ください。", npc_vi: "(Thư trả lời của Yamada) Tôi đính kèm điểm cần sửa, bạn xem giúp nhé.",
        options: [
          O("ご{確認|かくにん}ありがとうございます。{修正|しゅうせい}して、{再送|さいそう}いたします。", "Cảm ơn anh đã kiểm tra. Tôi sẽ sửa và gửi lại.", "best", "Cảm ơn rồi nêu hành động tiếp theo.", null),
          O("はい。", "Vâng.", "poor", "Quá cộc lốc trong email công việc.", null),
        ],
      },
    ],
    references: [],
  },
  {
    key: "keigo-reception",
    category: "keigo",
    level_hint: "N3",
    title: "Tiếp khách ở quầy lễ tân (kính ngữ)",
    context: "Nguyễn trực quầy lễ tân tại ナカシマ. Một khách có hẹn với Yamada đến.",
    goal: "Luyện kính ngữ (尊敬語) khi nói về khách và khiêm nhường ngữ (謙譲語) khi nói về mình/công ty mình.",
    characters: [
      { name: "グエン", role: "Lễ tân" },
      { name: "客", role: "Khách" },
    ],
    politeness: "keigo",
    lines: [
      L("グエン", "いらっしゃいませ。ご{用件|ようけん}をお{伺|うかが}いします。", "Xin chào quý khách. Tôi xin hỏi quý khách cần gì ạ."),
      L("客", "{営業部|えいぎょうぶ}の{山田|やまだ}さんと{十時|じゅうじ}にお{約束|やくそく}をいただいております。", "Tôi có hẹn với anh Yamada phòng kinh doanh lúc 10 giờ."),
      L("グエン", "{山田|やまだ}ですね。{確認|かくにん}いたしますので、{少々|しょうしょう}お{待|ま}ちください。", "Yamada phải không ạ. Tôi xin xác nhận, mong quý khách chờ một chút."),
      L("グエン", "お{待|ま}たせいたしました。{山田|やまだ}がすぐ{参|まい}ります。こちらでお{待|ま}ちください。", "Xin lỗi đã để quý khách chờ. Yamada sẽ đến ngay. Mời quý khách chờ ở đây."),
    ],
    vocab_notes: [
      { term: "伺う", reading: "うかがう", meaning_vi: "Khiêm nhường ngữ của 聞く/訪ねる (hỏi, đến thăm)." },
      { term: "参る", reading: "まいる", meaning_vi: "Khiêm nhường ngữ của 行く/来る." },
      { term: "少々", reading: "しょうしょう", meaning_vi: "một chút (lịch sự hơn ちょっと)" },
    ],
    grammar_notes: [
      { pattern: "尊敬語・謙譲語の対応", note_vi: "言う: おっしゃる(尊敬)/申す・申し上げる(謙譲). 行く・来る: いらっしゃる(尊敬)/参る・伺う(謙譲). 見る: ご覧になる(尊敬)/拝見する(謙譲). 食べる: 召し上がる(尊敬)/いただく(謙譲). する: なさる(尊敬)/いたす(謙譲)." },
      { pattern: "お〜ください／お〜いたします", note_vi: "Mẫu kính ngữ/khiêm nhường: お待ちください (xin chờ), お待たせいたしました (xin lỗi để quý khách chờ)." },
    ],
    alternatives: [
      { ja: "どうぞこちらへお{掛|か}けください。", vi: "Mời quý khách ngồi ở đây.", nuance_vi: "Mời khách ngồi chờ." },
    ],
    other_situations: [
      { situation_vi: "Dẫn khách đến phòng họp", ja: "{会議室|かいぎしつ}までご{案内|あんない}いたします。", vi: "Tôi xin dẫn quý khách đến phòng họp." },
    ],
    drills: [
      { prompt_vi: "Xin khách chờ một chút (lịch sự)", model_ja: "{少々|しょうしょう}お{待|ま}ちください。", hint_vi: "お + V + ください." },
      { prompt_vi: "Xin lỗi vì để khách chờ", model_ja: "お{待|ま}たせいたしました。", hint_vi: "お + V + いたしました." },
    ],
    roleplay: [
      {
        id: "t1", npc_ja: "{山田|やまだ}さんと{十時|じゅうじ}にお{約束|やくそく}をいただいております。", npc_vi: "Tôi có hẹn với anh Yamada lúc 10 giờ.",
        options: [
          O("{山田|やまだ}ですね。{確認|かくにん}いたしますので、{少々|しょうしょう}お{待|ま}ちください。", "Yamada phải không ạ. Tôi xin xác nhận, mong quý khách chờ một chút.", "best", "Dùng 謙譲語 (いたします) cho hành động của mình và お〜ください cho khách.", null),
          O("{山田|やまだ}さんですね。ちょっと{待|ま}っててください。", "Anh Yamada hả. Chờ chút nhé.", "poor", "Quá suồng sã với khách; \"山田さん\" cũng không hợp khi nói với khách về người trong công ty.", null),
        ],
      },
    ],
    references: [],
  },
  {
    key: "casual-contractions",
    category: "casual",
    level_hint: "N4",
    title: "Nói chuyện thân mật: 〜ちゃった",
    context: "Hai người bạn thân nói chuyện ở nhà. Một người lỡ ăn hết bánh của người kia.",
    goal: "Nhận biết cách nói rút gọn thân mật (〜ちゃった) và dùng đúng ngữ cảnh.",
    characters: [
      { name: "A", role: "Bạn thân" },
      { name: "B", role: "Bạn thân" },
    ],
    politeness: "casual",
    lines: [
      L("A", "ねえ、これ、{食|た}べちゃった？", "Này, cậu lỡ ăn cái này rồi à?"),
      L("B", "うん、おいしかったから、{全部|ぜんぶ}{食|た}べちゃった。", "Ừ, vì ngon quá nên tớ lỡ ăn hết rồi."),
      L("A", "えー、ひどい！", "Ế, quá đáng!"),
      L("B", "ごめんごめん、{今度|こんど}、{買|か}ってくるよ。", "Xin lỗi xin lỗi, lần sau tớ mua về nhé."),
    ],
    vocab_notes: [
      { term: "全部", reading: "ぜんぶ", meaning_vi: "tất cả" },
      { term: "ひどい", reading: "ひどい", meaning_vi: "tệ, quá đáng (thân mật)" },
      { term: "今度", reading: "こんど", meaning_vi: "lần tới / lần này (tùy ngữ cảnh)" },
    ],
    grammar_notes: [
      { pattern: "〜ちゃった（〜てしまった）", note_vi: "Dạng rút gọn thân mật của 〜てしまった: lỡ làm gì / làm xong hết (nhấn sắc thái tiếc hoặc hoàn tất). Thường gặp trong văn nói; trong văn viết trang trọng dùng 〜てしまった/〜ました." },
      { pattern: "ごめんごめん", note_vi: "Lặp đôi để xin lỗi nhẹ nhàng giữa bạn bè; không dùng với cấp trên." },
    ],
    alternatives: [
      { ja: "{食|た}べてしまいました。", vi: "Tôi đã lỡ ăn mất rồi.", nuance_vi: "Dạng lịch sự, dùng khi nói với người không thân." },
    ],
    other_situations: [
      { situation_vi: "Lỡ quên điện thoại ở nhà", ja: "{携帯|けいたい}を{忘|わす}れちゃった！", vi: "Tớ lỡ quên điện thoại rồi!" },
    ],
    drills: [
      { prompt_vi: "Nói với bạn thân là lỡ ăn hết (thân mật)", model_ja: "{全部|ぜんぶ}{食|た}べちゃった。", hint_vi: "〜てしまった → 〜ちゃった." },
    ],
    roleplay: [
      {
        id: "t1", npc_ja: "ねえ、これ、{食|た}べちゃった？", npc_vi: "Này, cậu lỡ ăn cái này rồi à?",
        options: [
          O("うん、ごめん。{今度|こんど}{買|か}ってくるよ。", "Ừ, xin lỗi. Lần sau tớ mua về nhé.", "best", "Thân mật, nhận lỗi và đề nghị bù.", null),
          O("{大変|たいへん}{申|もう}し{訳|わけ}ございません。", "Thành thật xin lỗi ạ.", "poor", "Quá trang trọng với bạn thân: nghe lạ/xa cách.", null),
        ],
      },
    ],
    references: [],
  },
  {
    key: "shopping-price",
    category: "shopping",
    level_hint: "N5",
    title: "Hỏi giá và chọn đồ rẻ hơn",
    context: "Khách hỏi giá một chiếc áo trong cửa hàng và muốn tìm cái rẻ hơn.",
    goal: "Hỏi giá, hỏi món rẻ hơn, quyết định mua.",
    characters: [
      { name: "客", role: "Khách" },
      { name: "店員", role: "Nhân viên" },
    ],
    politeness: "polite",
    lines: [
      L("客", "すみません、これはいくらですか。", "Xin lỗi, cái này giá bao nhiêu ạ?"),
      L("店員", "それは{三千円|さんぜんえん}です。", "Cái đó giá 3.000 yên."),
      L("客", "もう{少|すこ}し{安|やす}いのはありますか。", "Có cái nào rẻ hơn một chút không?"),
      L("店員", "こちらは{二千円|にせんえん}です。", "Cái này giá 2.000 yên."),
      L("客", "じゃあ、それをください。", "Vậy cho tôi cái đó."),
      L("店員", "ありがとうございます。", "Cảm ơn quý khách."),
    ],
    vocab_notes: [
      { term: "いくら", reading: "いくら", meaning_vi: "bao nhiêu (tiền)" },
      { term: "安い", reading: "やすい", meaning_vi: "rẻ" },
      { term: "もう少し", reading: "もうすこし", meaning_vi: "thêm một chút nữa" },
    ],
    grammar_notes: [
      { pattern: "これ・それ・あれ", note_vi: "これ: vật gần người nói; それ: vật gần người nghe; あれ: vật xa cả hai." },
      { pattern: "〜のはありますか", note_vi: "Có cái nào ~ không: 安いのはありますか。" },
    ],
    alternatives: [
      { ja: "{試|ため}してもいいですか。", vi: "Tôi thử được không?", nuance_vi: "Xin thử đồ/sản phẩm." },
    ],
    other_situations: [
      { situation_vi: "Hỏi có size khác không", ja: "もっと{大|おお}きいサイズはありますか。", vi: "Có size lớn hơn không?" },
    ],
    drills: [
      { prompt_vi: "Hỏi giá một món đồ", model_ja: "すみません、これはいくらですか。", hint_vi: "いくらですか." },
      { prompt_vi: "Hỏi có cái rẻ hơn không", model_ja: "もう{少|すこ}し{安|やす}いのはありますか。", hint_vi: "安いのはありますか." },
    ],
    roleplay: [
      {
        id: "t1", npc_ja: "それは{三千円|さんぜんえん}です。", npc_vi: "Cái đó giá 3.000 yên.",
        options: [
          O("もう{少|すこ}し{安|やす}いのはありますか。", "Có cái nào rẻ hơn một chút không?", "best", "Hỏi lịch sự và không gây khó xử.", "t2"),
          O("{高|たか}すぎます！", "Đắt quá!", "poor", "Nghe thiếu lịch sự; nên hỏi có món rẻ hơn không.", "t2"),
        ],
      },
      {
        id: "t2", npc_ja: "こちらは{二千円|にせんえん}です。", npc_vi: "Cái này giá 2.000 yên.",
        options: [
          O("じゃあ、それをください。", "Vậy cho tôi cái đó.", "best", "Quyết định rõ ràng.", null),
          O("いりません。", "Không cần.", "poor", "Cộc lốc; nên nói すみません、また今度…", null),
        ],
      },
    ],
    references: [],
  },
];
