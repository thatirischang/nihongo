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

// ═══ 五十音搜索 ═══
function _kanaCellMatchesQuery(cellEl, q) {
  if (!q) return null;
  q = q.trim().toLowerCase();
  if (!q) return null;
  // cellEl: kana-cell 內 .kana-glyph (h or k), .kana-romaji, .kana-etymon
  const glyph = cellEl.querySelector('.kana-glyph')?.textContent?.trim() || '';
  const romaji = cellEl.querySelector('.kana-romaji')?.textContent?.trim().toLowerCase() || '';
  const etymon = cellEl.querySelector('.kana-etymon')?.textContent?.trim() || '';
  // 任一字段含 q 就算匹配
  return glyph.includes(q) || romaji.includes(q) || etymon.includes(q) ||
         // 也匹配對應的另一個 script (h ↔ k)，靠 data attr 不存就 fallback
         q === glyph || q === romaji || q === etymon;
}

function applyKanaSearch(q) {
  const cells = document.querySelectorAll('#page-gojuon .kana-cell:not(.empty)');
  q = (q || '').trim().toLowerCase();
  if (!q) {
    cells.forEach(c => { c.classList.remove('search-match', 'search-dim'); });
    document.getElementById('kana-search-clear').hidden = true;
    return;
  }
  let matched = 0;
  cells.forEach(c => {
    if (_kanaCellMatchesQuery(c, q)) {
      c.classList.add('search-match');
      c.classList.remove('search-dim');
      matched++;
    } else {
      c.classList.remove('search-match');
      c.classList.add('search-dim');
    }
  });
  document.getElementById('kana-search-clear').hidden = false;
  // 滾到第一個匹配
  const first = document.querySelector('#page-gojuon .kana-cell.search-match');
  if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('kana-search')?.addEventListener('input', (e) => applyKanaSearch(e.target.value));
document.getElementById('kana-search-clear')?.addEventListener('click', () => {
  const inp = document.getElementById('kana-search');
  inp.value = '';
  applyKanaSearch('');
  inp.focus();
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
  const hasEtymology = cell.eh && cell.ek;
  div.innerHTML = `
    ${etymon ? `<div class="kana-etymon" title="字源：${etymon}">${etymon}</div>` : ''}
    ${hasEtymology ? `<button class="kana-info" title="字源解析" aria-label="字源解析">ⓘ</button>` : ''}
    <button class="kana-stroke-btn" title="筆順示範" aria-label="筆順示範">✍</button>
    <div class="kana-glyph">${currentScript === 'h' ? cell.h : cell.k}</div>
    <div class="kana-romaji">${cell.r}</div>
  `;
  div.addEventListener('click', (e) => {
    if (e.target.classList.contains('kana-info')) {
      openEtymologyModal(cell);
      return;
    }
    if (e.target.classList.contains('kana-stroke-btn')) {
      openStrokeModal(cell);
      return;
    }
    document.querySelectorAll('.kana-cell.playing').forEach(c => c.classList.remove('playing'));
    div.classList.add('playing');
    setTimeout(() => div.classList.remove('playing'), 600);
    playKana(cell);
    // 同步更新右側書寫練習板的目標字
    if (window._setGojuonWritePadTarget) window._setGojuonWritePadTarget(cell);
  });
  return div;
}

// 笔顺示范 modal
function openStrokeModal(cell) {
  const glyph = currentScript === 'h' ? cell.h : cell.k;
  document.getElementById('stroke-modal-glyph').textContent = `${cell.h} / ${cell.k}`;
  document.getElementById('stroke-modal-romaji').textContent = cell.r;
  const box = document.getElementById('stroke-modal-canvas');
  box.innerHTML = '';
  document.getElementById('stroke-modal').hidden = false;
  // 動畫
  animateStrokes(glyph, box);
  document.getElementById('stroke-modal-replay').onclick = () => {
    box.innerHTML = '';
    animateStrokes(glyph, box);
  };
  document.getElementById('stroke-modal-play').onclick = () => playKana(cell);
}
function closeStrokeModal() { document.getElementById('stroke-modal').hidden = true; }
document.getElementById('stroke-close')?.addEventListener('click', closeStrokeModal);
document.getElementById('stroke-backdrop')?.addEventListener('click', closeStrokeModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('stroke-modal').hidden) closeStrokeModal();
});

