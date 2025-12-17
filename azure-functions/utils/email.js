// Email utility using Azure Communication Services
const { EmailClient } = require("@azure/communication-email");
const { sendEmail } = require("../lib/email");
const companyConfig = require("../config/company.json");
const Stripe = require('stripe');
const { getSubscription } = require('../lib/table');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

class EmailService {
    // Constructor no longer needed for client init as we use lib/email

    /**
     * Send trial warning email (10 days after registration)
     */
    async sendTrialWarningEmail(email, userName = null) {
        const displayName = userName || email.split('@')[0];

        // Generate Customer Portal link
        const portalUrl = await this.generatePortalUrl(email);

        const subject = "【重要】お試し期間がまもなく終了します";
        const text = this.getTrialWarningPlainText(displayName, portalUrl);
        const html = this.getTrialWarningHtml(displayName, portalUrl);

        try {
            // Delegate availability check to lib/email (it throws if not configured)
            const result = await sendEmail({ to: email, subject, text, html });
            console.log(`Trial warning email sent to ${email} `);
            return result;
        } catch (error) {
            console.error(`Failed to send trial warning email to ${email}: `, error);
            throw error;
        }
    }

    /**
     * Send receipt email with PDF attachment
     * Note: lib/email.js currently only accepts {to, subject, text, html}. 
     * If lib/email.js doesn't support attachments, we need to update lib/email.js too.
     * Checking lib/email.js content from history... 
     * It does NOT support attachments in the viewed code (Step 303).
     * 
     * CRITICAL: I must update lib/email.js to support attachments first OR pass the client.
     * But lib/email.js has the "working" client.
     * 
     * Plan Update: 
     * 1. Update lib/email.js to accept `attachments` in options.
     * 2. Then update utils/email.js to call it.
     */
    async sendReceiptEmail(email, userName, receiptPdfBuffer, receiptNumber, amount, billingDate) {
        const displayName = userName || email.split('@')[0];

        // Convert buffer to base64 for email attachment
        const pdfBase64 = receiptPdfBuffer.toString('base64');

        const subject = `【領収書】${billingDate} 分のご請求`;
        const text = this.getReceiptPlainText(displayName, receiptNumber, amount, billingDate);
        const html = this.getReceiptHtml(displayName, receiptNumber, amount, billingDate);

        const attachments = [
            {
                name: `receipt_${receiptNumber}.pdf`,
                contentType: "application/pdf",
                contentInBase64: pdfBase64
            }
        ];

        try {
            // We need to update lib/email.js to handle attachments!
            // Assuming I will update lib/email.js in the next step.
            const result = await sendEmail({ to: email, subject, text, html, attachments });
            console.log(`Receipt email sent to ${email} `);
            return result;
        } catch (error) {
            console.error(`Failed to send receipt email to ${email}: `, error);
            throw error;
        }
    }

    async generatePortalUrl(email) {
        // Generate Stripe Customer Portal URL directly
        try {
            // Get customer ID from subscription table
            const subscription = await getSubscription(email);

            if (!subscription || !subscription.stripeCustomerId) {
                console.warn(`No Stripe customer found for ${email}`);
                return null;
            }

            // Create billing portal session
            const session = await stripe.billingPortal.sessions.create({
                customer: subscription.stripeCustomerId,
                return_url: process.env.CANCEL_PAGE_URL || 'https://stkarteai1763705952.z11.web.core.windows.net/cancel-complete.html',
            });

            return session.url;
        } catch (error) {
            console.error('Error generating portal URL:', error);
            return null;
        }
    }

    getTrialWarningPlainText(name, portalUrl) {
        const cancelSection = portalUrl
            ? `\n\n継続を希望されない場合は、以下のリンクからキャンセルしてください：\n${portalUrl} \n`
            : '\n\n継続を希望されない場合は、サポートまでお問い合わせください。\n';

        return `${name} 様

この度は、Karte AI Plusをご利用いただき、誠にありがとうございます。

お試し期間（2週間）がまもなく終了いたします。
現在、登録から10日が経過しており、あと4日でお試し期間が終了いたします。

このままご利用を継続される場合、お試し期間終了後、自動的に有料プランへ移行いたします。
${cancelSection}
ご不明な点がございましたら、お気軽にお問い合わせください。

今後ともよろしくお願いいたします。

${companyConfig.name}
${companyConfig.representative}
${companyConfig.address}
お問い合わせ: ${companyConfig.email || 'support@wonder-drill.com'} `;
    }

