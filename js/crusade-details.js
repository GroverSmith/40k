// filename: crusade-details.js
// Crusade Details Page - Individual crusade campaign data management
// 40k Crusade Campaign Tracker

class CrusadeDetailsApp {
    constructor() {
        this.crusadeName = null;
        this.crusadeData = null;
        this.init();
    }
    
    init() {
        // Wait for config to be available
        if (typeof CrusadeConfig === 'undefined') {
            this.showError('Configuration not loaded. Please refresh the page.');
            return;
        }
        
        // Get crusade name from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.crusadeName = urlParams.get('crusade') || urlParams.get('name');
        
        if (!this.crusadeName) {
            this.showError('No crusade specified. Please select a crusade from the main page.');
            return;
        }
        
        // Decode the crusade name (in case it was URL encoded)
        this.crusadeName = decodeURIComponent(this.crusadeName);
        
        console.log('Loading data for crusade:', this.crusadeName);
        this.loadCrusadeData();
    }
    
    async loadCrusadeData() {
        try {
            console.log('Starting loadCrusadeData...');
            
            // Load main crusade data
            console.log('Loading main crusade data...');
            await this.loadMainCrusadeData();
            console.log('Main crusade data loaded successfully');
            
            // Load participating forces
            console.log('Loading participating forces...');
            await this.loadParticipatingForces();
            console.log('Participating forces loaded');
            
            console.log('All data loading complete!');
            
        } catch (error) {
            console.error('Error in loadCrusadeData:', error);
            this.showError('Failed to load crusade data: ' + error.message);
        }
    }
    
    async loadMainCrusadeData() {
        const crusadeSheetUrl = CrusadeConfig.getSheetUrl('crusades');
        
        if (!crusadeSheetUrl) {
            throw new Error('Crusades sheet URL not configured in CrusadeConfig');
        }
        
        // Use the GET endpoint to fetch specific crusade by name
        const fetchUrl = `${crusadeSheetUrl}?action=get&name=${encodeURIComponent(this.crusadeName)}`;
        
        const response = await fetch(fetchUrl);
        
        if (!response.ok) {
            throw new Error('Failed to fetch crusade data');
        }
        
        const responseData = await response.json();
        
        console.log('Crusade API response:', responseData);
        
        if (!responseData.success || !responseData.data) {
            throw new Error(responseData.error || 'Crusade not found');
        }
        
        this.crusadeData = responseData.data;
        
        console.log('Successfully found and loaded crusade data:', this.crusadeData);
        
        this.updateCrusadeHeader();
        this.displayCrusadeContent();
    }
    
    updateCrusadeHeader() {
        const header = document.getElementById('crusade-header');
        
        const crusadeName = this.crusadeData['Crusade Name'] || this.crusadeName;
        const crusadeType = this.crusadeData['Crusade Type'] || '';
        const startDate = this.formatDate(this.crusadeData['Start Date']);
        const endDate = this.formatDate(this.crusadeData['End Date']);
        const state = this.crusadeData['State'] || 'Unknown';
        
        let dateString = '';
        if (startDate && endDate) {
            dateString = `${startDate} - ${endDate}`;
        } else if (startDate) {
            dateString = `Started ${startDate}`;
        } else if (endDate) {
            dateString = `Ends ${endDate}`;
        }
        
        header.innerHTML = `
            <h1>${crusadeName}</h1>
            <div class="crusade-subtitle">${crusadeType}</div>
            ${dateString ? `<div class="crusade-dates">${dateString}</div>` : ''}
            <div class="crusade-status status-${state.toLowerCase()}">${state.toUpperCase()}</div>
        `;
        
        // Update page title
        document.title = `${crusadeName} - Crusade Details`;
    }
    
    displayCrusadeContent() {
        // Display Introduction
        this.displayIntroduction();
        
        // Display Rules
        this.displayRules();
        
        // Display Narrative
        this.displayNarrative();
        
        // Show sections
        document.getElementById('introduction-section').style.display = 'block';
        document.getElementById('rules-section').style.display = 'block';
        document.getElementById('narrative-section').style.display = 'block';
        document.getElementById('forces-section').style.display = 'block';
    }
    
    displayIntroduction() {
        const introContent = document.getElementById('introduction-content');
        const introduction = this.crusadeData['Introduction'];
        
        if (introduction && introduction.trim()) {
            introContent.innerHTML = `
                <div class="content-block">
                    ${this.formatText(introduction)}
                </div>
            `;
        } else {
            introContent.innerHTML = `
                <div class="no-data-message">
                    <p>No introduction provided for this crusade.</p>
                </div>
            `;
        }
    }
    
    displayRules() {
        const rulesContent = document.getElementById('rules-content');
        const rules = [];
        
        // Collect all rules blocks
        for (let i = 1; i <= 3; i++) {
            const ruleBlock = this.crusadeData[`Rules Block ${i}`];
            if (ruleBlock && ruleBlock.trim()) {
                rules.push({
                    title: `Rules Block ${i}`,
                    content: ruleBlock
                });
            }
        }
        
        if (rules.length > 0) {
            let html = '';
            rules.forEach((rule, index) => {
                html += `
                    <div class="content-block">
                        ${rules.length > 1 ? `<h4>${rule.title}</h4>` : ''}
                        ${this.formatText(rule.content)}
                    </div>
                `;
            });
            rulesContent.innerHTML = html;
        } else {
            rulesContent.innerHTML = `
                <div class="no-data-message">
                    <p>No special rules defined for this crusade.</p>
                </div>
            `;
        }
    }
    
