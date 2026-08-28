function getInitialsAvatar(name) {
    const clean = (name || 'VO').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    let initials = clean.substring(0, 2);
    if (!initials) initials = 'VO';

    // 1. Canvas high-DPI rendering (crisp PNG Data URL, 100% offline & CSP safe)
    if (typeof document !== 'undefined') {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 120;
            canvas.height = 120;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Gradient background
                const grad = ctx.createLinearGradient(0, 0, 120, 120);
                grad.addColorStop(0, '#833AB4');
                grad.addColorStop(0.5, '#E1306C');
                grad.addColorStop(1, '#FD1D1D');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(60, 60, 60, 0, Math.PI * 2);
                ctx.fill();

                // Subtle inner border ring
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(60, 60, 58, 0, Math.PI * 2);
                ctx.stroke();

                // Text initials
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(initials, 60, 63);

                return canvas.toDataURL('image/png');
            }
        } catch (e) {}
    }

    // 2. Base64 SVG Fallback
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
            <linearGradient id="ig_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#833AB4"/>
                <stop offset="50%" stop-color="#E1306C"/>
                <stop offset="100%" stop-color="#FD1D1D"/>
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#ig_${initials})"/>
        <text x="50" y="62" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="40" font-weight="bold" text-anchor="middle">${initials}</text>
    </svg>`;

    if (typeof btoa !== 'undefined') {
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
window.getInitialsAvatar = getInitialsAvatar;

function setUserAvatar(imgElement, profilePicUrl, usernameOrName) {
    if (!imgElement) return;
    const fallback = getInitialsAvatar(usernameOrName || 'User');
    imgElement.onerror = function () {
        this.onerror = null;
        this.src = fallback;
    };
    imgElement.src = (profilePicUrl && typeof profilePicUrl === 'string' && profilePicUrl.trim().length > 5) ? profilePicUrl : fallback;
}
window.setUserAvatar = setUserAvatar;

// Unlockt Extension Popup Script
// Developed by Mahmoud Madi | Premier Tech & VOXO AI Agency

// Immediately initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

let isInitialized = false;

async function init() {
    if (isInitialized) return;
    isInitialized = true;
    console.log('Unlockt popup initialized');

    // 1. Setup UI Button Listeners
    setupPopupEventListeners();

    // 2. Immediate Active Tab & Cache Pre-Render (Instant 0ms)
    await preRenderFromCacheOrTab();

    // 3. Background verification
    await checkLoginStatus();
}

function setupPopupEventListeners() {
    const loginBtn = document.getElementById('loginBtn');
    const retryLoginBtn = document.getElementById('retryLoginBtn');
    const syncBtn = document.getElementById('syncBtn');
    const continueSyncBtn = document.getElementById('continueSyncBtn');
    const openAppBtn = document.getElementById('openAppBtn');
    const viewSavedBtn = document.getElementById('viewSavedBtn');
    const openAppCompleteBtn = document.getElementById('openAppCompleteBtn');
    const doneBtn = document.getElementById('doneBtn');
    const retryErrorBtn = document.getElementById('retryErrorBtn');
    const syncNewBtn = document.getElementById('syncNewBtn');

    if (loginBtn) loginBtn.addEventListener('click', openInstagram);
    if (retryLoginBtn) retryLoginBtn.addEventListener('click', checkLoginStatus);

    if (syncBtn) syncBtn.addEventListener('click', () => requestPopupSync('startSync'));
    if (continueSyncBtn) continueSyncBtn.addEventListener('click', () => requestPopupSync('continueSync'));
    if (syncNewBtn) syncNewBtn.addEventListener('click', () => requestPopupSync('syncNewOnly'));

    const cancelPopupSyncBtn = document.getElementById('cancelPopupSyncBtn');
    const cancelPopupSyncTopBtn = document.getElementById('cancelPopupSyncTopBtn');
    const confirmPopupSyncBtn = document.getElementById('confirmPopupSyncBtn');

    if (cancelPopupSyncBtn) cancelPopupSyncBtn.addEventListener('click', () => showState('ready'));
    if (cancelPopupSyncTopBtn) cancelPopupSyncTopBtn.addEventListener('click', () => showState('ready'));
    if (confirmPopupSyncBtn) confirmPopupSyncBtn.addEventListener('click', executeConfirmedPopupSync);

    if (openAppBtn) openAppBtn.addEventListener('click', openVaultApp);
    if (viewSavedBtn) viewSavedBtn.addEventListener('click', viewSaved);
    if (openAppCompleteBtn) openAppCompleteBtn.addEventListener('click', openVaultApp);
    if (doneBtn) doneBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'resetSync' }).catch(() => {});
        showState('ready');
    });
    if (retryErrorBtn) retryErrorBtn.addEventListener('click', retrySync);
}

let pendingPopupSyncAction = 'startSync';

function requestPopupSync(action) {
    pendingPopupSyncAction = action || 'startSync';
    
    const icon = document.getElementById('popupSyncModalIcon');
    const title = document.getElementById('popupSyncModalTitle');
    const badge = document.getElementById('popupSyncModalBadge');
    const desc = document.getElementById('popupSyncModalDesc');
    const confirmBtn = document.getElementById('confirmPopupSyncBtn');

    if (action === 'syncNewOnly') {
        if (icon) icon.textContent = '⚡';
        if (title) title.textContent = 'Smart Sync New Saves';
        if (badge) {
            badge.textContent = 'FAST & SAFE';
            badge.style.background = 'rgba(76, 217, 100, 0.15)';
            badge.style.color = '#4cd964';
            badge.style.borderColor = 'rgba(76, 217, 100, 0.3)';
        }
        if (desc) desc.textContent = 'Extracts recently saved items since your previous sync session.';
        if (confirmBtn) confirmBtn.textContent = 'Sync New Content';
    } else if (action === 'startSync') {
        if (icon) icon.textContent = '📦';
        if (title) title.textContent = 'Full Vault Synchronization';
        if (badge) {
            badge.textContent = 'FULL EXTRACTION';
            badge.style.background = 'rgba(225, 48, 108, 0.15)';
            badge.style.color = '#e1306c';
            badge.style.borderColor = 'rgba(225, 48, 108, 0.3)';
        }
        if (desc) desc.textContent = 'Extracts all saved posts, reels, audio tracks and metadata directly from your active session.';
        if (confirmBtn) confirmBtn.textContent = 'Proceed & Sync';
    } else if (action === 'continueSync') {
        if (icon) icon.textContent = '⏩';
        if (title) title.textContent = 'Resume Pagination Sync';
        if (badge) {
            badge.textContent = 'PAGINATED RESUME';
            badge.style.background = 'rgba(250, 126, 30, 0.15)';
            badge.style.color = '#fa7e1e';
            badge.style.borderColor = 'rgba(250, 126, 30, 0.3)';
        }
        if (desc) desc.textContent = 'Picks up exactly where your previous sync stopped without re-fetching already saved items.';
        if (confirmBtn) confirmBtn.textContent = 'Resume Sync';
    }

    showState('syncConfirm');
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

async function preRenderFromCacheOrTab() {
    try {
        // Check cached userInfo first
        const stored = await chrome.storage.local.get(['userInfo', 'lastSyncResult']);
        if (stored?.userInfo?.username && stored.userInfo.username !== 'User') {
            updateUserUI(stored.userInfo);
            showState('ready');
            return;
        }

        // Check active tab URL for profile username
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs[0] && tabs[0].url && tabs[0].url.includes('instagram.com')) {
            const url = tabs[0].url;
            const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
            if (match && match[1] && !['explore', 'direct', 'reels', 'stories', 'accounts', 'p'].includes(match[1])) {
                updateUserUI({
                    username: match[1],
                    fullName: match[1],
                    profilePic: ''
                });
                showState('ready');
                return;
            }
        }
    } catch (e) {
        console.log('Pre-render note:', e);
    }

    // Default to ready state immediately so UI is never blank
    showState('ready');
}

function updateUserUI(userInfo) {
    if (!userInfo) return;
    const usernameEl = document.getElementById('username');
    const fullNameEl = document.getElementById('fullName');
    const avatarImg = document.getElementById('userAvatarImg');
    const avatarSvg = document.getElementById('userAvatarSvg');

    const displayUsername = userInfo.username || 'user';

    if (usernameEl) usernameEl.textContent = '@' + displayUsername;
    if (fullNameEl) fullNameEl.textContent = userInfo.fullName || displayUsername;

    if (avatarImg) {
        setUserAvatar(avatarImg, userInfo.profilePic, displayUsername);
        avatarImg.classList.remove('hidden');
        if (avatarSvg) avatarSvg.classList.add('hidden');
    }
}

async function checkLoginStatus() {
    try {
        const statusPromise = chrome.runtime.sendMessage({ action: 'checkLogin' });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3500));
        
        const status = await Promise.race([statusPromise, timeoutPromise]);

        if (status && status.loggedIn) {
            console.log('User is logged in:', status);
            updateUserUI(status);

            const syncState = await getSyncStateFromBg();
            if (syncState && syncState.isRunning) {
                showState('syncing');
                startProgressPolling();
                return;
            }

            await checkForResumeCursor();
            showState('ready');
        } else if (status && status.loggedIn === false) {
            const stored = await chrome.storage.local.get('userInfo');
            if (!stored?.userInfo?.username) {
                showState('login');
            } else {
                showState('ready');
            }
        }
    } catch (error) {
        console.log('Login check note:', error?.message || error);
        showState('ready');
    }
}

async function checkForResumeCursor() {
    try {
        const result = await chrome.runtime.sendMessage({ action: 'checkSyncCursor' });
        const resumeInfo = document.getElementById('resumeInfo');
        const continueSyncBtn = document.getElementById('continueSyncBtn');
        const resumeItemCount = document.getElementById('resumeItemCount');
        const syncBtnText = document.getElementById('syncBtnText');

        if (result && result.hasCursor && result.cursor) {
            if (resumeInfo) resumeInfo.classList.remove('hidden');
            if (continueSyncBtn) continueSyncBtn.classList.remove('hidden');
            if (resumeItemCount) resumeItemCount.textContent = result.cursor.itemCount || 0;
            if (syncBtnText) syncBtnText.textContent = 'Start Fresh Sync';
        } else {
            if (resumeInfo) resumeInfo.classList.add('hidden');
            if (continueSyncBtn) continueSyncBtn.classList.add('hidden');
            if (syncBtnText) syncBtnText.textContent = 'Sync Saved Content';
        }
    } catch (e) {
        console.log('Could not check cursor:', e);
    }
}

async function getSyncStateFromBg() {
    try {
        return await chrome.runtime.sendMessage({ action: 'getSyncState' });
    } catch (e) {
        return null;
    }
}

let progressPollingInterval = null;

function startProgressPolling() {
    if (progressPollingInterval) {
        clearInterval(progressPollingInterval);
    }

    progressPollingInterval = setInterval(async () => {
        try {
            const state = await getSyncStateFromBg();
            if (state && state.isRunning) {
                updateProgress(state.progress, state.currentType);
            } else if (state) {
                clearInterval(progressPollingInterval);
                progressPollingInterval = null;

                if (state.error) {
                    showErrorState(state.error);
                } else if (state.isFinished || state.progress === 100 || state.lastResult) {
                    showCompleteState(state.lastResult || {
                        count: state.total || 0,
                        posts: state.total || 0,
                        reels: 0,
                        audio: 0
                    });
                } else {
                    checkLoginStatus();
                }
            }
        } catch (e) {
            console.log('Progress poll error:', e);
        }
    }, 400);
}

function showCompleteState(result) {
    console.log('Showing complete state with result:', result);
    const count = result?.count || 0;
    const posts = result?.posts || (result?.count ? result.count : 0);
    const reels = result?.reels || 0;
    const audio = result?.audio || 0;

    const totalEl = document.getElementById('totalSynced');
    const postsEl = document.getElementById('syncedPosts');
    const reelsEl = document.getElementById('syncedReels');
    const audioEl = document.getElementById('syncedAudio');

    if (totalEl) totalEl.textContent = `${count} items saved & indexed!`;
    if (postsEl) postsEl.textContent = posts;
    if (reelsEl) reelsEl.textContent = reels;
    if (audioEl) audioEl.textContent = audio;

    showState('complete');
}

function showErrorState(msg) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) errorEl.textContent = msg || 'An error occurred during synchronization.';
    showState('error');
}

function showState(state) {
    console.log('Showing state:', state);
    
    // Normalize aliases
    let targetId = state + 'State';
    if (state === 'syncConfirm' || state === 'confirmSync') {
        targetId = 'confirmSyncState';
    } else if (state === 'sync' || state === 'syncing') {
        targetId = 'syncingState';
    } else if (state === 'ready') {
        targetId = 'readyState';
    } else if (state === 'login') {
        targetId = 'loginState';
    } else if (state === 'complete') {
        targetId = 'completeState';
    } else if (state === 'error') {
        targetId = 'errorState';
    }

    const states = document.querySelectorAll('.state');
    states.forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });

    let targetEl = document.getElementById(targetId) || document.getElementById(state + 'State') || document.getElementById('readyState');
    if (targetEl) {
        targetEl.classList.add('active');
        targetEl.style.display = 'block';
    }
}

async function startSync() {
    console.log('Starting sync...');
    showState('syncing');
    updateProgress(0, 'Initializing sync in background...');

    const downloadMedia = document.getElementById('downloadMediaToggle')?.checked !== false;
    chrome.runtime.sendMessage({ 
        action: 'startSync',
        options: { downloadMedia }
    }).catch(() => {});

    startProgressPolling();
}

async function continueSync() {
    console.log('Continuing sync...');
    showState('syncing');
    updateProgress(0, 'Resuming sync in background...');

    const downloadMedia = document.getElementById('downloadMediaToggle')?.checked !== false;
    chrome.runtime.sendMessage({ 
        action: 'continueSync',
        options: { downloadMedia }
    }).catch(() => {});

    startProgressPolling();
}

async function syncNewOnly() {
    console.log('Syncing new content only...');
    showState('syncing');
    updateProgress(0, 'Checking for new content...');

    const downloadMedia = document.getElementById('downloadMediaToggle')?.checked !== false;
    chrome.runtime.sendMessage({ 
        action: 'syncNewOnly',
        options: { downloadMedia }
    }).catch(() => {});

    startProgressPolling();
}

function retrySync() {
    chrome.runtime.sendMessage({ action: 'resetSync' })
        .then(() => checkLoginStatus())
        .catch(() => checkLoginStatus());
}

function updateProgress(percent, status) {
    const bar = document.querySelector('.progress-fill');
    const text = document.querySelector('.progress-text');
    const statusEl = document.querySelector('.sync-status');

    if (bar) bar.style.width = Math.min(100, Math.max(0, percent)) + '%';
    if (text) text.textContent = Math.round(percent) + '%';
    if (statusEl) statusEl.textContent = status || 'Processing...';
}

function openInstagram() {
    chrome.tabs.create({ url: 'https://www.instagram.com/accounts/login/' });
}

function openVaultApp() {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') });
}

function viewSaved() {
    chrome.tabs.create({ url: 'https://www.instagram.com/saved/' });
}
