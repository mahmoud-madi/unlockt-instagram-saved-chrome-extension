# 🌟 Unlockt (v6.7) - Complete Features & Technical Reference

> **Developed by Mahmoud Madi** (Digital Marketing & IT Specialist)  
> **Powered by Premier Tech (For Integrated Solutions) & VOXO AI (AI & Media Agency)**  
> *License: MIT License (Open Source)*

---

## 📑 Summary of Capabilities

Unlockt is an advanced, local-first open-source suite for bulk scraping, extracting, organizing, and offline preserving your Instagram Saved content library (posts, reels, carousel photo dumps, audio tracks, and collections).

---

## 1. 🔄 Synchronization & Scraping Engine

### 1.1 Multi-Mode Extraction
* **Quick Sync New (`syncNewOnly`) [RECOMMENDED]**:
  * Scans backwards from your newest saves until it matches the timestamp of your last stored post.
  * Typically completes in 1 to 3 requests without triggering Instagram security checks.
  * Designed for daily or routine incremental backups.
* **Full Vault Sync (`startSync`)**:
  * Traverses your entire Instagram saved archive from beginning to end.
  * Features randomized human-like jitter delays (`1200ms` to `2800ms`) between pagination queries.
* **Resume Interrupted Sync (`continueSync`)**:
  * Persists pagination cursor tokens locally in extension storage.
  * Resumes seamlessly from the exact checkpoint without re-requesting existing posts.

### 1.2 Rate-Limit & Detection Protection
* Employs adaptive backoff on HTTP 429 / checkpoint responses.
* Runs within the user's authentic browser session using existing cookies (`sessionid`, `ds_user_id`), requiring zero credential sharing with third-party servers.

---

## 2. 🎨 Carousel Studio & 1-Click High-Res Collage Maker

### 2.1 Multi-Slide Graph Decomposition
* Inspects each individual slide in a multi-image or video carousel album.
* Extracts full-resolution image dimensions, CDN URLs, and carousel indices (`_c0`, `_c1`, `_c2`, etc.).

### 2.2 1-Click High-Resolution Photo Collage Generator
* Renders all slides onto an HTML5 `<canvas>` in real-time.
* Calculates optimal dynamic grid layouts based on slide count:
  * 2 Slides: 2x1 Horizontal Split
  * 3 Slides: 3x1 or 1 Top + 2 Bottom
  * 4 Slides: 2x2 Clean Grid
  * 5–6 Slides: 2x3 or 3x2 Grid
  * 7–9 Slides: 3x3 Grid
  * 10+ Slides: 5x2 High-Density Layout
* Injects crisp `4px` white divider lines with aspect-ratio preservation.
* Exports directly as uncompressed PNG (`@creator_shortcode_collage.png`).

### 2.3 Selective Slide Batch ZIP Exporter
* Checkbox multi-select mode for individual slides or **Select All / Deselect All**.
* Bundles selected high-resolution images into a `.ZIP` package powered by `JSZip` and downloads with zero server overhead.

---

## 3. 🎬 Dedicated Reels & Video Inspector

### 3.1 9:16 In-App Full HD Video Player
* Custom glassmorphism video player supporting vertical 9:16 mobile format.
* Video playback scrubbing, loop toggle, volume control, and fullscreen mode.

### 3.2 Lossless Media & Audio Metadata
* Extracts video bitrate, frame dimensions (`1080x1920`), view counts, like counts, and duration.
* Detects background audio track metadata (title, artist, audio ID, original audio indicator).

### 3.3 Direct MP4 Video Extraction & CORS Proxy
* Local Express proxy (`/api/proxy-video`) bypasses Instagram CDN CORS headers and implements HTTP `206 Partial Content` (Byte-Range requests) for smooth video scrubbing.
* 1-click **Download MP4 Video** saved directly as `@username_shortcode.mp4`.

---

## 4. 🧠 AI Semantic Search & Smart Organization

### 4.1 Natural Language Concept Discovery
* Search saved items using natural language and semantic concepts (e.g., *"cyberpunk lighting"*, *"minimalist architecture"*, *"healthy meal prep"*, *"AI prompt workflows"*).
* Tokenizes captions, hashtags, creator usernames, and auto-generated image tags.

### 4.2 Category & Format Filtering
* Instant filtering tabs:
  * **All Saved** (Full library)
  * **Posts / Carousels** (Multi-photo albums and static imagery)
  * **Reels** (Short-form vertical video)
  * **Audio Tracks** (Audio-centric saves)
* Real-time sorting: Newest Saved, Oldest Saved, Most Likes, Most Views.

### 4.3 Creator Profile Explorer
* Aggregates saved items by author with profile pictures, total saves count, and direct profile navigation.

---

## 5. 📦 Download Manager & Master Backup Migration

### 5.1 Persistent Local Download History
* Tracks every exported item (Collages, ZIP packages, MP4 videos, Individual slides).
* Records export timestamp, file size, media type, and shortcode.

### 5.2 Master Database Backup & Restore
* 1-Click **Export Master Vault JSON** (`/api/export-data`): Creates an offline snapshot containing all content, collections, and download records.
* 1-Click **Import Master Vault JSON** (`/api/import-data`): Restores or merges archives across different machines or browsers.

### 5.3 Automated yt-dlp Batch Script Generator
* Generates executable batch/bash scripts formatted for `yt-dlp` to download media files in bulk via command-line.

---

## 6. 🔒 Security & Privacy Architecture

| Security Pillar | Implementation |
| :--- | :--- |
| **Data Storage** | 100% Local Filesystem (`data/saved.json`, `thumbnails/`, `videos/`) |
| **Session Handling** | Authenticated via active local Chromium cookie jar (Zero password input) |
| **Telemetry** | 0% Remote Tracking, 0% External Analytics, 0% Cloud Dependencies |
| **Licensing** | Open-source under the MIT License |

---

## 7. 💻 System & Compatibility Requirements

* **Operating Systems**: Windows 10/11, macOS (Intel & Apple Silicon), Linux (Ubuntu, Debian, Fedora, Arch).
* **Browsers**: Google Chrome, Brave, Microsoft Edge, Opera, Vivaldi, or any Chromium-based browser (Manifest V3).
* **Runtime**: Node.js `v18.0.0` or higher.
