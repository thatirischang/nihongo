// Service Worker — 飛機上也能用
// 策略：install 階段 precache 核心資源；runtime cache-first 所有 same-origin 請求
// 升級版本號 → 用戶下次訪問自動清舊 cache

const CACHE_VERSION = 'nihongo-v1.8.0';

// 核心資源 — install 時必須拉下，否則離線首次進站會白屏
const PRECACHE_URLS = [
  './',
  'index.html',
  'css/style.css?v=22',
  'js/data.js?v=22',
  'js/etymology.js?v=22',
  'js/vocab.js?v=22',
  'js/audio.js?v=22',
  'js/strokes.js?v=22',
  'js/app.js?v=22',
  'icon.svg',
  'manifest.webmanifest',
  // 伊呂波歌全文
  'audio/iroha-full.mp3',
];

// 105 kana 音頻全部 precache（用戶肯定會點）
const KANA_AUDIO = [
  'a','i','u','e','o','ka','ki','ku','ke','ko','sa','shi','su','se','so',
  'ta','chi','tsu','te','to','na','ni','nu','ne','no','ha','hi','fu','he','ho',
  'ma','mi','mu','me','mo','ya','yu','yo','ra','ri','ru','re','ro','wa','wo',
  'n','wi','we',
  'ga','gi','gu','ge','go','za','ji','zu','ze','zo','da','de','do',
  'ba','bi','bu','be','bo','pa','pi','pu','pe','po',
  'kya','kyu','kyo','sha','shu','sho','cha','chu','cho','nya','nyu','nyo',
  'hya','hyu','hyo','mya','myu','myo','rya','ryu','ryo',
  'gya','gyu','gyo','ja','ju','jo','bya','byu','byo','pya','pyu','pyo',
];
KANA_AUDIO.forEach(r => PRECACHE_URLS.push(`audio/kana/${r}.mp3`));

// 96 個 KanjiVG SVG（書寫練習用）
const KANA_CHARS_FOR_SVG = [
  'あ','い','う','え','お','か','き','く','け','こ','さ','し','す','せ','そ',
  'た','ち','つ','て','と','な','に','ぬ','ね','の','は','ひ','ふ','へ','ほ',
  'ま','み','む','め','も','や','ゆ','よ','ら','り','る','れ','ろ','わ','を',
  'ん','ゐ','ゑ',
  'ア','イ','ウ','エ','オ','カ','キ','ク','ケ','コ','サ','シ','ス','セ','ソ',
  'タ','チ','ツ','テ','ト','ナ','ニ','ヌ','ネ','ノ','ハ','ヒ','フ','ヘ','ホ',
  'マ','ミ','ム','メ','モ','ヤ','ユ','ヨ','ラ','リ','ル','レ','ロ','ワ','ヲ',
  'ン','ヰ','ヱ',
];
KANA_CHARS_FOR_SVG.forEach(c => PRECACHE_URLS.push(`images/strokes/${encodeURIComponent(c)}.svg`));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // addAll 失敗一個全失敗 → 用 individual fetch + add，失敗某個就跳過
      return Promise.all(PRECACHE_URLS.map(url =>
        cache.add(url).catch(err => {
          console.warn('precache miss:', url, err);
        })
      ));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // 只處理 GET + same-origin
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Cache-first：先查 cache，沒有再 fetch + 存
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // 只 cache 200 OK 響應
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        // 離線且 cache 沒有 → 對 HTML 請求降級到首頁
        if (req.headers.get('accept')?.includes('text/html')) {
          return caches.match('index.html');
        }
        // 其它資源失敗 → return 504 placeholder
        return new Response('Offline', { status: 504 });
      });
    })
  );
});
