const nodemailer = require('nodemailer');

/**
 * Sends an expense report email to one or more recipients.
 * * @param {string} recipientString - Comma-separated string of recipient emails.
 * @param {string} reportText - The plain text transaction list.
 * @param {object} summary - The summary object containing dates, totals, and accounts.
 * @returns {Promise<{success: boolean, error?: string, messageId?: string}>}
 */
async function sendEmail(recipientString, reportText, summary) {
  try {
    // 1. CRITICAL FIX: Validate summary object exists and has required properties
    if (!summary || typeof summary.startDate === 'undefined' || typeof summary.endDate === 'undefined') {
      console.error('❌ Error: summary object is incomplete or undefined. Skipping email send.');
      return {
        success: false,
        error: 'Summary object is incomplete or undefined.'
      };
    }
    
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('⚠️ Email not configured. Skipping email send.');
      return { 
        success: false, 
        error: 'Email not configured in .env file' 
      };
    }
    
    // 2. Check if recipients are provided
    if (!recipientString) {
        console.warn('⚠️ No email recipients provided. Skipping email send.');
        return {
            success: false,
            error: 'No email recipients provided.'
        };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      // FIX: Use the recipient string directly (allows multiple recipients)
      to: recipientString, 
      subject: `💰 Expense Report - ${summary.startDate} to ${summary.endDate}`,
      text: reportText,
      // Pass the HTML content generated below
      html: generateHTMLEmail(reportText, summary) 
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Generates the HTML body of the expense report email with safety checks.
 */
function generateHTMLEmail(reportText, summary) {
  // Add safety checks here too
  if (!summary) {
    return '<html><body><p>Error: Summary data is missing</p></body></html>';
  }
  
  // Define variables with safe defaults (0 for numbers, 'N/A' for strings)
  const startDate = summary.startDate || 'N/A';
  const endDate = summary.endDate || 'N/A';
  const totalCredit = summary.totalCredit || 0;
  const totalDebit = summary.totalDebit || 0;
  const net = summary.net || 0;
  const transactionCount = summary.transactionCount || 0;
  
  // Safe account access with defaults
  const accounts = summary.accounts || { cash: 0, bank1: 0, bank2: 0 };
  const cashBalance = accounts.cash || 0;
  const bank1Balance = accounts.bank1 || 0;
  const bank2Balance = accounts.bank2 || 0;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
        h1 { color: #4F46E5; }
        .summary { background-color: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .positive { color: #10B981; font-weight: bold; }
        .negative { color: #EF4444; font-weight: bold; }
        .accounts { background-color: #F9FAFB; padding: 15px; border-radius: 8px; margin: 15px 0; }
        pre { background-color: #F3F4F6; padding: 15px; border-radius: 8px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📊 Expense Report</h1>
        <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
        
        <div class="summary">
          <h2>💰 Summary</h2>
          <p><span class="positive">Income:</span> ₹${totalCredit.toFixed(2)}</p>
          <p><span class="negative">Expenses:</span> ₹${totalDebit.toFixed(2)}</p>
          <p><strong>Net Balance:</strong> ₹${net.toFixed(2)}</p>
        </div>

        <div class="accounts">
          <h2>💳 Account Balances</h2>
          <p><strong>Cash:</strong> ₹${cashBalance.toFixed(2)}</p>
          <p><strong>ICICI:</strong> ₹${bank1Balance.toFixed(2)}</p>
          <p><strong>BOB:</strong> ₹${bank2Balance.toFixed(2)}</p>
        </div>

        <h2>📝 Transactions (${transactionCount})</h2>
        <pre>${reportText}</pre>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  sendEmail
};