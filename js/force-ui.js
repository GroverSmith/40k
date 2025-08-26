// filename: force-ui.js
// UI rendering and DOM manipulation for Force Details
// 40k Crusade Campaign Tracker

const ForceUI = {
    /**
     * Update the force header with data
     */
    updateHeader(forceData) {
        const header = document.getElementById('force-header');
        const launchDate = this.formatLaunchDate(forceData.timestamp);
        
        header.innerHTML = `
            <h1>${forceData.forceName}</h1>
            <div class="force-subtitle">
                ${forceData.faction}${forceData.detachment ? ` - ${forceData.detachment}` : ''} • Commanded by ${forceData.playerName}
            </div>
            ${launchDate ? `<div class="force-launch-date">Crusade Force Launched on ${launchDate}</div>` : ''}
        `;
        
        // Update page title
        document.title = `${forceData.forceName} - Crusade Force`;
    },
    
    /**
     * Update force statistics display
     */
    updateStats(forceData) {
        const totalBattles = (forceData.battlesWon || 0) + 
                          (forceData.battlesLost || 0) + 
                          (forceData.battlesTied || 0);
        
        document.getElementById('battles-fought').textContent = totalBattles || 0;
        document.getElementById('victories').textContent = forceData.battlesWon || 0;
        document.getElementById('battle-losses').textContent = forceData.battlesLost || 0;
        document.getElementById('battle-ties').textContent = forceData.battlesTied || 0;
        
        // Show the stats section
        document.getElementById('force-stats').style.display = 'grid';
    },
    
    /**
     * Display army lists in a table format
     */
    displayArmyLists(armyLists, forceName) {
        const container = document.getElementById('army-lists-sheet');
        console.log('Displaying army lists data:', armyLists);
        
        let html = '<div class="army-lists-display">';
        
        if (armyLists.length === 0) {
            html += `
                <div class="no-data-message">
                    <p>📋 No army lists found for <strong>${forceName}</strong>.</p>
                    <p><a href="../army-lists/add-army-list.html" style="color: #4ecdc4;">Add your first army list</a> to get started!</p>
                </div>
            `;
        } else {
            html += '<div class="army-lists-table-wrapper" style="max-height: 400px; overflow-y: auto; border: 1px solid #4a4a4a; border-radius: 4px; background-color: #2a2a2a;">';
            html += '<table class="sheets-table" style="width: 100%; border-collapse: collapse;">';
            
            // Header
            html += `
                <tr style="background-color: #3a3a3a; position: sticky; top: 0;">
                    <th style="padding: 8px 12px; color: #4ecdc4; border-bottom: 2px solid #4ecdc4;">Army Name</th>
                    <th style="padding: 8px 12px; color: #4ecdc4; border-bottom: 2px solid #4ecdc4;">Detachment</th>
                    <th style="padding: 8px 12px; color: #4ecdc4; border-bottom: 2px solid #4ecdc4;">MFM</th>
                    <th style="padding: 8px 12px; color: #4ecdc4; border-bottom: 2px solid #4ecdc4;">Points</th>
                    <th style="padding: 8px 12px; color: #4ecdc4; border-bottom: 2px solid #4ecdc4;">Date Added</th>
                </tr>
            `;
            
            // Data rows
            armyLists.forEach((armyList, index) => {
                console.log(`Army List ${index}:`, armyList);
                
                const timestamp = armyList.Timestamp ? new Date(armyList.Timestamp).toLocaleDateString() : 'Unknown';
                const points = armyList['Points Value'] || '-';
                const detachment = armyList.Detachment || '-';
                const mfmVersion = armyList['MFM Version'] || '-';
                const armyName = armyList['Army Name'] || 'Unnamed List';
                
                let armyListId = armyList.id;
                
                // Debug logging
                console.log(`Army "${armyName}" has ID:`, armyListId);
                
                if (!armyListId) {
                    console.warn(`No ID found for army list "${armyName}". This will cause linking issues.`);
                    armyListId = `missing-id-${index}`;
                }
                
                // Create link to view army list
                const armyNameLink = `<a href="../army-lists/view-army-list.html?id=${encodeURIComponent(armyListId)}" 
                                        style="color: #4ecdc4; text-decoration: none; transition: color 0.3s ease;"
                                        onmouseover="this.style.color='#7fefea'" 
                                        onmouseout="this.style.color='#4ecdc4'"
                                        title="View full army list details">${armyName}</a>`;
                
                html += `
                    <tr style="border-bottom: 1px solid #4a4a4a; color: #ffffff;">
                        <td style="padding: 8px 12px;">${armyNameLink}</td>
                        <td style="padding: 8px 12px;">${detachment}</td>
                        <td style="padding: 8px 12px;">${mfmVersion}</td>
                        <td style="padding: 8px 12px;">${points}</td>
                        <td style="padding: 8px 12px;">${timestamp}</td>
                    </tr>
                `;
            });
            
            html += '</table>';
            html += '</div>';
            
            html += `<div class="sheets-stats" style="margin-top: 10px; padding: 10px; background-color: #3a3a3a; border-radius: 4px; color: #cccccc; font-size: 12px;">
                📋 Showing ${armyLists.length} army list${armyLists.length !== 1 ? 's' : ''} for ${forceName}
            </div>`;
        }
        
        html += '</div>';
        container.innerHTML = html;
        
        // Show the section
        document.getElementById('army-lists-section').style.display = 'block';
    },
    
    /**
     * Display placeholder for unimplemented sections
     */
    displayPlaceholder(containerId, sheetType, forceName, icon = '📊', description = '') {
        const container = document.getElementById(containerId);
        const sheetTypeDisplay = sheetType.replace(/([A-Z])/g, ' $1').trim();
        
        container.innerHTML = `
            <div class="no-data-message">
                <p>${icon} ${sheetTypeDisplay} ${description || 'will be displayed here'}.</p>
                <p>This would show data for <strong>${forceName}</strong>.</p>
                <p><em>Configure ${sheetType} URL in CrusadeConfig to enable this feature.</em></p>
            </div>
        `;
    },
    
    /**
     * Show section
     */
    showSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
        }
    },
    
    /**
     * Show error state
     */
    showError(message) {
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-text').textContent = message;
        
        // Hide other sections
        document.getElementById('force-header').style.display = 'none';
        document.getElementById('force-stats').style.display = 'none';
        document.getElementById('battle-history-section').style.display = 'none';
        document.getElementById('army-lists-section').style.display = 'none';
        document.getElementById('characters-units-section').style.display = 'none';
        document.getElementById('stories-section').style.display = 'none';
        document.getElementById('force-logs-section').style.display = 'none';
    },
    
    /**
     * Show data error in specific container
     */
    showDataError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="sheets-error">
                    <strong>Error:</strong> ${message}
                </div>
            `;
        }
    },
    
    /**
     * Format launch date
     */
    formatLaunchDate(dateString) {
        if (!dateString) return null;
        
        try {
            const date = new Date(dateString);
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return null;
            }
            
            // Format as "dd MMM yyyy"
            const day = String(date.getDate()).padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            
            return `${day} ${month} ${year}`;
        } catch (error) {
            console.warn('Launch date formatting error:', error);
            return null;
        }
    }
};

// Make globally available
window.ForceUI = ForceUI;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForceUI;
}

console.log('ForceUI module loaded');