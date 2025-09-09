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
            errorMessage: 'Failed to load stories.',
            responsiveColumns: {
                mobile: {
                    columns: ['title', 'author', 'type'],
                    headers: ['Title', 'Author', 'Type']
                },
                tablet: {
                    columns: ['title', 'author', 'type'],
                    headers: ['Title', 'Author', 'Type']
                }
                // desktop uses default columns
            }
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
            date: TableBase.formatters.date(story.timestamp),
            title: this.createStoryLink(story.title, story.story_key),
            author: story.author_name || 'Unknown',
            type: story.story_type || '',
            length: wordCount > 0 ? `${wordCount} words` : '-',
            force: story.force_key ? this.createForceLink('Force', story.force_key) : '-',
            crusade: story.crusade_key ? this.createCrusadeLink('Crusade', story.crusade_key) : '-'
        };

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },


    
    /**
     * Generic loader using base utility
     */
    async loadStories(type, key, containerId) {
        const displayConfig = this.getDisplayConfig(type, key);
        await TableBase.loadAndDisplay('stories', displayConfig, containerId);
    },

    // Convenience methods
    async loadForForce(forceKey, containerId) {
        const displayConfig = this.getDisplayConfig('force');
        
        // Use complex filter for force stories (needs to join with story-forces relationships)
        const complexFilterFn = async () => {
            const stories = await UnifiedCache.getAllRows('stories');
            const storyForcesData = await UnifiedCache.getAllRows('xref_story_forces');
            const forceStoryKeys = storyForcesData
                .filter(rel => rel.force_key === forceKey)
                .map(rel => rel.story_key)
                .filter(key => key);
            
            return stories.filter(story => forceStoryKeys.includes(story.story_key));
        };
        
        await TableBase.loadAndDisplayWithComplexFilter('stories', displayConfig, containerId, complexFilterFn);
    },

    async loadForCrusade(crusadeKey, containerId) {
        return this.loadStories('crusade', crusadeKey, containerId);
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
        if (story.story_text_1) totalText += story.story_text_1 + ' ';
        if (story.story_text_2) totalText += story.story_text_2 + ' ';
        if (story.story_text_3) totalText += story.story_text_3;

        if (!totalText.trim()) return 0;

        return totalText.trim().split(/\s+/).filter(word => word.length > 0).length;
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