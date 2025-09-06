// filename: stories/story-table.js
// Story display module using TableBase utility
// 40k Crusade Campaign Tracker

const StoryTable = {    
    
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

    buildStoryRow(story, columns) {
        // Calculate word count from the three story text fields
        const wordCount = this.calculateWordCount(story);

        const columnData = {
            date: TableBase.formatters.date(story['timestamp'] || story['Timestamp']),
            title: this.createStoryLink(story['title'] || story['Title'], story['story_key'] || story['Key']),
            author: story['author_name'] || story['Author Name'] || 'Unknown',
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
        const baseConfig = {
            url: `${storyUrl}?action=list`,
            cacheType: 'stories',
            dataKey: 'data'
        };
        
        const loadingMessages = {
            'force': 'Loading stories...',
            'crusade': 'Loading stories...',
            'recent': 'Loading recent stories...',
            'all': 'Loading all stories...'
        };
        
        return {
            ...baseConfig,
            loadingMessage: loadingMessages[type] || loadingMessages['all']
        };
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
        const fetchConfig = this.getFetchConfig('all');
        const displayConfig = this.getDisplayConfig('force');
        
        // Pre-load story-force relationships for filtering
        const storyForces = await CacheManager.fetchSheetData('xref_story_forces');
        const storyForcesData = this.extractDataArray(storyForces);
        const forceStoryKeys = storyForcesData
            .filter(rel => this.getFieldValue(rel, 'force_key') === forceKey)
            .map(rel => this.getFieldValue(rel, 'story_key'))
            .filter(key => key);
        
        // Filter stories to only show those linked to this force
        const filterFn = (story) => {
            const storyKey = this.getFieldValue(story, 'story_key') || this.getFieldValue(story, 'key');
            return forceStoryKeys.includes(storyKey);
        };
        
        await TableBase.loadAndDisplay(fetchConfig, displayConfig, containerId, filterFn);
    },

    async loadForCrusade(crusadeKey, containerId) {
        return this.loadStories('crusade', crusadeKey, containerId);
    },


    /**
     * Fetch stories (for external use)
     */
    async fetchStories(action, key) {
        const config = this.getFetchConfig(action, key);
        return await TableBase.fetchWithCache(config.url, config.cacheType, config.cacheKey);
    },

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


    
    calculateWordCount(story) {
        let totalText = '';
        if (story['story_text_1'] || story['Story Text 1']) totalText += (story['story_text_1'] || story['Story Text 1']) + ' ';
        if (story['story_text_2'] || story['Story Text 2']) totalText += (story['story_text_2'] || story['Story Text 2']) + ' ';
        if (story['story_text_3'] || story['Story Text 3']) totalText += (story['story_text_3'] || story['Story Text 3']);

        if (!totalText.trim()) return 0;

        return totalText.trim().split(/\s+/).filter(word => word.length > 0).length;
    },

    /**
     * Extract data array from API response (handles both formats)
     */
    extractDataArray(response) {
        if (response && response.success && Array.isArray(response.data)) {
            return response.data;
        } else if (Array.isArray(response)) {
            return response;
        }
        return [];
    },

    /**
     * Get field value from object with multiple possible field names
     */
    getFieldValue(obj, fieldName) {
        const variations = [
            fieldName,
            fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
        ];
        
        for (const variation of variations) {
            if (obj[variation] !== undefined && obj[variation] !== null && obj[variation] !== '') {
                return obj[variation];
            }
        }
        return '';
    }

};
// Make globally available
window.StoryTable = StoryTable;