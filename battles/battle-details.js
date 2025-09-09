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
            // Use UnifiedCache to get the specific battle
            const battle = await UnifiedCache.getRowByKey('battle_history', this.battleKey);
            
            if (battle) {
                console.log('Battle data loaded from UnifiedCache:', battle);
                this.battleData = battle;
                this.displayBattle();
            } else {
                // If not found, get all battles to show available keys in error message
                const allBattles = await UnifiedCache.getAllRows('battle_history');
                const availableKeys = allBattles.map(b => b.battle_key).join(', ');
                
                throw new Error(`Battle "${this.battleKey}" not found. Available battles: ${availableKeys}`);
            }

        } catch (error) {
            console.error('Error loading battle:', error);
            this.showError('Failed to load battle report: ' + error.message);
        }
    }

    displayBattle() {
        // Hide loading state and show content using utility
        toggleLoadingState('loading-state', 'battle-content', true);

        // Set title and date
        const battleName = this.battleData.battle_name || 'Unnamed Battle';
        document.title = `${battleName} - Battle Report`;

        const datePlayed = this.battleData.date_played;
        const dateText = datePlayed ? `Fought on ${new Date(datePlayed).toLocaleDateString()}` : '';
        
        const battleSize = this.battleData.battle_size;
        const sizeText = battleSize ? `${battleSize} Points` : '';
        
        setElementTexts({
            'battle-title': battleName,
            'battle-date': dateText,
            'battle-size': sizeText
        });

        // Force 1 details
        const force1Link = CoreUtils.dom.getElement('force1-link');
        force1Link.href = `../forces/force-details.html?key=${encodeURIComponent(this.battleData.force_key_1)}`;
        
        // Force 2 details
        const force2Link = CoreUtils.dom.getElement('force2-link');
        force2Link.href = `../forces/force-details.html?key=${encodeURIComponent(this.battleData.force_key_2)}`;
        
        // Set all text content using utility
        setElementTexts({
            'player1-name': this.battleData.player_1 || '-',
            'force1-link': this.battleData.force_1 || '-',
            'army1-name': this.battleData.army_1 || '-',
            'player1-score': this.battleData.player_1_score || '0',
            'player2-name': this.battleData.player_2 || '-',
            'force2-link': this.battleData.force_2 || '-',
            'army2-name': this.battleData.army_2 || '-',
            'player2-score': this.battleData.player_2_score || '0'
        });

        // Battle result
        const victor = this.battleData.victor;
        let resultText = 'Draw';
        let resultColor = '#ffa500';

        if (victor && victor !== 'Draw') {
            const victorForceKey = this.battleData.victor_force_key;
            if (victorForceKey === this.battleData.force_key_1) {
                resultText = `${this.battleData.force_1} Victory!`;
                resultColor = '#4ecdc4';
                CoreUtils.dom.getElement('force1-header').style.color = '#4ecdc4';
            } else if (victorForceKey === this.battleData.force_key_2) {
                resultText = `${this.battleData.force_2} Victory!`;
                resultColor = '#4ecdc4';
                CoreUtils.dom.getElement('force2-header').style.color = '#4ecdc4';
            }
        }

        const resultElement = CoreUtils.dom.getElement('battle-result');
        resultElement.textContent = resultText;
        resultElement.style.color = resultColor;

        // Summary notes
        const summaryNotes = this.battleData.summary_notes;
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