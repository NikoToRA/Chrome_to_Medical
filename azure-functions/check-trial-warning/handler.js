// Azure Function: Check and send trial warning emails (10 days after registration)
// This function runs daily via Timer Trigger

const { getSubscriptionByCreatedDate, upsertSubscription } = require('../lib/table');
const emailService = require('../utils/email'); // Ensure this points to your email service
const companyConfig = require('../config/company.json');
const { addDays, format } = require('date-fns');

module.exports = async function (context, myTimer) {
    context.log('Trial warning check function started');

    try {
        const today = new Date();
        // Calculate the registration date (10 days ago) - targeting 14 day trial, warn at 10 days
        const registrationDate = addDays(today, -companyConfig.trialWarningDay);
        const registrationDateStr = format(registrationDate, 'yyyy-MM-dd');

        context.log(`Checking for users registered on: ${registrationDateStr}`);

        // Get users registered exactly 10 days ago (and still in trial)
        const subscriptions = await getSubscriptionByCreatedDate(registrationDateStr);

        if (!subscriptions || subscriptions.length === 0) {
            context.log('No subscriptions found for trial warning');
            return;
        }

        context.log(`Found ${subscriptions.length} subscription(s) to send trial warning`);

        // Send trial warning email to each user
        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                // Skip if warning already sent
                if (sub.trialWarningSent) {
                    context.log(`Trial warning already sent to ${sub.email}`);
                    return { success: false, email: sub.email, reason: 'already_sent' };
                }

                try {
                    await emailService.sendTrialWarningEmail(
                        sub.email
                        // sub.name is removed as it's not in subscription table usually, 
                        // fallback to email prefix inside sendTrialWarningEmail is sufficient
                    );

                    // Mark as sent in database
                    await upsertSubscription(sub.email, {
                        trialWarningSent: true,
                        trialWarningSentAt: new Date().toISOString()
                    });

                    context.log(`Trial warning email sent successfully to ${sub.email}`);
                    return { success: true, email: sub.email };
                } catch (error) {
                    context.log.error(`Failed to send trial warning to ${sub.email}:`, error);
                    return { success: false, email: sub.email, error: error.message };
                }
            })
        );

        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;

        context.log(`Trial warning check completed: ${successful} successful, ${failed} failed`);

        return {
            status: 'completed',
            total: users.length,
            successful,
            failed
        };
    } catch (error) {
        context.log.error('Error in trial warning check function:', error);
        throw error;
    }
};
