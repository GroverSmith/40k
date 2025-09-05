// filename: battles/battle-details.js
// Battle Details Viewer
// 40k Crusade Campaign Tracker

class BattleDetailsViewer {
    constructor() {
        this.battleKey = null;
        this.battleData = null;
        this.init();
    }

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        this.battleKey = urlParams.get('key');

        if (!this.battleKey) {
            this.showError('No battle specified');
            return;
        }

        await this.loadBattleData();
    }

    async loadBattleData() {
        try {
            const battleUrl = CrusadeConfig.getSheetUrl('battles');
            if (!battleUrl) {
                throw new Error('Battle history not configured');
            }

            const fetchUrl = `${battleUrl}?action=get&key=${encodeURIComponent(this.battleKey)}`;
            const response = await fetch(fetchUrl);
            const data = await response.json();

            if (data.success && data.data) {
                this.battleData = data.data;
                this.displayBattle();
            } else {
                throw new Error(data.error || 'Battle not found');
            }

        } catch (error) {
            console.error('Error loading battle:', error);
            this.showError('Failed to load battle report');
        }
    }

    displayBattle() {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('battle-content').style.display = 'block';

        // Set title and date
        const battleName = this.battleData['Battle Name'] || 'Unnamed Battle';
        document.getElementById('battle-title').textContent = battleName;
        document.title = `${battleName} - Battle Report`;

        const datePlayed = this.battleData['Date Played'];
        if (datePlayed) {
            document.getElementById('battle-date').textContent =
                `Fought on ${new Date(datePlayed).toLocaleDateString()}`;
        }

        // Force 1 details
        document.getElementById('player1-name').textContent = this.battleData['Player 1'] || '-';
        const force1Link = document.getElementById('force1-link');
        force1Link.textContent = this.battleData['Force 1'] || '-';
        force1Link.href = `../forces/force-details.html?key=${encodeURIComponent(this.battleData['Force 1 Key'])}`;
        document.getElementById('army1-name').textContent = this.battleData['Army 1'] || '-';
        document.getElementById('player1-score').textContent = this.battleData['Player 1 Score'] || '0';

        // Force 2 details
        document.getElementById('player2-name').textContent = this.battleData['Player 2'] || '-';
        const force2Link = document.getElementById('force2-link');
        force2Link.textContent = this.battleData['Force 2'] || '-';
        force2Link.href = `../forces/force-details.html?key=${encodeURIComponent(this.battleData['Force 2 Key'])}`;
        document.getElementById('army2-name').textContent = this.battleData['Army 2'] || '-';
        document.getElementById('player2-score').textContent = this.battleData['Player 2 Score'] || '0';

        // Battle result
        const victor = this.battleData['Victor'];
        let resultText = 'Draw';
        let resultColor = '#ffa500';

        if (victor && victor !== 'Draw') {
            const victorForceKey = this.battleData['Victor Force Key'];
            if (victorForceKey === this.battleData['Force 1 Key']) {
                resultText = `${this.battleData['Force 1']} Victory!`;
                resultColor = '#4ecdc4';
                document.getElementById('force1-header').style.color = '#4ecdc4';
            } else if (victorForceKey === this.battleData['Force 2 Key']) {
                resultText = `${this.battleData['Force 2']} Victory!`;
                resultColor = '#4ecdc4';
                document.getElementById('force2-header').style.color = '#4ecdc4';
            }
        }

        const resultElement = document.getElementById('battle-result');
        resultElement.textContent = resultText;
        resultElement.style.color = resultColor;

        // Battle size
        const battleSize = this.battleData['Battle Size'];
        if (battleSize) {
            document.getElementById('battle-size').textContent = `${battleSize} Points`;
        }

        // Summary notes
        const summaryNotes = this.battleData['Summary Notes'];
        if (summaryNotes && summaryNotes.trim()) {
            document.getElementById('summary-section').style.display = 'block';
            document.getElementById('battle-summary').textContent = summaryNotes;
        }
    }

    showError(message) {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('error-state').style.display = 'block';
        document.getElementById('error-message').textContent = message;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new BattleDetailsViewer();
});