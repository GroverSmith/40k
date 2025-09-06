// filename: js/core/utils.js
// Core Utilities Module - Consolidated utility functions
// 40k Crusade Campaign Tracker

const CoreUtils = {
    /**
     * Date Formatting Utilities
     */
    dates: {
        /**
         * Format date to yyyy-MM-dd
         */
        toISO(dateValue) {
            if (!dateValue) return '';

            try {
                let date;

                if (dateValue instanceof Date) {
                    date = dateValue;
                } else if (typeof dateValue === 'string') {
                    date = new Date(dateValue);
                } else if (typeof dateValue === 'number') {
                    // Excel/Google Sheets serial date number
                    date = new Date((dateValue - 25569) * 86400 * 1000);
                } else {
                    return String(dateValue);
                }

                if (isNaN(date.getTime())) {
                    return String(dateValue);
                }

                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');

                return `${year}-${month}-${day}`;
            } catch (error) {
                console.warn('Date formatting error:', error);
                return String(dateValue);
            }
        },

        /**
         * Format date for display (MMM dd, yyyy)
         */
        toDisplay(dateValue) {
            if (!dateValue) return '-';

            try {
                const date = new Date(dateValue);
                if (isNaN(date.getTime())) return dateValue;

                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } catch (e) {
                return dateValue;
            }
        },

        /**
         * Format date to short format (dd MMM yyyy)
         */
        toShort(dateString) {
            if (!dateString) return null;

            try {
                const date = new Date(dateString);

                if (isNaN(date.getTime())) {
                    return null;
                }

                const day = String(date.getDate()).padStart(2, '0');
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = months[date.getMonth()];
                const year = date.getFullYear();

                return `${day} ${month} ${year}`;
            } catch (error) {
                console.warn('Date formatting error:', error);
                return null;
            }
        },

        /**
         * Get relative time (e.g., "2 hours ago")
         */
        toRelative(dateValue) {
            if (!dateValue) return '';

            const date = new Date(dateValue);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.round(diffMs / 60000);
            const diffHours = Math.round(diffMs / 3600000);
            const diffDays = Math.round(diffMs / 86400000);

            if (diffMins < 1) return 'just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

            return this.toDisplay(dateValue);
        }
    },

    /**
     * String Utilities
     */
    strings: {
        /**
         * Escape HTML to prevent XSS
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        },

        /**
         * Create URL-friendly slug from text
         */
        createSlug(text) {
            return String(text)
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        },

        

        /**
         * Format large numbers with commas
         */
        formatNumber(num) {
            return Number(num).toLocaleString();
        },

        /**
         * Convert to title case
         */
        toTitleCase(str) {
            return str.replace(/\w\S*/g, txt =>
                txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
        },

        /**
         * Truncate text with ellipsis
         */
        truncate(text, maxLength = 50) {
            if (!text || text.length <= maxLength) return text;
            return text.substring(0, maxLength - 3) + '...';
        },

        /**
         * Strip HTML tags from text
         */
        stripHtml(html) {
            const div = document.createElement('div');
            div.innerHTML = html;
            return div.textContent || div.innerText || '';
        },

        /**
         * Clean string by removing non-alphanumeric characters and truncating to specified length
         */
        clean(text, maxLength = 30) {
            if (!text) return '';
            return String(text).replace(/[^a-zA-Z0-9]/g, '').substring(0, maxLength);
        },

        /**
         * Generate a UUID v4
         */
        generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    },

    /**
     * Validation Utilities
     */
    validation: {
        /**
         * Validate email address
         */
        isValidEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },

        /**
         * Validate URL
         */
        isValidUrl(string) {
            try {
                new URL(string);
                return true;
            } catch (_) {
                return false;
            }
        },

        /**
         * Check if value is numeric
         */
        isNumeric(value) {
            return !isNaN(value) && !isNaN(parseFloat(value));
        },

        /**
         * Validate date
         */
        isValidDate(dateString) {
            const date = new Date(dateString);
            return date instanceof Date && !isNaN(date);
        },

        /**
         * Check minimum length
         */
        hasMinLength(value, minLength) {
            return String(value).trim().length >= minLength;
        },

        /**
         * Check maximum length
         */
        hasMaxLength(value, maxLength) {
            return String(value).trim().length <= maxLength;
        },

        /**
         * Check if value is in range
         */
        isInRange(value, min, max) {
            const num = parseFloat(value);
            return !isNaN(num) && num >= min && num <= max;
        }
    },

    /**
     * DOM Utilities
     */
    dom: {
        /**
         * Safely get element by ID
         */
        getElement(id) {
            return document.getElementById(id);
        },

        /**
         * Create element with attributes
         */
        createElement(tag, attributes = {}, innerHTML = '') {
            const element = document.createElement(tag);
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'style' && typeof value === 'object') {
                    Object.assign(element.style, value);
                } else {
                    element.setAttribute(key, value);
                }
            });
            if (innerHTML) element.innerHTML = innerHTML;
            return element;
        },

        /**
         * Show element
         */
        show(elementOrId, displayType = 'block') {
            const element = typeof elementOrId === 'string' ?
                document.getElementById(elementOrId) : elementOrId;
            if (element) element.style.display = displayType;
        },

        /**
         * Hide element
         */
        hide(elementOrId) {
            const element = typeof elementOrId === 'string' ?
                document.getElementById(elementOrId) : elementOrId;
            if (element) element.style.display = 'none';
        },

        /**
         * Toggle element visibility
         */
        toggle(elementOrId, displayType = 'block') {
            const element = typeof elementOrId === 'string' ?
                document.getElementById(elementOrId) : elementOrId;
            if (element) {
                element.style.display = element.style.display === 'none' ?
                    displayType : 'none';
            }
        },

        /**
         * Clear element content
         */
        clear(elementOrId) {
            const element = typeof elementOrId === 'string' ?
                document.getElementById(elementOrId) : elementOrId;
            if (element) element.innerHTML = '';
        },

        /**
         * Add loading state to element
         */
        setLoading(elementOrId, message = 'Loading...') {
            const element = typeof elementOrId === 'string' ?
                document.getElementById(elementOrId) : elementOrId;
            if (element) {
                element.innerHTML = `
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <span>${message}</span>
                    </div>
                `;
            }
        },

        /**
         * Scroll element into view
         */
        scrollIntoView(elementOrId, behavior = 'smooth') {
            const element = typeof elementOrId === 'string' ?
                document.getElementById(elementOrId) : elementOrId;
            if (element) {
                element.scrollIntoView({ behavior, block: 'start' });
            }
        }
    },

    /**
     * URL Utilities
     */
    url: {
        /**
         * Get URL parameter value
         */
        getParam(name) {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(name);
        },

        /**
         * Get all URL parameters as object
         */
        getAllParams() {
            const urlParams = new URLSearchParams(window.location.search);
            const params = {};
            for (const [key, value] of urlParams) {
                params[key] = value;
            }
            return params;
        },

        /**
         * Build URL with parameters
         */
        buildUrl(base, params = {}) {
            const url = new URL(base, window.location.origin);
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    url.searchParams.set(key, value);
                }
            });
            return url.toString();
        },

        /**
         * Update URL parameter without reload
         */
        updateParam(name, value) {
            const url = new URL(window.location);
            if (value !== null && value !== undefined) {
                url.searchParams.set(name, value);
            } else {
                url.searchParams.delete(name);
            }
            window.history.pushState({}, '', url);
        }
    },

    /**
     * Notification Utilities
     */
    notifications: {
        /**
         * Show notification message
         */
        show(message, type = 'info', duration = 5000) {
            // Remove any existing notifications
            const existing = document.querySelector('.app-notification');
            if (existing) existing.remove();

            // Create notification element
            const notification = document.createElement('div');
            notification.className = `app-notification ${type}`;

            const colors = {
                success: { bg: 'linear-gradient(135deg, #1e4a3a 0%, #2c5f4f 100%)', border: '#4ecdc4', icon: '✅' },
                error: { bg: 'linear-gradient(135deg, #4a1e1e 0%, #5f2c2c 100%)', border: '#ff6b6b', icon: '❌' },
                warning: { bg: 'linear-gradient(135deg, #4a3a1e 0%, #5f4f2c 100%)', border: '#ffa500', icon: '⚠️' },
                info: { bg: '#2a2a2a', border: '#4ecdc4', icon: 'ℹ️' }
            };

            const style = colors[type] || colors.info;

            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${style.bg};
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                max-width: 400px;
                border-left: 4px solid ${style.border};
                animation: slideInRight 0.3s ease-out;
                display: flex;
                align-items: center;
                gap: 10px;
            `;

            notification.innerHTML = `
                <span style="font-size: 20px;">${style.icon}</span>
                <span>${message}</span>
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    margin-left: 15px;
                    opacity: 0.8;
                ">&times;</button>
            `;

            document.body.appendChild(notification);

            // Auto-remove after duration
            if (duration > 0) {
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        notification.style.animation = 'slideOutRight 0.3s ease-out';
                        setTimeout(() => notification.remove(), 300);
                    }
                }, duration);
            }

            return notification;
        },

        success(message, duration) {
            return this.show(message, 'success', duration);
        },

        error(message, duration) {
            return this.show(message, 'error', duration);
        },

        warning(message, duration) {
            return this.show(message, 'warning', duration);
        },

        info(message, duration) {
            return this.show(message, 'info', duration);
        }
    },

    /**
     * Storage Utilities
     */
    storage: {
        /**
         * Get item from localStorage with optional default
         */
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('Storage get error:', e);
                return defaultValue;
            }
        },

        /**
         * Set item in localStorage
         */
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('Storage set error:', e);
                return false;
            }
        },

        /**
         * Remove item from localStorage
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('Storage remove error:', e);
                return false;
            }
        },

        /**
         * Get item from sessionStorage
         */
        getSession(key, defaultValue = null) {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('Session storage get error:', e);
                return defaultValue;
            }
        },

        /**
         * Set item in sessionStorage
         */
        setSession(key, value) {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('Session storage set error:', e);
                return false;
            }
        }
    },

    path: {

        /**
         * Resolve relative path based on current location
         */
        getRelativePath(targetDir) {
            const currentPath = window.location.pathname;
            const pathMap = {
                'battles': { battles: '', forces: '../forces/', crusades: '../crusades/', stories: '../stories/' },
                'forces': { battles: '../battles/', forces: '', crusades: '../crusades/', stories: '../stories/' },
                'crusades': { battles: '../battles/', forces: '../forces/', crusades: '', stories: '../stories/' },
                'stories': { battles: '../battles/', forces: '../forces/', crusades: '../crusades/', stories: '' },
                'default': { battles: 'battles/', forces: 'forces/', crusades: 'crusades/', stories: 'stories/' }
            };

            let currentDir = 'default';
            ['battles', 'forces', 'crusades', 'stories'].forEach(dir => {
                if (currentPath.includes(`/${dir}/`)) currentDir = dir;
            });

            return pathMap[currentDir][targetDir];
        }

    },

    /**
     * Details Page Utilities - Common patterns for *-details.js files
     */
    details: {
        /**
         * Extract key parameter from URL (commonly used pattern)
         * @param {string} paramName - The parameter name (default: 'key')
         * @returns {string|null} The parameter value or null
         */
        getUrlKey(paramName = 'key') {
            return CoreUtils.url.getParam(paramName);
        },

        /**
         * Standard error handling for details pages
         * @param {string} message - Error message to display
         * @param {string} containerId - Container element ID for error display
         * @param {Array<string>} hideElementIds - Array of element IDs to hide
         */
        showError(message, containerId = 'error-message', hideElementIds = []) {
            // Hide loading states
            hideElementIds.forEach(id => {
                CoreUtils.dom.hide(id);
            });

            // Show error message
            CoreUtils.dom.show(containerId);
            const errorElement = CoreUtils.dom.getElement(containerId);
            if (errorElement) {
                errorElement.textContent = message;
            }
        },

        /**
         * Standard data fetching with error handling
         * @param {string} url - URL to fetch from
         * @param {string} entityName - Name of entity for error messages
         * @returns {Promise<Object>} The fetched data
         */
        async fetchEntityData(url, entityName) {
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.success && data.data) {
                    return data.data;
                } else {
                    throw new Error(data.error || `${entityName} not found`);
                }
            } catch (error) {
                console.error(`Error loading ${entityName}:`, error);
                throw error;
            }
        },

        /**
         * Show/hide loading states (common pattern)
         * @param {string} loadingId - Loading element ID
         * @param {string} contentId - Content element ID
         * @param {boolean} showContent - Whether to show content (default: true)
         */
        toggleLoadingState(loadingId, contentId, showContent = true) {
            CoreUtils.dom.hide(loadingId);
            if (showContent) {
                CoreUtils.dom.show(contentId);
            } else {
                CoreUtils.dom.hide(contentId);
            }
        },

        /**
         * Set multiple element text content at once (common pattern)
         * @param {Object} elements - Object with elementId as key and text as value
         */
        setElementTexts(elements) {
            Object.entries(elements).forEach(([elementId, text]) => {
                const element = CoreUtils.dom.getElement(elementId);
                if (element) {
                    element.textContent = text;
                }
            });
        },

        /**
         * Extract readable name from user key (common pattern)
         * @param {string} userKey - User key to format
         * @returns {string} Formatted user name
         */
        extractUserName(userKey) {
            if (!userKey) return 'Unknown';
            // Add spaces before capital letters for readability
            return userKey.replace(/([A-Z])/g, ' $1').trim();
        },

        /**
         * Create loading HTML (common pattern)
         * @param {string} message - Loading message
         * @returns {string} HTML string for loading state
         */
        createLoadingHtml(message = 'Loading...') {
            return `
                <div class="loading-spinner"></div>
                <span>${message}</span>
            `;
        },

        /**
         * Create error HTML (common pattern)
         * @param {string} message - Error message
         * @returns {string} HTML string for error state
         */
        createErrorHtml(message) {
            return `<div class="error-message">${message}</div>`;
        },

        /**
         * Standard initialization pattern for details pages
         * @param {Object} config - Configuration object
         * @param {string} config.entityName - Name of the entity
         * @param {string} config.keyProperty - Property name for the key
         * @param {Function} config.loadFunction - Function to load data
         * @param {Function} config.errorFunction - Function to handle errors
         * @returns {Promise<boolean>} Whether initialization was successful
         */
        async initializeDetailsPage(config) {
            const { entityName, keyProperty, loadFunction, errorFunction } = config;
            
            try {
                const key = this.getUrlKey('key');
                if (!key) {
                    throw new Error(`No ${entityName} specified`);
                }
                
                // Set the key property on the instance
                this[keyProperty] = key;
                
                // Load the data
                await loadFunction.call(this);
                
                return true;
            } catch (error) {
                console.error(`Error initializing ${entityName} details:`, error);
                if (errorFunction) {
                    errorFunction.call(this, error.message);
                }
                return false;
            }
        }
    }
};

// Make globally available
window.CoreUtils = CoreUtils;

// Also expose commonly used functions at the top level for convenience
window.escapeHtml = CoreUtils.strings.escapeHtml;
window.formatDate = CoreUtils.dates.toDisplay;
window.createSlug = CoreUtils.strings.createSlug;
window.showNotification = CoreUtils.notifications.show;
window.getRelativePath = CoreUtils.path.getRelativePath;
window.clean = CoreUtils.strings.clean;
window.generateUUID = CoreUtils.strings.generateUUID;

// Details page utilities
window.getUrlKey = CoreUtils.details.getUrlKey;
window.showDetailsError = CoreUtils.details.showError;
window.fetchEntityData = CoreUtils.details.fetchEntityData;
window.toggleLoadingState = CoreUtils.details.toggleLoadingState;
window.setElementTexts = CoreUtils.details.setElementTexts;
window.extractUserName = CoreUtils.details.extractUserName;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoreUtils;
}

console.log('CoreUtils module loaded - consolidated utility functions ready');