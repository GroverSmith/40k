// filename: js/table-base.js
// Base table utility module for common table functionality
// 40k Crusade Campaign Tracker

const TableBase = {

    // Responsive breakpoints
    breakpoints: {
        mobile: 480,
        tablet: 768,
        desktop: 1024
    },

    // Current screen state
    currentScreenState: {
        width: window.innerWidth,
        height: window.innerHeight,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        size: 'desktop'
    },

    /**
     * Initialize responsive table functionality
     */
    initResponsive() {
        this.updateScreenState();
        this.setupResizeListener();
        this.setupOrientationListener();
    },

    /**
     * Update current screen state
     */
    updateScreenState() {
        this.currentScreenState = {
            width: window.innerWidth,
            height: window.innerHeight,
            orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
            size: this.getScreenSize()
        };
    },

    /**
     * Get current screen size category
     */
    getScreenSize() {
        const width = window.innerWidth;
        if (width <= this.breakpoints.mobile) return 'mobile';
        if (width <= this.breakpoints.tablet) return 'tablet';
        return 'desktop';
    },

    /**
     * Setup window resize listener
     */
    setupResizeListener() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const oldState = { ...this.currentScreenState };
                this.updateScreenState();
                
                // Only trigger responsive update if size category changed
                if (oldState.size !== this.currentScreenState.size) {
                    this.triggerResponsiveUpdate();
                }
            }, 250);
        });
    },

    /**
     * Setup orientation change listener for mobile devices
     */
    setupOrientationListener() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                const oldState = { ...this.currentScreenState };
                this.updateScreenState();
                
                // Trigger update on orientation change for mobile
                if (this.currentScreenState.size === 'mobile') {
                    this.triggerResponsiveUpdate();
                }
            }, 100);
        });
    },

    /**
     * Trigger responsive update for all tables
     */
    triggerResponsiveUpdate() {
        // Dispatch custom event for tables to listen to
        window.dispatchEvent(new CustomEvent('tableResponsiveUpdate', {
            detail: { screenState: this.currentScreenState }
        }));
    },

    /**
     * Get responsive column configuration
     */
    getResponsiveColumns(config, screenState = null) {
        const state = screenState || this.currentScreenState;
        
        // If config has responsive columns defined
        if (config.responsiveColumns) {
            const responsiveConfig = config.responsiveColumns[state.size];
            if (responsiveConfig) {
                return {
                    columns: responsiveConfig.columns || config.columns,
                    headers: responsiveConfig.headers || config.headers
                };
            }
        }

        // Default responsive behavior - hide less important columns on smaller screens
        return this.getDefaultResponsiveColumns(config, state);
    },

    /**
     * Get default responsive column configuration
     */
    getDefaultResponsiveColumns(config, screenState) {
        const { columns, headers } = config;
        
        if (screenState.size === 'mobile') {
            // On mobile, show only the most important columns
            const mobileColumns = columns.slice(0, 3); // First 3 columns
            const mobileHeaders = headers.slice(0, 3);
            return { columns: mobileColumns, headers: mobileHeaders };
        } else if (screenState.size === 'tablet') {
            // On tablet, show more columns but not all
            const tabletColumns = columns.slice(0, 5); // First 5 columns
            const tabletHeaders = headers.slice(0, 5);
            return { columns: tabletColumns, headers: tabletHeaders };
        }

        // Desktop shows all columns
        return { columns, headers };
    },

    /**
     * Create a hyperlink for any entity type
     */
    createEntityLink(entityType, name, key, customPath = null) {
        if (!key) return name || `Unknown ${entityType}`;

        const entityPaths = {
            'battle': 'battles',
            'force': 'forces',
            'crusade': 'crusades',
            'story': 'stories',
            'army': 'armies'
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

        // Handle new cached object format: {data: [objects...]}
        if (data.data && Array.isArray(data.data)) {
            return data.data;
        }

        // Handle success/data format (legacy)
        if (data.success && dataKey && data[dataKey]) {
            return data[dataKey];
        }

        // Handle raw array format with headers (legacy)
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

        // Handle direct array of objects
        if (Array.isArray(data)) {
            return data;
        }

        // Handle single object
        if (typeof data === 'object') {
            return [data];
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

        // Get responsive column configuration
        const responsiveConfig = this.getResponsiveColumns(config);
        const { columns, headers } = responsiveConfig;

        const rows = items.map(item =>
            config.buildRow(item, columns, config.context || {})
        ).join('');

        // Build table wrapper classes
        const wrapperClasses = ['table-wrapper'];
        if (config.noScroll) {
            wrapperClasses.push('no-scroll');
        }

        // Build table wrapper style for custom max-height
        const wrapperStyle = config.maxHeight ? `style="max-height: ${config.maxHeight}px;"` : '';

        container.innerHTML = `
            <div class="${wrapperClasses.join(' ')}" ${wrapperStyle}>
                <table class="data-table" ${config.tableId ? `id="${config.tableId}"` : ''}>
                    <thead>
                        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;

        if (config.tableId && window.UIHelpers?.makeSortable) {
            UIHelpers.makeSortable(config.tableId);
        }

        // Store original config for responsive updates
        if (config.tableId) {
            this.storeTableConfig(config.tableId, { items, config, container });
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

            console.log('TableBase.loadAndDisplay - Raw result:', result);
            let items = this.processResponseData(result, fetchConfig.dataKey);
            console.log('TableBase.loadAndDisplay - Processed items:', items);

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
     * Build header cells helper
     */
    buildHeaderCells(columns) {
        return columns.map(col => `<th>${col}</th>`).join('');
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
    },

    /**
     * Helper to create table config with height settings
     */
    createTableConfig(baseConfig, heightOptions = {}) {
        return {
            ...baseConfig,
            maxHeight: heightOptions.maxHeight || 500,
            noScroll: heightOptions.noScroll || false
        };
    },

    /**
     * Store table configuration for responsive updates
     */
    storeTableConfig(tableId, tableData) {
        if (!this.tableConfigs) {
            this.tableConfigs = new Map();
        }
        this.tableConfigs.set(tableId, tableData);
    },

    /**
     * Update table responsively
     */
    updateTableResponsive(tableId) {
        const tableData = this.tableConfigs?.get(tableId);
        if (tableData) {
            const { items, config, container } = tableData;
            this.displayTable(items, container, config);
        }
    },

    /**
     * Update all tables responsively
     */
    updateAllTablesResponsive() {
        if (this.tableConfigs) {
            this.tableConfigs.forEach((tableData, tableId) => {
                this.updateTableResponsive(tableId);
            });
        }
    }
};

// Make globally available
window.TableBase = TableBase;

// Initialize responsive functionality when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    TableBase.initResponsive();
    
    // Listen for responsive update events
    window.addEventListener('tableResponsiveUpdate', () => {
        TableBase.updateAllTablesResponsive();
    });
});
