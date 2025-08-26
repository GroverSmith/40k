// filename: crusade-ui.js
// UI rendering and DOM manipulation for Crusade Details
// 40k Crusade Campaign Tracker

const CrusadeUI = {
    /**
     * Update the crusade header with data
     */
    updateHeader(crusadeData, crusadeName) {
        const header = document.getElementById('crusade-header');
        
        const name = crusadeData['Crusade Name'] || crusadeName;
        const crusadeType = crusadeData['Crusade Type'] || '';
        const startDate = this.formatDate(crusadeData['Start Date']);
        const endDate = this.formatDate(crusadeData['End Date']);
        const state = crusadeData['State'] || 'Unknown';
        
        let dateString = '';
        if (startDate && endDate) {
            dateString = `${startDate} - ${endDate}`;
        } else if (startDate) {
            dateString = `Started ${startDate}`;
        } else if (endDate) {
            dateString = `Ends ${endDate}`;
        }
        
        header.innerHTML = `
            <h1>${name}</h1>
            <div class="crusade-subtitle">${crusadeType}</div>
            ${dateString ? `<div class="crusade-dates">${dateString}</div>` : ''}
            <div class="crusade-status status-${state.toLowerCase()}">${state.toUpperCase()}</div>
        `;
        
        // Update page title
        document.title = `${name} - Crusade Details`;
    },
    
    /**
     * Display introduction section
     */
    displayIntroduction(crusadeData) {
        const introContent = document.getElementById('introduction-content');
        const introduction = crusadeData['Introduction'];
        
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
        
        document.getElementById('introduction-section').style.display = 'block';
    },
    
    /**
     * Display rules section
     */
    displayRules(crusadeData) {
        const rulesContent = document.getElementById('rules-content');
        const rules = [];
        
        // Collect all rules blocks
        for (let i = 1; i <= 3; i++) {
            const ruleBlock = crusadeData[`Rules Block ${i}`];
            if (ruleBlock && ruleBlock.trim()) {
                rules.push({ content: ruleBlock });
            }
        }
        
        if (rules.length > 0) {
            let html = '';
            rules.forEach((rule) => {
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
        
        document.getElementById('rules-section').style.display = 'block';
    },
    
    /**
     * Display narrative section
     */
    displayNarrative(crusadeData) {
        const narrativeContent = document.getElementById('narrative-content');
        const narratives = [];
        
        // Collect all narrative blocks
        for (let i = 1; i <= 2; i++) {
            const narrativeBlock = crusadeData[`Narrative Block ${i}`];
            if (narrativeBlock && narrativeBlock.trim()) {
                narratives.push({ content: narrativeBlock });
            }
        }
        
        if (narratives.length > 0) {
            let html = '';
            narratives.forEach((narrative) => {
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
        
        document.getElementById('narrative-section').style.display = 'block';
    },
    
    /**
     * Display participating forces table
     */
    displayParticipatingForces(forces, crusadeName) {
        const forcesContent = document.getElementById('forces-content');
        
        if (!forces || forces.length === 0) {
            forcesContent.innerHTML = `
                <div class="no-data-message">
                    <p>⚔️ No forces registered for this crusade yet.</p>
                    <p>Click "Register Force" above to add a force to this crusade.</p>
                </div>
            `;
            return;
        }
        
        // Create table structure
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
        forces.forEach(force => {
            const registrationDate = new Date(force.timestamp).toLocaleDateString();
            const forceName = force.forceName || KeyUtils.getForceNameFromKey(force.crusadeForceKey);
            const userName = force.userName || KeyUtils.getUserNameFromKey(force.crusadeForceKey);
            
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
        
        html += '</tbody></table></div>';
        
        // Add stats
        html += `<div class="sheets-stats" style="margin-top: 10px; padding: 10px; background-color: #3a3a3a; border-radius: 4px; color: #cccccc; font-size: 12px;">
            ⚔️ Showing ${forces.length} registered force${forces.length !== 1 ? 's' : ''} for ${crusadeName}
        </div>`;
        
        html += '</div>';
        
        forcesContent.innerHTML = html;
        
        // Store data for sorting
        window.participantsTableData = forces.map(force => [
            force.forceName || KeyUtils.getForceNameFromKey(force.crusadeForceKey),
            force.userName || KeyUtils.getUserNameFromKey(force.crusadeForceKey),
            force.timestamp
        ]);
        
        document.getElementById('forces-section').style.display = 'block';
    },
    
    /**
     * Show loading state
     */
    showLoading(elementId, message = 'Loading...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="loading-spinner"></div>
                <span>${message}</span>
            `;
        }
    },
    
    /**
     * Show error state
     */
    showError(message) {
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-text').textContent = message;
        
        // Hide other sections
        document.getElementById('crusade-header').style.display = 'none';
        document.getElementById('introduction-section').style.display = 'none';
        document.getElementById('rules-section').style.display = 'none';
        document.getElementById('narrative-section').style.display = 'none';
        document.getElementById('forces-section').style.display = 'none';
    },
    
    /**
     * Show data error in specific container
     */
    showDataError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <strong>Error:</strong> ${message}
                </div>
            `;
        }
    },
    
    /**
     * Format date for display
     */
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
            
            // Format as "dd MMM yyyy"
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
    },
    
    /**
     * Format text with line breaks
     */
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
};

// Make globally available
window.CrusadeUI = CrusadeUI;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrusadeUI;
}

console.log('CrusadeUI module loaded');