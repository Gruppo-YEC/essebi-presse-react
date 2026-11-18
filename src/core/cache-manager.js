import { ApiManager } from './api-manager';
import { settings } from '../config/settings';

// Configuration constants
const PULL_INTERVAL = 20000; // 20 seconds - Interval for checking modified tables
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days - Default cache Time To Live (pull handles invalidation)

class CacheManagerClass {
    constructor() {
        this.cache = new Map();
        this.lastPullTime = null;
        this.CACHE_KEY_PREFIX = 'ckd_cache_';
        this.LAST_PULL_KEY = 'ckd_last_pull_time';
        this.CACHE_TTL = CACHE_TTL;
        
        // Load existing cache and last pull time from localStorage
        this.loadFromLocalStorage();
    }

    // Check if cache is enabled in settings
    isCacheEnabled() {
        return settings.usingCache !== false; // Default true if not specified
    }

    // sorting → chiave stabile: accetta l'oggetto storico {field, order} e
    // l'array del multi-sort. Con l'array, field/order sarebbero undefined e
    // JSON.stringify li scarterebbe: tutti gli ordinamenti collasserebbero
    // sulla stessa chiave, servendo risposte in cache con l'ordine sbagliato.
    sortingKey(sorting) {
        if (Array.isArray(sorting)) {
            return sorting.map(s => s.field + ' ' + s.order).join(', ');
        }
        return (sorting && sorting.field ? sorting.field : '') + ' ' + (sorting && sorting.order ? sorting.order : '');
    }

    // Generate unique cache key for requests
    generateCacheKey(type, entity, params = {}) {
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((result, key) => {
                result[key] = params[key];
                return result;
            }, {});
        
        return `${type}:${entity}:${JSON.stringify(sortedParams)}`;
    }

    // Save to cache
    set(key, value, ttl = this.CACHE_TTL) {
        if (!this.isCacheEnabled()) {
            return; // Cache disabled, don't save
        }
        
        const cacheEntry = {
            data: value,
            timestamp: Date.now(),
            expiry: Date.now() + ttl
        };
        
        this.cache.set(key, cacheEntry);
        this.saveToLocalStorage();
    }

    // Get from cache
    get(key) {
        if (!this.isCacheEnabled()) {
            return null; // Cache disabled, return null
        }
        
        const entry = this.cache.get(key);
        
        if (!entry) return null;
        
        // Check if expired
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            this.saveToLocalStorage();
            return null;
        }
        
