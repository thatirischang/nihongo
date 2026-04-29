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

// ═══ 伊呂波歌 全文朗读 — 字符级顺序播放，完美同步 + 可暂停/继续/停止 ═══
// 实现：用现成的 audio/kana/<romaji>.mp3 顺序播放 47 个字（不含 ん）
// 每字播完进下个；句末加 300ms 停顿；字间加 80ms 微停顿
let _irohaState = 'stopped';  // 'stopped' | 'playing' | 'paused'
let _irohaIndex = 0;
let _irohaSeq = null;
let _irohaCallbacks = {};

function _buildIrohaSequence() {
  if (_irohaSeq) return _irohaSeq;
  const seq = [];
  for (let li = 0; li < IROHA_LINES.length; li++) {
    const line = IROHA_LINES[li];
    for (let ci = 0; ci < line.length; ci++) {
      const c = line[ci];
      if (c.modern) continue;  // ん 不读
      seq.push({
        kana: c,
        isLineEnd: ci === line.length - 1,
      });
    }
  }
  _irohaSeq = seq;
  return seq;
}

function _playOneKana(kana) {
  return new Promise((res) => {
    const a = new Audio(`audio/kana/${kana.r}.mp3`);
    const done = () => { a.removeEventListener('ended', done); a.removeEventListener('error', done); res(); };
    a.addEventListener('ended', done);
    a.addEventListener('error', done);
    a.play().catch(done);
  });
}

function _wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function _waitWhilePaused() {
  while (_irohaState === 'paused') await _wait(100);
}

async function playIrohaFull(callbacks = {}) {
  if (_irohaState === 'playing' || _irohaState === 'paused') return;
  _irohaCallbacks = callbacks;
  const seq = _buildIrohaSequence();
  _irohaIndex = 0;
  _irohaState = 'playing';
  if (callbacks.onState) callbacks.onState('playing');

  while (_irohaIndex < seq.length) {
    await _waitWhilePaused();
    if (_irohaState === 'stopped') break;

    const item = seq[_irohaIndex];
    if (callbacks.onChar) callbacks.onChar(_irohaIndex);
    await _playOneKana(item.kana);

    if (_irohaState === 'stopped') break;
    await _waitWhilePaused();
    if (_irohaState === 'stopped') break;

    await _wait(item.isLineEnd ? 350 : 80);
    _irohaIndex++;
  }

  const ended = _irohaState !== 'stopped';
  _irohaState = 'stopped';
  if (callbacks.onState) callbacks.onState('stopped');
  if (ended && callbacks.onEnd) callbacks.onEnd();
}

function pauseIroha() {
  if (_irohaState === 'playing') {
    _irohaState = 'paused';
    if (_irohaCallbacks.onState) _irohaCallbacks.onState('paused');
  }
}

function resumeIroha() {
  if (_irohaState === 'paused') {
    _irohaState = 'playing';
    if (_irohaCallbacks.onState) _irohaCallbacks.onState('playing');
  }
}

function stopIroha() {
  if (_irohaState !== 'stopped') {
    _irohaState = 'stopped';
  }
}

function isIrohaPaused() { return _irohaState === 'paused'; }

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
