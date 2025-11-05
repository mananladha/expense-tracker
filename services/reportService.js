const Transaction = require('../models/Transaction');
const mongoose = require('mongoose'); // Import mongoose to use ObjectId

/**
 * Generates a detailed text report and summary object for transactions within a date range for a specific user.
 * @param {string} userId - The ID of the user whose transactions to report.
 * @param {string} startDate - The start date in 'YYYY-MM-DD' format.
 * @param {string} endDate - The end date in 'YYYY-MM-DD' format.
 * @returns {Promise<{report: string, summary: object}>} - An object containing the full report string and a summary object.
 */
async function generateReport(userId, startDate, endDate) {
  try {
    // Convert dates for proper DB querying
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // Start of the day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of the day

    // Fetch transactions for the specific user in the date range
    const transactions = await Transaction.find({
      user: new mongoose.Types.ObjectId(userId), // Filter by user ID
      date: { $gte: start, $lte: end }
    }).sort({ date: -1 });

    // Calculate totals
    const totalCredit = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebit = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    const net = totalCredit - totalDebit;

    // Calculate balances by account (using aggregation for efficiency)
    const balanceResults = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } }, // Filter by user
      {
        $group: {
          _id: '$mode', // Group by mode (cash, bank1, bank2)
          balance: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', { $multiply: ['$amount', -1] }] } }
        }
      }
    ]);

    const accounts = { cash: 0, bank1: 0, bank2: 0 };
    balanceResults.forEach(acc => {
      if (accounts.hasOwnProperty(acc._id)) {
        accounts[acc._id] = acc.balance;
      }
    });

    // --- Generate detailed text report ---
    let report = '📊 EXPENSE REPORT\n';
    report += '='.repeat(50) + '\n';
    report += `User ID: ${userId}\n`; // Include User ID for clarity
    report += `Period: ${startDate} to ${endDate}\n\n`;

    report += '💰 SUMMARY:\n';
    report += `Total Income: +₹${totalCredit.toFixed(2)}\n`;
    report += `Total Expenses: -₹${totalDebit.toFixed(2)}\n`;
    report += `Net Balance: ₹${net.toFixed(2)}\n\n`;

    report += '💳 ACCOUNT BALANCES (Overall):\n';
    report += `Cash: ₹${accounts.cash.toFixed(2)}\n`;
    report += `ICICI: ₹${accounts.bank1.toFixed(2)}\n`; // Use display name
    report += `BOB: ₹${accounts.bank2.toFixed(2)}\n`;   // Use display name
    report += `Total: ₹${(accounts.cash + accounts.bank1 + accounts.bank2).toFixed(2)}\n\n`;

    report += `📝 TRANSACTIONS (${transactions.length}):\n`;
    report += '-'.repeat(50) + '\n';

    // Account names mapping (should match frontend)
    const accountNames = {
        cash: 'Cash',
        bank1: 'ICICI',
        bank2: 'BOB'
    };

    transactions.forEach(t => {
      const sign = t.type === 'credit' ? '+' : '-';
      const formattedDate = new Date(t.date).toISOString().split('T')[0];
      const accountName = accountNames[t.mode] || t.mode; // Use display name, fallback to ID
      report += `${formattedDate} | ${sign}₹${t.amount.toFixed(2)} | ${t.item} | ${accountName}\n`;
    });

    // --- Create summary object ---
    const summary = {
      userId,
      startDate,
      endDate,
      totalCredit,
      totalDebit,
      net,
      accounts, // Contains cash, bank1, bank2 balances
      transactionCount: transactions.length
    };

    return { report, summary }; // Return both

  } catch (error) {
    console.error('❌ Error generating report:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

/**
 * Calculates start and end dates based on a predefined interval.
 * @param {'daily' | 'weekly' | 'monthly'} interval - The desired time interval.
 * @returns {{startDate: string, endDate: string}} - Start and end dates in 'YYYY-MM-DD' format.
 */
function getDateRange(interval) {
  const now = new Date();
  let start = new Date(now); // Initialize start date

  // Set time to start/end of day for consistency
  start.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);

  const endDate = now.toISOString().split('T')[0];
  let startDate;

  switch (interval) {
    case 'daily':
      startDate = start.toISOString().split('T')[0]; // Today
      break;
    case 'weekly':
      // Get the first day of the current week (assuming Sunday as start)
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      startDate = start.toISOString().split('T')[0];
      break;
    case 'monthly':
      // Get the first day of the current month
      start.setDate(1);
      startDate = start.toISOString().split('T')[0];
      break;
    default: // Default to daily if interval is unknown
      console.warn(`Unknown date range interval: ${interval}. Defaulting to daily.`);
      startDate = start.toISOString().split('T')[0];
  }

  return { startDate, endDate };
}

/**
 * Generates a short summary text suitable for SMS, based on the summary object.
 * @param {object} summaryData - The summary object returned by generateReport.
 * @returns {string} - A short text message (max ~160 chars).
 */
function generateShortSMSSummary(summaryData) {
  // Basic validation
  if (!summaryData || typeof summaryData.totalCredit === 'undefined') {
    return 'Summary data is missing or invalid.';
  }

  const start = summaryData.startDate;
  const end = summaryData.endDate;

  // Construct a brief message
  let smsText = `Expense (${start} to ${end}):\n`;
  smsText += `Inc: +₹${summaryData.totalCredit.toFixed(0)}\n`; // Use toFixed(0) for brevity
  smsText += `Exp: -₹${summaryData.totalDebit.toFixed(0)}\n`;  // Use toFixed(0) for brevity
  smsText += `Net: ₹${summaryData.net.toFixed(0)}`;          // Use toFixed(0) for brevity

  // Check length and shorten further if needed (optional)
  if (smsText.length > 160) {
     console.warn("SMS summary might still exceed 160 characters:", smsText.length);
     // Example of further shortening:
     smsText = `Sum(${start}-${end}):I+${summaryData.totalCredit.toFixed(0)} E-${summaryData.totalDebit.toFixed(0)} N${summaryData.net.toFixed(0)}`;
  }

  return smsText;
}

module.exports = {
  generateReport,
  getDateRange,
  generateShortSMSSummary // Export the new function
};