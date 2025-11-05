// Configuration
const API_URL = 'https://expense-tracker-api-j6o0.onrender.com/api';

// Global State
let currentUser = null;
let userSettings = null;
let transactions = [];
let paymentModes = [];
let currentType = 'debit';
let showSummary = false;
let activeFilter = 'today';
let activeView = 'transactions';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupAuthListeners();
});

// ===========================================
// AUTHENTICATION FUNCTIONS
// ===========================================

function setupAuthListeners() {
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('registerBtn').addEventListener('click', handleRegister);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('showRegisterBtn').addEventListener('click', () => {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('registerScreen').style.display = 'flex';
    });
    document.getElementById('showLoginBtn').addEventListener('click', () => {
        document.getElementById('registerScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
    });

    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('registerConfirmPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        showApp();
    }
}

async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (!username || !password) {
        showError(errorDiv, 'Please enter username and password');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        errorDiv.classList.add('hidden');
        
        showApp();
    } catch (error) {
        console.error('Login error:', error);
        showError(errorDiv, error.message);
    }
}

async function handleRegister() {
    const name = document.getElementById('registerName').value.trim();
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const errorDiv = document.getElementById('registerError');

    if (!name || !username || !password || !confirmPassword) {
        showError(errorDiv, 'Please fill in all fields');
        return;
    }

    if (password !== confirmPassword) {
        showError(errorDiv, 'Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showError(errorDiv, 'Password must be at least 6 characters');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        
        document.getElementById('registerName').value = '';
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerConfirmPassword').value = '';
        errorDiv.classList.add('hidden');
        
        showApp();
    } catch (error) {
        console.error('Registration error:', error);
        showError(errorDiv, error.message);
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        currentUser = null;
        transactions = [];
        
        document.getElementById('app').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('registerScreen').style.display = 'none';
    }
}

function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
    setTimeout(() => element.classList.add('hidden'), 5000);
}

async function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('registerScreen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('userName').textContent = currentUser.name;
    
    await loadSettings();
    initializeDates();
    setupEventListeners();
    loadTransactions();
}

// ===========================================
// SETTINGS FUNCTIONS
// ===========================================

// app.js: ~ line 149
async function loadSettings() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            userSettings = await response.json();
            
            // ⭐️ FIX 1: Map the simple string array from the backend 
            // into the object array format expected by the frontend UI.
            paymentModes = (userSettings.paymentModes || []).map((name, index) => ({
                id: 'mode' + (index + 1), // Generate an ID for the frontend dropdown/form
                name: name
            }));
            
            updatePaymentModeOptions();
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function updatePaymentModeOptions() {
    const select = document.getElementById('mode');
    select.innerHTML = '';
    
    // ⭐️ FIX 2: Check for empty array and add a placeholder if necessary
    if (paymentModes.length === 0) {
         select.innerHTML = '<option value="" disabled selected>No modes available</option>';
         return;
    }
    
    paymentModes.forEach(mode => {
        const option = document.createElement('option');
        // mode.id is the generated string 'modeX'
        option.value = mode.id; 
        option.textContent = mode.name;
        select.appendChild(option);
    });
}

// app.js: ~ line 225
function loadSettingsForm() {
    if (!userSettings) return;

    document.getElementById('settingsName').value = userSettings.name || '';
    document.getElementById('settingsEmail').value = userSettings.email || '';
    
    // ⭐️ FINAL FIX: Ensure you are reading userSettings.email2 and writing it to settingsEmail2 ⭐️
    const email2Element = document.getElementById('settingsEmail2');
    if (email2Element) {
        email2Element.value = userSettings.email2 || '';
    } else {
        console.warn('HTML element settingsEmail2 not found.');
    }
    
    document.getElementById('settingsPhone').value = userSettings.phone || '';

    renderPaymentModes();
}

function renderPaymentModes() {
    const container = document.getElementById('paymentModesList');
    container.innerHTML = '';

    paymentModes.forEach((mode, index) => {
        const div = document.createElement('div');
        div.className = 'flex gap-3 items-center';
        div.innerHTML = `
            <input type="text" value="${mode.name}" 
                data-index="${index}"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                placeholder="Payment mode name">
            <button onclick="removePaymentMode(${index})" class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                🗑️
            </button>
        `;
        container.appendChild(div);
    });
}

