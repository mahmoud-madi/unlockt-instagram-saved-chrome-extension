/**
 * Unlockt (v6.8) - Instagram In-Page Content Script & HUD Bridge
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Developed by: Mahmoud Madi (Digital Marketing & IT Specialist)
 * Organizations: Premier Tech (For Integrated Solutions) & VOXO AI (AI & Media Agency)
 * Purpose: Instagram Navigation Watcher & Quick Sync Overlay HUD
 * License: MIT License (Open Source)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

(function () {
    'use strict';

    // Check if we're on Instagram
    if (!window.location.hostname.includes('instagram.com')) return;

    let vaultButton = null;
    let isLoggedIn = false;

    // Initialize
    init();

    function init() {
        // Check login status
        checkLoginStatus();

        // Watch for navigation changes (Instagram is SPA)
        observeNavigation();

        // Inject vault button after page loads
        setTimeout(injectVaultButton, 2000);
    }

    function checkLoginStatus() {
        // Check for logged-in indicators
        const hasSession = document.cookie.includes('sessionid');
        const hasUserId = document.cookie.includes('ds_user_id');
        isLoggedIn = hasSession && hasUserId;

        // Notify extension
        chrome.runtime.sendMessage({
            action: 'loginStatusChanged',
            loggedIn: isLoggedIn
        });
    }

    function observeNavigation() {
        // Instagram uses client-side navigation
        let lastUrl = location.href;

        new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                onNavigate();
            }
        }).observe(document.body, { subtree: true, childList: true });
    }

    function onNavigate() {
        // Re-inject button on navigation if needed
        setTimeout(() => {
            if (!document.getElementById('ig-vault-button')) {
                injectVaultButton();
            }
        }, 1000);

        // Add special features on saved page
        if (location.pathname.includes('/saved')) {
            enhanceSavedPage();
        }
    }

    function injectVaultButton() {
        // Don't inject if already exists
        if (document.getElementById('ig-vault-button')) return;

        // Find the nav section to add our button
        const nav = document.querySelector('nav') || document.querySelector('[role="navigation"]');
        if (!nav) return;

        // Create vault button
        vaultButton = document.createElement('div');
        vaultButton.id = 'ig-vault-button';
        vaultButton.className = 'ig-vault-button';
        vaultButton.innerHTML = `
            <button class="vault-nav-btn" title="Sync to Vault">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
            </button>
        `;

        vaultButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showVaultPanel();
        };

        // Try to insert in navigation
        const moreButton = nav.querySelector('[aria-label="Settings"]') ||
            nav.querySelector('[aria-label="More"]') ||
            nav.lastElementChild;

        if (moreButton && moreButton.parentNode) {
            moreButton.parentNode.insertBefore(vaultButton, moreButton);
        }
    }

    function showVaultPanel() {
        // Remove existing panel
        const existing = document.getElementById('ig-vault-panel');
        if (existing) {
            existing.remove();
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'ig-vault-panel';
        panel.className = 'ig-vault-panel';
        panel.innerHTML = `
            <div class="vault-panel-header">
                <div class="vault-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <h3>Instagram Saved Vault</h3>
                <button class="vault-close" onclick="document.getElementById('ig-vault-panel').remove()">×</button>
            </div>
            <div class="vault-panel-body">
                <div class="vault-status ${isLoggedIn ? 'logged-in' : 'logged-out'}">
                    <span class="status-dot"></span>
                    <span>${isLoggedIn ? 'Connected to Instagram' : 'Not logged in'}</span>
                </div>
                <button class="vault-sync-btn" id="vaultSyncBtn" ${!isLoggedIn ? 'disabled' : ''}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    <span>Sync Saved Content</span>
                </button>
                <div class="vault-progress" id="vaultProgress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <span class="progress-text" id="progressText">Syncing...</span>
                </div>
                <div class="vault-actions">
                    <a href="http://localhost:3000" target="_blank" class="vault-open-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        Open Vault App
                    </a>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Add sync button handler
        document.getElementById('vaultSyncBtn').onclick = startSync;
    }

    async function startSync() {
        const btn = document.getElementById('vaultSyncBtn');
        const progress = document.getElementById('vaultProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        btn.disabled = true;
        btn.innerHTML = '<span>Syncing...</span>';
        progress.style.display = 'block';

        try {
            // Start sync via background script
            const result = await chrome.runtime.sendMessage({ action: 'startSync' });

            if (result.success) {
                progressFill.style.width = '100%';
                progressText.textContent = `Synced ${result.count} items!`;
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Sync Complete!</span>
                `;

                // Show results
                setTimeout(() => {
                    showSyncResults(result);
                }, 500);
            } else {
                throw new Error(result.error || 'Sync failed');
            }
        } catch (error) {
            progressText.textContent = `Error: ${error.message}`;
            btn.disabled = false;
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                <span>Try Again</span>
            `;
        }
    }

    function showSyncResults(result) {
        const panel = document.getElementById('ig-vault-panel');
        if (!panel) return;

        const body = panel.querySelector('.vault-panel-body');
        body.innerHTML = `
            <div class="sync-results">
                <div class="result-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <h4>Sync Complete!</h4>
                </div>
                <div class="result-stats">
                    <div class="stat">
                        <span class="stat-value">${result.posts || 0}</span>
                        <span class="stat-label">Posts</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${result.reels || 0}</span>
                        <span class="stat-label">Reels</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${result.audio || 0}</span>
                        <span class="stat-label">Audio</span>
                    </div>
                </div>
                <a href="http://localhost:3000" target="_blank" class="vault-open-btn large">
                    Open Vault to Browse & Search
                </a>
            </div>
        `;
    }

    function enhanceSavedPage() {
        // Add vault features to saved page
        const header = document.querySelector('header') || document.querySelector('[role="banner"]');
        if (!header) return;

        // Check if we already added the button
        if (document.getElementById('vault-saved-sync')) return;

        // Add sync button near saved header
        const syncBtn = document.createElement('button');
        syncBtn.id = 'vault-saved-sync';
        syncBtn.className = 'vault-saved-sync';
        syncBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Sync All to Vault
        `;
        syncBtn.onclick = () => showVaultPanel();
    }

})();
