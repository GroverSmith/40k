// Load and display the story
async function loadStory() {
    const urlParams = new URLSearchParams(window.location.search);
    const storyKey = urlParams.get('key');

    if (!storyKey) {
        showError('No story specified');
        return;
    }

    try {
        const storiesUrl = CrusadeConfig.getSheetUrl('stories');
        if (!storiesUrl) {
            showError('Stories feature not configured');
            return;
        }

        // Fetch the specific story
        const fetchUrl = `${storiesUrl}?action=get&key=${encodeURIComponent(storyKey)}`;
        const response = await fetch(fetchUrl);

        if (!response.ok) {
            throw new Error('Failed to load story');
        }

        const result = await response.json();

        if (result.success && result.data) {
            displayStory(result.data);
        } else {
            showError('Story not found');
        }

    } catch (error) {
        console.error('Error loading story:', error);
        showError('Error loading story');
    }
}

function displayStory(story) {
    const container = document.getElementById('story-content');

    // Update page title
    document.title = `${story.Title || 'Story'} - 40k Crusade Campaign Tracker`;

    let html = '';

    // Header
    html += `
        <div class="story-header">
            <h1 class="story-title">${story.Title || 'Untitled Story'}</h1>
            <div class="story-meta">
                <div class="story-meta-item">
                    <span>📅</span>
                    <span>${story.Timestamp ? new Date(story.Timestamp).toLocaleDateString() : 'Unknown date'}</span>
                </div>
                <div class="story-meta-item">
                    <span>✍️</span>
                    <span>By ${extractUserName(story['User Key']) || 'Unknown Author'}</span>
                </div>
                <div class="story-meta-item">
                    <span>${getStoryTypeIcon(story['Story Type'])}</span>
                    <span>${story['Story Type'] || 'Story'}</span>
                </div>
            </div>
        </div>
    `;

    // Associations
    const hasAssociations = story['Force Key'] || story['Crusade Key'];
    if (hasAssociations) {
        html += '<div class="associations"><strong>Associated with:</strong> ';

        if (story['Force Key']) {
            html += `<a href="../forces/force-details.html?key=${encodeURIComponent(story['Force Key'])}"
                     class="association-link">View Force</a>`;
        }

        if (story['Crusade Key']) {
            html += `<a href="../crusades/crusade-details.html?key=${encodeURIComponent(story['Crusade Key'])}"
                     class="association-link">View Crusade</a>`;
        }

        html += '</div>';
    }

    // Imperial Date
    if (story['Imperial Date']) {
        html += `<div class="imperial-date">⚡ Imperial Date: ${story['Imperial Date']} ⚡</div>`;
    }

    // Story Content
    html += '<div class="story-content">';

    if (story['Story Text 1']) {
        html += `<div class="story-text-section">${formatStoryText(story['Story Text 1'])}</div>`;
    }

    if (story['Story Text 2']) {
        html += `<div class="story-text-section">${formatStoryText(story['Story Text 2'])}</div>`;
    }

    if (story['Story Text 3']) {
        html += `<div class="story-text-section">${formatStoryText(story['Story Text 3'])}</div>`;
    }

    html += '</div>';

    // External Text Link
    if (story['Text Link']) {
        html += `
            <div class="media-section">
                <h3>📄 Full Document</h3>
                <a href="${story['Text Link']}" target="_blank" class="external-link">
                    View Complete Story Document →
                </a>
            </div>
        `;
    }

    // Images
    const images = [story['Image 1'], story['Image 2'], story['Image 3']].filter(img => img);
    if (images.length > 0) {
        html += `
            <div class="media-section">
                <h3>🖼️ Images</h3>
                <div class="image-gallery">
        `;

        images.forEach((img, index) => {
            html += `
                <div class="image-container">
                    <a href="${img}" target="_blank">
                        <img src="${img}" alt="Story Image ${index + 1}"
                             onerror="this.src='../images/placeholder.jpg'; this.onerror=null;">
                    </a>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    }

    // Audio
    if (story['Audio Link']) {
        html += `
            <div class="media-section">
                <h3>🔊 Audio</h3>
                <div class="audio-player">
                    <audio controls style="width: 100%;">
                        <source src="${story['Audio Link']}" type="audio/mpeg">
                        <source src="${story['Audio Link']}" type="audio/ogg">
                        <p>Your browser doesn't support audio playback.
                           <a href="${story['Audio Link']}" target="_blank">Download audio</a></p>
                    </audio>
                </div>
            </div>
        `;
    }

    // Actions
    html += `
        <div class="story-actions">
            <a href="../index.html" class="btn btn-secondary">Back to Home</a>
            <a href="../stories/add-story.html" class="btn btn-primary">Write New Story</a>
        </div>
    `;

    container.innerHTML = html;
}

function formatStoryText(text) {
    // Convert line breaks to paragraphs
    return text.split('\n\n').map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`).join('');
}

function extractUserName(userKey) {
    if (!userKey) return null;
    // User keys are typically in format "FirstnameLastname"
    // Try to add spaces before capitals
    return userKey.replace(/([A-Z])/g, ' $1').trim();
}

function getStoryTypeIcon(storyType) {
    const icons = {
        'Battle Report': '⚔️',
        'Character Story': '👤',
        'Campaign Narrative': '📜',
        'Force Background': '🛡️',
        'Unit History': '📖',
        'Victory Celebration': '🏆',
        'Defeat Analysis': '💀',
        'Strategic Planning': '🗺️',
        'Personal Log': '📝',
        'Propaganda': '📢',
        'Technical Report': '⚙️',
        'Field Report': '📋',
        'Other': '📄'
    };

    return icons[storyType] || '📄';
}

function showError(message) {
    const container = document.getElementById('story-content');
    container.innerHTML = `
        <div class="no-story">
            <h2>Story Not Found</h2>
            <p>${message}</p>
            <a href="../index.html" class="btn btn-primary">Return Home</a>
        </div>
    `;
}

// Load story when page loads
document.addEventListener('DOMContentLoaded', loadStory);
