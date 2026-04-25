// Tracks which tab triggered the current OCR flow
let activeTabId = null;

// ── Extension icon clicked ──────────────────────────────────────────────────
chrome.action.onClicked.addListener(async (tab) => {
  activeTabId = tab.id;

  // Inject styles first, then the content script
  await chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ['styles.css'],
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js'],
  });
});

// ── Message router ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'REGION_SELECTED') {
    // Store the tab that sent the selection (needed to reply later)
    activeTabId = sender.tab?.id ?? activeTabId;
    handleRegionSelected(message);
  }

  if (message.type === 'OCR_RESULT') {
    // Forward text back to the content script so it can write to clipboard
    chrome.tabs.sendMessage(activeTabId, {
      type: 'COPY_TEXT',
      text: message.text,
    });
  }
});

// ── Capture + OCR pipeline ──────────────────────────────────────────────────
async function handleRegionSelected({ rect, dpr }) {
  // 1. Screenshot the visible tab
  const imageDataUrl = await chrome.tabs.captureVisibleTab(null, {
    format: 'png',
  });

  // 2. Open the offscreen document (once; reused on subsequent calls)
  //    documentReady === true means we had to create it fresh this call
  const documentReady = await ensureOffscreenDocument();

  // 3. If we just created the document, wait for ocr.js to finish loading
  //    and register its onMessage listener before we send the message.
  //    createDocument() resolves when loading *starts*, not when it *finishes*.
  if (!documentReady) {
    await new Promise(resolve => setTimeout(resolve, 350));
  }

  // 4. Send image + crop coordinates to the offscreen document for OCR
  chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'CROP_AND_OCR',
    imageDataUrl,
    rect,
    dpr,
  });
}

// ── Offscreen document lifecycle ────────────────────────────────────────────
// Returns true if the document was already running, false if we just created it.
async function ensureOffscreenDocument() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });

  if (existing.length > 0) return true; // already open and ready

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DOM_SCRAPING'],
    justification: 'Canvas image cropping and Tesseract OCR processing',
  });

  return false; // freshly created — caller must wait before messaging
}
