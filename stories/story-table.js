// filename: stories/story-table.js
// Unified story display module with integrated data fetching
// 40k Crusade Campaign Tracker

const StoryTable = {
    /**
     * Resolve relative path based on current location
     */
    getRelativePath(targetDir) {
        const currentPath = window.location.pathname;
        const pathMap = {
            'stories': { stories: '', forces: '../forces/', crusades: '../crusades/' },
            'forces': { stories: '../stories/', forces: '', crusades: '../crusades/' },
            'crusades': { stories: '../stories/', forces: '../forces/', crusades: '' },
            'default': { stories: 'stories/', forces: 'forces/', crusades: 'crusades/' }
        };

        let currentDir = 'default';
        if (currentPath.includes('/stories/')) currentDir = 'stories';
        else if (currentPath.includes('/forces/')) currentDir = 'forces';
        else if (currentPath.includes('/crusades/')) currentDir = 'crusades';

        return pathMap[currentDir][targetDir];
    },

    /**
     * Create hyperlinks for various entities
     */
    createLink(type, name, key) {
        if (!key) return name || `Unknown ${type}`;
        const paths = { story: 'stories', force: 'forces', crusade: 'crusades' };
        const path = this.getRelativePath(paths[type]);
        const singular = type === 'story' ? 'story' : type;
        return `<a href="${path}${singular}-details.html?key=${encodeURIComponent(key)}">${name}</a>`;
    },

    createStoryLink(title, key) { return this.createLink('story', title || 'Untitled Story', key); },
    createForceLink(name, key) { return this.createLink('force', name || 'Unknown Force', key); },
    createCrusadeLink(name, key) { return this.createLink('crusade', name || 'Unknown Crusade', key); },

    /**
     * Calculate word count for a story
     */
    calculateWordCount(content) {
        if (!content) return 0;
        return content.trim().split(/\s+/).filter(word => word.length > 0).length;
    },

    /**
     * Build a story row with specified columns
     */
    buildStoryRow(story, columns) {
        const date = UIHelpers.formatDate(story['Date Created'] || story.Timestamp);
        const wordCount = story['Word Count'] || this.calculateWordCount(story.Content || '');

        // Build column data map
        const columnData = {
            date,
            title: this.createStoryLink(story.Title, story.Key),
            author: story.Author || story['User Name'] || 'Unknown',
            type: story['Story Type'] || story.Type || '',
            length: `${wordCount} words`,
            force: story['Force Name'] ? this.createForceLink(story['Force Name'], story['Force Key']) : '-',
            crusade: story['Crusade Name'] ? this.createCrusadeLink(story['Crusade Name'], story['Crusade Key']) : '-'
        };

        const cells = columns.map(col => `<td>${columnData[col] || '-'}</td>`).join('');
        return `<tr>${cells}</tr>`;
    },

    /**
     * Fetch stories with caching
     */
    async fetchStories(action, key) {
        const storyUrl = CrusadeConfig.getSheetUrl('stories');
        if (!storyUrl) throw new Error('Stories sheet not configured');

        const configs = {
            'force': { url: `${storyUrl}?action=force-stories&forceKey=${encodeURIComponent(key)}`, cacheKey: `force_${key}` },
            'crusade': { url: `${storyUrl}?action=crusade-stories&crusadeKey=${encodeURIComponent(key)}`, cacheKey: `crusade_${key}` },
            'recent': { url: `${storyUrl}?action=recent`, cacheKey: 'recent' },
            'all': { url: storyUrl, cacheKey: 'all' }
        };

        const config = configs[action] || configs['all'];
        return await CacheManager.fetchWithCache(config.url, 'stories', config.cacheKey);
    },

    /**
     * Generic loader for stories
     */
    async loadStories(type, key, containerId) {
        const container = typeof containerId === 'string' ?
            document.getElementById(containerId) : containerId;
        if (!container) return;

        try {
            UIHelpers.showLoading(container, 'Loading stories...');
            const result = await this.fetchStories(type, key);

            if (result.success && result.stories?.length > 0) {
                const stories = result.stories.sort((a, b) =>
                    new Date(b['Date Created'] || b.Timestamp || 0) -
                    new Date(a['Date Created'] || a.Timestamp || 0)
                );

                // Display configuration for each type
                const configs = {
                    'force': {
                        columns: ['date', 'title', 'author', 'type', 'length'],
                        headers: ['Date', 'Title', 'Author', 'Type', 'Length'],
                        tableId: 'force-stories-table'
                    },
                    'crusade': {
                        columns: ['date', 'title', 'author', 'type', 'length'],
                        headers: ['Date', 'Title', 'Author', 'Type', 'Length'],
                        tableId: 'crusade-stories-table'
                    },
                    'recent': {
                        columns: ['date', 'title', 'author', 'type', 'length'],
                        headers: ['Date', 'Title', 'Author', 'Type', 'Length'],
                        tableId: 'recent-stories-table',
                        limit: 10
                    },
                    'all': {
                        columns: ['date', 'title', 'author', 'type', 'length'],
                        headers: ['Date', 'Title', 'Author', 'Type', 'Length'],
                        tableId: 'all-stories-table'
                    }
                };

                const config = configs[type] || configs['all'];
                const displayStories = config.limit ? stories.slice(0, config.limit) : stories;

                this.displayStories(displayStories, container, config);
            } else {
                const messages = {
                    'force': 'No stories written yet for this force.',
                    'crusade': 'No stories written yet for this crusade.',
                    'recent': 'No stories written yet.',
                    'all': 'No stories available.'
                };
                UIHelpers.showNoData(container, messages[type] || 'No stories found.');
            }
        } catch (error) {
            console.error(`Error loading ${type} stories:`, error);
            UIHelpers.showError(container, 'Failed to load stories.');
        }
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
     * Display stories in a table
     */
    displayStories(stories, container, config) {
        if (!stories?.length) {
            UIHelpers.showNoData(container, 'No stories written yet.');
            return;
        }

        const rows = stories.map(story =>
            this.buildStoryRow(story, config.columns)
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
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('recent-stories-container')) {
        setTimeout(() => StoryTable.loadRecentStories(), 100);
    }
});

// Make globally available
window.StoryTable = StoryTable;