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


async def synth(text: str, out_path: Path) -> None:
    if out_path.exists() and out_path.stat().st_size > 0:
        return
    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(str(out_path))


async def main() -> int:
    total = len(KANA) + 1  # +1 for iroha-full
    print(f"→ Generating {total} audio files via {VOICE}")
    print(f"  output: {OUT_DIR}")

    done = 0
    for romaji, kana in KANA:
        out = OUT_DIR / f"{romaji}.mp3"
        try:
            await synth(kana, out)
            done += 1
            sys.stdout.write(f"\r  [{done}/{total}] {romaji} ({kana}) → {out.name}    ")
            sys.stdout.flush()
        except Exception as e:
            print(f"\n  ✗ {romaji} ({kana}): {e}")
            return 1
        await asyncio.sleep(0.2)  # 间隔，避免被 Microsoft 临时 block

    # 伊呂波歌整首
    iroha_out = IROHA_OUT / "iroha-full.mp3"
    try:
        await synth(IROHA_FULL, iroha_out)
        done += 1
        sys.stdout.write(f"\r  [{done}/{total}] iroha-full → {iroha_out.name}              ")
        sys.stdout.flush()
    except Exception as e:
        print(f"\n  ✗ iroha-full: {e}")
        return 1

    print(f"\n✓ Done. {done}/{total} files in audio/")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
