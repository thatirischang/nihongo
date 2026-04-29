// 主应用逻辑：tab 切换、网格渲染、伊呂波歌、随机练习、手写画板

// ═══ Tab 切换 ═══
let currentScript = 'h';  // 'h' 平假名 | 'k' 片假名

document.querySelectorAll('.tabs .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs .tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + btn.dataset.tab).classList.add('active');
  });
});

// 子 tab（平/片切换）— 每个 page 内独立
document.querySelectorAll('.sub-tabs').forEach(group => {
  group.querySelectorAll('.sub-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentScript = btn.dataset.script;
      renderGojuon();
      renderIroha();
    });
  });
});

// ═══ 渲染五十音表 ═══
function _kanaCell(cell, opts = {}) {
  if (!cell) {
    const div = document.createElement('div');
    div.className = 'kana-cell empty';
    return div;
  }
  const div = document.createElement('div');
  div.className = 'kana-cell' + (opts.youon ? ' youon' : '') + (opts.archaic ? ' archaic' : '');
  const etymon = currentScript === 'h' ? cell.eh : cell.ek;
  div.innerHTML = `
    ${etymon ? `<div class="kana-etymon" title="字源：${etymon}">${etymon}</div>` : ''}
    <div class="kana-glyph">${currentScript === 'h' ? cell.h : cell.k}</div>
    <div class="kana-romaji">${cell.r}</div>
  `;
  div.addEventListener('click', () => {
    document.querySelectorAll('.kana-cell.playing').forEach(c => c.classList.remove('playing'));
    div.classList.add('playing');
    setTimeout(() => div.classList.remove('playing'), 600);
    playKana(cell);
  });
  return div;
}

function _renderTable(containerId, table, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  for (const row of table) {
    for (const cell of row) {
      container.appendChild(_kanaCell(cell, opts));
    }
  }
}

function renderGojuon() {
  _renderTable('grid-seion', GOJUON);
  // 古假名
  const archaic = document.getElementById('grid-archaic');
  archaic.innerHTML = '';
  // 加 3 个空占位让 ゐ ゑ 居中（i 列 + e 列对齐）
  archaic.appendChild(_kanaCell(null));
  archaic.appendChild(_kanaCell(ARCHAIC[0], { archaic: true }));
  archaic.appendChild(_kanaCell(null));
  archaic.appendChild(_kanaCell(ARCHAIC[1], { archaic: true }));
  archaic.appendChild(_kanaCell(null));
  _renderTable('grid-dakuon', DAKUON);
  _renderTable('grid-handakuon', HANDAKUON);
  _renderTable('grid-youon', YOUON, { youon: true });
}

// ═══ 伊呂波歌 ═══
// 全局：伊呂波字符 DOM 引用，按 charIndex 排列（不含 ん）— 用于全文朗读时同步高亮
let _irohaCharEls = [];

function renderIroha() {
  const container = document.getElementById('iroha-poem');
  container.innerHTML = '';
  _irohaCharEls = [];
  let idx = 0;
  for (const line of IROHA_LINES) {
    const lineEl = document.createElement('div');
    lineEl.className = 'iroha-line';
    for (const c of line) {
      const span = document.createElement('span');
      span.className = 'iroha-char';
      if (c.archaic) span.classList.add('archaic');
      if (c.modern) span.classList.add('modern');
      span.textContent = currentScript === 'h' ? c.h : c.k;
      // 给非 modern 字符（即朗读音频里有的 47 字）记 charIndex，用于同步高亮
      if (!c.modern) {
        span.dataset.charIndex = String(idx);
        _irohaCharEls[idx] = span;
        idx++;
      }
      span.addEventListener('click', () => {
        document.querySelectorAll('.iroha-char.playing').forEach(x => x.classList.remove('playing'));
        span.classList.add('playing');
        setTimeout(() => span.classList.remove('playing'), 600);
        playKana(c);
      });
      lineEl.appendChild(span);
    }
    container.appendChild(lineEl);
  }
  document.getElementById('iroha-translation').textContent = IROHA_TRANSLATION;
}

const btnIrohaPlay = document.getElementById('btn-iroha-play');
const btnIrohaPause = document.getElementById('btn-iroha-pause');
const btnIrohaStop = document.getElementById('btn-iroha-stop');

function _clearIrohaHighlight() {
  document.querySelectorAll('.iroha-char.playing').forEach(x => x.classList.remove('playing'));
}

function _setIrohaUiState(state) {
  // state: 'playing' | 'paused' | 'stopped'
  if (state === 'playing') {
    btnIrohaPlay.hidden = true;
    btnIrohaPause.hidden = false;
    btnIrohaPause.textContent = '⏸ 暫停';
    btnIrohaStop.hidden = false;
  } else if (state === 'paused') {
    btnIrohaPlay.hidden = true;
    btnIrohaPause.hidden = false;
    btnIrohaPause.textContent = '▶ 繼續';
    btnIrohaStop.hidden = false;
  } else { // stopped
    btnIrohaPlay.hidden = false;
    btnIrohaPause.hidden = true;
    btnIrohaStop.hidden = true;
    _clearIrohaHighlight();
  }
}

