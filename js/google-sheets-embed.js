// filename: google-sheets-embed.js
// GoogleSheetsEmbed - A comprehensive class for embedding Google Sheets data
// Features: caching, sorting, pagination, responsive design, error handling, custom column names
// Updated to support linkDataColumn for using hidden columns as link values
// Updated to filter out soft-deleted rows (rows with Deleted Timestamp values)

class GoogleSheetsEmbed {
    constructor(containerSelector, appsScriptUrl, options = {}) {
        this.container = document.querySelector(containerSelector);
        this.appsScriptUrl = appsScriptUrl;
        this.options = {
            showRefreshButton: true,
            autoLoad: true,
            showStats: true,
            sortable: true,
            maxRows: null,        // null = show all rows
            maxHeight: '400px',   // max height before scrolling
            pagination: false,    // enable pagination instead of scrolling
            rowsPerPage: 50,      // rows per page when pagination is enabled
            linkColumn: null,     // column index to convert to links (null = no links)
            linkDataColumn: null, // column index to use for link data (if different from linkColumn)
            linkPattern: '{slug}.html',  // URL pattern where {slug} gets replaced
            cacheMinutes: 5,      // cache data for 5 minutes (0 = no cache)
            hideColumns: [],      // array of column indices to hide (e.g., [0, 2])
            dateColumns: [],      // array of column indices to format as dates (e.g., [2, 3])
            columnNames: {},      // object mapping column indices to custom names (e.g., {0: 'ID', 1: 'Name'})
            ...options
        };
        this.rawData = null;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.currentPage = 1;
        
        if (this.container) {
            this.init();
        } else {
            console.warn('Container "' + containerSelector + '" not found');
        }
    }
    
    init() {
        this.container.classList.add('sheets-container');
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'sheets-content';
        this.container.appendChild(contentDiv);
        this.contentDiv = contentDiv;
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '10px';
        buttonContainer.style.overflow = 'hidden'; // Clear float
        
        let hasButtons = false;
        
        // Add the "Add New Force" button (left-aligned) - only for Crusade Forces
        if (this.container.id === 'crusade-forces-sheet') {
            const addForceBtn = document.createElement('a');
            addForceBtn.href = 'forces/add-force.html';
            addForceBtn.className = 'add-force-btn';
            addForceBtn.textContent = '+ Add New Force';
            buttonContainer.appendChild(addForceBtn);
            hasButtons = true;
        }
        
        // Add refresh button if enabled (right-aligned)
        if (this.options.showRefreshButton) {
            const refreshBtn = document.createElement('button');
            refreshBtn.className = 'sheets-refresh';
            refreshBtn.textContent = 'Refresh Data';
            refreshBtn.onclick = () => this.refresh();
            buttonContainer.appendChild(refreshBtn);
            this.refreshBtn = refreshBtn;
            hasButtons = true;
        }
        
        // Only append button container if we have buttons
        if (hasButtons) {
            this.container.appendChild(buttonContainer);
        }
        
        if (this.options.autoLoad) {
            this.loadData();
        }
    }
    
    async loadData() {
        this.showLoading();
        
        try {
            // Check for cached data first
            const cachedData = this.getCachedData();
            if (cachedData && !this.isCacheExpired(cachedData.timestamp)) {
                console.log('Loading from cache:', this.appsScriptUrl);
                this.rawData = cachedData.data;
                this.displayData(cachedData.data);
                return;
            }
            
            console.log('Loading fresh data:', this.appsScriptUrl);
            const response = await fetch(this.appsScriptUrl);
            
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            
            const data = await response.json();
            this.rawData = data;
            
            // Cache the fresh data
            this.setCachedData(data);
            
            this.displayData(data);
            
        } catch (error) {
            console.error('Error loading sheets data:', error);
            
            // Try to fall back to cached data if available
            const cachedData = this.getCachedData();
            if (cachedData) {
                console.log('Falling back to cached data due to error');
                this.rawData = cachedData.data;
                this.displayData(cachedData.data);
                this.showCacheWarning();
            } else {
                this.showError(error.message);
            }
        }
    }
    
    showLoading() {
        if (this.refreshBtn) {
            this.refreshBtn.disabled = true;
            this.refreshBtn.textContent = 'Loading...';
        }
        
        this.contentDiv.innerHTML = '<div class="sheets-loading">Loading data...</div>';
    }
    
    showError(message) {
        this.contentDiv.innerHTML = '<div class="sheets-error"><strong>Error loading data:</strong> ' + message + '</div>';
        
        if (this.refreshBtn) {
            this.refreshBtn.disabled = false;
            this.refreshBtn.textContent = 'Refresh Data';
        }
    }
    
