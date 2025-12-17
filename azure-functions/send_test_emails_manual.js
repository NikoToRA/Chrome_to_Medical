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
// Note: EmailService class in utils/email.js is exported as 'new EmailService()'. 
// It does NOT load env vars in constructor anymore (it delegates to lib/email.js which checks env vars on send).
// So this is safe.

const receiptGenerator = require('./utils/receipt');
const { format, addDays } = require('date-fns');

async function main() {
    console.log('--- sending all test emails ---');

    const testEmail = 'super206cc@gmail.com';
    const testName = 'Test User';
    const today = new Date();
    const billingDate = format(today, 'yyyy-MM');
    const trialEnd = format(addDays(today, 4), 'yyyy-MM-dd');
    const accessEnd = format(addDays(today, 30), 'yyyy-MM-dd');

    console.log(`Target: ${testEmail}`);

    try {
        // 1. Welcome Email
        console.log('\n[1/5] Sending Welcome Email...');
        await emailService.sendWelcomeEmail(testEmail, testName, trialEnd);
        console.log('✓ Welcome Email Sent');

        // 2. Trial Warning Email
        console.log('\n[2/5] Sending Trial Warning Email...');
        // Mocking portal URL generation inside if needed, but it handles null
        await emailService.sendTrialWarningEmail(testEmail, testName);
        console.log('✓ Trial Warning Email Sent');

        // 3. Trial End (Paid Transition) Email
        console.log('\n[3/5] Sending Trial End (Paid Transition) Email...');
        await emailService.sendTrialEndEmail(testEmail, testName, 4980, accessEnd);
        console.log('✓ Trial End Email Sent');

        // 4. Receipt Email
        console.log('\n[4/5] Sending Receipt Email...');
        const receiptNumber = receiptGenerator.generateReceiptNumber(today);
        const receiptBuffer = await receiptGenerator.generateReceipt({
            receiptNumber,
            customerName: testName,
            customerEmail: testEmail,
            amount: 4980,
            billingDate,
            issueDate: today
        });
        await emailService.sendReceiptEmail(
            testEmail,
            testName,
            receiptBuffer,
            receiptNumber,
            4980,
            billingDate
        );
        console.log('✓ Receipt Email Sent');

        // 5. Cancellation Email
        console.log('\n[5/5] Sending Cancellation Email...');
        await emailService.sendCancellationEmail(testEmail, testName, accessEnd);
        console.log('✓ Cancellation Email Sent');

        // 6. Payment Failed Email
        console.log('\n[6/6] Sending Payment Failed Email...');
        await emailService.sendPaymentFailedEmail(testEmail, testName, '期限切れ', 'https://example.com/portal');
        console.log('✓ Payment Failed Email Sent');

    } catch (error) {
        console.error('Error sending emails:', error);
    }
}

main();