function addPaymentModeField() {
    if (paymentModes.length >= 5) {
        alert('Maximum 5 payment modes allowed');
        return;
    }

    const newId = 'mode' + (paymentModes.length + 1);
    paymentModes.push({ id: newId, name: '' });
    renderPaymentModes();
}

function removePaymentMode(index) {
    if (paymentModes.length <= 1) {
        alert('You must have at least one payment mode');
        return;
    }
    
    if (confirm('Remove this payment mode?')) {
        paymentModes.splice(index, 1);
        renderPaymentModes();
    }
}

async function saveSettings() {
    const name = document.getElementById('settingsName')?.value.trim() || '';
    const email = document.getElementById('settingsEmail')?.value.trim() || '';
    const email2 = document.getElementById('settingsEmail2')?.value.trim() || '';
    const phone = document.getElementById('settingsPhone')?.value.trim() || '';

    const inputs = document.querySelectorAll('#paymentModesList input');
    const updatedModesPayload = []; // ⭐️ NEW VARIABLE: Holds the simple string array for the backend
    
    inputs.forEach((input) => {
        const modeName = input.value.trim();
        if (modeName) {
            // ⭐️ FIX 3A: Only push the NAME (string) to the payload, 
            // as the backend expects an array of simple strings (customModes)
            updatedModesPayload.push(modeName);
        }
    });

    if (!name) {
        alert('Name is required');
        return;
    }

    if (updatedModesPayload.length === 0) {
        alert('At least one payment mode is required');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                email,
                email2,
                phone,
                // ⭐️ FIX 3B: Use the simple string array for the API
                paymentModes: updatedModesPayload 
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to save settings');
        }

        currentUser.name = name;
        localStorage.setItem('user', JSON.stringify(currentUser));
        document.getElementById('userName').textContent = name;

        // ⭐️ FIX 3C: Re-map the response data back to frontend object format
        // (Similar to Fix 1 in loadSettings)
        userSettings = data.settings; // Note: You changed the backend to return 'settings'
        paymentModes = (userSettings.paymentModes || []).map((name, index) => ({
            id: 'mode' + (index + 1),
            name: name
        }));

        updatePaymentModeOptions();

        alert('Settings saved successfully!');
        switchView('transactions');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings: ' + error.message);
    }
}

// ===========================================
// TRANSACTION FUNCTIONS
// ===========================================

async function loadTransactions() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/transactions?_=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                handleLogout();
                return;
            }
            throw new Error('Failed to fetch');
        }
        
        transactions = await response.json();
        updateConnectionStatus(true);
        render();
    } catch (error) {
        console.error('Error loading transactions:', error);
        updateConnectionStatus(false);
        alert('Could not connect to server. Make sure backend is running on http://localhost:3000');
    }
}

function updateConnectionStatus(connected) {
    const status = document.getElementById('connectionStatus');
    if (connected) {
        status.textContent = '🟢 Connected';
        status.className = 'text-sm font-normal text-green-600';
    } else {
        status.textContent = '🔴 Disconnected';
        status.className = 'text-sm font-normal text-red-600';
    }
}

function setType(type) {
    currentType = type;
    const creditBtn = document.getElementById('creditBtn');
    const debitBtn = document.getElementById('debitBtn');
    
    if (type === 'credit') {
        creditBtn.className = 'flex-1 py-3 rounded-lg font-semibold transition bg-green-500 text-white';
        debitBtn.className = 'flex-1 py-3 rounded-lg font-semibold transition bg-gray-100 text-gray-600';
    } else {
        creditBtn.className = 'flex-1 py-3 rounded-lg font-semibold transition bg-gray-100 text-gray-600';
        debitBtn.className = 'flex-1 py-3 rounded-lg font-semibold transition bg-red-500 text-white';
    }
}

