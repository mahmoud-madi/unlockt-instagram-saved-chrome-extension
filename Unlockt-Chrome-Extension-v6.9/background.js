importScripts('db.js');

/**
 * Unlockt (v6.8) - Chromium Extension Background Service Worker
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Developed by: Mahmoud Madi (Digital Marketing & IT Specialist)
 * Organizations: Premier Tech (For Integrated Solutions) & VOXO AI (AI & Media Agency)
 * Purpose: Instagram GraphQL & REST API Saved Media Extraction Engine
 * License: MIT License (Open Source)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Core Capabilities:
 *  - Automated Instagram Session Discovery & Multi-Endpoint Pagination Traversal
 *  - Humanized Randomized Rate-Limit Jitter Delays (1.2s - 2.8s) for Account Protection
 *  - Multi-Slide Carousel Graph Decomposition (Photos, Videos, Dimensions)
 *  - High-Bitrate Reel Video Stream Resolution & Lossless Audio Metadata Parsing
 *  - Incremental Syncing ("Quick Sync New") & Resumable Cursor Bookmarks
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// State - reset at start
let syncState = {
    isRunning: false,
    isFinished: false,
    progress: 0,
    total: 0,
    currentType: '',
    error: null,
    lastResult: null,
    options: {
        downloadMedia: true
    }
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request.action);

    if (request.action === 'startSync') {
        // IMMEDIATELY reset syncState BEFORE any async work
        syncState = {
            isRunning: true,
            isFinished: false,
            progress: 5,
            total: 0,
            currentType: 'Starting sync...',
            error: null,
            lastResult: null,
            options: { downloadMedia: request.options?.downloadMedia !== false }
        };

        startFullSync(false) // Fresh sync
            .then(result => {
                console.log('Sync completed:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('Sync error:', error);
                syncState.isRunning = false;
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep channel open for async response
    }

    if (request.action === 'continueSync') {
        // IMMEDIATELY reset syncState BEFORE any async work
        // This prevents the popup poller from seeing stale isFinished/lastResult
        syncState = {
            isRunning: true,
            isFinished: false,
            progress: 5,
            total: 0,
            currentType: 'Resuming sync...',
            error: null,
            lastResult: null,
            options: { downloadMedia: request.options?.downloadMedia !== false }
        };

        startFullSync(true, false) // Resume sync, not incremental
            .then(result => {
                console.log('Continue sync completed:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('Continue sync error:', error);
                syncState.isRunning = false;
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }

    if (request.action === 'syncNewOnly') {
        // IMMEDIATELY reset syncState BEFORE any async work
        syncState = {
            isRunning: true,
            isFinished: false,
            progress: 5,
            total: 0,
            currentType: 'Checking for new saves...',
            error: null,
            lastResult: null,
            options: { downloadMedia: request.options?.downloadMedia !== false }
        };

        startFullSync(false, true) // Fresh start but incremental mode
            .then(result => {
                console.log('Incremental sync completed:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('Incremental sync error:', error);
                syncState.isRunning = false;
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }

    if (request.action === 'checkSyncCursor') {
        getSyncCursor()
            .then(cursor => sendResponse({ hasCursor: !!cursor, cursor }))
            .catch(() => sendResponse({ hasCursor: false }));
        return true;
    }

    if (request.action === 'getSyncState') {
        sendResponse(syncState);
        return true;
    }

    if (request.action === 'refreshVideoUrl') {
        // Fetch fresh video URL for a specific post
        refreshVideoUrl(request.instagramId, request.mediaId)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'refreshThumbnailUrl') {
        // Fetch fresh thumbnail/image URL for a specific post
        refreshThumbnailUrl(request.instagramId, request.mediaId)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'batchRefreshThumbnails') {
        // Refresh thumbnails for multiple items
        batchRefreshThumbnails(request.items, sender)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }


    if (request.action === 'checkLogin') {
        checkInstagramLogin()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ loggedIn: false, error: error.message }));
        return true;
    }

    if (request.action === 'resetSync') {
        syncState = {
            isRunning: false,
            progress: 0,
            total: 0,
            currentType: '',
            error: null
        };
        // Also clear the cursor
        chrome.storage.local.remove(['syncCursor', 'syncProgress', 'syncTimestamp']);
        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'clearSyncCursor') {
        chrome.storage.local.remove(['syncCursor', 'syncProgress', 'syncTimestamp']);
        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'repairImages') {
        // Repair broken/missing thumbnails for ALL uncached items
        repairBrokenImages(sender)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'getRepairProgress') {
        sendResponse(repairState);
        return true;
    }
});

// Check if user is logged into Instagram
async function checkInstagramLogin() {
    try {
        console.log('Checking Instagram login...');
        let cookies = [];
        try {
            cookies = await chrome.cookies.getAll({ url: 'https://www.instagram.com' });
        } catch (e) {}
        if (!cookies || cookies.length === 0) {
            try {
                cookies = await chrome.cookies.getAll({ domain: '.instagram.com' });
            } catch (e) {}
        }
        if (!cookies || cookies.length === 0) {
            try {
                cookies = await chrome.cookies.getAll({ domain: 'instagram.com' });
            } catch (e) {}
        }

        const sessionId = cookies.find(c => c.name === 'sessionid');
        const userId = cookies.find(c => c.name === 'ds_user_id');

        console.log('Cookies found:', cookies.length, '| Session ID:', !!sessionId, '| User ID:', !!userId);

        if (sessionId && userId) {
            const userInfo = await fetchUserInfo(userId.value);

            if (userInfo.username && userInfo.username !== 'User') {
                try {
                    await VaultDB.setUser(userInfo);
                } catch (e) {}
            }

            return {
                loggedIn: true,
                userId: userId.value,
                username: userInfo.username,
                fullName: userInfo.fullName,
                profilePic: userInfo.profilePic
            };
        }

        // Check if there is an active tab on instagram.com with logged in profile
        try {
            const tabs = await chrome.tabs.query({ url: '*://*.instagram.com/*' });
            if (tabs && tabs.length > 0) {
                const stored = await chrome.storage.local.get('userInfo');
                if (stored?.userInfo?.username && stored.userInfo.username !== 'User') {
                    return {
                        loggedIn: true,
                        userId: stored.userInfo.userId || 'user',
                        username: stored.userInfo.username,
                        fullName: stored.userInfo.fullName,
                        profilePic: stored.userInfo.profilePic
                    };
                }
            }
        } catch (e) {}

        return { loggedIn: false };
    } catch (error) {
        console.error('Error checking login:', error);
        return { loggedIn: false, error: error.message };
    }
}

function cleanText(str) {
    if (!str) return '';
    try {
        let decoded = str.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
        decoded = decoded.replace(/\\u0026/g, '&');
        return decoded.trim();
    } catch (e) {
        return str;
    }
}

// Fetch complete user info (username, full_name, profile_pic) with robust multi-strategy fallbacks
async function fetchUserInfo(userId) {
    // Strategy 0: Check chrome.storage.local cache first (0ms instant return)
    try {
        const stored = await chrome.storage.local.get('userInfo');
        if (stored?.userInfo && stored.userInfo.username && stored.userInfo.username !== 'User') {
            stored.userInfo.fullName = cleanText(stored.userInfo.fullName || stored.userInfo.username);
            stored.userInfo.profilePic = cleanText(stored.userInfo.profilePic || '');
            // Refresh in background without blocking
            fetchUserInfoFromWeb(userId).catch(() => {});
            return stored.userInfo;
        }
    } catch (e) {}

    return await fetchUserInfoFromWeb(userId);
}

async function fetchUserInfoFromWeb(userId) {
    let userInfo = {
        userId: userId,
        username: 'User',
        fullName: 'Instagram User',
        profilePic: ''
    };

    // Strategy 1: Fetch web endpoint https://www.instagram.com/api/v1/accounts/current_user/?edit=true
    try {
        const res = await fetch('https://www.instagram.com/api/v1/accounts/current_user/?edit=true', {
            headers: {
                'X-IG-App-ID': '936619743392459',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        });
        if (res.ok) {
            const data = await res.json();
            if (data.user) {
                userInfo.username = data.user.username || userInfo.username;
                userInfo.fullName = cleanText(data.user.full_name || userInfo.username);
                userInfo.profilePic = cleanText(data.user.profile_pic_url || '');
                await chrome.storage.local.set({ userInfo });
                return userInfo;
            }
        }
    } catch (e) {
        console.log('Strategy 1 current_user failed:', e);
    }

    // Strategy 2: Fetch www.instagram.com main HTML and extract via regex
    try {
        const res = await fetch('https://www.instagram.com/', {
            credentials: 'include'
        });
        if (res.ok) {
            const html = await res.text();
            const usernameMatch = html.match(/"username"\s*:\s*"([^"]+)"/);
            const fullNameMatch = html.match(/"full_name"\s*:\s*"([^"]+)"/);
            const picMatch = html.match(/"profile_pic_url"\s*:\s*"([^"]+)"/);
            if (usernameMatch && usernameMatch[1]) {
                userInfo.username = usernameMatch[1];
                userInfo.fullName = cleanText(fullNameMatch ? fullNameMatch[1] : usernameMatch[1]);
                if (picMatch && picMatch[1]) {
                    userInfo.profilePic = cleanText(picMatch[1]);
                }
                await chrome.storage.local.set({ userInfo });
                return userInfo;
            }
        }
    } catch (e) {
        console.log('Strategy 2 main html parse failed:', e);
    }

    // Strategy 3: Execute content script query on open Instagram tab
    try {
        const tabs = await chrome.tabs.query({ url: '*://*.instagram.com/*' });
        if (tabs && tabs.length > 0) {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => {
                    try {
                        const shared = window._sharedData?.config?.viewer;
                        if (shared && shared.username) {
                            return {
                                username: shared.username,
                                fullName: shared.full_name || shared.username,
                                profilePic: shared.profile_pic_url || ''
                            };
                        }
                    } catch (e) {}
                    return null;
                }
            });
            if (results && results[0] && results[0].result) {
                const r = results[0].result;
                userInfo.username = r.username || userInfo.username;
                userInfo.fullName = cleanText(r.fullName || userInfo.username);
                userInfo.profilePic = cleanText(r.profilePic || '');
                await chrome.storage.local.set({ userInfo });
                return userInfo;
            }
        }
    } catch (e) {
        console.log('Strategy 3 tab query failed:', e);
    }

    // Strategy 4: Fallback to i.instagram.com mobile endpoint
    try {
        const res = await fetch(`https://i.instagram.com/api/v1/users/${userId}/info/`, {
            headers: {
                'X-IG-App-ID': '936619743392459',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        });
        if (res.ok) {
            const data = await res.json();
            if (data.user) {
                userInfo.username = data.user.username || userInfo.username;
                userInfo.fullName = cleanText(data.user.full_name || userInfo.username);
                userInfo.profilePic = cleanText(data.user.profile_pic_url || '');
                await chrome.storage.local.set({ userInfo });
                return userInfo;
            }
        }
    } catch (e) {
        console.log('Strategy 4 i.instagram.com info failed:', e);
    }

    return userInfo;
}

// Start full sync of all saved content
async function startFullSync(resume = false, incremental = false) {
    console.log(resume ? 'Starting resume sync...' : (incremental ? 'Starting incremental sync...' : 'Starting fresh sync...'));

    await VaultDB.init();

    // Reset cursor ONLY on explicit fresh sync
    if (!resume && !incremental) {
        await chrome.storage.local.remove(['syncCursor', 'syncProgress', 'syncTimestamp', 'syncPhase', 'syncGraphqlCursor']);
    }

    syncState = {
        isRunning: true,
        isFinished: false,
        progress: 5,
        total: 0,
        currentType: resume ? 'Resuming sync...' : (incremental ? 'Checking for new saves...' : 'Connecting to Instagram...'),
        error: null,
        lastResult: null,
        options: syncState.options || { downloadMedia: true }
    };

    try {
        const loginStatus = await checkInstagramLogin();
        console.log('Login status:', loginStatus);

        if (!loginStatus.loggedIn) {
            throw new Error('Not logged into Instagram. Please log in first.');
        }

        const userId = loginStatus.userId;
        let resumeCursor = null;
        let resumePhase = 'rest';
        let resumeGraphqlCursor = null;

        // If resuming, get the saved cursor
        if (resume) {
            console.log('[RESUME] Attempting to load saved cursor...');
            const cursorData = await getSyncCursor();
            console.log('[RESUME] Got cursor data:', JSON.stringify(cursorData));

            if (cursorData) {
                resumePhase = cursorData.phase || 'rest';
                resumeGraphqlCursor = cursorData.graphqlCursor || null;
                if (cursorData.cursor) {
                    resumeCursor = cursorData.cursor;
                    console.log('[RESUME] Will resume from cursor:', resumeCursor.substring(0, 50) + '...');
                }
                syncState.currentType = `Resuming from saved position (${cursorData.itemCount || 0} items)...`;
            } else {
                console.log('[RESUME] No saved cursor found, starting fresh sync...');
                syncState.currentType = 'Starting sync...';
            }
        }

        // PHASE 1: Fetch saved posts via REST API (skip if resume phase is graphql)
        if (resumePhase !== 'graphql') {
            syncState.currentType = resume && resumeCursor ? 'Continuing fetch...' : (incremental ? 'Fetching new saves...' : 'Fetching saved posts...');
            syncState.progress = 15;
            console.log('Fetching saved posts (REST API)...');

            const posts = await fetchSavedPosts(userId, resumeCursor, incremental, loginStatus);
            console.log('REST API returned', posts.length, 'items');
        } else {
            console.log('[RESUME] Skipping REST (already exhausted), going straight to GraphQL...');
        }

        syncState.progress = 40;

        // PHASE 2: Fetch older history via GraphQL (always run for non-incremental, or resume from graphql phase)
        if (!incremental) {
            syncState.currentType = 'Fetching older saved content (deep history)...';
            console.log('[DEEP HISTORY] Running GraphQL deep history fetch...');
            try {
                const gqlCursor = resumeGraphqlCursor || null;
                const gqlItems = await fetchSavedViaGraphQL(userId, gqlCursor, loginStatus);
                console.log('[DEEP HISTORY] GraphQL returned', gqlItems.length, 'items');
            } catch (e) {
                console.log('GraphQL deep history note:', e.message);
            }
        }

        syncState.progress = 65;

        // PHASE 3: Fetch saved reels feed
        syncState.currentType = 'Checking for reels...';
        try {
            const reels = await fetchSavedReels(userId);
            if (reels.length > 0) {
                await sendToLocalServer(reels, loginStatus);
                if (syncState.options.downloadMedia !== false) {
                    cacheThumbnailsToServer(reels).catch(() => {});
                }
            }
            console.log('Fetched', reels.length, 'reels');
        } catch (e) {
            console.log('Could not fetch reels:', e.message);
        }

        syncState.progress = 80;

        // PHASE 4: Fetch saved audio
        syncState.currentType = 'Checking for audio...';
        try {
            const audio = await fetchSavedAudio(userId);
            if (audio.length > 0) {
                await sendToLocalServer(audio, loginStatus);
            }
            console.log('Fetched', audio.length, 'audio tracks');
        } catch (e) {
            console.log('Could not fetch audio:', e.message);
        }

        syncState.progress = 95;
        syncState.currentType = 'Sync complete!';

        // Read ACTUAL unique items directly from VaultDB
        const finalVaultItems = await VaultDB.getAllPosts();
        const postCount = finalVaultItems.filter(i => i.type === 'post' || i.type === 'carousel').length;
        const reelCount = finalVaultItems.filter(i => i.type === 'reel').length;
        const audioCount = finalVaultItems.filter(i => i.type === 'audio').length;
        const totalCount = finalVaultItems.length;

        syncState = {
            isRunning: false,
            isFinished: true,
            progress: 100,
            total: totalCount,
            currentType: 'Complete!',
            error: null,
            lastResult: {
                success: true,
                count: totalCount,
                posts: postCount,
                reels: reelCount,
                audio: audioCount,
                timestamp: Date.now()
            }
        };

        try {
            await chrome.storage.local.set({ 
                lastSyncResult: syncState.lastResult,
                savedContentCount: totalCount,
                lastSync: new Date().toISOString()
            });
        } catch (e) {}

        return syncState.lastResult;

    } catch (error) {
        console.error('Sync error:', error);
        syncState = {
            isRunning: false,
            isFinished: true,
            progress: 0,
            total: 0,
            currentType: 'Error',
            error: error.message,
            lastResult: { success: false, error: error.message }
        };
        throw error;
    }
}

// Fetch saved posts with resume capability and incremental sync
async function fetchSavedPosts(userId, resumeFromCursor = null, incremental = false, loginStatus = null) {
    const allItems = [];
    let maxId = resumeFromCursor;
    let hasMore = true;
    let attempts = 0;
    const maxAttempts = 150;
    const batchSize = 2; // Save progress every 2 pages
    let consecutiveDuplicates = 0;
    const duplicateThreshold = 5;

    let existingIds = new Set();
    if (incremental) {
        try {
            syncState.currentType = 'Checking existing content...';
            const posts = await VaultDB.getAllPosts();
            if (Array.isArray(posts)) {
                existingIds = new Set(posts.map(item => String(item.id)));
                console.log(`[INCREMENTAL] Found ${existingIds.size} existing items in vault`);
            }
        } catch (e) {
            console.log('[INCREMENTAL] Could not fetch existing IDs, will sync all:', e.message);
        }
    }

    if (resumeFromCursor) {
        syncState.currentType = 'Resuming from last position...';
        console.log('Resuming sync from cursor:', resumeFromCursor);
    }

    while (hasMore && attempts < maxAttempts) {
        try {
            let url = 'https://www.instagram.com/api/v1/feed/saved/posts/';
            if (maxId) {
                url += `?max_id=${maxId}`;
            }

            console.log('Fetching page', attempts + 1, ':', url);

            const response = await fetch(url, {
                headers: {
                    'X-IG-App-ID': '936619743392459',
                    'X-ASBD-ID': '129477',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': '*/*'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                console.log('API response not ok:', response.status);
                // Try GraphQL fallback if REST fails
                try {
                    const graphqlItems = await fetchSavedViaGraphQL(userId);
                    return [...allItems, ...graphqlItems];
                } catch (e) {
                    return allItems;
                }
            }

            const data = await response.json();
            const rawItems = data.items || [];
            console.log('Got response with', rawItems.length, 'items');

            if (rawItems.length > 0) {
                const processed = rawItems.map(item => processMediaItem(item));

                if (incremental && existingIds.size > 0) {
                    const newItems = processed.filter(item => !existingIds.has(String(item.id)));
                    const duplicateCount = processed.length - newItems.length;

                    if (newItems.length > 0) {
                        allItems.push(...newItems);
                        consecutiveDuplicates = 0;
                        await sendToLocalServer(newItems, loginStatus || { userId, username: 'User' });
                        console.log(`[INCREMENTAL] Page ${attempts + 1}: ${newItems.length} new, ${duplicateCount} already synced`);
                    } else {
                        consecutiveDuplicates++;
                        console.log(`[INCREMENTAL] Page ${attempts + 1}: All ${processed.length} items already synced (${consecutiveDuplicates}/${duplicateThreshold})`);
                    }

                    if (consecutiveDuplicates >= duplicateThreshold) {
                        console.log(`[INCREMENTAL] Stopping - reached ${duplicateThreshold} consecutive pages of duplicates`);
                        syncState.currentType = `Found ${allItems.length} new items. Older content already synced.`;
                        hasMore = false;
                        break;
                    }
                } else {
                    allItems.push(...processed);
                    // Pre-sync batch to VaultDB immediately
                    await sendToLocalServer(processed, loginStatus || { userId, username: 'User' });
                    if (syncState.options.downloadMedia !== false) {
                        cacheThumbnailsToServer(processed).catch(() => {});
                    }
                }

                syncState.total = allItems.length;
                syncState.progress = Math.min(45, 15 + Math.floor(attempts / 3));
                syncState.currentType = incremental
                    ? `Fetching posts... (${allItems.length} new, page ${attempts + 1})`
                    : `Fetching posts... (${allItems.length} found, page ${attempts + 1})`;
            }

            hasMore = data.more_available === true && !!data.next_max_id;
            maxId = data.next_max_id;
            attempts++;

            // Save cursor checkpoint so we can resume
            if (maxId) {
                await saveSyncCursor(maxId, allItems.length, 'rest', null);
                console.log(`Saved progress: ${allItems.length} items, cursor: ${maxId}`);
            }

            if (hasMore) {
                await sleep(1000);
            }

        } catch (error) {
            console.error('Error fetching page:', error);
            syncState.currentType = `Error on page ${attempts + 1}, stopping...`;
            if (maxId) {
                await saveSyncCursor(maxId, allItems.length, 'rest', null);
            }
            break;
        }
    }

    // Save cursor with correct phase tracking
    if (hasMore && maxId) {
        // REST has more pages - save REST cursor
        await saveSyncCursor(maxId, allItems.length, 'rest', null);
        syncState.currentType = `Fetched ${allItems.length} items. More available - use "Continue Sync" later.`;
    } else {
        // REST is exhausted - mark phase as 'graphql' so Continue Sync skips REST
        console.log('[REST] REST API exhausted. Marking phase as graphql for future Continue Sync.');
        const curVault = await VaultDB.getAllPosts();
        await saveSyncCursor(null, curVault.length, 'graphql', null);
    }

    return allItems;
}