    /**
     * Filter out rows that have been soft-deleted (have a Deleted Timestamp value)
     * This happens client-side as an additional safety measure
     */
    filterActiveRows(rows) {
        if (!rows || rows.length <= 1) return rows;
        
        const headers = rows[0];
        const deletedTimestampIndex = headers.findIndex(h => 
            h && (h === 'Deleted Timestamp' || h.toLowerCase() === 'deleted timestamp')
        );
        
        // If no Deleted Timestamp column, return all rows
        if (deletedTimestampIndex === -1) return rows;
        
        // Filter to only include rows where Deleted Timestamp is empty
        const activeRows = [headers].concat(
            rows.slice(1).filter(row => !row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')
        );
        
        const deletedCount = rows.length - activeRows.length;
        if (deletedCount > 0) {
            console.log(`Filtered ${deletedCount} deleted rows`);
        }
        
        // Also add Deleted Timestamp to hideColumns if not already there
        if (!this.options.hideColumns.includes(deletedTimestampIndex)) {
            this.options.hideColumns.push(deletedTimestampIndex);
        }
        
        return activeRows;
    }
    
    displayData(rows) {
        if (!rows || rows.length === 0) {
            this.showError('No data found');
            return;
        }
        
        // Filter out soft-deleted rows
        rows = this.filterActiveRows(rows);
        
        // Apply row limit if specified
        let displayRows = rows;
        let totalDataRows = rows.length - 1; // Exclude header
        
        if (this.options.maxRows && !this.options.pagination) {
            // Simple row limiting with scrolling
            displayRows = [rows[0]].concat(rows.slice(1, this.options.maxRows + 1));
        }
        
        let html = '';
        
        // Add pagination controls if enabled
        if (this.options.pagination && rows.length > 1) {
            const totalPages = Math.ceil(totalDataRows / this.options.rowsPerPage);
            const startRow = (this.currentPage - 1) * this.options.rowsPerPage + 1;
            const endRow = Math.min(startRow + this.options.rowsPerPage - 1, totalDataRows);
            
            displayRows = [rows[0]].concat(rows.slice(startRow, endRow + 1));
            
            html += this.createPaginationControls(totalPages, totalDataRows);
        }
        
        // Determine if we need scrolling
        const needsScrolling = !this.options.pagination && 
                             (!this.options.maxRows || totalDataRows > this.options.maxRows);
        
        // Create table wrapper with appropriate styling
        const wrapperClass = needsScrolling ? 'sheets-table-wrapper' : 'sheets-table-wrapper no-scroll';
        const wrapperStyle = needsScrolling ? 'max-height: ' + this.options.maxHeight + ';' : '';
        
        html += '<div class="' + wrapperClass + '" style="' + wrapperStyle + '">';
        html += '<table class="sheets-table">';
        
        // Header row with sorting
        if (displayRows.length > 0) {
            html += '<tr>';
            for (let index = 0; index < displayRows[0].length; index++) {
                const cell = displayRows[0][index];
                // Skip hidden columns
                if (this.options.hideColumns.includes(index)) continue;
                
                // Use custom column name if provided, otherwise use original
                const displayName = this.options.columnNames[index] || cell;
                
                const sortClass = this.sortColumn === index ? 'sort-' + this.sortDirection : '';
                const sortable = this.options.sortable ? 'onclick="this.closest(\'.sheets-container\').sheetsEmbed.sortBy(' + index + ')"' : '';
                const escapedCell = String(displayName || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                html += '<th class="' + sortClass + '" ' + sortable + '>' + escapedCell;
                if (this.options.sortable) {
                    html += '<span class="sort-indicator"></span>';
                }
                html += '</th>';
            }
            html += '</tr>';
            
            // Data rows
            for (let i = 1; i < displayRows.length; i++) {
                html += '<tr>';
                for (let cellIndex = 0; cellIndex < displayRows[i].length; cellIndex++) {
                    const cell = displayRows[i][cellIndex];
                    // Skip hidden columns
                    if (this.options.hideColumns.includes(cellIndex)) continue;
                    
                    const escapedCell = String(cell || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    
                    // Format date columns
                    let displayCell = escapedCell;
                    if (this.options.dateColumns.includes(cellIndex) && cell) {
                        displayCell = this.formatDate(cell);
                    }
                    
                    // Check if this column should be converted to links
                    if (this.options.linkColumn === cellIndex && cell) {
                        // Determine what value to use for the link
                        let linkValue;
                        if (this.options.linkDataColumn !== null && this.options.linkDataColumn !== undefined) {
                            // Use a different column's value for the link
                            linkValue = displayRows[i][this.options.linkDataColumn] || cell;
                        } else {
                            // Use this column's value for the link
                            linkValue = cell;
                        }
                        
                        const encodedValue = encodeURIComponent(linkValue);
                        const url = this.options.linkPattern.replace('{slug}', encodedValue);
                        html += '<td><a href="' + url + '" style="color: #4ecdc4; text-decoration: none;">' + displayCell + '</a></td>';
                    } else {
                        html += '<td>' + displayCell + '</td>';
                    }
                }
                html += '</tr>';
            }
        }
        
        html += '</table>';
        html += '</div>'; // Close table wrapper
        
        if (this.options.showStats) {
            const displayedRows = displayRows.length - 1;
            const cachedData = this.getCachedData();
            const isFromCache = cachedData && !this.isCacheExpired(cachedData.timestamp);
            
            // Count visible columns (excluding hidden ones)
            const visibleColumns = rows[0] && rows[0].length ? rows[0].length - this.options.hideColumns.length : 0;
            
            let statsText = '⚔️ Showing ' + displayedRows + ' of ' + totalDataRows + ' active rows, ' + visibleColumns + ' columns | Last updated: ' + new Date().toLocaleString();
            
            if (isFromCache) {
                const cacheAgeHours = Math.round((Date.now() - cachedData.timestamp) / 3600000);
                const cacheAgeMinutes = Math.round((Date.now() - cachedData.timestamp) / 60000);
                
                if (cacheAgeHours >= 1) {
                    statsText += ' | 💾 Cached ' + cacheAgeHours + 'h ago';
                } else {
                    statsText += ' | 💾 Cached ' + cacheAgeMinutes + 'm ago';
                }
            }
            
            if (this.sortColumn !== null) {
                statsText += ' | Sorted by column ' + (this.sortColumn + 1) + ' (' + this.sortDirection + ')';
            }
            
            if (this.options.pagination) {
                statsText += ' | Page ' + this.currentPage;
            }
            
            html += '<div class="sheets-stats">' + statsText + '</div>';
        }
        
        this.contentDiv.innerHTML = html;
        
        // Store reference to this embed instance for sorting
        this.container.sheetsEmbed = this;
        
        if (this.refreshBtn) {
            this.refreshBtn.disabled = false;
            this.refreshBtn.textContent = 'Refresh Data';
        }
    }
    
    createPaginationControls(totalPages, totalRows) {
        const startRow = (this.currentPage - 1) * this.options.rowsPerPage + 1;
        const endRow = Math.min(startRow + this.options.rowsPerPage - 1, totalRows);
        
        return '<div class="sheets-pagination">' +
            '<button onclick="this.closest(\'.sheets-container\').sheetsEmbed.goToPage(1)" ' + 
            (this.currentPage === 1 ? 'disabled' : '') + '>First</button>' +
            '<button onclick="this.closest(\'.sheets-container\').sheetsEmbed.goToPage(' + (this.currentPage - 1) + ')" ' +
            (this.currentPage === 1 ? 'disabled' : '') + '>Previous</button>' +
            '<span class="page-info">Page ' + this.currentPage + ' of ' + totalPages + 
            ' (rows ' + startRow + '-' + endRow + ' of ' + totalRows + ')</span>' +
            '<button onclick="this.closest(\'.sheets-container\').sheetsEmbed.goToPage(' + (this.currentPage + 1) + ')" ' +
            (this.currentPage === totalPages ? 'disabled' : '') + '>Next</button>' +
            '<button onclick="this.closest(\'.sheets-container\').sheetsEmbed.goToPage(' + totalPages + ')" ' +
            (this.currentPage === totalPages ? 'disabled' : '') + '>Last</button>' +
            '<select onchange="this.closest(\'.sheets-container\').sheetsEmbed.changeRowsPerPage(parseInt(this.value))">' +
            '<option value="25"' + (this.options.rowsPerPage === 25 ? ' selected' : '') + '>25 per page</option>' +
            '<option value="50"' + (this.options.rowsPerPage === 50 ? ' selected' : '') + '>50 per page</option>' +
            '<option value="100"' + (this.options.rowsPerPage === 100 ? ' selected' : '') + '>100 per page</option>' +
            '<option value="200"' + (this.options.rowsPerPage === 200 ? ' selected' : '') + '>200 per page</option>' +
            '</select></div>';
    }
    
    goToPage(pageNumber) {
        if (!this.rawData) return;
        
        // Re-filter active rows when changing pages
        const activeData = this.filterActiveRows(this.rawData);
        const totalDataRows = activeData.length - 1;
        const totalPages = Math.ceil(totalDataRows / this.options.rowsPerPage);
        
        this.currentPage = Math.max(1, Math.min(pageNumber, totalPages));
        this.displayData(activeData);
    }
    
    changeRowsPerPage(newRowsPerPage) {
        this.options.rowsPerPage = newRowsPerPage;
        this.currentPage = 1; // Reset to first page
        this.displayData(this.rawData);
    }
    
    sortBy(columnIndex) {
        if (!this.rawData || this.rawData.length <= 1) return;
        
        // Filter active rows before sorting
        let activeData = this.filterActiveRows(this.rawData);
        
        // Toggle sort direction if clicking the same column
        if (this.sortColumn === columnIndex) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnIndex;
            this.sortDirection = 'asc';
        }
        
        // Create a copy of the data to sort
        const headerRow = activeData[0];
        const dataRows = activeData.slice(1);
        
        // Sort the data rows
        dataRows.sort((a, b) => {
            let aVal = a[columnIndex] || '';
            let bVal = b[columnIndex] || '';
            
            // Try to convert to numbers if possible
            const aNum = parseFloat(aVal);
            const bNum = parseFloat(bVal);
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                // Numeric sort
                return this.sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
            } else {
                // String sort
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
                
                if (this.sortDirection === 'asc') {
                    return aVal.localeCompare(bVal);
                } else {
                    return bVal.localeCompare(aVal);
                }
            }
        });
        
        // Rebuild the sorted data array
        const sortedData = [headerRow].concat(dataRows);
        this.displayData(sortedData);
    }
    
    // Method to refresh data programmatically (bypasses cache)
    refresh() {
        this.clearCache(); // Clear cache before loading fresh data
        this.loadData();
    }
    
    // Create URL-friendly slug from text
    createSlug(text) {
        return String(text)
            .toLowerCase()                    // Convert to lowercase
            .trim()                          // Remove leading/trailing spaces
            .replace(/[^\w\s-]/g, '')       // Remove special characters except spaces and hyphens
            .replace(/[\s_-]+/g, '-')       // Replace spaces, underscores, multiple hyphens with single hyphen
            .replace(/^-+|-+$/g, '');       // Remove leading/trailing hyphens
    }
    
    // Format date to yyyy-MM-dd
    formatDate(dateValue) {
        try {
            // Handle various date formats
            let date;
            
            if (dateValue instanceof Date) {
                date = dateValue;
            } else if (typeof dateValue === 'string') {
                // Try parsing the string
                date = new Date(dateValue);
            } else if (typeof dateValue === 'number') {
                // Excel/Google Sheets serial date number
                date = new Date((dateValue - 25569) * 86400 * 1000);
            } else {
                return String(dateValue);
            }
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return String(dateValue);
            }
            
            // Format as yyyy-MM-dd
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            return year + '-' + month + '-' + day;
        } catch (error) {
            console.warn('Date formatting error:', error);
            return String(dateValue);
        }
    }
    