async function addTransaction() {
    const amount = document.getElementById('amount').value;
    const modeId = document.getElementById('mode').value;
    const item = document.getElementById('item').value;
    const date = document.getElementById('date').value;

    if (!amount || !item || !date) {
        alert('Please fill in all fields');
        return;
    }

    const selectedMode = paymentModes.find(m => m.id === modeId);
    if (!selectedMode) {
        alert('Invalid payment mode');
        return;
    }

    const transaction = {
        type: currentType,
        amount: parseFloat(amount),
        mode: modeId,
        modeName: selectedMode.name,
        item: item,
        date: date
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(transaction)
        });

        if (!response.ok) throw new Error('Failed to add transaction');

        const newTransaction = await response.json();
        transactions.unshift(newTransaction);

        document.getElementById('amount').value = '';
        document.getElementById('item').value = '';

        render();
        alert('Transaction added successfully!');

    } catch (error) {
        console.error('Error adding transaction:', error);
        alert('Failed to add transaction');
    }
}

async function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to delete');

        await loadTransactions();
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Failed to delete transaction');
    }
}

// ===========================================
// UI & RENDER FUNCTIONS
// ===========================================

function switchView(view) {
    activeView = view;
    
    if (view === 'transactions') {
        document.getElementById('transactionsView').style.display = 'block';
        document.getElementById('settingsView').style.display = 'none';
        document.getElementById('transactionsTab').classList.add('tab-active');
        document.getElementById('settingsTab').classList.remove('tab-active');
        document.getElementById('settingsTab').classList.add('text-gray-600');
        document.getElementById('transactionsTab').classList.remove('text-gray-600');
    } else {
        document.getElementById('transactionsView').style.display = 'none';
        document.getElementById('settingsView').style.display = 'block';
        document.getElementById('settingsTab').classList.add('tab-active');
        document.getElementById('transactionsTab').classList.remove('tab-active');
        document.getElementById('transactionsTab').classList.add('text-gray-600');
        document.getElementById('settingsTab').classList.remove('text-gray-600');
        
        loadSettingsForm();
    }
}

function initializeDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    setQuickFilter('today');
}

function setupEventListeners() {
    // Tab switching
    document.getElementById('transactionsTab').addEventListener('click', () => switchView('transactions'));
    document.getElementById('settingsTab').addEventListener('click', () => switchView('settings'));
    document.getElementById('settingsBtn').addEventListener('click', () => switchView('settings'));

    // Transaction actions
    document.getElementById('creditBtn').addEventListener('click', () => setType('credit'));
    document.getElementById('debitBtn').addEventListener('click', () => setType('debit'));
    document.getElementById('addBtn').addEventListener('click', addTransaction);
    document.getElementById('toggleSummary').addEventListener('click', toggleSummarySection);
    document.getElementById('downloadBtn').addEventListener('click', downloadSummary);

    // Quick filters
    document.getElementById('todayBtn').addEventListener('click', () => setQuickFilter('today'));
    document.getElementById('yesterdayBtn').addEventListener('click', () => setQuickFilter('yesterday'));
    document.getElementById('thisWeekBtn').addEventListener('click', () => setQuickFilter('thisWeek'));
    document.getElementById('thisMonthBtn').addEventListener('click', () => setQuickFilter('thisMonth'));
    document.getElementById('lastMonthBtn').addEventListener('click', () => setQuickFilter('lastMonth'));
    document.getElementById('customBtn').addEventListener('click', () => setQuickFilter('custom'));

    document.getElementById('startDate').addEventListener('change', () => {
        setQuickFilter('custom');
        render();
    });
    document.getElementById('endDate').addEventListener('change', () => {
        setQuickFilter('custom');
        render();
    });
    document.getElementById('filterType').addEventListener('change', render);

    // Report sending
    document.getElementById('sendEmailBtn').addEventListener('click', () => sendReport('email'));
    document.getElementById('sendSMSBtn').addEventListener('click', () => sendReport('sms'));
    document.getElementById('sendBothBtn').addEventListener('click', () => sendReport('both'));

    // Settings
    document.getElementById('addPaymentModeBtn').addEventListener('click', addPaymentModeField);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
}

