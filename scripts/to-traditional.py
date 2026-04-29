#!/usr/bin/env python3
"""把 index.html 和 js/data.js 中的中文（解说部分）转为香港繁体。
保留日文示例 — 不动 .speak / .ja-big 内的内容、data-speak 属性、ruby 内的 kanji。
保留 audio 文件名映射 — Japanese kanji 必须维持日式形（学校 不能变 學校）。
"""

import re
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Comment
from opencc import OpenCC

cc = OpenCC('s2hk')  # simplified → 香港繁体

ROOT = Path(__file__).parent.parent

# 这些 class 包裹的内容是日文，不能转换
# kanji-hl / kata-hl 不在此列：它们只是颜色高亮，里面可能是中文（如「蓝字」）
SKIP_CLASSES = {'speak', 'ja-big'}
SKIP_TAGS = {'rt', 'script', 'style'}


def in_japanese_context(elem):
    """判断 text node 是否在日文上下文里。"""
    cur = elem.parent if hasattr(elem, 'parent') else None
    while cur is not None and cur.name is not None:
        if cur.name in SKIP_TAGS:
            return True
        cls = cur.get('class', []) or []
        if any(c in SKIP_CLASSES for c in cls):
            return True
        cur = cur.parent
    return False


def convert_html(path: Path) -> int:
    src = path.read_text(encoding='utf-8')
    soup = BeautifulSoup(src, 'html.parser')
    n = 0
    for node in list(soup.find_all(string=True)):
        if isinstance(node, Comment):
            continue  # 不转换 HTML 注释，避免丢掉 <!-- --> 标记
        if in_japanese_context(node):
            continue
        text = str(node)
        if not text.strip():
            continue
        new = cc.convert(text)
        if new != text:
            node.replace_with(new)
            n += 1
    path.write_text(str(soup), encoding='utf-8')
    return n


def convert_js_translation(path: Path) -> int:
    """data.js 里的 IROHA_TRANSLATION 是中文意译，转繁体。
    不动 IROHA_LINES / GOJUON 等日文数据。"""
    src = path.read_text(encoding='utf-8')
    pat = re.compile(r"(const IROHA_TRANSLATION = `)([^`]+)(`;)")
    m = pat.search(src)
    if not m:
        return 0
    before, body, after = m.group(1), m.group(2), m.group(3)
    new_body = cc.convert(body)
    if new_body == body:
        return 0
    new_src = src[:m.start()] + before + new_body + after + src[m.end():]
    path.write_text(new_src, encoding='utf-8')
    return 1


if __name__ == '__main__':
    n_html = convert_html(ROOT / 'index.html')
    n_js = convert_js_translation(ROOT / 'js' / 'data.js')
    print(f"✓ index.html: {n_html} text nodes converted")
    print(f"✓ data.js IROHA_TRANSLATION: {n_js} block converted")
