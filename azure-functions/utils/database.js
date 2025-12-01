// Database utility for user subscription management
// This is a placeholder - replace with your actual database implementation
// (e.g., Cosmos DB, SQL Database, Azure Table Storage, etc.)

const { TableClient } = require("@azure/data-tables");

class Database {
    constructor() {
        // Initialize Azure Table Storage connection
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (connectionString) {
            this.usersTable = TableClient.fromConnectionString(connectionString, "users");
            this.receiptsTable = TableClient.fromConnectionString(connectionString, "receipts");
        }
    }

    /**
     * Get user by email
     */
    async getUser(email) {
        if (!this.usersTable) {
            context.log.warn("Database not configured");
            return null;
        }
        try {
            const user = await this.usersTable.getEntity("user", email);
            return user;
        } catch (error) {
            if (error.statusCode === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Get users registered on a specific date (for trial day calculation)
     * Format: YYYY-MM-DD
     */
    async getUsersByRegistrationDate(registrationDateStr) {
        if (!this.usersTable) {
            return [];
        }
        try {
            const users = [];
            const entities = this.usersTable.listEntities({
                queryOptions: {
                    filter: `registrationDate eq '${registrationDateStr}' and subscriptionStatus eq 'trial'`
                }
            });
            
            for await (const entity of entities) {
                // Skip if warning already sent
                if (!entity.trialWarningSent) {
                    users.push(entity);
                }
            }
            return users;
        } catch (error) {
            console.error("Error getting users by registration date:", error);
            return [];
        }
    }

    /**
     * Get users whose billing date is today (for receipt generation)
     * Billing date is the last day of the month from registration
     */
    async getUsersForBilling(billingDate) {
        if (!this.usersTable) {
            return [];
        }
        try {
            const users = [];
            // Get all active subscribers
            const entities = this.usersTable.listEntities({
                queryOptions: {
                    filter: `subscriptionStatus eq 'active'`
                }
            });
            
            for await (const entity of entities) {
                if (entity.registrationDate) {
                    const regDate = new Date(entity.registrationDate);
                    const lastDayOfMonth = new Date(regDate.getFullYear(), regDate.getMonth() + 1, 0);
                    const today = new Date(billingDate);
                    
                    // Check if today is the last day of the month for this user's billing cycle
                    if (today.getDate() === lastDayOfMonth.getDate() && 
                        today.getMonth() === lastDayOfMonth.getMonth() &&
                        today.getFullYear() === lastDayOfMonth.getFullYear()) {
                        users.push(entity);
                    }
                }
            }
            return users;
        } catch (error) {
            console.error("Error getting users for billing:", error);
            return [];
        }
    }

    /**
     * Update user's trial warning sent flag
     */
    async markTrialWarningSent(email) {
        if (!this.usersTable) {
            return;
        }
        try {
            const user = await this.getUser(email);
            if (user) {
                user.trialWarningSent = true;
                user.trialWarningSentAt = new Date().toISOString();
                await this.usersTable.updateEntity(user, "Merge");
            }
        } catch (error) {
            console.error("Error marking trial warning sent:", error);
            throw error;
        }
    }

    /**
     * Record receipt sent
     */
    async recordReceiptSent(email, receiptNumber, amount, billingDate) {
        if (!this.receiptsTable) {
            return;
        }
        try {
            const receipt = {
                partitionKey: "receipt",
                rowKey: receiptNumber,
                email: email,
                receiptNumber: receiptNumber,
                amount: amount,
                billingDate: billingDate,
                sentAt: new Date().toISOString()
            };
            await this.receiptsTable.createEntity(receipt);
        } catch (error) {
            console.error("Error recording receipt:", error);
            throw error;
        }
    }
}

module.exports = new Database();