function setQuickFilter(filter) {
    activeFilter = filter;
    const today = new Date();
    let startDate, endDate;

    switch(filter) {
        case 'today':
            startDate = endDate = new Date();
            break;
        case 'yesterday':
            startDate = endDate = new Date(today.setDate(today.getDate() - 1));
            break;
        case 'thisWeek':
            const dayOfWeek = today.getDay();
            const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            startDate = new Date(today.setDate(today.getDate() - diff));
            endDate = new Date();
            break;
        case 'thisMonth':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date();
            break;
        case 'lastMonth':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
        case 'custom':
            updateFilterButtonStyles();
            return;
    }

    if (filter !== 'custom') {
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
    }

    updateFilterButtonStyles();
    render();
}

function updateFilterButtonStyles() {
    const buttons = {
        today: document.getElementById('todayBtn'),
        yesterday: document.getElementById('yesterdayBtn'),
        thisWeek: document.getElementById('thisWeekBtn'),
        thisMonth: document.getElementById('thisMonthBtn'),
        lastMonth: document.getElementById('lastMonthBtn'),
        custom: document.getElementById('customBtn')
    };

    Object.keys(buttons).forEach(key => {
        if (key === activeFilter) {
            buttons[key].className = 'px-3 py-2 rounded-lg text-sm font-medium bg-indigo-500 text-white transition';
        } else {
            buttons[key].className = 'px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition';
        }
    });
}

function getFilteredTransactions() {
    const startStr = document.getElementById('startDate').value;
    const endStr = document.getElementById('endDate').value;
    const filterType = document.getElementById('filterType').value;

    return transactions.filter(t => {
        const transDate = new Date(t.date);
        const transDateStr = transDate.toISOString().split('T')[0];
        const dateMatch = transDateStr >= startStr && transDateStr <= endStr;
        const typeMatch = filterType === 'all' || t.type === filterType;
        return dateMatch && typeMatch;
    });
}

function calculateBalances() {
    const balances = {};
    paymentModes.forEach(mode => {
        balances[mode.id] = 0;
    });
    
    transactions.forEach(t => {
        if (balances[t.mode] !== undefined) {
            if (t.type === 'credit') {
                balances[t.mode] += t.amount;
            } else {
                balances[t.mode] -= t.amount;
            }
        }
    });
    
    return balances;
}

function render() {
    renderBalanceCards();
    renderTransactions();
    updateTotals();
    if (showSummary) {
        document.getElementById('summaryText').textContent = generateSummary();
    }
}

function renderBalanceCards() {
    const balances = calculateBalances();
    const totalBalance = Object.values(balances).reduce((sum, bal) => sum + bal, 0);
    
    let html = `
        <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
            <div class="flex items-center justify-between mb-2">
                <span class="text-green-100">Total Balance</span>
                <span>📈</span>
            </div>
            <div class="text-2xl font-bold">₹${totalBalance.toFixed(2)}</div>
        </div>
    `;
    
    paymentModes.forEach(mode => {
        html += `
            <div class="bg-white rounded-xl p-4 shadow-lg border-2 border-gray-100">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-600 text-sm">${mode.name}</span>
                    <span>💳</span>
                </div>
                <div class="text-xl font-bold text-gray-800">₹${balances[mode.id].toFixed(2)}</div>
            </div>
        `;
    });
    
    document.getElementById('balanceCards').innerHTML = html;
}

