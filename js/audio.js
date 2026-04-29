// 音频播放 — 加载 audio/kana/<romaji>.mp3
// 平假名和片假名共享同一个文件（同字符同发音）
// 替换 TTS 实现时只改这个文件

const _audioCache = new Map();

function _getAudio(romaji) {
  let a = _audioCache.get(romaji);
  if (!a) {
    a = new Audio(`audio/kana/${romaji}.mp3`);
    _audioCache.set(romaji, a);
  }
  return a;
}

// 播放单个假名。传 romaji 字符串或 {r:'...'} 对象都行
function playKana(target) {
  const r = typeof target === 'string' ? target : target?.r;
  if (!r) return;
  const a = _getAudio(r);
  a.currentTime = 0;
  a.play().catch(err => console.warn('audio play failed:', r, err));
}

// ═══ 伊呂波歌 全文朗读 — 用 iroha-full.mp3（连续自然朗读）+ 时间均分高亮 ═══
// kana mp3 已经是「重复 2 遍」格式不适合连读；改用 iroha-full.mp3（单次连贯 TTS）
// 通过 audio.currentTime 估算当前字 index 实时高亮
let _irohaAudio = null;
let _irohaCallbacks = {};
let _irohaSyncTimer = null;
let _irohaCharCount = 47;

function _getIrohaCharCount() {
  let n = 0;
  for (const line of IROHA_LINES) for (const c of line) if (!c.modern) n++;
  return n;
}

function _getIrohaAudio() {
  if (!_irohaAudio) {
    _irohaAudio = new Audio('audio/iroha-full.mp3');
    _irohaAudio.addEventListener('ended', () => {
      _stopIrohaSync();
      if (_irohaCallbacks.onState) _irohaCallbacks.onState('stopped');
      if (_irohaCallbacks.onEnd) _irohaCallbacks.onEnd();
    });
    _irohaAudio.addEventListener('pause', () => {
      _stopIrohaSync();
      if (!_irohaAudio.ended && _irohaCallbacks.onState) _irohaCallbacks.onState('paused');
    });
    _irohaAudio.addEventListener('play', () => {
      _startIrohaSync();
      if (_irohaCallbacks.onState) _irohaCallbacks.onState('playing');
    });
  }
  return _irohaAudio;
}

function _startIrohaSync() {
  _stopIrohaSync();
  _irohaSyncTimer = setInterval(() => {
    if (!_irohaAudio || !_irohaAudio.duration) return;
    const ratio = _irohaAudio.currentTime / _irohaAudio.duration;
    const idx = Math.min(Math.floor(ratio * _irohaCharCount), _irohaCharCount - 1);
    if (_irohaCallbacks.onChar) _irohaCallbacks.onChar(idx);
  }, 80);
}

function _stopIrohaSync() {
  if (_irohaSyncTimer) { clearInterval(_irohaSyncTimer); _irohaSyncTimer = null; }
}

async function playIrohaFull(callbacks = {}) {
  _irohaCallbacks = callbacks;
  _irohaCharCount = _getIrohaCharCount();
  const a = _getIrohaAudio();
  a.currentTime = 0;
  try { await a.play(); }
  catch (err) { console.warn('iroha play failed:', err); }
}

function pauseIroha() { if (_irohaAudio) _irohaAudio.pause(); }
function resumeIroha() { if (_irohaAudio && _irohaAudio.paused) _irohaAudio.play().catch(()=>{}); }
function stopIroha() {
  if (_irohaAudio) { _irohaAudio.pause(); _irohaAudio.currentTime = 0; }
  _stopIrohaSync();
  if (_irohaCallbacks.onState) _irohaCallbacks.onState('stopped');
}
function isIrohaPaused() { return _irohaAudio && _irohaAudio.paused && _irohaAudio.currentTime > 0; }

// 单个假名 → 罗马字 的查表（懒构建，依赖 data.js）
let _kanaToRomaji = null;
function _buildKanaMap() {
  _kanaToRomaji = {};
  const all = [
    ...GOJUON.flat().filter(Boolean),
    ...ARCHAIC,
    ...DAKUON.flat(),
    ...HANDAKUON.flat(),
    ...YOUON.flat(),
  ];
  for (const c of all) {
    _kanaToRomaji[c.h] = c.r;
    _kanaToRomaji[c.k] = c.r;
  }
}

// 播放词 / 句（日语构成页用）
// 单个假名 → 走 audio/kana/<romaji>.mp3
// 多字词/句 → 走 audio/words/<text>.mp3
function playPhrase(text) {
  if (!text) return;
  if (!_kanaToRomaji) _buildKanaMap();
  // 1) 单 kana 命中
  if (_kanaToRomaji[text]) {
    return playKana({ r: _kanaToRomaji[text] });
  }
  // 2) 词/句
  const key = '__w__' + text;
  let a = _audioCache.get(key);
  if (!a) {
    a = new Audio('audio/words/' + encodeURIComponent(text) + '.mp3');
    _audioCache.set(key, a);
  }
  a.currentTime = 0;
  a.play().catch(err => console.warn('phrase play failed:', text, err));
}
