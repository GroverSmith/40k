// filename: stories/story-details.js
// Stories display component for homepage
// 40k Crusade Campaign Tracker

const StoriesDisplay = {
    /**
     * Display stories for the crusade
     */
    async displayStories(crusadeKey) {
        const container = document.getElementById('stories-content');
        const section = document.getElementById('stories-section');
        if (!container || !section) return;
        
        // Show the section
        section.style.display = 'block';
        
        // Update the Add Story button with crusade context
        const addStoryBtn = document.getElementById('add-story-btn');
        if (addStoryBtn) {
            const params = new URLSearchParams({
                crusadeKey: crusadeKey,
                crusadeName: this.crusadeData ? this.crusadeData['Crusade Name'] : ''
            });
            addStoryBtn.href = `../stories/add-story.html?${params.toString()}`;
        }
        
        // Load stories using StoriesDisplay module
        if (typeof StoriesDisplay !== 'undefined') {
            await StoriesDisplay.loadCrusadeStories(crusadeKey, container);
        } else {
            container.innerHTML = '<p class="no-data">Stories module not loaded.</p>';
        }
    },
	
	/**
     * Load and display recent stories on homepage
     */
    async loadRecentStories(limit = 5) {
        const container = document.querySelector('#stories-section') || 
                        document.querySelector('.features:last-child');
        
        if (!container) return;
        
        try {
            const storiesUrl = CrusadeConfig.getSheetUrl('stories');
            if (!storiesUrl) {
                this.showNoStoriesMessage(container);
                return;
            }
            
            // Fetch recent stories
            const fetchUrl = `${storiesUrl}?action=recent&limit=${limit}`;
            const response = await CacheManager.fetchWithCache(
                fetchUrl,
                'stories',
                'recent'
            );
            
            if (response.success && response.stories && response.stories.length > 0) {
                this.displayStoriesGrid(response.stories, container, 'Recent Stories');
            } else {
                this.showNoStoriesMessage(container);
            }
            
        } catch (error) {
            console.error('Error loading stories:', error);
            this.showNoStoriesMessage(container);
        }
    },
    
    /**
     * Load stories for a specific crusade
     */
    async loadCrusadeStories(crusadeKey, container) {
        if (!container) return;
        
        try {
            const storiesUrl = CrusadeConfig.getSheetUrl('stories');
            if (!storiesUrl) {
                container.innerHTML = '<p class="no-data">Stories feature not configured.</p>';
                return;
            }
            
            // Show loading state
            container.innerHTML = `
                <div class="loading-spinner"></div>
                <span>Loading stories...</span>
            `;
            
            // Fetch stories for this crusade
            const fetchUrl = `${storiesUrl}?action=crusade-stories&crusadeKey=${encodeURIComponent(crusadeKey)}`;
            const response = await CacheManager.fetchWithCache(
                fetchUrl,
                'stories',
                `crusade_${crusadeKey}`
            );
            
            if (response.success && response.stories && response.stories.length > 0) {
                this.displayStoriesList(response.stories, container);
            } else {
                container.innerHTML = '<p class="no-data">No stories recorded for this crusade yet.</p>';
            }
            
        } catch (error) {
            console.error('Error loading crusade stories:', error);
            container.innerHTML = '<p class="error-message">Error loading stories.</p>';
        }
    },
    
    /**
     * Load stories for a specific force
     */
    async loadForceStories(forceKey, container) {
        if (!container) return;
        
        try {
            const storiesUrl = CrusadeConfig.getSheetUrl('stories');
            if (!storiesUrl) {
                container.innerHTML = '<p class="no-data">Stories feature not configured.</p>';
                return;
            }
            
            // Show loading state
            container.innerHTML = `
                <div class="loading-spinner"></div>
                <span>Loading stories...</span>
            `;
            
            // Fetch stories for this force
            const fetchUrl = `${storiesUrl}?action=force-stories&forceKey=${encodeURIComponent(forceKey)}`;
            const response = await CacheManager.fetchWithCache(
                fetchUrl,
                'stories',
                `force_${forceKey}`
            );
            
            if (response.success && response.stories && response.stories.length > 0) {
                this.displayStoriesList(response.stories, container);
            } else {
                container.innerHTML = `
                    <p class="no-data">No stories recorded for this force yet.</p>
                    <p><a href="../stories/add-story.html?forceKey=${encodeURIComponent(forceKey)}" 
                          style="color: #4ecdc4;">Add your first story →</a></p>
                `;
            }
            
        } catch (error) {
            console.error('Error loading force stories:', error);
            container.innerHTML = '<p class="error-message">Error loading stories.</p>';
        }
    },
    
    /**
     * Display stories in a grid format (for homepage)
     */
    displayStoriesGrid(stories, container, title = 'Stories') {
        let html = `
            <h2>${title}</h2>
            <div class="stories-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
        `;
        
        stories.slice(0, 6).forEach(story => {
            const storyTitle = story.Title || 'Untitled Story';
            const storyType = story['Story Type'] || 'Story';
            const author = story['User Key'] ? this.extractUserName(story['User Key']) : 'Unknown Author';
            const date = story.Timestamp ? new Date(story.Timestamp).toLocaleDateString() : '';
            const preview = this.getStoryPreview(story);
            const storyKey = story.Key;
            
            // Determine story type icon
            const typeIcon = this.getStoryTypeIcon(storyType);
            
            html += `
                <div class="story-card" style="background: #2a2a2a; border: 1px solid #4a4a4a; border-radius: 8px; padding: 20px; transition: transform 0.2s;">
                    <div class="story-type" style="color: #4ecdc4; font-size: 0.9em; margin-bottom: 10px;">
                        ${typeIcon} ${storyType}
                    </div>
                    <h3 style="color: #ffffff; margin: 10px 0;">
                        <a href="stories/view-story.html?key=${encodeURIComponent(storyKey)}" 
                           style="color: inherit; text-decoration: none;">${storyTitle}</a>
                    </h3>
                    <div class="story-meta" style="color: #888; font-size: 0.85em; margin-bottom: 15px;">
                        By ${author} ${date ? `• ${date}` : ''}
                    </div>
                    <div class="story-preview" style="color: #ccc; font-size: 0.9em; line-height: 1.5;">
                        ${preview}
                    </div>
                    <a href="stories/view-story.html?key=${encodeURIComponent(storyKey)}" 
                       class="read-more" style="color: #4ecdc4; text-decoration: none; font-size: 0.9em; display: inline-block; margin-top: 10px;">
                        Read more →
                    </a>
                </div>
            `;
        });
        
        html += `
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <a href="stories/add-story.html" class="btn btn-primary">📝 Write New Story</a>
                <a href="stories/all-stories.html" class="btn btn-secondary" style="margin-left: 10px;">View All Stories</a>
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    /**
     * Display stories in a list format (for force/crusade pages)
     */
    displayStoriesList(stories, container) {
        let html = '<div class="stories-list">';
        
        // Group stories by type
        const storiesByType = {};
        stories.forEach(story => {
            const type = story['Story Type'] || 'Other';
            if (!storiesByType[type]) {
                storiesByType[type] = [];
            }
            storiesByType[type].push(story);
        });
        
        // Display each type group
        Object.keys(storiesByType).sort().forEach(type => {
            const typeStories = storiesByType[type];
            const typeIcon = this.getStoryTypeIcon(type);
            
            html += `
                <div class="story-type-section" style="margin-bottom: 30px;">
                    <h4 style="color: #4ecdc4; border-bottom: 2px solid #4a4a4a; padding-bottom: 10px; margin-bottom: 15px;">
                        ${typeIcon} ${type} (${typeStories.length})
                    </h4>
            `;
            
            typeStories.forEach(story => {
                const storyKey = story.Key;
                const title = story.Title || 'Untitled';
                const imperialDate = story['Imperial Date'] || '';
                const preview = this.getStoryPreview(story);
                const hasImages = story['Image 1'] || story['Image 2'] || story['Image 3'];
                const hasAudio = story['Audio Link'];
                
                html += `
                    <div class="story-item" style="background: #333; padding: 15px; margin-bottom: 15px; border-radius: 5px; border-left: 3px solid #4ecdc4;">
                        <div class="story-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                            <div>
                                <h5 style="margin: 0; color: #fff;">
                                    <a href="../stories/view-story.html?key=${encodeURIComponent(storyKey)}" 
                                       style="color: #4ecdc4; text-decoration: none;">${title}</a>
                                </h5>
                                ${imperialDate ? `<div style="color: #888; font-size: 0.85em; margin-top: 5px;">Imperial Date: ${imperialDate}</div>` : ''}
                            </div>
                            <div class="story-badges">
                                ${hasImages ? '<span class="badge" style="background: #4a4a4a; padding: 2px 8px; border-radius: 3px; font-size: 0.8em;">🖼️ Images</span>' : ''}
                                ${hasAudio ? '<span class="badge" style="background: #4a4a4a; padding: 2px 8px; border-radius: 3px; font-size: 0.8em; margin-left: 5px;">🔊 Audio</span>' : ''}
                            </div>
                        </div>
                        <div class="story-preview" style="color: #ccc; font-size: 0.9em; line-height: 1.5;">
                            ${preview}
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        });
        
        html += '</div>';
        container.innerHTML = html;
    },
    
    /**
     * Get story preview text
     */
    getStoryPreview(story) {
        const text = story['Story Text 1'] || story['Story Text 2'] || story['Story Text 3'] || '';
        const maxLength = 200;
        
        if (text.length <= maxLength) {
            return text;
        }
        
        // Find a good break point
        let preview = text.substring(0, maxLength);
        const lastSpace = preview.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.8) {
            preview = preview.substring(0, lastSpace);
        }
        
        return preview + '...';
    },
    
    /**
     * Get icon for story type
     */
    getStoryTypeIcon(storyType) {
        const icons = {
            'Battle Report': '⚔️',
            'Character Story': '👤',
            'Campaign Narrative': '📜',
            'Force Background': '🛡️',
            'Unit History': '📖',
            'Victory Celebration': '🏆',
            'Defeat Analysis': '💀',
            'Strategic Planning': '🗺️',
            'Personal Log': '📝',
            'Propaganda': '📢',
            'Technical Report': '⚙️',
            'Field Report': '📋',
            'Other': '📄'
        };
        
        return icons[storyType] || '📄';
    },
    
    /**
     * Extract user name from user key
     */
    extractUserName(userKey) {
        // User keys are typically in format "FirstnameLastname" 
        // Try to add spaces before capitals
        return userKey.replace(/([A-Z])/g, ' $1').trim();
    },
    
    /**
     * Show no stories message
     */
    showNoStoriesMessage(container) {
        container.innerHTML = `
            <h2>Stories</h2>
            <div class="no-data-message" style="text-align: center; padding: 40px; background: #2a2a2a; border-radius: 8px; margin-top: 20px;">
                <p style="font-size: 1.2em; color: #888;">📚 No battle reports or narrative stories recorded yet.</p>
                <p style="color: #ccc;">Share your crusade experiences and forge your legend!</p>
                <a href="stories/add-story.html" class="btn btn-primary" style="margin-top: 20px;">📝 Write First Story</a>
            </div>
        `;
    }
};

// Make globally available
window.StoriesDisplay = StoriesDisplay;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StoriesDisplay;
}

console.log('StoriesDisplay module loaded');