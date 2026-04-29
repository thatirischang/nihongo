// 笔顺动画引擎
// 用 KanjiVG 的 SVG 数据。每个 SVG 里 <path> 元素按笔顺排序。
// 用 stroke-dasharray + stroke-dashoffset 把笔画从无到有「画」出来。

const _strokeSvgCache = new Map();

async function _loadStrokeSvg(kana) {
  if (_strokeSvgCache.has(kana)) return _strokeSvgCache.get(kana);
  try {
    const res = await fetch(`images/strokes/${encodeURIComponent(kana)}.svg`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    _strokeSvgCache.set(kana, text);
    return text;
  } catch (err) {
    console.warn('stroke svg load failed:', kana, err);
    return null;
  }
}

// 把 SVG 注入容器；返回包含的 path 数组（按笔顺）
function _injectSvg(container, svgText) {
  // KanjiVG 文件以 <?xml?> 开头 + 含 xmlns:kvg 命名空间，innerHTML 可能解析不完整
  // 用 DOMParser 把 SVG 解析为独立 document，再 import 到目标
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const parsedSvg = doc.documentElement;
  if (!parsedSvg || parsedSvg.tagName.toLowerCase() !== 'svg') {
    console.warn('SVG parse failed:', parsedSvg?.tagName);
    container.innerHTML = '';
    return [];
  }
  container.innerHTML = '';
  const svg = document.importNode(parsedSvg, true);
  // KanjiVG SVG 默认尺寸 109×109，调整为撑满容器
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  container.appendChild(svg);
  // 隐藏 KanjiVG 的笔顺数字 group（默认有，杂乱）
  svg.querySelectorAll('[id*="StrokeNumbers"]').forEach(g => g.style.display = 'none');
  // 找出笔顺 path
  const paths = svg.querySelectorAll('path');
  paths.forEach(p => {
    p.style.fill = 'none';
    p.style.stroke = '#1a1a1a';
    p.style.strokeWidth = '4';
    p.style.strokeLinecap = 'round';
    p.style.strokeLinejoin = 'round';
  });
  return Array.from(paths);
}

// 动画播放每一笔
// 返回 Promise：动画结束后 resolve
async function animateStrokes(kana, container, opts = {}) {
  const speedMsPerStroke = opts.speed || 700;  // 每笔 ms
  const gapMs = opts.gap || 200;               // 笔间停顿
  const text = await _loadStrokeSvg(kana);
  if (!text) {
    container.innerHTML = `<div class="stroke-fallback">「${kana}」 暂无笔顺数据</div>`;
    return;
  }
  const paths = _injectSvg(container, text);
  if (!paths.length) return;

  // 初始状态：所有 path 隐藏
  for (const p of paths) {
    const len = p.getTotalLength();
    p.style.strokeDasharray = String(len);
    p.style.strokeDashoffset = String(len);
    p.style.transition = 'none';
  }

  // 强制 reflow 以应用初始状态
  void container.offsetHeight;

  // 逐笔画
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i];
    p.style.transition = `stroke-dashoffset ${speedMsPerStroke}ms ease-out`;
    p.style.strokeDashoffset = '0';
    await new Promise(r => setTimeout(r, speedMsPerStroke + gapMs));
  }
}

// 立刻显示完整字（不动画）— 给「显示成品」按钮用
async function showStrokeFinal(kana, container) {
  const text = await _loadStrokeSvg(kana);
  if (!text) return;
  const paths = _injectSvg(container, text);
  for (const p of paths) {
    p.style.strokeDasharray = '';
    p.style.strokeDashoffset = '';
  }
}

function clearStrokes(container) {
  container.innerHTML = '';
}
