# ImgToText — Screen OCR Extension

A production-ready, minimal Chrome Extension (Manifest V3) that allows you to select any region on your screen and instantly extract text using Tesseract.js.
<p align="center">
  <img src="icons/icon128.png" alt="Extension icon" width="200"/>
</p>
## Features
- **Region Selection**: Click and drag to select any part of the active webpage.
- **Instant OCR**: Extract text from images, headers, or any non-selectable elements.
- **Automatic Copy**: Extracted text is automatically copied to your clipboard.
- **Fully Client-Side**: No data is sent to any server; OCR runs entirely in your browser.
- **Offline Capable**: Bundled with Tesseract.js v5 for maximum performance and security.

---

## Installation (Recommended)

The easiest way to use this extension is to download the pre-packaged version from the **Releases** page.

### 1. Download & Extract
- Go to the [Releases](https://github.com/akanupam/ImgToText/releases) page.
- Download the `imgtotext_v1.2.2.zip` file.
- Extract the ZIP to a folder on your computer (e.g., `Documents/imgtotext`).

### 2. Load into Chrome
- Open Google Chrome and go to `chrome://extensions`.
- In the top-right corner, toggle **Developer mode** to **ON**.
- Click the **Load unpacked** button.
- Select the folder where you extracted the files.

---

## Installation for Developers
If you want to modify the code or contribute to the project:
1. Clone this repository: `git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git`
2. Install dependencies: `npm install`
3. Load the folder into Chrome using "Load unpacked".

### 4. Pin for easy access
- Click the **Puzzle Piece** icon next to your address bar.
- Find **ImgToText — Screen OCR** and click the **Pin** icon.

---

## How to Use

1. Navigate to any webpage.
2. Click the **ImgToText icon** in your browser toolbar.
3. Your cursor will change to a crosshair, and the page will slightly dim.
4. **Click and drag** to draw a box around the text you want to capture.
5. Release the mouse button.
6. A toast notification will appear: **"✓ Text copied to clipboard"**.
7. Paste your text anywhere with `Ctrl+V` (or `Cmd+V`).

---

## Technical Details

- **Manifest V3**: Built using the latest Chrome extension standards.
- **Offscreen Document**: Uses an offscreen document to host Tesseract.js and Canvas, as Service Workers do not have DOM access.
- **Worker Interceptor**: Implements a custom worker redirect to comply with strict Content Security Policies (CSP) without sacrificing functionality.
- **Tesseract.js v5**: Utilizes the latest OCR engine for high accuracy and speed.

## License
MIT License. Feel free to use and modify for your own projects.
