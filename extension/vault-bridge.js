/**
 * Unlockt (v6.7) - Extension <-> Webapp PostMessage Bridge
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Developed by: Mahmoud Madi (Digital Marketing & IT Specialist)
 * Organizations: Premier Tech (For Integrated Solutions) & VOXO AI (AI & Media Agency)
 * Purpose: Real-time IPC Bridge between Express Webapp & Extension Background Worker
 * License: MIT License (Open Source)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

console.log('🔗 Vault Bridge: Connected to Instagram Saved Vault extension');

// Listen for messages from the webpage
window.addEventListener('message', async (event) => {
    // Only accept messages from our webapp
    if (event.source !== window) return;

    const { type, payload } = event.data || {};

    if (type === 'VAULT_REFRESH_VIDEO') {
        console.log('🔄 Vault Bridge: Refresh video request for', payload.instagramId);

        try {
            // Send message to background script
            const response = await chrome.runtime.sendMessage({
                action: 'refreshVideoUrl',
                instagramId: payload.instagramId,
                mediaId: payload.mediaId
            });

            // Send response back to webpage
            window.postMessage({
                type: 'VAULT_VIDEO_REFRESHED',
                payload: {
                    instagramId: payload.instagramId,
                    success: response?.success || false,
                    videoUrl: response?.videoUrl,
                    error: response?.error
                }
            }, '*');

        } catch (error) {
            console.error('Vault Bridge error:', error);
            window.postMessage({
                type: 'VAULT_VIDEO_REFRESHED',
                payload: {
                    instagramId: payload.instagramId,
                    success: false,
                    error: error.message
                }
            }, '*');
        }
    }

    // Single thumbnail refresh
    if (type === 'VAULT_REFRESH_THUMBNAIL') {
        console.log('🔄 Vault Bridge: Refresh thumbnail request for', payload.instagramId);

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'refreshThumbnailUrl',
                instagramId: payload.instagramId,
                mediaId: payload.mediaId
            });

            window.postMessage({
                type: 'VAULT_THUMBNAIL_REFRESHED',
                payload: {
                    id: payload.id,
                    instagramId: payload.instagramId,
                    success: response?.success || false,
                    thumbnailUrl: response?.thumbnailUrl,
                    mediaUrl: response?.mediaUrl,
                    carouselUrls: response?.carouselUrls,
                    error: response?.error
                }
            }, '*');

        } catch (error) {
            console.error('Vault Bridge thumbnail error:', error);
            window.postMessage({
                type: 'VAULT_THUMBNAIL_REFRESHED',
                payload: {
                    id: payload.id,
                    instagramId: payload.instagramId,
                    success: false,
                    error: error.message
                }
            }, '*');
        }
    }

    // Batch thumbnail refresh
    if (type === 'VAULT_BATCH_REFRESH_THUMBNAILS') {
        console.log('🔄 Vault Bridge: Batch refresh request for', payload.items?.length, 'items');

        try {
            // Forward the entire batch to the background script so it can run its own batch processing
            // including the crucial background video caching
            chrome.runtime.sendMessage({
                action: 'batchRefreshThumbnails',
                items: payload.items || []
            }, (response) => {
                // Background script handles individual progress via chrome.tabs.sendMessage, 
                // but we can also handle the final response here if needed.
                window.postMessage({
                    type: 'VAULT_BATCH_REFRESH_COMPLETE',
                    payload: response || { success: true }
                }, '*');
            });
            
            // Note: The individual VAULT_THUMBNAIL_REFRESHED messages will now be sent
            // by the background script using chrome.tabs.sendMessage, which vault-bridge needs to listen for.

        } catch (error) {
            console.error('Vault Bridge batch error:', error);
            window.postMessage({
                type: 'VAULT_BATCH_REFRESH_COMPLETE',
                payload: { success: false, error: error.message }
            }, '*');
        }
    }

    // Cache thumbnails via extension (downloads with Instagram cookies)
    if (type === 'VAULT_CACHE_THUMBNAILS') {
        console.log('📸 Vault Bridge: Cache thumbnails request for', payload.items?.length, 'items');

        try {
            const items = payload.items || [];
            let completed = 0, cached = 0, failed = 0;

            for (const item of items) {
                try {
                    const response = await chrome.runtime.sendMessage({
                        action: 'cacheThumbnail',
                        id: item.id,
                        url: item.thumbnailUrl || item.mediaUrl
                    });

                    completed++;
                    if (response?.success) cached++;
                    else failed++;

                    // Progress update every 10 items
                    if (completed % 10 === 0) {
                        window.postMessage({
                            type: 'VAULT_CACHE_PROGRESS',
                            payload: { completed, cached, failed, total: items.length }
                        }, '*');
                    }
                } catch (err) {
                    completed++;
                    failed++;
                }
            }

            window.postMessage({
                type: 'VAULT_CACHE_COMPLETE',
                payload: { total: items.length, cached, failed }
            }, '*');

        } catch (error) {
            console.error('Vault Bridge cache error:', error);
            window.postMessage({
                type: 'VAULT_CACHE_COMPLETE',
                payload: { success: false, error: error.message }
            }, '*');
        }
    }

    if (type === 'VAULT_CHECK_EXTENSION') {
        // Confirm extension is connected
        window.postMessage({
            type: 'VAULT_EXTENSION_READY',
            payload: { connected: true, version: '1.0.3' }
        }, '*');
    }
});

// Listen for messages from the background script and forward them to the webpage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'BATCH_REFRESH_PROGRESS') {
        const { id, completed, total, result } = message.payload || {};
        window.postMessage({
            type: 'VAULT_THUMBNAIL_REFRESHED',
            payload: {
                id: id,
                // Result contains success, thumbnailUrl, mediaUrl, carouselUrls, error
                ...result,
                batchProgress: { completed, total }
            }
        }, '*');
    }
});

// Notify page that bridge is ready
window.postMessage({
    type: 'VAULT_BRIDGE_READY',
    payload: { connected: true }
}, '*');

