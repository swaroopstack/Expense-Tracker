// --- State Management ---
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let currentEditId = null;
let cashFlowChart = null;

// --- DOM Elements ---
const form = document.getElementById('transaction-form');
const typeRadios = document.getElementsByName('type');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('date');
const categoryInput = document.getElementById('category');
const noteInput = document.getElementById('note');
const submitBtn = document.getElementById('submit-btn');
const transactionList = document.getElementById('transaction-list');

// Summary Elements
const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');

// --- Initialization ---
function init() {
    // Set default date to today
    dateInput.valueAsDate = new Date();
    updateUI();
    
    // Event Listeners
    form.addEventListener('submit', handleFormSubmit);
    
    // Auto-update categories based on type selection
    typeRadios.forEach(radio => {
        radio.addEventListener('change', updateCategories);
    });
}

// --- Core Functions ---
function updateUI() {
    renderTransactions();
    updateSummaryCards();
    renderChart();
    saveData();
}

function handleFormSubmit(e) {
    e.preventDefault();

    const type = Array.from(typeRadios).find(r => r.checked).value;
    const amount = parseFloat(amountInput.value);
    const date = dateInput.value;
    const category = categoryInput.value;
    const note = noteInput.value.trim() || category;

    if (!amount || !date || !category) return;

    const transaction = {
        id: currentEditId || generateID(),
        type,
        amount,
        date,
        category,
        note
    };

    if (currentEditId) {
        // Edit mode
        transactions = transactions.map(t => t.id === currentEditId ? transaction : t);
        currentEditId = null;
        submitBtn.textContent = 'Add Transaction';
    } else {
        // Add mode
        transactions.push(transaction);
    }

    form.reset();
    dateInput.valueAsDate = new Date();
    updateUI();
}

function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    // Populate form
    currentEditId = transaction.id;
    Array.from(typeRadios).find(r => r.value === transaction.type).checked = true;
    updateCategories();
    
    amountInput.value = transaction.amount;
    dateInput.value = transaction.date;
    categoryInput.value = transaction.category;
    noteInput.value = transaction.note !== transaction.category ? transaction.note : '';
    
    submitBtn.textContent = 'Update Transaction';
    
    // Scroll to form smoothly
    document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
}

function deleteTransaction(id) {
    if(confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== id);
        updateUI();
    }
}

// --- UI Rendering ---
function renderTransactions() {
    transactionList.innerHTML = '';
    
    // Sort by date descending
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedTransactions.length === 0) {
        transactionList.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No transactions yet.</td></tr>`;
        return;
    }

    sortedTransactions.forEach(t => {
        const tr = document.createElement('tr');
        
        // Format Date
        const dateObj = new Date(t.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        // Format Currency
        const sign = t.type === 'income' ? '+' : '-';
        const formattedAmount = `${sign}$${t.amount.toFixed(2)}`;
        const amountClass = t.type === 'income' ? 'amt-income' : 'amt-expense';

        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td style="font-weight: 500;">${t.note}</td>
            <td><span class="badge">${t.category}</span></td>
            <td class="${amountClass}">${formattedAmount}</td>
            <td>
                <button class="action-btn" onclick="editTransaction('${t.id}')"><i class="fa-regular fa-pen-to-square"></i></button>
                <button class="action-btn delete" onclick="deleteTransaction('${t.id}')"><i class="fa-regular fa-trash-can"></i></button>
            </td>
        `;
        transactionList.appendChild(tr);
    });
}

function updateSummaryCards() {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const balance = income - expense;

    totalBalanceEl.textContent = `$${balance.toFixed(2)}`;
    totalIncomeEl.textContent = `$${income.toFixed(2)}`;
    totalExpenseEl.textContent = `$${expense.toFixed(2)}`;
}

function renderChart() {
    const ctx = document.getElementById('cashFlowChart').getContext('2d');
    
    // Group transactions by category for expenses
    const expenses = transactions.filter(t => t.type === 'expense');
    const categoryTotals = {};
    
    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    // Destroy existing chart to prevent canvas overlap issues
    if (cashFlowChart) cashFlowChart.destroy();

    // Default empty state chart
    if(labels.length === 0) {
        cashFlowChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{ data: [1], backgroundColor: ['#2a2a2a'], borderWidth: 0 }]
            },
            options: { cutout: '80%', plugins: { legend: { display: false } } }
        });
        return;
    }

    cashFlowChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#ffffff', '#a1a1aa', '#52525b', '#3f3f46', '#27272a', '#18181b'],
                borderColor: '#141414',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#a1a1aa', font: { family: "'Inter', sans-serif" }, usePointStyle: true, padding: 20 }
                }
            }
        }
    });
}

// --- Utility Functions ---
function updateCategories() {
    const isIncome = Array.from(typeRadios).find(r => r.value === 'income').checked;
    categoryInput.innerHTML = '';
    
    const categories = isIncome 
        ? ['Salary', 'Freelance', 'Investments', 'Other']
        : ['Food', 'Travel', 'Bills', 'Shopping', 'Subscriptions', 'Other'];
        
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryInput.appendChild(option);
    });
}

function generateID() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Boot up the app
init();