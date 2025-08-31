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
     * Display stories in a table format
     */
    displayStoriesTable(stories, container, options = {}) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!stories || stories.length === 0) {
            container.innerHTML = '<p class="no-data">No stories found.</p>';
            return;
        }

        const showType = options.showType !== false;
        const showForce = options.showForce !== false;
        const showDate = options.showDate !== false;
        const showImperialDate = options.showImperialDate !== false;
        const tableId = options.tableId || 'stories-table';

        let html = `
            <div class="table-wrapper">
                <table class="data-table" id="${tableId}">
                    <thead>
                        <tr>
                            ${showType ? '<th>Type</th>' : ''}
                            <th>Title</th>
                            ${showForce ? '<th>Force</th>' : ''}
                            ${showImperialDate ? '<th>Imperial Date</th>' : ''}
                            ${showDate ? '<th>Date Added</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
        `;

        stories.forEach(story => {
            const storyKey = story['Key'] || story.key;
            const title = story['Title'] || 'Untitled Story';
            const storyType = story['Story Type'] || 'Story';
            const forceName = story['Force Name'] || '-';
            const forceKey = story['Force Key'];
            const imperialDate = story['Imperial Date'] || '-';
            const timestamp = story['Timestamp'];

            const storyLink = this.createStoryLink(title, storyKey, options.baseUrl);
            const forceLink = forceKey && window.ForceDisplay ?
                ForceDisplay.createForceLink(forceName, forceKey, options.forceBaseUrl) :
                forceName;
            const dateAdded = timestamp ? UIHelpers.formatDate(timestamp) : '-';

            html += `
                <tr>
                    ${showType ? `<td>${storyType}</td>` : ''}
                    <td>${storyLink}</td>
                    ${showForce ? `<td>${forceLink}</td>` : ''}
                    ${showImperialDate ? `<td>${imperialDate}</td>` : ''}
                    ${showDate ? `<td>${dateAdded}</td>` : ''}
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
     * Display stories for a crusade
     */
    displayCrusadeStories(stories, container) {
        this.displayStoriesTable(stories, container, {
            showType: true,
            showForce: true,
            showImperialDate: true,
            showDate: false,
            tableId: 'crusade-stories-table',
            baseUrl: '../stories/',
            forceBaseUrl: '../forces/'
        });
    },

    /**
     * Display stories for a force
     */
    displayForceStories(stories, container) {
        this.displayStoriesTable(stories, container, {
            showType: true,
            showForce: false,
            showImperialDate: true,
            showDate: true,
            tableId: 'force-stories-table',
            baseUrl: '../stories/'
        });
    }
};

// Make globally available
window.StoryDisplay = StoryDisplay;