    // Cache management methods
    getCacheKey() {
        // Create a unique cache key based on the Apps Script URL AND container ID
        const containerKey = this.container.id || 'unknown';
        return 'sheets_cache_' + containerKey + '_' + btoa(this.appsScriptUrl).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    }
    
    getCachedData() {
        if (this.options.cacheMinutes <= 0) return null;
        
        try {
            const cacheKey = this.getCacheKey();
            const cached = localStorage.getItem(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.warn('Error reading cache:', error);
            return null;
        }
    }
    
    setCachedData(data) {
        if (this.options.cacheMinutes <= 0) return;
        
        try {
            const cacheKey = this.getCacheKey();
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                url: this.appsScriptUrl
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            console.log('Cached data for ' + this.options.cacheMinutes + ' minutes (' + Math.round(this.options.cacheMinutes/60) + ' hours)');
        } catch (error) {
            console.warn('Error setting cache:', error);
        }
    }
    
    isCacheExpired(timestamp) {
        if (this.options.cacheMinutes <= 0) return true;
        
        const cacheAgeMs = Date.now() - timestamp;
        const cacheExpireMs = this.options.cacheMinutes * 60 * 1000;
        return cacheAgeMs > cacheExpireMs;
    }
    
    clearCache() {
        try {
            const cacheKey = this.getCacheKey();
            localStorage.removeItem(cacheKey);
            console.log('Cache cleared');
        } catch (error) {
            console.warn('Error clearing cache:', error);
        }
    }
    
    showCacheWarning() {
        // Add a subtle indicator that we're showing cached data due to an error
        const existingStats = this.contentDiv.querySelector('.sheets-stats');
        if (existingStats) {
            existingStats.innerHTML += ' | ⚠️ <em>Showing cached data (connection issue)</em>';
            existingStats.style.backgroundColor = '#4a3a1e';
            existingStats.style.borderLeft = '3px solid #ffa500';
        }
    }
}