    displayNarrative() {
        const narrativeContent = document.getElementById('narrative-content');
        const narratives = [];
        
        // Collect all narrative blocks
        for (let i = 1; i <= 2; i++) {
            const narrativeBlock = this.crusadeData[`Narrative Block ${i}`];
            if (narrativeBlock && narrativeBlock.trim()) {
                narratives.push({
                    title: `Narrative Block ${i}`,
                    content: narrativeBlock
                });
            }
        }
        
        if (narratives.length > 0) {
            let html = '';
            narratives.forEach((narrative, index) => {
                html += `
                    <div class="content-block">
                        ${narratives.length > 1 ? `<h4>${narrative.title}</h4>` : ''}
                        ${this.formatText(narrative.content)}
                    </div>
                `;
            });
            narrativeContent.innerHTML = html;
        } else {
            narrativeContent.innerHTML = `
                <div class="no-data-message">
                    <p>No narrative content available for this crusade.</p>
                </div>
            `;
        }
    }
    
    async loadParticipatingForces() {
        try {
            const forcesContent = document.getElementById('forces-content');
            
            const crusadeForcesUrl = CrusadeConfig.getSheetUrl('crusadeForces');
            
            if (crusadeForcesUrl) {
                // For now, we'll show all forces since we don't have a crusade filter
                // In the future, you might want to add a "Crusade" column to the Crusade Forces sheet
                forcesContent.innerHTML = `
                    <div class="no-data-message">
                        <p>⚔️ Forces participating in this crusade will be shown here.</p>
                        <p>To link forces to specific crusades, consider adding a "Crusade" column to your Crusade Forces sheet.</p>
                        <p><em>For now, you can view all forces on the <a href="../index.html" style="color: #4ecdc4;">main page</a>.</em></p>
                    </div>
                `;
            } else {
                forcesContent.innerHTML = `
                    <div class="no-data-message">
                        <p>⚔️ Participating forces will be displayed here.</p>
                        <p><em>Configure crusadeForces URL in CrusadeConfig to enable this feature.</em></p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading participating forces:', error);
            this.showDataError('forces-content', 'Failed to load participating forces');
        }
    }
    
    formatDate(dateValue) {
        if (!dateValue) return null;
        
        try {
            let date;
            
            if (dateValue instanceof Date) {
                date = dateValue;
            } else if (typeof dateValue === 'string') {
                date = new Date(dateValue);
            } else if (typeof dateValue === 'number') {
                // Excel/Google Sheets serial date number
                date = new Date((dateValue - 25569) * 86400 * 1000);
            } else {
                return String(dateValue);
            }
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return String(dateValue);
            }
            
            // Format as "dd MMM yyyy" (e.g., "15 Jan 2024")
            const day = String(date.getDate()).padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            
            return `${day} ${month} ${year}`;
        } catch (error) {
            console.warn('Date formatting error:', error);
            return String(dateValue);
        }
    }
    
    formatText(text) {
        if (!text) return '';
        
        // Convert line breaks to paragraphs
        const paragraphs = text.toString().split('\n\n');
        
        return paragraphs
            .map(paragraph => {
                const trimmed = paragraph.trim();
                if (!trimmed) return '';
                
                // Convert single line breaks to <br> within paragraphs
                const formatted = trimmed.replace(/\n/g, '<br>');
                
                return `<p>${formatted}</p>`;
            })
            .filter(p => p)
            .join('');
    }
    
    showError(message) {
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-text').textContent = message;
        
        // Hide other sections
        document.getElementById('crusade-header').style.display = 'none';
        document.getElementById('introduction-section').style.display = 'none';
        document.getElementById('rules-section').style.display = 'none';
        document.getElementById('narrative-section').style.display = 'none';
        document.getElementById('forces-section').style.display = 'none';
    }
    
    showDataError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <strong>Error:</strong> ${message}
                </div>
            `;
        }
    }
    
    // Public methods for debugging
    refreshCrusade() {
        console.log('Refreshing crusade data...');
        this.loadCrusadeData();
    }
    
    getCrusadeData() {
        return this.crusadeData;
    }
}

// Initialize the crusade details app when page loads
document.addEventListener('DOMContentLoaded', () => {
    const crusadeApp = new CrusadeDetailsApp();
    
    // Make it globally available for debugging
    window.CrusadeDetailsApp = crusadeApp;
    
    console.log('Crusade Details page initialized');
});

// Utility functions for crusade page
const CrusadePageUtils = {
    // Convert crusade name to URL parameter
    createCrusadeUrl(crusadeName, basePath = 'crusades/') {
        const encodedName = encodeURIComponent(crusadeName);
        return `${basePath}crusade-details.html?crusade=${encodedName}`;
    },
    
    // Get current crusade name from URL
    getCurrentCrusadeName() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('crusade') || urlParams.get('name');
    }
};

// Export for use in other modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CrusadeDetailsApp, CrusadePageUtils };
}