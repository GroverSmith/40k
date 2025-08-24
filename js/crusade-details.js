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
        
        // Set up force registration
        this.setupForceRegistration();
        
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
                    content: ruleBlock
                });
            }
        }
        
        if (rules.length > 0) {
            let html = '';
            rules.forEach((rule, index) => {
                html += `
                    <div class="content-block">
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
                    content: narrativeBlock
                });
            }
        }
        
        if (narratives.length > 0) {
            let html = '';
            narratives.forEach((narrative, index) => {
                html += `
                    <div class="content-block">
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
            
            const participantsUrl = CrusadeConfig.getSheetUrl('crusadeParticipants');
            
            if (participantsUrl) {
                // Get forces registered for this specific crusade
                const fetchUrl = `${participantsUrl}?action=forces-for-crusade&crusade=${encodeURIComponent(this.crusadeData['Crusade Name'])}`;
                
                const response = await fetch(fetchUrl);
                const data = await response.json();
                
                if (data.success && data.forces && data.forces.length > 0) {
                    await this.displayParticipatingForces(data.forces);
                } else {
                    forcesContent.innerHTML = `
                        <div class="no-data-message">
                            <p>⚔️ No forces registered for this crusade yet.</p>
                            <p>Click "Register Force" above to add a force to this crusade.</p>
                        </div>
                    `;
                }
            } else {
                forcesContent.innerHTML = `
                    <div class="no-data-message">
                        <p>⚔️ Participating forces will be displayed here.</p>
                        <p><em>Configure crusadeParticipants URL in CrusadeConfig to enable this feature.</em></p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading participating forces:', error);
            this.showDataError('forces-content', 'Failed to load participating forces');
        }
    }
    
    async displayParticipatingForces(forceKeys) {
        try {
            const forcesContent = document.getElementById('forces-content');
            
            // We need to look up the actual force details using the force keys
            // For now, we'll display the force keys and mention that full force lookup is needed
            let html = '<div class="participating-forces">';
            html += '<p>📋 <strong>Registered Forces:</strong></p>';
            html += '<ul>';
            
            forceKeys.forEach(force => {
                const shortKey = KeyUtils.getShortHash(force.crusadeForceKey);
                const registrationDate = new Date(force.timestamp).toLocaleDateString();
                
                html += `
                    <li style="margin-bottom: 10px; padding: 10px; background-color: #1a1a1a; border-radius: 5px; border-left: 3px solid #4ecdc4;">
                        <strong>Force Key:</strong> ${shortKey}<br>
                        <small style="color: #aaa;">Registered: ${registrationDate}</small>
                        <br><small style="color: #888; font-style: italic;">
                            Full force details lookup will be implemented in the next update
                        </small>
                    </li>
                `;
            });
            
            html += '</ul>';
            html += '</div>';
            
            forcesContent.innerHTML = html;
            
        } catch (error) {
            console.error('Error displaying participating forces:', error);
            this.showDataError('forces-content', 'Failed to display participating forces');
        }
    }
    
    setupForceRegistration() {
        const registerBtn = document.getElementById('register-force-btn');
        const form = document.getElementById('register-force-form');
        
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                this.showRegisterModal();
            });
        }
        
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleForceRegistration();
            });
        }
    }
    
    async showRegisterModal() {
        const modal = document.getElementById('register-force-modal');
        const forceSelect = document.getElementById('force-select');
        
        // Load available forces
        try {
            const crusadeForcesUrl = CrusadeConfig.getSheetUrl('crusadeForces');
            
            if (!crusadeForcesUrl) {
                throw new Error('Crusade Forces sheet not configured');
            }
            
            const response = await fetch(crusadeForcesUrl);
            const responseData = await response.json();
            
            let data;
            if (Array.isArray(responseData)) {
                data = responseData;
            } else if (responseData.success && Array.isArray(responseData.data)) {
                data = responseData.data;
            } else {
                throw new Error('Unable to load forces data');
            }
            
            // Clear existing options
            forceSelect.innerHTML = '<option value="">Select a force...</option>';
            
            // Add force options
            data.slice(1).forEach(row => {
                if (row[1] && row[2]) { // userName and forceName
                    // Create force key using our key system
                    const forceKey = KeyUtils.createForceKey(row[2], row[1], row[0]); // forceName, userName, timestamp
                    const displayName = `${row[2]} (${row[1]})${row[3] ? ` - ${row[3]}` : ''}`; // Force Name (Player) - Faction
                    
                    const option = document.createElement('option');
                    option.value = forceKey;
                    option.textContent = displayName;
                    forceSelect.appendChild(option);
                }
            });
            
            modal.style.display = 'flex';
            
        } catch (error) {
            console.error('Error loading forces:', error);
            this.showRegisterError('Failed to load available forces: ' + error.message);
        }
    }
    
    async handleForceRegistration() {
        const form = document.getElementById('register-force-form');
        const submitBtn = document.getElementById('register-submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            
            const formData = new FormData(form);
            const forceKey = formData.get('forceKey');
            
            if (!forceKey) {
                throw new Error('Please select a force');
            }
            
            const participantsUrl = CrusadeConfig.getSheetUrl('crusadeParticipants');
            
            if (!participantsUrl) {
                throw new Error('Crusade Participants sheet not configured');
            }
            
            // Submit registration
            const registrationData = {
                crusadeName: this.crusadeData['Crusade Name'],
                crusadeForceKey: forceKey
            };
            
            // Create form for submission (to handle CORS issues)
            const hiddenForm = document.createElement('form');
            hiddenForm.method = 'POST';
            hiddenForm.action = participantsUrl;
            hiddenForm.target = 'register-submit-frame';
            hiddenForm.style.display = 'none';
            
            Object.entries(registrationData).forEach(([key, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                hiddenForm.appendChild(input);
            });
            
            // Create iframe for submission
            let iframe = document.getElementById('register-submit-frame');
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.name = 'register-submit-frame';
                iframe.id = 'register-submit-frame';
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
            }
            
            document.body.appendChild(hiddenForm);
            
            // Handle response
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Registration timeout'));
                }, 15000);
                
                iframe.onload = () => {
                    clearTimeout(timeout);
                    try {
                        const response = iframe.contentWindow.document.body.textContent;
                        const result = JSON.parse(response);
                        
                        if (result.success) {
                            this.showRegisterSuccess();
                            this.closeRegisterModal();
                            this.loadParticipatingForces(); // Refresh the forces list
                        } else {
                            throw new Error(result.error || 'Registration failed');
                        }
                    } catch (error) {
                        // Assume success if we can't read the response (CORS)
                        console.log('Could not read response, assuming success');
                        this.showRegisterSuccess();
                        this.closeRegisterModal();
                        this.loadParticipatingForces();
                    }
                    
                    document.body.removeChild(hiddenForm);
                    resolve();
                };
                
                hiddenForm.submit();
            });
            
        } catch (error) {
            console.error('Error registering force:', error);
            this.showRegisterError(error.message);
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }
    
    closeRegisterModal() {
        document.getElementById('register-force-modal').style.display = 'none';
    }
    
    showRegisterSuccess() {
        const message = document.getElementById('register-success-message');
        message.style.display = 'block';
        
        setTimeout(() => {
            message.style.display = 'none';
        }, 5000);
    }
    
    showRegisterError(errorText) {
        const message = document.getElementById('register-error-message');
        const errorTextEl = document.getElementById('register-error-text');
        
        errorTextEl.textContent = errorText;
        message.style.display = 'block';
        
        setTimeout(() => {
            message.style.display = 'none';
        }, 8000);
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

// Global functions for modal control
function closeRegisterModal() {
    document.getElementById('register-force-modal').style.display = 'none';
}

// Close modal when clicking outside of it
window.addEventListener('click', function(event) {
    const modal = document.getElementById('register-force-modal');
    if (event.target === modal) {
        closeRegisterModal();
    }
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