// Save sync cursor for resumability - tracks BOTH REST and GraphQL phases
async function saveSyncCursor(cursor, itemCount, phase, graphqlCursor) {
    try {
        await chrome.storage.local.set({
            syncCursor: cursor || null,
            syncProgress: itemCount || 0,
            syncPhase: phase || 'rest',        // 'rest' or 'graphql'
            syncGraphqlCursor: graphqlCursor || null,
            syncTimestamp: Date.now()
        });
    } catch (e) {}
}

// Get saved sync cursor
async function getSyncCursor() {
    try {
        const data = await chrome.storage.local.get(['syncCursor', 'syncProgress', 'syncTimestamp', 'syncPhase', 'syncGraphqlCursor']);
        if (data.syncCursor || data.syncGraphqlCursor) {
            return {
                cursor: data.syncCursor || null,
                itemCount: data.syncProgress || 0,
                timestamp: data.syncTimestamp,
                phase: data.syncPhase || 'rest',
                graphqlCursor: data.syncGraphqlCursor || null
            };
        }
    } catch (e) {}
    return null;
}

// Fallback to GraphQL API
async function fetchSavedViaGraphQL(userId) {
    const allItems = [];
    let cursor = null;
    let hasMore = true;
    let attempts = 0;

    while (hasMore && attempts < 100) {
        try {
            const variables = {
                id: userId,
                first: 50
            };
            if (cursor) {
                variables.after = cursor;
            }

            const queryHash = '2ce1d673055b99c320f5a4f1520f8aed';
            const url = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(JSON.stringify(variables))}`;

            const response = await fetch(url, {
                headers: {
                    'X-IG-App-ID': '936619743392459',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                console.log('GraphQL not available');
                break;
            }

            const data = await response.json();
            const savedMedia = data?.data?.user?.edge_saved_media;

            if (savedMedia?.edges) {
                const items = savedMedia.edges.map(edge => processGraphQLItem(edge.node));
                allItems.push(...items);

                hasMore = savedMedia.page_info?.has_next_page || false;
                cursor = savedMedia.page_info?.end_cursor;
            } else {
                hasMore = false;
            }

            attempts++;
            if (hasMore) await sleep(800);

        } catch (error) {
            console.error('GraphQL error:', error);
            break;
        }
    }

    return allItems;
}

// Fetch saved reels
async function fetchSavedReels(userId) {
    try {
        const response = await fetch('https://www.instagram.com/api/v1/feed/saved/reels/', {
            headers: {
                'X-IG-App-ID': '936619743392459',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        });

        if (!response.ok) return [];

        const data = await response.json();
        if (data.items) {
            return data.items.map(item => ({
                ...processMediaItem(item),
                type: 'reel'
            }));
        }
        return [];
    } catch {
        return [];
    }
}

// Fetch saved audio
async function fetchSavedAudio(userId) {
    try {
        const response = await fetch('https://www.instagram.com/api/v1/music/saved_music/', {
            headers: {
                'X-IG-App-ID': '936619743392459',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        });

        if (!response.ok) return [];

        const data = await response.json();
        if (data.items) {
            return data.items.map(item => ({
                id: item.audio_asset_id || item.id || Math.random().toString(36).substr(2, 9),
                type: 'audio',
                audioTitle: item.title || 'Unknown Track',
                audioArtist: item.subtitle || item.artist_name || 'Unknown Artist',
                thumbnailUrl: item.cover_artwork_uri || item.thumbnail_url,
                duration: item.duration_in_ms ? Math.floor(item.duration_in_ms / 1000) : 0,
                savedAt: new Date().toISOString(),
                mediaUrl: item.progressive_download_url || ''
            }));
        }
        return [];
    } catch {
        return [];
    }
}

// Process media item from Instagram API
function processMediaItem(item) {
    const media = item.media || item;

    // Extract carousel media if present
    let carouselMedia = null;
    if (media.carousel_media && media.carousel_media.length > 0) {
        carouselMedia = media.carousel_media.map((cm, index) => ({
            index: index,
            isVideo: cm.media_type === 2 || !!cm.video_versions,
            imageUrl: cm.image_versions2?.candidates?.[0]?.url || '',
            videoUrl: cm.video_versions?.[0]?.url || '',
            thumbnailUrl: cm.image_versions2?.candidates?.[0]?.url || '',
            // Audio from carousel item
            hasAudio: !!(cm.audio || cm.clips_metadata?.audio_type)
        }));
    }

    // Extract audio info from post (music clips, original audio, etc.)
    let audioInfo = null;
    const musicMetadata = media.music_metadata || media.clips_metadata?.music_info;
    const audioClip = media.audio || media.clips_metadata?.original_sound_info;

    if (musicMetadata) {
        const musicAsset = musicMetadata.music_asset_info || musicMetadata;
        audioInfo = {
            title: musicAsset.title || musicAsset.display_title || 'Unknown',
            artist: musicAsset.display_artist || musicAsset.ig_username || 'Unknown Artist',
            audioId: musicAsset.audio_cluster_id || musicAsset.audio_asset_id || '',
            coverUrl: musicAsset.cover_artwork_uri || musicAsset.cover_artwork_thumbnail_uri || ''
        };
    } else if (audioClip) {
        audioInfo = {
            title: audioClip.audio_title || 'Original Audio',
            artist: audioClip.ig_artist?.username || media.user?.username || 'Unknown',
            audioId: audioClip.audio_asset_id || '',
            coverUrl: audioClip.cover_artwork_thumbnail_uri || ''
        };
    }

    // Extract views from multiple possible fields
    const viewCount = media.play_count ||
        media.view_count ||
        media.video_view_count ||
        media.ig_play_count ||
        media.view_count ||
        media.clips_metadata?.play_count ||
        0;

    return {
        id: String(media.pk || media.id || Math.random().toString(36).substr(2, 9)),
        instagramId: media.code || media.shortcode || '',
        type: detectMediaType(media),
        username: media.user?.username || 'unknown',
        userProfilePic: media.user?.profile_pic_url || '',
        userId: media.user?.pk || media.user?.id || '',
        caption: media.caption?.text || '',
        hashtags: extractHashtags(media.caption?.text || ''),
        likes: media.like_count || 0,
        comments: media.comment_count || 0,
        mediaUrl: getMediaUrl(media),
        thumbnailUrl: getThumbnailUrl(media),
        duration: media.video_duration || 0,
        views: viewCount,
        savedAt: new Date().toISOString(),
        postedAt: media.taken_at ? new Date(media.taken_at * 1000).toISOString() : new Date().toISOString(),
        carouselMedia: carouselMedia,
        carouselCount: carouselMedia ? carouselMedia.length : 0,
        // Audio info for posts and reels
        audioInfo: audioInfo,
        hasAudio: !!audioInfo
    };
}

// Process GraphQL item
function processGraphQLItem(node) {
    return {
        id: node.id,
        instagramId: node.shortcode || '',
        type: node.is_video ? 'reel' : 'post',
        username: node.owner?.username || 'unknown',
        userProfilePic: node.owner?.profile_pic_url || '',
        userId: node.owner?.id || '',
        caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
        hashtags: extractHashtags(node.edge_media_to_caption?.edges?.[0]?.node?.text || ''),
        likes: node.edge_liked_by?.count || node.edge_media_preview_like?.count || 0,
        comments: node.edge_media_to_comment?.count || 0,
        mediaUrl: node.is_video ? node.video_url : node.display_url,
        thumbnailUrl: node.thumbnail_src || node.display_url,
        duration: node.video_duration || 0,
        views: node.video_view_count || 0,
        savedAt: new Date().toISOString(),
        postedAt: node.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000).toISOString() : new Date().toISOString()
    };
}

function getMediaUrl(media) {
    if (media.carousel_media) {
        return media.carousel_media[0]?.image_versions2?.candidates?.[0]?.url ||
            media.carousel_media[0]?.video_versions?.[0]?.url || '';
    }
    if (media.video_versions) {
        return media.video_versions[0]?.url || '';
    }
    if (media.image_versions2) {
        return media.image_versions2.candidates?.[0]?.url || '';
    }
    return '';
}

function getThumbnailUrl(media) {
    if (media.image_versions2) {
        return media.image_versions2.candidates?.[0]?.url || '';
    }
    if (media.carousel_media) {
        return media.carousel_media[0]?.image_versions2?.candidates?.[0]?.url || '';
    }
    return '';
}

function detectMediaType(media) {
    if (media.product_type === 'clips' || media.product_type === 'reels') {
        return 'reel';
    }
    if (media.media_type === 2 || media.is_video) {
        return 'reel';
    }
    return 'post';
}

function extractHashtags(text) {
    if (!text) return [];
    const regex = /#[\w\u0590-\u05ff\u0600-\u06ff]+/g;
    return text.match(regex) || [];
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Save scraped data directly to IndexedDB
async function sendToLocalServer(content, loginStatus) {
    try {
        console.log(`💾 Saving ${content.length} items directly to IndexedDB...`);
        await VaultDB.init();
        await VaultDB.savePosts(content);

        const profile = {
            userId: loginStatus.userId,
            username: loginStatus.username,
            fullName: loginStatus.fullName,
            profilePic: loginStatus.profilePic,
            lastSync: new Date().toISOString()
        };
        await VaultDB.setUser(profile);

        await chrome.storage.local.set({
            savedContentCount: content.length,
            lastSync: new Date().toISOString(),
            user: profile
        });

        return { success: true, count: content.length };
    } catch (error) {
        console.error('VaultDB save error:', error.message);
        throw error;
    }
}

// Cache thumbnails through the extension (has Instagram cookies)
// Downloads images using the browser's authenticated session, converts to base64,
// and sends to the local server for persistent storage

// Helper: convert blob to base64 string (chunked to avoid stack overflow on large images)
async function blobToBase64(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 32768;
    for (let c = 0; c < bytes.length; c += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(c, c + chunkSize));
    }
    return btoa(binary);
}

async function cacheThumbnailsToServer(content) {
    await VaultDB.init();

    const itemsToCache = content.filter(item => {
        const url = item.thumbnailUrl || item.mediaUrl;
        return url && item.id;
    });

    if (itemsToCache.length === 0) return;

    console.log(`📸 Starting background caching of ${itemsToCache.length} thumbnails to IndexedDB...`);
    let cached = 0, failed = 0, skipped = 0;
    const batchSize = 3;

    for (let i = 0; i < itemsToCache.length; i += batchSize) {
        const batch = itemsToCache.slice(i, i + batchSize);

        await Promise.all(batch.map(async (item) => {
            try {
                const exists = await VaultDB.hasMedia(item.id);
                if (exists) {
                    skipped++;
                    return;
                }

                const url = item.thumbnailUrl || item.mediaUrl;
                const response = await fetch(url);
                if (!response.ok) {
                    failed++;
                    return;
                }

                const blob = await response.blob();
                await VaultDB.saveMedia(item.id, blob, blob.type, 'thumbnail');
                cached++;

                if (item.carouselMedia && item.carouselMedia.length > 1) {
                    for (let c = 1; c < item.carouselMedia.length; c++) {
                        const cm = item.carouselMedia[c];
                        const cmUrl = cm.thumbnailUrl || cm.imageUrl;
                        const carouselCacheId = `${item.id}_c${cm.index || c}`;

                        if (cmUrl) {
                            try {
                                const cmExists = await VaultDB.hasMedia(carouselCacheId);
                                if (!cmExists) {
                                    const cmResp = await fetch(cmUrl);
                                    if (cmResp.ok) {
                                        const cmBlob = await cmResp.blob();
                                        await VaultDB.saveMedia(carouselCacheId, cmBlob, cmBlob.type, 'thumbnail');
                                    }
                                }
                            } catch (e) { }
                        }
                    }
                }
            } catch (err) {
                failed++;
            }
        }));

        await sleep(350);
    }

    console.log(`✅ Background thumbnail caching complete: ${cached} cached, ${skipped} skipped, ${failed} failed.`);
}

async function refreshVideoUrl(instagramId, mediaId) {
    console.log('🔄 Refreshing video URL for:', instagramId);

    try {
        // Try to get fresh media info from Instagram API
        // Method 1: Using the media info endpoint with media ID
        if (mediaId) {
            const response = await fetch(`https://www.instagram.com/api/v1/media/${mediaId}/info/`, {
                headers: {
                    'X-IG-App-ID': '936619743392459',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const data = await response.json();
                    const item = data.items?.[0];
                    if (item) {
                        const videoUrl = item.video_versions?.[0]?.url ||
                            item.clips_info?.clips?.[0]?.clip?.video_versions?.[0]?.url;
                        if (videoUrl) {
                            console.log('✅ Got fresh video URL via media ID');
                            return { success: true, videoUrl };
                        }
                    }
                } else {
                    console.log('Video Info API returned non-JSON response (likely a login page)');
                }
            }
        }

        // Method 2: Scrape the post page for video URL
        const pageResponse = await fetch(`https://www.instagram.com/p/${instagramId}/`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            credentials: 'include'
        });

        if (pageResponse.ok) {
            const html = await pageResponse.text();

            // Look for video URL in the page data
            const videoMatch = html.match(/"video_url":"([^"]+)"/);
            if (videoMatch) {
                const videoUrl = videoMatch[1].replace(/\\u0026/g, '&');
                console.log('✅ Got fresh video URL via page scrape');
                return { success: true, videoUrl };
            }

            // Try finding in JSON data
            const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
            if (jsonMatch) {
                try {
                    const jsonData = JSON.parse(jsonMatch[1]);
                    if (jsonData.video?.[0]?.contentUrl) {
                        console.log('✅ Got fresh video URL via JSON-LD');
                        return { success: true, videoUrl: jsonData.video[0].contentUrl };
                    }
                } catch (e) { }
            }
        }

        // Method 3: Try graphql endpoint
        const gqlResponse = await fetch(`https://www.instagram.com/graphql/query/?query_hash=b3055c01b4b222b8a47dc12b090e4e64&variables=${encodeURIComponent(JSON.stringify({ shortcode: instagramId }))}`, {
            headers: {
                'X-IG-App-ID': '936619743392459',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        });

        if (gqlResponse.ok) {
            const contentType = gqlResponse.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const gqlData = await gqlResponse.json();
                const media = gqlData.data?.shortcode_media;
                if (media?.video_url) {
                    console.log('✅ Got fresh video URL via GraphQL');
                    return { success: true, videoUrl: media.video_url };
                }
            } else {
                console.log('GraphQL returned non-JSON response for video (likely a login page)');
            }
        }

        throw new Error('Could not fetch fresh video URL. Instagram might be rate-limiting or requiring login.');

    } catch (error) {
        console.error('❌ Video refresh error:', error);
        return { success: false, error: error.message };
    }
}

