// filename: stories/story-details.js
// Story details display for individual story pages
// 40k Crusade Campaign Tracker

class StoryDetails {
    constructor() {
        this.storyKey = null;
        this.storyData = null;
        this.init();
    }

    async init() {
        // Get story key from URL using utility
        this.storyKey = getUrlKey('key');

        if (!this.storyKey) {
            this.showError('No story specified');
            return;
        }

        await this.loadStoryData();
    }

    async loadStoryData() {
        const container = CoreUtils.dom.getElement('story-content');
        if (!container) return;

        try {
            // Show loading state using utility
            container.innerHTML = CoreUtils.details.createLoadingHtml('Loading story...');

            let story = null;

            // First, check if we have cached stories
            const cachedAll = CacheManager.get('stories', 'all');
            const cachedRecent = CacheManager.get('stories', 'recent');

            // Search in cached data
            if (cachedAll && cachedAll.valid && cachedAll.data) {
                story = this.findStoryInCache(cachedAll.data, this.storyKey);
                if (story) {
                    console.log('Found story in "all" cache');
                }
            }

            if (!story && cachedRecent && cachedRecent.valid && cachedRecent.data) {
                story = this.findStoryInCache(cachedRecent.data, this.storyKey);
                if (story) {
                    console.log('Found story in "recent" cache');
                }
            }

            // If not in cache, fetch from API
            if (!story) {
                console.log('Story not in cache, fetching from API');
                const storiesUrl = CrusadeConfig.getSheetUrl('stories');

                // Try to get specific story first using utility
                const fetchUrl = `${storiesUrl}?action=get&key=${encodeURIComponent(this.storyKey)}`;
                
                try {
                    story = await fetchEntityData(fetchUrl, 'story');
                    // Cache this specific story for future use
                    CacheManager.set('stories', story);
                } catch (error) {
                    // Fallback: fetch all stories and cache them
                    const allStoriesResponse = await CacheManager.fetchWithCache(storiesUrl, 'stories');
                    story = this.findStoryInCache(allStoriesResponse, this.storyKey);
                }
            }

            if (story) {
                this.storyData = story;
                await this.displayStory(story);
            } else {
                this.showError('Story not found');
            }

        } catch (error) {
            console.error('Error loading story:', error);
            this.showError('Error loading story');
        }
    }

    /**
     * Find a story in cached data (handles both array and object formats)
     */
    findStoryInCache(data, storyKey) {
        if (!data) return null;

        // Handle array format (raw Google Sheets data)
        if (Array.isArray(data) && data.length > 1) {
            const headers = data[0];
            const keyIndex = headers.indexOf('Key');

            if (keyIndex === -1) return null;

            const storyRow = data.find((row, index) => {
                if (index === 0) return false; // Skip headers
                return row[keyIndex] === storyKey;
            });

            if (storyRow) {
                // Convert array to object
                const story = {};
                headers.forEach((header, index) => {
                    story[header] = storyRow[index];
                });
                return story;
            }
        }

        // Handle object format (if data.stories exists)
        if (data.stories && Array.isArray(data.stories)) {
            return data.stories.find(s => s.Key === storyKey);
        }

        // Handle direct array of story objects
        if (Array.isArray(data) && data.length > 0 && data[0].Key !== undefined) {
            return data.find(s => s.Key === storyKey);
        }

        return null;
    }

