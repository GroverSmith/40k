// filename: js/table-base.js
// Base table utility module for common table functionality
// 40k Crusade Campaign Tracker

const TableBase = {


    /**
     * Create a hyperlink for any entity type
     */
    createEntityLink(entityType, name, key, customPath = null) {
        if (!key) return name || `Unknown ${entityType}`;

        const entityPaths = {
            'battle': 'battles',
            'force': 'forces',
            'crusade': 'crusades',
            'story': 'stories'
        };

        const path = customPath || CoreUtils.path.getRelativePath(entityPaths[entityType]);
        const detailsPage = `${entityType}-details.html`;

        return `<a href="${path}${detailsPage}?key=${encodeURIComponent(key)}">${name}</a>`;
    },

    /**
     * Generic fetch with caching
     */
    async fetchWithCache(url, cacheType, cacheKey) {
        if (!url) {
            throw new Error(`${cacheType} not configured`);
        }
        return await CacheManager.fetchWithCache(url, cacheType, cacheKey);
    },

    /**
     * Process raw data into structured format
     * Handles both success/data responses and raw arrays
     */
    processResponseData(data, dataKey = null) {
        if (!data) return [];

        // Handle success/data format
        if (data.success && dataKey && data[dataKey]) {
            return data[dataKey];
        }

        // Handle raw array format with headers
        if (Array.isArray(data) && data.length > 1) {
            const headers = data[0];
            return data.slice(1).map(row => {
                const item = {};
                headers.forEach((header, index) => {
                    item[header] = row[index];
                });
                return item;
            });
        }

        return [];
    },

    /**
     * Generic table display
     */
    displayTable(items, container, config) {
        if (!items?.length) {
            UIHelpers.showNoData(container, config.noDataMessage || 'No data found.');
            return;
        }

        const rows = items.map(item =>
            config.buildRow(item, config.columns, config.context || {})
        ).join('');

        container.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table" ${config.tableId ? `id="${config.tableId}"` : ''}>
                    <thead>
                        <tr>${config.headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;

        if (config.tableId && window.UIHelpers?.makeSortable) {
            UIHelpers.makeSortable(config.tableId);
        }
    },

    /**
     * Generic loader pattern for all table types
     */
    async loadAndDisplay(fetchConfig, displayConfig, container, filterFn = null) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        try {
            UIHelpers.showLoading(container, fetchConfig.loadingMessage || 'Loading...');

            const result = await this.fetchWithCache(
                fetchConfig.url,
                fetchConfig.cacheType,
                fetchConfig.cacheKey
            );

            let items = this.processResponseData(result, fetchConfig.dataKey);

            // Apply filtering if provided
            if (filterFn && typeof filterFn === 'function') {
                items = items.filter(filterFn);
            }

            if (items.length > 0) {
                // Apply sorting if configured
                if (displayConfig.sortBy) {
                    items.sort(displayConfig.sortBy);
                }

                // Apply limit if configured
                const displayItems = displayConfig.limit ?
                    items.slice(0, displayConfig.limit) : items;

                this.displayTable(displayItems, container, displayConfig);
            } else {
                UIHelpers.showNoData(container, displayConfig.noDataMessage);
            }
        } catch (error) {
            console.error(`Error loading data:`, error);
            UIHelpers.showError(container, displayConfig.errorMessage || 'Failed to load data.');
        }
    },

    /**
     * Common date-based sorting function (newest first)
     */
    sortByDateDesc(dateField) {
        return (a, b) => new Date(b[dateField] || 0) - new Date(a[dateField] || 0);
    },

    /**
     * Build column cells helper
     */
    buildCells(columnData, columns) {
        return columns.map(col => `<td>${columnData[col] || '-'}</td>`).join('');
    },

    /**
     * Format common data types
     */
    formatters: {
        date: (value) => UIHelpers.formatDate(value),
        points: (value) => value ? `${value}pts` : '-',
        score: (p1, p2) => `${p1 || 0}-${p2 || 0}`,
        wordCount: (content) => {
            if (!content) return 0;
            return content.trim().split(/\s+/).filter(word => word.length > 0).length;
        }
    },

    /**
     * Common style mappings
     */
    styles: {
        victory: 'color: #069101; font-weight: bold;',
        defeat: 'color: #cc6666; font-weight: bold;',
        draw: 'color: #999999;'
    },

    /**
     * Initialize auto-loading for containers
     */
    initAutoLoad(containerId, loadFunction, delay = 100) {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.getElementById(containerId)) {
                setTimeout(loadFunction, delay);
            }
        });
    }
};

// Make globally available
window.TableBase = TableBase;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableBase;
}