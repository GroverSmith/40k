// filename: battles/battle-details.js
// Battle Details Viewer
// 40k Crusade Campaign Tracker

class BattleDetails {
    constructor() {
        this.battleKey = null;
        this.battleData = null;
        this.init();
    }

    async init() {
        // Get battle key from URL using utility
        this.battleKey = getUrlKey('key');

        if (!this.battleKey) {
            this.showError('No battle specified');
            return;
        }

        await this.loadBattleData();
    }

    async loadBattleData() {
        try {
            // Use UnifiedCache to get the specific battle
            const battle = await UnifiedCache.getRowByKey('battle_history', this.battleKey);
            
            if (battle) {
                console.log('Battle data loaded from UnifiedCache:', battle);
                this.battleData = battle;
                this.displayBattle();
            } else {
                // If not found, get all battles to show available keys in error message
                const allBattles = await UnifiedCache.getAllRows('battle_history');
                const availableKeys = allBattles.map(b => b.battle_key).join(', ');
                
                throw new Error(`Battle "${this.battleKey}" not found. Available battles: ${availableKeys}`);
            }

        } catch (error) {
            console.error('Error loading battle:', error);
            this.showError('Failed to load battle report: ' + error.message);
        }
    }

    displayBattle() {
        // Hide loading state and show content using utility
        toggleLoadingState('loading-state', 'battle-content', true);

        // Set title and date
        const battleName = this.battleData.battle_name || 'Unnamed Battle';
        document.title = `${battleName} - Battle Report`;

        const datePlayed = this.battleData.date_played;
        const dateText = datePlayed ? `Fought on ${new Date(datePlayed).toLocaleDateString()}` : '';
        
        const battleSize = this.battleData.battle_size;
        const sizeText = battleSize ? `${battleSize} Points` : '';
        
        setElementTexts({
            'battle-title': battleName,
            'battle-date': dateText,
            'battle-size': sizeText
        });

        // Force 1 details
        const force1Link = CoreUtils.dom.getElement('force1-link');
        force1Link.href = `../forces/force-details.html?key=${encodeURIComponent(this.battleData.force_key_1)}`;
        
        // Force 2 details
        const force2Link = CoreUtils.dom.getElement('force2-link');
        force2Link.href = `../forces/force-details.html?key=${encodeURIComponent(this.battleData.force_key_2)}`;
        
        // Set all text content using utility
        setElementTexts({
            'player1-name': this.battleData.player_1 || '-',
            'force1-link': this.battleData.force_1 || '-',
            'army1-name': this.battleData.army_1 || '-',
            'player1-score': this.battleData.player_1_score || '0',
            'player2-name': this.battleData.player_2 || '-',
            'force2-link': this.battleData.force_2 || '-',
            'army2-name': this.battleData.army_2 || '-',
            'player2-score': this.battleData.player_2_score || '0'
        });

        // Battle result
        const victor = this.battleData.victor;
        let resultText = 'Draw';
        let resultColor = '#ffa500';

        if (victor && victor !== 'Draw') {
            const victorForceKey = this.battleData.victor_force_key;
            if (victorForceKey === this.battleData.force_key_1) {
                resultText = `${this.battleData.force_1} Victory!`;
                resultColor = '#4ecdc4';
                CoreUtils.dom.getElement('force1-header').style.color = '#4ecdc4';
            } else if (victorForceKey === this.battleData.force_key_2) {
                resultText = `${this.battleData.force_2} Victory!`;
                resultColor = '#4ecdc4';
                CoreUtils.dom.getElement('force2-header').style.color = '#4ecdc4';
            }
        }

        const resultElement = CoreUtils.dom.getElement('battle-result');
        resultElement.textContent = resultText;
        resultElement.style.color = resultColor;

        // Summary notes
        const summaryNotes = this.battleData.summary_notes;
        if (summaryNotes && summaryNotes.trim()) {
            CoreUtils.dom.show('summary-section');
            setElementTexts({
                'battle-summary': summaryNotes
            });
        }

        // Force Point of View sections - wait for UserManager to be ready
        this.displayForcePOVSectionsWithDelay();
    }

