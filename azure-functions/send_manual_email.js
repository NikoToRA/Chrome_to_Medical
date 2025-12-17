const emailService = require('./utils/email');

async function resendEmail() {
    const email = "super206cc@gmail.com";
    const name = "Super User"; // Placeholder or from DB if I fetched it
    // Expiration date from DB (Step 402): 2025-12-27
    const accessEndDate = "2025-12-27";

    console.log(`Sending manual cancellation email to ${email}...`);
    try {
        await emailService.sendCancellationEmail(email, name, accessEndDate);
        console.log("Email sent successfully.");
    } catch (e) {
        console.error("Failed to send email:", e);
    }
}

resendEmail();
