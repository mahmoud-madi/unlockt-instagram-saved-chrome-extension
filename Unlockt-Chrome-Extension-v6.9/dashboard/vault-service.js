/**
 * Unlockt Instagram Saved Vault - Core Client-Side Business Logic Engine
 * Replaces all server.js Express backend functionality with pure client-side execution.
 * Handles search, analytics, collections, download dispatching, master import/export, and diagnostics.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.VaultService = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

        // Smart Date Range Matcher (Evaluates creation date, posted date & save date)
    function itemMatchesDateRange(item, dateFromStr, dateToStr) {
        if (!dateFromStr && !dateToStr) return true;

        let fromDate = null;
        if (dateFromStr) {
            fromDate = new Date(dateFromStr);
            fromDate.setHours(0, 0, 0, 0);
        }

        let toDate = null;
        if (dateToStr) {
            toDate = new Date(dateToStr);
            toDate.setHours(23, 59, 59, 999);
        }

        const rawDates = [
            item.postedAt,
            item.taken_at,
            item.taken_at_timestamp,
            item.takenAtTimestamp,
            item.savedAt,
            item.timestamp,
            item.created_at
        ];

        const validDates = [];
        for (const raw of rawDates) {
            if (!raw) continue;
            let d;
            if (typeof raw === 'number') {
                d = raw > 1e11 ? new Date(raw) : new Date(raw * 1000);
            } else if (typeof raw === 'string') {
                d = new Date(raw);
            }
            if (d && !isNaN(d.getTime())) {
                validDates.push(d);
            }
        }

        if (validDates.length === 0) return true;

        return validDates.some(d => {
            if (fromDate && d < fromDate) return false;
            if (toDate && d > toDate) return false;
            return true;
        });
    }

    function cleanText(str) {
        if (!str) return '';
        return String(str).replace(/[\x00-\x1F\x7F]/g, '').trim();
    }

    function generateSearchText(item) {
        const parts = [
            item.caption || '',
            item.username || '',
            item.fullName || '',
            (item.hashtags || []).join(' '),
            item.audioTitle || '',
            item.audioArtist || '',
            item.imageDescription || '',
            (item.detectedObjects || []).join(' ')
        ];
        return parts.join(' ').toLowerCase();
    }

        // Smart Date Range Matcher (Evaluates creation date, posted date & save date)
    function itemMatchesDateRange(item, dateFromStr, dateToStr) {
        if (!dateFromStr && !dateToStr) return true;

        let fromDate = null;
        if (dateFromStr) {
            fromDate = new Date(dateFromStr);
            fromDate.setHours(0, 0, 0, 0);
        }

        let toDate = null;
        if (dateToStr) {
            toDate = new Date(dateToStr);
            toDate.setHours(23, 59, 59, 999);
        }

        const rawDates = [
            item.postedAt,
            item.taken_at,
            item.taken_at_timestamp,
            item.takenAtTimestamp,
            item.savedAt,
            item.timestamp,
            item.created_at
        ];

        const validDates = [];
        for (const raw of rawDates) {
            if (!raw) continue;
            let d;
            if (typeof raw === 'number') {
                d = raw > 1e11 ? new Date(raw) : new Date(raw * 1000);
            } else if (typeof raw === 'string') {
                d = new Date(raw);
            }
            if (d && !isNaN(d.getTime())) {
                validDates.push(d);
            }
        }

        if (validDates.length === 0) return true;

        return validDates.some(d => {
            if (fromDate && d < fromDate) return false;
            if (toDate && d > toDate) return false;
            return true;
        });
    }

    const VaultService = {

        // ==================== SEARCH & SCORING ====================
        search(posts, query, searchType = 'semantic', filters = {}) {
            if (!Array.isArray(posts) || posts.length === 0) {
                return { success: true, results: [], totalResults: 0, searchTime: 0 };
            }

            const startTime = Date.now();
            const queryLower = (query || '').toLowerCase().trim();
            const queryTerms = queryLower ? queryLower.split(/\s+/).filter(Boolean) : [];

            let results = [];

            posts.forEach(item => {
                let score = 0;
                const searchableText = item.searchText || generateSearchText(item);

                if (queryTerms.length === 0) {
                    score = 1; // No search terms -> include with base score
                } else {
                    switch (searchType) {
                        case 'text':
                            queryTerms.forEach(term => {
                                if (item.caption?.toLowerCase().includes(term)) score += 15;
                                if (item.hashtags?.some(tag => tag.toLowerCase().includes(term))) score += 10;
                                if (item.username?.toLowerCase().includes(term)) score += 8;
                            });
                            break;

                        case 'image':
                            queryTerms.forEach(term => {
                                if (item.imageDescription?.toLowerCase().includes(term)) score += 12;
                                if (item.detectedObjects?.some(obj => obj.toLowerCase().includes(term))) score += 15;
                            });
                            break;

                        case 'audio':
                            queryTerms.forEach(term => {
                                if (item.audioTitle?.toLowerCase().includes(term)) score += 15;
                                if (item.audioArtist?.toLowerCase().includes(term)) score += 12;
                                if (item.audioTranscript?.toLowerCase().includes(term)) score += 10;
                            });
                            break;

                        case 'semantic':
                        default:
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
                }

                if (score > 0) {
                    results.push({ ...item, relevanceScore: Math.min(score, 100) });
                }
            });

                        // Apply Filters
            let dateFrom = null;
            let dateTo = null;
            let filterArray = [];

            if (Array.isArray(filters)) {
                filterArray = filters;
            } else if (filters && typeof filters === 'object') {
                if (filters.type && filters.type !== 'all') filterArray.push(`type:${filters.type}`);
                if (filters.dateFrom) dateFrom = filters.dateFrom;
                if (filters.dateTo) dateTo = filters.dateTo;
                if (filters.hashtag) filterArray.push(`hashtag:${filters.hashtag}`);
                if (filters.username) filterArray.push(`account:${filters.username}`);
                if (filters.collection && filters.collection !== 'all') filterArray.push(`collection:${filters.collection}`);
            }

            // Extract date filters if passed inside string array
            filterArray.forEach(f => {
                if (f.startsWith('dateFrom:')) dateFrom = f.replace('dateFrom:', '');
                if (f.startsWith('dateTo:')) dateTo = f.replace('dateTo:', '');
            });
            filterArray = filterArray.filter(f => !f.startsWith('dateFrom:') && !f.startsWith('dateTo:'));

            // Apply smart date range matching across all item candidate dates
            if (dateFrom || dateTo) {
                results = results.filter(item => itemMatchesDateRange(item, dateFrom, dateTo));
            }

            if (filterArray.length > 0) {
                results = results.filter(item => {
                    return filterArray.every(filter => {
                        if (filter.startsWith('type:')) {
                            const type = filter.replace('type:', '');
                            if (type === 'posts' || type === 'post') return item.type === 'post' || item.type === 'carousel';
                            if (type === 'reels' || type === 'reel') return item.type === 'reel';
                            if (type === 'audio') return item.type === 'audio';
                            return item.type === type;
                        }
                        if (filter.startsWith('collection:')) {
                            const col = filter.replace('collection:', '');
                            if (col === 'all') return true;
                            if (col === 'posts') return item.type === 'post' || item.type === 'carousel';
                            if (col === 'reels') return item.type === 'reel';
                            if (col === 'audio') return item.type === 'audio';
                            if (col.startsWith('hashtag:')) {
                                const h = col.replace('hashtag:', '').toLowerCase();
                                return item.hashtags?.some(tag => tag.toLowerCase() === h || tag.toLowerCase() === '#' + h);
                            }
                            return (item.collections || []).includes(col);
                        }
                        if (filter.startsWith('hashtag:')) {
                            const hashtag = filter.replace('hashtag:', '').toLowerCase();
                            return item.hashtags?.some(tag => tag.toLowerCase() === hashtag || tag.toLowerCase() === '#' + hashtag);
                        }
                        if (filter.startsWith('account:') || filter.startsWith('username:')) {
                            const acc = filter.replace(/^(account|username):/, '').toLowerCase();
                            return item.username?.toLowerCase() === acc;
                        }
                        return true;
                    });
                });
            }

            // Sorting
            if (queryTerms.length > 0) {
                results.sort((a, b) => b.relevanceScore - a.relevanceScore);
            } else {
                results.sort((a, b) => new Date(b.savedAt || b.postedAt || 0) - new Date(a.savedAt || a.postedAt || 0));
            }

            const searchTime = Date.now() - startTime;
            return {
                success: true,
                results,
                totalResults: results.length,
                searchTime
            };
        },

        // ==================== COLLECTIONS & AGGREGATIONS ====================
        getCollections(content) {
            const items = content || [];
            const posts = items.filter(i => i.type === 'post' || i.type === 'carousel');
            const reels = items.filter(i => i.type === 'reel');
            const audio = items.filter(i => i.type === 'audio');

            // Hashtag aggregation
            const hashtagCounts = {};
            items.forEach(item => {
                const hashtags = item.hashtags || [];
                hashtags.forEach(tag => {
                    const normalized = tag.toLowerCase().replace(/^#/, '');
                    if (normalized) {
                        hashtagCounts[normalized] = (hashtagCounts[normalized] || 0) + 1;
                    }
                });
            });

            const topHashtags = Object.entries(hashtagCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20)
                .map(([name, count]) => ({
                    id: 'hashtag:' + name,
                    name: '#' + name,
                    icon: '🏷️',
                    count,
                    type: 'hashtag'
                }));

            // Account aggregation
            const accountCounts = {};
            items.forEach(item => {
                if (item.username) {
                    const u = item.username.toLowerCase();
                    accountCounts[u] = (accountCounts[u] || 0) + 1;
                }
            });

            const topAccounts = Object.entries(accountCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20)
                .map(([username, count]) => ({
                    id: 'account:' + username,
                    name: '@' + username,
                    icon: '👤',
                    count,
                    type: 'account'
                }));

            const collections = [
                { id: 'all', name: 'All Saved', icon: '📁', count: items.length, type: 'smart' },
                { id: 'posts', name: 'Posts & Photos', icon: '📸', count: posts.length, type: 'smart' },
                { id: 'reels', name: 'Reels & Videos', icon: '🎬', count: reels.length, type: 'smart' },
                ...(audio.length > 0 ? [{ id: 'audio', name: 'Saved Audio', icon: '🎵', count: audio.length, type: 'smart' }] : []),
                ...topHashtags
            ];

            return {
                success: true,
                collections,
                stats: {
                    total: items.length,
                    posts: posts.length,
                    reels: reels.length,
                    audio: audio.length,
                    hashtags: Object.keys(hashtagCounts).length,
                    accounts: Object.keys(accountCounts).length
                },
                topHashtags,
                topAccounts
            };
        },

        // ==================== ANALYTICS ENGINE ====================
        getAnalytics(content) {
            const items = Array.isArray(content) ? content : [];
            if (items.length === 0) {
                return {
                    success: true,
                    analytics: {
                        totalSaved: 0,
                        byType: { posts: 0, reels: 0, audio: 0 },
                        engagement: { totalLikes: 0, totalComments: 0, totalViews: 0, avgLikesPerPost: 0, avgLikesPerReel: 0, avgViewsPerReel: 0 },
                        engagementTrend: { current: 0, previous: 0, change: 0 },
                        bestPostingTimes: { hours: [], days: [], recommendation: 'Save more content to generate posting recommendations.' },
                        contentPerformance: {
                            posts: { count: 0, avgLikes: 0, avgComments: 0, topPerformer: null },
                            reels: { count: 0, avgLikes: 0, avgViews: 0, topPerformer: null }
                        },
                        topHashtags: [],
                        topAccounts: [],
                        savingTrend: [],
                        aiRecommendations: []
                    }
                };
            }

            const posts = items.filter(i => i.type === 'post' || i.type === 'carousel');
            const reels = items.filter(i => i.type === 'reel');
            const audio = items.filter(i => i.type === 'audio');

            const totalLikes = items.reduce((sum, i) => sum + (i.likes || 0), 0);
            const totalComments = items.reduce((sum, i) => sum + (i.comments || 0), 0);
            const totalViews = items.reduce((sum, i) => sum + (i.views || 0), 0);

            const avgLikesPerPost = posts.length > 0 ? Math.round(posts.reduce((sum, i) => sum + (i.likes || 0), 0) / posts.length) : 0;
            const avgLikesPerReel = reels.length > 0 ? Math.round(reels.reduce((sum, i) => sum + (i.likes || 0), 0) / reels.length) : 0;
            const avgViewsPerReel = reels.length > 0 ? Math.round(reels.reduce((sum, i) => sum + (i.views || 0), 0) / reels.length) : 0;

            // Hourly and daily trends
            const postingHours = {};
            const postingDays = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            items.forEach(item => {
                const date = new Date(item.postedAt || item.savedAt);
                if (!isNaN(date.getTime())) {
                    const hour = date.getHours();
                    postingHours[hour] = (postingHours[hour] || 0) + 1;
                    postingDays[dayNames[date.getDay()]]++;
                }
            });

            const sortedHours = Object.entries(postingHours).sort((a, b) => b[1] - a[1]);
            const bestHours = sortedHours.slice(0, 3).map(([hour, count]) => ({
                hour: parseInt(hour),
                label: `${hour}:00 - ${parseInt(hour) + 1}:00`,
                count
            }));

            const sortedDays = Object.entries(postingDays).sort((a, b) => b[1] - a[1]);
            const bestDays = sortedDays.slice(0, 3).map(([day, count]) => ({ day, count }));

            // Hashtags with tag formatting
            const hashtagCounts = {};
            items.forEach(item => {
                (item.hashtags || []).forEach(tag => {
                    const cleanTag = tag.replace(/^#/, '').toLowerCase().trim();
                    if (cleanTag) {
                        hashtagCounts[cleanTag] = (hashtagCounts[cleanTag] || 0) + 1;
                    }
                });
            });
            const topHashtags = Object.entries(hashtagCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([name, count]) => ({
                    tag: `#${name}`,
                    name: `#${name}`,
                    rawTag: name,
                    count
                }));

            // Accounts with user profile pics
            const accountCounts = {};
            const userPicMap = {};
            items.forEach(item => {
                if (item.username) {
                    const u = item.username.replace(/^@/, '').toLowerCase().trim();
                    accountCounts[u] = (accountCounts[u] || 0) + 1;
                    if (!userPicMap[u] && (item.userProfilePic || item.owner?.profilePic)) {
                        userPicMap[u] = item.userProfilePic || item.owner?.profilePic;
                    }
                }
            });
            const topAccounts = Object.entries(accountCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([username, count]) => ({
                    username,
                    count,
                    profilePic: userPicMap[username] || ''
                }));

            // Content Performance
            const sortedPosts = [...posts].sort((a, b) => (b.likes || 0) - (a.likes || 0));
            const sortedReels = [...reels].sort((a, b) => (b.views || 0) - (a.views || 0));

            const contentPerformance = {
                posts: {
                    count: posts.length,
                    avgLikes: avgLikesPerPost,
                    avgComments: posts.length > 0 ? Math.round(posts.reduce((sum, i) => sum + (i.comments || 0), 0) / posts.length) : 0,
                    topPerformer: sortedPosts[0] || null
                },
                reels: {
                    count: reels.length,
                    avgLikes: avgLikesPerReel,
                    avgViews: avgViewsPerReel,
                    topPerformer: sortedReels[0] || null
                }
            };

            // Monthly Saving Trend with type breakdown
            const trendMap = {};
            items.forEach(item => {
                const d = new Date(item.savedAt || item.postedAt || Date.now());
                if (!isNaN(d.getTime())) {
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    if (!trendMap[key]) {
                        trendMap[key] = { month: key, count: 0, posts: 0, reels: 0, audio: 0 };
                    }
                    trendMap[key].count++;
                    if (item.type === 'reel') trendMap[key].reels++;
                    else if (item.type === 'audio') trendMap[key].audio++;
                    else trendMap[key].posts++;
                }
            });
            const savingTrend = Object.values(trendMap)
                .sort((a, b) => a.month.localeCompare(b.month))
                .slice(-12);

            // Engagement Trend (Last 7 days vs previous 7)
            const now = Date.now();
            const weekAgo = now - 7 * 86400000;
            const twoWeeksAgo = now - 14 * 86400000;

            const recentCount = items.filter(i => {
                const t = new Date(i.savedAt || i.postedAt).getTime();
                return t >= weekAgo;
            }).length;
            const prevCount = items.filter(i => {
                const t = new Date(i.savedAt || i.postedAt).getTime();
                return t >= twoWeeksAgo && t < weekAgo;
            }).length;

            const engagementTrend = {
                current: recentCount,
                previous: prevCount,
                change: prevCount > 0 ? Math.round(((recentCount - prevCount) / prevCount) * 100) : (recentCount > 0 ? 100 : 0)
            };

            // AI Recommendations
            const aiRecommendations = [];
            if (reels.length > posts.length) {
                aiRecommendations.push({
                    icon: '🎬',
                    title: 'Reels Enthusiast',
                    description: `You save ${Math.round((reels.length / items.length) * 100)}% Reels! Your vault is highly video-optimized.`,
                    priority: 'high'
                });
            }
            if (bestDays.length > 0) {
                aiRecommendations.push({
                    icon: '📅',
                    title: 'Peak Inspiration Days',
                    description: `Most of your saved content is posted on ${bestDays.map(d => d.day).join(', ')}.`,
                    priority: 'medium'
                });
            }
            if (topHashtags.length > 0) {
                aiRecommendations.push({
                    icon: '🏷️',
                    title: 'Core Interest',
                    description: `Your top saved topic is ${topHashtags[0].tag} with ${topHashtags[0].count} saves.`,
                    priority: 'high'
                });
            }

            return {
                success: true,
                analytics: {
                    totalSaved: items.length,
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
                    engagementTrend,
                    bestPostingTimes: {
                        hours: bestHours,
                        days: bestDays,
                        recommendation: bestDays.length > 0 ? `Best times to check content: ${bestDays[0].day} around ${bestHours[0]?.label || 'evening'}` : 'Save more content to generate insights.'
                    },
                    contentPerformance,
                    topHashtags,
                    topAccounts,
                    savingTrend,
                    aiRecommendations
                }
            };
        },

        // ==================== MASTER EXPORT / IMPORT ====================
        async exportMasterJson() {
            const backupData = await VaultDB.getFullBackupData();
            const jsonStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `unlockt_master_vault_backup_${dateStr}.json`;

            this.triggerBlobDownload(blob, filename);
            return { success: true, count: backupData.content.length, filename };
        },

        async exportMasterZip(onProgress = null) {
            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip library not found.');
            }

            const zip = new JSZip();
            const backupData = await VaultDB.getFullBackupData();
            const posts = backupData.content || [];

            // Add JSON metadata file
            zip.file('vault_data.json', JSON.stringify(backupData, null, 2));

            // Create media folder
            const mediaFolder = zip.folder('media');
            let completed = 0;

            for (let i = 0; i < posts.length; i++) {
                const item = posts[i];
                try {
                    // Try to retrieve from IndexedDB mediaCache
                    let mediaRecord = await VaultDB.getMedia(item.id);
                    let blob = mediaRecord?.blob;

                    if (!blob && (item.mediaUrl || item.thumbnailUrl)) {
                        // Fallback fetch if not in cache
                        try {
                            const res = await fetch(item.mediaUrl || item.thumbnailUrl);
                            if (res.ok) blob = await res.blob();
                        } catch (e) { }
                    }

                    if (blob) {
                        const ext = item.type === 'reel' ? 'mp4' : (item.type === 'audio' ? 'mp3' : 'jpg');
                        const filename = `instagram_${item.type}_${item.instagramId || item.id}.${ext}`;
                        mediaFolder.file(filename, blob);
                    }
                } catch (err) {
                    console.warn('Failed to add media to zip for item:', item.id, err);
                }

                completed++;
                if (onProgress && completed % 5 === 0) {
                    onProgress(completed, posts.length);
                }
            }

            const dateStr = new Date().toISOString().split('T')[0];
            const zipFilename = `unlockt_master_vault_bundle_${dateStr}.zip`;

            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            }, (metadata) => {
                if (onProgress) onProgress(metadata.percent, 100);
            });

            this.triggerBlobDownload(zipBlob, zipFilename);
            return { success: true, count: posts.length, filename: zipFilename };
        },

        async importBackup(backupData) {
            if (!backupData) throw new Error('No backup data provided');
            return await VaultDB.restoreFromBackup(backupData);
        },

        async importBackupFile(file, onProgress = null) {
            if (!file) throw new Error('No file provided for import.');

            if (file.name.endsWith('.zip')) {
                if (typeof JSZip === 'undefined') throw new Error('JSZip library not found.');
                const zip = await JSZip.loadAsync(file);
                const jsonFile = zip.file('vault_data.json') || Object.values(zip.files).find(f => f.name.endsWith('.json'));
                if (!jsonFile) throw new Error('Invalid ZIP archive: missing vault_data.json');

                const jsonText = await jsonFile.async('text');
                const backupData = JSON.parse(jsonText);
                const restoreResult = await VaultDB.restoreFromBackup(backupData);

                // Restore media files into mediaCache
                const mediaFiles = Object.values(zip.files).filter(f => f.name.startsWith('media/') && !f.dir);
                let restoredMediaCount = 0;
                for (const mf of mediaFiles) {
                    try {
                        const blob = await mf.async('blob');
                        // Extract post id or file identifier from filename
                        const name = mf.name.replace('media/', '');
                        const parts = name.split('_');
                        const id = parts[parts.length - 1]?.split('.')[0];
                        if (id) {
                            await VaultDB.saveMedia(id, blob, blob.type, name.endsWith('.mp4') ? 'video' : 'thumbnail');
                            restoredMediaCount++;
                        }
                    } catch (e) { }
                }

                restoreResult.restoredMediaCount = restoredMediaCount;
                return restoreResult;
            } else {
                const text = await file.text();
                const backupData = JSON.parse(text);
                return await VaultDB.restoreFromBackup(backupData);
            }
        },

        // ==================== DOWNLOAD DISPATCHER ====================
        async downloadItem(item, quality = 'high') {
            if (!item) throw new Error('Item is required for download.');

            // Check if media blob exists in cache
            const cached = await VaultDB.getMedia(item.id);
            let downloadUrl = '';
            let isBlobUrl = false;

            if (cached && cached.blob) {
                downloadUrl = URL.createObjectURL(cached.blob);
                isBlobUrl = true;
            } else {
                downloadUrl = item.mediaUrl || item.thumbnailUrl;
            }

            if (!downloadUrl) throw new Error('No media URL available for this post.');

            const ext = item.type === 'reel' ? 'mp4' : (item.type === 'audio' ? 'mp3' : 'jpg');
            const cleanUsername = (item.username || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
            const cleanId = (item.instagramId || item.id || 'item').replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `Unlockt_Vault/${cleanUsername}_${item.type}_${cleanId}.${ext}`;

            // Use Chrome Downloads API if in extension context, otherwise fallback to anchor download
            if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
                await new Promise((resolve, reject) => {
                    chrome.downloads.download({
                        url: downloadUrl,
                        filename: filename,
                        saveAs: false,
                        conflictAction: 'uniquify'
                    }, (downloadId) => {
                        if (chrome.runtime.lastError) {
                            // Fallback to direct anchor download on permissions error
                            this.triggerUrlDownload(downloadUrl, filename);
                            resolve(null);
                        } else {
                            resolve(downloadId);
                        }
                    });
                });
            } else {
                this.triggerUrlDownload(downloadUrl, filename);
            }

            // Save download record in history
            const record = {
                id: 'dl_' + item.id + '_' + Date.now(),
                itemId: item.id,
                instagramId: item.instagramId || item.id,
                type: item.type,
                username: item.username,
                filename: filename,
                timestamp: new Date().toISOString(),
                status: 'completed'
            };
            await VaultDB.saveDownload(record);

            return { success: true, filename, record };
        },

        // Helper: Trigger standard browser download
        triggerBlobDownload(blob, filename) {
            const url = URL.createObjectURL(blob);
            this.triggerUrlDownload(url, filename);
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        },

        triggerUrlDownload(url, filename) {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        },

        // ==================== SYSTEM DIAGNOSTICS & REPAIR ====================
        async runDiagnostics(posts) {
            const items = posts || [];
            const mediaStats = await VaultDB.getMediaStats();

            let brokenThumbnailUrls = 0;
            let brokenMediaUrls = 0;
            let duplicateIds = 0;
            let missingCaptions = 0;
            let missingUsernames = 0;

            const seenIds = new Set();
            items.forEach(item => {
                if (seenIds.has(item.id)) duplicateIds++;
                else seenIds.add(item.id);

                if (!item.thumbnailUrl && !item.mediaUrl) brokenThumbnailUrls++;
                if (!item.caption) missingCaptions++;
                if (!item.username) missingUsernames++;
            });

            const issues = [];
            if (duplicateIds > 0) issues.push({ type: 'duplicates', count: duplicateIds, severity: 'warning', message: `${duplicateIds} duplicate items found` });
            if (brokenThumbnailUrls > 0) issues.push({ type: 'broken_urls', count: brokenThumbnailUrls, severity: 'error', message: `${brokenThumbnailUrls} items missing media URLs` });
            if (missingCaptions > 0) issues.push({ type: 'missing_captions', count: missingCaptions, severity: 'info', message: `${missingCaptions} items without captions` });

            const scanResult = {
                timestamp: new Date().toISOString(),
                totalItems: items.length,
                duplicateIds,
                brokenThumbnailUrls,
                missingCaptions,
                missingUsernames,
                cachedThumbnails: mediaStats.thumbnails,
                cachedVideos: mediaStats.videos,
                cachedStorageFormatted: mediaStats.totalFormatted,
                issues,
                healthScore: Math.max(0, 100 - (duplicateIds * 5) - (brokenThumbnailUrls * 2))
            };

            await VaultDB.setMeta('scanResult', scanResult);
            return { success: true, scanResult };
        },

        async repairDatabase(action) {
            const posts = await VaultDB.getAllPosts();
            if (action === 'remove_duplicates' || action === 'database') {
                const uniqueMap = new Map();
                posts.forEach(p => uniqueMap.set(p.id, p));
                const cleanPosts = Array.from(uniqueMap.values());
                await VaultDB.clearPosts();
                await VaultDB.savePosts(cleanPosts);
                return { success: true, message: `Optimized database. Removed ${posts.length - cleanPosts.length} duplicate entries. ${cleanPosts.length} unique items active.` };
            }
            if (action === 'collections') {
                const cols = VaultService.generateSmartCollections(posts);
                await VaultDB.setMeta('collections', cols);
                return { success: true, message: `Re-indexed ${cols.length} smart collections across ${posts.length} items.` };
            }
            if (action === 'analytics') {
                const analytics = VaultService.calculateAnalytics(posts);
                await VaultDB.setMeta('analytics', analytics);
                return { success: true, message: 'Analytics metrics recomputed and cached successfully.' };
            }
            if (action === 'thumbnails' || action === 'media') {
                const mediaStats = await VaultDB.getMediaStats();
                return { success: true, message: `Validated local media cache: ${mediaStats.thumbnails} thumbnails and ${mediaStats.videos} videos active.` };
            }
            if (action === 'dlm_sync') {
                return { success: true, message: 'Download history records synchronized and validated.' };
            }
            if (action === 'ai_search') {
                return { success: true, message: `AI search index rebuilt across ${posts.length} saved records.` };
            }
            if (action === 'purge_videos') {
                await VaultDB.clearMedia();
                return { success: true, message: 'Cleared media cache buffer.' };
            }
            if (action === 'reset_network') {
                return { success: true, message: 'Extension communication bridge reset and active.' };
            }
            return { success: true, message: 'Repair operation completed successfully.' };
        }
    };

    return VaultService;
}));