    async displayForcePOVSectionsWithDelay() {
        // Wait for UserManager to be ready
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (attempts < maxAttempts) {
            const activeUser = UserManager.getCurrentUser();
            if (activeUser) {
                await this.loadBattlePOVStories();
                this.displayForcePOVSections();
                return;
            }
            
            // Wait 100ms before trying again
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('UserManager not ready after 5 seconds, displaying POV sections without user permissions');
        await this.loadBattlePOVStories();
        this.displayForcePOVSections();
    }

    async loadBattlePOVStories() {
        if (!this.battleKey) return;

        try {
            // Load all stories and filter for Battle POV stories for this battle
            const allStories = await UnifiedCache.getAllRows('stories');
            const battlePOVStories = allStories.filter(story => 
                story.battle_key === this.battleKey && 
                story.story_type === 'Battle POV'
            );

            // Store the POV stories for use in displayForcePOVSections
            this.battlePOVStories = battlePOVStories;
            
            console.log(`Found ${battlePOVStories.length} Battle POV stories for battle ${this.battleKey}`);
        } catch (error) {
            console.error('Error loading Battle POV stories:', error);
            this.battlePOVStories = [];
        }
    }

    displayForcePOVSections() {
        // Always show both Force Point of View sections
        // Get POV stories for each force
        const force1POVStories = this.getPOVStoriesForForce(this.battleData.user_key_1);
        const force2POVStories = this.getPOVStoriesForForce(this.battleData.user_key_2);

        // Get active user to check permissions
        const activeUser = UserManager.getCurrentUser();
        const activeUserKey = activeUser ? activeUser.user_key : null;

        // Always show Force 1 POV section
        CoreUtils.dom.show('force-1-pov-section');
        const force1POVText = this.formatPOVStories(force1POVStories);
        setElementTexts({
            'force-1-pov': force1POVText || 'No point of view recorded for this force.'
        });

        // Show/hide Force 1 POV button based on user match
        const battleUserKey1 = this.battleData.user_key_1;
        const force1Button = CoreUtils.dom.getElement('add-pov-1-btn');
        const showForce1Button = activeUserKey && battleUserKey1 && activeUserKey === battleUserKey1;
        if (showForce1Button) {
            CoreUtils.dom.show('add-pov-1-btn');
            // Set up click handler for Force 1 POV button
            this.setupPOVButtonHandler('add-pov-1-btn', this.battleData.force_key_1);
        } else {
            CoreUtils.dom.hide('add-pov-1-btn');
        }

        // Always show Force 2 POV section
        CoreUtils.dom.show('force-2-pov-section');
        const force2POVText = this.formatPOVStories(force2POVStories);
        setElementTexts({
            'force-2-pov': force2POVText || 'No point of view recorded for this force.'
        });

        // Show/hide Force 2 POV button based on user match
        const battleUserKey2 = this.battleData.user_key_2;
        const force2Button = CoreUtils.dom.getElement('add-pov-2-btn');
        const showForce2Button = activeUserKey && battleUserKey2 && activeUserKey === battleUserKey2;
        if (showForce2Button) {
            CoreUtils.dom.show('add-pov-2-btn');
            // Set up click handler for Force 2 POV button
            this.setupPOVButtonHandler('add-pov-2-btn', this.battleData.force_key_2);
        } else {
            CoreUtils.dom.hide('add-pov-2-btn');
        }
    }

    /**
     * Get POV stories for a specific force (user_key)
     */
    getPOVStoriesForForce(userKey) {
        if (!this.battlePOVStories || !userKey) return [];
        
        return this.battlePOVStories.filter(story => story.user_key === userKey);
    }

    /**
     * Format POV stories into display text
     */
    formatPOVStories(stories) {
        if (!stories || stories.length === 0) return '';

        if (stories.length === 1) {
            // Single story - show the story text
            const story = stories[0];
            let text = '';
            
            if (story.title) {
                text += `**${story.title}**\n\n`;
            }
            
            if (story.story_text_1) {
                text += story.story_text_1;
            }
            if (story.story_text_2) {
                text += (text ? '\n\n' : '') + story.story_text_2;
            }
            if (story.story_text_3) {
                text += (text ? '\n\n' : '') + story.story_text_3;
            }
            
            return text;
        } else {
            // Multiple stories - show them as separate entries
            return stories.map((story, index) => {
                let text = `**Story ${index + 1}${story.title ? ': ' + story.title : ''}**\n\n`;
                
                if (story.story_text_1) {
                    text += story.story_text_1;
                }
                if (story.story_text_2) {
                    text += (story.story_text_1 ? '\n\n' : '') + story.story_text_2;
                }
                if (story.story_text_3) {
                    text += ((story.story_text_1 || story.story_text_2) ? '\n\n' : '') + story.story_text_3;
                }
                
                return text;
            }).join('\n\n---\n\n');
        }
    }

    /**
     * Set up click handler for POV story buttons
     */
    setupPOVButtonHandler(buttonId, forceKey) {
        const button = CoreUtils.dom.getElement(buttonId);
        if (button) {
            // Remove any existing click handlers
            button.removeEventListener('click', this.handlePOVButtonClick);
            
            // Add new click handler
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handlePOVButtonClick(forceKey);
            });
        }
    }

    /**
     * Handle POV button click - navigate to story-add page with parameters
     */
    handlePOVButtonClick(forceKey) {
        // Build URL parameters (no longer need force_key - will be auto-loaded from battle)
        const params = new URLSearchParams({
            battle_key: this.battleKey,
            story_type: 'Battle POV'
        });

        // Navigate to story-add page
        const storyAddUrl = `../stories/story-add.html?${params.toString()}`;
        window.location.href = storyAddUrl;
    }

    showError(message) {
        // Use utility for standard error handling
        showDetailsError(message, 'error-message', ['loading-state']);
        CoreUtils.dom.show('error-state');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.battleDetails = new BattleDetails();
});