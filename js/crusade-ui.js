// filename: crusade-ui.js
// UI rendering and DOM manipulation for Crusade Details using Key System
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
        const crusadeKey = crusadeData.key || crusadeData.Key || '';
        
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
            ${crusadeKey ? `<div class="crusade-key">Key: ${crusadeKey}</div>` : ''}
        `;
    },
    
    /**
     * Display participants in table
     */
    displayParticipants(participantsData, crusadeName) {
        const container = document.getElementById('participants-container');
        
        if (!participantsData || participantsData.length <= 1) {
            container.innerHTML = '<p class="no-data">No forces registered for this crusade yet.</p>';
            return;
        }
        
        // Build participants table with force keys
        let tableHTML = `
            <table class="participants-table">
                <thead>
                    <tr>
                        <th>Force Name</th>
                        <th>Player</th>
                        <th>Faction</th>
                        <th>Created</th>
                        <th>Last Battle</th>
                        <th>Battles</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Skip header row and process participants
        participantsData.slice(1).forEach(row => {
            // Extract key and force data
            const forceKey = row[0] || '';
            const forceName = row[1] || '';
            const userName = row[2] || '';
            const faction = row[3] || '';
            const createDate = this.formatDate(row[4]);
            const lastBattle = this.formatDate(row[5]);
            const battleCount = row[6] || 0;
            
            if (forceKey && forceName) {
                // Create link to force details using the key
                const forceUrl = `force-details.html?force=${encodeURIComponent(forceKey)}`;
                
                tableHTML += `
                    <tr>
                        <td><a href="${forceUrl}" class="force-link">${forceName}</a></td>
                        <td>${userName}</td>
                        <td>${faction}</td>
                        <td>${createDate || '-'}</td>
                        <td>${lastBattle || 'No battles yet'}</td>
                        <td class="text-center">${battleCount}</td>
                        <td class="text-center">
                            <a href="${forceUrl}" class="btn btn-small btn-primary">View Force</a>
                        </td>
                    </tr>
                `;
            }
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
        
        // Add table sorting functionality
        this.setupTableSorting();
    },
    
    /**
     * Display crusade rules
     */
    displayRules(rulesData) {
        const container = document.getElementById('rules-container');
        
        if (!rulesData || rulesData.length <= 1) {
            container.innerHTML = '<p class="no-data">No special rules for this crusade.</p>';
            return;
        }
        
        let rulesHTML = '<div class="rules-list">';
        
        // Skip header row
        rulesData.slice(1).forEach(row => {
            const ruleName = row[0];
            const description = row[1];
            
            if (ruleName) {
                rulesHTML += `
                    <div class="rule-item">
                        <h3>${ruleName}</h3>
                        <p>${description || ''}</p>
                    </div>
                `;
            }
        });
        
        rulesHTML += '</div>';
        container.innerHTML = rulesHTML;
    },
    
    /**
     * Display crusade schedule
     */
    displaySchedule(scheduleData) {
        const container = document.getElementById('schedule-container');
        
        if (!scheduleData || scheduleData.length <= 1) {
            container.innerHTML = '<p class="no-data">No scheduled events for this crusade.</p>';
            return;
        }
        
        let scheduleHTML = `
            <table class="schedule-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Event</th>
                        <th>Location</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Skip header row
        scheduleData.slice(1).forEach(row => {
            const date = this.formatDate(row[0]);
            const event = row[1];
            const location = row[2];
            const notes = row[3];
            
            if (date || event) {
                scheduleHTML += `
                    <tr>
                        <td>${date || '-'}</td>
                        <td>${event || '-'}</td>
                        <td>${location || '-'}</td>
                        <td>${notes || ''}</td>
                    </tr>
                `;
            }
        });
        
        scheduleHTML += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = scheduleHTML;
    },
    
    /**
     * Setup table sorting
     */
    setupTableSorting() {
        const table = document.querySelector('.participants-table');
        if (!table) return;
        
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            // Skip the Actions column
            if (index === headers.length - 1) return;
            
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                this.sortTable(table, index);
            });
        });
    },
    
    /**
     * Sort table by column
     */
    sortTable(table, columnIndex) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        // Determine sort direction
        const isAscending = table.dataset.sortColumn == columnIndex && 
                          table.dataset.sortDirection === 'asc';
        
        // Sort rows
        rows.sort((a, b) => {
            const aValue = a.cells[columnIndex].textContent.trim();
            const bValue = b.cells[columnIndex].textContent.trim();
            
            // Handle numeric columns
            if (columnIndex === 5) { // Battles column
                return isAscending ? 
                    Number(aValue) - Number(bValue) : 
                    Number(bValue) - Number(aValue);
            }
            
            // Handle text columns
            if (isAscending) {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });
        
        // Update table
        rows.forEach(row => tbody.appendChild(row));
        
        // Update sort indicators
        table.dataset.sortColumn = columnIndex;
        table.dataset.sortDirection = isAscending ? 'desc' : 'asc';
        
        // Update header indicators
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            header.classList.remove('sort-asc', 'sort-desc');
            if (index === columnIndex) {
                header.classList.add(isAscending ? 'sort-desc' : 'sort-asc');
            }
        });
    },
    
    /**
     * Show loading state
     */
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="loading">Loading...</div>';
        }
    },
    
    /**
     * Show error state
     */
    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="error-message">${message}</div>`;
        }
    },
    
    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    },	
	

   /**
	 * Display introduction section
	 */
	displayIntroduction(crusadeData) {
		const container = document.getElementById('introduction-content');
		const section = document.getElementById('introduction-section');
		if (!container || !section) return;
		
		const introduction = crusadeData['Introduction'] || '';
		if (introduction) {
			container.innerHTML = `<div class="introduction-text">${introduction}</div>`;
			section.style.display = 'block'; // Show the section
		} else {
			container.innerHTML = '<p class="no-data">No introduction available for this crusade.</p>';
			section.style.display = 'block'; // Show even if no data
		}
	},

	/**
	 * Display rules section
	 */
	displayRules(crusadeData) {
		const container = document.getElementById('rules-content');
		const section = document.getElementById('rules-section');
		if (!container || !section) return;
		
		let rulesHTML = '';
		const rulesBlock1 = crusadeData['Rules Block 1'] || '';
		const rulesBlock2 = crusadeData['Rules Block 2'] || '';
		const rulesBlock3 = crusadeData['Rules Block 3'] || '';
		
		if (rulesBlock1 || rulesBlock2 || rulesBlock3) {
			rulesHTML = '<div class="rules-blocks">';
			if (rulesBlock1) rulesHTML += `<div class="rule-block">${rulesBlock1}</div>`;
			if (rulesBlock2) rulesHTML += `<div class="rule-block">${rulesBlock2}</div>`;
			if (rulesBlock3) rulesHTML += `<div class="rule-block">${rulesBlock3}</div>`;
			rulesHTML += '</div>';
		} else {
			rulesHTML = '<p class="no-data">No special rules for this crusade.</p>';
		}
		
		container.innerHTML = rulesHTML;
		section.style.display = 'block'; // Show the section
	},

	/**
	 * Display narrative section
	 */
	displayNarrative(crusadeData) {
		const container = document.getElementById('narrative-content');
		const section = document.getElementById('narrative-section');
		if (!container || !section) return;
		
		let narrativeHTML = '';
		const narrativeBlock1 = crusadeData['Narrative Block 1'] || '';
		const narrativeBlock2 = crusadeData['Narrative Block 2'] || '';
		
		if (narrativeBlock1 || narrativeBlock2) {
			narrativeHTML = '<div class="narrative-blocks">';
			if (narrativeBlock1) narrativeHTML += `<div class="narrative-block">${narrativeBlock1}</div>`;
			if (narrativeBlock2) narrativeHTML += `<div class="narrative-block">${narrativeBlock2}</div>`;
			narrativeHTML += '</div>';
		} else {
			narrativeHTML = '<p class="no-data">No narrative content available for this crusade.</p>';
		}
		
		container.innerHTML = narrativeHTML;
		section.style.display = 'block'; // Show the section
	},

	/**
	 * Display participating forces
	 */
	displayParticipatingForces(forces, crusadeName) {
		const container = document.getElementById('forces-content');
		const section = document.getElementById('forces-section');
		if (!container || !section) return;
		
		if (!forces || forces.length === 0) {
			container.innerHTML = '<p class="no-data">No forces registered for this crusade yet.</p>';
			section.style.display = 'block'; // Show the section
			return;
		}
        
        // Store data globally for sorting
        window.participantsTableData = forces.map(force => [
            force['Force Name'] || '',
            force['User Name'] || '',
            force.Timestamp || new Date(),
            force['Force Key'] || force.Key || ''
        ]);
        
        // Create table HTML
        let html = `
            <table id="participants-table" class="sheets-table">
                <thead>
                    <tr>
                        <th onclick="sortParticipantsTable(0)" style="cursor: pointer;">
                            Force Name <span class="sort-indicator">⇅</span>
                        </th>
                        <th onclick="sortParticipantsTable(1)" style="cursor: pointer;">
                            Player <span class="sort-indicator">⇅</span>
                        </th>
                        <th onclick="sortParticipantsTable(2)" style="cursor: pointer;">
                            Registered <span class="sort-indicator">⇅</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Add rows
        forces.forEach(force => {
            const forceName = force['Force Name'] || '';
            const userName = force['User Name'] || '';
            const registrationDate = new Date(force.Timestamp || Date.now()).toLocaleDateString();
            const forceKey = force['Force Key'] || force.Key || '';
            
            // Create link to force details page using key
            const forceUrl = CrusadeConfig.buildForceUrlFromSubdir(forceKey);
            const forceNameLink = `<a href="${forceUrl}" 
                                    style="color: #4ecdc4; text-decoration: none;"
                                    title="View ${forceName} details">${forceName}</a>`;
            
            html += `
                <tr>
                    <td>${forceNameLink}</td>
                    <td>${userName}</td>
                    <td>${registrationDate}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
		section.style.display = 'block'; // Show the section at the end
    },
    
    /**
     * Show data error
     */
    showDataError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<p class="error-message">${message}</p>`;
        }
    }
};

// Make globally available
window.CrusadeUI = CrusadeUI;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrusadeUI;
}

console.log('CrusadeUI module loaded');
	
	
