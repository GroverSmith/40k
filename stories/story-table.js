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
                url: `${storyUrl}?action=list`,
                cacheType: 'stories',
                dataKey: 'data',
                loadingMessage: 'Loading stories...'
            },
            'crusade': {
                url: `${storyUrl}?action=list`,
                cacheType: 'stories',
                dataKey: 'data',
                loadingMessage: 'Loading stories...'
            },
            'recent': {
                url: `${storyUrl}?action=list`,
                cacheType: 'stories',
                dataKey: 'data',
                loadingMessage: 'Loading recent stories...'
            },
            'all': {
                url: `${storyUrl}?action=list`,
                cacheType: 'stories',
                dataKey: 'data',
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
        try {
            console.log('StoryTable.loadForForce called with forceKey:', forceKey);
            
            // Get all stories first
            const fetchConfig = this.getFetchConfig('all');
            const displayConfig = this.getDisplayConfig('force');
            
            console.log('Fetching stories with config:', fetchConfig);
            
            // Get the raw data
            const result = await TableBase.fetchWithCache(
                fetchConfig.url,
                fetchConfig.cacheType,
                fetchConfig.cacheKey
            );
            
            console.log('Stories result:', result);
            
            let stories = [];
            if (result && result.success && Array.isArray(result.data)) {
                stories = result.data;
                console.log('Using stories from result.data:', stories.length, 'stories');
            } else if (Array.isArray(result)) {
                stories = result;
                console.log('Using stories from raw array:', stories.length, 'stories');
            }
            
            console.log('All stories:', stories);
            
            // Get story-forces relationships
            const storyForcesUrl = CrusadeConfig.getSheetUrl('xref_story_forces');
            console.log('Story-Forces URL:', storyForcesUrl);
            
            if (!storyForcesUrl) {
                throw new Error('Story-Forces URL not configured');
            }
            
            const storyForcesResult = await TableBase.fetchWithCache(
                storyForcesUrl,
                'story-forces',
                'all'
            );
            
            console.log('Story-Forces result:', storyForcesResult);
            
            let storyForces = [];
            if (storyForcesResult && storyForcesResult.success && Array.isArray(storyForcesResult.data)) {
                storyForces = storyForcesResult.data;
                console.log('Using story-forces from result.data:', storyForces.length, 'relationships');
            } else if (Array.isArray(storyForcesResult)) {
                storyForces = storyForcesResult;
                console.log('Using story-forces from raw array:', storyForces.length, 'relationships');
            }
            
            console.log('All story-forces relationships:', storyForces);
            
            // Find stories linked to this force
            const forceStoryKeys = storyForces
                .filter(relationship => {
                    const relationshipForceKey = relationship.force_key || relationship['force_key'] || relationship['Force Key'] || '';
                    const matches = relationshipForceKey === forceKey;
                    console.log(`Checking relationship: force_key="${relationshipForceKey}", looking for="${forceKey}", matches=${matches}`);
                    return matches;
                })
                .map(relationship => {
                    const storyKey = relationship.story_key || relationship['story_key'] || relationship['Story Key'] || '';
                    console.log(`Mapped relationship to story: ${storyKey}`);
                    return storyKey;
                });
            
            console.log('Force story keys:', forceStoryKeys);
            
            // Filter stories to only show those linked to this force
            const filteredStories = stories.filter(story => {
                const storyKey = story.story_key || story['story_key'] || story['Story Key'] || story.key || story.Key || '';
                const matches = forceStoryKeys.includes(storyKey);
                console.log(`Checking story: story_key="${storyKey}", force story keys=[${forceStoryKeys.join(', ')}], matches=${matches}`);
                return matches;
            });
            
            console.log('Filtered stories:', filteredStories);
            
            // Display the filtered stories
            const container = document.getElementById(containerId);
            if (container) {
                if (filteredStories.length > 0) {
                    console.log('Displaying', filteredStories.length, 'stories');
                    TableBase.displayTable(filteredStories, container, displayConfig);
                } else {
                    console.log('No stories found, showing no data message');
                    UIHelpers.showNoData(container, displayConfig.noDataMessage || 'No stories found for this force.');
                }
            }
            
        } catch (error) {
            console.error('Error loading stories for force:', error);
            const container = document.getElementById(containerId);
            if (container) {
                UIHelpers.showNoData(container, 'Failed to load stories.');
            }
        }
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