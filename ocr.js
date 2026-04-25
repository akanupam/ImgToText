// ── WORKER INTERCEPTOR HACK ──────────────────────────────────────────────────
// Manifest V3 strictly forbids 'blob:' in the Content Security Policy (CSP).
// Tesseract.js normally creates a 'blob:' worker shim to load the actual worker.
// This hack intercepts worker creation and redirects it to our local file,
// allowing Tesseract to run without needing 'blob:' in the manifest.
(function() {
  const OriginalWorker = window.Worker;
  window.Worker = function(url, options) {
    if (typeof url === 'string' && url.startsWith('blob:')) {
      console.log('[ocr.js] Intercepted blob worker request. Redirecting to lib/worker.min.js');
      return new OriginalWorker(chrome.runtime.getURL('lib/worker.min.js'), options);
    }
    return new OriginalWorker(url, options);
  };
})();

// Singleton Tesseract worker — only set after full successful initialization
let worker = null;

async function getWorker() {
  if (worker) return worker;

  console.log('[ocr.js] Initializing Tesseract v5 (with interceptor)...');

  // In v5, createWorker is async and takes (langs, oem, config)
  const w = await Tesseract.createWorker('eng', 1, {
    workerPath: chrome.runtime.getURL('lib/worker.min.js'),
    corePath: await getCorePath(),
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    logger: (m) => {
      if (m.status) console.log('[Tesseract]', m.status, Math.round(m.progress * 100) + '%');
    },
  });

  worker = w;
  return worker;
}

async function getCorePath() {
  const simdSupported = await checkSimd();
  console.log('[ocr.js] SIMD supported:', simdSupported);
  return chrome.runtime.getURL(
    simdSupported ? 'lib/tesseract-core-simd.wasm.js' : 'lib/tesseract-core.wasm.js'
  );
}

// Detect WebAssembly SIMD support
async function checkSimd() {
  try {
    const simdTest = new Uint8Array([
      0x00,0x61,0x73,0x6d,0x01,0x00,0x00,0x00,0x01,0x05,0x01,0x60,
      0x00,0x01,0x7b,0x03,0x02,0x01,0x00,0x0a,0x0a,0x01,0x08,0x00,
      0x41,0x00,0xfd,0x0f,0x00,0x00,0x0b,
    ]);
    return WebAssembly.validate(simdTest);
  } catch {
    return false;
  }
}

// ── Message handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== 'offscreen') return;
  if (message.type   !== 'CROP_AND_OCR') return;

  processImage(message.imageDataUrl, message.rect, message.dpr)
    .then((text) => {
      chrome.runtime.sendMessage({ type: 'OCR_RESULT', text });
    })
    .catch((err) => {
      console.error('[ocr.js] OCR pipeline failed:', err);
      chrome.runtime.sendMessage({ type: 'OCR_RESULT', text: '' });
    });

  return true;
});

// ── Core: crop screenshot → run OCR ─────────────────────────────────────────
async function processImage(imageDataUrl, rect, dpr) {
  const img = await loadImage(imageDataUrl);

  const sx = Math.round(rect.x      * dpr);
  const sy = Math.round(rect.y      * dpr);
  const sw = Math.round(rect.width  * dpr);
  const sh = Math.round(rect.height * dpr);

  console.log('[ocr.js] Processing crop:', { sx, sy, sw, sh });

  const canvas = document.getElementById('crop-canvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = sw;
  canvas.height = sh;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  // Check if canvas has any data
  const pixels = ctx.getImageData(0, 0, sw, sh).data;
  let nonZero = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] !== 0 || pixels[i+1] !== 0 || pixels[i+2] !== 0) {
      nonZero++;
    }
  }
  console.log('[ocr.js] Canvas non-zero pixels:', nonZero, 'out of', sw * sh);
  if (nonZero === 0) console.warn('[ocr.js] WARNING: Canvas is completely transparent/black!');

  const ocrWorker = await getWorker();
  console.log('[ocr.js] Running recognize...');
  const { data }  = await ocrWorker.recognize(canvas);

  console.log('[ocr.js] OCR raw text:', data.text);
  console.log('[ocr.js] Confidence:', data.confidence);

  return data.text ? data.text.trim() : '';
}

// ── Helper ───────────────────────────────────────────────────────────────────
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img   = new Image();
    img.onload  = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load screenshot image'));
    img.src     = src;
  });
}
