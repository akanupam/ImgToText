// Guard: if this script was already injected, don't re-run
if (document.getElementById('ocr-overlay')) {
  // Nothing to do
} else {
  initOverlay();
}

function initOverlay() {
  // ── Build overlay elements ───────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'ocr-overlay';

  const selectionBox = document.createElement('div');
  selectionBox.id = 'ocr-selection';

  overlay.appendChild(selectionBox);
  document.body.appendChild(overlay);

  // ── Drag state ───────────────────────────────────────────────────────────
  let startX = 0;
  let startY = 0;
  let isDragging = false;

  overlay.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0';
    selectionBox.style.height = '0';
    selectionBox.style.display = 'block';
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    // Support dragging in any direction
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);

    selectionBox.style.left   = x + 'px';
    selectionBox.style.top    = y + 'px';
    selectionBox.style.width  = w + 'px';
    selectionBox.style.height = h + 'px';
  });

  overlay.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;

    const x = parseInt(selectionBox.style.left,   10);
    const y = parseInt(selectionBox.style.top,    10);
    const w = parseInt(selectionBox.style.width,  10);
    const h = parseInt(selectionBox.style.height, 10);

    // Remove overlay before taking screenshot (avoids capturing it)
    overlay.remove();

    if (w < 5 || h < 5) return; // Ignore accidental tiny clicks

    // Wait a tiny bit for the UI to repaint without the overlay
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'REGION_SELECTED',
        rect: { x, y, width: w, height: h },
        dpr: window.devicePixelRatio,
      });
    }, 100);
  });

  // Cancel on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') overlay.remove();
  }, { once: true });

  // ── Listen for OCR result ────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== 'COPY_TEXT') return;

    const text = message.text || '';

    if (!text) {
      showToast('⚠ No text found in selection');
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => showToast('✓ Text copied to clipboard'))
      .catch(() => showToast('✓ OCR done — check console'));
  });
}

// ── Toast notification ───────────────────────────────────────────────────────
function showToast(msg) {
  const existing = document.getElementById('ocr-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'ocr-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2500);
}
