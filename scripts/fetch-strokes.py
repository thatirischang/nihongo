#!/usr/bin/env python3
"""下载 KanjiVG 的 96 个 kana SVG 到 images/strokes/ — 用于书写练习的笔顺动画。

KanjiVG 是开源 CC-BY-SA 3.0 数据集，每个字符的 SVG 文件按笔顺排好 path 元素。
URL 格式: https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/{codepoint:05x}.svg
"""

import asyncio
import ssl
import urllib.request
from pathlib import Path

# macOS Python 缺系统根证书 — 用 certifi
try:
    import certifi
    _SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    _SSL_CTX = ssl._create_unverified_context()

ROOT = Path(__file__).parent.parent
OUT_DIR = ROOT / "images" / "strokes"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# 平假名 + 片假名（含古假名 ゐ ゑ ヰ ヱ）
HIRAGANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんゐゑ"
KATAKANA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンヰヱ"

URL_TMPL = "https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/{:05x}.svg"


def fetch_one(char: str) -> bool:
    out = OUT_DIR / f"{char}.svg"
    if out.exists() and out.stat().st_size > 0:
        return False
    cp = ord(char)
    url = URL_TMPL.format(cp)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15, context=_SSL_CTX) as r:
            data = r.read()
        text = data.decode("utf-8")
        # KanjiVG SVG 含 DTD + ATTLIST 内子集，浏览器 XML parser 不支持。
        # 用 regex 整段删掉 <!DOCTYPE ... ]>
        import re
        text = re.sub(r"<!DOCTYPE\s+svg[^[]*\[[\s\S]*?\]>\s*", "", text)
        text = re.sub(r"<!DOCTYPE\s+svg[^>]*>\s*", "", text)
        # 在 <svg> 根元素上加 kvg 命名空间声明（KanjiVG 用 kvg: 前缀但靠 DTD 声明，删 DTD 后浏览器报错）
        text = re.sub(
            r"<svg(\s[^>]*)>",
            r'<svg\1 xmlns:kvg="http://kanjivg.tagaini.net">',
            text,
            count=1,
        )
        out.write_text(text, encoding="utf-8")
        return True
    except Exception as e:
        print(f"  ✗ {char} (U+{cp:04X}): {e}")
        return False


def main():
    chars = list(HIRAGANA) + list(KATAKANA)
    fetched = skipped = 0
    for i, ch in enumerate(chars, 1):
        if fetch_one(ch):
            fetched += 1
            print(f"  [{i}/{len(chars)}] {ch} (U+{ord(ch):04X}) ✓")
        else:
            skipped += 1
    print(f"\n✓ Done. {fetched} fetched, {skipped} skipped (already exist or failed)")


if __name__ == "__main__":
    main()
