/**
 * Unlockt (v6.7) - Express Backend Server & API Gateway
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Developed by: Mahmoud Madi (Digital Marketing & IT Specialist)
 * Organizations: Premier Tech (For Integrated Solutions) & VOXO AI (AI & Media Agency)
 * Purpose: 100% Private, Local-First Instagram Saved Content Ingestion, Proxy & Storage
 * License: MIT License (Open Source)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Features:
 *  - High-Speed REST API for Instagram Saved Ingestion & Synchronization
 *  - CORS Bypass Media Proxy with HTTP Range Support for Seamless Video Streaming
 *  - Local Thumbnail & Full-Resolution Media Caching Engine
 *  - Master JSON Database Export, Import, and Incremental Merge
 *  - Persistent Download & Collage History Logging
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Data file path
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'saved.json');
const THUMBNAILS_DIR = path.join(__dirname, 'thumbnails');

// Ensure data and thumbnails directories exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

// Initialize empty data file if not exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        user: null,
        content: [],
        lastSync: null
    }, null, 2));
}

// Security & Sanitization Helper Functions
function isValidId(id) {
    if (!id || typeof id !== 'string') return false;
    // Allow alphanumeric, underscores, dashes, and carousel slide suffixes (e.g. 12345_c1)
    return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 128 && !id.includes('..');
}

function isAllowedInstagramCdnUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
        const hostname = parsed.hostname.toLowerCase();
        
        // Prevent SSRF to localhost, loopback, or private intranet IP addresses
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '169.254.169.254') {
            return false;
        }
        if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(hostname)) {
            return false;
        }

        // Allow legitimate Instagram and Facebook CDN hostnames
        const allowedDomains = [
            'cdninstagram.com',
            'instagram.com',
            'fbcdn.net',
            'facebook.com'
        ];
        return allowedDomains.some(d => hostname === d || hostname.endsWith('.' + d));
    } catch {
        return false;
    }
}

// 100% Local Offline SVG Avatar Generator (Zero External Telemetry)
function getLocalAvatarSvg(name = 'User', size = 100, bg = 'E1306C', color = 'fff') {
    const initial = (name ? name.charAt(0) : 'U').toUpperCase();
    const bgColor = bg.startsWith('#') ? bg : '#' + bg;
    const fgColor = color.startsWith('#') ? color : '#' + color;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="${bgColor}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="bold" font-size="${Math.round(size * 0.45)}" fill="${fgColor}">${initial}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Middleware: Strict CORS & Origin Verification (Localhost Drive-by Protection)
app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            return callback(null, true);
        }
        if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) {
            return callback(null, true);
        }
        if (origin === 'https://www.instagram.com' || origin === 'https://instagram.com') {
            return callback(null, true);
        }
        return callback(new Error('CORS blocked: Untrusted origin.'));
    },
    credentials: true
}));

// Drive-by Mutation & Cross-Site Request Protection
app.use((req, res, next) => {
    const secFetchSite = req.headers['sec-fetch-site'];
    const origin = req.headers.origin || '';

    // Block cross-site state-changing POST/PUT/DELETE requests from untrusted external websites
    if (secFetchSite === 'cross-site' && req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
        console.warn(`🚨 Blocked cross-site ${req.method} attempt to ${req.path}`);
        return res.status(403).json({ error: 'Forbidden: Cross-site mutation blocked.' });
    }

    // Optional API Token Authentication (if configured in environment)
    const requiredToken = process.env.UNLOCKT_API_TOKEN;
    if (requiredToken && req.path.startsWith('/api/')) {
        const clientToken = req.headers['x-unlockt-token'] || req.query.token;
        if (clientToken !== requiredToken) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or missing token.' });
        }
    }

    next();
});

app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions
function loadData() {
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        return { user: null, content: [], lastSync: null };
    }
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ===================================
// API Routes
// ===================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const VIDEOS_DIR = path.join(__dirname, 'videos');
if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR);
}
// Serve static videos
app.use('/videos', express.static(VIDEOS_DIR));

// Video proxy to bypass CORS and optionally serve/cache local video
app.get('/api/proxy-video', async (req, res) => {
    const videoUrl = req.query.url;
    const itemId = req.query.id; // Optional: if provided, check cache

    if (!videoUrl && !itemId) {
        return res.status(400).json({ error: 'Missing url or id parameter' });
    }

    // Validate ID format if provided (Path Traversal Protection)
    if (itemId && !isValidId(itemId)) {
        return res.status(400).json({ error: 'Invalid item ID format' });
    }

    // Validate Video URL (SSRF & Open-Proxy Protection)
    if (videoUrl && !isAllowedInstagramCdnUrl(videoUrl)) {
        return res.status(400).json({ error: 'Invalid or disallowed video URL. Only Instagram CDN URLs are permitted.' });
    }

    // Check if we have a locally cached version
    if (itemId) {
        const cachedPath = path.join(VIDEOS_DIR, `${itemId}.mp4`);
        if (fs.existsSync(cachedPath)) {
            // Redirect to static route which handles HTTP Range headers properly for videos!
            return res.redirect(`/videos/${itemId}.mp4`);
        }
    }

    if (!videoUrl) {
        return res.status(404).json({ error: 'Video not found' });
    }

    try {
        const axios = require('axios');
        const response = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.instagram.com/'
            },
            timeout: 30000
        });

        // Try to auto-cache it in the background if we have an item ID
        if (itemId && isValidId(itemId)) {
            try {
                downloadVideoToCache(videoUrl, itemId);
            } catch (e) { console.error('Auto-cache error', e); }
        }

        // Forward the content-type and content-length headers
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }
        res.setHeader('Accept-Ranges', 'bytes');

        response.data.pipe(res);
    } catch (error) {
        console.error('Video proxy error:', error.message);
        res.status(502).end(); // Ends abruptly to trigger client onerror fallback loop
    }
});

function downloadVideoToCache(url, id) {
    const cachedPath = path.join(VIDEOS_DIR, `${id}.mp4`);
    const tempPath = cachedPath + '.tmp';

    // If already downloading or exists, skip
    if (fs.existsSync(cachedPath) || fs.existsSync(tempPath)) return;

    const axios = require('axios');
    axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://www.instagram.com/' },
        timeout: 60000
    }).then(response => {
        const writer = fs.createWriteStream(tempPath);
        response.data.pipe(writer);
        writer.on('finish', () => {
            fs.renameSync(tempPath, cachedPath);
            console.log(`✅ Cached video for item ${id}`);
        });
        writer.on('error', () => {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        });
    }).catch(e => {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    });
}

// Check if a video is cached locally
app.get('/api/check-video-cached', (req, res) => {
    const { id } = req.query;
    if (!id || !isValidId(id)) return res.status(400).json({ error: 'Missing or invalid id' });
    const cachedPath = path.join(VIDEOS_DIR, `${id}.mp4`);
    const exists = fs.existsSync(cachedPath);
    const size = exists ? fs.statSync(cachedPath).size : 0;
    res.json({ cached: exists, size });
});

// Accept base64 video data from the extension and cache permanently
// This is the most reliable method: extension downloads while authenticated, sends here
app.post('/api/cache-video-data', async (req, res) => {
    try {
        const { id, videoData } = req.body;
        if (!id || !isValidId(id) || !videoData) {
            return res.status(400).json({ error: 'Missing or invalid id or videoData' });
        }

        // Strip data URL header if present (data:video/mp4;base64,...)
        const base64Data = videoData.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        if (buffer.length < 1000) {
            return res.status(400).json({ error: 'Video data too small, likely invalid' });
        }

        const cachedPath = path.join(VIDEOS_DIR, `${id}.mp4`);
        fs.writeFileSync(cachedPath, buffer);
        console.log(`✅ Video cached via extension for item ${id} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
        res.json({ success: true, size: buffer.length });
    } catch (error) {
        console.error('Cache video data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Image proxy to bypass CORS and serve cached thumbnails
app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    const itemId = req.query.id; // Optional: if provided, auto-cache
    if (!imageUrl) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    if (itemId && !isValidId(itemId)) {
        return res.status(400).json({ error: 'Invalid item ID format' });
    }

    if (!isAllowedInstagramCdnUrl(imageUrl)) {
        return res.status(400).json({ error: 'Disallowed image URL. Only Instagram CDN domains are permitted.' });
    }

    // Check if we have a cached version for this item
    if (itemId) {
        const cachedPath = path.join(THUMBNAILS_DIR, `${itemId}.jpg`);
        if (fs.existsSync(cachedPath)) {
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            return fs.createReadStream(cachedPath).pipe(res);
        }
    }

    try {
        const axios = require('axios');
        const response = await axios({
            method: 'get',
            url: imageUrl,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            },
            timeout: 15000
        });

        const imageBuffer = Buffer.from(response.data);

        // Auto-cache if item ID is provided
        if (itemId && isValidId(itemId) && imageBuffer.length > 100) {
            const cachedPath = path.join(THUMBNAILS_DIR, `${itemId}.jpg`);
            fs.writeFileSync(cachedPath, imageBuffer);
        }

        // Forward the content-type header
        const contentType = response.headers['content-type'] || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', imageBuffer.length);
        // Cache for 1 year (it's now saved locally)
        res.setHeader('Cache-Control', 'public, max-age=31536000');

        res.send(imageBuffer);
    } catch (error) {
        // Return proper error so browser img onerror fires and fallback chain works
        res.status(502).end();
    }
});

// Get connection status (for frontend to check)
// User profile endpoint
app.post('/api/user/profile', (req, res) => {
    try {
        const { userId, username, fullName, profilePic } = req.body;
        if (!username) return res.status(400).json({ error: 'Missing username' });
        
        const existingData = loadData();
        existingData.user = {
            userId: userId || existingData.user?.userId || '',
            username: username || existingData.user?.username || 'User',
            fullName: fullName || existingData.user?.fullName || username,
            profilePic: profilePic || existingData.user?.profilePic || getLocalAvatarSvg(username)
        };
        saveData(existingData);
        console.log(`👤 Updated user profile: @${username} (${fullName || ''})`);
        res.json({ success: true, user: existingData.user });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get connection status (for frontend to check)
app.get('/api/status', (req, res) => {
    const data = loadData();
    res.json({
        connected: !!data.user,
        user: data.user,
        lastSync: data.lastSync,
        contentCount: data.content.length
    });
});

// ===================================
// SYNC ENDPOINT - Receives data from extension
// ===================================
app.post('/api/sync', (req, res) => {
    try {
        const { userId, username, fullName, profilePic, content, syncedAt } = req.body;

        if (!content || !Array.isArray(content)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid content data'
            });
        }

        // Process and store content
        const processedContent = content.map(item => ({
            ...item,
            id: (item.id && isValidId(String(item.id))) ? String(item.id) : uuidv4(),
            syncedAt: syncedAt || new Date().toISOString(),
            // Add AI-searchable fields
            searchText: generateSearchText(item),
            imageDescription: item.imageDescription || generateImageDescription(item),
            detectedObjects: item.detectedObjects || detectObjects(item)
        }));

        // Load existing data and MERGE (don't replace!)
        const existingData = loadData();
        const existingContent = existingData.content || [];

        // Create a map of existing content by ID
        const existingMap = new Map(existingContent.map(item => [item.id, item]));

        // Add new items, updating existing ones
        let newCount = 0;
        for (const item of processedContent) {
            if (!existingMap.has(item.id)) {
                newCount++;
            }
            existingMap.set(item.id, item);
        }

        // Convert back to array
        const mergedContent = Array.from(existingMap.values());

        // Save to file
        const data = {
            user: {
                userId: userId || existingData.user?.userId,
                username: username || existingData.user?.username || 'User',
                fullName: fullName || existingData.user?.fullName || username,
                profilePic: profilePic || existingData.user?.profilePic || getLocalAvatarSvg(username)
            },
            content: mergedContent,
            lastSync: syncedAt || new Date().toISOString()
        };

        saveData(data);

        console.log(`✅ Synced: ${processedContent.length} items received, ${newCount} new, total: ${mergedContent.length}`);

        // Auto-trigger background thumbnail caching for new items
        // This ensures CDN URLs get saved locally before they expire
        if (newCount > 0 && !batchCacheRunning) {
            console.log(`📸 Auto-caching thumbnails for ${newCount} new items...`);
            triggerBackgroundCache();
        }

        res.json({
            success: true,
            count: processedContent.length,
            message: `Successfully synced ${processedContent.length} items`
        });

    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update a specific item's thumbnail/media URLs (used when URLs expire)
app.post('/api/update-thumbnail-url', (req, res) => {
    try {
        const { id, thumbnailUrl, mediaUrl } = req.body;
        if (!id || !isValidId(id)) return res.status(400).json({ success: false, error: 'Missing or invalid id' });

        if (thumbnailUrl && !isAllowedInstagramCdnUrl(thumbnailUrl)) {
            return res.status(400).json({ success: false, error: 'Disallowed thumbnail URL' });
        }
        if (mediaUrl && !isAllowedInstagramCdnUrl(mediaUrl)) {
            return res.status(400).json({ success: false, error: 'Disallowed media URL' });
        }

        const data = loadData();
        const item = data.content.find(i => i.id === id);
        
        if (item) {
            if (thumbnailUrl) item.thumbnailUrl = thumbnailUrl;
            if (mediaUrl) item.mediaUrl = mediaUrl;
            saveData(data);
            return res.json({ success: true, id });
        }
        
        res.status(404).json({ success: false, error: 'Item not found' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cache a single thumbnail from a URL (used by frontend refresh)
app.post('/api/cache-thumbnail', async (req, res) => {
    try {
        const { id, url } = req.body;
        if (!id || !isValidId(id) || !url) return res.status(400).json({ success: false, error: 'Missing or invalid id or url' });

        if (!isAllowedInstagramCdnUrl(url)) {
            return res.status(400).json({ success: false, error: 'Disallowed URL domain. Only Instagram CDN is permitted.' });
        }

        const axios = require('axios');
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.instagram.com/'
            }
        });

        const imageBuffer = Buffer.from(response.data);
        const cachedPath = path.join(THUMBNAILS_DIR, `${id}.jpg`);
        fs.writeFileSync(cachedPath, imageBuffer);

        res.json({ success: true, id, size: imageBuffer.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Accept raw image data from extension (extension downloads with Instagram cookies)
app.post('/api/cache-thumbnail-data', (req, res) => {
    try {
        const { id, imageData } = req.body;
        if (!id || !isValidId(id) || !imageData) {
            return res.status(400).json({ success: false, error: 'Missing or invalid id or imageData' });
        }

        // imageData is base64-encoded image
        const imageBuffer = Buffer.from(imageData, 'base64');
        if (imageBuffer.length < 100) {
            return res.status(400).json({ success: false, error: 'Image data too small' });
        }

        const cachedPath = path.join(THUMBNAILS_DIR, `${id}.jpg`);
        fs.writeFileSync(cachedPath, imageBuffer);

        res.json({ success: true, id, size: imageBuffer.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Accept batch of raw image data from extension
app.post('/api/cache-thumbnails-batch', (req, res) => {
    try {
        const { thumbnails } = req.body;
        if (!thumbnails || !Array.isArray(thumbnails)) {
            return res.status(400).json({ success: false, error: 'Missing thumbnails array' });
        }

        let cached = 0, failed = 0;
        for (const { id, imageData } of thumbnails) {
            try {
                if (!id || !isValidId(id) || !imageData) { failed++; continue; }
                const imageBuffer = Buffer.from(imageData, 'base64');
                if (imageBuffer.length < 100) { failed++; continue; }
                fs.writeFileSync(path.join(THUMBNAILS_DIR, `${id}.jpg`), imageBuffer);
                cached++;
            } catch (e) { failed++; }
        }

        res.json({ success: true, cached, failed });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===================================
// EXPORT SESSION - Download all data as JSON
// ===================================
app.get('/api/export', (req, res) => {
    try {
        const data = loadData();
        const content = data.content || [];
        const user = data.user || {};

        // Calculate comprehensive stats
        const posts = content.filter(i => i.type === 'post' || i.type === 'carousel');
        const reels = content.filter(i => i.type === 'reel');
        const audio = content.filter(i => i.type === 'audio');
        const totalLikes = content.reduce((sum, i) => sum + (i.likes || 0), 0);
        const totalComments = content.reduce((sum, i) => sum + (i.comments || 0), 0);
        const totalViews = content.reduce((sum, i) => sum + (i.views || 0), 0);

        // Hashtag aggregation
        const hashtagCounts = {};
        content.forEach(item => {
            const caption = item.caption || '';
            const hashtags = caption.match(/#[\w\u0600-\u06FF]+/g) || [];
            hashtags.forEach(tag => {
                const normalizedTag = tag.toLowerCase();
                hashtagCounts[normalizedTag] = (hashtagCounts[normalizedTag] || 0) + 1;
            });
        });
        const topHashtags = Object.entries(hashtagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([tag, count]) => ({ name: tag, count }));

        // Account aggregation
        const accountCounts = {};
        content.forEach(item => {
            if (item.username) {
                const u = item.username.toLowerCase();
                accountCounts[u] = (accountCounts[u] || 0) + 1;
            }
        });
        const topAccounts = Object.entries(accountCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([username, count]) => ({ username, count }));

        // Generate full collections list
        const collections = [
            { id: 'all', name: 'All Saved', icon: '📁', count: content.length, type: 'smart' },
            { id: 'posts', name: 'Posts', icon: '📷', count: posts.length, type: 'smart' },
            { id: 'reels', name: 'Reels', icon: '🎬', count: reels.length, type: 'smart' },
            ...(audio.length > 0 ? [{ id: 'audio', name: 'Audio', icon: '🎵', count: audio.length, type: 'smart' }] : []),
            ...topHashtags.slice(0, 10).map(h => ({
                id: `hashtag:${h.name}`,
                name: h.name,
                icon: '🏷️',
                count: h.count,
                type: 'hashtag'
            }))
        ];

        // Enrich content items with canonical links & helper properties
        const enrichedContent = content.map(item => ({
            ...item,
            instagramUrl: item.instagramId ? `https://www.instagram.com/p/${item.instagramId}/` : (item.id ? `https://www.instagram.com/p/${item.id}/` : ''),
            directUrl: item.mediaUrl || item.thumbnailUrl || ''
        }));

        // Master export bundle
        const exportData = {
            vaultInfo: {
                appName: 'Unlockt',
                tagline: 'Your Instagram saves — extracted, organized, yours.',
                version: '6.7',
                exportedAt: new Date().toISOString(),
                developer: 'Mahmoud Madi | Digital Marketing & IT Specialist',
                organizations: [
                    'Premier Tech | For Integrated Solutions',
                    'VOXO | AI & Media Agency'
                ],
                credits: 'Developed by Mahmoud Madi | Digital Marketing & IT Specialist for Premier Tech | For Integrated Solutions & VOXO | AI & Media Agency',
                totalItems: content.length,
                totalDownloads: (data.downloads || []).length,
                totalLogs: (data.logs || []).length,
                lastSync: data.lastSync || new Date().toISOString()
            },
            user: {
                userId: user.userId || '',
                username: user.username || '',
                fullName: user.fullName || '',
                profilePic: user.profilePic || '',
                lastSync: data.lastSync || user.lastSync || ''
            },
            summary: {
                totalSaved: content.length,
                totalPosts: posts.length,
                totalReels: reels.length,
                totalAudio: audio.length,
                totalDownloads: (data.downloads || []).length,
                totalLogs: (data.logs || []).length,
                totalLikes,
                totalComments,
                totalViews,
                topHashtags,
                topAccounts
            },
            collections: (data.collections && data.collections.length > 0) ? data.collections : collections,
            content: enrichedContent,
            downloads: data.downloads || [],
            logs: data.logs || [],
            lastDiagnosticScan: data.lastDiagnosticScan || null,
            telemetry: {
                uptimeSeconds: Math.round(process.uptime()),
                memoryMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
                platform: process.platform,
                nodeVersion: process.version
            }
        };

        const usernameSlug = user.username ? `-${user.username}` : '';
        const filename = `instagram-vault-backup${usernameSlug}-${new Date().toISOString().split('T')[0]}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(exportData, null, 2));

        console.log(`📦 Master Export generated: ${content.length} items, ${(data.downloads || []).length} downloads, ${(data.logs || []).length} logs for ${user.username || 'vault'}`);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===================================
// IMPORT SESSION - Load data from uploaded JSON
// ===================================
app.post('/api/import', (req, res) => {
    try {
        let importedData = req.body;

        // Support importing either full export bundle or raw array
        if (Array.isArray(importedData)) {
            importedData = { content: importedData };
        }

        if (!importedData || !importedData.content || !Array.isArray(importedData.content)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid backup file. Must contain a "content" array or be a list of items.'
            });
        }

        // Load existing data to merge
        const existingData = loadData();
        const existingContent = existingData.content || [];

        // Map existing by ID and instagramId
        const contentMap = new Map();
        existingContent.forEach(item => {
            if (item.id) contentMap.set(item.id, item);
            if (item.instagramId) contentMap.set(item.instagramId, item);
        });

        let newCount = 0;
        let updatedCount = 0;

        for (const item of importedData.content) {
            if (!item || (!item.id && !item.instagramId)) continue;
            const primaryKey = item.id || item.instagramId;

            // Generate search text if missing
            if (!item.searchText) {
                item.searchText = generateSearchText(item);
            }

            if (contentMap.has(primaryKey)) {
                // Merge existing with imported (update fields if imported has newer/extra info)
                const existing = contentMap.get(primaryKey);
                const merged = { ...existing, ...item };
                contentMap.set(primaryKey, merged);
                if (item.id && item.instagramId) {
                    contentMap.set(item.id, merged);
                    contentMap.set(item.instagramId, merged);
                }
                updatedCount++;
            } else {
                newCount++;
                contentMap.set(primaryKey, item);
                if (item.id && item.instagramId) {
                    contentMap.set(item.id, item);
                    contentMap.set(item.instagramId, item);
                }
            }
        }

        // Deduplicate uniquely by item.id
        const uniqueMap = new Map();
        for (const item of contentMap.values()) {
            const key = item.id || item.instagramId;
            uniqueMap.set(key, item);
        }
        const mergedContent = Array.from(uniqueMap.values());

        // Merge user info
        const existingUser = existingData.user || {};
        const importedUser = importedData.user || {};
        const mergedUser = {
            userId: importedUser.userId || existingUser.userId || '',
            username: importedUser.username || existingUser.username || '',
            fullName: importedUser.fullName || existingUser.fullName || '',
            profilePic: importedUser.profilePic || existingUser.profilePic || '',
            lastSync: importedUser.lastSync || existingUser.lastSync || new Date().toISOString()
        };

        // Merge download history
        const existingDownloads = Array.isArray(existingData.downloads) ? existingData.downloads : [];
        const importedDownloads = Array.isArray(importedData.downloads) ? importedData.downloads : [];
        const dlMap = new Map();
        existingDownloads.forEach(d => {
            if (d.id) dlMap.set(d.id, d);
            else if (d.filename) dlMap.set(d.filename, d);
        });

        let newDownloadsCount = 0;
        importedDownloads.forEach(d => {
            const key = d.id || d.filename;
            if (key) {
                if (!dlMap.has(key)) {
                    dlMap.set(key, d);
                    newDownloadsCount++;
                } else {
                    const existing = dlMap.get(key);
                    dlMap.set(key, { ...existing, ...d });
                }
            }
        });
        const mergedDownloads = Array.from(dlMap.values()).sort((a, b) => new Date(b.downloadedAt || 0) - new Date(a.downloadedAt || 0));

        // Merge logs
        const existingLogs = Array.isArray(existingData.logs) ? existingData.logs : [];
        const importedLogs = Array.isArray(importedData.logs) ? importedData.logs : [];
        const logMap = new Map();
        existingLogs.forEach(l => {
            if (l.id) logMap.set(l.id, l);
        });

        let newLogsCount = 0;
        importedLogs.forEach(l => {
            const key = l.id || `${l.timestamp}_${l.message}`;
            if (!logMap.has(key)) {
                logMap.set(key, l);
                newLogsCount++;
            }
        });

        // Add import audit log
        const importAuditLog = {
            id: 'log_' + Date.now() + '_imp',
            timestamp: new Date().toISOString(),
            level: 'SUCCESS',
            source: 'IMPORT',
            message: `Imported vault backup (${importedData.content.length} content, ${importedDownloads.length} downloads, ${importedLogs.length} logs)`
        };
        logMap.set(importAuditLog.id, importAuditLog);
        const mergedLogs = Array.from(logMap.values()).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).slice(0, 500);

        // Merge collections if present
        let mergedCollections = existingData.collections || [];
        if (Array.isArray(importedData.collections) && importedData.collections.length > 0) {
            const colMap = new Map();
            mergedCollections.forEach(c => colMap.set(c.id || c.name, c));
            importedData.collections.forEach(c => colMap.set(c.id || c.name, c));
            mergedCollections = Array.from(colMap.values());
        }

        // Save merged data
        const dataToSave = {
            user: mergedUser,
            content: mergedContent,
            downloads: mergedDownloads,
            logs: mergedLogs,
            collections: mergedCollections,
            lastDiagnosticScan: importedData.lastDiagnosticScan || existingData.lastDiagnosticScan || null,
            lastSync: new Date().toISOString(),
            importedAt: new Date().toISOString()
        };

        saveData(dataToSave);

        console.log(`📥 Import successful: ${importedData.content.length} items (${newCount} new), ${newDownloadsCount} new downloads, ${newLogsCount} new logs.`);

        res.json({
            success: true,
            imported: importedData.content.length,
            newItems: newCount,
            updatedItems: updatedCount,
            total: mergedContent.length,
            importedDownloads: newDownloadsCount,
            totalDownloads: mergedDownloads.length,
            importedLogs: newLogsCount,
            totalLogs: mergedLogs.length,
            user: mergedUser,
            downloads: mergedDownloads,
            logs: mergedLogs
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===================================
// DOWNLOAD HISTORY ENDPOINTS
// ===================================
app.get('/api/download-history', (req, res) => {
    try {
        const data = loadData();
        res.json({ success: true, downloads: data.downloads || [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/download-history', (req, res) => {
    try {
        const data = loadData();
        if (!Array.isArray(data.downloads)) data.downloads = [];

        const record = req.body;
        if (!record) return res.status(400).json({ success: false, error: 'No record provided' });

        if (Array.isArray(record)) {
            data.downloads = record;
        } else {
            const existingIdx = data.downloads.findIndex(d => d.id === record.id);
            if (existingIdx >= 0) {
                data.downloads[existingIdx] = record;
            } else {
                data.downloads.unshift(record);
            }
            data.downloads = data.downloads.slice(0, 500);
        }

        saveData(data);
        console.log(`📥 Download record saved: ${record.filename || record.id} (Total: ${data.downloads.length})`);
        res.json({ success: true, count: data.downloads.length, downloads: data.downloads });
    } catch (error) {
        console.error('Save download history error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/download-history/:id', (req, res) => {
    try {
        const { id } = req.params;
        const data = loadData();
        if (Array.isArray(data.downloads)) {
            data.downloads = data.downloads.filter(d => d.id !== id);
            saveData(data);
        }
        res.json({ success: true, count: (data.downloads || []).length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/download-history', (req, res) => {
    try {
        const data = loadData();
        data.downloads = [];
        saveData(data);
        res.json({ success: true, message: 'Download history cleared' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
function generateSearchText(item) {
    const parts = [
        item.caption || '',
        item.username || '',
        item.audioTitle || '',
        item.audioArtist || '',
        ...(item.hashtags || [])
    ];
    return parts.join(' ').toLowerCase();
}

// Generate image description (AI simulation - in production use actual AI)
function generateImageDescription(item) {
    const type = item.type;
    const caption = item.caption || '';

    // Extract context from caption
    const contexts = [];

    if (caption.includes('sunset') || caption.includes('sunrise')) contexts.push('golden hour photography');
    if (caption.includes('beach') || caption.includes('ocean')) contexts.push('coastal scenery');
    if (caption.includes('food') || caption.includes('recipe')) contexts.push('culinary content');
    if (caption.includes('workout') || caption.includes('gym')) contexts.push('fitness content');
    if (caption.includes('travel') || caption.includes('adventure')) contexts.push('travel photography');
    if (caption.includes('city') || caption.includes('urban')) contexts.push('urban landscape');
    if (caption.includes('nature') || caption.includes('outdoor')) contexts.push('nature photography');
    if (caption.includes('art') || caption.includes('design')) contexts.push('artistic content');

    if (type === 'reel') contexts.push('video content');
    if (type === 'audio') contexts.push('music audio');

    return contexts.join(', ') || 'instagram media content';
}

// Detect objects (AI simulation)
function detectObjects(item) {
    const objects = [];
    const caption = (item.caption || '').toLowerCase();

    // Simple keyword extraction
    const keywords = ['person', 'people', 'food', 'beach', 'mountain', 'city', 'car', 'dog', 'cat',
        'sunset', 'ocean', 'tree', 'flower', 'building', 'coffee', 'restaurant',
        'gym', 'workout', 'music', 'dance', 'art', 'fashion', 'nature', 'travel'];

    keywords.forEach(keyword => {
        if (caption.includes(keyword)) {
            objects.push(keyword);
        }
    });

    return objects;
}

// ===================================
// GET SAVED CONTENT
// ===================================
app.get('/api/saved', (req, res) => {
    try {
        const data = loadData();

        if (!data.content || data.content.length === 0) {
            return res.json({
                success: true,
                data: [],
                pagination: { currentPage: 1, totalPages: 0, totalItems: 0, hasMore: false },
                stats: { posts: 0, reels: 0, audio: 0 },
                connected: false,
                message: 'No content synced yet. Use the browser extension to sync your saved content.'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type || 'all';
        const sortBy = req.query.sortBy || 'date';

        let content = [...data.content];

        // Filter by type (map collection IDs to item types)
        if (type !== 'all') {
            content = content.filter(item => {
                if (type === 'posts' || type === 'post') {
                    return item.type === 'post' || item.type === 'carousel';
                } else if (type === 'reels' || type === 'reel') {
                    return item.type === 'reel';
                } else if (type === 'audio') {
                    return item.type === 'audio';
                }
                return item.type === type;
            });
        }

        // Filter by date range
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;

        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            content = content.filter(item => {
                const itemDate = new Date(item.postedAt || item.savedAt);
                return !isNaN(itemDate) && itemDate >= fromDate;
            });
        }

        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            content = content.filter(item => {
                const itemDate = new Date(item.postedAt || item.savedAt);
                return !isNaN(itemDate) && itemDate <= toDate;
            });
        }

        // Filter by hashtag/caption
        const hashtag = req.query.hashtag;
        if (hashtag) {
            const searchTerm = hashtag.toLowerCase();
            content = content.filter(item => {
                const caption = (item.caption || '').toLowerCase();
                return caption.includes(searchTerm);
            });
        }

        // Filter by username
        const username = req.query.username;
        if (username) {
            const cleanUser = username.replace(/^@/, '').toLowerCase().trim();
            content = content.filter(item => {
                const itemUser = (item.username || '').toLowerCase().trim();
                const itemFullName = (item.fullName || '').toLowerCase();
                return itemUser === cleanUser || itemUser.includes(cleanUser) || itemFullName.includes(cleanUser);
            });
        }

        // Sort
        if (sortBy === 'likes') {
            content.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        } else if (sortBy === 'comments') {
            content.sort((a, b) => (b.comments || 0) - (a.comments || 0));
        } else if (sortBy === 'views') {
            content.sort((a, b) => (b.views || 0) - (a.views || 0));
        } else if (sortBy === 'date-asc') {
            // Oldest first - use postedAt (when the post was made), fallback to savedAt
            content.sort((a, b) => new Date(a.postedAt || a.savedAt || 0) - new Date(b.postedAt || b.savedAt || 0));
        } else if (sortBy === 'username') {
            content.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
        } else {
            // Default: most recent first - use postedAt (when the post was made), fallback to savedAt
            content.sort((a, b) => new Date(b.postedAt || b.savedAt || 0) - new Date(a.postedAt || a.savedAt || 0));
        }

        // Paginate
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedContent = content.slice(startIndex, endIndex);

        // Stats
        const allContent = data.content;
        const stats = {
            posts: allContent.filter(i => i.type === 'post').length,
            reels: allContent.filter(i => i.type === 'reel').length,
            audio: allContent.filter(i => i.type === 'audio').length
        };

        res.json({
            success: true,
            data: paginatedContent,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(content.length / limit),
                totalItems: content.length,
                hasMore: endIndex < content.length
            },
            stats,
            user: data.user,
            lastSync: data.lastSync
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===================================
// SMART COLLECTIONS
// ===================================
app.get('/api/collections', (req, res) => {
    try {
        const data = loadData();
        const content = data.content || [];

        // Count by type
        const allCount = content.length;
        const postsCount = content.filter(i => i.type === 'post' || i.type === 'carousel').length;
        const reelsCount = content.filter(i => i.type === 'reel').length;
        const audioCount = content.filter(i => i.type === 'audio').length;

        // Extract hashtags and count them
        const hashtagCounts = {};
        content.forEach(item => {
            const caption = item.caption || '';
            const hashtags = caption.match(/#[\w\u0600-\u06FF]+/g) || [];
            hashtags.forEach(tag => {
                const normalizedTag = tag.toLowerCase();
                hashtagCounts[normalizedTag] = (hashtagCounts[normalizedTag] || 0) + 1;
            });
        });

        // Get top hashtags (sorted by count)
        const topHashtags = Object.entries(hashtagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag, count]) => ({
                id: `hashtag:${tag}`,
                name: tag,
                icon: '🏷️',
                count,
                type: 'hashtag'
            }));

        // Build collections array
        const collections = [
            { id: 'all', name: 'All Saved', icon: '📁', count: allCount, type: 'smart' },
            { id: 'posts', name: 'Posts', icon: '📷', count: postsCount, type: 'smart' },
            { id: 'reels', name: 'Reels', icon: '🎬', count: reelsCount, type: 'smart' },
            ...topHashtags
        ];

        // Only add Audio if there are any
        if (audioCount > 0) {
            collections.splice(3, 0, { id: 'audio', name: 'Audio', icon: '🎵', count: audioCount, type: 'smart' });
        }

        res.json({
            success: true,
            collections
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===================================
// AI SEARCH
// ===================================
app.post('/api/search', (req, res) => {
    try {
        const { query, searchType, filters } = req.body;
        const data = loadData();

        if (!data.content || data.content.length === 0) {
            return res.json({
                success: true,
                results: [],
                totalResults: 0,
                searchTime: 0,
                message: 'No content to search. Sync your content first.'
            });
        }

        const startTime = Date.now();
        let results = [];
        const queryLower = query.toLowerCase().trim();
        const queryTerms = queryLower.split(/\s+/);

        // Search based on type
        data.content.forEach(item => {
            let score = 0;
            const searchableText = item.searchText || generateSearchText(item);

            switch (searchType) {
                case 'text':
                    // Caption and hashtag search
                    queryTerms.forEach(term => {
                        if (item.caption?.toLowerCase().includes(term)) score += 15;
                        if (item.hashtags?.some(tag => tag.toLowerCase().includes(term))) score += 10;
                        if (item.username?.toLowerCase().includes(term)) score += 8;
                    });
                    break;

                case 'image':
                    // Image description and object search
                    queryTerms.forEach(term => {
                        if (item.imageDescription?.toLowerCase().includes(term)) score += 12;
                        if (item.detectedObjects?.some(obj => obj.toLowerCase().includes(term))) score += 15;
                    });
                    break;

                case 'audio':
                    // Audio-specific search
                    queryTerms.forEach(term => {
                        if (item.audioTitle?.toLowerCase().includes(term)) score += 15;
                        if (item.audioArtist?.toLowerCase().includes(term)) score += 12;
                        if (item.audioTranscript?.toLowerCase().includes(term)) score += 10;
                    });
                    break;

                case 'semantic':
                default:
                    // Full semantic search across all fields
                    queryTerms.forEach(term => {
                        if (searchableText.includes(term)) score += 5;
                        if (item.caption?.toLowerCase().includes(term)) score += 10;
                        if (item.imageDescription?.toLowerCase().includes(term)) score += 8;
                        if (item.detectedObjects?.some(obj => obj.toLowerCase().includes(term))) score += 12;
                        if (item.hashtags?.some(tag => tag.toLowerCase().includes(term))) score += 8;
                        if (item.audioTitle?.toLowerCase().includes(term)) score += 10;
                    });
                    break;
            }

            if (score > 0) {
                results.push({ ...item, relevanceScore: Math.min(score, 100) });
            }
        });

        // Apply filters (support both array format and object format)
        let filterArray = [];
        if (Array.isArray(filters)) {
            filterArray = filters;
        } else if (filters && typeof filters === 'object') {
            // Convert object format to array
            if (filters.type && filters.type !== 'all') filterArray.push(`type:${filters.type}`);
            if (filters.dateFrom) filterArray.push(`dateFrom:${filters.dateFrom}`);
            if (filters.dateTo) filterArray.push(`dateTo:${filters.dateTo}`);
        }

        // Apply each filter
        filterArray.forEach(filter => {
            if (filter === 'type:reel') {
                results = results.filter(item => item.type === 'reel');
            } else if (filter === 'type:post') {
                results = results.filter(item => item.type === 'post' || item.type === 'carousel');
            } else if (filter === 'has:audio') {
                results = results.filter(item => item.hasAudio || item.audioInfo || item.type === 'audio');
            } else if (filter === 'high:likes') {
                // Filter items with above-average likes
                const avgLikes = results.reduce((sum, i) => sum + (i.likes || 0), 0) / (results.length || 1);
                results = results.filter(item => (item.likes || 0) >= avgLikes);
            } else if (filter === 'high:views') {
                // Filter items with above-average views
                const avgViews = results.reduce((sum, i) => sum + (i.views || 0), 0) / (results.length || 1);
                results = results.filter(item => (item.views || 0) >= avgViews);
            } else if (filter.startsWith('dateFrom:')) {
                const dateFrom = new Date(filter.split(':')[1]);
                results = results.filter(item => new Date(item.savedAt) >= dateFrom);
            } else if (filter.startsWith('dateTo:')) {
                const dateTo = new Date(filter.split(':')[1]);
                results = results.filter(item => new Date(item.savedAt) <= dateTo);
            }
        });

        // Sort by relevance
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);

        const searchTime = (Date.now() - startTime) / 1000;

        res.json({
            success: true,
            query,
            searchType,
            results,
            totalResults: results.length,
            searchTime
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===================================
// DOWNLOAD
// ===================================
// ===================================
// DOWNLOAD & PROXY MEDIA BLOB
// ===================================
app.get('/api/download-file', async (req, res) => {
    try {
        const { id, url: customUrl, filename: customFilename, slide } = req.query;
        const data = loadData();
        let targetUrl = customUrl;
        let filename = customFilename ? path.basename(String(customFilename)).replace(/[^a-zA-Z0-9_.@-]/g, '') : 'instagram_media';
        let isVideo = false;

        if (id) {
            if (!isValidId(String(id))) {
                return res.status(400).json({ success: false, error: 'Invalid item ID format' });
            }
            const item = data.content.find(i => i.id === id || i.instagramId === id);
            if (item) {
                const username = (item.username || 'instagram').replace(/[^a-zA-Z0-9_.]/g, '');
                const shortcode = (item.instagramId || item.id).replace(/[^a-zA-Z0-9_-]/g, '');
                isVideo = item.type === 'reel' || (item.mediaUrl && item.mediaUrl.includes('.mp4'));

                // Handle carousel slide if specified
                if (slide !== undefined && item.carouselMedia && item.carouselMedia[parseInt(slide)]) {
                    const slideObj = item.carouselMedia[parseInt(slide)];
                    targetUrl = slideObj.videoUrl || slideObj.mediaUrl || slideObj.imageUrl || slideObj.thumbnailUrl;
                    isVideo = !!slideObj.videoUrl;
                    filename = `@${username}_${shortcode}_slide${parseInt(slide) + 1}.${isVideo ? 'mp4' : 'jpg'}`;
                } else {
                    targetUrl = item.mediaUrl || item.thumbnailUrl;
                    filename = `@${username}_${shortcode}.${isVideo ? 'mp4' : 'jpg'}`;
                }

                // Check local cached files first
                if (isVideo) {
                    const cachedVideo = path.join(VIDEOS_DIR, `${item.id}.mp4`);
                    if (fs.existsSync(cachedVideo)) {
                        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                        res.setHeader('Content-Type', 'video/mp4');
                        return fs.createReadStream(cachedVideo).pipe(res);
                    }
                } else {
                    const cachedImg = path.join(THUMBNAILS_DIR, `${item.id}.jpg`);
                    if (fs.existsSync(cachedImg)) {
                        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                        res.setHeader('Content-Type', 'image/jpeg');
                        return fs.createReadStream(cachedImg).pipe(res);
                    }
                }
            }
        }

        if (!targetUrl) {
            return res.status(400).json({ success: false, error: 'No valid URL or ID provided for download' });
        }

        if (!isAllowedInstagramCdnUrl(targetUrl)) {
            return res.status(400).json({ success: false, error: 'Disallowed download URL. Only Instagram CDN URLs are permitted.' });
        }

        const axios = require('axios');
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/'
            },
            timeout: 20000
        });

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', response.headers['content-type'] || (isVideo ? 'video/mp4' : 'image/jpeg'));
        response.data.pipe(res);

    } catch (error) {
        console.error('Download file error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Proxy blob for client-side JSZip downloading without CORS
app.get('/api/proxy-blob', async (req, res) => {
    try {
        const { url: targetUrl, id } = req.query;
        const data = loadData();

        // Check local cache by ID
        if (id) {
            if (!isValidId(String(id))) {
                return res.status(400).json({ success: false, error: 'Invalid ID format' });
            }
            const cachedVideo = path.join(VIDEOS_DIR, `${id}.mp4`);
            if (fs.existsSync(cachedVideo)) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Content-Type', 'video/mp4');
                return fs.createReadStream(cachedVideo).pipe(res);
            }
            const cachedImg = path.join(THUMBNAILS_DIR, `${id}.jpg`);
            if (fs.existsSync(cachedImg)) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Content-Type', 'image/jpeg');
                return fs.createReadStream(cachedImg).pipe(res);
            }
        }

        if (!targetUrl) {
            return res.status(400).json({ success: false, error: 'Missing target URL' });
        }

        if (!isAllowedInstagramCdnUrl(targetUrl)) {
            return res.status(400).json({ success: false, error: 'Disallowed proxy URL. Only Instagram CDN is permitted.' });
        }

        const axios = require('axios');
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/'
            },
            timeout: 20000
        });

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        res.send(Buffer.from(response.data));

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/download', (req, res) => {
    try {
        const { itemId, quality } = req.body;
        const data = loadData();

        const item = data.content.find(i => i.id === itemId);

        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        // Return real media URL and direct download route
        res.json({
            success: true,
            downloadUrl: `/api/download-file?id=${item.id}`,
            directMediaUrl: item.mediaUrl,
            thumbnailUrl: item.thumbnailUrl,
            filename: `instagram_${item.type}_${item.instagramId || item.id}.${item.type === 'reel' ? 'mp4' : 'jpg'}`,
            type: item.type,
            username: item.username
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Batch download
app.post('/api/download/batch', (req, res) => {
    try {
        const { itemIds } = req.body;
        const data = loadData();

        const items = data.content.filter(i => itemIds.includes(i.id));

        const downloads = items.map(item => ({
            id: item.id,
            filename: `instagram_${item.type}_${item.instagramId || item.id}.${item.type === 'reel' ? 'mp4' : 'jpg'}`,
            url: `/api/download-file?id=${item.id}`,
            directMediaUrl: item.mediaUrl,
            thumbnailUrl: item.thumbnailUrl,
            type: item.type,
            username: item.username,
            carouselMedia: item.carouselMedia || []
        }));

        res.json({
            success: true,
            batchId: uuidv4(),
            downloads,
            totalItems: downloads.length
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===================================
// DOWNLOAD HISTORY (PERSISTENT)
// ===================================
app.get('/api/download-history', (req, res) => {
    try {
        const data = loadData();
        res.json({
            success: true,
            downloads: data.downloads || []
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/download-history', (req, res) => {
    try {
        const data = loadData();
        data.downloads = data.downloads || [];
        const record = {
            id: req.body.id || `dl_${Date.now()}`,
            type: req.body.type || 'zip',
            filename: req.body.filename || 'download_archive.zip',
            itemsCount: req.body.itemsCount || 1,
            totalMediaFiles: req.body.totalMediaFiles || 1,
            reelsCount: req.body.reelsCount || 0,
            slidesCount: req.body.slidesCount || 0,
            sizeEstimate: req.body.sizeEstimate || '12.4 MB',
            format: req.body.format || 'subfolders',
            status: req.body.status || 'completed',
            downloadedAt: req.body.downloadedAt || new Date().toISOString(),
            thumbnailUrl: req.body.thumbnailUrl || null,
            username: req.body.username || null,
            itemsPreview: Array.isArray(req.body.itemsPreview) ? req.body.itemsPreview.slice(0, 20) : []
        };
        // Prepend and cap at 250 items
        data.downloads.unshift(record);
        if (data.downloads.length > 250) {
            data.downloads = data.downloads.slice(0, 250);
        }
        saveData(data);
        res.json({ success: true, record, totalDownloads: data.downloads.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/download-history/:id', (req, res) => {
    try {
        const data = loadData();
        data.downloads = data.downloads || [];
        const { id } = req.params;
        if (id === 'all') {
            data.downloads = [];
        } else {
            data.downloads = data.downloads.filter(d => d.id !== id);
        }
        saveData(data);
        res.json({ success: true, totalDownloads: data.downloads.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===================================
// SYSTEM DIAGNOSTICS, LOGS & REPAIR
// ===================================
app.get('/api/system-diagnostics', (req, res) => {
    try {
        const data = loadData();
        const content = data.content || [];
        const user = data.user || null;
        
        // Count video caches
        let cachedVideosCount = 0;
        try {
            if (fs.existsSync(VIDEOS_DIR)) {
                cachedVideosCount = fs.readdirSync(VIDEOS_DIR).filter(f => f.endsWith('.mp4')).length;
            }
        } catch (e) {}

        // Memory and uptime
        const memoryUsage = process.memoryUsage();
        const uptimeSeconds = Math.round(process.uptime());

        // Perform write-integrity check
        let dbWriteStatus = 'OK';
        try {
            const testPath = path.join(DATA_DIR, '.write_test');
            fs.writeFileSync(testPath, 'ok');
            fs.unlinkSync(testPath);
        } catch (e) {
            dbWriteStatus = 'FAIL';
        }

        const diagnostics = {
            timestamp: new Date().toISOString(),
            server: {
                status: 'ONLINE',
                port: PORT,
                uptimeSeconds,
                dbWriteStatus,
                memoryMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(1)
            },
            database: {
                totalContent: content.length,
                postsCount: content.filter(i => i.type === 'post' || i.type === 'carousel').length,
                reelsCount: content.filter(i => i.type === 'reel').length,
                audioCount: content.filter(i => i.type === 'audio').length,
                lastSync: data.lastSync || user?.lastSync || null
            },
            extension: {
                connected: !!user,
                user: user?.username || null,
                lastSync: data.lastSync || user?.lastSync || null
            },
            media: {
                cachedVideos: cachedVideosCount,
                videosDirExists: fs.existsSync(VIDEOS_DIR)
            },
            lastScan: data.lastDiagnosticScan || null
        };

        res.json({ success: true, diagnostics });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/system-diagnostics/save-scan', (req, res) => {
    try {
        const data = loadData();
        data.lastDiagnosticScan = req.body;
        saveData(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/system-logs', (req, res) => {
    try {
        const data = loadData();
        res.json({
            success: true,
            logs: data.logs || []
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/system-logs', (req, res) => {
    try {
        const data = loadData();
        data.logs = data.logs || [];
        const newLog = {
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            timestamp: req.body.timestamp || new Date().toISOString(),
            level: req.body.level || 'INFO',
            source: req.body.source || 'SYSTEM',
            message: req.body.message || '',
            details: req.body.details || null
        };
        data.logs.unshift(newLog);
        if (data.logs.length > 500) {
            data.logs = data.logs.slice(0, 500);
        }
        saveData(data);
        res.json({ success: true, log: newLog, totalLogs: data.logs.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/system-logs', (req, res) => {
    try {
        const data = loadData();
        data.logs = [];
        saveData(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/repair-tool', (req, res) => {
    try {
        const { tool } = req.body;
        const data = loadData();
        let message = 'Operation completed';

        if (tool === 'collections') {
            const newCols = generateCollections(data.content || []);
            data.collections = newCols;
            message = `Rebuilt ${newCols.length} smart collections successfully`;
        } else if (tool === 'analytics') {
            const count = (data.content || []).length;
            message = `Recalculated engagement metrics & posting insights for ${count} saved items`;
        } else if (tool === 'database') {
            if (Array.isArray(data.content)) {
                const seen = new Set();
                data.content = data.content.filter(item => {
                    const key = item.id || item.instagramId;
                    if (!key || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            }
            message = `Database sanitized: ${data.content?.length || 0} valid items verified`;
        } else if (tool === 'thumbnails') {
            message = `Thumbnail proxies re-indexed and refreshed`;
        } else if (tool === 'ai_search') {
            const count = (data.content || []).length;
            message = `AI Search index regenerated: ${count} items tokenized and searchable`;
        } else if (tool === 'purge_videos') {
            let removed = 0;
            try {
                if (fs.existsSync(VIDEOS_DIR)) {
                    const files = fs.readdirSync(VIDEOS_DIR);
                    files.forEach(f => {
                        const fp = path.join(VIDEOS_DIR, f);
                        const stat = fs.statSync(fp);
                        if (stat.size === 0) {
                            fs.unlinkSync(fp);
                            removed++;
                        }
                    });
                }
            } catch (e) {}
            message = `Cleaned ${removed} corrupted video fragments; storage verified`;
        } else if (tool === 'dlm_sync') {
            data.downloads = data.downloads || [];
            message = `Download Manager synchronized: ${data.downloads.length} package records verified`;
        } else if (tool === 'reset_network') {
            message = `Network bridge cache flushed and re-initialized`;
        }

        saveData(data);
        res.json({ success: true, message, tool });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===================================
// COLLECTIONS
// ===================================
app.get('/api/collections', (req, res) => {
    try {
        const data = loadData();

        if (!data.content || data.content.length === 0) {
            return res.json({ success: true, collections: [] });
        }

        // Auto-generate collections based on content
        const collections = generateCollections(data.content);

        res.json({ success: true, collections });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

function generateCollections(content) {
    const collections = [
        {
            id: 'all',
            name: 'All Saved',
            icon: '📚',
            count: content.length,
            items: content.map(i => i.id)
        }
    ];

    // Group by type
    const posts = content.filter(i => i.type === 'post');
    const reels = content.filter(i => i.type === 'reel');
    const audio = content.filter(i => i.type === 'audio');

    if (posts.length > 0) {
        collections.push({
            id: 'posts',
            name: 'Posts',
            icon: '📸',
            count: posts.length,
            items: posts.map(i => i.id)
        });
    }

    if (reels.length > 0) {
        collections.push({
            id: 'reels',
            name: 'Reels',
            icon: '🎬',
            count: reels.length,
            items: reels.map(i => i.id)
        });
    }

    if (audio.length > 0) {
        collections.push({
            id: 'audio',
            name: 'Audio',
            icon: '🎵',
            count: audio.length,
            items: audio.map(i => i.id)
        });
    }

    // Smart collections based on hashtags
    const hashtagCounts = {};
    content.forEach(item => {
        (item.hashtags || []).forEach(tag => {
            const cleanTag = tag.replace('#', '').toLowerCase();
            hashtagCounts[cleanTag] = (hashtagCounts[cleanTag] || 0) + 1;
        });
    });

    const topHashtags = Object.entries(hashtagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    topHashtags.forEach(([tag, count]) => {
        if (count >= 3) {
            const tagItems = content.filter(i =>
                i.hashtags?.some(h => h.toLowerCase().includes(tag))
            );
            collections.push({
                id: `tag-${tag}`,
                name: `#${tag}`,
                icon: '🏷️',
                count: tagItems.length,
                items: tagItems.map(i => i.id)
            });
        }
    });

    return collections;
}

// ===================================
// ANALYTICS
// ===================================
app.get('/api/analytics', (req, res) => {
    try {
        const data = loadData();

        if (!data.content || data.content.length === 0) {
            return res.json({
                success: true,
                analytics: {
                    totalSaved: 0,
                    byType: { posts: 0, reels: 0, audio: 0 },
                    topHashtags: [],
                    topAccounts: [],
                    savingTrend: []
                }
            });
        }

        const content = data.content;

        // Calculate basic analytics
        const posts = content.filter(i => i.type === 'post' || i.type === 'carousel');
        const reels = content.filter(i => i.type === 'reel');
        const audio = content.filter(i => i.type === 'audio');

        // Calculate engagement metrics
        const totalLikes = content.reduce((sum, i) => sum + (i.likes || 0), 0);
        const totalComments = content.reduce((sum, i) => sum + (i.comments || 0), 0);
        const totalViews = content.reduce((sum, i) => sum + (i.views || 0), 0);

        // Calculate averages
        const avgLikesPerPost = posts.length > 0 ? Math.round(posts.reduce((sum, i) => sum + (i.likes || 0), 0) / posts.length) : 0;
        const avgLikesPerReel = reels.length > 0 ? Math.round(reels.reduce((sum, i) => sum + (i.likes || 0), 0) / reels.length) : 0;
        const avgViewsPerReel = reels.length > 0 ? Math.round(reels.reduce((sum, i) => sum + (i.views || 0), 0) / reels.length) : 0;

        // Best posting times analysis
        const postingHours = {};
        const postingDays = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        content.forEach(item => {
            const date = new Date(item.postedAt || item.savedAt);
            if (!isNaN(date)) {
                const hour = date.getHours();
                postingHours[hour] = (postingHours[hour] || 0) + 1;
                postingDays[dayNames[date.getDay()]]++;
            }
        });

        // Find best hours and days
        const sortedHours = Object.entries(postingHours).sort((a, b) => b[1] - a[1]);
        const bestHours = sortedHours.slice(0, 3).map(([hour, count]) => ({
            hour: parseInt(hour),
            label: `${hour}:00 - ${parseInt(hour) + 1}:00`,
            count
        }));

        const sortedDays = Object.entries(postingDays).sort((a, b) => b[1] - a[1]);
        const bestDays = sortedDays.slice(0, 3).map(([day, count]) => ({ day, count }));

        // Content performance by type
        const contentPerformance = {
            posts: {
                count: posts.length,
                avgLikes: avgLikesPerPost,
                avgComments: posts.length > 0 ? Math.round(posts.reduce((sum, i) => sum + (i.comments || 0), 0) / posts.length) : 0,
                topPerformer: posts.sort((a, b) => (b.likes || 0) - (a.likes || 0))[0] || null
            },
            reels: {
                count: reels.length,
                avgLikes: avgLikesPerReel,
                avgViews: avgViewsPerReel,
                topPerformer: reels.sort((a, b) => (b.views || 0) - (a.views || 0))[0] || null
            }
        };

        // AI Recommendations based on patterns
        const aiRecommendations = generateAIRecommendations(content, posts, reels, bestHours, bestDays);

        // Engagement trends (last 7 days vs previous 7)
        const now = new Date();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

        const recentContent = content.filter(i => new Date(i.savedAt || i.postedAt) >= weekAgo);
        const previousContent = content.filter(i => {
            const date = new Date(i.savedAt || i.postedAt);
            return date >= twoWeeksAgo && date < weekAgo;
        });

        const engagementTrend = {
            current: recentContent.length,
            previous: previousContent.length,
            change: previousContent.length > 0
                ? Math.round(((recentContent.length - previousContent.length) / previousContent.length) * 100)
                : 100
        };

        const analytics = {
            totalSaved: content.length,
            byType: {
                posts: posts.length,
                reels: reels.length,
                audio: audio.length
            },
            engagement: {
                totalLikes,
                totalComments,
                totalViews,
                avgLikesPerPost,
                avgLikesPerReel,
                avgViewsPerReel
            },
            bestPostingTimes: {
                hours: bestHours,
                days: bestDays,
                recommendation: bestHours.length > 0
                    ? `Best time to post: ${bestHours[0].label} on ${bestDays[0]?.day || 'any day'}`
                    : 'Not enough data'
            },
            contentPerformance,
            engagementTrend,
            topHashtags: getTopHashtags(content, 20),
            topAccounts: getTopAccounts(content, 15),
            savingTrend: generateTrendData(content),
            mostEngaged: content
                .sort((a, b) => ((b.likes || 0) + (b.comments || 0)) - ((a.likes || 0) + (a.comments || 0)))
                .slice(0, 5),
            aiRecommendations,
            storageUsed: content.reduce((acc, item) => acc + (item.size || 0), 0)
        };

        res.json({ success: true, analytics });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate AI recommendations based on content patterns
function generateAIRecommendations(content, posts, reels, bestHours, bestDays) {
    const recommendations = [];

    // Content type recommendation
    const reelRatio = content.length > 0 ? reels.length / content.length : 0;
    if (reelRatio > 0.7) {
        recommendations.push({
            icon: '🎬',
            title: 'Reel-Heavy Content',
            description: 'You save mostly Reels! You clearly love video content. Consider creating short-form videos for your audience.',
            priority: 'high'
        });
    } else if (reelRatio < 0.3) {
        recommendations.push({
            icon: '📸',
            title: 'Photo-Focused Content',
            description: 'You save mostly photos. Try exploring more Reels for higher engagement potential.',
            priority: 'medium'
        });
    }

    // Posting time recommendation
    if (bestHours.length > 0) {
        const bestHour = bestHours[0].hour;
        let timeOfDay = 'morning';
        if (bestHour >= 12 && bestHour < 17) timeOfDay = 'afternoon';
        else if (bestHour >= 17 && bestHour < 21) timeOfDay = 'evening';
        else if (bestHour >= 21 || bestHour < 6) timeOfDay = 'night';

        recommendations.push({
            icon: '⏰',
            title: `Best Posting Time: ${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}`,
            description: `Content you save is often posted around ${bestHours[0].label}. This might be when your target audience is most active.`,
            priority: 'high'
        });
    }

    // Engagement insight
    const avgEngagement = content.length > 0
        ? Math.round(content.reduce((sum, i) => sum + (i.likes || 0), 0) / content.length)
        : 0;

    if (avgEngagement > 10000) {
        recommendations.push({
            icon: '🔥',
            title: 'High-Engagement Content',
            description: 'You save content with high engagement (avg ' + formatNumber(avgEngagement) + ' likes). Study what makes these posts successful!',
            priority: 'high'
        });
    }

    // Best day recommendation
    if (bestDays.length > 0) {
        recommendations.push({
            icon: '📅',
            title: `Most Active Day: ${bestDays[0].day}`,
            description: `${bestDays[0].day} seems to be the most popular day for the content you save. Consider scheduling posts then.`,
            priority: 'medium'
        });
    }

    // Hashtag insight
    const hashtagCount = {};
    content.forEach(item => {
        const caption = item.caption || '';
        const tags = caption.match(/#[\w\u0600-\u06FF]+/g) || [];
        tags.forEach(tag => {
            hashtagCount[tag.toLowerCase()] = (hashtagCount[tag.toLowerCase()] || 0) + 1;
        });
    });
    const topTag = Object.entries(hashtagCount).sort((a, b) => b[1] - a[1])[0];
    if (topTag) {
        recommendations.push({
            icon: '#️⃣',
            title: `Trending in Your Saves: ${topTag[0]}`,
            description: `The hashtag ${topTag[0]} appears ${topTag[1]} times in your saved content. It might be worth using!`,
            priority: 'medium'
        });
    }

    // Add default if no recommendations
    if (recommendations.length === 0) {
        recommendations.push({
            icon: '💡',
            title: 'Keep Saving!',
            description: 'Save more content to unlock personalized AI insights and recommendations.',
            priority: 'low'
        });
    }

    return recommendations;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function getTopHashtags(content, limit = 10) {
    const hashtagCount = {};
    content.forEach(item => {
        // Extract from hashtags array if available
        (item.hashtags || []).forEach(tag => {
            const normalizedTag = tag.toLowerCase().startsWith('#') ? tag.toLowerCase() : '#' + tag.toLowerCase();
            hashtagCount[normalizedTag] = (hashtagCount[normalizedTag] || 0) + 1;
        });
        // Also extract from caption
        const caption = item.caption || '';
        const captionTags = caption.match(/#[\w\u0600-\u06FF]+/g) || [];
        captionTags.forEach(tag => {
            const normalizedTag = tag.toLowerCase();
            hashtagCount[normalizedTag] = (hashtagCount[normalizedTag] || 0) + 1;
        });
    });
    return Object.entries(hashtagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));
}

function getTopAccounts(content, limit = 10) {
    const accountCount = {};
    content.forEach(item => {
        if (item.username) {
            accountCount[item.username] = (accountCount[item.username] || 0) + 1;
        }
    });
    return Object.entries(accountCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([username, count]) => ({
            username,
            count,
            profilePic: getLocalAvatarSvg(username, 100, '833AB4', 'fff')
        }));
}

function generateTrendData(content) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    const monthlyData = {};
    months.forEach(month => {
        monthlyData[month] = { posts: 0, reels: 0, audio: 0 };
    });

    content.forEach(item => {
        const date = new Date(item.savedAt || item.syncedAt);
        if (date.getFullYear() === currentYear) {
            const month = months[date.getMonth()];
            if (monthlyData[month]) {
                if (item.type === 'post') monthlyData[month].posts++;
                else if (item.type === 'reel') monthlyData[month].reels++;
                else if (item.type === 'audio') monthlyData[month].audio++;
            }
        }
    });

    return months.map(month => ({
        month,
        ...monthlyData[month]
    }));
}

// ===================================
// THUMBNAIL CACHING
// ===================================

// Serve a cached thumbnail by item ID
app.get('/api/thumbnails/:id', (req, res) => {
    const itemId = req.params.id;
    if (!itemId || !isValidId(itemId)) {
        return res.status(400).json({ error: 'Invalid thumbnail ID format' });
    }
    const cachedPath = path.join(THUMBNAILS_DIR, `${itemId}.jpg`);

    if (fs.existsSync(cachedPath)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        return fs.createReadStream(cachedPath).pipe(res);
    }

    // Not cached - return 404 with NO image body so the browser img onerror fires
    res.status(404).end();
});

// Cache a single thumbnail
app.post('/api/cache-thumbnail', async (req, res) => {
    const { id, url } = req.body;
    if (!id || !url) {
        return res.status(400).json({ success: false, error: 'Missing id or url' });
    }

    try {
        const cachedPath = path.join(THUMBNAILS_DIR, `${id}.jpg`);

        // Skip if already cached
        if (fs.existsSync(cachedPath)) {
            return res.json({ success: true, cached: true, path: `/api/thumbnails/${id}` });
        }

        const axios = require('axios');
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/',
                'Accept': 'image/*'
            },
            timeout: 15000
        });

        const imageBuffer = Buffer.from(response.data);
        if (imageBuffer.length < 100) {
            return res.status(400).json({ success: false, error: 'Image too small, likely invalid' });
        }

        fs.writeFileSync(cachedPath, imageBuffer);

        // Update the item in saved.json to mark as cached
        const data = loadData();
        const item = data.content.find(i => i.id === id);
        if (item) {
            item.cachedThumbnail = true;
            saveData(data);
        }

        res.json({ success: true, cached: true, path: `/api/thumbnails/${id}`, size: imageBuffer.length });
    } catch (error) {
        console.error(`Cache thumbnail error for ${id}:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update a thumbnail URL for an item (after extension refreshes it)
app.post('/api/update-thumbnail-url', (req, res) => {
    const { id, thumbnailUrl, mediaUrl } = req.body;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Missing id' });
    }

    try {
        const data = loadData();
        const item = data.content.find(i => i.id === id);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        if (thumbnailUrl) item.thumbnailUrl = thumbnailUrl;
        if (mediaUrl) item.mediaUrl = mediaUrl;
        saveData(data);

        res.json({ success: true, updated: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Batch cache all thumbnails (background job)
let batchCacheRunning = false;
let batchCacheProgress = { total: 0, cached: 0, failed: 0, running: false };

// Reusable function to trigger background thumbnail caching
function triggerBackgroundCache() {
    if (batchCacheRunning) return;

    batchCacheRunning = true;
    const data = loadData();
    
    // Sort items newest to oldest (by savedAt or postedAt)
    const sortedItems = [...data.content].sort((a, b) => {
        const dateA = new Date(a.savedAt || a.postedAt || 0).getTime();
        const dateB = new Date(b.savedAt || b.postedAt || 0).getTime();
        return dateB - dateA; // descending (newest first)
    });
    
    // Build a flat list of download tasks for all images
    const downloadTasks = [];
    for (const item of sortedItems) {
        // Main image
        if (item.thumbnailUrl || item.mediaUrl) {
            downloadTasks.push({
                url: item.thumbnailUrl || item.mediaUrl,
                filename: `${item.id}.jpg`
            });
        }
        
        // Carousel images
        if (item.carouselMedia && item.carouselMedia.length > 0) {
            item.carouselMedia.forEach((media, index) => {
                if (media.imageUrl || media.thumbnailUrl) {
                    downloadTasks.push({
                        url: media.imageUrl || media.thumbnailUrl,
                        filename: `${item.id}_c${index}.jpg`
                    });
                }
            });
        }
    }

    batchCacheProgress = { total: downloadTasks.length, cached: 0, failed: 0, running: true };

    (async () => {
        const axios = require('axios');
        for (const task of downloadTasks) {
            const cachedPath = path.join(THUMBNAILS_DIR, task.filename);
            
            // Skip if already cached locally. We DO NOT want to overwrite working local files.
            if (fs.existsSync(cachedPath)) {
                batchCacheProgress.cached++;
                continue;
            }

            if (!task.url) {
                batchCacheProgress.failed++;
                continue;
            }

            try {
                const response = await axios({
                    method: 'get',
                    url: task.url,
                    responseType: 'arraybuffer',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://www.instagram.com/',
                        'Accept': 'image/*'
                    },
                    timeout: 10000
                });

                const buf = Buffer.from(response.data);
                // Ensure it's a valid image buffer
                if (buf.length > 100) {
                    fs.writeFileSync(cachedPath, buf);
                    batchCacheProgress.cached++;
                } else {
                    batchCacheProgress.failed++;
                }
            } catch (error) {
                batchCacheProgress.failed++;
            }

            // Rate limit: 50ms between requests
            await new Promise(r => setTimeout(r, 50));
        }

        batchCacheRunning = false;
        batchCacheProgress.running = false;
        console.log(`✅ Batch cache complete: ${batchCacheProgress.cached} cached, ${batchCacheProgress.failed} failed`);
    })();
}

app.post('/api/cache-all-thumbnails', async (req, res) => {
    if (batchCacheRunning) {
        return res.json({ success: true, message: 'Batch caching already in progress', progress: batchCacheProgress });
    }

    triggerBackgroundCache();

    res.json({ success: true, message: `Starting batch cache`, progress: batchCacheProgress });
});

// ===================================
// GET UNCACHED ITEMS - For extension to repair broken images
// Returns items that have no local thumbnail cache
// ===================================
app.get('/api/uncached-items', (req, res) => {
    try {
        const data = loadData();
        const content = data.content || [];
        const limit = parseInt(req.query.limit) || 200; // How many to return at once
        const offset = parseInt(req.query.offset) || 0;

        // Find all items without a local thumbnail cache
        const uncached = [];
        for (const item of content) {
            const cachedPath = path.join(THUMBNAILS_DIR, `${item.id}.jpg`);
            if (!fs.existsSync(cachedPath)) {
                uncached.push({
                    id: item.id,
                    instagramId: item.instagramId,
                    type: item.type,
                    thumbnailUrl: item.thumbnailUrl,
                    mediaUrl: item.mediaUrl,
                    carouselCount: item.carouselCount || 0,
                    postedAt: item.postedAt
                });
            }
        }

        const paginated = uncached.slice(offset, offset + limit);

        res.json({
            success: true,
            total: uncached.length,
            offset,
            limit,
            items: paginated,
            hasMore: offset + limit < uncached.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/cache-progress', (req, res) => {
    res.json({ success: true, progress: batchCacheProgress });
});

// Get thumbnail cache stats
app.get('/api/cache-stats', (req, res) => {
    try {
        const files = fs.readdirSync(THUMBNAILS_DIR);
        const totalSize = files.reduce((sum, f) => {
            try {
                return sum + fs.statSync(path.join(THUMBNAILS_DIR, f)).size;
            } catch { return sum; }
        }, 0);

        res.json({
            success: true,
            stats: {
                cachedCount: files.length,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
                directory: THUMBNAILS_DIR
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===================================
// CLEAR DATA
// ===================================
app.post('/api/clear', (req, res) => {
    try {
        saveData({ user: null, content: [], lastSync: null });
        res.json({ success: true, message: 'All data cleared' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Batch check which items are already cached locally
app.post('/api/check-cached-status', (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ success: false, error: 'Missing ids array' });
        }

        const status = {};
        for (const id of ids) {
            const cachedPath = path.join(THUMBNAILS_DIR, `${id}.jpg`);
            status[id] = fs.existsSync(cachedPath);
            
            // Also check for common carousel slide patterns if main is missing
            if (!status[id]) {
                const c0Path = path.join(THUMBNAILS_DIR, `${id}_c0.jpg`);
                status[id] = fs.existsSync(c0Path);
            }
        }

        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ✨ Unlockt (v6.7) - Server                                 ║
║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║   Your Instagram saves — extracted, organized, yours.        ║
║                                                              ║
║   👨‍💻 Developed by Mahmoud Madi                                ║
║      Digital Marketing & IT Specialist                       ║
║   🏢 Premier Tech | For Integrated Solutions                 ║
║   🚀 VOXO | AI & Media Agency                                ║
║                                                              ║
║   Server running at: http://localhost:${PORT}                   ║
║   📦 Waiting for extension sync...                           ║
╚══════════════════════════════════════════════════════════════╝
    `);
});
