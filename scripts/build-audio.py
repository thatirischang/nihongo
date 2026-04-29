#!/usr/bin/env python3
"""Generate all kana MP3 files via Microsoft Edge-TTS (ja-JP-NanamiNeural).

One-time build. Run from repo root: python3 scripts/build-audio.py
"""

import asyncio
import sys
from pathlib import Path

import edge_tts

VOICE = "ja-JP-NanamiNeural"
OUT_DIR = Path(__file__).parent.parent / "audio" / "kana"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# (romaji_filename, kana_to_speak)
# 平假名和片假名同字符同发音 → 用平假名朗读，文件共享
KANA = [
    # 清音 + ん
    ("a","あ"),("i","い"),("u","う"),("e","え"),("o","お"),
    ("ka","か"),("ki","き"),("ku","く"),("ke","け"),("ko","こ"),
    ("sa","さ"),("shi","し"),("su","す"),("se","せ"),("so","そ"),
    ("ta","た"),("chi","ち"),("tsu","つ"),("te","て"),("to","と"),
    ("na","な"),("ni","に"),("nu","ぬ"),("ne","ね"),("no","の"),
    ("ha","は"),("hi","ひ"),("fu","ふ"),("he","へ"),("ho","ほ"),
    ("ma","ま"),("mi","み"),("mu","む"),("me","め"),("mo","も"),
    ("ya","や"),("yu","ゆ"),("yo","よ"),
    ("ra","ら"),("ri","り"),("ru","る"),("re","れ"),("ro","ろ"),
    ("wa","わ"),("wo","を"),
    ("n","ん"),
    # 古假名（伊呂波歌里出现）
    ("wi","ゐ"),("we","ゑ"),
    # 浊音
    ("ga","が"),("gi","ぎ"),("gu","ぐ"),("ge","げ"),("go","ご"),
    ("za","ざ"),("ji","じ"),("zu","ず"),("ze","ぜ"),("zo","ぞ"),
    ("da","だ"),("de","で"),("do","ど"),
    ("ba","ば"),("bi","び"),("bu","ぶ"),("be","べ"),("bo","ぼ"),
    # 半浊音
    ("pa","ぱ"),("pi","ぴ"),("pu","ぷ"),("pe","ぺ"),("po","ぽ"),
    # 拗音
    ("kya","きゃ"),("kyu","きゅ"),("kyo","きょ"),
    ("sha","しゃ"),("shu","しゅ"),("sho","しょ"),
    ("cha","ちゃ"),("chu","ちゅ"),("cho","ちょ"),
    ("nya","にゃ"),("nyu","にゅ"),("nyo","にょ"),
    ("hya","ひゃ"),("hyu","ひゅ"),("hyo","ひょ"),
    ("mya","みゃ"),("myu","みゅ"),("myo","みょ"),
    ("rya","りゃ"),("ryu","りゅ"),("ryo","りょ"),
    ("gya","ぎゃ"),("gyu","ぎゅ"),("gyo","ぎょ"),
    ("ja","じゃ"),("ju","じゅ"),("jo","じょ"),
    ("bya","びゃ"),("byu","びゅ"),("byo","びょ"),
    ("pya","ぴゃ"),("pyu","ぴゅ"),("pyo","ぴょ"),
]

# 伊呂波歌全文（朗读全文按钮用）
IROHA_FULL = "いろはにほへと、ちりぬるを。わかよたれそ、つねならむ。うゐのおくやま、けふこえて。あさきゆめみし、ゑひもせす。"

IROHA_OUT = OUT_DIR.parent  # audio/iroha-full.mp3 直接放 audio/ 下