// ═══ 字源解析 modal ═══
function openEtymologyModal(cell) {
  const ety = getEtymology(cell.r, cell.eh, cell.ek);
  document.getElementById('ety-h-glyph').textContent = cell.h || '—';
  document.getElementById('ety-k-glyph').textContent = cell.k || '—';
  document.getElementById('ety-h-kanji').textContent = ety.h_kanji;
  document.getElementById('ety-k-kanji').textContent = ety.k_kanji;
  document.getElementById('ety-h-note').textContent = ety.h_note;
  document.getElementById('ety-k-note').textContent = ety.k_note;
  document.getElementById('ety-romaji').textContent = cell.r;
  document.getElementById('ety-modal').hidden = false;
  document.getElementById('ety-play').onclick = () => playKana(cell);
}
function closeEtymologyModal() {
  document.getElementById('ety-modal').hidden = true;
}
document.getElementById('ety-close').addEventListener('click', closeEtymologyModal);
document.querySelector('.ety-backdrop').addEventListener('click', closeEtymologyModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('ety-modal').hidden) closeEtymologyModal();
});

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
      span.innerHTML = `
        <span class="iroha-glyph">${currentScript === 'h' ? c.h : c.k}</span>
        <span class="iroha-romaji">${c.r}</span>
      `;
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
  const btnIrohaSing = document.getElementById('btn-iroha-sing');
  // state: 'playing' | 'paused' | 'stopped'
  if (state === 'playing') {
    btnIrohaPlay.hidden = true;
    if (btnIrohaSing) btnIrohaSing.hidden = true;
    btnIrohaPause.hidden = false;
    btnIrohaPause.textContent = '⏸ 暫停';
    btnIrohaStop.hidden = false;
  } else if (state === 'paused') {
    btnIrohaPlay.hidden = true;
    if (btnIrohaSing) btnIrohaSing.hidden = true;
    btnIrohaPause.hidden = false;
    btnIrohaPause.textContent = '▶ 繼續';
    btnIrohaStop.hidden = false;
  } else { // stopped
    btnIrohaPlay.hidden = false;
    if (btnIrohaSing) btnIrohaSing.hidden = false;
    btnIrohaPause.hidden = true;
    btnIrohaStop.hidden = true;
    _clearIrohaHighlight();
  }
}