function renderTransactions() {
    const filtered = getFilteredTransactions();
    document.getElementById('transCount').textContent = filtered.length;
    const listElement = document.getElementById('transactionsList');

    listElement.innerHTML = '';

    if (filtered.length === 0) {
        listElement.innerHTML = '<p class="text-gray-500 text-center py-8">No transactions found</p>';
        return;
    }

    filtered.forEach(t => {
        const formattedDate = new Date(t.date).toISOString().split('T')[0];

        const mainDiv = document.createElement('div');
        mainDiv.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition';

        mainDiv.innerHTML = `
            <div class="flex items-center gap-4 flex-1">
                <div class="w-12 h-12 rounded-full flex items-center justify-center ${t.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}">
                    <span class="text-2xl">${t.type === 'credit' ? '📈' : '📉'}</span>
                </div>
                <div class="flex-1">
                    <div class="font-semibold text-gray-800">${t.item}</div>
                    <div class="text-sm text-gray-500">${formattedDate} • ${t.modeName}</div>
                </div>
                <div class="text-lg font-bold ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}">
                    ${t.type === 'credit' ? '+' : '-'}₹${t.amount.toFixed(2)}
                </div>
            </div>
            <button class="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                🗑️
            </button>
        `;

        const deleteButton = mainDiv.querySelector('button');
        deleteButton.onclick = () => deleteTransaction(t._id);

        listElement.appendChild(mainDiv);
    });
}

function updateTotals() {
    const filtered = getFilteredTransactions();
    const totalCredit = filtered.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const totalDebit = filtered.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);

    document.getElementById('totalCredit').textContent = '₹' + totalCredit.toFixed(2);
    document.getElementById('totalDebit').textContent = '₹' + totalDebit.toFixed(2);
}

// ===========================================
// SUMMARY & REPORTS
// ===========================================

function generateSummary() {
    const filtered = getFilteredTransactions();
    const totalCredit = filtered.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const totalDebit = filtered.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    const balances = calculateBalances();
    
    let summary = '📊 EXPENSE SUMMARY\n';
    summary += 'User: ' + currentUser.name + '\n';
    summary += 'Period: ' + document.getElementById('startDate').value + ' to ' + document.getElementById('endDate').value + '\n\n';
    summary += '💰 Total Credit: ₹' + totalCredit.toFixed(2) + '\n';
    summary += '💸 Total Debit: ₹' + totalDebit.toFixed(2) + '\n';
    summary += '📈 Net: ₹' + (totalCredit - totalDebit).toFixed(2) + '\n\n';
    summary += '💳 ACCOUNT BALANCES:\n';
    
    paymentModes.forEach(mode => {
        summary += mode.name + ': ₹' + balances[mode.id].toFixed(2) + '\n';
    });
    
    summary += '\n📝 TRANSACTIONS (' + filtered.length + '):\n';
    filtered.forEach(t => {
        const formattedDate = new Date(t.date).toISOString().split('T')[0];
        summary += formattedDate + ' | ' + (t.type === 'credit' ? '+' : '-') + '₹' + t.amount + ' | ' + t.item + ' | ' + t.modeName + '\n';
    });
    
    return summary;
}

function toggleSummarySection() {
    showSummary = !showSummary;
    const section = document.getElementById('summarySection');
    const btn = document.getElementById('toggleSummary');
    
    if (showSummary) {
        section.style.display = 'block';
        btn.textContent = 'Hide Summary';
        document.getElementById('summaryText').textContent = generateSummary();
    } else {
        section.style.display = 'none';
        btn.textContent = 'Show Summary';
    }
}

function downloadSummary() {
    const summary = generateSummary();
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expense-summary-' + new Date().toISOString().split('T')[0] + '.txt';
    a.click();
}

async function sendReport(method) {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert('Please select start and end dates');
        return;
    }

    const methodText = method === 'both' ? 'Email & SMS' : method === 'email' ? 'Email' : 'SMS';
    
    if (!confirm(`Send report for ${startDate} to ${endDate} via ${methodText}?`)) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reports/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                startDate,
                endDate,
                method 
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send report');
        }

        let message = 'Report sent successfully!\n\n';
        if (data.results.sms) {
            message += data.results.sms.success ? '✅ SMS sent\n' : '❌ SMS failed: ' + data.results.sms.error + '\n';
        }
        if (data.results.email) {
            message += data.results.email.success ? '✅ Email sent\n' : '❌ Email failed: ' + data.results.email.error + '\n';
        }

        alert(message);
    } catch (error) {
        console.error('Error sending report:', error);
        alert('Failed to send report: ' + error.message);
    }
}