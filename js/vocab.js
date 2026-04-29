// 實戰詞彙 + 句子數據
// 每個 word entry: { ja, kana?, zh, ex?, ex_zh? }
// ex / ex_zh 可選 — 高頻詞才有例句
// 音頻文件名 = ja 字段（URL-encoded），由 build-audio.py 生成

const PHRASES = [
  { ja: "こんにちは", romaji: "konnichiwa", zh: "你好（白天）", note: "最常用的日間問候" },
  { ja: "おはようございます", romaji: "ohayō gozaimasu", zh: "早安（敬語）" },
  { ja: "こんばんは", romaji: "konbanwa", zh: "晚上好" },
  { ja: "おやすみなさい", romaji: "oyasumi nasai", zh: "晚安" },
  { ja: "ありがとうございます", romaji: "arigatō gozaimasu", zh: "謝謝（敬語）" },
  { ja: "すみません", romaji: "sumimasen", zh: "對不起 / 不好意思 / 借過", note: "三種意思都用同一句" },
  { ja: "はじめまして", romaji: "hajimemashite", zh: "初次見面", note: "自我介紹開場白" },
  { ja: "よろしくお願いします", romaji: "yoroshiku onegaishimasu", zh: "請多關照", note: "自我介紹收尾，固定搭配" },
  { ja: "お元気ですか", romaji: "ogenki desu ka", zh: "你好嗎？" },
  { ja: "はい", romaji: "hai", zh: "是 / 好" },
  { ja: "いいえ", romaji: "iie", zh: "不 / 不是" },
  { ja: "わかりました", romaji: "wakarimashita", zh: "明白了 / 知道了" },
  { ja: "わかりません", romaji: "wakarimasen", zh: "不明白 / 不知道" },
  { ja: "もう一度お願いします", romaji: "mō ichido onegaishimasu", zh: "請再說一遍" },
  { ja: "日本語が少しわかります", romaji: "nihongo ga sukoshi wakarimasu", zh: "我會一點點日語" },
  { ja: "トイレはどこですか", romaji: "toire wa doko desu ka", zh: "洗手間在哪裏？" },
  { ja: "いくらですか", romaji: "ikura desu ka", zh: "多少錢？", note: "購物必備" },
  { ja: "これをください", romaji: "kore o kudasai", zh: "請給我這個", note: "點餐 / 購物萬能句" },
  { ja: "おいしいです", romaji: "oishī desu", zh: "很好吃" },
  { ja: "さようなら", romaji: "sayōnara", zh: "再見", note: "正式 / 較長時間不見" },
];