const _irohaCb = {
  onChar: (idx) => {
    _clearIrohaHighlight();
    const el = _irohaCharEls[idx];
    if (el) {
      el.classList.add('playing');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  },
  onState: _setIrohaUiState,
  onEnd: () => _setIrohaUiState('stopped'),
};

btnIrohaPlay.addEventListener('click', () => {
  playIrohaFull(_irohaCb);
});

document.getElementById('btn-iroha-sing')?.addEventListener('click', () => {
  playIrohaSung(_irohaCb);
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

// === 通用畫板初始化器（給 gojuon page 的副本畫板用） ===
function initDrawingCanvas(canvasEl) {
  const c = canvasEl.getContext('2d');
  c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 5; c.strokeStyle = '#1a1a1a';
  let drawing = false;
  function coords(e) {
    const rect = canvasEl.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return {
      x: (t.clientX - rect.left) * (canvasEl.width / rect.width),
      y: (t.clientY - rect.top) * (canvasEl.height / rect.height),
    };
  }
  function start(e) { e.preventDefault(); drawing = true; const {x,y} = coords(e); c.beginPath(); c.moveTo(x,y); }
  function move(e) { if (!drawing) return; e.preventDefault(); const {x,y} = coords(e); c.lineTo(x,y); c.stroke(); }
  function end(e) { if (!drawing) return; e.preventDefault(); drawing = false; }
  canvasEl.addEventListener('mousedown', start);
  canvasEl.addEventListener('mousemove', move);
  canvasEl.addEventListener('mouseup', end);
  canvasEl.addEventListener('mouseleave', end);
  canvasEl.addEventListener('touchstart', start, { passive: false });
  canvasEl.addEventListener('touchmove', move, { passive: false });
  canvasEl.addEventListener('touchend', end);
  return {
    clear: () => c.clearRect(0, 0, canvasEl.width, canvasEl.height),
    ctx: c,
  };
}

// === 五十音 page 副本畫板 ===
const gwCanvas = document.getElementById('gw-canvas');
let _gwCurrentCell = null;
if (gwCanvas) {
  const gw = initDrawingCanvas(gwCanvas);
  // 設置目標假名
  window._setGojuonWritePadTarget = function(cell) {
    if (!cell) return;
    _gwCurrentCell = cell;
    const glyph = currentScript === 'h' ? cell.h : cell.k;
    document.getElementById('gw-target-glyph').textContent = `${cell.h} / ${cell.k}`;
    document.getElementById('gw-target-romaji').textContent = cell.r;
    document.getElementById('gw-guide').textContent = glyph;
    gw.clear();
    document.getElementById('gw-stroke').innerHTML = '';
  };
  document.getElementById('gw-clear').addEventListener('click', () => {
    gw.clear();
    document.getElementById('gw-stroke').innerHTML = '';
  });
  document.getElementById('gw-toggle-guide').addEventListener('click', () => {
    const g = document.getElementById('gw-guide');
    g.classList.toggle('hidden');
    document.getElementById('gw-toggle-guide').textContent =
      g.classList.contains('hidden') ? '顯示參考字' : '隱藏參考字';
  });
  document.getElementById('gw-replay').addEventListener('click', () => {
    if (_gwCurrentCell) playKana(_gwCurrentCell);
  });
  document.getElementById('gw-show-stroke').addEventListener('click', async () => {
    if (!_gwCurrentCell) return;
    const glyph = currentScript === 'h' ? _gwCurrentCell.h : _gwCurrentCell.k;
    gw.clear();
    await animateStrokes(glyph, document.getElementById('gw-stroke'));
  });
  // 預設顯示 あ
  const initCell = GOJUON[0][0];
  window._setGojuonWritePadTarget(initCell);
}

document.getElementById('btn-clear').addEventListener('click', () => {
  clearCanvas();
  clearStrokes(document.getElementById('canvas-stroke'));
});
document.getElementById('btn-toggle-guide').addEventListener('click', () => {
  const g = document.getElementById('canvas-guide');
  g.classList.toggle('hidden');
  document.getElementById('btn-toggle-guide').textContent =
    g.classList.contains('hidden') ? '顯示參考字' : '隱藏參考字';
});

// 示范笔顺：在画板上叠加 SVG，按笔顺动画
document.getElementById('btn-show-stroke').addEventListener('click', async () => {
  const guide = document.getElementById('canvas-guide');
  const glyph = guide.textContent.trim();
  if (!glyph) return;
  clearCanvas();
  const strokeBox = document.getElementById('canvas-stroke');
  await animateStrokes(glyph, strokeBox);
});

// ═══ 练习 — 全 50 音 picker ═══
let _pickerScript = 'h';
function renderPicker() {
  const container = document.getElementById('picker-grid');
  container.innerHTML = '';
  for (const row of GOJUON) {
    for (const cell of row) {
      const div = document.createElement('div');
      if (!cell) {
        div.className = 'picker-cell empty';
      } else {
        div.className = 'picker-cell';
        div.innerHTML = `
          <div class="picker-glyph">${_pickerScript === 'h' ? cell.h : cell.k}</div>
          <div class="picker-romaji">${cell.r}</div>
        `;
        div.dataset.romaji = cell.r;
        div.addEventListener('click', () => {
          document.querySelectorAll('.picker-cell.active').forEach(c => c.classList.remove('active'));
          div.classList.add('active');
          _practiceCurrent = cell;
          _practiceLastRomaji = cell.r;
          const glyphEl = document.getElementById('practice-glyph');
          glyphEl.textContent = _pickerScript === 'h' ? cell.h : cell.k;
          glyphEl.classList.remove('placeholder');
          document.getElementById('practice-romaji').textContent = _practiceShowRomaji ? cell.r : '';
          document.getElementById('canvas-guide').textContent = _pickerScript === 'h' ? cell.h : cell.k;
          clearCanvas();
          clearStrokes(document.getElementById('canvas-stroke'));
          playKana(cell);
        });
      }
      container.appendChild(div);
    }
  }
}

document.querySelectorAll('[data-picker-script]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-picker-script]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _pickerScript = btn.dataset.pickerScript;
    renderPicker();
  });
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

// ═══ 練習模式 (學習 / 測驗) ═══
let _practiceMode = 'learn';
const _learnEls = ['.practice-controls', '.practice-stage', '.practice-write', '.practice-picker'];
const _quizEls = ['.quiz-controls', '#quiz-stage'];

function _setPracticeMode(mode) {
  _practiceMode = mode;
  document.querySelectorAll('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  const progPanel = document.getElementById('progress-panel');
  if (mode === 'learn') {
    _learnEls.forEach(s => { const el = document.querySelector(s); if (el) el.hidden = false; });
    _quizEls.forEach(s => { const el = document.querySelector(s); if (el) el.hidden = true; });
    if (progPanel) progPanel.hidden = true;
  } else if (mode === 'quiz') {
    _learnEls.forEach(s => { const el = document.querySelector(s); if (el) el.hidden = true; });
    _quizEls.forEach(s => { const el = document.querySelector(s); if (el) el.hidden = false; });
    if (progPanel) progPanel.hidden = true;
    if (!_quizCurrent) startQuiz();
  } else if (mode === 'progress') {
    _learnEls.forEach(s => { const el = document.querySelector(s); if (el) el.hidden = true; });
    _quizEls.forEach(s => { const el = document.querySelector(s); if (el) el.hidden = true; });
    if (progPanel) progPanel.hidden = false;
    renderProgressPanel();
  }
}

function renderProgressPanel() {
  const p = _loadProgress();
  const entries = Object.entries(p.quiz || {});
  let totalRight = 0, totalWrong = 0;
  for (const [, v] of entries) {
    totalRight += v.right || 0;
    totalWrong += v.wrong || 0;
  }
  const totalPlays = totalRight + totalWrong;
  const accuracy = totalPlays > 0 ? Math.round(totalRight * 100 / totalPlays) : 0;
  const mastered = entries.filter(([, v]) => (v.right || 0) >= 3 && (v.wrong || 0) === 0).length;
  const weak = entries.filter(([, v]) => (v.wrong || 0) > 0).length;

  document.getElementById('stat-total').textContent = totalPlays;
  document.getElementById('stat-accuracy').textContent = totalPlays > 0 ? `${accuracy}%` : '—';
  document.getElementById('stat-mastered').textContent = mastered;
  document.getElementById('stat-weak').textContent = weak;

  // 弱項 top 5: 按 wrong 降序，wrong 0 不算
  const allKana = _allKana();
  const findKana = (r) => allKana.find(k => k.r === r);
  const weakSorted = entries
    .filter(([, v]) => (v.wrong || 0) > 0)
    .sort((a, b) => (b[1].wrong || 0) - (a[1].wrong || 0))
    .slice(0, 5);
  const strongSorted = entries
    .filter(([, v]) => (v.right || 0) >= 3 && (v.wrong || 0) === 0)
    .sort((a, b) => (b[1].right || 0) - (a[1].right || 0))
    .slice(0, 5);

  const renderItem = (r, stats, isWeak) => {
    const k = findKana(r);
    if (!k) return '';
    const cls = isWeak ? 'weak' : 'strong';
    return `
      <div class="prog-item ${cls} speak" data-speak="${k.h}">
        <div class="prog-glyph">${k.h}/${k.k}</div>
        <div class="prog-romaji">${r}</div>
        <div class="prog-stat">${isWeak ? `錯 ${stats.wrong} / 對 ${stats.right || 0}` : `對 ${stats.right} 次`}</div>
      </div>`;
  };
  document.getElementById('progress-weak').innerHTML =
    weakSorted.length ? weakSorted.map(([r, s]) => renderItem(r, s, true)).join('') :
    '<div class="prog-empty">還沒做測驗 — 切到「🎯 測驗模式」開始</div>';
  document.getElementById('progress-strong').innerHTML =
    strongSorted.length ? strongSorted.map(([r, s]) => renderItem(r, s, false)).join('') :
    '<div class="prog-empty">連續答對同一個字 3+ 次就會出現在這裏</div>';
}

document.getElementById('btn-progress-reset')?.addEventListener('click', () => {
  if (!confirm('確定清空所有測驗進度？')) return;
  localStorage.removeItem(_STORAGE_KEY);
  _quizScore = { correct: 0, total: 0 };
  _updateQuizScore?.();
  renderProgressPanel();
});

document.querySelectorAll('.mode-tab').forEach(btn => {
  btn.addEventListener('click', () => _setPracticeMode(btn.dataset.mode));
});

// ═══ 測驗：聽音 → 4 選 1 ═══
let _quizCurrent = null;
let _quizScore = { correct: 0, total: 0 };

function _allKana() {
  return [...GOJUON.flat().filter(Boolean), ...ARCHAIC, ...DAKUON.flat(), ...HANDAKUON.flat(), ...YOUON.flat()];
}

function startQuiz() {
  const direction = document.getElementById('quiz-direction')?.value || 'audio2kana';
  const pool = _allKana();
  const correct = pool[Math.floor(Math.random() * pool.length)];
  const distractors = [];
  while (distractors.length < 3) {
    const cand = pool[Math.floor(Math.random() * pool.length)];
    if (cand.r !== correct.r && !distractors.some(d => d.r === cand.r)) {
      distractors.push(cand);
    }
  }
  const opts = [correct, ...distractors].sort(() => Math.random() - 0.5);
  _quizCurrent = { correct, opts, answered: false, direction };

  document.getElementById('quiz-feedback').textContent = '';
  document.getElementById('quiz-feedback').className = 'quiz-feedback';

  const promptEl = document.querySelector('.quiz-prompt');
  const replayBtn = document.getElementById('quiz-replay');
  const optsEl = document.getElementById('quiz-options');
  optsEl.innerHTML = '';

  if (direction === 'audio2kana') {
    // 聽音 → 選假名
    promptEl.textContent = '聽到的是哪一個假名？';
    replayBtn.style.display = '';
    for (const o of opts) {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.textContent = o.h;
      btn.dataset.romaji = o.r;
      btn.addEventListener('click', () => _checkQuiz(btn, o));
      optsEl.appendChild(btn);
    }
    setTimeout(() => playKana(correct), 300);
  } else {
    // 看字 → 選讀音 (顯示假名，4 個讀音選)
    promptEl.innerHTML = `這個假名讀作什麼？<br><span class="quiz-target-glyph">${correct.h}</span>`;
    replayBtn.style.display = 'none';
    for (const o of opts) {
      const btn = document.createElement('button');
      btn.className = 'quiz-option quiz-option-romaji';
      btn.innerHTML = `<div class="r-text">${o.r}</div>`;
      btn.dataset.romaji = o.r;
      btn.addEventListener('click', () => {
        playKana(o);  // 點擊播放選的讀音
        _checkQuiz(btn, o);
      });
      optsEl.appendChild(btn);
    }
  }
  _updateQuizScore();
}

function _checkQuiz(btnEl, choice) {
  if (_quizCurrent.answered) return;
  _quizCurrent.answered = true;
  _quizScore.total++;
  const correct = _quizCurrent.correct;
  const fb = document.getElementById('quiz-feedback');
  if (choice.r === correct.r) {
    btnEl.classList.add('correct');
    fb.textContent = `✓ 正確！${correct.h} / ${correct.k} (${correct.r})`;
    fb.className = 'quiz-feedback correct';
    _quizScore.correct++;
    _recordPractice(correct.r, true);
  } else {
    btnEl.classList.add('wrong');
    // 找出正確答案 button 並標綠
    document.querySelectorAll('.quiz-option').forEach(el => {
      if (el.dataset.romaji === correct.r) el.classList.add('correct');
    });
    fb.textContent = `✗ 答案是「${correct.h} / ${correct.k}」(${correct.r})`;
    fb.className = 'quiz-feedback wrong';
    _recordPractice(correct.r, false);
  }
  _updateQuizScore();
}

function _updateQuizScore() {
  document.getElementById('quiz-score').textContent =
    `得分：${_quizScore.correct} / ${_quizScore.total}`;
}

document.getElementById('btn-quiz-next').addEventListener('click', startQuiz);
document.getElementById('quiz-direction').addEventListener('change', startQuiz);
document.getElementById('btn-quiz-reset').addEventListener('click', () => {
  _quizScore = { correct: 0, total: 0 };
  _updateQuizScore();
  startQuiz();
});
document.getElementById('quiz-replay').addEventListener('click', () => {
  if (_quizCurrent) playKana(_quizCurrent.correct);
});

// ═══ localStorage 進度記錄 ═══
const _STORAGE_KEY = 'nihongo_progress_v1';
function _loadProgress() {
  try { return JSON.parse(localStorage.getItem(_STORAGE_KEY)) || { practiced: {}, quiz: {} }; }
  catch { return { practiced: {}, quiz: {} }; }
}
function _saveProgress(p) {
  try { localStorage.setItem(_STORAGE_KEY, JSON.stringify(p)); } catch {}
}
function _recordPractice(romaji, correct) {
  const p = _loadProgress();
  p.quiz[romaji] = p.quiz[romaji] || { right: 0, wrong: 0 };
  if (correct) p.quiz[romaji].right++;
  else p.quiz[romaji].wrong++;
  _saveProgress(p);
}
function getProgressSummary() {
  const p = _loadProgress();
  const total = Object.keys(p.quiz).length;
  let right = 0, wrong = 0;
  for (const r of Object.values(p.quiz)) { right += r.right; wrong += r.wrong; }
  return { total, right, wrong, accuracy: right + wrong > 0 ? Math.round(right * 100 / (right + wrong)) : 0 };
}

// ═══ 實戰 (詞彙 + 句子) ═══
function renderPhrases() {
  const list = document.getElementById('phrases-list');
  if (!list) return;
  list.innerHTML = '';
  for (const p of PHRASES) {
    const card = document.createElement('div');
    card.className = 'vocab-card speak';
    card.dataset.speak = p.ja;
    card.innerHTML = `
      <div class="vocab-ja">${p.ja}</div>
      <div class="vocab-romaji">${p.romaji || ''}</div>
      <div class="vocab-zh">${p.zh}</div>
      ${p.note ? `<div class="vocab-note">${p.note}</div>` : ''}
    `;
    list.appendChild(card);
  }
}

// 通用 vocab level 渲染器 (N5 / N4 / N3 共用)
const _levelState = { n5: { cat: null }, n4: { cat: null }, n3: { cat: null }, n2: { cat: null }, n1: { cat: null } };
const _levelData = { n5: N5_CATEGORIES, n4: N4_CATEGORIES, n3: N3_CATEGORIES, n2: N2_CATEGORIES, n1: N1_CATEGORIES };

function renderLevelCategoryTabs(level) {
  const tabsEl = document.getElementById(`${level}-cat-tabs`);
  if (!tabsEl) return;
  const cats = _levelData[level];
  tabsEl.innerHTML = '';
  for (const cat of cats) {
    const btn = document.createElement('button');
    btn.className = 'n5-cat-tab';
    btn.textContent = `${cat.label} (${cat.words.length})`;
    btn.dataset.catId = cat.id;
    btn.addEventListener('click', () => {
      _levelState[level].cat = cat.id;
      tabsEl.querySelectorAll('.n5-cat-tab').forEach(b => b.classList.toggle('active', b.dataset.catId === cat.id));
      renderLevelList(level);
    });
    tabsEl.appendChild(btn);
  }
  if (!_levelState[level].cat) _levelState[level].cat = cats[0].id;
  const activeBtn = tabsEl.querySelector(`[data-cat-id="${_levelState[level].cat}"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

function renderLevelList(level) {
  const list = document.getElementById(`${level}-list`);
  if (!list) return;
  const cats = _levelData[level];
  const cat = cats.find(c => c.id === _levelState[level].cat) || cats[0];
  list.innerHTML = '';
  for (const w of cat.words) {
    const card = document.createElement('div');
    card.className = 'vocab-card n5-card speak';
    card.dataset.speak = w.ja;
    card.innerHTML = `
      <div class="vocab-ja">${w.ja}</div>
      ${w.kana ? `<div class="vocab-kana">${w.kana}</div>` : ''}
      <div class="vocab-zh">${w.zh}</div>
      ${w.ex ? `
        <div class="vocab-ex-toggle">▸ 例句</div>
        <div class="vocab-ex" hidden>
          <div class="vocab-ex-ja speak" data-speak="${w.ex}">${w.ex}</div>
          <div class="vocab-ex-zh">${w.ex_zh || ''}</div>
        </div>
      ` : ''}
    `;
    const exToggle = card.querySelector('.vocab-ex-toggle');
    if (exToggle) {
      exToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const ex = card.querySelector('.vocab-ex');
        ex.hidden = !ex.hidden;
        exToggle.textContent = ex.hidden ? '▸ 例句' : '▾ 例句';
      });
    }
    list.appendChild(card);
  }
}

// 兼容舊 API
function renderN5CategoryTabs() { renderLevelCategoryTabs('n5'); }
function renderN5() { renderLevelList('n5'); }
function renderN4CategoryTabs() { renderLevelCategoryTabs('n4'); }
function renderN4() { renderLevelList('n4'); }
function renderN3CategoryTabs() { renderLevelCategoryTabs('n3'); }
function renderN3() { renderLevelList('n3'); }
function renderN2CategoryTabs() { renderLevelCategoryTabs('n2'); }
function renderN2() { renderLevelList('n2'); }
function renderN1CategoryTabs() { renderLevelCategoryTabs('n1'); }
function renderN1() { renderLevelList('n1'); }

// 教育漢字 1026 字 — 按年級渲染
let _kanjiCurrentGrade = 1;
function renderKanjiGradeTabs() {
  const tabs = document.getElementById('kanji-grade-tabs');
  if (!tabs) return;
  tabs.innerHTML = '';
  for (let g = 1; g <= 6; g++) {
    const count = (EDU_KANJI[g] || []).length;
    const btn = document.createElement('button');
    btn.className = 'n5-cat-tab';
    btn.textContent = `${g} 年生 (${count})`;
    btn.dataset.grade = String(g);
    btn.addEventListener('click', () => {
      _kanjiCurrentGrade = g;
      tabs.querySelectorAll('.n5-cat-tab').forEach(b => b.classList.toggle('active', b.dataset.grade === String(g)));
      renderKanjiGrid();
    });
    tabs.appendChild(btn);
  }
  const activeBtn = tabs.querySelector(`[data-grade="${_kanjiCurrentGrade}"]`);
  if (activeBtn) activeBtn.classList.add('active');
}
function renderKanjiGrid() {
  const grid = document.getElementById('kanji-grid');
  if (!grid) return;
  const list = EDU_KANJI[_kanjiCurrentGrade] || [];
  grid.innerHTML = '';
  for (const k of list) {
    const card = document.createElement('div');
    card.className = 'kanji-ref-card speak';
    card.dataset.speak = k.k;
    card.innerHTML = `
      <div class="kanji-ref-glyph">${k.k}</div>
      <div class="kanji-ref-readings">
        <div><span class="kanji-ref-tag on">音</span>${k.on}</div>
        <div><span class="kanji-ref-tag kun">訓</span>${k.kun}</div>
      </div>
      <div class="kanji-ref-mean">${k.mean}</div>
    `;
    grid.appendChild(card);
  }
}

document.querySelectorAll('[data-vocab-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-vocab-tab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const which = btn.dataset.vocabTab;
    document.getElementById('vocab-phrases').hidden = which !== 'phrases';
    document.getElementById('vocab-n5').hidden = which !== 'n5';
    document.getElementById('vocab-n4').hidden = which !== 'n4';
    document.getElementById('vocab-n3').hidden = which !== 'n3';
    document.getElementById('vocab-n2').hidden = which !== 'n2';
    document.getElementById('vocab-n1').hidden = which !== 'n1';
    document.getElementById('vocab-kanji').hidden = which !== 'kanji';
    if (which === 'kanji' && !document.getElementById('kanji-grid').innerHTML) {
      renderKanjiGradeTabs();
      renderKanjiGrid();
    }
  });
});

// ═══ 日語構成頁 — 自動章節目錄 (TOC) ═══
function buildAboutToc() {
  const article = document.querySelector('#page-about .prose');
  if (!article) return;
  const h2s = article.querySelectorAll('h2');
  if (!h2s.length) return;
  // 為每個 h2 加 ID
  h2s.forEach((h, i) => {
    if (!h.id) h.id = `about-sec-${i}`;
  });
  // 創建 TOC
  const toc = document.createElement('nav');
  toc.className = 'about-toc';
  toc.innerHTML = '<div class="toc-label">目錄</div>';
  const ol = document.createElement('ol');
  h2s.forEach(h => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    // 提取純文本（去掉子 span）
    a.textContent = h.textContent.trim();
    li.appendChild(a);
    ol.appendChild(li);
  });
  toc.appendChild(ol);
  // 插到 article 開頭
  article.insertBefore(toc, article.firstChild);
}

// ═══ Service Worker 註冊 — 飛機上也能用 ═══
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      console.log('[SW] registered', reg.scope);
    }).catch(err => {
      console.warn('[SW] register failed:', err);
    });
  });
}

// ═══ 初始化 ═══
renderGojuon();
renderIroha();
renderPicker();
renderPhrases();
renderN5CategoryTabs();
renderN5();
renderN4CategoryTabs();
renderN4();
renderN3CategoryTabs();
renderN3();
renderN2CategoryTabs();
renderN2();
renderN1CategoryTabs();
renderN1();
renderKanjiGradeTabs();
renderKanjiGrid();
buildAboutToc();
document.getElementById('practice-glyph').classList.add('placeholder');
