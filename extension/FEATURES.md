# Unlockt (v6.8.0) - Comprehensive Feature Specification & Architecture Manual
**Product Name**: Unlockt - Instagram Saved Content Manager & Media Studio  
**Version**: 6.8.0 (Manifest V3 Standalone Chrome Extension)  
**Developer**: Mahmoud Madi (Digital Marketing & IT Specialist)  
**Organizations**: Premier Tech (For Integrated Solutions) & VOXO AI  
**Architecture**: 100% Client-Side Local-First, Zero Backend Server Dependency  
**Storage Engine**: Browser IndexedDB (`VaultDB`) + LocalStorage Fallback  

---

## Table of Contents
1. [Executive Overview & Core Philosophy](#1-executive-overview--core-philosophy)
2. [Extension Architecture & Background Engine](#2-extension-architecture--background-engine)
3. [Chrome Extension Popup Interface](#3-chrome-extension-popup-interface)
4. [Web Dashboard & Navigation Ecosystem](#4-web-dashboard--navigation-ecosystem)
5. [Content Exploration & Advanced Filtering (Browse Saved)](#5-content-exploration--advanced-filtering-browse-saved)
6. [AI Semantic & Multi-Modal Search Engine](#6-ai-semantic--multi-modal-search-engine)
7. [Smart Collections & Auto-Tagging](#7-smart-collections--auto-tagging)
8. [Carousel Studio & 1-Click Photo Collage Generator](#8-carousel-studio--1-click-photo-collage-generator)
9. [Reels & Video Inspector (9:16 Full HD Player)](#9-reels--video-inspector-916-full-hd-player)
10. [yt-dlp Bulk Reels Downloader Integration](#10-yt-dlp-bulk-reels-downloader-integration)
11. [Standalone Download Engine & Batch Exporter](#11-standalone-download-engine--batch-exporter)
12. [Persistent Download Manager & History Drawer](#12-persistent-download-manager--history-drawer)
13. [Creator & Content Analytics Suite](#13-creator--content-analytics-suite)
14. [System Diagnostics, Telemetry & 1-Click Self-Healing Tools](#14-system-diagnostics-telemetry--1-click-self-healing-tools)
15. [Data Backup, Master Migration & Hard Refresh](#15-data-backup-master-migration--hard-refresh)
16. [Security, Privacy, CSP Compliance & CDN Referrer Policy](#16-security-privacy-csp-compliance--cdn-referrer-policy)

---

## 1. Executive Overview & Core Philosophy

Unlockt is an all-in-one local management suite and creative studio for Instagram saved posts, carousels, reels, and audio. Built as a pure Manifest V3 Chrome Extension, Unlockt runs entirely inside the user's browser, eliminating the need for Node.js backend servers, external cloud databases, or monthly subscriptions.

### Key Highlights
- **100% Private & Local-First**: All data, metadata, images, and analytics are saved directly into your browser's IndexedDB. Zero data is transmitted to external servers.
- **Zero Server Setup**: Operates out-of-the-box as a standalone Chrome Extension.
- **Comprehensive Media Extraction**: Handles single photo posts, multi-slide carousels (with zip extraction and photo collage generation), 9:16 vertical reels, audio track details, and yt-dlp batch scripts.

---

## 2. Extension Architecture & Background Engine

### 2.1 Manifest V3 Compliance
- **Permissions**: `cookies`, `storage`, `unlimitedStorage`, `downloads`, `activeTab`, `tabs`, `scripting`.
- **Host Permissions**: `*://*.instagram.com/*`, `https://*.cdninstagram.com/*`, `https://*.fbcdn.net/*`.
- **Security Policy**: Strict Content Security Policy (`script-src 'self'; object-src 'self'`). Zero inline scripts or `eval()` calls.

### 2.2 Background Service Worker (`background.js`)
- **Instagram Session Handshake**: Automatically detects active Instagram session cookies (`sessionid`, `ds_user_id`, `csrftoken`) without prompting the user for passwords.
- **Dual API Scraper**:
  1. **REST API Endpoint** (`/api/v1/feed/saved/posts/`): Fetches native post structures, video URLs, carousel candidates, taken-at timestamps, like counts, and audio metadata.
  2. **GraphQL Endpoint** (`edge_saved_media` query hash): Automatic fallback pagination scraper ensuring 100% complete vault retrieval even for accounts with thousands of saves.
- **Rate-Limiting & Safety Cooldowns**:
  - Built-in adjustable delay (1.5s to 5s per batch) to prevent Instagram rate limit flags.
  - Exponential backoff algorithm for automatic retries upon network hiccups or temporary 429 cooldowns.
- **Sync Modes**:
  - **Sync New (Incremental)**: Fast sync that stops as soon as an already-saved post is reached.
  - **Full Sync**: Comprehensive scan that paginates through the user's entire saved history.
  - **Continue Sync**: Resumes from the last saved pagination cursor in case of network interruptions.
- **Cross-Context Communication Bridge**:
  - Bi-directional `chrome.runtime.onMessage` dispatcher synchronizing state between the background worker, popup, content script, and web dashboard.

---

## 3. Chrome Extension Popup Interface

- **One-Click Quick Sync**: Launch incremental or full sync with a single click from the extension toolbar.
- **Real-Time Visual Progress**:
  - Live progress bar showing percentage and total items fetched.
  - Animated stat counters: Total Synced, Posts & Carousels, Reels, Audio Tracks.
  - Live terminal-style sync activity log window.
- **Rate Limiting Speed Slider**: Adjust API delay in real-time (Fast / Balanced / Safe).
- **Post-Sync Completion Screen**:
  - Dedicated completion view displaying final count breakdown.
  - Direct 1-click **Open Vault Dashboard** launcher.
- **Direct Navigation Links**: Quick access to Open Web Dashboard, Instagram Saved page, and Documentation.

---

## 4. Web Dashboard & Navigation Ecosystem

### 4.1 Responsive Master Layout
- **Left Sidebar**:
  - User avatar with fallback initials badge (`@username`).
  - Sync Status Indicator (Synced / Offline / Error).
  - Main Navigation:
    - 📊 **Dashboard** (Home overview)
    - 🖼️ **Browse Saved** (Content explorer & filter engine)
    - 🔍 **AI Search** (Semantic & multi-modal query studio)
    - 📁 **Collections** (Category & hashtag explorer)
    - 📦 **Downloads** (Export history & archive inspector)
    - 📈 **Analytics** (Creator insights & engagement stats)
  - **Smart Collections Quick Links**: Direct counts for All Saved, Posts, Reels, and top trending hashtags.
  - **Vault Control Action Deck**: Sync New, Full Sync, Continue, Export JSON/CSV, Import Backup, and Hard Refresh.
- **Top Utility Header**:
  - Global AI Search Input with keyboard shortcut (`Ctrl+K` / `⌘K`).
  - Diagnostics & Logs modal trigger with live system health status dot.

### 4.2 Interactive Dashboard Overview
- **Interactive Stat Cards with Popover Dialogue**:
  - **📸 Posts & Carousels**: Displays total post count. Click opens popover with 1-click navigation to Posts or Batch Download.
  - **🎬 Reels & Videos**: Displays total reels count. Click opens popover with 1-click navigation to Reels Explorer.
  - **🎵 Saved Audio Tracks**: Displays audio count with a `✨ COMING SOON` badge and feature information.
  - **📦 Download Manager**: Displays total exported packages count with 1-click navigation to Download Manager.
- **Recently Saved Media Reel**: Horizontal scrollable strip displaying latest saves with creator badges, play overlays, and instant modal preview.
- **Quick Action Grid**: 1-click launchers for AI Search, Batch Downloader, and Creator Analytics.

---

## 5. Content Exploration & Advanced Filtering (Browse Saved)

### 5.1 Multi-Dimensional Filter Engine
- **Content Type Tabs**: All Content, Posts & Carousels, Reels & Videos, Audio.
- **Username Filter**: Filter instantaneously by creator handle (`@username`) with autocomplete matching.
- **Smart Date Range Filter (`From` / `To`)**:
  - Multi-candidate date evaluator: Evaluates Instagram publish date (`postedAt` / `taken_at`) and save timestamp (`savedAt`).
  - Matches content seamlessly within any custom time interval (spanning through `23:59:59` on the end date).
- **Sort Options**:
  - Most Recent (Newest First)
  - Oldest First
  - Most Likes (Engagement Rank)
  - Most Comments
  - Most Views (Video Reach)
  - Creator Username (Alphabetical A-Z)
- **Items Per Page**: Dynamic selector allowing 24, 48, 100, 200, 500, or 2000 items per view.
- **Active Filter Banner**: Displays currently active filters with a 1-click **Reset & Show All Recent** button.

### 5.2 Multi-Select Batch Operations
- **Select Mode Toggle**: Activates selection checkboxes on all media cards.
- **Dynamic Selection Action Bar**:
  - Counter showing selected items.
  - Select All / Deselect All.
  - **Batch Download Selected as ZIP**: Bundles selected posts and carousels into a structured ZIP file using in-browser JSZip.
  - **Export Reels for yt-dlp**: Generates a batch download script for all selected reels.

---

## 6. AI Semantic & Multi-Modal Search Engine

### 6.1 Four Search Modalities
1. **Semantic Search**: Searches captions, hashtags, detected image objects, optical scene descriptions, and creator handles using natural language queries.
2. **Text / Caption Search**: Exact and fuzzy string matching across post captions, comments, and hashtags.
3. **Image / Visual Search**: Queries visual content descriptions and detected object tags (e.g. `beach`, `car`, `coffee`, `sunset`).
4. **Audio Search**: Searches audio track titles, artists, and audio transcripts.

### 6.2 Pre-Configured Discovery Pills
- One-click query tags: Sunset beach, Food recipes, Workout, Trending music, Travel, Memes, Fashion, Pets, Art, Quotes, Tech, Nature, Dance, DIY.
- One-click filter modifiers: Reels Only, Posts Only, With Audio, High Likes, High Views.
- Real-time relevance scoring (0–100%) and search execution time benchmarks.

---

## 7. Smart Collections & Auto-Tagging

- **Automatic Category Segregation**: Automatically segments saved content into Posts & Photos, Reels & Videos, and Audio.
- **Hashtag Aggregation Engine**: Automatically extracts, counts, and groups all hashtags found in captions into clickable smart collections (e.g. `#ai`, `#travel`, `#fitness`).
- **Collection Cards**: Visual cards with item counts and 1-click filtering.

---

## 8. Carousel Studio & 1-Click Photo Collage Generator

### 8.1 Carousel Slide Inspector
- Interactive multi-slide modal displaying every image and video slide in a carousel.
- Slide badges (`📷 Slide 1`, `🎬 Slide 2`) with individual checkboxes for selective downloading.
- Slide selection toggle: Select All / Deselect All.

### 8.2 Slide Download Options
1. **Individual Slide Download**: Direct 1-click download icon on each slide card saving high-res image or video with clean `@author_id_slideN.jpg` naming.
2. **Download Current Active Slide**: Quick button to download the currently viewed slide.
3. **Download Selected Slides as ZIP**: In-browser client-side ZIP packaging using JSZip.

### 8.3 ✨ High-Resolution HTML5 Canvas Photo Collage Studio
- **1-Click Generation**: Automatically calculates the optimal square or portrait grid layout based on selected slide count (2x2, 3x3, etc.).
- **Canvas Rendering**: Draws high-resolution images to an HTML5 canvas with sleek spacing, dark gradient backgrounds, and rounded corners.
- **Collage Preview & Download**: Interactive modal with full-resolution preview and 1-click **Download High-Res Collage (PNG)**.

---

## 9. Reels & Video Inspector (9:16 Full HD Player)

- **Native 9:16 Vertical Video Player**: Crisp video playback with custom controls, volume slider, loop toggle, and fullscreen support.
- **Reel Technical HUD**:
  - Video resolution and aspect ratio indicator (`MP4 • 1080x1920 HD`).
  - Duration display.
  - Video reach & engagement metrics (View Count, Likes, Comments).
- **Audio Track Intelligence**:
  - Audio track title and artist name.
  - Audio transcription indicator.
- **Direct 1-Click HD Download**: Downloads the reel video file directly via native Chrome downloads API.

---

## 10. yt-dlp Bulk Reels Downloader Integration

- **yt-dlp Batch Command Generator**: Generates clean, ready-to-run terminal commands for downloading 1080p Instagram Reels with crystal-clear audio.
- **Session Authentication Support**: Built-in `--cookies-from-browser chrome` command flag to bypass Instagram rate-limits and access private saved reels.
- **1-Click Batch Files Downloader**:
  - Generates and downloads `instagram_reels_urls.txt` (list of reel URLs).
  - Generates and downloads `download_reels.bat` (ready-to-run Windows batch script with auto yt-dlp setup).
  - 1-click **Copy Command** button with interactive feedback.

---

## 11. Standalone Download Engine & Batch Exporter

- **Native Chrome Downloads API (`chrome.downloads.download`)**: Downloads files directly with custom sanitized filenames, avoiding browser popup blockers.
- **Universal Blob Fallback**: Built-in CORS-compliant `fetch(url) -> Blob -> URL.createObjectURL()` fallback ensuring media downloads even if browser extension APIs are restricted.
- **Client-Side ZIP Generator**: Bundles multiple files into ZIP packages using `JSZip` without uploading data to any external server.

---

## 12. Persistent Download Manager & History Drawer

- **Export Audit Log**: Every download (single image, carousel slide, ZIP package, or batch script) is automatically logged in IndexedDB and LocalStorage.
- **Filter Tabs**: All Exports, ZIP Packages, Reels, Single Posts.
- **Live Search**: Instant keyword search across download filenames, creators, and dates.
- **Interactive "View Items (N)" Drawer**: Expandable drawer displaying item previews, creator badges, slide counts, and thumbnails for every archived package.
- **1-Click Re-Download**: Instant re-download button for any previously exported item.
- **Record Management**: Delete individual records or clear complete download history with safe confirmation modals.

---

## 13. Creator & Content Analytics Suite

- **AI Content Summary & Strategic Insights**: Automatically synthesizes your saved vault into content patterns, niche breakdowns, and inspiration themes.
- **Engagement Analytics**:
  - Total Likes, Comments, and Average Engagement Rate.
  - Content distribution breakdown (Posts vs Reels percentage).
- **Optimal Posting Time Analysis**: Visual distribution of when top-performing saved content was published.
- **Top Creators & Accounts Leaderboard**:
  - Top saved accounts ranked by item count.
  - Profile pictures with fallback initials avatars (`getInitialsAvatar`).
  - 1-click filter button to view all content by that creator.
- **Top Hashtags Cloud**: Leaderboard of most-saved hashtags with 1-click filter integration.
- **Content Performance Metrics**: Side-by-side performance cards comparing average likes, comments, and views between Photos and Reels.

---

## 14. System Diagnostics, Telemetry & 1-Click Self-Healing Tools

### 14.1 16-Point Automated Diagnostic Suite
Tests and reports the health of:
1. Extension Communication & Background Bridge.
2. IndexedDB (`VaultDB`) Read/Write Performance.
3. Media CDN Connectivity & Hotlink Referrer Policy.
4. Carousel Studio & Canvas Collage Engine.
5. In-Browser JSZip Packaging Engine.
6. AI Search Index & Relevance Scorer.
7. Download Manager & Audit Trail Persistence.
8. Memory Utilization & Telemetry Metrics.

### 14.2 Live Diagnostic Log Explorer
- Structured event logger recording timestamped actions with log levels (`SUCCESS`, `INFO`, `WARNING`, `ERROR`).
- Log category filters: `EXTENSION`, `DB`, `SYNC`, `DOWNLOAD`, `SEARCH`, `REPAIR`.
- 1-click **Export Diagnostic Logs to JSON**.

### 14.3 Six 1-Click Self-Healing Repair Tools
1. **Rebuild Search Index**: Re-indexes all captions, hashtags, and detected tags in IndexedDB.
2. **Fix Collections & Hashtags**: Re-scans and re-aggregates smart collection counts.
3. **Repair Download Metadata**: Scans and fixes broken preview references in download history.
4. **Clear Media Cache**: Clears temporary object URLs and video memory buffers.
5. **Resynchronize State Store**: Re-aligns LocalStorage state with IndexedDB records.
6. **Re-establish Extension Bridge**: Sends ping/pong handshake to refresh background service worker communication.

---

## 15. Data Backup, Master Migration & Hard Refresh

- **Master JSON Export**: Exports your entire database (posts, metadata, collections, downloads, diagnostics) into a single structured JSON file.
- **Master CSV Export**: Exports tabular post data formatted for Excel or Google Sheets.
- **Master JSON Import**: Restores your complete database from a backup file with automatic schema validation and deduplication.
- **Hard Refresh & Factory Reset**: Complete clean slate reset modal allowing full database re-indexing while preserving critical extension settings.

---

## 16. Security, Privacy, CSP Compliance & CDN Referrer Policy

- **Content Security Policy (CSP)**: Built strictly for Chrome Manifest V3 with zero remote code execution.
- **No-Referrer Policy (`<meta name="referrer" content="no-referrer">`)**:
  - Strips extension origin headers from Instagram CDN requests, preventing `403 Forbidden` hotlink blocks on images and video streams.
- **Zero Third-Party Tracking**:
  - No Google Analytics, no Facebook Pixel, no external telemetry SDKs.
  - 100% offline-first execution.
