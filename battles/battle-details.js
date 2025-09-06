// filename: battles/battle-details.js
// Battle Details Viewer
// 40k Crusade Campaign Tracker

class BattleDetails {
    constructor() {
        this.battleKey = null;
        this.battleData = null;
        this.init();
    }

    async init() {
        // Get battle key from URL using utility
        this.battleKey = getUrlKey('key');

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
            
            // Use utility for standard data fetching
            this.battleData = await fetchEntityData(fetchUrl, 'battle');
            this.displayBattle();

        } catch (error) {
            console.error('Error loading battle:', error);
            this.showError('Failed to load battle report');
        }
    }

    displayBattle() {
        // Hide loading state and show content using utility
        toggleLoadingState('loading-state', 'battle-content', true);

        // Set title and date
        const battleName = this.battleData['Battle Name'] || 'Unnamed Battle';
        document.title = `${battleName} - Battle Report`;

        const datePlayed = this.battleData['Date Played'];
        const dateText = datePlayed ? `Fought on ${new Date(datePlayed).toLocaleDateString()}` : '';
        
        setElementTexts({
            'battle-title': battleName,
            'battle-date': dateText
        });

        // Force 1 details
        const force1Link = CoreUtils.dom.getElement('force1-link');
        force1Link.href = `../forces/force-details.html?key=${encodeURIComponent(this.battleData['Force 1 Key'])}`;
        
        // Force 2 details
        const force2Link = CoreUtils.dom.getElement('force2-link');
        force2Link.href = `../forces/force-details.html?key=${encodeURIComponent(this.battleData['Force 2 Key'])}`;
        
        // Set all text content using utility
        setElementTexts({
            'player1-name': this.battleData['Player 1'] || '-',
            'force1-link': this.battleData['Force 1'] || '-',
            'army1-name': this.battleData['Army 1'] || '-',
            'player1-score': this.battleData['Player 1 Score'] || '0',
            'player2-name': this.battleData['Player 2'] || '-',
            'force2-link': this.battleData['Force 2'] || '-',
            'army2-name': this.battleData['Army 2'] || '-',
            'player2-score': this.battleData['Player 2 Score'] || '0'
        });

        // Battle result
        const victor = this.battleData['Victor'];
        let resultText = 'Draw';
        let resultColor = '#ffa500';

        if (victor && victor !== 'Draw') {
            const victorForceKey = this.battleData['Victor Force Key'];
            if (victorForceKey === this.battleData['Force 1 Key']) {
                resultText = `${this.battleData['Force 1']} Victory!`;
                resultColor = '#4ecdc4';
                CoreUtils.dom.getElement('force1-header').style.color = '#4ecdc4';
            } else if (victorForceKey === this.battleData['Force 2 Key']) {
                resultText = `${this.battleData['Force 2']} Victory!`;
                resultColor = '#4ecdc4';
                CoreUtils.dom.getElement('force2-header').style.color = '#4ecdc4';
            }
        }

        const resultElement = CoreUtils.dom.getElement('battle-result');
        resultElement.textContent = resultText;
        resultElement.style.color = resultColor;

        // Battle size
        const battleSize = this.battleData['Battle Size'];
        const sizeText = battleSize ? `${battleSize} Points` : '';
        setElementTexts({
            'battle-size': sizeText
        });

        // Summary notes
        const summaryNotes = this.battleData['Summary Notes'];
        if (summaryNotes && summaryNotes.trim()) {
            CoreUtils.dom.show('summary-section');
            setElementTexts({
                'battle-summary': summaryNotes
            });
        }
    }

    showError(message) {
        // Use utility for standard error handling
        showDetailsError(message, 'error-message', ['loading-state']);
        CoreUtils.dom.show('error-state');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.battleDetails = new BattleDetails();
});