        return entry.data;
    }

    // Check if cache entry exists and is valid
    has(key) {
        return this.get(key) !== null;
    }

    // Clear cache for specific entity
    clearEntity(entity) {
        const keysToDelete = [];
        
        for (const [key, value] of this.cache.entries()) {
            if (key.includes(`:${entity}:`)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
        this.saveToLocalStorage();
    }

    // Clear all cache
    clearAll() {
        this.cache.clear();
        this.lastPullTime = null;
        localStorage.removeItem(this.LAST_PULL_KEY);
        
        // Clear all cache keys from localStorage
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.CACHE_KEY_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    }

    // Save cache to localStorage
    saveToLocalStorage() {
        try {
            // Convert Map to array for serialization
            const cacheArray = Array.from(this.cache.entries());
            const chunks = this.chunkArray(cacheArray, 100); // Split into chunks to avoid localStorage size limits
            
            // Clear existing cache keys
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.CACHE_KEY_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
            
            // Save chunks
            chunks.forEach((chunk, index) => {
                localStorage.setItem(
                    `${this.CACHE_KEY_PREFIX}${index}`,
                    JSON.stringify(chunk)
                );
            });
            
            // Save metadata
            localStorage.setItem(
                `${this.CACHE_KEY_PREFIX}meta`,
                JSON.stringify({ chunks: chunks.length })
            );
            
            if (this.lastPullTime) {
                localStorage.setItem(this.LAST_PULL_KEY, this.lastPullTime.toString());
            }
        } catch (e) {
            console.warn('Failed to save cache to localStorage:', e);
            // If localStorage is full, clear old cache entries
            if (e.name === 'QuotaExceededError') {
                this.clearOldEntries();
            }
        }
    }

    // Load cache from localStorage
    loadFromLocalStorage() {
        try {
            const meta = localStorage.getItem(`${this.CACHE_KEY_PREFIX}meta`);
            if (meta) {
                const { chunks } = JSON.parse(meta);
                const cacheArray = [];
                
                for (let i = 0; i < chunks; i++) {
                    const chunk = localStorage.getItem(`${this.CACHE_KEY_PREFIX}${i}`);
                    if (chunk) {
                        cacheArray.push(...JSON.parse(chunk));
                    }
                }
                
                // Rebuild Map from array
                this.cache = new Map(cacheArray);
                
                // Clean expired entries
                this.clearExpiredEntries();
            }
            
            const lastPull = localStorage.getItem(this.LAST_PULL_KEY);
            if (lastPull) {
                this.lastPullTime = parseInt(lastPull, 10);
            }
        } catch (e) {
            console.warn('Failed to load cache from localStorage:', e);
            this.cache = new Map();
        }
    }

    // Helper to chunk arrays
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    // Clear expired entries
    clearExpiredEntries() {
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key, value] of this.cache.entries()) {
            if (value.expiry && now > value.expiry) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
        
        if (keysToDelete.length > 0) {
            this.saveToLocalStorage();
        }
    }

    // Clear old entries when storage is full
    clearOldEntries() {
        const entries = Array.from(this.cache.entries());
        // Sort by timestamp, oldest first
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Remove oldest 25% of entries
        const toRemove = Math.floor(entries.length * 0.25);
        for (let i = 0; i < toRemove; i++) {
            this.cache.delete(entries[i][0]);
        }
        
        this.saveToLocalStorage();
    }

    // Cache wrapper for getItems
    async getCachedItems(entity, page, limit, sorting) {
        const cacheKey = this.generateCacheKey('getItems', entity, {
            page,
            limit,
            sortKey: this.sortingKey(sorting)
        });
        
        // Check cache first
        const cachedData = this.get(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for getItems: ${entity}`);
            return cachedData;
        }
        
        return null; // No cache found
    }

    // Cache wrapper for getItem
    async getCachedItem(entity, id) {
        const cacheKey = this.generateCacheKey('getItem', entity, { id });
        
        // Check cache first
        const cachedData = this.get(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for getItem: ${entity}#${id}`);
            return cachedData;
        }
        
        return null; // No cache found
    }

    // Cache wrapper for searchItems
    async getCachedSearchItems(entity, page, limit, sorting, query, fields, constraints) {
        const cacheKey = this.generateCacheKey('searchItems', entity, {
            page,
            limit,
            sortKey: this.sortingKey(sorting),
            query,
            fields: JSON.stringify(fields),
            constraints: JSON.stringify(constraints)
        });
        
        // Check cache first
        const cachedData = this.get(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for searchItems: ${entity}`);
            return cachedData;
        }
        
        return null; // No cache found
    }

    // Store items result in cache
    cacheItems(entity, page, limit, sorting, data) {
        const cacheKey = this.generateCacheKey('getItems', entity, {
            page,
            limit,
            sortKey: this.sortingKey(sorting)
        });
        
        this.set(cacheKey, data);
    }

    // Store item result in cache
    cacheItem(entity, id, data) {
        const cacheKey = this.generateCacheKey('getItem', entity, { id });
        this.set(cacheKey, data);
    }

    // Store search result in cache
    cacheSearchItems(entity, page, limit, sorting, query, fields, constraints, data) {
        const cacheKey = this.generateCacheKey('searchItems', entity, {
            page,
            limit,
            sortKey: this.sortingKey(sorting),
            query,
            fields: JSON.stringify(fields),
            constraints: JSON.stringify(constraints)
        });
        
        this.set(cacheKey, data);
    }

    // Pull tables status from backend and clear modified tables from cache
    async pullTablesStatus() {
        try {
            const response = await ApiManager.sendAuthenticatedRequest('/utils/pullTablesStatus', {
                lastPullTime: this.lastPullTime || 0
            });

            // Ignora errori di autenticazione - è solo un sync in background
            // Non deve triggerare logout o interrompere l'esperienza utente
            if (!response || response.success !== 1) {
                // Log solo se non è un errore di auth (per evitare spam in console)
                if (response && response.error_code &&
                    response.error_code !== 'not.logged' &&
                    response.error_code !== 'refresh.sid') {
                    console.warn('Cache pull returned non-success (ignored):', response?.error_code);
                }
                return [];
            }

            const { modifiedTables, serverTime } = response;

            // Clear cache for modified tables
            if (modifiedTables && modifiedTables.length > 0) {
                console.log('Modified tables detected:', modifiedTables);
                modifiedTables.forEach(table => {
                    this.clearEntity(table);
                });
            }

            // Update last pull time
            this.lastPullTime = serverTime || Date.now();
            localStorage.setItem(this.LAST_PULL_KEY, this.lastPullTime.toString());

            return modifiedTables || [];
        } catch (error) {
            // Errori di rete o altri errori - ignora silenziosamente
            // Il pull periodico non è critico, riproverà al prossimo intervallo
            console.warn('Cache pull failed (ignored):', error?.message || error);
            return [];
        }
    }

    // Invalidate cache when entity is modified (insert, update, delete)
    async invalidateEntity(entity) {
        this.clearEntity(entity);
        
        // Also trigger a pull to sync with server
        await this.pullTablesStatus();
    }

    // Start periodic pulling
    startPeriodicPull(interval = PULL_INTERVAL) {
        if (!this.isCacheEnabled()) {
            return; // Cache disabled, don't start pulling
        }
        
        this.stopPeriodicPull(); // Clear any existing interval
        
        this.pullInterval = setInterval(() => {
            this.pullTablesStatus();
        }, interval);
        
        // Do an immediate pull
        this.pullTablesStatus();
    }

    // Stop periodic pulling
    stopPeriodicPull() {
        if (this.pullInterval) {
            clearInterval(this.pullInterval);
            this.pullInterval = null;
        }
    }
}

// Create singleton instance
const CacheManager = new CacheManagerClass();

export { CacheManager };