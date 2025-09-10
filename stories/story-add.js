// filename: stories/story-add.js
// Simplified Story Form using base class
// 40k Crusade Campaign Tracker

class StoryForm extends BaseForm {
    constructor() {
        super('story-form', {
            submitUrl: TableDefs.stories?.url,
            successMessage: 'Story submitted successfully!',
            errorMessage: 'Failed to submit story',
            maxCharacters: 50000,
            minCharacters: 100,
            clearCacheOnSuccess: ['stories']
        });

        this.contextData = {};
        this.setupStoryLoadingState();
        this.init();
    }

    setupStoryLoadingState() {
        // Override the base form's setLoadingState method to use our custom overlay
        this.originalSetLoadingState = this.setLoadingState;
        this.setLoadingState = (isLoading) => {
            // Call the original method to handle button state
            this.originalSetLoadingState(isLoading);
            // Also show/hide our custom overlay
            this.toggleStoryLoadingOverlay(isLoading);
        };
    }

    toggleStoryLoadingOverlay(show) {
        const overlay = document.getElementById('story-loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    async init() {
        // Initialize base functionality
        this.initBase();

        // Load context from URL
        this.loadContext();

        // Setup character counters for each story text field
        this.setupStoryCharacterCounters();

        // Setup related entity selection
        await this.setupRelatedEntities();
    }

    loadContext() {
        this.contextData = CoreUtils.url.getAllParams();
        this.contextData.userName = this.contextData.userName || UserManager.getCurrentUser()?.name || '';

        // Handle POV story parameters from battle details
        if (this.contextData.battle_key) {
            this.contextData.battleKey = this.contextData.battle_key;
        }
        if (this.contextData.story_type) {
            this.contextData.storyType = this.contextData.story_type;
        }

        // Detect if we're in battle POV mode (has both battle_key and story_type)
        this.contextData.isBattlePOV = this.contextData.battleKey && this.contextData.storyType;

        // User information is now handled by UserManager, no need to set field values

        // Make story type read-only in battle POV mode
        if (this.contextData.isBattlePOV) {
            const storyTypeSelect = CoreUtils.dom.getElement('story-type');
            if (storyTypeSelect) {
                storyTypeSelect.value = this.contextData.storyType;
                storyTypeSelect.disabled = true;
                storyTypeSelect.classList.add('readonly-field');
            }
        }

        this.updateHeaderContext();
    }

    updateHeaderContext() {
        const contextEl = CoreUtils.dom.getElement('story-context');
        if (!contextEl) return;

        let contextText = 'Write a new campaign story';

        // Handle battle POV context
        if (this.contextData.battleKey && this.contextData.forceKey) {
            contextText = 'Write a Battle Point of View story';
        } else if (this.contextData.forceName) {
            contextText = `Writing story for ${this.contextData.forceName}`;
        } else if (this.contextData.crusadeName) {
            contextText = `Writing story for ${this.contextData.crusadeName} crusade`;
        }

        contextEl.textContent = contextText;
    }

    setupStoryCharacterCounters() {
        // Story Text 1
        const textarea1 = CoreUtils.dom.getElement('story-text-1');
        const counter1 = CoreUtils.dom.getElement('count-1');
        if (textarea1 && counter1) {
            const updateCount1 = () => {
                const length = textarea1.value.length;
                counter1.textContent = `${length.toLocaleString()} / 10,000 characters`;

                if (length > 10000) {
                    counter1.style.color = 'var(--color-error, #ff6b6b)';
                } else if (length < 100) {
                    counter1.style.color = 'var(--color-warning, #ffa500)';
                } else {
                    counter1.style.color = 'var(--color-success, #4ecdc4)';
                }
            };

            textarea1.addEventListener('input', updateCount1);
            textarea1.addEventListener('paste', () => setTimeout(updateCount1, 10));
            updateCount1();
        }

        // Story Text 2
        const textarea2 = CoreUtils.dom.getElement('story-text-2');
        const counter2 = CoreUtils.dom.getElement('count-2');
        if (textarea2 && counter2) {
            const updateCount2 = () => {
                const length = textarea2.value.length;
                counter2.textContent = `${length.toLocaleString()} / 10,000 characters`;

                if (length > 10000) {
                    counter2.style.color = 'var(--color-error, #ff6b6b)';
                } else {
                    counter2.style.color = 'var(--color-secondary, #999)';
                }
            };

            textarea2.addEventListener('input', updateCount2);
            textarea2.addEventListener('paste', () => setTimeout(updateCount2, 10));
            updateCount2();
        }

        // Story Text 3
        const textarea3 = document.getElementById('story-text-3');
        const counter3 = document.getElementById('count-3');
        if (textarea3 && counter3) {
            const updateCount3 = () => {
                const length = textarea3.value.length;
                counter3.textContent = `${length.toLocaleString()} / 10,000 characters`;

                if (length > 10000) {
                    counter3.style.color = 'var(--color-error, #ff6b6b)';
                } else {
                    counter3.style.color = 'var(--color-secondary, #999)';
                }
            };

            textarea3.addEventListener('input', updateCount3);
            textarea3.addEventListener('paste', () => setTimeout(updateCount3, 10));
            updateCount3();
        }
    }

    async setupRelatedEntities() {
        // Load forces for dropdown (now with multi-select)
        const forceSelect = document.getElementById('force-select');
        if (forceSelect) {
            // Enable multi-select
            forceSelect.setAttribute('multiple', 'multiple');
            forceSelect.setAttribute('size', '5');
            forceSelect.classList.add('multi-select');

            try {
                const forces = await UnifiedCache.getAllRows('forces');
                console.log('Forces data loaded for story form:', forces);

                forceSelect.innerHTML = '';

                console.log('Processed forces array:', forces);

                // Process forces data
                forces.forEach((force, index) => {
                    const forceKey = force.force_key;
                    const forceName = force.force_name;
                    const userName = force.user_name;
                    
                    if (forceKey && forceName) {
                        const option = document.createElement('option');
                        option.value = forceKey;
                        option.textContent = `${forceName} (${userName || 'Unknown User'})`;
                        forceSelect.appendChild(option);
                    }
                });

                // Handle battle POV mode - load both forces from battle
                if (this.contextData.isBattlePOV) {
                    await this.loadBattleForces();
                    // Make force select read-only
                    forceSelect.disabled = true;
                    forceSelect.classList.add('readonly-field');
                } else if (this.contextData.forceKey) {
                    // Pre-select if context provided (legacy support)
                    const options = forceSelect.options;
                    for (let i = 0; i < options.length; i++) {
                        if (options[i].value === this.contextData.forceKey) {
                            options[i].selected = true;
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading forces:', error);
            }
        }

        // Load crusades for dropdown
        const crusadeSelect = document.getElementById('crusade-select');
        if (crusadeSelect) {
            try {
                const crusades = await UnifiedCache.getAllRows('crusades');

                crusadeSelect.innerHTML = '<option value="">Select crusade (optional)...</option>';

                crusades.forEach(crusade => {
                    if (crusade.crusade_key && crusade.crusade_name) {
                        const option = document.createElement('option');
                        option.value = crusade.crusade_key;
                        option.textContent = crusade.crusade_name;
                        crusadeSelect.appendChild(option);
                    }
                });

                // Re-select if context provided
                if (this.contextData.crusadeKey) {
                    crusadeSelect.value = this.contextData.crusadeKey;
                } else if (this.contextData.battleKey) {
                    // Try to get crusade from battle data
                    this.loadCrusadeFromBattle();
                }

                // Make crusade select read-only in battle POV mode
                if (this.contextData.isBattlePOV) {
                    crusadeSelect.disabled = true;
                    crusadeSelect.classList.add('readonly-field');
                }
            } catch (error) {
                console.error('Error loading crusades:', error);
            }
        }
    }

    async loadCrusadeFromBattle() {
        if (!this.contextData.battleKey) return;

        try {
            const battle = await UnifiedCache.getRowByKey('battle_history', this.contextData.battleKey);
            if (battle && battle.crusade_key) {
                const crusadeSelect = document.getElementById('crusade-select');
                if (crusadeSelect) {
                    crusadeSelect.value = battle.crusade_key;
                }
            }
        } catch (error) {
            console.error('Error loading crusade from battle:', error);
        }
    }

    async loadBattleForces() {
        if (!this.contextData.battleKey) return;

        try {
            const battle = await UnifiedCache.getRowByKey('battle_history', this.contextData.battleKey);
            if (battle) {
                const forceSelect = document.getElementById('force-select');
                if (forceSelect) {
                    // Select both forces from the battle
                    const force1Key = battle.force_key_1;
                    const force2Key = battle.force_key_2;
                    
                    if (force1Key) {
                        const option1 = Array.from(forceSelect.options).find(opt => opt.value === force1Key);
                        if (option1) option1.selected = true;
                    }
                    
                    if (force2Key) {
                        const option2 = Array.from(forceSelect.options).find(opt => opt.value === force2Key);
                        if (option2) option2.selected = true;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading battle forces:', error);
        }
    }

    validateSpecificField(field, value) {
        if (field.id === 'title' && value) {
            if (value.length < 3) {
                return {
                    isValid: false,
                    errorMessage: 'Title must be at least 3 characters.'
                };
            }
            if (value.length > 200) {
                return {
                    isValid: false,
                    errorMessage: 'Title must be no more than 200 characters.'
                };
            }
        }

        // Validate at least one story text field has content
        if (field.id === 'story-text-1') {
            const text1 = document.getElementById('story-text-1')?.value || '';
            const text2 = document.getElementById('story-text-2')?.value || '';
            const text3 = document.getElementById('story-text-3')?.value || '';
            const totalText = text1 + text2 + text3;

            if (totalText.length < 100) {
                return {
                    isValid: false,
                    errorMessage: 'Story must be at least 100 characters total.'
                };
            }
        }

        return { isValid: true };
    }

    /**
     * Override handleSubmit to add junction table creation
     */
    async handleSubmit(event) {
        event.preventDefault();

        if (this.isSubmitting) {
            console.log('Already submitting, please wait');
            return;
        }

        this.setLoadingState(true);

        try {
            // Validate form
            if (this.config.validateOnSubmit && !this.validateForm()) {
                throw new Error('Please fix the form errors and try again.');
            }

            // Gather form data
            const formData = this.gatherFormData();

            // Submit main story to Google Sheets
            const response = await this.submitToGoogleSheets(formData);

            // Create junction table relationships if we have multiple forces
            if (response && response.key && formData.selectedForces && formData.selectedForces.length > 0) {
                await this.createStoryForceRelationships(response.key, formData.selectedForces);
            }

            // Clear specified caches
            this.clearCachesOnSuccess();

            // Show success
            this.showSuccess();

            // Handle redirect or reset
            if (this.config.redirectUrl) {
                setTimeout(() => {
                    window.location.href = this.config.redirectUrl;
                }, this.config.redirectDelay);
            } else {
                this.form.style.display = 'none';
            }

        } catch (error) {
            console.error('Form submission error:', error);
            this.showError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Create story-force relationships in junction table
     */
    async createStoryForceRelationships(storyKey, forceKeys) {
        const junctionUrl = TableDefs.xref_story_forces?.url;
        if (!junctionUrl) {
            console.warn('Story-Forces junction table URL not configured');
            return;
        }

        try {
            const response = await fetch(junctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    storyKey: storyKey,
                    forceKeys: forceKeys.join(',')
                })
            });

            const result = await response.json();
            if (result.success) {
                console.log('Created story-force relationships:', result.count);
            }
        } catch (error) {
            console.error('Error creating story-force relationships:', error);
            // Don't throw - this is a non-critical enhancement
        }
    }

    gatherFormData() {
        const formData = super.gatherFormData();

        // Get selected forces (multiple)
        const forceSelect = document.getElementById('force-select');
        const selectedForces = [];
        if (forceSelect) {
            for (let option of forceSelect.selectedOptions) {
                selectedForces.push(option.value);
            }
        }

        // Get user information from UserManager
        const activeUser = UserManager.getCurrentUser();
        const userName = activeUser?.name || this.contextData.userName || 'Unknown';
        const userKey = activeUser?.user_key || KeyUtils.generateUserKey(userName);
        const storyKey = KeyUtils.generateStoryKey(userKey, formData.title || 'Untitled');

        return {
            key: storyKey,
            userKey: userKey,
            userName: userName,
            authorName: userName, // Add authorName for the new column
            // For backward compatibility, store first force in main table
            forceKey: selectedForces[0] || this.contextData.forceKey || '',
            // Store array of selected forces for junction table
            selectedForces: selectedForces,
            // Crusade key
            crusadeKey: document.getElementById('crusade-select')?.value || this.contextData.crusadeKey || '',
            // Battle key (for POV stories)
            battleKey: this.contextData.battleKey || '',
            // Story content fields
            storyText1: document.getElementById('story-text-1')?.value || '',
            storyText2: document.getElementById('story-text-2')?.value || '',
            storyText3: document.getElementById('story-text-3')?.value || '',
            // Other fields
            storyType: document.getElementById('story-type')?.value || '',
            title: document.getElementById('title')?.value || '',
            imperialDate: document.getElementById('imperial-date')?.value || '',
            image1: document.getElementById('image-1')?.value || '',
            image2: document.getElementById('image-2')?.value || '',
            image3: document.getElementById('image-3')?.value || '',
            audioLink: document.getElementById('audio-link')?.value || '',
            textLink: document.getElementById('text-link')?.value || ''
        };
    }

    /**
     * Submit to Google Sheets (override to parse response properly)
     */
    async submitToGoogleSheets(data) {
        if (!this.config.submitUrl) {
            throw new Error('Submit URL not configured');
        }

        const response = await fetch(this.config.submitUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(data).toString()
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || this.config.errorMessage);
        }

        return result;
    }

    async clearCachesOnSuccess() {
        // Call the base form's method first
        await super.clearCachesOnSuccess();
        
        // Also manually clear stories cache using UnifiedCache
        if (typeof UnifiedCache !== 'undefined') {
            await UnifiedCache.clearCache('stories');
        }
    }
}

// Global functions for backward compatibility
function resetForm() {
    if (window.storyForm) {
        window.storyForm.reset();
    }
}

function hideMessages() {
    FormUtilities.hideAllMessages();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.storyForm = new StoryForm();
});