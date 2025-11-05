const cron = require('node-cron');
const { generateReport, getDateRange } = require('./reportService'); 
const { sendEmail } = require('./emailService');
const User = require('../models/user'); 

function startScheduler() {
  // 11 PM daily (23:00 hours)
  const schedule = process.env.REPORT_SCHEDULE || '0 23 * * *'; 

  console.log(`⏰ Scheduler started with cron: ${schedule} (11 PM daily)`);

  cron.schedule(schedule, async () => {
    console.log('🔄 Running scheduled report at 11 PM...');
    
    try {
      // Find a user (only runs once per schedule)
      const user = await User.findOne();
      
      if (!user) {
        console.warn('⚠️ No users found to send reports.');
        return;
      }
      
      console.log(`Generating report for user: ${user.username} (${user._id})`);
      await sendScheduledReportForUser(user._id.toString()); 

    } catch (userError) {
        console.error('❌ Error fetching user for scheduled report:', userError.message);
    }
  });
}

/**
 * Generates report and sends email only if generation is successful.
 * This function can be called from the scheduler OR from an API route.
 * @param {string} userId - The ID of the user to generate the report for.
 */
async function sendScheduledReportForUser(userId) { 
  const { startDate, endDate } = getDateRange('daily'); 

  // -----------------------------------------------------------------
  // 1. ATTEMPT REPORT GENERATION (Database Risk Zone)
  // -----------------------------------------------------------------
  let report, summary;
  
  try {
    // If this fails (e.g., BSONError), it goes straight to the catch block below.
    const reportResult = await generateReport(userId, startDate, endDate);
    
    // 🔍 DEBUG: Log what we received
    console.log('🔍 DEBUG - reportResult type:', typeof reportResult);
    console.log('🔍 DEBUG - reportResult keys:', reportResult ? Object.keys(reportResult) : 'null/undefined');
    
    // ✅ CRITICAL FIX: Validate reportResult before destructuring
    if (!reportResult || !reportResult.report || !reportResult.summary) {
      console.error('❌ Error: generateReport returned invalid data structure');
      console.log('Received:', reportResult);
      throw new Error('Invalid report data structure');
    }
    
    report = reportResult.report;
    summary = reportResult.summary;
    
    console.log('🔍 DEBUG - report length:', report ? report.length : 'undefined');
    console.log('🔍 DEBUG - summary keys:', summary ? Object.keys(summary) : 'undefined');
    
    // ✅ Additional validation: Ensure summary has required properties
    if (!summary.startDate || !summary.endDate) {
      console.error('❌ Error: summary object missing startDate or endDate');
      console.log('Summary received:', summary);
      throw new Error('Summary missing required date properties');
    }
    
  } catch (reportGenerationError) {
    console.error('❌ Error generating report (Stopping Email Send):', reportGenerationError.message);
    console.error('❌ Full error:', reportGenerationError);
    throw reportGenerationError; // Re-throw so API can catch it
  }

  // -----------------------------------------------------------------
  // 2. SEND VIA EMAIL (Transport Risk Zone)
  // -----------------------------------------------------------------
  try {
    const primaryRecipient = process.env.RECIPIENT_EMAIL; 
    const secondaryRecipient = process.env.SECONDARY_EMAIL || '';

    const recipientList = [primaryRecipient, secondaryRecipient].filter(Boolean).join(', ');

    if (!recipientList) { 
        console.error('❌ Email failed: No email recipients configured.');
        throw new Error('No email recipients configured');
    }
    
    // ✅ Pass the validated summary object (already contains startDate and endDate)
    const result = await sendEmail(recipientList, report, summary);
    
    if (!result.success) {
      throw new Error(result.error || 'Email send failed');
    }
    
    console.log(`✅ Email report sent for user ${userId} to: ${recipientList}`);
    return { success: true, message: 'Email sent successfully', recipients: recipientList };
    
  } catch (emailError) {
    console.error(`❌ Email failed during transport for user ${userId}:`, emailError.message);
    throw emailError; // Re-throw so API can catch it
  }
}

module.exports = {
  startScheduler,
  sendScheduledReportForUser // ✅ Export this so API routes can use it
};