const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/user');
const auth = require('../middleware/auth');

// Helper: Generate report
async function generateReport(startDate, endDate, userId) {
  try {
    const transactions = await Transaction.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });

    const user = await User.findById(userId);
    const paymentModes = user.paymentModes || [];

    const totalCredit = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebit = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    const net = totalCredit - totalDebit;

    const accounts = {};
    paymentModes.forEach(mode => {
      accounts[mode.id] = 0;
    });

    transactions.forEach(t => {
      if (accounts[t.mode] !== undefined) {
        if (t.type === 'credit') {
          accounts[t.mode] += t.amount;
        } else {
          accounts[t.mode] -= t.amount;
        }
      }
    });

    let report = '📊 EXPENSE REPORT\n';
    report += '='.repeat(50) + '\n';
    report += `User: ${user.name}\n`;
    report += `Period: ${startDate} to ${endDate}\n\n`;
    
    report += '💰 SUMMARY:\n';
    report += `Total Income: ₹${totalCredit.toFixed(2)}\n`;
    report += `Total Expenses: ₹${totalDebit.toFixed(2)}\n`;
    report += `Net Balance: ₹${net.toFixed(2)}\n\n`;
    
    report += '💳 ACCOUNT BALANCES:\n';
    paymentModes.forEach(mode => {
      report += `${mode.name}: ₹${accounts[mode.id].toFixed(2)}\n`;
    });
    
    const totalBalance = Object.values(accounts).reduce((sum, bal) => sum + bal, 0);
    report += `Total: ₹${totalBalance.toFixed(2)}\n\n`;
    
    report += `📝 TRANSACTIONS (${transactions.length}):\n`;
    report += '-'.repeat(50) + '\n';
    
    transactions.forEach(t => {
      const sign = t.type === 'credit' ? '+' : '-';
      report += `${t.date} | ${sign}₹${t.amount.toFixed(2)} | ${t.item} | ${t.modeName}\n`;
    });

    return {
      report,
      summary: {
        startDate,
        endDate,
        totalCredit,
        totalDebit,
        net,
        accounts,
        transactionCount: transactions.length
      }
    };
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

// Send report via SMS/Email
router.post('/send', auth, async (req, res) => {
  try {
    const { startDate, endDate, method } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }

    console.log(`📊 Generating report for user ${req.user.id}: ${startDate} to ${endDate}`);

    const { report, summary } = await generateReport(startDate, endDate, req.user.id);
    const user = await User.findById(req.user.id);

    const results = { sms: null, email: null };

    // Send SMS
    if (method === 'sms' || method === 'both') {
      try {
        // Use user phone if available, otherwise try env phone
        const recipientPhone = user.phone || process.env.YOUR_PHONE_NUMBER;
        
        if (!recipientPhone) {
          results.sms = { success: false, error: 'Phone number not configured. Please update in settings.' };
        } else {
          const { sendSMS } = require('../services/smsService');
          results.sms = await sendSMS(recipientPhone, report);
        }
      } catch (error) {
        console.error('SMS Error:', error);
        results.sms = { success: false, error: error.message };
      }
    }

    // Send Email
    if (method === 'email' || method === 'both') {
      try {
        // Use user email if available, otherwise use env email
        const recipientEmail = user.email || process.env.RECIPIENT_EMAIL || process.env.EMAIL_USER;
        
        console.log(`📧 Attempting to send email to: ${recipientEmail}`);
        
        if (!recipientEmail) {
          results.email = { 
            success: false, 
            error: 'Email not configured. Please add email in Settings page.' 
          };
        } else {
          const { sendEmail } = require('../services/emailService');
          results.email = await sendEmail(recipientEmail, report, summary);
        }
      } catch (error) {
        console.error('Email Error:', error);
        results.email = { success: false, error: error.message };
      }
    }

    console.log('📊 Report results:', results);

    res.json({
      success: true,
      message: 'Report processed',
      results
    });
  } catch (error) {
    console.error('❌ Error sending report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate report (without sending)
router.post('/generate', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }

    const { report, summary } = await generateReport(startDate, endDate, req.user.id);

    res.json({
      success: true,
      report,
      summary
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;