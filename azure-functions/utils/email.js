// Email utility using Azure Communication Services
const { EmailClient } = require("@azure/communication-email");
const companyConfig = require("../config/company.json");

class EmailService {
    constructor() {
        const connectionString = process.env.ACS_CONNECTION_STRING;
        if (!connectionString) {
            console.warn("ACS_CONNECTION_STRING not set - email functionality will be disabled");
            this.client = null;
        } else {
            this.client = new EmailClient(connectionString);
        }
        // Use company email as sender, fallback to environment variable
        this.senderEmail = companyConfig.email || process.env.ACS_SENDER_EMAIL || "noreply@karte-ai.com";
    }

    /**
     * Send trial warning email (10 days after registration)
     */
    async sendTrialWarningEmail(email, userName = null) {
        if (!this.client) {
            throw new Error("Email client not initialized");
        }

        const displayName = userName || email.split('@')[0];
        
        const emailContent = {
            senderAddress: this.senderEmail,
            content: {
                subject: "【重要】お試し期間がまもなく終了します",
                plainText: this.getTrialWarningPlainText(displayName),
                html: this.getTrialWarningHtml(displayName)
            },
            recipients: {
                to: [{ address: email, displayName: displayName }]
            }
        };

        try {
            const poller = await this.client.beginSend(emailContent);
            const result = await poller.pollUntilDone();
            console.log(`Trial warning email sent to ${email}:`, result);
            return result;
        } catch (error) {
            console.error(`Failed to send trial warning email to ${email}:`, error);
            throw error;
        }
    }

    /**
     * Send receipt email with PDF attachment
     */
    async sendReceiptEmail(email, userName, receiptPdfBuffer, receiptNumber, amount, billingDate) {
        if (!this.client) {
            throw new Error("Email client not initialized");
        }

        const displayName = userName || email.split('@')[0];
        
        // Convert buffer to base64 for email attachment
        const pdfBase64 = receiptPdfBuffer.toString('base64');
        
        const emailContent = {
            senderAddress: this.senderEmail,
            content: {
                subject: `【領収書】${billingDate}分のご請求`,
                plainText: this.getReceiptPlainText(displayName, receiptNumber, amount, billingDate),
                html: this.getReceiptHtml(displayName, receiptNumber, amount, billingDate)
            },
            recipients: {
                to: [{ address: email, displayName: displayName }]
            },
            attachments: [
                {
                    name: `receipt_${receiptNumber}.pdf`,
                    contentType: "application/pdf",
                    contentInBase64: pdfBase64
                }
            ]
        };

        try {
            const poller = await this.client.beginSend(emailContent);
            const result = await poller.pollUntilDone();
            console.log(`Receipt email sent to ${email}:`, result);
            return result;
        } catch (error) {
            console.error(`Failed to send receipt email to ${email}:`, error);
            throw error;
        }
    }

    getTrialWarningPlainText(name) {
        return `${name} 様

この度は、Karte AI Plusをご利用いただき、誠にありがとうございます。

お試し期間（2週間）がまもなく終了いたします。
現在、登録から10日が経過しており、あと4日でお試し期間が終了いたします。

このままご利用を継続される場合、お試し期間終了後、自動的に有料プランへ移行いたします。

ご不明な点がございましたら、お気軽にお問い合わせください。

今後ともよろしくお願いいたします。

${companyConfig.name}
${companyConfig.representative}
${companyConfig.address}
お問い合わせ: ${companyConfig.email || 'support@wonder-drill.com'}`;
    }

    getTrialWarningHtml(name) {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Karte AI Plus</h1>
        </div>
        <div class="content">
            <p>${name} 様</p>
            <p>この度は、Karte AI Plusをご利用いただき、誠にありがとうございます。</p>
            
            <div class="warning">
                <strong>【重要】お試し期間がまもなく終了します</strong>
                <p>お試し期間（2週間）がまもなく終了いたします。<br>
                現在、登録から10日が経過しており、あと4日でお試し期間が終了いたします。</p>
            </div>
            
            <p>このままご利用を継続される場合、お試し期間終了後、自動的に有料プランへ移行いたします。</p>
            
            <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
            
            <p>今後ともよろしくお願いいたします。</p>
        </div>
        <div class="footer">
            <p>${companyConfig.name}<br>
            ${companyConfig.representative}<br>
            ${companyConfig.address}<br>
            お問い合わせ: ${companyConfig.email || 'support@wonder-drill.com'}</p>
        </div>
    </div>
</body>
</html>`;
    }

    getReceiptPlainText(name, receiptNumber, amount, billingDate) {
        return `${name} 様

この度は、Karte AI Plusをご利用いただき、誠にありがとうございます。

${billingDate}分のご請求について、領収書を発行いたしました。
領収書は、このメールにPDFファイルとして添付しております。

領収書番号: ${receiptNumber}
請求金額: ¥${amount.toLocaleString()}
請求期間: ${billingDate}
お支払い方法: Stripe（クレジットカード決済）

ご不明な点がございましたら、お気軽にお問い合わせください。

今後ともよろしくお願いいたします。

${companyConfig.name}
${companyConfig.representative}
${companyConfig.address}
お問い合わせ: ${companyConfig.email || 'support@wonder-drill.com'}`;
    }

    getReceiptHtml(name, receiptNumber, amount, billingDate) {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .info-box { background-color: white; border: 1px solid #ddd; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>領収書発行のお知らせ</h1>
        </div>
        <div class="content">
            <p>${name} 様</p>
            <p>この度は、Karte AI Plusをご利用いただき、誠にありがとうございます。</p>
            
            <div class="info-box">
                <p><strong>${billingDate}分のご請求について、領収書を発行いたしました。</strong></p>
                <p>領収書は、このメールにPDFファイルとして添付しております。</p>
                <p>領収書番号: ${receiptNumber}<br>
                請求金額: ¥${amount.toLocaleString()}<br>
                請求期間: ${billingDate}<br>
                お支払い方法: Stripe（クレジットカード決済）</p>
            </div>
            
            <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
            
            <p>今後ともよろしくお願いいたします。</p>
        </div>
        <div class="footer">
            <p>${companyConfig.name}<br>
            ${companyConfig.representative}<br>
            ${companyConfig.address}<br>
            お問い合わせ: ${companyConfig.email || 'support@wonder-drill.com'}</p>
        </div>
    </div>
</body>
</html>`;
    }
}

module.exports = new EmailService();
