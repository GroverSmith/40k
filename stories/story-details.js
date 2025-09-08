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
            } else {
                console.log('Story found in cache, skipping API call');
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
     * Find a story in cached data (all cached data is objects)
     */
    findStoryInCache(data, storyKey) {
        if (!data) return null;

        // Handle object format: { data: [story objects...] }
        if (data.data && Array.isArray(data.data)) {
            return data.data.find(s => s.story_key === storyKey);
        }

        // Handle direct array of story objects (fallback)
        if (Array.isArray(data) && data.length > 0 && data[0].story_key !== undefined) {
            return data.find(s => s.story_key === storyKey);
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

        // Combine all story text parts (handle various field name formats)
        let fullStoryText = '';
        const text1 = story['story_text_1'] || story['Story Text 1'] || story['Strory Text 1'] || '';
        const text2 = story['story_text_2'] || story['Story Text 2'] || '';
        const text3 = story['story_text_3'] || story['Story Text 3'] || '';

        if (text1) fullStoryText += text1;
        if (text2) fullStoryText += (fullStoryText ? '\n\n' : '') + text2;
        if (text3) fullStoryText += (fullStoryText ? '\n\n' : '') + text3;

        // Format the story text with paragraphs
        const formattedText = fullStoryText
            .split('\n\n')
            .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
            .join('');

        // Build HTML for story display (related forces will be loaded asynchronously)
        let html = `
            <article class="story-article">
                <header class="story-header">
                    <h1 class="story-title">${story['title'] || story['Title'] || 'Untitled Story'}</h1>
                    <div class="story-meta">
                        <span class="story-type">${story['story_type'] || story['Story Type'] || 'Story'}</span>
                        ${story['imperial_date'] || story['Imperial Date'] ? `<span class="imperial-date">Imperial Date: ${story['imperial_date'] || story['Imperial Date']}</span>` : ''}
                        <span class="story-date">Posted: ${this.formatDate(story['timestamp'] || story['Timestamp'])}</span>
                    </div>
                </header>

                <div class="story-body">
                    ${formattedText || '<p>No story text available.</p>'}
                </div>
        `;

        // Add images if they exist (check various field name formats)
        const image1 = story['image_1'] || story['Image 1'] || story['image 1'] || '';
        const image2 = story['image_2'] || story['Image 2'] || story['image 2'] || '';
        const image3 = story['image_3'] || story['Image 3'] || story['image 3'] || '';

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
        const textLink = story['text_link'] || story['Text Link'] || story['text link'] || '';
        const audioLink = story['audio_link'] || story['Audio Link'] || story['audio link'] || '';

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
                <p class="author-info">Written by: ${this.extractUserName(story['user_key'] || story['User Key'])}</p>
                <div id="related-forces-section">
                    ${story['force_key'] || story['Force Key'] ? `<p>Force: ${story['force_key'] || story['Force Key']}</p>` : ''}
                </div>
                <div id="related-units-section"></div>
                ${story['crusade_key'] || story['Crusade Key'] ? `<p>Crusade: ${story['crusade_key'] || story['Crusade Key']}</p>` : ''}
            </footer>
        </article>
        `;

        container.innerHTML = html;

        // Load related forces asynchronously (non-blocking)
        console.log('Calling loadRelatedForcesAsync for story:', story.story_key || story.Key);
        this.loadRelatedForcesAsync(story);
    }

    /**
     * Load related forces and units asynchronously without blocking story display
     */
    async loadRelatedForcesAsync(story) {
        if (!story.story_key && !story.Key) {
            console.log('No story key found for related forces/units');
            return;
        }

        const storyKey = story.story_key || story.Key;
        console.log('Loading related forces and units for story:', storyKey);
        
        // Load related forces and units in parallel
        await Promise.all([
            this.loadRelatedForces(storyKey),
            this.loadRelatedUnits(storyKey)
        ]);
    }

    /**
     * Load related forces from cache or API
     */
    async loadRelatedForces(storyKey) {
        console.log('loadRelatedForces called with storyKey:', storyKey);
        try {
            // First check cache
            const cachedForces = CacheManager.get('xref_story_forces', 'all');
            console.log('Cached forces data:', cachedForces);
            let junctionData = null;

            if (cachedForces && cachedForces.valid && cachedForces.data) {
                console.log('Using cached junction data');
                junctionData = cachedForces.data;
            } else {
                console.log('Fetching junction data from API');
                const junctionUrl = CrusadeConfig.getSheetUrl('xref_story_forces');
                if (!junctionUrl) return;
                junctionData = await CacheManager.fetchWithCache(junctionUrl, 'xref_story_forces');
            }

            // Handle object format (all GAS scripts return objects)
            let storyForces = [];
            
            if (junctionData && junctionData.data && Array.isArray(junctionData.data)) {
                console.log('Processing junction data with', junctionData.data.length, 'objects');
                storyForces = junctionData.data.filter(item => {
                    console.log('Checking object:', item, 'story_key:', item.story_key, 'against:', storyKey, 'match:', item.story_key === storyKey);
                    return item.story_key === storyKey;
                });
            }

            // Update the related forces section if we found any
            if (storyForces.length > 0) {
                console.log('Found related forces:', storyForces);
                const relatedForcesSection = document.getElementById('related-forces-section');
                if (relatedForcesSection) {
                    const forcesHtml = storyForces.map(fk => 
                        `<a href="../forces/force-details.html?key=${fk.force_key}">${fk.force_key}</a>`
                    ).join(', ');
                    relatedForcesSection.innerHTML = `<p>Related Forces: ${forcesHtml}</p>`;
                    console.log('Updated related forces section');
                } else {
                    console.log('Related forces section element not found');
                }
            } else {
                console.log('No related forces found for story:', storyKey);
            }
        } catch (error) {
            console.error('Error loading related forces:', error);
            console.error('Error stack:', error.stack);
        }
    }

    /**
     * Load related units from cache or API
     */
    async loadRelatedUnits(storyKey) {
        try {
            // First check cache
            const cachedUnits = CacheManager.get('xref_story_units', 'all');
            let junctionData = null;

            if (cachedUnits && cachedUnits.valid && cachedUnits.data) {
                junctionData = cachedUnits.data;
            } else {
                const junctionUrl = CrusadeConfig.getSheetUrl('xref_story_units');
                if (!junctionUrl) return;
                junctionData = await CacheManager.fetchWithCache(junctionUrl, 'xref_story_units');
            }

            // Handle object format (all GAS scripts return objects)
            let storyUnits = [];
            
            if (junctionData && junctionData.data && Array.isArray(junctionData.data)) {
                console.log('Processing units junction data with', junctionData.data.length, 'objects');
                storyUnits = junctionData.data.filter(item => {
                    console.log('Checking unit object:', item, 'story_key:', item.story_key, 'against:', storyKey, 'match:', item.story_key === storyKey);
                    return item.story_key === storyKey;
                });
            }

            // Update the related units section if we found any
            if (storyUnits.length > 0) {
                console.log('Found related units:', storyUnits);
                const relatedUnitsSection = document.getElementById('related-units-section');
                if (relatedUnitsSection) {
                    const unitsHtml = storyUnits.map(uk => 
                        `<a href="../units/unit-details.html?key=${uk.unit_key}">${uk.unit_key}</a>`
                    ).join(', ');
                    relatedUnitsSection.innerHTML = `<p>Related Units: ${unitsHtml}</p>`;
                    console.log('Updated related units section');
                } else {
                    console.log('Related units section element not found');
                }
            } else {
                console.log('No related units found for story:', storyKey);
            }
        } catch (error) {
            console.error('Error loading related units:', error);
        }
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