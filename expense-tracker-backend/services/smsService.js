const twilio = require('twilio');

async function sendSMS(recipientPhone, reportText) {
  try {
    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || 
        !process.env.TWILIO_AUTH_TOKEN || 
        !process.env.TWILIO_PHONE_NUMBER) {
      console.log('⚠️ Twilio not configured. Skipping SMS send.');
      return { 
        success: false, 
        error: 'Twilio not configured in .env file' 
      };
    }

    // Check if recipient phone is provided
    if (!recipientPhone) {
      console.warn('⚠️ No phone number provided.');
      return {
        success: false,
        error: 'No phone number provided'
      };
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const summary = extractSummary(reportText);

    const message = await client.messages.create({
      body: summary,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: recipientPhone
    });

    console.log('✅ SMS sent successfully:', message.sid);
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

function extractSummary(reportText) {
  const lines = reportText.split('\n');
  let summary = '';
  let charCount = 0;

  for (const line of lines) {
    if (charCount + line.length > 1500) break;
    summary += line + '\n';
    charCount += line.length;
  }

  return summary;
}

module.exports = {
  sendSMS
};