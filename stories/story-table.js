// filename: stories/story-table.js
// Story display module using TableBase utility
// 40k Crusade Campaign Tracker

const StoryTable = {

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
     * Extract username from user key
     */
    extractUserName(userKey) {
        if (!userKey) return 'Unknown';
        // User keys are typically just the username with no spaces/special chars
        // Try to add spaces before capital letters for readability
        return userKey.replace(/([A-Z])/g, ' $1').trim();
    },

    /**
     * Calculate word count from story text fields
     */
    calculateWordCount(story) {
        let totalText = '';
        if (story['story_text_1'] || story['Story Text 1']) totalText += (story['story_text_1'] || story['Story Text 1']) + ' ';
        if (story['story_text_2'] || story['Story Text 2']) totalText += (story['story_text_2'] || story['Story Text 2']) + ' ';
        if (story['story_text_3'] || story['Story Text 3']) totalText += (story['story_text_3'] || story['Story Text 3']);

        if (!totalText.trim()) return 0;

        return totalText.trim().split(/\s+/).filter(word => word.length > 0).length;
    },

    /**
     * Build story row
     */
    buildStoryRow(story, columns) {
        // Extract author name from User Key
        const authorName = this.extractUserName(story['user_key'] || story['User Key']);

        // Calculate word count from the three story text fields
        const wordCount = this.calculateWordCount(story);

        const columnData = {
            date: TableBase.formatters.date(story['timestamp'] || story['Timestamp']),
            title: this.createStoryLink(story['title'] || story['Title'], story['story_key'] || story['Key']),
            author: authorName,
            type: story['story_type'] || story['Story Type'] || '',
            length: wordCount > 0 ? `${wordCount} words` : '-',
            force: (story['force_key'] || story['Force Key']) ? this.createForceLink('Force', story['force_key'] || story['Force Key']) : '-',
            crusade: (story['crusade_key'] || story['Crusade Key']) ? this.createCrusadeLink('Crusade', story['crusade_key'] || story['Crusade Key']) : '-'
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
                dataKey: null, // For raw array data
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
            sortBy: TableBase.sortByDateDesc('timestamp'),
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