console.log('Instagram Saved Vault background script loaded');

// ===================================
// On-Demand Thumbnail/Image Refresh
// ===================================
async function refreshThumbnailUrl(instagramId, mediaId) {
    console.log('🔄 Refreshing thumbnail URL for:', instagramId, 'mediaId:', mediaId);

    try {
        // Method 1: Using the media info endpoint with media ID
        if (mediaId) {
            try {
                const response = await fetch(`https://www.instagram.com/api/v1/media/${mediaId}/info/`, {
                    headers: {
                        'X-IG-App-ID': '936619743392459',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-IG-WWW-Claim': '0'
                    },
                    credentials: 'include'
                });

                if (response.ok) {
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        const data = await response.json();
                        const media = data.items?.[0];
                        if (media) {
                            const thumbnailUrl = media.image_versions2?.candidates?.[0]?.url;
                            const isVideo = media.media_type === 2;
                            const mediaUrl = isVideo ? (media.video_versions?.[0]?.url || thumbnailUrl) : thumbnailUrl;
                            // For carousels, get all images
                            let carouselUrls = null;
                            if (media.carousel_media) {
                                carouselUrls = media.carousel_media.map(cm => ({
                                    imageUrl: cm.image_versions2?.candidates?.[0]?.url,
                                    isVideo: cm.media_type === 2,
                                    videoUrl: cm.video_versions?.[0]?.url
                                }));
                            }
                            if (thumbnailUrl) {
                                console.log('✅ Got fresh media URL via media info API');
                                return { success: true, thumbnailUrl, mediaUrl, carouselUrls };
                            }
                        }
                    } else {
                         console.log('Media Info API returned non-JSON response (likely a login page)');
                    }
                }
            } catch (e) {
                console.log('Method 1 failed:', e.message);
            }
        }

        // Method 2: Scrape the post page for image URL
        const pageResponse = await fetch(`https://www.instagram.com/p/${instagramId}/`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            },
            credentials: 'include'
        });

        if (pageResponse.ok) {
            const html = await pageResponse.text();

            // Look for display_url or image URL in the page data
            const imgMatch = html.match(/"display_url":"([^"]+)"/);
            if (imgMatch) {
                const thumbnailUrl = imgMatch[1].replace(/\\u0026/g, '&');
                console.log('✅ Got fresh thumbnail URL via page scrape');
                return { success: true, thumbnailUrl, mediaUrl: thumbnailUrl };
            }

            // Try og:image meta tag
            const ogMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
            if (ogMatch) {
                const thumbnailUrl = ogMatch[1].replace(/&amp;/g, '&');
                console.log('✅ Got fresh thumbnail URL via og:image');
                return { success: true, thumbnailUrl, mediaUrl: thumbnailUrl };
            }

            // Try JSON in script tag
            const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
            if (jsonMatch) {
                try {
                    const jsonData = JSON.parse(jsonMatch[1]);
                    if (jsonData.image) {
                        const imgUrl = Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image;
                        console.log('✅ Got fresh thumbnail URL via JSON-LD');
                        return { success: true, thumbnailUrl: imgUrl, mediaUrl: imgUrl };
                    }
                } catch (e) { }
            }
        }

        // Method 3: Try graphql endpoint
        const gqlResponse = await fetch(`https://www.instagram.com/graphql/query/?query_hash=b3055c01b4b222b8a47dc12b090e4e64&variables=${encodeURIComponent(JSON.stringify({ shortcode: instagramId }))}`, {
            headers: {
                'X-IG-App-ID': '936619743392459',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        });

        if (gqlResponse.ok) {
            const contentType = gqlResponse.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const gqlData = await gqlResponse.json();
                const media = gqlData.data?.shortcode_media;
                if (media?.display_url) {
                    console.log('✅ Got fresh media URL via GraphQL');
                    let carouselUrls = null;
                    if (media.edge_sidecar_to_children?.edges) {
                        carouselUrls = media.edge_sidecar_to_children.edges.map(e => ({
                            imageUrl: e.node.display_url,
                            isVideo: e.node.is_video,
                            videoUrl: e.node.video_url
                        }));
                    }
                    const isVideo2 = media.is_video;
                    const mediaUrl2 = isVideo2 ? (media.video_url || media.display_url) : media.display_url;
                    return { success: true, thumbnailUrl: media.display_url, mediaUrl: mediaUrl2, carouselUrls };
                }
            } else {
                console.log('GraphQL returned non-JSON response (likely a login page)');
            }
        }

        throw new Error('Could not fetch fresh image URL. Instagram might be rate-limiting or requiring login.');

    } catch (error) {
        console.error('❌ Thumbnail refresh error:', error);
        return { success: false, error: 'Could not fetch image. Instagram might be blocking the request: ' + error.message };
    }
}

