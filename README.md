# 日本語入門 — 五十音 · 伊呂波歌

零基础日语入门单页站，专为中文学习者。

- **五十音表**：清音 / 浊音 / 半浊音 / 拗音 + 古假名（ゐ ゑ）。每个假名格子左上角显示**字源汉字** — 会汉字就会假名。
- **伊呂波歌**：47 字 + ん 现代追加。点单字读单音，整首朗读全文。
- **日语构成**：讲清楚平假名 / 片假名 / 汉字三套文字怎么混写。
- **随机练习**：抽假名 → 大字显示 + 自动发音 + 田字格手写画板。

## 技术

- 纯静态 HTML / CSS / 原生 JS。无构建。无依赖。
- 字体：[Yuji Syuku](https://fonts.google.com/specimen/Yuji+Syuku)（Google Fonts，免费毛笔楷书）。
- 发音：Microsoft Edge-TTS `ja-JP-NanamiNeural` 预生成 MP3。

## 本地开发

```sh
# 直接打开
open index.html

# 或起 server（如需测试音频路径）
python3 -m http.server 8765
```

## 重新生成音频

```sh
pip install edge-tts
python3 scripts/build-audio.py
```

105 个 MP3 文件（~960KB），约 5 分钟。

## 字源数据

每个假名都源自一个汉字，本站每格左上角显示其字源（平假名 / 片假名 各自的源字）。
数据沿用学术界共识，详见 `js/data.js` 中 `eh` / `ek` 字段。

## 部署

GitHub Pages：在仓库 Settings → Pages 选 `main` branch / root，访问 `https://thatirischang.github.io/nihongo/`。

## License

代码 MIT。字源汉字数据为公共知识。Yuji Syuku 字体 OFL。Edge-TTS 生成的音频用于教学非商业用途。

---

由 [Iris Chang Labs](https://irischanglabs.com) 制作。
