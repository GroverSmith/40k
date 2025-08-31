// filename: force-form.js
// Simplified Force Form using base class
// 40k Crusade Campaign Tracker

class ForceForm extends BaseForm {
    constructor() {
        super('create-force-form', {
            submitUrl: CrusadeConfig.getSheetUrl('forces'),
            successMessage: 'Force created successfully!',
            errorMessage: 'Failed to create force',
            clearCacheOnSuccess: ['forces', 'users'],
            lockUserField: true,
            redirectUrl: '../index.html',
            redirectDelay: 2000
        });

        this.init();
    }

    init() {
        // Initialize base functionality
        this.initBase();

        // Setup subfaction handling
        this.setupSubfactionHandling();

        // Pre-select current user if available
        this.preselectCurrentUser();
    }

    setupSubfactionHandling() {
        const factionSelect = document.getElementById('faction');
        const subfactionGroup = document.getElementById('subfaction-group');
        const subfactionSelect = document.getElementById('subfaction');

        if (!factionSelect || !subfactionGroup || !subfactionSelect) return;

        // Subfaction data
        const subfactions = {
            'Space Marines': [
                'Ultramarines', 'Imperial Fists', 'Blood Angels', 'Dark Angels',
                'Space Wolves', 'Iron Hands', 'Salamanders', 'Raven Guard',
                'White Scars', 'Black Templars', 'Crimson Fists', 'Deathwatch',
                'Other Chapter'
            ],
            'Chaos Space Marines': [
                'Black Legion', 'Word Bearers', 'Night Lords', 'Iron Warriors',
                'Alpha Legion', 'World Eaters', 'Emperor\'s Children', 'Death Guard',
                'Thousand Sons', 'Red Corsairs', 'Other Warband'
            ],
            'Aeldari': [
                'Ulthwé', 'Biel-Tan', 'Iyanden', 'Saim-Hann', 'Alaitoc',
                'Ynnari', 'Harlequins', 'Other Craftworld'
            ],
            'Drukhari': [
                'Kabal of the Black Heart', 'Kabal of the Flayed Skull',
                'Kabal of the Poisoned Tongue', 'Cult of Strife',
                'Cult of the Red Grief', 'Other Kabal/Cult'
            ],
            'Orks': [
                'Goffs', 'Bad Moons', 'Evil Sunz', 'Deathskulls', 'Blood Axes',
                'Snakebites', 'Freebooterz', 'Other Clan'
            ],
            'Necrons': [
                'Sautekh', 'Mephrit', 'Nephrekh', 'Nihilakh', 'Novokh',
                'Thokt', 'Other Dynasty'
            ],
            'T\'au Empire': [
                'T\'au Sept', 'Vior\'la', 'Dal\'yth', 'Sa\'cea', 'Bork\'an',
                'Farsight Enclaves', 'Other Sept'
            ],
            'Tyranids': [
                'Behemoth', 'Kraken', 'Leviathan', 'Jormungandr', 'Hydra',
                'Kronos', 'Other Hive Fleet'
            ],
            'Genestealer Cults': [
                'Cult of the Four-Armed Emperor', 'The Hivecult', 'The Pauper Princes',
                'The Rusted Claw', 'Other Cult'
            ],
            'Adeptus Mechanicus': [
                'Mars', 'Graia', 'Metalica', 'Lucius', 'Agripinaa', 'Stygies VIII',
                'Ryza', 'Other Forge World'
            ],
            'Imperial Knights': [
                'House Terryn', 'House Cadmus', 'House Griffith', 'House Hawkshroud',
                'House Mortan', 'House Raven', 'House Taranis', 'House Krast',
                'House Vulker', 'Other House'
            ],
            'Chaos Knights': [
                'House Lucaris', 'House Herpetrax', 'House Khymere', 'House Vextrix',
                'Other House'
            ],
            'Astra Militarum': [
                'Cadian', 'Catachan', 'Mordian', 'Tallarn', 'Valhallan', 'Vostroyan',
                'Armageddon', 'Death Korps of Krieg', 'Other Regiment'
            ],
            'Adepta Sororitas': [
                'Order of Our Martyred Lady', 'Order of the Valorous Heart',
                'Order of the Bloody Rose', 'Order of the Ebon Chalice',
                'Order of the Argent Shroud', 'Order of the Sacred Rose',
                'Other Order'
            ],
            'Custodes': [
                'Shadowkeepers', 'Dread Host', 'Aquilan Shield', 'Solar Watch',
                'Emissaries Imperatus', 'Other Shield Host'
            ],
            'Grey Knights': [
                'Swordbearers', 'Blades of Victory', 'Wardmakers', 'Prescient Brethren',
                'Preservers', 'Rapiers', 'Exactors', 'Silver Blades', 'Other Brotherhood'
            ]
        };

        factionSelect.addEventListener('change', (e) => {
            const faction = e.target.value;

            if (subfactions[faction]) {
                // Show subfaction field
                CoreUtils.dom.show(subfactionGroup);

                // Clear and populate options
                subfactionSelect.innerHTML = '<option value="">Select subfaction...</option>';

                subfactions[faction].forEach(subfaction => {
                    const option = document.createElement('option');
                    option.value = subfaction;
                    option.textContent = subfaction;
                    subfactionSelect.appendChild(option);
                });
            } else {
                // Hide subfaction field
                CoreUtils.dom.hide(subfactionGroup);
                subfactionSelect.value = '';
            }
        });
    }

    preselectCurrentUser() {
        const userField = document.getElementById('user-name');
        if (!userField) return;

        const currentUser = UserStorage.getCurrentUser();
        if (currentUser && currentUser.name) {
            userField.value = currentUser.name;
            userField.readOnly = true;
            userField.classList.add('user-field-locked');
        }
    }

    validateSpecificField(field, value) {
        // Force name validation
        if (field.id === 'force-name' && value) {
            if (value.length < 3) {
                return {
                    isValid: false,
                    errorMessage: 'Force name must be at least 3 characters.'
                };
            }
            if (value.length > 50) {
                return {
                    isValid: false,
                    errorMessage: 'Force name must be no more than 50 characters.'
                };
            }
        }

        // Starting supply limit
        if (field.id === 'starting-supply-limit' && value) {
            const supply = parseInt(value);
            if (supply < 5 || supply > 100) {
                return {
                    isValid: false,
                    errorMessage: 'Starting supply must be between 5 and 100.'
                };
            }
        }

        return { isValid: true };
    }

    gatherFormData() {
        const formData = super.gatherFormData();

        // Generate force key
        const forceKey = KeyUtils.generateForceKey(
            formData.forceName,
            formData.userName
        );

        // Add key and ensure all fields
        return {
            key: forceKey,
            ...formData,
            subfaction: formData.subfaction || '',
            crusadeName: formData.crusadeName || '',
            notes: formData.notes || ''
        };
    }
}

// Global functions for backward compatibility
function resetForm() {
    if (window.forceForm) {
        window.forceForm.reset();
    }
}

function hideMessages() {
    FormUtilities.hideAllMessages();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.forceForm = new ForceForm();
});