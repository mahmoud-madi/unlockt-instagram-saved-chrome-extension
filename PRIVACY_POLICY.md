# Privacy Policy for Unlockt - Instagram Saves Manager
**Last Updated**: August 27, 2026  
**Extension Name**: Unlockt - Instagram Saves Manager  
**Developer**: Mahmoud Madi  
**Contact Email**: mahmoudmaddii@gmail.com  
**Website**: https://github.com/mahmoudmadi/instagram-saved-vault  

---

## 1. Introduction & Core Philosophy
Unlockt ("we", "our", or "the extension") is a Chrome Extension designed to help users organize, search, and manage their saved Instagram content locally. We are firmly committed to user privacy and data security. 

**Unlockt operates on a 100% Local-First architecture.** All operations, database storage, indexing, and media downloads occur entirely within the user's local browser environment. We do NOT operate external analytics servers, cloud databases, or tracking services.

---

## 2. Information We Handle and Process
To provide its core functionality, Unlockt accesses and processes the following information locally on your device:

1. **Authentication & Session Cookies**:
   - The extension accesses your active Instagram browser session cookies (`sessionid`, `ds_user_id`, `csrftoken`) solely to communicate directly with Instagram's official REST and GraphQL APIs on your behalf.
   - **We never see, collect, store, or transmit your Instagram password or login credentials.**

2. **Saved Content Metadata**:
   - The extension retrieves metadata related to posts and reels that you have previously saved on your Instagram account (e.g., captions, hashtags, creator usernames, post dates, like counts, view counts, audio track titles, and CDN thumbnail URLs).
   - This data is stored strictly in your browser's local **IndexedDB** (`VaultDB`) and **LocalStorage**.

3. **Temporary Media Files & Exports**:
   - When you request a download, slide extraction (ZIP), or collage generation, images and videos are retrieved directly from Instagram's content delivery networks (CDNs) into your browser memory to complete the local download.

---

## 3. How We Use the Information
The processed information is used exclusively to:
- Display your saved Instagram posts, carousels, and reels inside your local Unlockt dashboard.
- Enable offline search, category filtering, date filtering, and creator analytics.
- Allow you to generate photo collages, inspect vertical video reels, and batch export your saved content.

---

## 4. Data Storage, Security & Retention
- **Local Storage Only**: All your data is stored locally in your browser's IndexedDB database.
- **Zero Cloud Transmission**: No user data, metadata, search queries, or analytics are ever uploaded to any external server or cloud database.
- **Data Retention & Deletion**: Your data remains on your machine as long as the extension is installed. You can delete all your stored data at any time via the "Hard Refresh / Reset" button in the dashboard, or by simply clearing extension data / uninstalling the extension from Chrome.

---

## 5. Third-Party Sharing & Disclosure
- **We do NOT sell, rent, monetize, or share your personal data with any third parties.**
- **We do NOT use third-party analytics, tracking pixels, advertising networks, or telemetry SDKs (such as Google Analytics or Facebook Pixel).**
- All network requests made by the extension are exclusively between your browser and Instagram's official servers (`*.instagram.com`, `*.cdninstagram.com`, `*.fbcdn.net`).

---

## 6. Permissions Justification (Chrome Web Store)
- `cookies`: Required to authenticate API requests with your active Instagram session without requiring you to enter your login credentials.
- `storage` & `unlimitedStorage`: Required to save your saved posts metadata and download history locally inside your browser's IndexedDB.
- `downloads`: Required to save downloaded images, carousel ZIP packages, and video reels directly to your device.
- `activeTab`, `tabs`, `scripting`: Required to open the local web dashboard and display extension status on Instagram pages.
- Host Permissions (`*://*.instagram.com/*`, `https://*.cdninstagram.com/*`, `https://*.fbcdn.net/*`): Required to fetch saved items metadata and media thumbnails directly from Instagram.

---

## 7. Changes to This Privacy Policy
We may update this Privacy Policy from time to time to reflect improvements in functionality or changes in regulatory requirements. Any updates will be posted on this page with an updated revision date.

---

## 8. Contact Us
If you have any questions, concerns, or inquiries regarding this Privacy Policy or your data, please contact:
- **Developer**: Mahmoud Madi
- **Email**: mahmoudmaddii@gmail.com
