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
     * Create a hyperlinked story title
     */
    createStoryLink(storyTitle, storyKey) {
        if (!storyKey) return storyTitle || 'Untitled Story';
        const path = this.getRelativePath('stories');
        return `<a href="${path}story-details.html?key=${encodeURIComponent(storyKey)}">${storyTitle}</a>`;
    },

    /**
     * Create a hyperlinked force name
     */
    createForceLink(forceName, forceKey) {
        if (!forceKey) return forceName || 'Unknown Force';
        const path = this.getRelativePath('forces');
        return `<a href="${path}force-details.html?key=${encodeURIComponent(forceKey)}">${forceName}</a>`;
    },

    /**
     * Create a hyperlinked crusade name
     */
    createCrusadeLink(crusadeName, crusadeKey) {
        if (!crusadeKey) return crusadeName || 'Unknown Crusade';
        const path = this.getRelativePath('crusades');
        return `<a href="${path}crusade-details.html?key=${encodeURIComponent(crusadeKey)}">${crusadeName}</a>`;
    },

    /**
     * Fetch stories with caching
     */
    async fetchStories(action, key) {
        const storyUrl = CrusadeConfig.getSheetUrl('stories');
        if (!storyUrl) {
            throw new Error('Stories sheet not configured');
        }

        const fetchConfigs = {
            'force': {
                url: `${storyUrl}?action=force-stories&forceKey=${encodeURIComponent(key)}`,
                cacheKey: `force_${key}`
            },
            'crusade': {
                url: `${storyUrl}?action=crusade-stories&crusadeKey=${encodeURIComponent(key)}`,
                cacheKey: `crusade_${key}`
            },
            'recent': {
                url: `${storyUrl}?action=recent`,
                cacheKey: 'recent'
            },
            'all': {
                url: storyUrl,
                cacheKey: 'all'
            }
        };

        const config = fetchConfigs[action] || fetchConfigs['all'];
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

            if (result.success && result.stories && result.stories.length > 0) {
                const sortedStories = result.stories.sort((a, b) =>
                    new Date(b['Date Created'] || b.Timestamp || 0) -
                    new Date(a['Date Created'] || a.Timestamp || 0)
                );

                // Call appropriate display method
                switch(type) {
                    case 'force':
                        this.displayStoriesForForce(sortedStories, container, key);
                        break;
                    case 'crusade':
                        this.displayStoriesForCrusade(sortedStories, container);
                        break;
                    case 'recent':
                        this.displayRecentStories(sortedStories.slice(0, 10), container);
                        break;
                    default:
                        this.displayAllStories(sortedStories, container);
                }
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

    /**
     * Load stories for a force
     */
    async loadForForce(forceKey, containerId) {
        return this.loadStories('force', forceKey, containerId);
    },

    /**
     * Load stories for a crusade
     */
    async loadForCrusade(crusadeKey, containerId) {
        return this.loadStories('crusade', crusadeKey, containerId);
    },

    /**
     * Load recent stories (homepage)
     */
    async loadRecentStories() {
        const container = document.getElementById('recent-stories-container');
        if (container) {
            return this.loadStories('recent', null, container);
        }
    },

    /**
     * Display stories for a specific force
     */
    displayStoriesForForce(stories, container, forceKey) {
        if (!stories || stories.length === 0) {
            UIHelpers.showNoData(container, 'No stories written yet.');
            return;
        }

        const rows = stories.map(story => {
            const date = UIHelpers.formatDate(story['Date Created'] || story.Timestamp);
            const title = story.Title || 'Untitled Story';
            const author = story.Author || story['User Name'] || 'Unknown';
            const crusadeName = story['Crusade Name'] || '';
            const crusadeKey = story['Crusade Key'] || '';
            const wordCount = story['Word Count'] || this.calculateWordCount(story.Content || '');

            return `
                <tr>
                    <td>${date}</td>
                    <td>${this.createStoryLink(title, story.Key)}</td>
                    <td>${author}</td>
                    <td>${crusadeName ? this.createCrusadeLink(crusadeName, crusadeKey) : '-'}</td>
                    <td>${wordCount} words</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = this.wrapInTable(
            ['Date', 'Title', 'Author', 'Crusade', 'Length'],
            rows,
            'force-stories-table'
        );

        this.makeSortable('force-stories-table');
    },

    /**
     * Display stories for a crusade
     */
    displayStoriesForCrusade(stories, container) {
        if (!stories || stories.length === 0) {
            UIHelpers.showNoData(container, 'No stories written yet for this crusade.');
            return;
        }

        const rows = stories.map(story => {
            const date = UIHelpers.formatDate(story['Date Created'] || story.Timestamp);
            const title = story.Title || 'Untitled Story';
            const author = story.Author || story['User Name'] || 'Unknown';
            const forceName = story['Force Name'] || '';
            const forceKey = story['Force Key'] || '';
            const wordCount = story['Word Count'] || this.calculateWordCount(story.Content || '');

            return `
                <tr>
                    <td>${date}</td>
                    <td>${this.createStoryLink(title, story.Key)}</td>
                    <td>${author}</td>
                    <td>${forceName ? this.createForceLink(forceName, forceKey) : '-'}</td>
                    <td>${wordCount} words</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = this.wrapInTable(
            ['Date', 'Title', 'Author', 'Force', 'Length'],
            rows,
            'crusade-stories-table'
        );

        this.makeSortable('crusade-stories-table');
    },

    /**
     * Display recent stories (homepage)
     */
    displayRecentStories(stories, container) {
        if (!stories || stories.length === 0) {
            UIHelpers.showNoData(container, 'No stories written yet.');
            return;
        }

        const rows = stories.map(story => {
            const date = UIHelpers.formatDate(story['Date Created'] || story.Timestamp);
            const title = story.Title || 'Untitled Story';
            const author = story.Author || story['User Name'] || 'Unknown';
            const forceName = story['Force Name'] || '';
            const forceKey = story['Force Key'] || '';

            return `
                <tr>
                    <td>${date}</td>
                    <td>${this.createStoryLink(title, story.Key)}</td>
                    <td>${author}</td>
                    <td>${forceName ? this.createForceLink(forceName, forceKey) : '-'}</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = this.wrapInTable(
            ['Date', 'Title', 'Author', 'Force'],
            rows,
            'recent-stories-table'
        );
    },

    /**
     * Display all stories
     */
    displayAllStories(stories, container) {
        if (!stories || stories.length === 0) {
            UIHelpers.showNoData(container, 'No stories available.');
            return;
        }

        const rows = stories.map(story => {
            const date = UIHelpers.formatDate(story['Date Created'] || story.Timestamp);
            const title = story.Title || 'Untitled Story';
            const author = story.Author || story['User Name'] || 'Unknown';
            const forceName = story['Force Name'] || '';
            const forceKey = story['Force Key'] || '';
            const crusadeName = story['Crusade Name'] || '';
            const crusadeKey = story['Crusade Key'] || '';

            return `
                <tr>
                    <td>${date}</td>
                    <td>${this.createStoryLink(title, story.Key)}</td>
                    <td>${author}</td>
                    <td>${forceName ? this.createForceLink(forceName, forceKey) : '-'}</td>
                    <td>${crusadeName ? this.createCrusadeLink(crusadeName, crusadeKey) : '-'}</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = this.wrapInTable(
            ['Date', 'Title', 'Author', 'Force', 'Crusade'],
            rows,
            'all-stories-table'
        );

        this.makeSortable('all-stories-table');
    },

    /**
     * Calculate word count for a story
     */
    calculateWordCount(content) {
        if (!content) return 0;
        return content.trim().split(/\s+/).filter(word => word.length > 0).length;
    },

    /**
     * Wrap rows in table HTML
     */
    wrapInTable(headers, rowsHtml, tableId = '') {
        return `
            <div class="table-wrapper">
                <table class="data-table" ${tableId ? `id="${tableId}"` : ''}>
                    <thead>
                        <tr>
                            ${headers.map(h => `<th>${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Make table sortable if UIHelpers available
     */
    makeSortable(tableId) {
        if (window.UIHelpers && UIHelpers.makeSortable) {
            UIHelpers.makeSortable(tableId);
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