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
            const armyListUrl = CrusadeConfig.getSheetUrl('armies');
            
            if (!armyListUrl) {
                throw new Error('Army Lists sheet URL not configured');
            }
            
            // Use the GET endpoint to fetch specific army list by ID
            const fetchUrl = `${armyListUrl}?action=get&key=${encodeURIComponent(this.armyKey)}`;
            
            // Use utility for standard data fetching
            this.armyData = await fetchEntityData(fetchUrl, 'army list');
            this.displayArmy();
            
        } catch (error) {
            console.error('Error loading army list:', error);
            this.showError('Failed to load army list: ' + error.message);
        }
    }
    
    displayArmy() {
        // Hide loading state and show content using utility
        toggleLoadingState('loading-state', 'army-list-content', true);
        
        // Update page title
        const armyName = this.armyData['Army Name'] || 'Unnamed Army List';
        document.title = `${armyName} - Army List Viewer`;
        
        // Update header using utility
        const forceName = this.armyData['Force Name'] || 'Unknown Force';
        const faction = this.armyData.Faction || 'Unknown Faction';
        setElementTexts({
            'army-list-title': armyName,
            'army-list-subtitle': `${forceName} • ${faction}`
        });
        
        // Update metadata
        this.displayMetadata();
        
        // Display army list text
        const armyListText = this.armyData['Army List Text'] || 'No army list content available.';
        const charCount = armyListText.length.toLocaleString();
        setElementTexts({
            'army-list-text': armyListText,
            'character-count': `${charCount} characters`
        });
        
        // Set up back to force button
        const backBtn = CoreUtils.dom.getElement('back-to-force-btn');
        if (forceName && forceName !== 'Unknown Force') {
            // Use CrusadeConfig to build the URL with proper relative path from armies directory
            const forceUrl = CrusadeConfig.buildForceUrlFromSubdir(forceName);
            backBtn.href = forceUrl;
            backBtn.textContent = `← Back to ${forceName}`;
        } else {
            backBtn.href = '../index.html';
            backBtn.textContent = '← Back to Campaign Tracker';
        }
    }
    
    displayMetadata() {
        const metaContainer = CoreUtils.dom.getElement('army-list-meta');
        
        // Prepare metadata items
        const metaItems = [
            {
                label: 'Force Name',
                value: this.armyData['Force Name'] || 'Unknown'
            },
            {
                label: 'Player',
                value: this.armyData['User Name'] || 'Unknown'
            },
            {
                label: 'Faction',
                value: this.armyData.Faction || 'Unknown'
            },
            {
                label: 'Detachment',
                value: this.armyData.Detachment || 'Not specified'
            },
            {
                label: 'Points Value',
                value: this.armyData['Points Value'] ? 
                       parseInt(this.armyData['Points Value']).toLocaleString() + ' pts' : 
                       'Not specified'
            },
            {
                label: 'MFM Version',
                value: this.armyData['MFM Version'] || 'Not specified'
            },
            {
                label: 'Date Added',
                value: this.armyData.Timestamp ? 
                       new Date(this.armyData.Timestamp).toLocaleDateString() : 
                       'Unknown'
            }
        ];
        
        // Add notes if available
        if (this.armyData.Notes && this.armyData.Notes.trim()) {
            metaItems.push({
                label: 'Notes',
                value: this.armyData.Notes
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