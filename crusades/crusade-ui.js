// filename: crusades/crusade-ui.js
// Simplified Crusade UI using UIHelpers
// 40k Crusade Campaign Tracker

const CrusadeUI = {
    updateHeader(crusadeData, crusadeName) {
        const header = document.getElementById('crusade-header');

        const name = crusadeData['Crusade Name'] || crusadeName;
        const crusadeType = crusadeData['Crusade Type'] || '';
        const startDate = UIHelpers.formatDate(crusadeData['Start Date']);
        const endDate = UIHelpers.formatDate(crusadeData['End Date']);
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

    displaySection(sectionId, contentId, data, emptyMessage) {
        const container = document.getElementById(contentId);
        const section = document.getElementById(sectionId);

        if (!container || !section) return;

        if (!data || data === '') {
            UIHelpers.showNoData(container, emptyMessage);
        } else {
            container.innerHTML = `<div class="content-block">${data}</div>`;
        }

        CoreUtils.dom.show(section);
    },

    displayIntroduction(crusadeData) {
        this.displaySection(
            'introduction-section',
            'introduction-content',
            crusadeData['Introduction'],
            'No introduction available for this crusade.'
        );
    },

    displayRules(crusadeData) {
        const container = document.getElementById('rules-content');
        const section = document.getElementById('rules-section');
        if (!container || !section) return;

        const blocks = [
            crusadeData['Rules Block 1'],
            crusadeData['Rules Block 2'],
            crusadeData['Rules Block 3']
        ].filter(Boolean);

        if (blocks.length > 0) {
            container.innerHTML = blocks.map(block =>
                `<div class="content-block">${block}</div>`
            ).join('');
        } else {
            UIHelpers.showNoData(container, 'No special rules for this crusade.');
        }

        CoreUtils.dom.show(section);
    },

    displayNarrative(crusadeData) {
        const container = document.getElementById('narrative-content');
        const section = document.getElementById('narrative-section');
        if (!container || !section) return;

        const blocks = [
            crusadeData['Narrative Block 1'],
            crusadeData['Narrative Block 2']
        ].filter(Boolean);

        if (blocks.length > 0) {
            container.innerHTML = blocks.map(block =>
                `<div class="content-block">${block}</div>`
            ).join('');
        } else {
            UIHelpers.showNoData(container, 'No narrative content available for this crusade.');
        }

        CoreUtils.dom.show(section);
    },

    displayParticipatingForces(forces, crusadeName) {
        const container = document.getElementById('forces-content');
        const section = document.getElementById('forces-section');
        if (!container || !section) return;

        if (!forces || forces.length === 0) {
            UIHelpers.showNoData(container, 'No forces registered for this crusade yet.');
            CoreUtils.dom.show(section);
            return;
        }

        // Create table
        let html = `
            <table id="participants-table" class="data-table">
                <thead>
                    <tr>
                        <th>Force Name</th>
                        <th>Player</th>
                        <th>Registered</th>
                    </tr>
                </thead>
                <tbody>
        `;

        forces.forEach(force => {
            const forceName = force['Force Name'] || '';
            const userName = force['User Name'] || '';
            const registrationDate = UIHelpers.formatDate(force.Timestamp);
            const forceKey = force['Force Key'] || force.Key || '';

            const forceUrl = CrusadeConfig.buildForceUrlFromSubdir(forceKey);

            html += `
                <tr>
                    <td><a href="${forceUrl}">${forceName}</a></td>
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
        CoreUtils.dom.show(section);

        // Make table sortable
        UIHelpers.makeSortable('participants-table');
    },

    async displayStories(crusadeKey) {
        const container = document.getElementById('stories-content');
        const section = document.getElementById('stories-section');
        if (!container || !section) return;

        CoreUtils.dom.show(section);

        if (typeof StoriesDisplay !== 'undefined') {
            await StoriesDisplay.loadCrusadeStories(crusadeKey, container);
        } else {
            UIHelpers.showNoData(container, 'Stories module not loaded.');
        }
    }
};

// Make globally available
window.CrusadeUI = CrusadeUI;