// Cache a single refreshed item's media to the server immediately
async function cacheRefreshedMediaToServer(itemId, result) {
    try {
        await VaultDB.init();

        if (result.thumbnailUrl) {
            try {
                const resp = await fetch(result.thumbnailUrl);
                if (resp.ok) {
                    const blob = await resp.blob();
                    await VaultDB.saveMedia(itemId, blob, blob.type, 'thumbnail');
                    console.log(`✅ Permanently cached thumbnail for ${itemId}`);
                }
            } catch (e) { console.warn('Thumbnail cache failed:', e.message); }
        }

        if (result.mediaUrl && result.type === 'reel') {
            try {
                const exists = await VaultDB.hasMedia(itemId);
                if (!exists) {
                    const videoResp = await fetch(result.mediaUrl);
                    if (videoResp.ok) {
                        const videoBlob = await videoResp.blob();
                        await VaultDB.saveMedia(itemId, videoBlob, 'video/mp4', 'video');
                        console.log(`✅ Permanently cached video for ${itemId}`);
                    }
                }
            } catch (e) { console.warn('Video cache failed:', e.message); }
        }

        if (Array.isArray(result.carouselMedia) && result.carouselMedia.length > 0) {
            for (const slide of result.carouselMedia) {
                const carouselId = `${itemId}_c${slide.index}`;
                if (slide.imageUrl) {
                    try {
                        const cmResp = await fetch(slide.imageUrl);
                        if (cmResp.ok) {
                            const cmBlob = await cmResp.blob();
                            await VaultDB.saveMedia(carouselId, cmBlob, cmBlob.type, 'thumbnail');
                        }
                    } catch (e) { }
                }
                if (slide.videoUrl) {
                    try {
                        const cmVideoResp = await fetch(slide.videoUrl);
                        if (cmVideoResp.ok) {
                            const cmVideoBlob = await cmVideoResp.blob();
                            await VaultDB.saveMedia(carouselId, cmVideoBlob, 'video/mp4', 'video');
                        }
                    } catch (e) { }
                }
            }
        }
    } catch (error) {
        console.error('cacheRefreshedMediaToServer error:', error);
    }
}

