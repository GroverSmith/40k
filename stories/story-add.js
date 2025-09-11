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

        // Load existing story data if in edit mode
        if (this.contextData.isEditMode) {
            await this.loadStoryForEditing();
        }

        // Setup character counters for each story text field
        this.setupStoryCharacterCounters();

        // Setup Imperial date component
        this.setupImperialDateComponent();

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

        // Handle edit mode (story_key parameter)
        if (this.contextData.story_key) {
            this.contextData.storyKey = this.contextData.story_key;
            this.contextData.isEditMode = true;
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

        // Handle edit mode
        if (this.contextData.isEditMode) {
            contextText = 'Edit story';
        } else if (this.contextData.battleKey && this.contextData.forceKey) {
            // Handle battle POV context
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

    setupImperialDateComponent() {
        // Set up number input buttons (only for year and fraction now)
        const numberButtons = document.querySelectorAll('.number-btn');
        numberButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const field = button.dataset.field;
                const action = button.dataset.action;
                const input = document.getElementById(`imperial-${field}`);
                
                if (input) {
                    let value = parseInt(input.value) || 0;
                    const min = parseInt(input.min) || 0;
                    const max = parseInt(input.max) || 999;
                    
                    if (action === 'increase') {
                        value = Math.min(value + 1, max);
                    } else if (action === 'decrease') {
                        value = Math.max(value - 1, min);
                    }
                    
                    input.value = value;
                    this.updateImperialDateString();
                }
            });
        });

        // Set up number input fields (year and fraction)
        const numberInputs = document.querySelectorAll('#imperial-year, #imperial-fraction');
        numberInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateImperialDateString();
            });
            
            input.addEventListener('keydown', (e) => {
                // Allow arrow keys to increment/decrement
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const value = parseInt(input.value) || 0;
                    const max = parseInt(input.max) || 999;
                    input.value = Math.min(value + 1, max);
                    this.updateImperialDateString();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const value = parseInt(input.value) || 0;
                    const min = parseInt(input.min) || 0;
                    input.value = Math.max(value - 1, min);
                    this.updateImperialDateString();
                }
            });
        });

        // Set up millennium dropdown with custom option
        const millenniumSelect = document.getElementById('imperial-millennium');
        const customMillenniumInput = document.getElementById('imperial-millennium-custom');
        
        if (millenniumSelect) {
            millenniumSelect.addEventListener('change', () => {
                if (millenniumSelect.value === 'custom') {
                    millenniumSelect.style.display = 'none';
                    customMillenniumInput.style.display = 'block';
                    customMillenniumInput.focus();
                } else {
                    millenniumSelect.style.display = 'block';
                    customMillenniumInput.style.display = 'none';
                }
                this.updateImperialDateString();
            });
        }

        // Set up custom millennium input
        if (customMillenniumInput) {
            customMillenniumInput.addEventListener('input', () => {
                this.updateImperialDateString();
            });
            
            customMillenniumInput.addEventListener('blur', () => {
                // If custom input is empty, go back to dropdown
                if (!customMillenniumInput.value.trim()) {
                    millenniumSelect.style.display = 'block';
                    customMillenniumInput.style.display = 'none';
                    millenniumSelect.value = 'M41'; // Default back to M41
                    this.updateImperialDateString();
                }
            });
        }

        // Set up check dropdown
        const checkSelect = document.getElementById('imperial-check');
        if (checkSelect) {
            checkSelect.addEventListener('change', () => {
                this.updateImperialDateString();
            });
        }

        // Initialize the date string
        this.updateImperialDateString();
    }

    updateImperialDateString() {
        const millenniumSelect = document.getElementById('imperial-millennium');
        const customMillenniumInput = document.getElementById('imperial-millennium-custom');
        
        // Get millennium value (either from dropdown or custom input)
        let millennium = 'M41';
        if (millenniumSelect && millenniumSelect.value === 'custom' && customMillenniumInput) {
            millennium = customMillenniumInput.value.trim() || 'M41';
        } else if (millenniumSelect) {
            millennium = millenniumSelect.value || 'M41';
        }
        
        const year = document.getElementById('imperial-year')?.value || '999';
        const fraction = document.getElementById('imperial-fraction')?.value || '0';
        const check = document.getElementById('imperial-check')?.value || '5';
        
        // New order: Millennium.Year.Fraction.Check
        const imperialDateString = `${millennium}.${year}.${fraction}.${check}`;
        
        const hiddenInput = document.getElementById('imperial-date');
        if (hiddenInput) {
            hiddenInput.value = imperialDateString;
        }
    }

    parseImperialDate(imperialDateString) {
        if (!imperialDateString) return null;
        
        const parts = imperialDateString.split('.');
        if (parts.length !== 4) return null;
        
        // New order: Millennium.Year.Fraction.Check
        return {
            millennium: parts[0],
            year: parts[1],
            fraction: parts[2],
            check: parts[3]
        };
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
                } else if (this.contextData.isEditMode && this.editingStory) {
                    // Handle edit mode - select forces from story
                    await this.selectForcesForEditMode();
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
                if (this.contextData.isEditMode && this.editingStory) {
                    // Handle edit mode - select crusade from story
                    crusadeSelect.value = this.editingStory.crusade_key || '';
                } else if (this.contextData.crusadeKey) {
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

    async loadStoryForEditing() {
        if (!this.contextData.storyKey) return;

        try {
            const story = await UnifiedCache.getRowByKey('stories', this.contextData.storyKey);
            if (!story) {
                console.error('Story not found for editing:', this.contextData.storyKey);
                this.showEditPermissionError('Story not found');
                return;
            }

            // Check if the active user has permission to edit this story
            await this.checkEditPermission(story);

            // Store the story data for use in form submission
            this.editingStory = story;

            // Populate form fields with existing story data
            this.populateFormWithStoryData(story);

        } catch (error) {
            console.error('Error loading story for editing:', error);
            this.showEditPermissionError('Error loading story for editing');
        }
    }

    async checkEditPermission(story) {
        // Wait for UserManager to be ready
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (attempts < maxAttempts) {
            if (typeof UserManager !== 'undefined' && UserManager.getCurrentUser) {
                const activeUser = UserManager.getCurrentUser();
                if (activeUser) {
                    // Check if active user matches story user
                    if (activeUser.user_key !== story.user_key) {
                        this.showEditPermissionError('You do not have permission to edit this story');
                        return;
                    }
                    // Permission granted, continue with editing
                    return;
                }
            }
            
            // Wait 100ms before trying again
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // If UserManager never becomes ready, show error
        this.showEditPermissionError('Unable to verify user permissions');
    }

    showEditPermissionError(message) {
        const container = CoreUtils.dom.getElement('story-content');
        if (container) {
            container.innerHTML = `
                <div class="error-container">
                    <h2>Access Denied</h2>
                    <p>${message}</p>
                    <a href="../index.html" class="back-button">← Back to Campaign Tracker</a>
                </div>
            `;
        }
    }

    populateFormWithStoryData(story) {
        // Populate basic fields
        const titleField = CoreUtils.dom.getElement('title');
        if (titleField) titleField.value = story.title || '';

        const storyTypeField = CoreUtils.dom.getElement('story-type');
        if (storyTypeField) storyTypeField.value = story.story_type || '';

        // Handle Imperial date parsing for edit mode
        if (story.imperial_date) {
            const parsedDate = this.parseImperialDate(story.imperial_date);
            if (parsedDate) {
                const checkField = CoreUtils.dom.getElement('imperial-check');
                const yearField = CoreUtils.dom.getElement('imperial-year');
                const fractionField = CoreUtils.dom.getElement('imperial-fraction');
                const millenniumSelect = CoreUtils.dom.getElement('imperial-millennium');
                const customMillenniumInput = CoreUtils.dom.getElement('imperial-millennium-custom');
                
                if (checkField) checkField.value = parsedDate.check;
                if (yearField) yearField.value = parsedDate.year;
                if (fractionField) fractionField.value = parsedDate.fraction;
                
                // Handle millennium (check if it's a standard option or custom)
                if (millenniumSelect) {
                    const standardMillennia = ['M30', 'M31', 'M32', 'M33', 'M34', 'M35', 'M36', 'M37', 'M38', 'M39', 'M40', 'M41', 'M42'];
                    if (standardMillennia.includes(parsedDate.millennium)) {
                        millenniumSelect.value = parsedDate.millennium;
                        millenniumSelect.style.display = 'block';
                        if (customMillenniumInput) customMillenniumInput.style.display = 'none';
                    } else {
                        // Custom millennium
                        millenniumSelect.value = 'custom';
                        millenniumSelect.style.display = 'none';
                        if (customMillenniumInput) {
                            customMillenniumInput.value = parsedDate.millennium;
                            customMillenniumInput.style.display = 'block';
                        }
                    }
                }
                
                // Update the hidden field
                this.updateImperialDateString();
            }
        }

        // Populate story text fields
        const storyText1Field = CoreUtils.dom.getElement('story-text-1');
        if (storyText1Field) storyText1Field.value = story.story_text_1 || '';

        const storyText2Field = CoreUtils.dom.getElement('story-text-2');
        if (storyText2Field) storyText2Field.value = story.story_text_2 || '';

        const storyText3Field = CoreUtils.dom.getElement('story-text-3');
        if (storyText3Field) storyText3Field.value = story.story_text_3 || '';

        // Populate image fields
        const image1Field = CoreUtils.dom.getElement('image-1');
        if (image1Field) image1Field.value = story.image_1 || '';

        const image2Field = CoreUtils.dom.getElement('image-2');
        if (image2Field) image2Field.value = story.image_2 || '';

        const image3Field = CoreUtils.dom.getElement('image-3');
        if (image3Field) image3Field.value = story.image_3 || '';

        // Populate link fields
        const textLinkField = CoreUtils.dom.getElement('text-link');
        if (textLinkField) textLinkField.value = story.text_link || '';

        const audioLinkField = CoreUtils.dom.getElement('audio-link');
        if (audioLinkField) audioLinkField.value = story.audio_link || '';

        // Store the original story data for comparison
        this.originalStoryData = { ...story };
    }

    async selectForcesForEditMode() {
        if (!this.editingStory) return;

        try {
            // Load the story-forces relationships to get all associated forces
            const storyForces = await UnifiedCache.getAllRows('xref_story_forces');
            const relatedForces = storyForces.filter(sf => sf.story_key === this.editingStory.story_key);
            
            const forceSelect = document.getElementById('force-select');
            if (forceSelect && relatedForces.length > 0) {
                // Select all forces associated with this story
                relatedForces.forEach(relation => {
                    const option = Array.from(forceSelect.options).find(opt => opt.value === relation.force_key);
                    if (option) option.selected = true;
                });
            }
        } catch (error) {
            console.error('Error selecting forces for edit mode:', error);
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
        const baseFormData = super.gatherFormData();

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
        
        // Use existing story key in edit mode, generate new one for new stories
        const storyKey = this.contextData.isEditMode ? this.contextData.storyKey : KeyUtils.generateStoryKey(userKey, baseFormData.title || 'Untitled');

        // Get form field values
        const title = document.getElementById('title')?.value || '';
        const storyType = document.getElementById('story-type')?.value || '';
        const imperialDate = document.getElementById('imperial-date')?.value || '';
        const storyText1 = document.getElementById('story-text-1')?.value || '';
        const storyText2 = document.getElementById('story-text-2')?.value || '';
        const storyText3 = document.getElementById('story-text-3')?.value || '';
        const image1 = document.getElementById('image-1')?.value || '';
        const image2 = document.getElementById('image-2')?.value || '';
        const image3 = document.getElementById('image-3')?.value || '';
        const audioLink = document.getElementById('audio-link')?.value || '';
        const textLink = document.getElementById('text-link')?.value || '';
        const crusadeKey = document.getElementById('crusade-select')?.value || '';

        const formData = {
            key: storyKey,
            userKey: userKey,
            userName: userName,
            author_name: userName, // Add author_name for the new column
            // Note: force_key is not stored in main stories table - handled via junction table
            // Store array of selected forces for junction table
            selectedForces: selectedForces,
            // Crusade key
            crusade_key: crusadeKey || this.contextData.crusadeKey || (this.contextData.isEditMode && this.originalStoryData ? this.originalStoryData.crusade_key : '') || '',
            // Battle key (for POV stories)
            battle_key: this.contextData.battleKey || (this.contextData.isEditMode && this.originalStoryData ? this.originalStoryData.battle_key : '') || '',
            // Story content fields
            story_text_1: storyText1,
            story_text_2: storyText2,
            story_text_3: storyText3,
            // Other fields
            story_type: storyType,
            title: title,
            imperial_date: imperialDate,
            image_1: image1,
            image_2: image2,
            image_3: image3,
            audio_link: audioLink,
            text_link: textLink
        };

        // In edit mode, ensure we have the story_key and user_key for the update operation
        if (this.contextData.isEditMode && this.originalStoryData) {
            // Use the current form values as-is - don't try to "preserve" original data
            // The form should reflect what the user wants to save
            console.log('Edit mode: Using current form values for story update');
        }

        // Add explicit story_key and user_key for edit operations
        if (this.contextData.isEditMode) {
            formData.story_key = storyKey;
            formData.user_key = userKey;
        }

        return formData;
    }

    /**
     * Submit to Google Sheets (override to parse response properly)
     */
    async submitToGoogleSheets(data) {
        if (!this.config.submitUrl) {
            throw new Error('Submit URL not configured');
        }

        // Add operation parameter for edit mode
        if (this.contextData.isEditMode) {
            data.operation = 'edit';
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