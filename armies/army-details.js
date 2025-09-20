// filename: armies/army-details.js
// Army List Viewer - Display full army list content
// 40k Crusade Campaign Tracker

class ArmyDetails {
    constructor() {
        this.armyKey = null;
        this.armyData = null;
        this.init();
    }
    
    async init() {
        // Wait for config to be available
        if (typeof CrusadeConfig === 'undefined') {
            this.showError('Configuration not loaded. Please refresh the page.');
            return;
        }
        
        // Get army list ID from URL parameter using utility
        this.armyKey = getUrlKey('key');
        
        if (!this.armyKey) {
            this.showError('No army list specified. Please select an army list to view.');
            return;
        }
        
        console.log('Loading army list ID:', this.armyKey);
        await this.loadArmyData();
    }
    
    async loadArmyData() {
        try {
            // Use UnifiedCache to get the specific army
            const army = await UnifiedCache.getRowByKey('armies', this.armyKey);
            
            if (army) {
                this.armyData = army;
                this.displayArmy();
                return;
            }

            // If not found, get all armies to show available keys in error message
            const allArmies = await UnifiedCache.getAllRows('armies');
            const availableKeys = allArmies.map(a => a.army_key).join(', ');
            
            throw new Error(`Army "${this.armyKey}" not found. Available armies: ${availableKeys}`);

        } catch (error) {
            console.error('Error loading army list:', error);
            this.showError('Error loading army list');
        }
    }

    
    displayArmy() {
        // Hide loading state and show content using utility
        toggleLoadingState('loading-state', 'army-list-content', true);
        
        // Update page title
        const armyName = this.armyData.army_name || 'Unnamed Army List';
        document.title = `${armyName} - Army List Viewer`;
        
        // Update header using utility
        const forceName = this.armyData.force_name || 'Unknown Force';
        const faction = this.armyData.faction || 'Unknown Faction';
        setElementTexts({
            'army-list-title': armyName,
            'army-list-subtitle': `${forceName} • ${faction}`
        });
        
        // Update metadata
        this.displayMetadata();
        
        // Display army list text
        const armyListText = this.armyData.army_list_text || 'No army list content available.';
        const charCount = armyListText.length.toLocaleString();
        setElementTexts({
            'army-list-text': armyListText,
            'character-count': `${charCount} characters`
        });
        
        // Set up back to force button
        const backBtn = CoreUtils.dom.getElement('back-to-force-btn');
        const forceKey = this.armyData.force_key;
        if (forceKey && forceName && forceName !== 'Unknown Force') {
            // Use CrusadeConfig to build the URL with proper relative path from armies directory
            const forceUrl = CrusadeConfig.buildForceUrlFromSubdir(forceKey);
            backBtn.href = forceUrl;
            backBtn.textContent = `← Back to ${forceName}`;
        } else {
            backBtn.href = '../index.html';
            backBtn.textContent = '← Back to Campaign Tracker';
        }
        
        // Set up edit and delete buttons with permission checking
        // Wait a bit longer for UserManager to be ready
        setTimeout(() => {
            this.setupActionButtons();
        }, 2000);
        
        // Also listen for user changes to update button visibility
        window.addEventListener('userChanged', () => {
            this.setupActionButtons();
        });
    }
    
    displayMetadata() {
        const metaContainer = CoreUtils.dom.getElement('army-list-meta');
        
        // Prepare metadata items
        const metaItems = [
            {
                label: 'Force Name',
                value: this.armyData.force_name || 'Unknown'
            },
            {
                label: 'Player',
                value: this.armyData.user_name || 'Unknown'
            },
            {
                label: 'Faction',
                value: this.armyData.faction || 'Unknown'
            },
            {
                label: 'Detachment',
                value: this.armyData.detachment || 'Not specified'
            },
            {
                label: 'Points Value',
                value: this.armyData.points_value ? 
                       parseInt(this.armyData.points_value).toLocaleString() + ' pts' : 
                       'Not specified'
            },
            {
                label: 'MFM Version',
                value: this.armyData.mfm_version || 'Not specified'
            },
            {
                label: 'Date Added',
                value: this.armyData.timestamp ? 
                       new Date(this.armyData.timestamp).toLocaleDateString() : 
                       'Unknown'
            }
        ];
        
        // Add notes if available
        const notes = this.armyData.notes;
        if (notes && notes.trim()) {
            metaItems.push({
                label: 'Notes',
                value: notes
            });
        }
        
        // Generate HTML for metadata
        let html = '';
        metaItems.forEach(item => {
            html += `
                <div class="meta-card">
                    <div class="meta-label">${item.label}</div>
                    <div class="meta-value">${item.value}</div>
                </div>
            `;
        });
        
        metaContainer.innerHTML = html;
    }
    
    setupActionButtons() {
        // Wait for UserManager to be available
        this.waitForUserManagerAndSetupButtons();
    }
    