async function batchRefreshThumbnails(items, sender) {
    console.log(`🔄 Batch refreshing ${items.length} thumbnails`);
    const results = [];
    let completed = 0;

    for (const item of items) {
        try {
            const result = await refreshThumbnailUrl(item.instagramId, item.mediaId);
            
            if (result.success) {
                // Ensure permanent local caching immediately
                await cacheRefreshedMediaToServer(item.id, result);
            }
            
            results.push({ id: item.id, ...result });

            // Send progress update to the tab
            if (sender?.tab?.id) {
                try {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        type: 'BATCH_REFRESH_PROGRESS',
                        payload: {
                            id: item.id,
                            completed: ++completed,
                            total: items.length,
                            result
                        }
                    });
                } catch (e) { }
            }

            // Rate limit: wait 500ms between requests to avoid Instagram rate limiting
            await new Promise(r => setTimeout(r, 500));
        } catch (error) {
            results.push({ id: item.id, success: false, error: error.message });
            completed++;
        }
    }

    return { success: true, results, total: items.length, refreshed: results.filter(r => r.success).length };
}

// ===================================
// Repair Broken Images - Batch re-cache all uncached thumbnails
// ===================================
let repairState = {
    running: false,
    total: 0,
    processed: 0,
    cached: 0,
    failed: 0,
    skipped: 0,
    currentItem: null
};

