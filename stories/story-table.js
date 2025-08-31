// filename: stories/story-table.js
// Unified story display module with integrated data fetching
// 40k Crusade Campaign Tracker

const StoryDisplay = {
    /**
     * Fetch stories with caching
     */
    async fetchStories(action, key) {
        const storiesUrl = CrusadeConfig.getSheetUrl('stories');
        if (!storiesUrl) {
            throw new Error('Stories not configured');
        }

        let fetchUrl, cacheKey;

        switch(action) {
            case 'force':
                fetchUrl = `${storiesUrl}?action=force-stories&forceKey=${encodeURIComponent(key)}`;
                cacheKey = `force_${key}`;
                break;
            case 'crusade':
                fetchUrl = `${storiesUrl}?action=crusade-stories&crusadeKey=${encodeURIComponent(key)}`;
                cacheKey = `crusade_${key}`;
                break;
            case 'all':
            default:
                fetchUrl = storiesUrl;
                cacheKey = 'all';
        }

        return await CacheManager.fetchWithCache(fetchUrl, 'stories', cacheKey);
    },

    /**
     * Load and display stories for a force
     */
    async loadAndDisplayForForce(forceKey, containerId) {
        const container = typeof containerId === 'string' ?
            document.getElementById(containerId) : containerId;

        if (!container) return;

        try {
            UIHelpers.showLoading(container, 'Loading stories...');

            const response = await this.fetchStories('force', forceKey);

            if (response.success && response.stories && response.stories.length > 0) {
                this.displayForceStories(response.stories, container);
            } else {
                UIHelpers.showNoData(container, 'No stories written for this force yet.');
            }
        } catch (error) {
            console.error('Error loading stories:', error);
            UIHelpers.showError(container, 'Failed to load stories.');
        }
    },

    /**
     * Load and display stories for a crusade
     */
    async loadAndDisplayForCrusade(crusadeKey, containerId) {
        const container = typeof containerId === 'string' ?
            document.getElementById(containerId) : containerId;

        if (!container) return;

        try {
            UIHelpers.showLoading(container, 'Loading stories...');

            const result = await this.fetchStories('crusade', crusadeKey);

            if (result.success && result.stories && result.stories.length > 0) {
                this.displayCrusadeStories(result.stories, container);
            } else {
                UIHelpers.showNoData(container, 'No stories written for this crusade yet.');
            }
        } catch (error) {
            console.error('Error loading stories:', error);
            UIHelpers.showError(container, 'Failed to load stories.');
        }
    },

    /**
     * Load and display all stories (homepage)
     */
    async loadRecentStories() {
        const container = document.getElementById('stories-sheet');
        if (!container) return;

        try {
            UIHelpers.showLoading(container, 'Loading stories...');

            const response = await this.fetchStories('all');

            if (!response || response.length <= 1) {
                UIHelpers.showNoData(container, 'No stories written yet.');
                return;
            }

            const headers = response[0];
            const stories = response.slice(1).map(row => {
                const story = {};
                headers.forEach((header, index) => {
                    story[header] = row[index];
                });
                return story;
            }).sort((a, b) =>
                new Date(b['Timestamp'] || 0) - new Date(a['Timestamp'] || 0)
            );

            this.displayAllStories(stories, container);

        } catch (error) {
            console.error('Error loading stories:', error);
            UIHelpers.showError(container, 'Failed to load stories.');
        }
    },

    // ... rest of the existing display methods remain the same ...
};