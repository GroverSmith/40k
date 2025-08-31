// filename: js/story-display.js
// Unified story display module for all story-related UI
// 40k Crusade Campaign Tracker

const StoryDisplay = {
    /**
     * Create a hyperlinked story title
     */
    createStoryLink(title, storyKey, baseUrl = '') {
        if (!storyKey) return title || 'Untitled Story';

        // Determine the correct path based on current location
        let path = baseUrl;
        if (!path) {
            if (window.location.pathname.includes('/stories/')) {
                path = ''; // Same directory
            } else if (window.location.pathname.includes('/crusades/')) {
                path = '../stories/';
            } else if (window.location.pathname.includes('/forces/')) {
                path = '../stories/';
            } else {
                path = 'stories/'; // From root
            }
        }

        return `<a href="${path}view-story.html?key=${encodeURIComponent(storyKey)}">${title}</a>`;
    },

    /**
     * Display stories in a table format with standard columns:
     * Date Added, Title, Author, Type
     */
    displayStoriesTable(stories, container, options = {}) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!stories || stories.length === 0) {
            container.innerHTML = '<p class="no-data">No stories found.</p>';
            return;
        }

        const tableId = options.tableId || 'stories-table';

        let html = `
            <div class="table-wrapper">
                <table class="data-table" id="${tableId}">
                    <thead>
                        <tr>
                            <th>Date Added</th>
                            <th>Title</th>
                            <th>Author</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        stories.forEach(story => {
            const storyKey = story['Key'] || story.key;
            const title = story['Title'] || 'Untitled Story';
            const storyType = story['Story Type'] || 'Story';
            const timestamp = story['Timestamp'] || story.timestamp;
            const dateAdded = timestamp ? UIHelpers.formatDate(timestamp) : '-';

            // Get author from User Key or Force Name or fallback
            const author = story['User Name'] || story['Force Name'] || story['User Key'] || 'Unknown';

            const storyLink = this.createStoryLink(title, storyKey, options.baseUrl);

            html += `
                <tr>
                    <td>${dateAdded}</td>
                    <td>${storyLink}</td>
                    <td>${author}</td>
                    <td>${storyType}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        // Make table sortable
        if (window.UIHelpers && UIHelpers.makeSortable) {
            UIHelpers.makeSortable(tableId);
        }
    },

    /**
     * Display all stories (homepage)
     */
    displayAllStories(stories, container) {
        this.displayStoriesTable(stories, container, {
            tableId: 'all-stories-table',
            baseUrl: 'stories/'
        });
    },

    /**
     * Display stories for a crusade
     */
    displayCrusadeStories(stories, container) {
        this.displayStoriesTable(stories, container, {
            tableId: 'crusade-stories-table',
            baseUrl: '../stories/'
        });
    },

    /**
     * Display stories for a force
     */
    displayForceStories(stories, container) {
        this.displayStoriesTable(stories, container, {
            tableId: 'force-stories-table',
            baseUrl: '../stories/'
        });
    },

    /**
     * Load and display recent stories for homepage
     */
    async loadRecentStories() {
        const container = document.getElementById('stories-sheet');
        if (!container) return;

        try {
            UIHelpers.showLoading(container, 'Loading stories...');

            const storiesUrl = CrusadeConfig.getSheetUrl('stories');
            if (!storiesUrl) {
                UIHelpers.showNoData(container, 'Stories not configured.');
                return;
            }

            // Fetch all stories
            const response = await CacheManager.fetchWithCache(storiesUrl, 'stories');

            if (!response || response.length <= 1) {
                UIHelpers.showNoData(container, 'No stories written yet.');
                return;
            }

            // Convert array data to objects
            const headers = response[0];
            const stories = response.slice(1).map(row => {
                const story = {};
                headers.forEach((header, index) => {
                    story[header] = row[index];
                });
                return story;
            });

            // Sort by timestamp (most recent first)
            stories.sort((a, b) => {
                const dateA = new Date(a['Timestamp'] || 0);
                const dateB = new Date(b['Timestamp'] || 0);
                return dateB - dateA;
            });

            // Display all stories (or limit if you want)
            this.displayAllStories(stories, container);

        } catch (error) {
            console.error('Error loading stories:', error);
            UIHelpers.showError(container, 'Failed to load stories.');
        }
    }
};

// Initialize on homepage
document.addEventListener('DOMContentLoaded', () => {
    // Only load on homepage
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        setTimeout(() => {
            if (window.StoryDisplay) {
                StoryDisplay.loadRecentStories();
            }
        }, 100);
    }
});

// Make globally available
window.StoryDisplay = StoryDisplay;