// N5 100 詞按主題分組
const N5_CATEGORIES = [
  {
    id: "people", label: "👥 人物", words: [
      { ja: "私", kana: "わたし", zh: "我", ex: "私は学生です。", ex_zh: "我是學生。" },
      { ja: "あなた", zh: "你", ex: "あなたは日本人ですか。", ex_zh: "你是日本人嗎？" },
      { ja: "彼", kana: "かれ", zh: "他" },
      { ja: "彼女", kana: "かのじょ", zh: "她 / 女朋友" },
      { ja: "友達", kana: "ともだち", zh: "朋友", ex: "友達と映画を見ます。", ex_zh: "和朋友看電影。" },
      { ja: "家族", kana: "かぞく", zh: "家人" },
      { ja: "お父さん", kana: "おとうさん", zh: "爸爸（敬稱別人的）" },
      { ja: "お母さん", kana: "おかあさん", zh: "媽媽（敬稱別人的）" },
      { ja: "先生", kana: "せんせい", zh: "老師", ex: "先生はやさしいです。", ex_zh: "老師很溫柔。" },
      { ja: "学生", kana: "がくせい", zh: "學生" },
    ]
  },
  {
    id: "numbers", label: "🔢 數字", words: [
      { ja: "ゼロ", zh: "0" },
      { ja: "一", kana: "いち", zh: "1" },
      { ja: "二", kana: "に", zh: "2" },
      { ja: "三", kana: "さん", zh: "3" },
      { ja: "四", kana: "し / よん", zh: "4" },
      { ja: "五", kana: "ご", zh: "5" },
      { ja: "六", kana: "ろく", zh: "6" },
      { ja: "七", kana: "しち / なな", zh: "7" },
      { ja: "八", kana: "はち", zh: "8" },
      { ja: "九", kana: "きゅう / く", zh: "9" },
      { ja: "十", kana: "じゅう", zh: "10" },
    ]
  },
  {
    id: "time", label: "🕰 時間", words: [
      { ja: "今日", kana: "きょう", zh: "今天", ex: "今日は雨です。", ex_zh: "今天下雨。" },
      { ja: "明日", kana: "あした", zh: "明天", ex: "明日学校に行きます。", ex_zh: "明天去學校。" },
      { ja: "昨日", kana: "きのう", zh: "昨天" },
      { ja: "今", kana: "いま", zh: "現在", ex: "今何時ですか。", ex_zh: "現在幾點？" },
      { ja: "朝", kana: "あさ", zh: "早晨" },
      { ja: "夜", kana: "よる", zh: "晚上" },
      { ja: "時間", kana: "じかん", zh: "時間 / 小時" },
      { ja: "週", kana: "しゅう", zh: "週" },
      { ja: "月", kana: "つき", zh: "月" },
      { ja: "年", kana: "とし", zh: "年" },
    ]
  },
  {
    id: "food", label: "🍱 食物", words: [
      { ja: "水", kana: "みず", zh: "水", ex: "水を飲みます。", ex_zh: "喝水。" },
      { ja: "お茶", kana: "おちゃ", zh: "茶" },
      { ja: "コーヒー", zh: "咖啡", ex: "コーヒーが好きです。", ex_zh: "喜歡咖啡。" },
      { ja: "ご飯", kana: "ごはん", zh: "飯 / 米飯", ex: "ご飯を食べます。", ex_zh: "吃飯。" },
      { ja: "パン", zh: "麵包" },
      { ja: "肉", kana: "にく", zh: "肉" },
      { ja: "魚", kana: "さかな", zh: "魚" },
      { ja: "野菜", kana: "やさい", zh: "蔬菜" },
      { ja: "果物", kana: "くだもの", zh: "水果" },
      { ja: "ビール", zh: "啤酒" },
    ]
  },
  {
    id: "place", label: "📍 地點", words: [
      { ja: "家", kana: "いえ", zh: "家", ex: "家に帰ります。", ex_zh: "回家。" },
      { ja: "学校", kana: "がっこう", zh: "學校", ex: "学校で勉強します。", ex_zh: "在學校學習。" },
      { ja: "会社", kana: "かいしゃ", zh: "公司" },
      { ja: "駅", kana: "えき", zh: "車站", ex: "駅はどこですか。", ex_zh: "車站在哪裏？" },
      { ja: "店", kana: "みせ", zh: "店" },
      { ja: "病院", kana: "びょういん", zh: "醫院" },
      { ja: "銀行", kana: "ぎんこう", zh: "銀行" },
      { ja: "公園", kana: "こうえん", zh: "公園" },
      { ja: "国", kana: "くに", zh: "國家" },
      { ja: "町", kana: "まち", zh: "城鎮 / 市區" },
    ]
  },
  {
    id: "verbs", label: "🏃 動詞", words: [
      { ja: "食べる", kana: "たべる", zh: "吃", ex: "りんごを食べる。", ex_zh: "吃蘋果。" },
      { ja: "飲む", kana: "のむ", zh: "喝", ex: "お茶を飲む。", ex_zh: "喝茶。" },
      { ja: "見る", kana: "みる", zh: "看", ex: "映画を見る。", ex_zh: "看電影。" },
      { ja: "聞く", kana: "きく", zh: "聽 / 問", ex: "音楽を聞く。", ex_zh: "聽音樂。" },
      { ja: "話す", kana: "はなす", zh: "說", ex: "日本語を話す。", ex_zh: "說日語。" },
      { ja: "読む", kana: "よむ", zh: "讀", ex: "本を読む。", ex_zh: "讀書。" },
      { ja: "書く", kana: "かく", zh: "寫", ex: "手紙を書く。", ex_zh: "寫信。" },
      { ja: "行く", kana: "いく", zh: "去", ex: "東京に行く。", ex_zh: "去東京。" },
      { ja: "来る", kana: "くる", zh: "來" },
      { ja: "帰る", kana: "かえる", zh: "回家 / 回去" },
      { ja: "買う", kana: "かう", zh: "買", ex: "本を買う。", ex_zh: "買書。" },
      { ja: "する", zh: "做" },
      { ja: "ある", zh: "有（無生命物）" },
      { ja: "いる", zh: "有 / 在（生命體）" },
      { ja: "好き", kana: "すき", zh: "喜歡（形容動詞）", ex: "猫が好きです。", ex_zh: "喜歡貓。" },
    ]
  },
  {
    id: "adj", label: "✨ 形容詞", words: [
      { ja: "大きい", kana: "おおきい", zh: "大的", ex: "大きい犬。", ex_zh: "大狗。" },
      { ja: "小さい", kana: "ちいさい", zh: "小的" },
      { ja: "新しい", kana: "あたらしい", zh: "新的" },
      { ja: "古い", kana: "ふるい", zh: "舊的" },
      { ja: "高い", kana: "たかい", zh: "高的 / 貴的" },
      { ja: "安い", kana: "やすい", zh: "便宜的", ex: "これは安いです。", ex_zh: "這個便宜。" },
      { ja: "暑い", kana: "あつい", zh: "熱的" },
      { ja: "寒い", kana: "さむい", zh: "冷的" },
      { ja: "おいしい", zh: "好吃的", ex: "ラーメンはおいしい。", ex_zh: "拉麵好吃。" },
      { ja: "面白い", kana: "おもしろい", zh: "有趣的" },
    ]
  },
  {
    id: "color", label: "🎨 顏色", words: [
      { ja: "赤", kana: "あか", zh: "紅" },
      { ja: "青", kana: "あお", zh: "藍" },
      { ja: "白", kana: "しろ", zh: "白" },
      { ja: "黒", kana: "くろ", zh: "黑" },
      { ja: "黄色", kana: "きいろ", zh: "黃" },
    ]
  },
  {
    id: "direction", label: "🧭 方位", words: [
      { ja: "上", kana: "うえ", zh: "上" },
      { ja: "下", kana: "した", zh: "下" },
      { ja: "前", kana: "まえ", zh: "前" },
      { ja: "後ろ", kana: "うしろ", zh: "後" },
      { ja: "右", kana: "みぎ", zh: "右" },
      { ja: "左", kana: "ひだり", zh: "左" },
      { ja: "中", kana: "なか", zh: "裏面" },
      { ja: "外", kana: "そと", zh: "外面" },
    ]
  },
  {
    id: "misc", label: "💬 其他常用", words: [
      { ja: "とても", zh: "很 / 非常", ex: "とても面白い。", ex_zh: "非常有趣。" },
      { ja: "少し", kana: "すこし", zh: "一點點" },
      { ja: "たくさん", zh: "很多" },
      { ja: "全部", kana: "ぜんぶ", zh: "全部" },
      { ja: "また", zh: "再 / 又" },
      { ja: "もう", zh: "已經" },
      { ja: "まだ", zh: "還沒" },
      { ja: "嫌い", kana: "きらい", zh: "討厭" },
      { ja: "可愛い", kana: "かわいい", zh: "可愛", ex: "猫は可愛い。", ex_zh: "貓很可愛。" },
      { ja: "綺麗", kana: "きれい", zh: "漂亮 / 乾淨" },
      { ja: "元気", kana: "げんき", zh: "精神 / 活力" },
      { ja: "電車", kana: "でんしゃ", zh: "電車" },
      { ja: "お金", kana: "おかね", zh: "錢" },
      { ja: "本", kana: "ほん", zh: "書" },
      { ja: "車", kana: "くるま", zh: "車" },
      { ja: "天気", kana: "てんき", zh: "天氣" },
      { ja: "雨", kana: "あめ", zh: "雨" },
      { ja: "雪", kana: "ゆき", zh: "雪" },
    ]
  },
];

// 為 build-audio.py 用：所有需要 audio 的文本（詞 + 例句）
function _vocabAudioTexts() {
  const set = new Set();
  for (const p of PHRASES) set.add(p.ja);
  for (const cat of N5_CATEGORIES) {
    for (const w of cat.words) {
      set.add(w.ja);
      if (w.ex) set.add(w.ex);
    }
  }
  return Array.from(set);
}
