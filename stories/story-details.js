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

            // Try to get the specific story by key first
            let story = await UnifiedCache.getRowByKey('stories', this.storyKey);
            
            // If not found, fetch all stories and search
            if (!story) {
                const allStories = await UnifiedCache.getAllRows('stories');
                story = allStories.find(s => s.story_key === this.storyKey);
                
                if (!story) {
                    const availableKeys = allStories.map(s => s.story_key).join(', ');
                    throw new Error(`Story "${this.storyKey}" not found. Available stories: ${availableKeys}`);
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
     * Display the story details on the page
     * Made async to handle fetching related forces
     */
    async displayStory(story) {
        const container = CoreUtils.dom.getElement('story-content');
        if (!container) return;

        // Combine all story text parts
        let fullStoryText = '';
        const text1 = story.story_text_1 || '';
        const text2 = story.story_text_2 || '';
        const text3 = story.story_text_3 || '';

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
                    <h1 class="story-title">${story.title || 'Untitled Story'}</h1>
                    <div class="story-meta">
                        <span class="story-type">${story.story_type || 'Story'}</span>
                        ${story.imperial_date ? `<span class="imperial-date">Imperial Date: ${story.imperial_date}</span>` : ''}
                        <span class="story-date">Posted: ${this.formatDate(story.timestamp)}</span>
                    </div>
                </header>

                <div class="story-body">
                    ${formattedText || '<p>No story text available.</p>'}
                </div>
        `;

        // Add images if they exist
        const image1 = story.image_1 || '';
        const image2 = story.image_2 || '';
        const image3 = story.image_3 || '';

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

        // Add external links if they exist
        const textLink = story.text_link || '';
        const audioLink = story.audio_link || '';

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
                <p class="author-info">Written by: ${story.author_name || this.extractUserName(story.user_key)}</p>
                <div id="related-forces-section">
                    ${story.force_key ? `<p>Force: ${story.force_key}</p>` : ''}
                </div>
                <div id="related-units-section"></div>
                <div id="crusade-section"></div>
                <div id="related-battle-section"></div>
                <div id="story-actions-section" style="display: none;">
                    <a href="#" id="edit-story-btn" class="edit-story-button">✏️ Edit Story</a>
                </div>
            </footer>
        </article>
        `;

        container.innerHTML = html;

        // Load related forces asynchronously (non-blocking)
        this.loadRelatedForcesAsync(story);
        
        // Load related battle if battle_key exists
        if (story.battle_key) {
            this.loadRelatedBattleAsync(story.battle_key);
        }
        
        // Set up edit button visibility and handler
        this.setupEditButton(story);
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
            // Use UnifiedCache to get story-force relationships
            const junctionData = await UnifiedCache.getAllRows('xref_story_forces');

            // Filter for this story's forces
            const storyForces = junctionData.filter(item => item.story_key === storyKey);

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
            // Use UnifiedCache to get story-unit relationships
            const junctionData = await UnifiedCache.getAllRows('xref_story_units');

            // Filter for this story's units
            const storyUnits = junctionData.filter(item => item.story_key === storyKey);

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
        try {
            const forcesData = await UnifiedCache.getAllRows('forces');
            
            return storyForces.map(fk => {
                const force = forcesData.find(f => f.force_key === fk.force_key);
                const displayName = force ? force.force_name : fk.force_key;
                return `<a href="../forces/force-details.html?key=${fk.force_key}">${displayName}</a>`;
            }).join(', ');
        } catch (error) {
            console.error('Error loading forces for display:', error);
            // Fallback to force keys if cache not available
            return storyForces.map(fk => 
                `<a href="../forces/force-details.html?key=${fk.force_key}">${fk.force_key}</a>`
            ).join(', ');
        }
    }

    /**
     * Build HTML for related units with names from cache
     */
    async buildUnitsHtml(storyUnits) {
        try {
            const unitsData = await UnifiedCache.getAllRows('units');
            
            return storyUnits.map(uk => {
                const unit = unitsData.find(u => u.unit_key === uk.unit_key);
                const displayName = unit ? unit.unit_name : uk.unit_key;
                return `<a href="../units/unit-details.html?key=${uk.unit_key}">${displayName}</a>`;
            }).join(', ');
        } catch (error) {
            console.error('Error loading units for display:', error);
            // Fallback to unit keys if cache not available
            return storyUnits.map(uk => 
                `<a href="../units/unit-details.html?key=${uk.unit_key}">${uk.unit_key}</a>`
            ).join(', ');
        }
    }

    /**
     * Load crusade information and display as hyperlink
     */
    async loadCrusadeInfo(story) {
        const crusadeKey = story.crusade_key;
        if (!crusadeKey) return;

        try {
            const crusadesData = await UnifiedCache.getAllRows('crusades');
            const crusade = crusadesData.find(c => c.crusade_key === crusadeKey);
            const crusadeName = crusade ? crusade.crusade_name : crusadeKey;

            const crusadeSection = document.getElementById('crusade-section');
            if (crusadeSection) {
                crusadeSection.innerHTML = `<p>Crusade: <a href="../crusades/crusade-details.html?key=${crusadeKey}">${crusadeName}</a></p>`;
            }
        } catch (error) {
            console.error('Error loading crusade info:', error);
        }
    }

    /**
     * Load related battle information asynchronously
     */
    async loadRelatedBattleAsync(battleKey) {
        if (!battleKey) return;

        try {
            const battle = await UnifiedCache.getRowByKey('battle_history', battleKey);
            
            const battleSection = document.getElementById('related-battle-section');
            if (battleSection) {
                if (battle) {
                    // Create a descriptive battle name
                    const battleName = battle.battle_name || 
                                     `${battle.player_1 || 'Player 1'} vs ${battle.player_2 || 'Player 2'}` ||
                                     'Battle Details';
                    
                    battleSection.innerHTML = `
                        <p>Related Battle: <a href="../battles/battle-details.html?key=${battleKey}" class="battle-link">${battleName}</a></p>
                    `;
                } else {
                    // Fallback if battle not found
                    battleSection.innerHTML = `
                        <p>Related Battle: <a href="../battles/battle-details.html?key=${battleKey}" class="battle-link">View Battle Details</a></p>
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading related battle:', error);
            // Still show the link even if we can't load battle details
            const battleSection = document.getElementById('related-battle-section');
            if (battleSection) {
                battleSection.innerHTML = `
                    <p>Related Battle: <a href="../battles/battle-details.html?key=${battleKey}" class="battle-link">View Battle Details</a></p>
                `;
            }
        }
    }

    /**
     * Set up edit button visibility and click handler
     */
    setupEditButton(story) {
        // Wait for UserManager to be ready, then check permissions
        this.waitForUserManagerAndSetupEditButton(story);
    }

    /**
     * Wait for UserManager to be ready, then set up edit button
     */
    async waitForUserManagerAndSetupEditButton(story) {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (attempts < maxAttempts) {
            // Check if UserManager is available (assuming it's globally available)
            if (typeof UserManager !== 'undefined' && UserManager.getCurrentUser) {
                const activeUser = UserManager.getCurrentUser();
                if (activeUser) {
                    this.configureEditButton(story, activeUser);
                    return;
                }
            }
            
            // Wait 100ms before trying again
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('UserManager not ready after 5 seconds, edit button will not be shown');
    }

    /**
     * Configure edit button based on user permissions
     */
    configureEditButton(story, activeUser) {
        const actionsSection = document.getElementById('story-actions-section');
        const editButton = document.getElementById('edit-story-btn');
        
        if (!actionsSection || !editButton) return;

        // Check if active user matches story user
        const activeUserKey = activeUser.user_key;
        const storyUserKey = story.user_key;
        
        if (activeUserKey && storyUserKey && activeUserKey === storyUserKey) {
            // Show edit button
            actionsSection.style.display = 'block';
            
            // Set up click handler
            editButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleEditStoryClick(story);
            });
        } else {
            // Hide edit button
            actionsSection.style.display = 'none';
        }
    }

    /**
     * Handle edit story button click
     */
    handleEditStoryClick(story) {
        // Navigate to story-add.html with story_key parameter for editing
        const editUrl = `story-add.html?story_key=${story.story_key}`;
        window.location.href = editUrl;
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