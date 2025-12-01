// Azure Function: Check and send trial warning emails (10 days after registration)
// This function runs daily via Timer Trigger

const database = require('../utils/database');
const emailService = require('../utils/email');
const companyConfig = require('../config/company.json');
const { addDays, format } = require('date-fns');

module.exports = async function (context, myTimer) {
    context.log('Trial warning check function started');

    try {
        const today = new Date();
        // Calculate the registration date (10 days ago)
        const registrationDate = addDays(today, -companyConfig.trialWarningDay);
        const registrationDateStr = format(registrationDate, 'yyyy-MM-dd');

        context.log(`Checking for users registered on: ${registrationDateStr}`);

        // Get users registered exactly 10 days ago
        const users = await database.getUsersByRegistrationDate(registrationDateStr);

        if (!users || users.length === 0) {
            context.log('No users found for trial warning');
            return;
        }

        context.log(`Found ${users.length} user(s) to send trial warning`);

        // Send trial warning email to each user
        const results = await Promise.allSettled(
            users.map(async (user) => {
                // Skip if warning already sent
                if (user.trialWarningSent) {
                    context.log(`Trial warning already sent to ${user.email}`);
                    return { success: false, email: user.email, reason: 'already_sent' };
                }

                try {
                    await emailService.sendTrialWarningEmail(
                        user.email,
                        user.name || user.userName
                    );

                    // Mark as sent in database
                    await database.markTrialWarningSent(user.email);

                    context.log(`Trial warning email sent successfully to ${user.email}`);
                    return { success: true, email: user.email };
                } catch (error) {
                    context.log.error(`Failed to send trial warning to ${user.email}:`, error);
                    return { success: false, email: user.email, error: error.message };
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
