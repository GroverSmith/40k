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
            
            if (forceKeys.length === 0) {
                forcesContent.innerHTML = `
                    <div class="no-data-message">
                        <p>⚔️ No forces registered for this crusade yet.</p>
                        <p>Click "Register Force" above to add a force to this crusade.</p>
                    </div>
                `;
                return;
            }
            
            // Create table structure similar to other sheets
            let html = '<div class="participating-forces">';
            html += '<div class="sheets-table-wrapper" style="max-height: 400px; overflow-y: auto; border: 1px solid #4a4a4a; border-radius: 4px; background-color: #2a2a2a;">';
            html += '<table class="sheets-table" style="width: 100%; border-collapse: collapse;" id="participants-table">';
            
            // Header row
            html += `
                <thead>
                <tr style="background-color: #3a3a3a; position: sticky; top: 0;">
                    <th style="padding: 8px 12px; color: #4ecdc4; border-bottom: 2px solid #4ecdc4; cursor: pointer; user-select: none; position: relative; padding-right: 25px;" onclick="sortParticipantsTable(0)">
                        Force Name
                        <span class="sort-indicator" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #cccccc;">⇅</span>
                    </th>
                    <th style="padding: 8px 12px; color: #4ecdc4; border-bottom: 2px solid #4ecdc4; cursor: pointer; user-select: none; position: relative; padding-right: 25px;" onclick="sortParticipantsTable(1)">
                        Player
                        <span class="sort-indicator" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #cccccc;">⇅</span>
                    </th>
                    <th style="padding: 8px 12px; color: #4ecdc4; border-bottom: 2px solid #4ecdc4; cursor: pointer; user-select: none; position: relative; padding-right: 25px;" onclick="sortParticipantsTable(2)">
                        Registered
                        <span class="sort-indicator" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #cccccc;">⇅</span>
                    </th>
                </tr>
                </thead>
                <tbody>
            `;
            
            // Data rows
            forceKeys.forEach(force => {
                const registrationDate = new Date(force.timestamp).toLocaleDateString();
                const forceName = force.forceName || KeyUtils.getForceNameFromKey(force.crusadeForceKey);
                const userName = force.userName || KeyUtils.getUserNameFromKey(force.crusadeForceKey);
                
                // Create link to force details page using the force name
                const forceUrl = CrusadeConfig.buildForceUrlFromSubdir(forceName);
                const forceNameLink = `<a href="${forceUrl}" 
                                        style="color: #4ecdc4; text-decoration: none; transition: color 0.3s ease;"
                                        onmouseover="this.style.color='#7fefea'" 
                                        onmouseout="this.style.color='#4ecdc4'"
                                        title="View ${forceName} details">${forceName}</a>`;
                
                html += `
                    <tr style="border-bottom: 1px solid #4a4a4a; color: #ffffff;" onmouseover="this.style.backgroundColor='#3a3a3a'" onmouseout="this.style.backgroundColor=''">
                        <td style="padding: 8px 12px;">${forceNameLink}</td>
                        <td style="padding: 8px 12px;">${userName}</td>
                        <td style="padding: 8px 12px;">${registrationDate}</td>
                    </tr>
                `;
            });
            
            html += '</tbody>';
            
            html += '</table>';
            html += '</div>'; // Close table wrapper
            
            // Add stats like other sheets
            html += `<div class="sheets-stats" style="margin-top: 10px; padding: 10px; background-color: #3a3a3a; border-radius: 4px; color: #cccccc; font-size: 12px;">
                ⚔️ Showing ${forceKeys.length} registered force${forceKeys.length !== 1 ? 's' : ''} for ${this.crusadeData['Crusade Name']}
            </div>`;
            
            html += '</div>';
            
            forcesContent.innerHTML = html;
            
            // Store the data for sorting
            window.participantsTableData = forceKeys.map(force => [
                force.forceName || KeyUtils.getForceNameFromKey(force.crusadeForceKey),
                force.userName || KeyUtils.getUserNameFromKey(force.crusadeForceKey),
                force.timestamp
            ]);
            
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
        
        // Show modal immediately with loading state
        forceSelect.innerHTML = '<option value="">Loading forces...</option>';
        modal.style.display = 'flex';
        
        // Load available forces
        try {
            // FIXED: Changed from 'crusadeForces' to 'forces'
            const forcesUrl = CrusadeConfig.getSheetUrl('forces');
            
            if (!forcesUrl) {
                throw new Error('Forces sheet not configured');
            }
            
            // Try to get cached data first
            const cacheKey = 'forces_cache_global';
            const cached = localStorage.getItem(cacheKey);
            let data = null;
            
            if (cached) {
                try {
                    const cachedData = JSON.parse(cached);
                    const cacheAge = Date.now() - cachedData.timestamp;
                    const cacheMaxAge = (CrusadeConfig.getCacheConfig('default') || 1440) * 60 * 1000; // Convert minutes to ms
                    
                    if (cacheAge < cacheMaxAge) {
                        console.log(`Using cached forces data (${Math.round(cacheAge / 60000)} minutes old)`);
                        data = cachedData.data;
                    } else {
                        console.log('Forces cache expired, fetching fresh data');
                    }
                } catch (e) {
                    console.warn('Error reading forces cache:', e);
                }
            }
            
            // If no valid cache, fetch fresh data
            if (!data) {
                console.log('Fetching fresh forces data...');
                const response = await fetch(forcesUrl);
                const responseData = await response.json();
                
                if (Array.isArray(responseData)) {
                    data = responseData;
                } else if (responseData.success && Array.isArray(responseData.data)) {
                    data = responseData.data;
                } else {
                    throw new Error('Unable to load forces data');
                }
                
                // Cache the data for future use
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        data: data,
                        timestamp: Date.now()
                    }));
                    console.log('Forces data cached for future use');
                } catch (e) {
                    console.warn('Error caching forces data:', e);
                }
            }
            
            // Clear existing options
            forceSelect.innerHTML = '<option value="">Select a force...</option>';
            
            // Add force options
            // Updated column indices for new sheet structure:
            // Column 0: User Name, Column 1: Force Name, Column 2: Faction
            data.slice(1).forEach(row => {
                if (row[0] && row[1]) { // userName and forceName
                    // Create force key using our key system
                    const forceKey = KeyUtils.createForceKey(row[1], row[0], row[5]); // forceName, userName, timestamp
                    const displayName = `${row[1]} (${row[0]})${row[2] ? ` - ${row[2]}` : ''}`; // Force Name (User Name) - Faction
                    
                    const option = document.createElement('option');
                    option.value = forceKey;
                    option.textContent = displayName;
                    option.setAttribute('data-force-name', row[1]); // Store force name for later use
                    option.setAttribute('data-user-name', row[0]); // Store user name for later use
                    forceSelect.appendChild(option);
                }
            });

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
            
            // Get the force name and user name from the selected option
            const forceSelect = document.getElementById('force-select');
            const selectedOption = forceSelect.options[forceSelect.selectedIndex];
            const forceName = selectedOption.getAttribute('data-force-name') || KeyUtils.getForceNameFromKey(forceKey);
            const userName = selectedOption.getAttribute('data-user-name') || KeyUtils.getUserNameFromKey(forceKey);
            
            const participantsUrl = CrusadeConfig.getSheetUrl('crusadeParticipants');
            
            if (!participantsUrl) {
                throw new Error('Crusade Participants sheet not configured');
            }
            
            // Submit registration
            const registrationData = {
                crusadeName: this.crusadeData['Crusade Name'],
                crusadeForceKey: forceKey,
                forceName: forceName,
                userName: userName
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

// Global sorting variables for participants table
let participantsSortColumn = null;
let participantsSortDirection = 'asc';

// Global function for sorting participants table
function sortParticipantsTable(columnIndex) {
    if (!window.participantsTableData) return;
    
    // Toggle sort direction if clicking the same column
    if (participantsSortColumn === columnIndex) {
        participantsSortDirection = participantsSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        participantsSortColumn = columnIndex;
        participantsSortDirection = 'asc';
    }
    
    // Sort the data
    const sortedData = [...window.participantsTableData];
    sortedData.sort((a, b) => {
        let aVal = a[columnIndex] || '';
        let bVal = b[columnIndex] || '';
        
        // Special handling for dates (column 2 is timestamp)
        if (columnIndex === 2) {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
            
            if (participantsSortDirection === 'asc') {
                return aVal - bVal;
            } else {
                return bVal - aVal;
            }
        } else {
            // String sort for other columns
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
            
            if (participantsSortDirection === 'asc') {
                return aVal.localeCompare(bVal);
            } else {
                return bVal.localeCompare(aVal);
            }
        }
    });
    
    // Update the table display
    updateParticipantsTableDisplay(sortedData);
    
    // Update sort indicators
    updateSortIndicators(columnIndex, participantsSortDirection);
}

function updateParticipantsTableDisplay(sortedData) {
    const tbody = document.querySelector('#participants-table tbody');
    if (!tbody) {
        // If no tbody exists, we need to rebuild the table
        rebuildParticipantsTable(sortedData);
        return;
    }
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Add sorted rows
    sortedData.forEach(rowData => {
        const registrationDate = new Date(rowData[2]).toLocaleDateString();
        const forceName = rowData[0];
        const userName = rowData[1];
        
        // Create link to force details page
        const forceUrl = CrusadeConfig.buildForceUrlFromSubdir(forceName);
        const forceNameLink = `<a href="${forceUrl}" 
                                style="color: #4ecdc4; text-decoration: none; transition: color 0.3s ease;"
                                onmouseover="this.style.color='#7fefea'" 
                                onmouseout="this.style.color='#4ecdc4'"
                                title="View ${forceName} details">${forceName}</a>`;
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #4a4a4a';
        row.style.color = '#ffffff';
        row.onmouseover = () => row.style.backgroundColor = '#3a3a3a';
        row.onmouseout = () => row.style.backgroundColor = '';
        
        row.innerHTML = `
            <td style="padding: 8px 12px;">${forceNameLink}</td>
            <td style="padding: 8px 12px;">${userName}</td>
            <td style="padding: 8px 12px;">${registrationDate}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function rebuildParticipantsTable(sortedData) {
    // This function rebuilds the entire table - used as fallback
    // We'd need access to the crusade app instance to call displayParticipatingForces
    // For now, just log that we need to rebuild
    console.log('Table rebuild needed - refreshing participating forces');
    if (window.CrusadeDetailsApp && window.CrusadeDetailsApp.loadParticipatingForces) {
        window.CrusadeDetailsApp.loadParticipatingForces();
    }
}

function updateSortIndicators(activeColumn, direction) {
    // Reset all indicators
    const indicators = document.querySelectorAll('.sort-indicator');
    indicators.forEach((indicator, index) => {
        if (index === activeColumn) {
            indicator.innerHTML = direction === 'asc' ? '▲' : '▼';
            indicator.style.color = '#4ecdc4';
        } else {
            indicator.innerHTML = '⇅';
            indicator.style.color = '#cccccc';
        }
    });
    
    // Update header classes
    const headers = document.querySelectorAll('#participants-table th');
    headers.forEach((header, index) => {
        header.className = '';
        if (index === activeColumn) {
            header.className = `sort-${direction}`;
        }
    });
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