    /**
     * Display the story details on the page
     * Made async to handle fetching related forces
     */
    async displayStory(story) {
        const container = CoreUtils.dom.getElement('story-content');
        if (!container) return;

        // Combine all story text parts (handle the typo in field name)
        let fullStoryText = '';
        const text1 = story['Story Text 1'] || story['Strory Text 1'] || '';
        const text2 = story['Story Text 2'] || '';
        const text3 = story['Story Text 3'] || '';

        if (text1) fullStoryText += text1;
        if (text2) fullStoryText += (fullStoryText ? '\n\n' : '') + text2;
        if (text3) fullStoryText += (fullStoryText ? '\n\n' : '') + text3;

        // Format the story text with paragraphs
        const formattedText = fullStoryText
            .split('\n\n')
            .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
            .join('');

        // Fetch related forces from junction table
        let relatedForces = [];
        if (story.Key) {
            try {
                const junctionUrl = CrusadeConfig.getSheetUrl('xref_story_forces');
                if (junctionUrl) {
                    const response = await fetch(junctionUrl);
                    const data = await response.json();
                    if (Array.isArray(data) && data.length > 0) {
                        // Filter for forces related to this story
                        const headers = data[0];
                        const storyForces = data.slice(1)
                            .filter(row => row[0] === story.Key) // Story key is column 0
                            .map(row => {
                                const force = {};
                                headers.forEach((header, index) => {
                                    force[header] = row[index];
                                });
                                return force;
                            });
                        relatedForces = storyForces;
                    }
                }
            } catch (error) {
                console.error('Error fetching related forces:', error);
            }
        }

        // Build HTML for story display
        let html = `
            <article class="story-article">
                <header class="story-header">
                    <h1 class="story-title">${story['Title'] || 'Untitled Story'}</h1>
                    <div class="story-meta">
                        <span class="story-type">${story['Story Type'] || 'Story'}</span>
                        ${story['Imperial Date'] ? `<span class="imperial-date">Imperial Date: ${story['Imperial Date']}</span>` : ''}
                        <span class="story-date">Posted: ${this.formatDate(story['Timestamp'])}</span>
                    </div>
                </header>

                <div class="story-body">
                    ${formattedText || '<p>No story text available.</p>'}
                </div>
        `;

        // Add images if they exist (check various field name formats)
        const image1 = story['Image 1'] || story['image 1'] || '';
        const image2 = story['Image 2'] || story['image 2'] || '';
        const image3 = story['Image 3'] || story['image 3'] || '';

        if (image1 || image2 || image3) {
            html += '<div class="story-images">';
            if (image1) {
                html += `<img src="${image1}" alt="Story Image 1" class="story-image">`;
            }
            if (image2) {
                html += `<img src="${image2}" alt="Story Image 2" class="story-image">`;
            }
            if (image3) {
                html += `<img src="${image3}" alt="Story Image 3" class="story-image">`;
            }
            html += '</div>';
        }

        // Add external links if they exist (check various field name formats)
        const textLink = story['Text Link'] || story['text link'] || '';
        const audioLink = story['Audio Link'] || story['audio link'] || '';

        if (textLink || audioLink) {
            html += '<div class="story-links">';
            if (textLink) {
                html += `<a href="${textLink}" target="_blank" class="external-link">📄 Full Text</a>`;
            }
            if (audioLink) {
                html += `<a href="${audioLink}" target="_blank" class="external-link">🔊 Audio Version</a>`;
            }
            html += '</div>';
        }

        html += `
            <footer class="story-footer">
                <p class="author-info">Written by: ${this.extractUserName(story['User Key'])}</p>
                ${relatedForces.length > 0 ?
                    `<p>Related Forces: ${relatedForces.map(fk =>
                        `<a href="../forces/force-details.html?key=${fk}">${fk}</a>`
                    ).join(', ')}</p>` :
                    story['Force Key'] ? `<p>Force: ${story['Force Key']}</p>` : ''
                }
                ${story['Crusade Key'] ? `<p>Crusade: ${story['Crusade Key']}</p>` : ''}
            </footer>
        </article>
        `;

        container.innerHTML = html;
    }

    /**
     * Extract readable name from user key
     */
    extractUserName(userKey) {
        // Use utility for user name extraction
        return CoreUtils.details.extractUserName(userKey) || 'Unknown Author';
    }

    /**
     * Format date for display
     */
    formatDate(dateStr) {
        // Use utility for date formatting
        return CoreUtils.dates.toDisplay(dateStr);
    }

    /**
     * Show error message
     */
    showError(message) {
        const container = CoreUtils.dom.getElement('story-content');
        if (container) {
            container.innerHTML = CoreUtils.details.createErrorHtml(message);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the story details page
    if (window.location.pathname.includes('story-details.html')) {
        window.storyDetails = new StoryDetails();
    }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StoryDetails;
}