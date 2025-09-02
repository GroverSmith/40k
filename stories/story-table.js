// filename: stories/story-table.js
// Story display module using TableBase utility
// 40k Crusade Campaign Tracker

const StoryTable = {
    // Use base utility for common methods
    getRelativePath: (dir) => TableBase.getRelativePath(dir),

    // Simplified link creators using base
    createStoryLink(title, key) {
        return TableBase.createEntityLink('story', title || 'Untitled Story', key);
    },
    createForceLink(name, key) {
        return TableBase.createEntityLink('force', name || 'Unknown Force', key);
    },
    createCrusadeLink(name, key) {
        return TableBase.createEntityLink('crusade', name || 'Unknown Crusade', key);
    },

    /**
     * Build story row
     */
    buildStoryRow(story, columns) {
        const wordCount = story['Word Count'] || TableBase.formatters.wordCount(story.Content || '');

        const columnData = {
            date: TableBase.formatters.date(story['Date Created'] || story.Timestamp),
            title: this.createStoryLink(story.Title, story.Key),
            author: story.Author || story['User Name'] || 'Unknown',
            type: story['Story Type'] || story.Type || '',
            length: `${wordCount} words`,
            force: story['Force Name'] ? this.createForceLink(story['Force Name'], story['Force Key']) : '-',
            crusade: story['Crusade Name'] ? this.createCrusadeLink(story['Crusade Name'], story['Crusade Key']) : '-'
        };

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },

    /**
     * Fetch stories configuration
     */
    getFetchConfig(type, key) {
        const storyUrl = CrusadeConfig.getSheetUrl('stories');
        const configs = {
            'force': {
                url: `${storyUrl}?action=force-stories&forceKey=${encodeURIComponent(key)}`,
                cacheType: 'stories',
                cacheKey: `force_${key}`,
                dataKey: 'stories',
                loadingMessage: 'Loading stories...'
            },
            'crusade': {
                url: `${storyUrl}?action=crusade-stories&crusadeKey=${encodeURIComponent(key)}`,
                cacheType: 'stories',
                cacheKey: `crusade_${key}`,
                dataKey: 'stories',
                loadingMessage: 'Loading stories...'
            },
            'recent': {
                url: `${storyUrl}?action=recent`,
                cacheType: 'stories',
                cacheKey: 'recent',
                dataKey: 'stories',
                loadingMessage: 'Loading recent stories...'
            },
            'all': {
                url: storyUrl,
                cacheType: 'stories',
                cacheKey: 'all',
                dataKey: 'stories',
                loadingMessage: 'Loading all stories...'
            }
        };
        return configs[type] || configs['all'];
    },

    /**
     * Get display configuration
     */
    getDisplayConfig(type) {
        // Default configuration (same for all types currently)
        const defaultConfig = {
            columns: ['date', 'title', 'author', 'type', 'length'],
            headers: ['Date', 'Title', 'Author', 'Type', 'Length'],
            buildRow: this.buildStoryRow.bind(this),
            sortBy: TableBase.sortByDateDesc('Date Created'),
            errorMessage: 'Failed to load stories.'
        };

        const configs = {
            'force': {
                ...defaultConfig,
                tableId: 'force-stories-table',
                noDataMessage: 'No stories written yet for this force.'
            },
            'crusade': {
                ...defaultConfig,
                tableId: 'crusade-stories-table',
                noDataMessage: 'No stories written yet for this crusade.'
            },
            'recent': {
                ...defaultConfig,
                tableId: 'recent-stories-table',
                limit: 10,
                noDataMessage: 'No stories written yet.'
            },
            'all': {
                ...defaultConfig,
                tableId: 'all-stories-table',
                noDataMessage: 'No stories available.'
            }
        };
        return configs[type] || configs['all'];
    },

    /**
     * Generic loader using base utility
     */
    async loadStories(type, key, containerId) {
        const fetchConfig = this.getFetchConfig(type, key);
        const displayConfig = this.getDisplayConfig(type, key);
        await TableBase.loadAndDisplay(fetchConfig, displayConfig, containerId);
    },

    // Convenience methods
    async loadForForce(forceKey, containerId) {
        return this.loadStories('force', forceKey, containerId);
    },

    async loadForCrusade(crusadeKey, containerId) {
        return this.loadStories('crusade', crusadeKey, containerId);
    },

    async loadRecentStories() {
        const container = document.getElementById('recent-stories-container');
        if (container) return this.loadStories('recent', null, container);
    },

    /**
     * Fetch stories (for external use)
     */
    async fetchStories(action, key) {
        const config = this.getFetchConfig(action, key);
        return await TableBase.fetchWithCache(config.url, config.cacheType, config.cacheKey);
    }
};

// Initialize auto-loading
TableBase.initAutoLoad('recent-stories-container', () => StoryTable.loadRecentStories());

// Make globally available
window.StoryTable = StoryTable;