async function repairBrokenImages(sender) {
    if (repairState.running) {
        return { success: false, error: 'Repair already in progress' };
    }

    const loginStatus = await checkInstagramLogin();
    if (!loginStatus.loggedIn) {
        return { success: false, error: 'Not logged into Instagram' };
    }

    repairState = { running: true, total: 0, processed: 0, cached: 0, failed: 0, skipped: 0, currentItem: null };

    try {
        await VaultDB.init();
        const posts = await VaultDB.getAllPosts();
        repairState.total = posts.length;

        if (repairState.total === 0) {
            repairState.running = false;
            return { success: true, message: 'No items in vault to repair.', cached: 0, failed: 0, total: 0 };
        }

        console.log(`🔧 Starting repair scan of ${repairState.total} items...`);

        for (let i = 0; i < posts.length; i++) {
            const item = posts[i];
            repairState.processed = i + 1;
            repairState.currentItem = item.id;

            const has = await VaultDB.hasMedia(item.id);
            if (!has && (item.instagramId || item.id)) {
                try {
                    const fresh = await refreshThumbnailUrl(item.instagramId || item.id, item.id);
                    if (fresh && fresh.success) {
                        repairState.cached++;
                    } else {
                        repairState.failed++;
                    }
                } catch (e) {
                    repairState.failed++;
                }
            } else {
                repairState.skipped++;
            }

            if (sender?.tab?.id && i % 5 === 0) {
                chrome.tabs.sendMessage(sender.tab.id, {
                    type: 'REPAIR_PROGRESS',
                    payload: { ...repairState }
                }).catch(() => {});
            }
        }

        repairState.running = false;
        return { success: true, ...repairState };
    } catch (e) {
        repairState.running = false;
        console.error('Repair tool error:', e);
        return { success: false, error: e.message };
    }
}
