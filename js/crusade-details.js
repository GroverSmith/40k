// filename: js/crusade-details.js
// Main entry point for Crusade Details page
// 40k Crusade Campaign Tracker

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Crusade Details page loading...');
    
    // Get crusade key from URL
    const urlParams = new URLSearchParams(window.location.search);
    const crusadeKey = urlParams.get('key');
    
    if (!crusadeKey) {
        console.error('No crusade key provided in URL');
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-text').textContent = 'No crusade specified. Please select a crusade from the main page.';
        document.getElementById('crusade-header').innerHTML = '<h1>Error: No Crusade Selected</h1>';
        return;
    }
    
    console.log('Loading crusade with key:', crusadeKey);
    
    try {
        // Load crusade data - using the CORRECT function name
        const crusadeData = await CrusadeData.loadCrusadeData(crusadeKey);
        
        if (!crusadeData) {
            throw new Error('Crusade not found');
        }
        
        // Update header with crusade information
        CrusadeUI.updateHeader(crusadeData, crusadeData['Crusade Name']);
        
        // Show the action buttons section
        const actionsSection = document.getElementById('crusade-actions');
        if (actionsSection) {
            actionsSection.style.display = 'block';
            
            // Update the battle recording button with crusade context
            const battleBtn = actionsSection.querySelector('.btn-primary');
            if (battleBtn) {
                const params = new URLSearchParams({
                    crusadeKey: crusadeKey,
                    crusadeName: crusadeData['Crusade Name'] || ''
                });
                battleBtn.href = `../battle-reports/add-battle-report.html?${params.toString()}`;
            }
        }
        
        // Display introduction
        CrusadeUI.displayIntroduction(crusadeData);
        
        // Display rules
        CrusadeUI.displayRules(crusadeData);
        
        // Display narrative
        CrusadeUI.displayNarrative(crusadeData);
        
        // Display battle history for this crusade
        await CrusadeUI.displayBattleHistory(crusadeKey);
		
		await CrusadeUI.displayStories(crusadeKey);
        
        // Load and display participating forces
        const participantsResult = await CrusadeData.loadParticipatingForces(crusadeKey);
        if (participantsResult.success) {
            CrusadeUI.displayParticipatingForces(participantsResult.forces, crusadeData['Crusade Name']);
        }
        
        // Set up force registration
        ForceRegistration.init(crusadeKey, crusadeData['Crusade Name']);
        
    } catch (error) {
        console.error('Error loading crusade details:', error);
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-text').textContent = 'Error loading crusade data: ' + error.message;
        document.getElementById('crusade-header').innerHTML = '<h1>Error Loading Crusade</h1>';
    }
});

// Function to close the register modal (global for onclick)
function closeRegisterModal() {
    ForceRegistration.closeModal();
}

// Function to sort participants table
function sortParticipantsTable(columnIndex) {
    if (!window.participantsTableData) return;
    
    // Track sort direction
    if (!window.sortDirection) {
        window.sortDirection = {};
    }
    
    const currentDirection = window.sortDirection[columnIndex] || 'asc';
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    window.sortDirection[columnIndex] = newDirection;
    
    // Sort the data
    window.participantsTableData.sort((a, b) => {
        let aVal = a[columnIndex];
        let bVal = b[columnIndex];
        
        // Handle date column specially
        if (columnIndex === 2) {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
            return newDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        // String comparison for other columns
        if (newDirection === 'asc') {
            return String(aVal).localeCompare(String(bVal));
        } else {
            return String(bVal).localeCompare(String(aVal));
        }
    });
    
    // Rebuild table HTML
    const tbody = document.querySelector('#participants-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    window.participantsTableData.forEach(row => {
        const forceKey = row[3];
        const forceUrl = CrusadeConfig.buildForceUrlFromSubdir(forceKey);
        const forceNameLink = `<a href="${forceUrl}" 
                                style="color: #4ecdc4; text-decoration: none;"
                                title="View ${row[0]} details">${row[0]}</a>`;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${forceNameLink}</td>
            <td>${row[1]}</td>
            <td>${new Date(row[2]).toLocaleDateString()}</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Update sort indicators
    document.querySelectorAll('#participants-table th .sort-indicator').forEach((indicator, index) => {
        if (index === columnIndex) {
            indicator.textContent = newDirection === 'asc' ? '↑' : '↓';
        } else {
            indicator.textContent = '⇅';
        }
    });
}