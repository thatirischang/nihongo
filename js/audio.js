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

// 播放伊呂波歌整首
function playIrohaFull() {
  const a = _getAudio('__iroha_full__');
  if (!a.src.endsWith('iroha-full.mp3')) {
    // 第一次：手动设置 src
    const real = new Audio('audio/iroha-full.mp3');
    _audioCache.set('__iroha_full__', real);
    real.play().catch(err => console.warn('iroha play failed:', err));
    return;
  }
  a.currentTime = 0;
  a.play().catch(err => console.warn('iroha play failed:', err));
}