btnIrohaPlay.addEventListener('click', () => {
  playIrohaFull({
    onChar: (idx) => {
      _clearIrohaHighlight();
      const el = _irohaCharEls[idx];
      if (el) {
        el.classList.add('playing');
        // 自动滚动让高亮字保持在视野内
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    },
    onState: _setIrohaUiState,
    onEnd: () => _setIrohaUiState('stopped'),
  });
});

btnIrohaPause.addEventListener('click', () => {
  if (isIrohaPaused()) resumeIroha();
  else pauseIroha();
});

btnIrohaStop.addEventListener('click', () => {
  stopIroha();
});

// ═══ 随机练习 ═══
const SCOPES = {
  all: () => [...GOJUON.flat().filter(Boolean), ...ARCHAIC, ...DAKUON.flat(), ...HANDAKUON.flat(), ...YOUON.flat()],
  seion: () => [...GOJUON.flat().filter(Boolean), ...ARCHAIC],
  dakuon: () => [...DAKUON.flat(), ...HANDAKUON.flat()],
  youon: () => [...YOUON.flat()]
};

let _practiceCurrent = null;
let _practiceShowRomaji = false;
let _practiceLastRomaji = null;

function pickRandom() {
  const scope = document.getElementById('practice-scope').value;
  const pool = SCOPES[scope]();
  let pick;
  let tries = 0;
  do {
    pick = pool[Math.floor(Math.random() * pool.length)];
    tries++;
  } while (pick.r === _practiceLastRomaji && tries < 8);
  _practiceLastRomaji = pick.r;
  _practiceCurrent = pick;

  const scriptMode = document.getElementById('practice-script').value;
  const useScript = scriptMode === 'mix' ? (Math.random() < 0.5 ? 'h' : 'k') : scriptMode;
  const glyph = useScript === 'h' ? pick.h : pick.k;

  const glyphEl = document.getElementById('practice-glyph');
  glyphEl.textContent = glyph;
  glyphEl.classList.remove('placeholder');
  glyphEl.dataset.glyph = glyph;

  document.getElementById('practice-romaji').textContent = _practiceShowRomaji ? pick.r : '';

  // 更新画板参考字
  const guide = document.getElementById('canvas-guide');
  guide.textContent = glyph;

  // 自动发音 + 清空画板
  playKana(pick);
  clearCanvas();
}

document.getElementById('btn-random').addEventListener('click', pickRandom);

document.getElementById('btn-show-romaji').addEventListener('click', () => {
  _practiceShowRomaji = !_practiceShowRomaji;
  document.getElementById('btn-show-romaji').textContent = _practiceShowRomaji ? '隐藏罗马字' : '显示罗马字';
  if (_practiceCurrent) {
    document.getElementById('practice-romaji').textContent = _practiceShowRomaji ? _practiceCurrent.r : '';
  }
});

document.getElementById('btn-replay').addEventListener('click', () => {
  if (_practiceCurrent) playKana(_practiceCurrent);
});

document.getElementById('practice-glyph').addEventListener('click', () => {
  if (_practiceCurrent) playKana(_practiceCurrent);
});

// ═══ 书写画板 ═══
const canvas = document.getElementById('write-canvas');
const ctx = canvas.getContext('2d');
let _drawing = false;
let _lastX = 0, _lastY = 0;

function _setupCanvas() {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#1a1a1a';
}
_setupCanvas();

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function _coords(e) {
  const rect = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return {
    x: (t.clientX - rect.left) * (canvas.width / rect.width),
    y: (t.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function _start(e) {
  e.preventDefault();
  _drawing = true;
  const { x, y } = _coords(e);
  _lastX = x; _lastY = y;
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function _move(e) {
  if (!_drawing) return;
  e.preventDefault();
  const { x, y } = _coords(e);
  ctx.lineTo(x, y);
  ctx.stroke();
  _lastX = x; _lastY = y;
}

function _end(e) {
  if (!_drawing) return;
  e.preventDefault();
  _drawing = false;
}

canvas.addEventListener('mousedown', _start);
canvas.addEventListener('mousemove', _move);
canvas.addEventListener('mouseup', _end);
canvas.addEventListener('mouseleave', _end);
canvas.addEventListener('touchstart', _start, { passive: false });
canvas.addEventListener('touchmove', _move, { passive: false });
canvas.addEventListener('touchend', _end);

document.getElementById('btn-clear').addEventListener('click', clearCanvas);
document.getElementById('btn-toggle-guide').addEventListener('click', () => {
  const g = document.getElementById('canvas-guide');
  g.classList.toggle('hidden');
  document.getElementById('btn-toggle-guide').textContent =
    g.classList.contains('hidden') ? '显示参考字' : '隐藏参考字';
});

// ═══ 日语构成页：点击 .speak 元素朗读 ═══
document.addEventListener('click', (e) => {
  const el = e.target.closest('.speak');
  if (!el) return;
  const text = el.dataset.speak || el.textContent.trim();
  el.classList.add('speak-playing');
  setTimeout(() => el.classList.remove('speak-playing'), 800);
  playPhrase(text);
});

// ═══ 初始化 ═══
renderGojuon();
renderIroha();
document.getElementById('practice-glyph').classList.add('placeholder');
