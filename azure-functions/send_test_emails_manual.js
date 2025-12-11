const fs = require('fs');
const path = require('path');

// Load local.settings.json BEFORE requiring email service
const localSettingsPath = path.join(__dirname, 'local.settings.json');
if (fs.existsSync(localSettingsPath)) {
    console.log('Loading local.settings.json...');
    const settings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8'));
    if (settings.Values) {
        Object.keys(settings.Values).forEach(key => {
            process.env[key] = settings.Values[key];
        });
    }
} else {
    console.warn('Warning: local.settings.json not found. Env vars might be missing.');
}

const emailService = require('./utils/email'); // Now it should pick up env vars
const receiptGenerator = require('./utils/receipt');
const { format } = require('date-fns');

// Re-initialize email service to pick up new env vars if needed
// (Current implementation of email.js reads env var in constructor or method call? 
// It reads in constructor (EmailService class). So we might need to recreate it if it was already required?)
// Actually, `utils/email.js` exports `new EmailService()`. 
// So it was instantiated when required. 
// If env vars weren't set *before* require, it might have failed validation or set client to null.
// Let's re-require or manually re-instantiate if possible.
// Looking at email.js, it exports an instance.
// We should set env vars BEFORE requiring email service, but we already required it.
// To fix this, we'll implement a helper to reload.
// OR, simpler: just set env vars first, *then* require.

async function main() {
    console.log('--- sending test emails ---');

    const testEmail = 'super206cc@gmail.com';
    const testName = 'Test User';

    console.log(`Target: ${testEmail}`);

    try {
        // 1. Send Trial Warning
        console.log('\nSending Trial Warning Email...');
        await emailService.sendTrialWarningEmail(testEmail, testName);
        console.log('✓ Trial Warning Sent');

        // 2. Send Receipt
        console.log('\nSending Receipt Email...');
        const receiptNumber = receiptGenerator.generateReceiptNumber(new Date());
        const amount = 3980;
        const billingDate = format(new Date(), 'yyyy-MM');

        const receiptBuffer = await receiptGenerator.generateReceipt({
            receiptNumber,
            customerName: testName,
            customerEmail: testEmail,
            amount,
            billingDate,
            issueDate: new Date()
        });

        await emailService.sendReceiptEmail(
            testEmail,
            testName,
            receiptBuffer,
            receiptNumber,
            amount,
            billingDate
        );
        console.log('✓ Receipt Sent');

    } catch (error) {
        console.error('Error sending emails:', error);
    }
}

main();
