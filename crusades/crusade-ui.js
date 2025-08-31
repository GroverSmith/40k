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
        const startDate = formatDate(crusadeData['Start Date']);
        const endDate = formatDate(crusadeData['End Date']);
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
	 * Display stories for the crusade
	 */
	async displayStories(crusadeKey) {
		const container = document.getElementById('stories-content') || document.getElementById('stories-sheet');
		const section = document.getElementById('stories-section');
		if (!container || !section) return;
		
		// Show the section
		section.style.display = 'block';
		
		// Load stories using StoriesDisplay module
		if (typeof StoriesDisplay !== 'undefined') {
			await StoriesDisplay.loadCrusadeStories(crusadeKey, container);
		} else {
			container.innerHTML = '<p class="no-data">Stories module not loaded.</p>';
		}
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
            const createDate = formatDate(row[4]);
            const lastBattle = formatDate(row[5]);
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
            const date = formatDate(row[0]);
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
    },

    /**
     * Display battle history for the crusade
     */
    async displayBattleHistory(crusadeKey) {
        const container = document.getElementById('battle-history-content');
        const section = document.getElementById('battle-history-section');
        if (!container || !section) return;

        try {
            // Show loading state
            container.innerHTML = `
                <div class="loading-spinner"></div>
                <span>Loading battle history...</span>
            `;
            section.style.display = 'block';

            // Get battle history URL
            const battleUrl = CrusadeConfig.getSheetUrl('battleHistory');
            if (!battleUrl) {
                container.innerHTML = '<p class="no-data">Battle history not configured.</p>';
                return;
            }

            // Fetch battle data using CacheManager
            const response = await CacheManager.fetchWithCache(battleUrl, 'battleHistory');
            
            if (!response || response.length <= 1) {
                container.innerHTML = '<p class="no-data">No battles recorded for this crusade yet.</p>';
                return;
            }

            // Filter battles by crusade key (column 17)
            const crusadeBattles = response.slice(1).filter(row => {
                return row[17] === crusadeKey; // Crusade Key column
            });

            // Sort by date (most recent first)
            crusadeBattles.sort((a, b) => {
                const dateA = new Date(a[5] || 0); // Date Played column
                const dateB = new Date(b[5] || 0);
                return dateB - dateA;
            });

            // Display the battles
            this.displayCrusadeBattles(crusadeBattles, container);

        } catch (error) {
            console.error('Error loading battle history:', error);
            container.innerHTML = '<p class="error-message">Error loading battle history.</p>';
        }
    },

    /**
     * Display crusade battles in table format
     */
    displayCrusadeBattles(battles, container) {
        if (!battles || battles.length === 0) {
            container.innerHTML = '<p class="no-data">No battles recorded for this crusade yet.</p>';
            return;
        }

        // Create table HTML
        let html = `
            <div class="sheets-table-wrapper" style="max-height: 400px; overflow-y: auto;">
                <table class="sheets-table">
                    <thead>
                        <tr>
                            <th onclick="CrusadeUI.sortBattleTable(0)" style="cursor: pointer;">
                                Date <span class="sort-indicator">⇅</span>
                            </th>
                            <th onclick="CrusadeUI.sortBattleTable(1)" style="cursor: pointer;">
                                Battle Name <span class="sort-indicator">⇅</span>
                            </th>
                            <th>Outcome</th>
                            <th onclick="CrusadeUI.sortBattleTable(3)" style="cursor: pointer;">
                                Score <span class="sort-indicator">⇅</span>
                            </th>
                            <th onclick="CrusadeUI.sortBattleTable(4)" style="cursor: pointer;">
                                Battle Size <span class="sort-indicator">⇅</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="battle-table-body">
        `;

        // Store battle data for sorting
        window.crusadeBattleTableData = [];

        // Add rows for each battle
        battles.forEach(battle => {
            // Extract data from columns
            const datePlayed = battle[5]; // Date Played
            const battleName = battle[15] || 'Unnamed Battle'; // Battle Name
            const battleSize = battle[2] || '-'; // Battle Size
            const player1Score = battle[13] || 0; // Player 1 Score
            const player2Score = battle[14] || 0; // Player 2 Score
            const victor = battle[12] || ''; // Victor
            const force1Name = battle[7] || battle[6] || 'Force 1'; // Force 1 name or Player 1
            const force2Name = battle[10] || battle[9] || 'Force 2'; // Force 2 name or Player 2
            const force1Key = battle[3]; // Force 1 Key
            const force2Key = battle[4]; // Force 2 Key
            
            // Format outcome string with links to forces
            let outcome = '';
            const force1Link = force1Key ? 
                `<a href="${CrusadeConfig.buildForceUrlFromSubdir(force1Key)}" style="color: #4ecdc4;">${force1Name}</a>` : 
                force1Name;
            const force2Link = force2Key ? 
                `<a href="${CrusadeConfig.buildForceUrlFromSubdir(force2Key)}" style="color: #4ecdc4;">${force2Name}</a>` : 
                force2Name;
            
            if (victor === 'Draw') {
                outcome = `${force1Link} draws with ${force2Link}`;
            } else if (victor === battle[6]) { // Player 1 won
                outcome = `${force1Link} defeats ${force2Link}`;
            } else if (victor === battle[9]) { // Player 2 won
                outcome = `${force2Link} defeats ${force1Link}`;
            } else {
                outcome = 'Outcome unclear';
            }

            // Format score - larger number first
            const p1Score = parseInt(player1Score) || 0;
            const p2Score = parseInt(player2Score) || 0;
            const score = p1Score >= p2Score ? `${p1Score} - ${p2Score}` : `${p2Score} - ${p1Score}`;
            
            // Store for sorting
            window.crusadeBattleTableData.push([
                datePlayed,
                battleName,
                outcome,
                score,
                battleSize
            ]);

            html += `
                <tr>
                    <td>${formatDate(datePlayed)}</td>
                    <td>${battleName}</td>
                    <td>${outcome}</td>
                    <td class="text-center">${score}</td>
                    <td class="text-center">${battleSize}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        // Add summary stats
        const totalBattles = battles.length;
        html += `
            <div class="battle-summary" style="margin-top: 10px; color: #888;">
                <small>📊 ${totalBattles} battle${totalBattles !== 1 ? 's' : ''} recorded for this crusade</small>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Sort battle table by column
     */
    sortBattleTable(columnIndex) {
        if (!window.crusadeBattleTableData) return;
        
        // Track sort direction
        if (!window.battleSortDirection) {
            window.battleSortDirection = {};
        }
        
        const currentDirection = window.battleSortDirection[columnIndex] || 'asc';
        const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
        window.battleSortDirection[columnIndex] = newDirection;
        
        // Sort the data
        window.crusadeBattleTableData.sort((a, b) => {
            let aVal = a[columnIndex];
            let bVal = b[columnIndex];
            
            // Handle date column specially
            if (columnIndex === 0) {
                aVal = new Date(aVal || 0);
                bVal = new Date(bVal || 0);
                return newDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            
            // Handle score column (extract first number)
            if (columnIndex === 3) {
                aVal = parseInt(aVal.split('-')[0]) || 0;
                bVal = parseInt(bVal.split('-')[0]) || 0;
                return newDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            
            // Handle battle size (extract number if present)
            if (columnIndex === 4) {
                aVal = parseInt(aVal) || 0;
                bVal = parseInt(bVal) || 0;
                return newDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            
            // String comparison for other columns
            if (newDirection === 'asc') {
                return String(aVal).localeCompare(String(bVal));
            } else {
                return String(bVal).localeCompare(String(aVal));
            }
        });
        
        // Rebuild table body
        const tbody = document.getElementById('battle-table-body');
        if (!tbody) return;
        
        let html = '';
        window.crusadeBattleTableData.forEach(row => {
            html += `
                <tr>
                    <td>${columnIndex === 0 ? formatDate(row[0]) : row[0]}</td>
                    <td>${row[1]}</td>
                    <td>${row[2]}</td>
                    <td class="text-center">${row[3]}</td>
                    <td class="text-center">${row[4]}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }
};

// Make globally available
window.CrusadeUI = CrusadeUI;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrusadeUI;
}

console.log('CrusadeUI module loaded');
	
	
