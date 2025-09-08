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
                <div id="crusade-section"></div>
            </footer>
        </article>
        `;

        container.innerHTML = html;

        // Load related forces asynchronously (non-blocking)
        this.loadRelatedForcesAsync(story);
    }

    /**
     * Load related forces and units asynchronously without blocking story display
     */
    async loadRelatedForcesAsync(story) {
        if (!story.story_key && !story.Key) {
            return;
        }

        const storyKey = story.story_key || story.Key;
        
        // Load related forces, units, and crusade in parallel
        await Promise.all([
            this.loadRelatedForces(storyKey),
            this.loadRelatedUnits(storyKey),
            this.loadCrusadeInfo(story)
        ]);
    }

    /**
     * Load related forces from cache or API
     */
    async loadRelatedForces(storyKey) {
        try {
            // First check cache
            const cachedForces = CacheManager.get('xref_story_forces', 'all');
            let junctionData = null;

            if (cachedForces && cachedForces.valid && cachedForces.data) {
                junctionData = cachedForces.data;
            } else {
                const junctionUrl = CrusadeConfig.getSheetUrl('xref_story_forces');
                if (!junctionUrl) return;
                junctionData = await CacheManager.fetchWithCache(junctionUrl, 'xref_story_forces');
            }

            // Handle object format (all cached data is objects)
            let storyForces = [];
            
            if (junctionData && junctionData.data && Array.isArray(junctionData.data)) {
                storyForces = junctionData.data.filter(item => item.story_key === storyKey);
            }

            // Update the related forces section if we found any
            if (storyForces.length > 0) {
                const relatedForcesSection = document.getElementById('related-forces-section');
                if (relatedForcesSection) {
                    // Get force names from cache
                    const forcesHtml = await this.buildForcesHtml(storyForces);
                    relatedForcesSection.innerHTML = `<p>Related Forces: ${forcesHtml}</p>`;
                }
            }
        } catch (error) {
            console.error('Error loading related forces:', error);
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

            // Handle object format (all cached data is objects)
            let storyUnits = [];
            
            if (junctionData && junctionData.data && Array.isArray(junctionData.data)) {
                storyUnits = junctionData.data.filter(item => item.story_key === storyKey);
            }

            // Update the related units section if we found any
            if (storyUnits.length > 0) {
                const relatedUnitsSection = document.getElementById('related-units-section');
                if (relatedUnitsSection) {
                    // Get unit names from cache
                    const unitsHtml = await this.buildUnitsHtml(storyUnits);
                    relatedUnitsSection.innerHTML = `<p>Related Units: ${unitsHtml}</p>`;
                }
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

    /**
     * Build HTML for related forces with names from cache
     */
    async buildForcesHtml(storyForces) {
        const forcesCache = CacheManager.get('forces', 'all');
        
        if (!forcesCache || !forcesCache.valid || !forcesCache.data || !forcesCache.data.data) {
            // Fallback to force keys if cache not available
            return storyForces.map(fk => 
                `<a href="../forces/force-details.html?key=${fk.force_key}">${fk.force_key}</a>`
            ).join(', ');
        }

        const forcesData = forcesCache.data.data;
        return storyForces.map(fk => {
            const force = forcesData.find(f => f.force_key === fk.force_key);
            const displayName = force ? force.force_name : fk.force_key;
            return `<a href="../forces/force-details.html?key=${fk.force_key}">${displayName}</a>`;
        }).join(', ');
    }

    /**
     * Build HTML for related units with names from cache
     */
    async buildUnitsHtml(storyUnits) {
        const unitsCache = CacheManager.get('units', 'all');
        if (!unitsCache || !unitsCache.valid || !unitsCache.data || !unitsCache.data.data) {
            // Fallback to unit keys if cache not available
            return storyUnits.map(uk => 
                `<a href="../units/unit-details.html?key=${uk.unit_key}">${uk.unit_key}</a>`
            ).join(', ');
        }

        const unitsData = unitsCache.data.data;
        return storyUnits.map(uk => {
            const unit = unitsData.find(u => u.unit_key === uk.unit_key);
            const displayName = unit ? unit.unit_name : uk.unit_key;
            return `<a href="../units/unit-details.html?key=${uk.unit_key}">${displayName}</a>`;
        }).join(', ');
    }

    /**
     * Load crusade information and display as hyperlink
     */
    async loadCrusadeInfo(story) {
        const crusadeKey = story.crusade_key || story['Crusade Key'];
        if (!crusadeKey) return;

        try {
            const crusadesCache = CacheManager.get('crusades', 'all');
            let crusadeName = crusadeKey; // Fallback to key if cache not available

            if (crusadesCache && crusadesCache.valid && crusadesCache.data && crusadesCache.data.data) {
                const crusadesData = crusadesCache.data.data;
                const crusade = crusadesData.find(c => c.crusade_key === crusadeKey);
                if (crusade) {
                    crusadeName = crusade.crusade_name;
                }
            }

            const crusadeSection = document.getElementById('crusade-section');
            if (crusadeSection) {
                crusadeSection.innerHTML = `<p>Crusade: <a href="../crusades/crusade-details.html?key=${crusadeKey}">${crusadeName}</a></p>`;
            }
        } catch (error) {
            console.error('Error loading crusade info:', error);
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