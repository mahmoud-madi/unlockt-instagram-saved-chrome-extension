/**
 * Unlockt (v6.7) - Chromium Extension Popup Controller
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Developed by: Mahmoud Madi (Digital Marketing & IT Specialist)
 * Organizations: Premier Tech (For Integrated Solutions) & VOXO AI (AI & Media Agency)
 * Purpose: Interactive State Manager, Disclaimer Gatekeeper & Sync Dispatcher
 * License: MIT License (Open Source)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 100% Offline Local SVG Avatar Generator (Zero External Telemetry)
function getLocalAvatarSvg(name = 'User', size = 100, bg = 'E1306C', color = 'fff') {
    const initial = (name ? String(name).charAt(0) : 'U').toUpperCase();
    const bgColor = bg.startsWith('#') ? bg : '#' + bg;
    const fgColor = color.startsWith('#') ? color : '#' + color;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="${bgColor}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="bold" font-size="${Math.round(size * 0.45)}" fill="${fgColor}">${initial}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

document.addEventListener('DOMContentLoaded', init);

function init() {
    console.log('Popup initialized');

    // Setup all event listeners (no inline onclick)
    const loginBtn = document.getElementById('loginBtn');
    const retryLoginBtn = document.getElementById('retryLoginBtn');
    const syncBtn = document.getElementById('syncBtn');
    const continueSyncBtn = document.getElementById('continueSyncBtn');
    const openAppBtn = document.getElementById('openAppBtn');
    const viewSavedBtn = document.getElementById('viewSavedBtn');
    const openAppCompleteBtn = document.getElementById('openAppCompleteBtn');
    const doneBtn = document.getElementById('doneBtn');
    const retryErrorBtn = document.getElementById('retryErrorBtn');

    if (loginBtn) loginBtn.addEventListener('click', openInstagram);
    if (retryLoginBtn) retryLoginBtn.addEventListener('click', checkLoginStatus);
    
    // Sync buttons trigger interactive disclaimer & confirmation
    if (syncBtn) syncBtn.addEventListener('click', () => requestPopupSync('startSync'));
    if (continueSyncBtn) continueSyncBtn.addEventListener('click', () => requestPopupSync('continueSync'));

    // Sync New Only button
    const syncNewBtn = document.getElementById('syncNewBtn');
    if (syncNewBtn) syncNewBtn.addEventListener('click', () => requestPopupSync('syncNewOnly'));

    // Confirmation screen buttons
    const cancelPopupSyncBtn = document.getElementById('cancelPopupSyncBtn');
    const cancelPopupSyncTopBtn = document.getElementById('cancelPopupSyncTopBtn');
    const confirmPopupSyncBtn = document.getElementById('confirmPopupSyncBtn');

    if (cancelPopupSyncBtn) cancelPopupSyncBtn.addEventListener('click', () => showState('ready'));
    if (cancelPopupSyncTopBtn) cancelPopupSyncTopBtn.addEventListener('click', () => showState('ready'));
    if (confirmPopupSyncBtn) confirmPopupSyncBtn.addEventListener('click', executeConfirmedPopupSync);

    if (openAppBtn) openAppBtn.addEventListener('click', openVaultApp);
    if (viewSavedBtn) viewSavedBtn.addEventListener('click', viewSaved);
    if (openAppCompleteBtn) openAppCompleteBtn.addEventListener('click', openVaultApp);
    if (doneBtn) doneBtn.addEventListener('click', () => window.close());
    if (retryErrorBtn) retryErrorBtn.addEventListener('click', retrySync);

    // Check login status on load
    checkLoginStatus();
}

let pendingPopupSyncAction = 'syncNewOnly';

function requestPopupSync(action) {
    pendingPopupSyncAction = action || 'syncNewOnly';
    
    const icon = document.getElementById('popupSyncModalIcon');
    const title = document.getElementById('popupSyncModalTitle');
    const badge = document.getElementById('popupSyncModalBadge');
    const desc = document.getElementById('popupSyncModalDesc');
    const confirmBtn = document.getElementById('confirmPopupSyncBtn');

    if (action === 'syncNewOnly') {
        if (icon) icon.textContent = '⚡';
        if (title) title.textContent = 'Sync New Content Only';
        if (badge) {
            badge.textContent = 'RECOMMENDED • FAST & SAFE';
            badge.style.background = 'rgba(16, 185, 129, 0.15)';
            badge.style.color = '#10b981';
            badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        }
        if (desc) desc.textContent = 'Extracts recently saved items since your previous sync session with minimal requests. Safest for daily use.';
        if (confirmBtn) confirmBtn.textContent = 'Proceed & Sync';
    } else if (action === 'startSync') {
        if (icon) icon.textContent = '🔄';
        if (title) title.textContent = 'Full Vault Sync (All Saves)';
        if (badge) {
            badge.textContent = 'FULL ARCHIVE • ALL CONTENT';
            badge.style.background = 'rgba(225, 48, 108, 0.15)';
            badge.style.color = '#e1306c';
            badge.style.borderColor = 'rgba(225, 48, 108, 0.3)';
        }
        if (desc) desc.textContent = 'Traverses your entire Instagram saved vault from the beginning with anti-detection pacing delay.';
        if (confirmBtn) confirmBtn.textContent = 'Proceed & Sync';
    } else if (action === 'continueSync') {
        if (icon) icon.textContent = '📍';
        if (title) title.textContent = 'Continue Sync (Resume Archive)';
        if (badge) {
            badge.textContent = 'RESUME SESSION • PAGINATION';
            badge.style.background = 'rgba(247, 119, 55, 0.15)';
            badge.style.color = '#f77737';
            badge.style.borderColor = 'rgba(247, 119, 55, 0.3)';
        }
        if (desc) desc.textContent = 'Resumes extracting older saved items right where your previous sync paused without duplicate downloads.';
        if (confirmBtn) confirmBtn.textContent = 'Proceed & Sync';
    }

    showState('confirmSync');
}

function executeConfirmedPopupSync() {
    if (pendingPopupSyncAction === 'startSync') {
        startSync();
    } else if (pendingPopupSyncAction === 'continueSync') {
        continueSync();
    } else {
        syncNewOnly();
    }
}

async function checkLoginStatus() {
    showState('checking');
    console.log('Checking login status...');

    try {
        const status = await chrome.runtime.sendMessage({ action: 'checkLogin' });

        if (status && status.loggedIn) {
            console.log('User is logged in:', status);

            const usernameEl = document.getElementById('username');
            const fullNameEl = document.getElementById('fullName');
            const avatarImg = document.getElementById('userAvatarImg');
            const avatarSvg = document.getElementById('userAvatarSvg');

            const displayUsername = status.username || 'user';

            if (usernameEl) usernameEl.textContent = '@' + displayUsername;
            if (fullNameEl) fullNameEl.textContent = status.fullName || displayUsername;

            if (avatarImg) {
                const fallback = getLocalAvatarSvg(displayUsername, 200, 'E1306C', 'fff');
                avatarImg.onerror = () => {
                    avatarImg.src = fallback;
                };
                avatarImg.src = status.profilePic || fallback;
                avatarImg.classList.remove('hidden');
                if (avatarSvg) avatarSvg.classList.add('hidden');
            }

            // Check if sync is currently running
            const isRunning = await checkIfSyncRunning();
            if (isRunning) {
                // Sync is already running, show syncing state and poll for progress
                showState('syncing');
                startProgressPolling();
                return;
            }

            // Check if there's a saved cursor for resume
            await checkForResumeCursor();

            showState('ready');
        } else {
            console.log('Not logged in - missing cookies');
            showState('login');
        }

    } catch (error) {
        console.error('Error checking login:', error);
        showState('login');
    }
}

async function checkForResumeCursor() {
    try {
        const result = await chrome.runtime.sendMessage({ action: 'checkSyncCursor' });
        console.log('Cursor check result:', result);

        const resumeInfo = document.getElementById('resumeInfo');
        const continueSyncBtn = document.getElementById('continueSyncBtn');
        const resumeItemCount = document.getElementById('resumeItemCount');
        const syncBtnText = document.getElementById('syncBtnText');

        if (result && result.hasCursor && result.cursor) {
            // Show resume UI
            if (resumeInfo) resumeInfo.classList.remove('hidden');
            if (continueSyncBtn) continueSyncBtn.classList.remove('hidden');
            if (resumeItemCount) resumeItemCount.textContent = result.cursor.itemCount || 0;
            if (syncBtnText) syncBtnText.textContent = 'Start Fresh Sync';
        } else {
            // Hide resume UI
            if (resumeInfo) resumeInfo.classList.add('hidden');
            if (continueSyncBtn) continueSyncBtn.classList.add('hidden');
            if (syncBtnText) syncBtnText.textContent = 'Sync Saved Content';
        }
    } catch (e) {
        console.log('Could not check cursor:', e);
    }
}

async function checkIfSyncRunning() {
    try {
        const state = await chrome.runtime.sendMessage({ action: 'getSyncState' });
        return state && state.isRunning === true;
    } catch (e) {
        console.log('Could not check sync state:', e);
        return false;
    }
}

let progressPollingInterval = null;

function startProgressPolling() {
    // Clear any existing interval
    if (progressPollingInterval) {
        clearInterval(progressPollingInterval);
    }

    progressPollingInterval = setInterval(async () => {
        try {
            const state = await chrome.runtime.sendMessage({ action: 'getSyncState' });
            if (state && state.isRunning) {
                updateProgress(state.progress, state.currentType);
            } else {
                // Sync finished, stop polling and check results
                clearInterval(progressPollingInterval);
                progressPollingInterval = null;

                // Reload to get final state
                checkLoginStatus();
            }
        } catch (e) {
            console.log('Progress poll error:', e);
        }
    }, 500);
}

function stopProgressPolling() {
    if (progressPollingInterval) {
        clearInterval(progressPollingInterval);
        progressPollingInterval = null;
    }
}

function showState(state) {
    console.log('Showing state:', state);

    // Hide all states
    const states = document.querySelectorAll('.state');
    states.forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });

    // Show target state
    const targetEl = document.getElementById(state + 'State');
    if (targetEl) {
        targetEl.classList.add('active');
        targetEl.style.display = 'block';
    }
}

async function startSync() {
    console.log('Starting sync (fire-and-forget)...');
    showState('syncing');
    updateProgress(0, 'Initializing sync in background...');

    const downloadMedia = document.getElementById('downloadMediaToggle')?.checked !== false;
    
    // Send sync message WITHOUT waiting for response (fire-and-forget)
    // This allows sync to continue even if popup closes
    chrome.runtime.sendMessage({ 
        action: 'startSync',
        options: { downloadMedia }
    }).catch(e => {
        console.log('Sync message sent (may complete in background):', e?.message || 'ok');
    });

    // Start polling for progress - this handles updates while popup is open
    startProgressPolling();
}

async function continueSync() {
    console.log('Continuing sync (fire-and-forget)...');
    showState('syncing');
    updateProgress(0, 'Resuming sync in background...');

    const downloadMedia = document.getElementById('downloadMediaToggle')?.checked !== false;

    // Send continue message WITHOUT waiting for response (fire-and-forget)
    // This allows sync to continue even if popup closes
    chrome.runtime.sendMessage({ 
        action: 'continueSync',
        options: { downloadMedia }
    }).catch(e => {
        console.log('Continue sync message sent (may complete in background):', e?.message || 'ok');
    });

    // Start polling for progress - this handles updates while popup is open
    startProgressPolling();
}

async function syncNewOnly() {
    console.log('Syncing new content only (fire-and-forget)...');
    showState('syncing');
    updateProgress(0, 'Checking for new content...');

    const downloadMedia = document.getElementById('downloadMediaToggle')?.checked !== false;

    // Send syncNewOnly message WITHOUT waiting for response (fire-and-forget)
    // This allows sync to continue even if popup closes
    chrome.runtime.sendMessage({ 
        action: 'syncNewOnly',
        options: { downloadMedia }
    }).catch(e => {
        console.log('Sync new only message sent (may complete in background):', e?.message || 'ok');
    });

    // Start polling for progress - this handles updates while popup is open
    startProgressPolling();
}

function retrySync() {
    console.log('Retrying sync...');
    // Reset sync state in background
    chrome.runtime.sendMessage({ action: 'resetSync' })
        .then(() => {
            checkLoginStatus();
        })
        .catch(() => {
            checkLoginStatus();
        });
}

function updateProgress(percent, status) {
    const bar = document.querySelector('.progress-fill');
    const text = document.querySelector('.progress-text');
    const statusEl = document.querySelector('.sync-status');

    if (bar) bar.style.width = percent + '%';
    if (text) text.textContent = Math.round(percent) + '%';
    if (statusEl) statusEl.textContent = status || 'Processing...';
}

function openInstagram() {
    chrome.tabs.create({ url: 'https://www.instagram.com/accounts/login/' });
}

function openVaultApp() {
    chrome.tabs.create({ url: 'http://localhost:3000' });
}

function viewSaved() {
    chrome.tabs.create({ url: 'https://www.instagram.com/saved/' });
}

console.log('Popup script loaded');