    async waitForUserManagerAndSetupButtons() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (attempts < maxAttempts) {
            if (typeof UserManager !== 'undefined' && UserManager.getCurrentUser) {
                const currentUser = UserManager.getCurrentUser();
                this.configureActionButtons(currentUser);
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('UserManager not ready after 5 seconds, action buttons will not be configured');
        // Even if UserManager isn't ready, let's try to configure buttons with no user
        this.configureActionButtons(null);
    }
    
    configureActionButtons(currentUser) {
        const editBtn = CoreUtils.dom.getElement('edit-army-btn');
        const deleteBtn = CoreUtils.dom.getElement('delete-army-btn');
        
        // Check if current user owns this army
        // Only use the user_key field for security - no fallbacks
        const armyUserKey = this.armyData.user_key;
        const canEdit = currentUser && armyUserKey && currentUser.key === armyUserKey;
        
        console.log('Button permission check:', {
            currentUser: currentUser ? currentUser.key : 'none',
            armyUserKey: armyUserKey,
            canEdit: canEdit,
            armyData: this.armyData
        });
        
        if (editBtn) {
            if (canEdit) {
                // Show edit button and set up click handler
                CoreUtils.dom.show(editBtn);
                editBtn.addEventListener('click', () => {
                    // For now, navigate to army-add with the army key for editing
                    // This can be enhanced later to support proper editing
                    const params = new URLSearchParams({
                        army_key: this.armyKey,
                        edit: 'true'
                    });
                    window.location.href = `army-add.html?${params.toString()}`;
                });
            } else {
                // Hide edit button if user doesn't have permission
                CoreUtils.dom.hide(editBtn);
            }
        }
        
        if (deleteBtn) {
            if (canEdit) {
                // Show delete button and set up click handler
                CoreUtils.dom.show(deleteBtn);
                deleteBtn.addEventListener('click', () => {
                    this.confirmDelete();
                });
            } else {
                // Hide delete button if user doesn't have permission
                CoreUtils.dom.hide(deleteBtn);
            }
        }
    }
    
    confirmDelete() {
        // Check permissions before allowing delete
        const currentUser = UserManager.getCurrentUser();
        const canEdit = currentUser && currentUser.key === this.armyData.user_key;
        
        if (!canEdit) {
            alert('You do not have permission to delete this army.');
            return;
        }
        
        const armyName = this.armyData.army_name || 'this army';
        if (confirm(`Are you sure you want to delete "${armyName}"? This action cannot be undone.`)) {
            this.deleteArmy();
        }
    }
    
    async deleteArmy() {
        const deleteBtn = CoreUtils.dom.getElement('delete-army-btn');
        const originalText = deleteBtn ? deleteBtn.textContent : '';
        
        try {
            // Show loading state on button
            if (deleteBtn) {
                deleteBtn.textContent = 'Deleting...';
                deleteBtn.disabled = true;
            }
            
            // Call the delete API using form data to avoid CORS preflight
            const formData = new FormData();
            formData.append('operation', 'delete');
            formData.append('army_key', this.armyKey);
            formData.append('user_key', this.armyData.user_key);
            
            const response = await fetch(CrusadeConfig.getSheetUrl('armies'), {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Clear cache and redirect to force page
                await UnifiedCache.clearCache('armies');
                
                // Redirect to the force page
                const forceKey = this.armyData.force_key;
                if (forceKey) {
                    const forceUrl = CrusadeConfig.buildForceUrlFromSubdir(forceKey);
                    window.location.href = forceUrl;
                } else {
                    window.location.href = '../index.html';
                }
            } else {
                throw new Error(result.message || 'Delete failed');
            }
            
        } catch (error) {
            console.error('Error deleting army:', error);
            alert('Failed to delete army: ' + error.message);
            
            // Restore button state
            if (deleteBtn) {
                deleteBtn.textContent = originalText;
                deleteBtn.disabled = false;
            }
        }
    }
    
    showError(message) {
        // Use utility for standard error handling
        showDetailsError(message, 'error-message', ['loading-state', 'army-list-content']);
        CoreUtils.dom.show('error-state');
    }
}

// Global utility functions
function copyToClipboard() {
    const armyListText = document.getElementById('army-list-text').textContent;
    
    if (navigator.clipboard && window.isSecureContext) {
        // Use the modern clipboard API
        navigator.clipboard.writeText(armyListText).then(() => {
            showCopySuccess();
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            fallbackCopyToClipboard(armyListText);
        });
    } else {
        // Fallback for older browsers
        fallbackCopyToClipboard(armyListText);
    }
}

function fallbackCopyToClipboard(text) {
    // Create a temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopySuccess();
        } else {
            showCopyError();
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
        showCopyError();
    }
    
    document.body.removeChild(textArea);
}

function showCopySuccess() {
    const button = document.querySelector('[onclick="copyToClipboard()"]');
    const originalText = button.innerHTML;
    button.innerHTML = '✅ Copied!';
    button.style.backgroundColor = '#4ecdc4';
    button.style.color = '#ffffff';
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.backgroundColor = '';
        button.style.color = '';
    }, 2000);
}

function showCopyError() {
    const button = document.querySelector('[onclick="copyToClipboard()"]');
    const originalText = button.innerHTML;
    button.innerHTML = '❌ Copy Failed';
    button.style.backgroundColor = '#cc6666';
    button.style.color = '#ffffff';
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.backgroundColor = '';
        button.style.color = '';
    }, 2000);
    
    // Show manual copy instructions
    alert('Unable to copy automatically. Please manually select and copy the army list text.');
}

// Initialize the army list viewer when page loads
document.addEventListener('DOMContentLoaded', () => {
    const app = new ArmyDetails();
    
    // Make it globally available for debugging
    window.armyDetails = app;
    
    console.log('Army List Viewer initialized');
});