    getTrialWarningHtml(name, portalUrl) {
        const cancelButton = portalUrl
            ? `<div style="text-align: center; margin: 30px 0;">
    <a href="${portalUrl}" style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">サブスクリプションをキャンセル</a>
            </div>`
            : '';

        return `< !DOCTYPE html >
    <html>
        <head>
            <meta charset="UTF-8">
                <style>
                    body {font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333;}
                    .container {max-width: 600px; margin: 0 auto; padding: 20px;}
                    .header {background-color: #4CAF50; color: white; padding: 20px; text-align: center;}
                    .content {padding: 20px; background-color: #f9f9f9;}
                    .warning {background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;}
                    .footer {text-align: center; padding: 20px; color: #666; font-size: 12px;}
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

                    ${cancelButton}

                    <p style="font-size: 14px; color: #666; text-align: center;">
                        継続を希望されない場合は、上記ボタンからサブスクリプションをキャンセルしてください。
                    </p>

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
                                body {font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333;}
                                .container {max-width: 600px; margin: 0 auto; padding: 20px;}
                                .header {background-color: #4CAF50; color: white; padding: 20px; text-align: center;}
                                .content {padding: 20px; background-color: #f9f9f9;}
                                .info-box {background-color: white; border: 1px solid #ddd; padding: 15px; margin: 20px 0;}
                                .footer {text-align: center; padding: 20px; color: #666; font-size: 12px;}
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
    /**
     * Send welcome email (registration complete)
     */
    async sendWelcomeEmail(email, userName, trialEndDate) {
        const displayName = userName || email.split('@')[0];
        const subject = "【Karte AI Plus】登録完了・無料トライアル開始のお知らせ";
        const text = this.getWelcomeInPlainText(displayName, trialEndDate);
        const html = this.getWelcomeHtml(displayName, trialEndDate);

        try {
            const result = await sendEmail({ to: email, subject, text, html });
            console.log(`Welcome email sent to ${email}`);
            return result;
        } catch (error) {
            console.error(`Failed to send welcome email to ${email}: `, error);
            throw error;
        }
    }

    /**
     * Send cancellation email
     */
    async sendCancellationEmail(email, userName, accessEndDate) {
        const displayName = userName || email.split('@')[0];
        const subject = "【Karte AI Plus】解約完了のお知らせ";
        const text = this.getCancellationPlainText(displayName, accessEndDate);
        const html = this.getCancellationHtml(displayName, accessEndDate);

        try {
            const result = await sendEmail({ to: email, subject, text, html });
            console.log(`Cancellation email sent to ${email}`);
            return result;
        } catch (error) {
            console.error(`Failed to send cancellation email to ${email}: `, error);
            throw error;
        }
    }

    /**
     * Send payment failed email
     */
    async sendPaymentFailedEmail(email, userName, failureReason, updateCardUrl) {
        const displayName = userName || email.split('@')[0];

        // Generate portal URL if not provided
        const portalUrl = updateCardUrl || await this.generatePortalUrl(email);

        const subject = "【重要】お支払いの決済に失敗しました";
        const text = this.getPaymentFailedPlainText(displayName, failureReason, portalUrl);
        const html = this.getPaymentFailedHtml(displayName, failureReason, portalUrl);

        try {
            const result = await sendEmail({ to: email, subject, text, html });
            console.log(`Payment failed email sent to ${email}`);
            return result;
        } catch (error) {
            console.error(`Failed to send payment failed email to ${email}: `, error);
            throw error;
        }
    }

    getWelcomeInPlainText(name, trialEndDate) {
        return `${name} 様

この度は、Karte AI Plusにご登録いただき、誠にありがとうございます。
無料トライアル（14日間）が開始されました。
トライアル期間中は、有料プランのすべての機能をご利用いただけます。

【トライアル終了日】
${trialEndDate}

【課金開始について】
トライアル終了日の翌日から、月額料金の課金が開始されます。
継続を希望されない場合は、トライアル終了日までに解約手続きを行ってください。
解約は、Chrome拡張機能のサイドバー内「アカウント」メニューからいつでも可能です。

【Karte AI Plusでできること】
1. カルテ入力の効率化
   - 症状や処見を簡単に入力
   - 定型文の呼び出しと挿入
2. AIアシスタントによるサポート
   - 医療情報の検索や要約
   - 紹介状作成の補助
3. Azureによる高セキュリティ
   - 患者情報の安全な取り扱い

ご不明な点がございましたら、お気軽にお問い合わせください。
今後ともよろしくお願いいたします。

${companyConfig.name}
${companyConfig.representative}
${companyConfig.address}
お問い合わせ: ${companyConfig.email || 'support@wonder-drill.com'}`;
    }

    getWelcomeHtml(name, trialEndDate) {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333;}
        .container {max-width: 600px; margin: 0 auto; padding: 20px;}
        .header {background-color: #4CAF50; color: white; padding: 20px; text-align: center;}
        .content {padding: 20px; background-color: #f9f9f9;}
        .highlight-box {background-color: #e8f5e9; border: 1px solid #4CAF50; padding: 15px; margin: 20px 0; border-radius: 5px;}
        .footer {text-align: center; padding: 20px; color: #666; font-size: 12px;}
        ul {padding-left: 20px;}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ご登録ありがとうございます</h1>
        </div>
        <div class="content">
            <p>${name} 様</p>
            <p>この度は、Karte AI Plusにご登録いただき、誠にありがとうございます。</p>
            <p>無料トライアル（14日間）が開始されました。<br>
            トライアル期間中は、有料プランのすべての機能をご利用いただけます。</p>

            <div class="highlight-box">
                <h3 style="margin-top: 0; color: #2e7d32;">トライアル情報</h3>
                <p><strong>終了予定日:</strong> ${trialEndDate}</p>
                <p><small>※終了日の翌日から課金が開始されます。</small></p>
            </div>

            <h3>Karte AI Plusでできること</h3>
            <ul>
                <li>カルテ入力の効率化（定型文、スマート入力）</li>
                <li>AIアシスタントによる医療情報の検索・要約</li>
                <li>Azure基盤による高度なセキュリティ</li>
            </ul>

            <p><strong>解約について</strong><br>
            継続を希望されない場合は、トライアル終了日までに解約手続きを行ってください。<br>
            解約は、Chrome拡張機能のサイドバー内「アカウント」メニューからいつでも可能です。</p>
            
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

    getCancellationPlainText(name, accessEndDate) {
        return `${name} 様

Karte AI Plusの解約手続きが完了しました。
ご利用いただき、誠にありがとうございました。

【ご利用可能期間】
${accessEndDate} まで
※上記期間までは、引き続きすべての機能をご利用いただけます。

【データの保持について】
ご利用期間終了後、一定期間経過後にアカウントデータは削除されます。

またのご利用を心よりお待ちしております。
再登録をご希望の場合は、以下のリンクからいつでも手続きが可能です。
https://stkarteai1763705952.z11.web.core.windows.net/

ご不明な点がございましたら、お気軽にお問い合わせください。

${companyConfig.name}
${companyConfig.representative}
${companyConfig.address}
お問い合わせ: ${companyConfig.email || 'support@wonder-drill.com'}`;
    }

    getCancellationHtml(name, accessEndDate) {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333;}
        .container {max-width: 600px; margin: 0 auto; padding: 20px;}
        .header {background-color: #607d8b; color: white; padding: 20px; text-align: center;}
        .content {padding: 20px; background-color: #f9f9f9;}
        .info-box {background-color: #eceff1; border: 1px solid #cfd8dc; padding: 15px; margin: 20px 0; border-radius: 5px;}
        .footer {text-align: center; padding: 20px; color: #666; font-size: 12px;}
        .btn {display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px;}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>解約手続き完了のお知らせ</h1>
        </div>
        <div class="content">
            <p>${name} 様</p>
            <p>Karte AI Plusの解約手続きが完了しました。<br>
            これまでのご利用、誠にありがとうございました。</p>

            <div class="info-box">
                <h3 style="margin-top: 0;">ご利用可能期間</h3>
                <p><strong>${accessEndDate} まで</strong></p>
                <p><small>※上記期間までは、引き続きすべての機能をご利用いただけます。</small></p>
            </div>

            <p><strong>データの保持について</strong><br>
            ご利用期間終了後、一定期間経過後にアカウントデータは削除されます。</p>
            
            <p>またのご利用を心よりお待ちしております。<br>
            再登録はいつでも可能です。</p>

            <div style="text-align: center;">
                <a href="https://stkarteai1763705952.z11.web.core.windows.net/" class="btn">サービスページへ</a>
            </div>

            <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
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

    getPaymentFailedPlainText(name, failureReason, portalUrl) {
        const reasonText = failureReason ? `理由: ${failureReason}` : '';
        const actionText = portalUrl
            ? `以下のリンクから、お支払い情報の更新をお願いいたします。\n${portalUrl}`
            : `Chrome拡張機能の「アカウント」メニューから、お支払い情報を更新してください。`;

        return `${name} 様

いつもKarte AI Plusをご利用いただき、ありがとうございます。
クレジットカードの決済処理に失敗しました。

${reasonText}

恐れ入りますが、サービスを継続してご利用いただくために、
お支払い情報の確認と更新をお願いいたします。

【対応方法】
${actionText}

一定期間お支払いが確認できない場合、サービスの利用が制限されることがございます。
ご不明な点がございましたら、お気軽にお問い合わせください。

${companyConfig.name}
${companyConfig.representative}
${companyConfig.address}
お問い合わせ: ${companyConfig.email || 'support@wonder-drill.com'}`;
    }

    getPaymentFailedHtml(name, failureReason, portalUrl) {
        const reasonHtml = failureReason ? `<p><strong>理由:</strong> ${failureReason}</p>` : '';
        const actionButton = portalUrl
            ? `<div style="text-align: center; margin: 30px 0;">
                <a href="${portalUrl}" style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">お支払い情報を更新する</a>
               </div>`
            : `<p><strong>Chrome拡張機能の「アカウント」メニューから、お支払い情報を更新してください。</strong></p>`;

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333;}
        .container {max-width: 600px; margin: 0 auto; padding: 20px;}
        .header {background-color: #d32f2f; color: white; padding: 20px; text-align: center;}
        .content {padding: 20px; background-color: #f9f9f9;}
        .alert-box {background-color: #ffebee; border: 1px solid #ffcdd2; padding: 15px; margin: 20px 0; border-radius: 5px;}
        .footer {text-align: center; padding: 20px; color: #666; font-size: 12px;}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>決済失敗のお知らせ</h1>
        </div>
        <div class="content">
            <p>${name} 様</p>
            <p>いつもKarte AI Plusをご利用いただき、ありがとうございます。<br>
            クレジットカードの決済処理に失敗しました。</p>

            <div class="alert-box">
                <h3 style="margin-top: 0; color: #b71c1c;">お支払いをご確認ください</h3>
                ${reasonHtml}
            </div>

            <p>恐れ入りますが、サービスを継続してご利用いただくために、お支払い情報の確認と更新をお願いいたします。</p>

            ${actionButton}
            
            <p><small>※一定期間お支払いが確認できない場合、サービスの利用が制限されることがございます。</small></p>

            <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
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
    /**
     * Send trial end email (transition to paid plan)
     */
    async sendTrialEndEmail(email, userName, amount, nextBillingDate) {
        const displayName = userName || email.split('@')[0];
        const subject = "【Karte AI Plus】有料プランへの移行完了のお知らせ";
        const text = this.getTrialEndPlainText(displayName, amount, nextBillingDate);
        const html = this.getTrialEndHtml(displayName, amount, nextBillingDate);

        try {
            const result = await sendEmail({ to: email, subject, text, html });
            console.log(`Trial end email sent to ${email}`);
            return result;
        } catch (error) {
            console.error(`Failed to send trial end email to ${email}: `, error);
            throw error;
        }
    }

    getTrialEndPlainText(name, amount, nextBillingDate) {
        return `${name} 様

いつもKarte AI Plusをご利用いただき、ありがとうございます。
無料トライアル期間が終了し、有料プランへの移行が完了いたしました。
これより月額課金が開始されます。

【ご契約内容】
プラン名: Karte AI Plus 月額プラン
ご利用料金: ¥${amount.toLocaleString()} / 月
次回ご請求日: ${nextBillingDate}

引き続き、すべての機能を制限なくご利用いただけます。
今後とも、Karte AI Plusをよろしくお願いいたします。

【お支払い情報の確認・変更】
Chrome拡張機能のサイドバー内「アカウント」メニュー、または以下のリンクから可能です。
https://stkarteai1763705952.z11.web.core.windows.net/

ご不明な点がございましたら、お気軽にお問い合わせください。

${companyConfig.name}
${companyConfig.representative}
${companyConfig.address}
お問い合わせ: ${companyConfig.email || 'support@wonder-drill.com'}`;
    }

    getTrialEndHtml(name, amount, nextBillingDate) {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333;}
        .container {max-width: 600px; margin: 0 auto; padding: 20px;}
        .header {background-color: #2196F3; color: white; padding: 20px; text-align: center;}
        .content {padding: 20px; background-color: #f9f9f9;}
        .info-box {background-color: #e3f2fd; border: 1px solid #bbdefb; padding: 15px; margin: 20px 0; border-radius: 5px;}
        .footer {text-align: center; padding: 20px; color: #666; font-size: 12px;}
        .btn {display: inline-block; background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px;}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>有料プラン移行完了のお知らせ</h1>
        </div>
        <div class="content">
            <p>${name} 様</p>
            <p>いつもKarte AI Plusをご利用いただき、ありがとうございます。<br>
            無料トライアル期間が終了し、有料プランへの移行が完了いたしました。<br>
            これより月額課金が開始されます。</p>

            <div class="info-box">
                <h3 style="margin-top: 0; color: #0d47a1;">ご契約内容</h3>
                <p><strong>プラン名:</strong> Karte AI Plus 月額プラン</p>
                <p><strong>ご利用料金:</strong> ¥${amount.toLocaleString()} / 月</p>
                <p><strong>次回ご請求日:</strong> ${nextBillingDate}</p>
            </div>

            <p>引き続き、すべての機能を制限なくご利用いただけます。<br>
            今後とも、Karte AI Plusをよろしくお願いいたします。</p>

            <div style="text-align: center;">
                <a href="https://stkarteai1763705952.z11.web.core.windows.net/" class="btn">アカウント管理ページへ</a>
            </div>

            <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
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
    /**
     * Send portal access email (Web Management)
     */
    async sendPortalAccessEmail(email, userName) {
        const displayName = userName || email.split('@')[0];

        // Generate portal URL
        const portalUrl = await this.generatePortalUrl(email);

        if (!portalUrl) {
            console.error('Failed to generate portal URL for', email);
            throw new Error('Failed to generate portal URL');
        }

        const subject = "【Karte AI Plus】契約管理画面へのログインリンク";
        const text = this.getPortalAccessPlainText(displayName, portalUrl);
        const html = this.getPortalAccessHtml(displayName, portalUrl);

        try {
            const result = await sendEmail({ to: email, subject, text, html });
            console.log(`Portal access email sent to ${email}`);
            return result;
        } catch (error) {
            console.error(`Failed to send portal access email to ${email}: `, error);
            throw error;
        }
    }

    getPortalAccessPlainText(name, portalUrl) {
        return `${name} 様

Karte AI Plusをご利用いただき、ありがとうございます。
契約管理画面（Stripeカスタマーポータル）へのログインリンクを発行いたしました。

以下のリンクより、プランの確認、解約、お支払い情報の変更が可能です。
※セキュリティのため、リンクの有効期限は短くなっております。

${portalUrl}

ご不明な点がございましたら、お気軽にお問い合わせください。
今後ともよろしくお願いいたします。

${companyConfig.name}
${companyConfig.representative}
${companyConfig.address}
お問い合わせ: ${companyConfig.email || 'support@wonder-drill.com'}`;
    }

    getPortalAccessHtml(name, portalUrl) {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333;}
        .container {max-width: 600px; margin: 0 auto; padding: 20px;}
        .header {background-color: #009688; color: white; padding: 20px; text-align: center;}
        .content {padding: 20px; background-color: #f9f9f9;}
        .btn {display: inline-block; background-color: #009688; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold;}
        .footer {text-align: center; padding: 20px; color: #666; font-size: 12px;}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>契約管理画面へのログイン</h1>
        </div>
        <div class="content">
            <p>${name} 様</p>
            <p>Karte AI Plusをご利用いただき、ありがとうございます。<br>
            契約管理画面（Stripeカスタマーポータル）へのログインリンクを発行いたしました。</p>
            
            <p>以下のボタンより、プランの確認、解約、お支払い情報の変更が可能です。</p>

            <div style="text-align: center;">
                <a href="${portalUrl}" class="btn">契約管理画面を開く</a>
            </div>
            
            <p><small>※セキュリティのため、リンクの有効期限は短くなっております。<br>
            期限切れの場合は、再度Webサイトから発行してください。</small></p>

            <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
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
