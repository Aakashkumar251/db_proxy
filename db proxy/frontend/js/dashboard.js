// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Query history array
let queryHistory = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeEventListeners();
    loadQueryHistory();
    loadCompanyLogs();
    loadAnalytics();
});

// Tab switching functionality
function initializeTabs() {
    const menuItems = document.querySelectorAll('.menu-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            
            // Update active menu item
            menuItems.forEach(menu => menu.classList.remove('active'));
            item.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // Refresh data when switching tabs
            if (tabId === 'history') {
                loadQueryHistory();
            } else if (tabId === 'logs') {
                loadCompanyLogs();
            } else if (tabId === 'analytics') {
                loadAnalytics();
            }
        });
    });
}

// Initialize event listeners
function initializeEventListeners() {
    const executeBtn = document.getElementById('executeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const refreshLogsBtn = document.getElementById('refreshLogs');
    const logSearch = document.getElementById('logSearch');
    const logFilter = document.getElementById('logFilter');
    
    if (executeBtn) {
        executeBtn.addEventListener('click', executeQuery);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearQuery);
    }
    
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', () => loadCompanyLogs());
    }
    
    if (logSearch) {
        logSearch.addEventListener('input', filterLogs);
    }
    
    if (logFilter) {
        logFilter.addEventListener('change', filterLogs);
    }
}

// Execute query through proxy
async function executeQuery() {
    const queryInput = document.getElementById('queryInput');
    const query = queryInput.value.trim();
    
    if (!query) {
        showNotification('Please enter a query', 'error');
        return;
    }
    
    // Show loading state
    const resultDiv = document.getElementById('queryResult');
    resultDiv.innerHTML = '<div class="placeholder"><i class="fas fa-spinner fa-spin"></i><p>Processing query...</p></div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, user: 'current_user' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayQueryResult(data.result);
            showNotification('Query executed successfully!', 'success');
        } else {
            displayError(data.message);
            showNotification(data.message, 'error');
        }
        
        // Refresh history and logs
        loadQueryHistory();
        loadCompanyLogs();
        loadAnalytics();
        
    } catch (error) {
        console.error('Error executing query:', error);
        displayError('Failed to execute query. Please check if the server is running.');
        showNotification('Failed to execute query', 'error');
    }
}

// Display query result
function displayQueryResult(result) {
    const resultDiv = document.getElementById('queryResult');
    
    if (!result || result.length === 0) {
        resultDiv.innerHTML = '<div class="placeholder"><i class="fas fa-database"></i><p>No results found</p></div>';
        return;
    }
    
    // Create table
    const table = document.createElement('table');
    table.className = 'result-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    Object.keys(result[0]).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    result.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    resultDiv.innerHTML = '';
    resultDiv.appendChild(table);
}

// Display error
function displayError(message) {
    const resultDiv = document.getElementById('queryResult');
    resultDiv.innerHTML = `
        <div class="placeholder" style="color: #f56565;">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error: ${message}</p>
        </div>
    `;
}

// Clear query input
function clearQuery() {
    const queryInput = document.getElementById('queryInput');
    queryInput.value = '';
    const resultDiv = document.getElementById('queryResult');
    resultDiv.innerHTML = '<div class="placeholder"><i class="fas fa-code"></i><p>Your query results will appear here</p></div>';
}

// Load query history
async function loadQueryHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/history`);
        const data = await response.json();
        
        if (data.success && data.history) {
            queryHistory = data.history;
            displayHistory(data.history);
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Display history
function displayHistory(history) {
    const historyList = document.getElementById('historyList');
    
    if (!historyList) return;
    
    if (!history || history.length === 0) {
        historyList.innerHTML = '<div class="placeholder"><i class="fas fa-clock"></i><p>No queries executed yet</p></div>';
        return;
    }
    
    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-item-header">
                <span class="status-${item.status}">
                    <i class="fas ${item.status === 'safe' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                    ${item.status === 'safe' ? 'Safe' : 'Blocked'}
                </span>
                <span>${new Date(item.timestamp).toLocaleString()}</span>
            </div>
            <div class="history-item-query">
                <strong>Query:</strong> ${escapeHtml(item.query)}
            </div>
            ${item.message ? `<div class="history-item-message"><strong>Message:</strong> ${escapeHtml(item.message)}</div>` : ''}
        </div>
    `).join('');
}

// Load company logs
async function loadCompanyLogs() {
    try {
        const response = await fetch(`${API_BASE_URL}/logs`);
        const data = await response.json();
        
        if (data.success && data.logs) {
            window.allLogs = data.logs;
            displayLogs(data.logs);
        }
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

// Display logs
function displayLogs(logs) {
    const logsList = document.getElementById('companyLogs');
    
    if (!logsList) return;
    
    if (!logs || logs.length === 0) {
        logsList.innerHTML = '<div class="placeholder"><i class="fas fa-file-alt"></i><p>No logs available</p></div>';
        return;
    }
    
    logsList.innerHTML = logs.map(log => `
        <div class="log-item">
            <div class="log-item-header">
                <span class="status-${log.status}">
                    <i class="fas ${log.status === 'safe' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                    ${log.status === 'safe' ? 'Safe Query' : 'Blocked Query'}
                </span>
                <span>${new Date(log.timestamp).toLocaleString()}</span>
            </div>
            <div><strong>User:</strong> ${escapeHtml(log.user)}</div>
            <div><strong>Query:</strong> ${escapeHtml(log.query)}</div>
            ${log.message ? `<div><strong>Message:</strong> ${escapeHtml(log.message)}</div>` : ''}
        </div>
    `).join('');
}

// Filter logs
function filterLogs() {
    const searchTerm = document.getElementById('logSearch')?.value.toLowerCase() || '';
    const filterType = document.getElementById('logFilter')?.value || 'all';
    
    let filteredLogs = window.allLogs || [];
    
    if (filterType !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.status === filterType);
    }
    
    if (searchTerm) {
        filteredLogs = filteredLogs.filter(log => 
            log.query.toLowerCase().includes(searchTerm) ||
            log.user.toLowerCase().includes(searchTerm)
        );
    }
    
    displayLogs(filteredLogs);
}

// Load analytics
async function loadAnalytics() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('safeCount').textContent = data.safeCount;
            document.getElementById('blockedCount').textContent = data.blockedCount;
            document.getElementById('totalCount').textContent = data.totalCount;
            
            // Update chart if available
            updateChart(data.safeCount, data.blockedCount);
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Update chart
let queryChart = null;

function updateChart(safe, blocked) {
    const ctx = document.getElementById('queryChart')?.getContext('2d');
    if (!ctx) return;
    
    if (queryChart) {
        queryChart.data.datasets[0].data = [safe, blocked];
        queryChart.update();
    } else {
        queryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Safe Queries', 'Blocked Queries'],
                datasets: [{
                    data: [safe, blocked],
                    backgroundColor: ['#48bb78', '#f56565'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}