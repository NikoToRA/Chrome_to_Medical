// Azure Function: Generate and send receipts on billing date (end of month)
// This function runs daily via Timer Trigger and checks if it's billing day

const database = require('../utils/database');
const emailService = require('../utils/email');
const receiptGenerator = require('../utils/receipt');
const { format, isLastDayOfMonth } = require('date-fns');

module.exports = async function (context, myTimer) {
    context.log('Receipt sending function started');

    try {
        const today = new Date();
        
        // Check if today is the last day of the month (billing day)
        const isBillingDay = isLastDayOfMonth(today);

        if (!isBillingDay) {
            context.log('Today is not a billing day (not end of month)');
            return { status: 'skipped', reason: 'not_billing_day' };
        }

        const billingDate = format(today, 'yyyy-MM');
        context.log(`Billing date: ${billingDate}`);

        // Get users whose billing date is today
        // This should include users who registered in previous months and are due for billing
        const users = await database.getUsersForBilling(today);

        if (!users || users.length === 0) {
            context.log('No users found for billing');
            return { status: 'completed', total: 0 };
        }

        context.log(`Found ${users.length} user(s) to send receipts`);

        // Generate and send receipts
        const results = await Promise.allSettled(
            users.map(async (user) => {
                try {
                    // Calculate billing amount (you may have different plans)
                    const amount = user.subscriptionAmount || 1000; // Default amount, adjust as needed

                    // Generate receipt
                    const issueDate = new Date();
                    const receiptNumber = receiptGenerator.generateReceiptNumber(issueDate);

                    const receiptPdf = await receiptGenerator.generateReceipt({
                        receiptNumber,
                        customerName: user.name || user.userName || user.email.split('@')[0],
                        customerEmail: user.email,
                        amount,
                        billingDate,
                        issueDate
                    });

                    // Send receipt email
                    await emailService.sendReceiptEmail(
                        user.email,
                        user.name || user.userName,
                        receiptPdf,
                        receiptNumber,
                        amount,
                        billingDate
                    );

                    // Record receipt sent
                    await database.recordReceiptSent(
                        user.email,
                        receiptNumber,
                        amount,
                        billingDate
                    );

                    context.log(`Receipt sent successfully to ${user.email} (Receipt #${receiptNumber})`);
                    return { success: true, email: user.email, receiptNumber };
                } catch (error) {
                    context.log.error(`Failed to send receipt to ${user.email}:`, error);
                    return { success: false, email: user.email, error: error.message };
                }
            })
        );

        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;

        context.log(`Receipt sending completed: ${successful} successful, ${failed} failed`);

        return {
            status: 'completed',
            billingDate,
            total: users.length,
            successful,
            failed
        };
    } catch (error) {
        context.log.error('Error in receipt sending function:', error);
        throw error;
    }
};