# 日语构成页里出现的所有词/句 — 点击播放
# 文件名 = 词本身（UTF-8）。浏览器自动 URL-encode。
WORDS = [
    # 平假名词
    "わたし", "です", "が", "これ", "どこ", "きれい",
    "ひらがな", "カタカナ",
    "ゆき", "ゆうき",
    # 片假名外来词
    "コーヒー", "パソコン", "アルバイト", "ラーメン",
    "ワンワン", "キラキラ", "ドキドキ",
    "サクラ", "ネコ",
    "ニューヨーク", "トヨタ",
    "パン", "ピアノ", "ぱちぱち", "いっぱい",
    "ベッド", "ゲーム", "パーティー",
    # 汉字单字
    "私", "山", "水", "人", "桜", "漢字",
    # 汉字读音（音/训）
    "やま", "さん", "みず", "すい", "ひと", "じん", "にん", "さくら",
    # 复合词 / 例句
    "山口", "富士山", "やまぐち", "ふじさん",
    "学校", "がっこう", "大学", "だいがく",
    "手紙", "てがみ", "青空", "あおぞら",
    "食べる", "たべる", "食べた", "食べない",
    "教室", "きょうしつ", "写真", "しゃしん", "切手", "きって",
    # 长音例
    "おばさん", "おばあさん",
    "おかあさん", "おにいさん", "くうき", "おねえさん", "せんせい", "おとうさん", "おおきい",
    # 关键术语
    "濁音", "だくてん", "半濁音", "はんだくてん",
    "拗音", "促音", "長音",
    # demo 句子
    "私はコーヒーを飲む",
    # 新增（发音系统 + 大局段）
    "東京", "とうきょう", "ローマ字",
    "飲む", "飲", "橋", "箸",
    "ストライク", "ブライアン",
    "あ", "い", "う", "え", "お",
    "濁点", "半濁点",
    # 實戰 — 20 句日常 phrases
    "こんにちは", "おはようございます", "こんばんは", "おやすみなさい",
    "ありがとうございます", "すみません", "はじめまして",
    "よろしくお願いします", "お元気ですか", "はい", "いいえ",
    "わかりました", "わかりません", "もう一度お願いします",
    "日本語が少しわかります", "トイレはどこですか", "いくらですか",
    "これをください", "おいしいです", "さようなら",
    # N5 100 詞 - 人物
    "あなた", "彼", "彼女", "友達", "家族", "お父さん", "お母さん", "先生", "学生",
    # N5 - 數字
    "ゼロ", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
    # N5 - 時間
    "今日", "明日", "昨日", "今", "朝", "夜", "時間", "週", "月", "年",
    # N5 - 食物
    "お茶", "ご飯", "肉", "魚", "野菜", "果物", "ビール",
    # N5 - 地點
    "家", "会社", "駅", "店", "病院", "銀行", "公園", "国", "町",
    # N5 - 動詞
    "食べる", "飲む", "見る", "聞く", "話す", "読む", "書く", "行く", "来る", "帰る", "買う", "する", "ある", "いる",
    # N5 - 形容詞
    "大きい", "小さい", "新しい", "古い", "高い", "安い", "暑い", "寒い", "面白い",
    # N5 - 顏色
    "赤", "青", "白", "黒", "黄色",
    # N5 - 方位
    "上", "下", "前", "後ろ", "右", "左", "中", "外",
    # N5 - 副詞 / 其他
    "とても", "少し", "たくさん", "全部", "また", "もう", "まだ", "好き", "嫌い", "可愛い", "綺麗", "元気",
    "電車", "お金", "車", "天気", "雨", "雪",
    # 助詞速覽表 — 例句
    "私は学生", "雨が降る", "本を読む", "学校に行く", "家で食べる", "友達と", "私も", "私の本",
    # 5 分鐘讀第一句 — demo 句
    "私はブライアンです", "ブライアン",
    "はじめまして。私はブライアンです。",
    "初めまして",
]
WORDS_DIR = IROHA_OUT / "words"
WORDS_DIR.mkdir(parents=True, exist_ok=True)


async def synth(text: str, out_path: Path, rate: str = "+0%", force: bool = False) -> None:
    if not force and out_path.exists() and out_path.stat().st_size > 0:
        return
    communicate = edge_tts.Communicate(text, VOICE, rate=rate)
    await communicate.save(str(out_path))


async def synth_with_timings(text: str, out_path: Path, timings_path: Path, rate: str = "+0%") -> None:
    """Generate audio + capture WordBoundary timings to JSON."""
    import json
    communicate = edge_tts.Communicate(text, VOICE, rate=rate)
    timings = []
    with open(out_path, "wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # offset/duration in 100-ns units (1e-7 sec) → convert to ms
                timings.append({
                    "offset_ms": chunk["offset"] / 10000,
                    "duration_ms": chunk["duration"] / 10000,
                    "text": chunk["text"],
                })
    timings_path.write_text(json.dumps(timings, ensure_ascii=False, indent=2), encoding="utf-8")


async def main() -> int:
    total = len(KANA) + 1  # +1 for iroha-full
    print(f"→ Generating {total} audio files via {VOICE}")
    print(f"  output: {OUT_DIR}")

    # Force regenerate kana at slower rate (-25%) + 重复 2 遍 + 句号停顿
    # 句号「。」比逗号「、」停顿更长 (~3s 总时长 vs ~2s)
    # SSML <break> 实测被 Edge-TTS 加得太长 (5s+)，弃用
    KANA_RATE = "-25%"
    done = 0
    for romaji, kana in KANA:
        out = OUT_DIR / f"{romaji}.mp3"
        # 「い。い」 → 两次发音 + 句末停顿（比逗号长约一倍）
        speak_text = f"{kana}。{kana}"
        try:
            # force=False so existing files skip — kana already regenerated as v0.8
            await synth(speak_text, out, rate=KANA_RATE, force=False)
            done += 1
            sys.stdout.write(f"\r  [{done}/{total}] {romaji} ({kana}×2 with period) @ {KANA_RATE}    ")
            sys.stdout.flush()
        except Exception as e:
            print(f"\n  ✗ {romaji} ({kana}): {e}")
            return 1
        await asyncio.sleep(0.2)  # 间隔，避免被 Microsoft 临时 block

    # 伊呂波歌整首 + WordBoundary timings (用于点击高亮同步)
    iroha_out = IROHA_OUT / "iroha-full.mp3"
    iroha_timings = IROHA_OUT / "iroha-timings.json"
    try:
        await synth_with_timings(IROHA_FULL, iroha_out, iroha_timings, rate="-10%")
        done += 1
        sys.stdout.write(f"\r  [{done}/{total}] iroha-full + timings → {iroha_out.name}      ")
        sys.stdout.flush()
    except Exception as e:
        print(f"\n  ✗ iroha-full: {e}")
        return 1

    # 词 / 句
    print(f"\n→ Generating {len(WORDS)} word/phrase audio files")
    wdone = 0
    for w in WORDS:
        out = WORDS_DIR / f"{w}.mp3"
        try:
            await synth(w, out)
            wdone += 1
            sys.stdout.write(f"\r  [{wdone}/{len(WORDS)}] {w}                              ")
            sys.stdout.flush()
        except Exception as e:
            print(f"\n  ✗ {w}: {e}")
        await asyncio.sleep(0.2)

    print(f"\n✓ Done. kana={done}/{total} words={wdone}/{len(WORDS)}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
