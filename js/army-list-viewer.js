// filename: army-list-viewer.js
// Army List Viewer - Display full army list content
// 40k Crusade Campaign Tracker

class ArmyListViewer {
    constructor() {
        this.armyListId = null;
        this.armyListData = null;
        this.init();
    }
    
    init() {
        // Wait for config to be available
        if (typeof CrusadeConfig === 'undefined') {
            this.showError('Configuration not loaded. Please refresh the page.');
            return;
        }
        
        // Get army list ID from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.armyListId = urlParams.get('id');
        
        if (!this.armyListId) {
            this.showError('No army list specified. Please select an army list to view.');
            return;
        }
        
        console.log('Loading army list ID:', this.armyListId);
        this.loadArmyList();
    }
    
    async loadArmyList() {
        try {
            const armyListUrl = CrusadeConfig.getSheetUrl('armyLists');
            
            if (!armyListUrl) {
                throw new Error('Army Lists sheet URL not configured');
            }
            
            // Use the GET endpoint to fetch specific army list by ID
            const fetchUrl = `${armyListUrl}?action=get&id=${encodeURIComponent(this.armyListId)}`;
            
            const response = await fetch(fetchUrl);
            const data = await response.json();
            
            if (data.success && data.data) {
                this.armyListData = data.data;
                this.displayArmyList();
            } else {
                throw new Error(data.error || 'Army list not found');
            }
            
        } catch (error) {
            console.error('Error loading army list:', error);
            this.showError('Failed to load army list: ' + error.message);
        }
    }
    
    displayArmyList() {
        // Hide loading state and show content
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('army-list-content').style.display = 'block';
        
        // Update page title
        const armyName = this.armyListData['Army Name'] || 'Unnamed Army List';
        document.title = `${armyName} - Army List Viewer`;
        
        // Update header
        document.getElementById('army-list-title').textContent = armyName;
        
        const forceName = this.armyListData['Force Name'] || 'Unknown Force';
        const faction = this.armyListData.Faction || 'Unknown Faction';
        document.getElementById('army-list-subtitle').textContent = `${forceName} • ${faction}`;
        
        // Update metadata
        this.displayMetadata();
        
        // Display army list text
        const armyListText = this.armyListData['Army List Text'] || 'No army list content available.';
        document.getElementById('army-list-text').textContent = armyListText;
        
        // Update character count
        const charCount = armyListText.length.toLocaleString();
        document.getElementById('character-count').textContent = `${charCount} characters`;
        
        // Set up back to force button
        const backBtn = document.getElementById('back-to-force-btn');
        if (forceName && forceName !== 'Unknown Force') {
            // Use CrusadeConfig to build the URL with proper relative path from army-lists directory
            const forceUrl = CrusadeConfig.buildForceUrlFromSubdir(forceName);
            backBtn.href = forceUrl;
            backBtn.textContent = `← Back to ${forceName}`;
        } else {
            backBtn.href = '../index.html';
            backBtn.textContent = '← Back to Campaign Tracker';
        }
    }
    
    displayMetadata() {
        const metaContainer = document.getElementById('army-list-meta');
        
        // Prepare metadata items
        const metaItems = [
            {
                label: 'Force Name',
                value: this.armyListData['Force Name'] || 'Unknown'
            },
            {
                label: 'Player',
                value: this.armyListData['User Name'] || 'Unknown'
            },
            {
                label: 'Faction',
                value: this.armyListData.Faction || 'Unknown'
            },
            {
                label: 'Detachment',
                value: this.armyListData.Detachment || 'Not specified'
            },
            {
                label: 'Points Value',
                value: this.armyListData['Points Value'] ? 
                       parseInt(this.armyListData['Points Value']).toLocaleString() + ' pts' : 
                       'Not specified'
            },
            {
                label: 'MFM Version',
                value: this.armyListData['MFM Version'] || 'Not specified'
            },
            {
                label: 'Date Added',
                value: this.armyListData.Timestamp ? 
                       new Date(this.armyListData.Timestamp).toLocaleDateString() : 
                       'Unknown'
            }
        ];
        
        // Add notes if available
        if (this.armyListData.Notes && this.armyListData.Notes.trim()) {
            metaItems.push({
                label: 'Notes',
                value: this.armyListData.Notes
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
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('army-list-content').style.display = 'none';
        document.getElementById('error-state').style.display = 'block';
        document.getElementById('error-message').textContent = message;
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
    const viewer = new ArmyListViewer();
    
    // Make it globally available for debugging
    window.ArmyListViewer = viewer;
    
    console.log('Army List Viewer initialized');
});