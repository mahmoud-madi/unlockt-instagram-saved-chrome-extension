/**
 * Unlockt Instagram Saved Vault - Core IndexedDB Storage Layer
 * Supports both Window (Dashboard) and Service Worker (background.js) contexts.
 * Unlimited local storage for posts, media blobs, downloads, logs, and metadata.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.VaultDB = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    const DB_NAME = 'UnlocktInstagramVaultDB';
    const DB_VERSION = 1;

    let dbInstance = null;

    function openDB() {
        if (dbInstance) return Promise.resolve(dbInstance);

        return new Promise((resolve, reject) => {
            const idb = typeof self !== 'undefined' && self.indexedDB ? self.indexedDB : (typeof window !== 'undefined' ? window.indexedDB : null);
            if (!idb) {
                return reject(new Error('IndexedDB is not supported in this environment.'));
            }

            const request = idb.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 1. Posts Store
                if (!db.objectStoreNames.contains('posts')) {
                    const postStore = db.createObjectStore('posts', { keyPath: 'id' });
                    postStore.createIndex('type', 'type', { unique: false });
                    postStore.createIndex('username', 'username', { unique: false });
                    postStore.createIndex('savedAt', 'savedAt', { unique: false });
                    postStore.createIndex('postedAt', 'postedAt', { unique: false });
                }

                // 2. Media Cache Store (stores binary Blobs/ArrayBuffers for thumbnails and videos)
                if (!db.objectStoreNames.contains('mediaCache')) {
                    const mediaStore = db.createObjectStore('mediaCache', { keyPath: 'id' });
                    mediaStore.createIndex('type', 'type', { unique: false });
                    mediaStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // 3. Downloads History Store
                if (!db.objectStoreNames.contains('downloads')) {
                    const dlStore = db.createObjectStore('downloads', { keyPath: 'id' });
                    dlStore.createIndex('timestamp', 'timestamp', { unique: false });
                    dlStore.createIndex('status', 'status', { unique: false });
                }

                // 4. System & Diagnostics Logs Store
                if (!db.objectStoreNames.contains('logs')) {
                    const logStore = db.createObjectStore('logs', { keyPath: 'id' });
                    logStore.createIndex('timestamp', 'timestamp', { unique: false });
                    logStore.createIndex('level', 'level', { unique: false });
                }

                // 5. Meta / Settings Store (key-value)
                if (!db.objectStoreNames.contains('meta')) {
                    db.createObjectStore('meta', { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                resolve(dbInstance);
            };

            request.onerror = (event) => {
                console.error('IndexedDB open error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async function withStore(storeName, mode, callback) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, mode);
            const store = tx.objectStore(storeName);
            let result;

            tx.oncomplete = () => resolve(result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);

            try {
                result = callback(store, tx);
            } catch (err) {
                reject(err);
            }
        });
    }

    const VaultDB = {
        init: openDB,

        // ==================== POSTS ====================
        async getAllPosts() {
            return withStore('posts', 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => reject(req.error);
                });
            });
        },

        async getPost(id) {
            return withStore('posts', 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const req = store.get(String(id));
                    req.onsuccess = () => resolve(req.result || null);
                    req.onerror = () => reject(req.error);
                });
            });
        },

        async savePosts(posts) {
            if (!Array.isArray(posts) || posts.length === 0) return 0;
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('posts', 'readwrite');
                const store = tx.objectStore('posts');
                let count = 0;

                posts.forEach((item) => {
                    if (item && item.id) {
                        store.put(item);
                        count++;
                    }
                });

                tx.oncomplete = () => resolve(count);
                tx.onerror = () => reject(tx.error);
            });
        },

        async deletePost(id) {
            return withStore('posts', 'readwrite', (store) => {
                store.delete(String(id));
            });
        },

        async clearPosts() {
            return withStore('posts', 'readwrite', (store) => {
                store.clear();
            });
        },

        async getPostsCount() {
            return withStore('posts', 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const req = store.count();
                    req.onsuccess = () => resolve(req.result || 0);
                    req.onerror = () => reject(req.error);
                });
            });
        },

        // ==================== MEDIA CACHE (Blobs) ====================
        async saveMedia(id, blobOrData, mimeType = 'image/jpeg', type = 'thumbnail') {
            if (!id || !blobOrData) return false;

            let blob = blobOrData;
            if (typeof Blob !== 'undefined' && !(blob instanceof Blob)) {
                if (typeof blobOrData === 'string' && blobOrData.startsWith('data:')) {
                    const parts = blobOrData.split(',');
                    const byteString = atob(parts[1]);
                    const mime = parts[0].split(':')[1].split(';')[0];
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    blob = new Blob([ab], { type: mime || mimeType });
                } else if (blobOrData instanceof ArrayBuffer) {
                    blob = new Blob([blobOrData], { type: mimeType });
                } else {
                    blob = new Blob([blobOrData], { type: mimeType });
                }
            }

            const record = {
                id: String(id),
                blob: blob,
                mimeType: (blob && blob.type) || mimeType,
                size: (blob && blob.size) || 0,
                type: type,
                timestamp: Date.now()
            };

            return withStore('mediaCache', 'readwrite', (store) => {
                store.put(record);
                return true;
            });
        },

        async getMedia(id) {
            return withStore('mediaCache', 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const req = store.get(String(id));
                    req.onsuccess = () => resolve(req.result || null);
                    req.onerror = () => reject(req.error);
                });
            });
        },

        async hasMedia(id) {
            return withStore('mediaCache', 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const req = store.getKey(String(id));
                    req.onsuccess = () => resolve(!!req.result);
                    req.onerror = () => reject(req.error);
                });
            });
        },

        async deleteMedia(id) {
            return withStore('mediaCache', 'readwrite', (store) => {
                store.delete(String(id));
            });
        },

        async clearMediaCache() {
            return withStore('mediaCache', 'readwrite', (store) => {
                store.clear();
            });
        },

        async getMediaStats() {
            return withStore('mediaCache', 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    let count = 0;
                    let totalBytes = 0;
                    let thumbnails = 0;
                    let videos = 0;

                    const cursorReq = store.openCursor();
                    cursorReq.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) {
                            count++;
                            const val = cursor.value;
                            totalBytes += (val.size || val.blob?.size || 0);
                            if (val.type === 'video' || val.mimeType?.includes('video')) videos++;
                            else thumbnails++;
                            cursor.continue();
                        } else {
                            resolve({
                                totalCached: count,
                                thumbnails,
                                videos,
                                totalBytes,
                                totalFormatted: (totalBytes / (1024 * 1024)).toFixed(2) + ' MB'
                            });
                        }
                    };
                    cursorReq.onerror = () => reject(cursorReq.error);
                });
            });
        },

        // ==================== DOWNLOAD HISTORY ====================
        async getDownloads() {
            return withStore('downloads', 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const req = store.getAll();
                    req.onsuccess = () => {
                        const items = req.result || [];
                        items.sort((a, b) => (new Date(b.timestamp || b.date || 0)) - (new Date(a.timestamp || a.date || 0)));
                        resolve(items);
                    };
                    req.onerror = () => reject(req.error);
                });
            });
        },

        async saveDownload(record) {
            if (!record) return false;
            if (!record.id) record.id = 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            if (!record.timestamp) record.timestamp = new Date().toISOString();

            return withStore('downloads', 'readwrite', (store) => {
                store.put(record);
                return record;
            });
        },

        async deleteDownload(id) {
            return withStore('downloads', 'readwrite', (store) => {
                store.delete(String(id));
            });
        },

        async clearDownloads() {
            return withStore('downloads', 'readwrite', (store) => {
                store.clear();
            });
        },

        // ==================== LOGS ====================
        async getLogs(limit = 200) {
            return withStore('logs', 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const req = store.getAll();
                    req.onsuccess = () => {
                        const items = req.result || [];
                        items.sort((a, b) => (new Date(b.timestamp || 0)) - (new Date(a.timestamp || 0)));
                        resolve(items.slice(0, limit));
                    };
                    req.onerror = () => reject(req.error);
                });
            });
        },

        async addLog(level, category, message, details = null) {
            const logEntry = {
                id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                timestamp: new Date().toISOString(),
                level: level || 'INFO',
                category: category || 'SYSTEM',
                message: String(message || ''),
                details: details
            };

            return withStore('logs', 'readwrite', (store) => {
                store.put(logEntry);
                return logEntry;
            });
        },

        async clearLogs() {
            return withStore('logs', 'readwrite', (store) => {
                store.clear();
            });
        },

        // ==================== META / USER / SETTINGS ====================
        async getMeta(key, defaultValue = null) {
            return withStore('meta', 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const req = store.get(key);
                    req.onsuccess = () => {
                        resolve(req.result ? req.result.value : defaultValue);
                    };
                    req.onerror = () => reject(req.error);
                });
            });
        },

        async setMeta(key, value) {
            return withStore('meta', 'readwrite', (store) => {
                store.put({ key, value, updatedAt: new Date().toISOString() });
                return value;
            });
        },

        async getUser() {
            return this.getMeta('userProfile', {});
        },

        async setUser(user) {
            return this.setMeta('userProfile', user || {});
        },

        // ==================== FULL BACKUP & RESTORE ====================
        async getFullBackupData() {
            const [posts, downloads, logs, user] = await Promise.all([
                this.getAllPosts(),
                this.getDownloads(),
                this.getLogs(500),
                this.getUser()
            ]);

            return {
                vaultInfo: {
                    appName: 'Unlockt Instagram Vault',
                    tagline: 'Your Instagram saves — extracted, organized, yours.',
                    version: '6.7.0',
                    exportDate: new Date().toISOString(),
                    totalItems: posts.length,
                    totalDownloads: downloads.length,
                    format: 'unlockt-vault-v6.7-serverless'
                },
                user: user || {},
                content: posts || [],
                downloads: downloads || [],
                logs: logs || []
            };
        },

        async restoreFromBackup(backupData) {
            if (!backupData || !Array.isArray(backupData.content)) {
                throw new Error('Invalid backup file format. Missing content array.');
            }

            const existingPosts = await this.getAllPosts();
            const existingMap = new Map(existingPosts.map(p => [p.id, p]));

            let newCount = 0;
            let updatedCount = 0;

            const mergedPosts = backupData.content.map(item => {
                if (existingMap.has(item.id)) {
                    updatedCount++;
                    return { ...existingMap.get(item.id), ...item };
                } else {
                    newCount++;
                    return item;
                }
            });

            await this.savePosts(mergedPosts);

            if (backupData.user && backupData.user.username) {
                await this.setUser(backupData.user);
            }

            if (Array.isArray(backupData.downloads)) {
                for (const dl of backupData.downloads) {
                    await this.saveDownload(dl);
                }
            }

            if (Array.isArray(backupData.logs)) {
                for (const log of backupData.logs) {
                    await withStore('logs', 'readwrite', (store) => store.put(log));
                }
            }

            return {
                success: true,
                imported: backupData.content.length,
                newItems: newCount,
                updatedItems: updatedCount,
                total: mergedPosts.length,
                user: backupData.user || null,
                importedDownloads: (backupData.downloads || []).length,
                importedLogs: (backupData.logs || []).length
            };
        }
    };

    return VaultDB;
}));
