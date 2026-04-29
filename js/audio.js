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

// ═══ 伊呂波歌唱版 — 真人演唱 + 智能 sync ═══
// 歌唱版 169.6s，分 8 段（按 IROHA_LINES 的 7-5-6-5-7-5-7-5 分句）
// 每段內字符均分時間，段末有 breath pause
let _sungAudio = null;
let _sungSyncTimer = null;
const SUNG_INTRO_SEC = 0;       // 之前 3.5 太多，導致高亮慢 ~7s。歌曲幾乎一開始就唱
const SUNG_OUTRO_SEC = 0;
const SUNG_LINE_BREATH_RATIO = 0;     // 段末不加 breath，純按字數均分

function _buildSungSchedule(totalDuration) {
  // 47 字按 IROHA_LINES 分 8 段
  const lines = [];
  for (const line of IROHA_LINES) {
    const chars = line.filter(c => !c.modern);
    if (chars.length) lines.push(chars);
  }
  const sungBody = totalDuration - SUNG_INTRO_SEC - SUNG_OUTRO_SEC;
  // 每段時長按字數比例分配
  const totalChars = lines.reduce((s, l) => s + l.length, 0);
  const schedule = []; // {startMs, endMs, charIndex}
  let charIdx = 0;
  let cursor = SUNG_INTRO_SEC;
  for (const line of lines) {
    const lineFraction = line.length / totalChars;
    const lineSec = sungBody * lineFraction;
    const breathSec = lineSec * SUNG_LINE_BREATH_RATIO;
    const charSec = (lineSec - breathSec) / line.length;
    for (let i = 0; i < line.length; i++) {
      schedule.push({
        startMs: (cursor) * 1000,
        endMs: (cursor + charSec) * 1000,
        charIndex: charIdx,
      });
      cursor += charSec;
      charIdx++;
    }
    cursor += breathSec;
  }
  return schedule;
}

function _getSungAudio() {
  if (!_sungAudio) {
    _sungAudio = new Audio('audio/iroha-sung.mp3');
    _sungAudio.addEventListener('ended', () => {
      _stopSungSync();
      if (_irohaCallbacks.onState) _irohaCallbacks.onState('stopped');
      if (_irohaCallbacks.onEnd) _irohaCallbacks.onEnd();
    });
    _sungAudio.addEventListener('pause', () => {
      _stopSungSync();
      if (!_sungAudio.ended && _irohaCallbacks.onState) _irohaCallbacks.onState('paused');
    });
    _sungAudio.addEventListener('play', () => {
      _startSungSync();
      if (_irohaCallbacks.onState) _irohaCallbacks.onState('playing');
    });
  }
  return _sungAudio;
}

let _sungSchedule = null;
function _startSungSync() {
  _stopSungSync();
  if (!_sungSchedule && _sungAudio.duration) {
    _sungSchedule = _buildSungSchedule(_sungAudio.duration);
  }
  _sungSyncTimer = setInterval(() => {
    if (!_sungAudio || !_sungSchedule) return;
    const t = _sungAudio.currentTime * 1000;
    const cur = _sungSchedule.find(s => t >= s.startMs && t < s.endMs);
    if (cur && _irohaCallbacks.onChar) _irohaCallbacks.onChar(cur.charIndex);
  }, 80);
}
function _stopSungSync() {
  if (_sungSyncTimer) { clearInterval(_sungSyncTimer); _sungSyncTimer = null; }
}

async function playIrohaSung(callbacks = {}) {
  // 停止朗讀版
  if (_irohaAudio) { _irohaAudio.pause(); _irohaAudio.currentTime = 0; }
  _irohaCallbacks = callbacks;
  const a = _getSungAudio();
  // 第一次需要等 metadata
  if (!a.duration) {
    await new Promise((res) => {
      a.addEventListener('loadedmetadata', res, { once: true });
      a.addEventListener('error', res, { once: true });
    });
    _sungSchedule = _buildSungSchedule(a.duration);
  }
  a.currentTime = 0;
  try { await a.play(); }
  catch (err) { console.warn('iroha sung play failed:', err); }
}

// 統一的 pause/resume/stop 路由 — 同時控制朗讀和歌唱兩個音頻
const _origPause = pauseIroha, _origResume = resumeIroha, _origStop = stopIroha;
function _activeAudio() {
  if (_sungAudio && !_sungAudio.paused) return _sungAudio;
  if (_irohaAudio && !_irohaAudio.paused) return _irohaAudio;
  // 都暫停了，找誰有 currentTime > 0 (剛剛在播)
  if (_sungAudio && _sungAudio.currentTime > 0) return _sungAudio;
  if (_irohaAudio && _irohaAudio.currentTime > 0) return _irohaAudio;
  return null;
}
pauseIroha = function() {
  const a = _activeAudio();
  if (a) a.pause();
};
resumeIroha = function() {
  const a = _activeAudio();
  if (a && a.paused) a.play().catch(()=>{});
};
stopIroha = function() {
  if (_irohaAudio) { _irohaAudio.pause(); _irohaAudio.currentTime = 0; }
  if (_sungAudio) { _sungAudio.pause(); _sungAudio.currentTime = 0; }
  _stopIrohaSync();
  _stopSungSync();
  if (_irohaCallbacks.onState) _irohaCallbacks.onState('stopped');
};
isIrohaPaused = function() {
  const a = _activeAudio();
  return a && a.paused && a.currentTime > 0;
};

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
