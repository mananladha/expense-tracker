import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, TrendingUp, TrendingDown, Wallet, Building, Calendar, Download, Filter } from 'lucide-react';

export default function ExpenseTracker() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([
    { id: 'cash', name: 'Cash', balance: 0 },
    { id: 'bank1', name: 'Bank Account 1', balance: 0 },
    { id: 'bank2', name: 'Bank Account 2', balance: 0 }
  ]);
  
  const [formData, setFormData] = useState({
    type: 'debit',
    amount: '',
    mode: 'cash',
    item: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [filter, setFilter] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: 'all'
  });

  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const savedTransactions = localStorage.getItem('transactions');
    const savedAccounts = localStorage.getItem('accounts');
    
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }
    if (savedAccounts) {
      setAccounts(JSON.parse(savedAccounts));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    calculateBalances();
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('accounts', JSON.stringify(accounts));
  }, [accounts]);

  const calculateBalances = () => {
    const newAccounts = accounts.map(acc => ({ ...acc, balance: 0 }));
    
    transactions.forEach(t => {
      const accountIndex = newAccounts.findIndex(a => a.id === t.mode);
      if (accountIndex !== -1) {
        if (t.type === 'credit') {
          newAccounts[accountIndex].balance += parseFloat(t.amount);
        } else {
          newAccounts[accountIndex].balance -= parseFloat(t.amount);
        }
      }
    });
    
    setAccounts(newAccounts);
  };

  const handleSubmit = () => {
    if (!formData.amount || !formData.item) return;

    const newTransaction = {
      id: Date.now(),
      ...formData,
      amount: parseFloat(formData.amount)
    };

    setTransactions([newTransaction, ...transactions]);
    setFormData({
      type: 'debit',
      amount: '',
      mode: 'cash',
      item: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const deleteTransaction = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      const transDate = new Date(t.date);
      const start = new Date(filter.startDate);
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59);
      
      const dateMatch = transDate >= start && transDate <= end;
      const typeMatch = filter.type === 'all' || t.type === filter.type;
      
      return dateMatch && typeMatch;
    });
  };

  const generateSummary = () => {
    const filtered = getFilteredTransactions();
    const totalCredit = filtered.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const totalDebit = filtered.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    
    let summary = '📊 EXPENSE SUMMARY\n';
    summary += 'Period: ' + filter.startDate + ' to ' + filter.endDate + '\n\n';
    summary += '💰 Total Credit: ₹' + totalCredit.toFixed(2) + '\n';
    summary += '💸 Total Debit: ₹' + totalDebit.toFixed(2) + '\n';
    summary += '📈 Net: ₹' + (totalCredit - totalDebit).toFixed(2) + '\n\n';
    summary += '💳 ACCOUNT BALANCES:\n';
    accounts.forEach(acc => {
      summary += acc.name + ': ₹' + acc.balance.toFixed(2) + '\n';
    });
    summary += '\n📝 TRANSACTIONS (' + filtered.length + '):\n';
    filtered.forEach(t => {
      summary += t.date + ' | ' + (t.type === 'credit' ? '+' : '-') + '₹' + t.amount + ' | ' + t.item + ' | ' + t.mode + '\n';
    });
    
    return summary;
  };

  const downloadSummary = () => {
    const summary = generateSummary();
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expense-summary-' + new Date().toISOString().split('T')[0] + '.txt';
    a.click();
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const filteredTransactions = getFilteredTransactions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Wallet className="text-indigo-600" />
            Daily Expense Tracker
          </h1>
          <p className="text-gray-600">Track your income and expenses easily</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100">Total Balance</span>
              <TrendingUp size={20} />
            </div>
            <div className="text-2xl font-bold">₹{totalBalance.toFixed(2)}</div>
          </div>
          {accounts.map(acc => (
            <div key={acc.id} className="bg-white rounded-xl p-4 shadow-lg border-2 border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">{acc.name}</span>
                {acc.id === 'cash' ? <Wallet size={18} className="text-indigo-600" /> : <Building size={18} className="text-indigo-600" />}
              </div>
              <div className="text-xl font-bold text-gray-800">₹{acc.balance.toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <PlusCircle className="text-indigo-600" />
              Add Transaction
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setFormData({...formData, type: 'credit'})}
                  className={'flex-1 py-3 rounded-lg font-semibold transition ' + (formData.type === 'credit' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600')}
                >
                  Credit (+)
                </button>
                <button
                  onClick={() => setFormData({...formData, type: 'debit'})}
                  className={'flex-1 py-3 rounded-lg font-semibold transition ' + (formData.type === 'debit' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600')}
                >
                  Debit (-)
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({...formData, mode: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="cash">Cash</option>
                  <option value="bank1">Bank Account 1</option>
                  <option value="bank2">Bank Account 2</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item/Description</label>
                <input
                  type="text"
                  value={formData.item}
                  onChange={(e) => setFormData({...formData, item: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Groceries, Salary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleSubmit}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Add Transaction
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Filter className="text-indigo-600" />
                Filters & Summary
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filter.startDate}
                  onChange={(e) => setFilter({...filter, startDate: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filter.endDate}
                  onChange={(e) => setFilter({...filter, endDate: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filter.type}
                  onChange={(e) => setFilter({...filter, type: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Transactions</option>
                  <option value="credit">Credit Only</option>
                  <option value="debit">Debit Only</option>
                </select>
              </div>

              <div className="pt-4 border-t">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Total Credit:</span>
                    <span className="font-bold text-green-600">
                      ₹{filteredTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Debit:</span>
                    <span className="font-bold text-red-600">
                      ₹{filteredTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowSummary(!showSummary)}
                  className="w-full bg-indigo-100 text-indigo-700 py-2 rounded-lg font-semibold hover:bg-indigo-200 transition mb-2"
                >
                  {showSummary ? 'Hide' : 'Show'} Summary
                </button>

                <button
                  onClick={downloadSummary}
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Download Summary
                </button>
              </div>
            </div>
          </div>
        </div>

        {showSummary && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Summary Report</h2>
            <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
              {generateSummary()}
            </pre>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="text-indigo-600" />
            Recent Transactions ({filteredTransactions.length})
          </h2>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No transactions found</p>
            ) : (
              filteredTransactions.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={'w-12 h-12 rounded-full flex items-center justify-center ' + (t.type === 'credit' ? 'bg-green-100' : 'bg-red-100')}>
                      {t.type === 'credit' 
                        ? <TrendingUp className="text-green-600" size={20} />
                        : <TrendingDown className="text-red-600" size={20} />
                      }
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{t.item}</div>
                      <div className="text-sm text-gray-500">{t.date} • {accounts.find(a => a.id === t.mode)?.name}</div>
                    </div>
                    <div className={'text-lg font-bold ' + (t.type === 'credit' ? 'text-green-600' : 'text-red-600')}>
                      {t.type === 'credit' ? '+' : '-'}₹{t.amount.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTransaction(t.id)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}