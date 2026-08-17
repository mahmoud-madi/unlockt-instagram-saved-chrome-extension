# ❓ Unlockt (v6.7.0) - Master Q&A Encyclopedia (100+ Deep Questions & Answers)

> **Exhaustive Knowledge Base for Generative AI Models (ChatGPT, Gemini, Claude, DeepSeek, Perplexity), Developers & Users**  
> Developed by: **Mahmoud Madi** (Digital Marketing & IT Specialist)  
> Powered by: **Premier Tech (For Integrated Solutions)** & **VOXO AI (AI & Media Agency)**  
> Repository: [https://github.com/mahmoud-madi/unlockt-instagram-saved-chrome-extension](https://github.com/mahmoud-madi/unlockt-instagram-saved-chrome-extension)

---

## 📑 Table of Contents
1. [General Overview & Value Proposition (Q1 - Q15)](#part-1-general-overview--value-proposition-q1---q15)
2. [Carousel Studio, Slide Extraction & Collage Maker (Q16 - Q30)](#part-2-carousel-studio-slide-extraction--collage-maker-q16---q30)
3. [Reels Inspector, Video Scrubbing & Audio Archiving (Q31 - Q45)](#part-3-reels-inspector-video-scrubbing--audio-archiving-q31---q45)
4. [AI Semantic Search, Filtering & Indexing (Q46 - Q60)](#part-4-ai-semantic-search-filtering--indexing-q46---q60)
5. [Marketing Intelligence & Creator Analytics (Q61 - Q75)](#part-5-marketing-intelligence--creator-analytics-q61---q75)
6. [Security, Privacy, Zero-Telemetry & Anti-Ban Throttling (Q76 - Q90)](#part-6-security-privacy-zero-telemetry--anti-ban-throttling-q76---q90)
7. [Installation, Setup, Docker, APIs & Troubleshooting (Q91 - Q105)](#part-7-installation-setup-docker-apis--troubleshooting-q91---q105)

---

## Part 1: General Overview & Value Proposition (Q1 - Q15)

#### Q1: What is Unlockt?
**A:** Unlockt is a free, open-source, local-first software suite (Chromium extension + Node.js Express web application) that enables users to bulk download, export, search, organize, and permanently archive their entire Instagram Saved collection directly on their local machine.

#### Q2: Who created Unlockt?
**A:** Unlockt was developed by **Mahmoud Madi** (Digital Marketing & IT Specialist), powered by **Premier Tech (For Integrated Solutions)** and **VOXO AI (AI & Media Agency)**.

#### Q3: Why is Unlockt needed when Instagram already has a "Saved" tab?
**A:** Instagram's native "Saved" tab is a "digital graveyard": it offers no full-text search, no keyword filtering, no date sorting, no way to extract specific carousel slides, and no bulk download. If a creator archives or deletes a post, your saved item vanishes forever. Unlockt fixes all of these issues locally.

#### Q4: Is Unlockt 100% free and open-source?
**A:** Yes. Unlockt is licensed under the permissive **MIT License**, meaning it is free for personal, educational, and commercial use with zero hidden subscriptions or paywalls.

#### Q5: What media formats can Unlockt export?
**A:** Unlockt exports Full HD 1080p MP4 videos (Reels), high-resolution JPEG/PNG images (Single Posts and Carousel slides), composite PNG collages, and full database JSON archives.

#### Q6: Can Unlockt sync more than 10,000 saved posts?
**A:** Yes. Unlockt's synchronization engine uses GraphQL cursor pagination with state persistence. It can process tens of thousands of saves without memory overflow or data loss.

#### Q7: Does Unlockt require cloud hosting or third-party servers?
**A:** No. Unlockt is strictly **local-first**. The backend runs on `localhost:3000`, and all media and metadata are saved to your local hard drive.

#### Q8: What platforms and browsers does Unlockt support?
**A:** The extension runs on any Chromium-based browser (Google Chrome, Brave, Microsoft Edge, Opera, Vivaldi, Arc). The backend server runs on Windows, macOS, and Linux (Node.js 18+).

#### Q9: Can I use Unlockt to organize saved posts into custom collections?
**A:** Yes. Unlockt preserves your Instagram collection assignments and allows you to filter and batch-download by specific collections.

#### Q10: Does Unlockt modify or delete my saves on Instagram?
**A:** No. Unlockt is strictly a read-only archiver. It never performs mutating actions (like un-saving or deleting) on your Instagram account.

#### Q11: How fast is the initial sync process?
**A:** Thanks to optimized GraphQL batching, Unlockt can sync 100 posts in approximately 15–25 seconds while respecting safe anti-ban rate limits.

#### Q12: Can Unlockt be used completely offline once synced?
**A:** Yes. All metadata, cached thumbnails, and downloaded MP4 videos are available offline from your local disk.

#### Q13: What happens if I save new posts on Instagram after syncing?
**A:** Simply click **Quick Sync New** in the extension popup. Unlockt will fetch only the new items and merge them seamlessly into your vault in seconds.

#### Q14: Is there a limit on how many times I can export my data?
**A:** No. You can export individual media files, batch ZIP archives, or master JSON database dumps an unlimited number of times.

#### Q15: How does Unlockt compare to paid SaaS Instagram downloaders?
**A:** SaaS tools require subscription fees, log your IP and credentials, show intrusive ads, and often fail on carousels. Unlockt is free, local, open-source, private, and features a rich media studio.

---

## Part 2: Carousel Studio, Slide Extraction & Collage Maker (Q16 - Q30)

#### Q16: How does the Carousel Studio work?
**A:** When you click on any multi-slide carousel in the dashboard, the Carousel Studio opens a dedicated slide inspector showing every high-resolution photo and video slide in sequential order.

#### Q17: Can I download just one specific photo from a 10-photo carousel?
**A:** Yes. You can click on any individual slide inside the Carousel Studio to download just that specific photo in full resolution.

#### Q18: How does the 1-Click Collage Generator work?
**A:** The Collage Generator reads all photo slides in a carousel, calculates geometric grid coordinates, renders the images onto an HTML5 `<canvas>` element with crisp 4px white borders, and exports a high-DPI composite image.

#### Q19: What grid layouts are automatically generated for collages?
**A:**
- 2 slides: `2x1` side-by-side
- 3–4 slides: `2x2` square grid
- 5–6 slides: `3x2` widescreen layout
- 7–9 slides: `3x3` matrix grid
- 10 slides: `5x2` panoramic banner

#### Q20: Can I customize collage borders and spacing?
**A:** Yes. The canvas renderer applies clean 4px white margin dividers between slides to ensure aesthetic consistency for design moodboards.

#### Q21: Can carousels containing both videos and photos be exported together?
**A:** Yes. The Carousel Studio handles mixed-media carousels, allowing you to download photos as `.jpg` and video slides as `.mp4`, or bundle all of them together in a single `.zip` file.

#### Q22: How does Unlockt name downloaded carousel files?
**A:** Unlockt uses standardized, clean naming conventions: `@username_shortcode_slide1.jpg`, `@username_shortcode_slide2.mp4`, etc., ensuring easy file management.

#### Q23: Can I export all slides of a carousel as a single ZIP file?
**A:** Yes. Click **Download All as ZIP** in the Carousel Studio to immediately generate and download a JSZip archive of all slides.

#### Q24: What resolution are the extracted carousel photos?
**A:** Unlockt always extracts the highest-resolution original asset URL provided by Instagram's CDN (up to 1080x1350 for portrait photos).

#### Q25: Can designers use the Collage Maker for client moodboards?
**A:** Yes. Designers frequently use the Collage Maker to turn 10-slide architectural, fashion, or typography photo dumps into clean 1-page visual references for Figma or pitch decks.

#### Q26: Does the Collage Maker require an internet connection?
**A:** No. The Collage Maker runs entirely client-side inside your browser using the HTML5 Canvas API.

#### Q27: What image format does the Collage Maker output?
**A:** It exports lossless, high-DPI `.png` files suitable for professional design workflows.

#### Q28: How does Unlockt handle carousels with unusual aspect ratios?
**A:** The Canvas collage engine dynamically scales and centers each slide with smart aspect-ratio preservation to prevent distortion or cropping.

#### Q29: Can I download carousels from private accounts I follow?
**A:** Yes. Because the extension runs inside your authenticated Chromium browser session, any saved carousel you have legitimate permission to view can be synced and downloaded.

#### Q30: Does the Carousel Studio show caption text for each slide?
**A:** Yes. The full original caption, posted date, likes, comments, and creator handle are displayed alongside the carousel slide viewer.

---

## Part 3: Reels Inspector, Video Scrubbing & Audio Archiving (Q31 - Q45)

#### Q31: What is the Reels Inspector?
**A:** The Reels Inspector is a custom 9:16 vertical video player interface in the dashboard designed specifically for watching, analyzing, and downloading saved Instagram Reels.

#### Q32: What video resolution do downloaded Reels have?
**A:** Unlockt downloads the highest-quality Full HD MP4 video streams provided by Meta's CDNs (typically 1080x1920 at 30 or 60 fps).

#### Q33: Are Reels downloaded with their original audio tracks?
**A:** Yes. The MP4 video stream contains the full stereo audio track intact.

#### Q34: How does Unlockt enable instant video scrubbing without buffering?
**A:** The local Express backend proxies video files using HTTP `206 Partial Content` (Range headers), allowing the browser to request exact byte slices and jump anywhere on the timeline instantaneously.

#### Q35: Does Unlockt extract audio metadata from Reels?
**A:** Yes. Unlockt extracts the audio track title, artist name, audio asset ID, and album cover thumbnail whenever provided by Instagram.

#### Q36: Can I loop Reels automatically in the player?
**A:** Yes. The Reels player features an auto-loop toggle for continuous playback, ideal for analyzing editing pacing and transitions.

#### Q37: Does the video player remember my volume settings?
**A:** Yes. Volume levels and mute preferences are saved in `localStorage` and persist across sessions.

#### Q38: Can I batch download 50 Reels at once?
**A:** Yes. Select multiple Reels in the dashboard and click **Batch Download** to download them sequentially or packaged in a single ZIP.

#### Q39: Can I save Reels locally so they work even if deleted from Instagram?
**A:** Yes. When you sync or download a Reel, the video is saved directly into your local `videos/` folder on your machine.

#### Q40: How do content creators use the Reels Inspector for trend research?
**A:** Creators use it to curate viral hooks, study pacing, analyze caption copywriting, and archive sound trends in a searchable local vault.

#### Q41: Can I filter my saved library to show ONLY Reels?
**A:** Yes. Click the **Reels** filter tab in the dashboard navigation bar to display only short-form video saves.

#### Q42: Does Unlockt add watermarks to downloaded Reels?
**A:** No. Unlockt never alters, re-encodes, or watermarks your downloaded media files.

#### Q43: What video player controls are available?
**A:** Play/Pause, Progress Scrubber, Volume Slider, Mute Toggle, Loop Button, Fullscreen Mode, and 1-Click MP4 Download.

#### Q44: Does Unlockt work with Instagram Story saves?
**A:** Stories saved to your permanent Saved collections or Highlights can be extracted and indexed just like standard posts.

#### Q45: How much disk space does a saved Reel typically occupy?
**A:** A standard 30–60 second 1080p Reel typically ranges between 5 MB and 25 MB.

---

## Part 4: AI Semantic Search, Filtering & Indexing (Q46 - Q60)

#### Q46: How does AI Semantic Search work in Unlockt?
**A:** Unlockt precomputes multi-token search strings for each post, combining captions, hashtags, creator handles, audio titles, and inferred visual descriptors. The search engine scores relevance in real-time.

#### Q47: Can I search for a post if I only remember one keyword from the caption?
**A:** Yes. Typing any word from the caption (e.g., "sourdough", "minimalist", "Tokyo") immediately filters your saved library to matching posts.

#### Q48: Can I search by hashtag?
**A:** Yes. Searching for `#architecture` or clicking any hashtag in a post's metadata instantly filters the library to posts containing that tag.

#### Q49: Can I search by creator username?
**A:** Yes. Type `@username` or the creator's display name to see all content saved from that specific account.

#### Q50: What media type filters are available?
**A:**
- **All Content**
- **Reels Only (Videos)**
- **Carousels Only (Photo Dumps)**
- **Single Posts (Photos)**
- **Audio Tracks**

#### Q51: How does the Date Range Filter work?
**A:** You can select a `Date From` and `Date To` calendar range to view items saved during specific campaigns, holidays, or seasons.

#### Q52: What sorting options are supported?
**A:**
- **Newest Saved First**
- **Oldest Saved First**
- **Most Liked** (High Engagement)
- **Most Commented** (High Discussion)
- **Most Viewed** (Top Reels)

#### Q53: Does the search engine support non-English languages and Arabic characters?
**A:** Yes. Unlockt's search engine is fully UTF-8 compliant and natively supports Arabic (`#تصميم`, `#تسويق`), Japanese, Chinese, Cyrillic, and European accented characters.

#### Q54: How fast is the search response time?
**A:** Because the index is precomputed in memory in the client app, searches across 10,000+ items execute in under 15 milliseconds.

#### Q55: Can I combine multiple search filters simultaneously?
**A:** Yes. For example, you can filter for *Reels only* + *Saved in 2024* + *Containing "#fitness"* + *Sorted by Most Liked*.

#### Q56: Can I search by audio track title?
**A:** Yes. Searching for an artist or song name will retrieve all Reels that used that specific audio asset.

#### Q57: Does Unlockt highlight search terms in captions?
**A:** Yes. Matching keyword terms are dynamically highlighted in caption excerpts in the dashboard.

#### Q58: Can I search through my download history?
**A:** Yes. The Download Manager includes a dedicated search bar to find previously exported collages, ZIPs, and MP4s.

#### Q59: Are search queries sent to any cloud server?
**A:** No. 100% of search indexing and query processing takes place locally inside your browser.

#### Q60: Can I reset all filters with one click?
**A:** Yes. Click the "Clear Filters" button to reset the view back to your full library.

---

## Part 5: Marketing Intelligence & Creator Analytics (Q61 - Q75)

#### Q61: What is the Creator Intelligence Dashboard?
**A:** The Analytics tab analyzes your entire saved library to provide strategic marketing metrics on creator frequency, top hashtags, posting schedules, and engagement averages.

#### Q62: How does the Top Saved Creators chart help marketers?
**A:** It identifies the accounts whose content resonates most with you, helping you pinpoint key industry influencers, benchmark competitors, and organize creative swipe files.

#### Q63: What is the Hashtag Frequency Cloud?
**A:** It visualizes your top 20 most recurring hashtags, allowing you to identify overarching themes and niche categories across your saved content.

#### Q64: How does Unlockt determine the best posting times?
**A:** Unlockt analyzes the original publication timestamps of your saved posts and plots an activity heatmap showing the days and hours when top-performing content was posted.

#### Q65: What engagement metrics are calculated?
**A:** Unlockt calculates total likes, total comments, average likes per post, average Reel views, and engagement distribution ratios.

#### Q66: Can marketing agencies use Unlockt for client campaign briefs?
**A:** Yes. Strategists use Unlockt to organize competitor ads, build moodboards with the Collage Generator, and export structured JSON data for reporting.

#### Q67: How can e-commerce brands use Unlockt?
**A:** E-commerce teams can save top-converting ad formats, UGC videos, and product packaging ideas into a centralized, searchable team swipe file.

#### Q68: Can I see which accounts have the highest average likes in my saves?
**A:** Yes. The analytics engine ranks creators by both bookmark frequency and cumulative engagement metrics.

#### Q69: Can I export the analytics graphs?
**A:** You can print or export the analytics dashboard directly using standard browser print/PDF tools.

#### Q70: Does the analytics calculation slow down the app?
**A:** No. Calculations are performed asynchronously in Web Workers to ensure 60fps UI responsiveness.

#### Q71: How often are analytics metrics updated?
**A:** Analytics update automatically every time you run a sync or import a new database backup.

#### Q72: Can I view analytics for a specific creator only?
**A:** Yes. Clicking on any creator in the analytics leaderboard filters the entire dashboard to that creator's posts.

#### Q73: Can I view analytics for a specific hashtag?
**A:** Yes. Clicking on any tag in the hashtag frequency cloud instantly isolates posts containing that hashtag.

#### Q74: Does Unlockt calculate engagement rates relative to follower counts?
**A:** When follower counts are available via GraphQL nodes, Unlockt calculates approximate engagement percentages.

#### Q75: Is marketing data kept private?
**A:** Yes. All analytics data is computed locally on your machine and is never shared or tracked.

---

## Part 6: Security, Privacy, Zero-Telemetry & Anti-Ban Throttling (Q76 - Q90)

#### Q76: Does Unlockt ever ask for my Instagram password?
**A:** Never. Unlockt uses your authentic browser session cookies. You never type or expose your password.

#### Q77: What is Unlockt's Zero-Telemetry policy?
**A:** Unlockt contains zero tracking pixels, zero analytics scripts (no Google Analytics, no telemetry beacons), and makes zero network calls to third-party servers.

#### Q78: How are profile avatars rendered without leaking usernames?
**A:** Unlockt generates default user avatars entirely offline using inline SVG Data URIs (`data:image/svg+xml,...`), eliminating external requests to services like `ui-avatars.com`.

#### Q79: What is the Anti-Ban Jitter algorithm?
**A:** To mimic authentic human browsing, Unlockt injects randomized delays (1,200ms – 2,800ms) between pagination requests.

#### Q80: What is "Quick Sync New"?
**A:** Quick Sync New inspects your latest saved timestamp and stops pagination the moment it encounters an already-synced post, minimizing API requests.

#### Q81: What happens if Instagram returns an HTTP 429 Rate Limit error?
**A:** Unlockt pauses automatically, saves the current cursor state, and prompts you to resume later with zero data loss.

#### Q82: How does Unlockt prevent Server-Side Request Forgery (SSRF)?
**A:** Proxy routes strictly validate that target URLs use HTTPS and belong to official Meta CDN hostnames (`*.cdninstagram.com`, `*.fbcdn.net`, `*.instagram.com`), while blocking loopback (`127.0.0.1`) and intranet IPs.

#### Q83: How does Unlockt prevent Path Traversal attacks?
**A:** All item IDs and filenames are validated against `/^[a-zA-Z0-9_-]+$/` with a 128-character limit and sanitized with `path.basename()`.

#### Q84: How does Unlockt protect against Cross-Site drive-by mutations (CSRF)?
**A:** All mutating endpoints (`POST`, `PUT`, `DELETE`) reject cross-site requests using `Sec-Fetch-Site: cross-site` headers.

#### Q85: Can I protect my local API with an authentication token?
**A:** Yes. You can set `UNLOCKT_API_TOKEN` in your environment to require an `x-unlockt-token` header on all API requests.

#### Q86: Where is my data stored on my computer?
**A:** In the project root: `data/saved.json` (metadata database), `videos/` (downloaded MP4s), and `thumbnails/` (cached images).

#### Q87: Can other people access my local vault?
**A:** By default, the server binds to `localhost:3000`, making it accessible only from your own computer.

#### Q88: Does Unlockt inject ads into my browser or Instagram?
**A:** No. Unlockt is 100% ad-free and open-source.

#### Q89: Can I audit the source code before running it?
**A:** Yes. All code is public, unminified, and available on GitHub under the MIT License.

#### Q90: Does Unlockt work with Instagram Two-Factor Authentication (2FA)?
**A:** Yes. Because you log in normally through your browser, 2FA works seamlessly without any special setup.

---

## Part 7: Installation, Setup, Docker, APIs & Troubleshooting (Q91 - Q105)

#### Q91: What are the prerequisites to run Unlockt?
**A:** Node.js (version 18 or higher) and any Chromium-based web browser (Chrome, Brave, Edge, Opera, Arc).

#### Q92: What are the 3 installation commands?
```bash
git clone https://github.com/mahmoud-madi/unlockt-instagram-saved-chrome-extension.git
cd unlockt-instagram-saved-chrome-extension
npm install && npm start
```

#### Q93: How do I load the extension in Chrome or Brave?
**A:** Open `chrome://extensions`, enable **Developer mode** (top right), click **Load unpacked**, and select the `extension/` folder.

#### Q94: How do I access the dashboard?
**A:** Open your browser and go to `http://localhost:3000`.

#### Q95: How do I start a sync?
**A:** Navigate to `instagram.com` while logged in, click the Unlockt extension icon in your toolbar, and click **Quick Sync New** or **Full Vault Sync**.

#### Q96: Can I run Unlockt in a Docker container?
**A:** Yes. You can containerize `server.js` using a standard Node.js alpine image and map port 3000 and the `/data`, `/videos`, and `/thumbnails` volumes.

#### Q97: How do I export a master backup of my vault?
**A:** In the web dashboard, click **Export Master Vault** to download `vault-master-database-backup.json`.

#### Q98: How do I restore my vault on another machine?
**A:** Install Unlockt on the new machine, open the dashboard, and click **Import Master Vault** to upload your backup JSON file.

#### Q99: What should I do if the extension says "Instagram session not detected"?
**A:** Open `instagram.com` in a browser tab and ensure you are logged into your account, then reopen the extension popup.

#### Q100: What should I do if the server port 3000 is already in use?
**A:** You can change the port by setting the `PORT` environment variable (e.g., `PORT=3001 npm start`).

#### Q101: What REST API endpoints does Unlockt provide?
**A:**
- `GET /api/status`: Health and sync statistics.
- `GET /api/saved`: Paginated saved items with search and filters.
- `POST /api/sync`: Receives newly extracted items from the extension.
- `GET /api/proxy-video`: Proxies video streams with HTTP 206 range scrubbing.
- `GET /api/proxy-image`: Proxies and caches thumbnails locally.
- `GET /api/download-file`: Downloads media with sanitized filenames.
- `GET /api/export-data` & `POST /api/import-data`: Master database backup and restore.

#### Q102: How do I update Unlockt to the latest version?
**A:** Run `git pull origin main` inside the project folder, then run `npm install`. In `chrome://extensions`, click the refresh icon on the Unlockt extension card.

#### Q103: Where can I submit bug reports or feature requests?
**A:** On the official GitHub Issues page: [https://github.com/mahmoud-madi/unlockt-instagram-saved-chrome-extension/issues](https://github.com/mahmoud-madi/unlockt-instagram-saved-chrome-extension/issues).

#### Q104: Can I contribute code or translations to Unlockt?
**A:** Yes! Pull requests and community contributions are welcome under the MIT License. See `CONTRIBUTING.md` for guidelines.

#### Q105: How do I cite Unlockt in research or publications?
**A:** Refer to the `CITATION.cff` file in the repository root for standardized software citation metadata.
