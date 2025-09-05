// filename: js/core/ui-helpers.js
// Consolidated UI helper functions
// 40k Crusade Campaign Tracker

const UIHelpers = {
    /**
     * Show loading state in container
     */
    showLoading(container, message = 'Loading...') {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!container) return;

        // Store original content if not already stored
        if (!container.dataset.originalContent) {
            container.dataset.originalContent = container.innerHTML;
        }

        // Hide original content and show loading
        const originalContent = container.querySelector('.original-content');
        if (originalContent) {
            originalContent.style.display = 'none';
        } else {
            // Wrap original content in a div
            const wrapper = document.createElement('div');
            wrapper.className = 'original-content';
            wrapper.innerHTML = container.innerHTML;
            container.innerHTML = '';
            container.appendChild(wrapper);
            wrapper.style.display = 'none';
        }

        // Add loading state
        const loadingEl = document.createElement('div');
        loadingEl.className = 'loading-state';
        loadingEl.innerHTML = `
            <div class="loading-spinner"></div>
            <span>${message}</span>
        `;
        container.appendChild(loadingEl);
    },

    /**
     * Hide loading state
     */
    hideLoading(container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!container) return;

        // Remove loading state
        const loadingEl = container.querySelector('.loading-state');
        if (loadingEl) {
            loadingEl.remove();
        }

        // Restore original content
        const originalContent = container.querySelector('.original-content');
        if (originalContent) {
            originalContent.style.display = 'block';
        } else if (container.dataset.originalContent) {
            // Fallback: restore from stored content
            container.innerHTML = container.dataset.originalContent;
            delete container.dataset.originalContent;
        }
    },

    /**
     * Show no data message
     */
    showNoData(container, message = 'No data available') {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!container) return;

        container.innerHTML = `
            <div class="no-data-message">
                <p>${message}</p>
            </div>
        `;
    },

    /**
     * Show error in container
     */
    showError(container, message = 'An error occurred') {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!container) return;

        container.innerHTML = `
            <div class="error-message">
                <strong>Error:</strong> ${message}
            </div>
        `;
    },

    /**
     * Create sortable table headers
     */
    makeSortable(table, options = {}) {
        if (typeof table === 'string') {
            table = document.getElementById(table);
        }

        if (!table) return;

        const headers = table.querySelectorAll('th');
        const tbody = table.querySelector('tbody');

        if (!tbody) return;

        // Track sort state
        table.sortState = {};

        headers.forEach((header, index) => {
            // Skip if marked as non-sortable
            if (header.classList.contains('no-sort')) return;

            // Add sortable class and indicator
            header.classList.add('sortable');
            if (!header.querySelector('.sort-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'sort-indicator';
                indicator.textContent = '⇅';
                header.appendChild(indicator);
            }

            // Add click handler
            header.addEventListener('click', () => {
                this.sortTable(table, index, options);
            });
        });
    },

    /**
     * Sort table by column
     */
    sortTable(table, columnIndex, options = {}) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        // Determine sort direction
        const currentDir = table.sortState[columnIndex] || 'none';
        const newDir = currentDir === 'asc' ? 'desc' : 'asc';
        table.sortState[columnIndex] = newDir;

        // Sort rows
        rows.sort((a, b) => {
            let aVal = a.cells[columnIndex].textContent.trim();
            let bVal = b.cells[columnIndex].textContent.trim();

            // Try to parse as numbers
            const aNum = parseFloat(aVal);
            const bNum = parseFloat(bVal);

            if (!isNaN(aNum) && !isNaN(bNum)) {
                return newDir === 'asc' ? aNum - bNum : bNum - aNum;
            }

            // Try to parse as dates
            const aDate = new Date(aVal);
            const bDate = new Date(bVal);

            if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
                return newDir === 'asc' ? aDate - bDate : bDate - aDate;
            }

            // Fall back to string comparison
            return newDir === 'asc' ?
                aVal.localeCompare(bVal) :
                bVal.localeCompare(aVal);
        });

        // Update table
        rows.forEach(row => tbody.appendChild(row));

        // Update indicators
        this.updateSortIndicators(table, columnIndex, newDir);
    },

    /**
     * Update sort indicators
     */
    updateSortIndicators(table, activeColumn, direction) {
        table.querySelectorAll('th').forEach((header, index) => {
            const indicator = header.querySelector('.sort-indicator');
            if (!indicator) return;

            header.classList.remove('sort-asc', 'sort-desc');

            if (index === activeColumn) {
                header.classList.add(`sort-${direction}`);
                indicator.textContent = direction === 'asc' ? '▲' : '▼';
            } else {
                indicator.textContent = '⇅';
            }
        });
    },

    /**
     * Format date consistently
     */
    formatDate(dateStr) {
        if (!dateStr) return '';

        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;

            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    },

    /**
     * Create pagination controls
     */
    createPagination(container, totalItems, currentPage, itemsPerPage, onPageChange) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!container) return;

        const totalPages = Math.ceil(totalItems / itemsPerPage);

        let html = '<div class="pagination">';

        // Previous button
        html += `
            <button ${currentPage === 1 ? 'disabled' : ''}
                    data-page="${currentPage - 1}">
                Previous
            </button>
        `;

        // Page info
        html += `
            <span class="page-info">
                Page ${currentPage} of ${totalPages}
            </span>
        `;

        // Next button
        html += `
            <button ${currentPage === totalPages ? 'disabled' : ''}
                    data-page="${currentPage + 1}">
                Next
            </button>
        `;

        html += '</div>';

        container.innerHTML = html;

        // Add event listeners
        container.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.target.dataset.page);
                if (page && onPageChange) {
                    onPageChange(page);
                }
            });
        });
    }
};

// Make globally available
window.UIHelpers = UIHelpers;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIHelpers;
}