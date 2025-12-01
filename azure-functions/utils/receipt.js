// Receipt generation utility using PDFKit
const PDFDocument = require('pdfkit');
const companyConfig = require('../config/company.json');

class ReceiptGenerator {
    /**
     * Generate receipt PDF
     * @param {Object} receiptData - Receipt data
     * @param {string} receiptData.receiptNumber - Receipt number
     * @param {string} receiptData.customerName - Customer name
     * @param {string} receiptData.customerEmail - Customer email
     * @param {number} receiptData.amount - Amount (including tax)
     * @param {string} receiptData.billingDate - Billing date (YYYY-MM format)
     * @param {Date} receiptData.issueDate - Issue date
     * @returns {Promise<Buffer>} PDF buffer
     */
    generateReceipt(receiptData) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                resolve(Buffer.concat(buffers));
            });
            doc.on('error', reject);

            // Header
            doc.fontSize(20)
               .text('領収書', { align: 'center' })
               .moveDown();

            // Company Information
            doc.fontSize(12)
               .text(`発行者: ${companyConfig.name}`, { align: 'left' })
               .text(`代表者: ${companyConfig.representative}`, { align: 'left' })
               .text(`所在地: ${companyConfig.address}`, { align: 'left' });
            
            // Invoice Number (インボイス制度対応)
            if (companyConfig.invoiceNumber) {
                doc.fontSize(10)
                   .text(`登録番号: ${companyConfig.invoiceNumber}`, { align: 'left' });
            }
            
            if (companyConfig.email) {
                doc.fontSize(10)
                   .text(`メールアドレス: ${companyConfig.email}`, { align: 'left' });
            }
            
            doc.moveDown();

            // Receipt Number and Date
            doc.fontSize(10)
               .text(`領収書番号: ${receiptData.receiptNumber}`, { align: 'right' })
               .text(`発行日: ${this.formatDate(receiptData.issueDate)}`, { align: 'right' })
               .moveDown(2);

            // Customer Information
            doc.fontSize(12)
               .text('お客様情報', { underline: true })
               .moveDown(0.5)
               .text(`お名前: ${receiptData.customerName}`)
               .text(`メールアドレス: ${receiptData.customerEmail}`)
               .moveDown();

            // Payment Details
            doc.fontSize(12)
               .text('支払い内容', { underline: true })
               .moveDown(0.5);

            const tableTop = doc.y;
            const itemHeight = 30;

            // Table header
            doc.fontSize(10)
               .text('項目', 50, tableTop)
               .text('数量', 200, tableTop)
               .text('単価（税込）', 300, tableTop, { width: 100, align: 'right' })
               .text('金額（税込）', 400, tableTop, { width: 100, align: 'right' });

            // Calculate tax (assuming 10% consumption tax)
            const taxRate = 0.1;
            const amountIncludingTax = receiptData.amount;
            const amountExcludingTax = Math.floor(amountIncludingTax / (1 + taxRate));
            const taxAmount = amountIncludingTax - amountExcludingTax;

            // Table content
            const itemY = tableTop + itemHeight;
            doc.text('Karte AI Plus サブスクリプション', 50, itemY)
               .text('1', 200, itemY)
               .text(`¥${amountIncludingTax.toLocaleString()}`, 300, itemY, { width: 100, align: 'right' })
               .text(`¥${amountIncludingTax.toLocaleString()}`, 400, itemY, { width: 100, align: 'right' });

            // Tax breakdown
            const taxY = itemY + itemHeight;
            doc.fontSize(9)
               .text('（内消費税）', 300, taxY, { width: 100, align: 'right' })
               .text(`¥${taxAmount.toLocaleString()}`, 400, taxY, { width: 100, align: 'right' });

            // Total
            const totalY = taxY + itemHeight + 10;
            doc.fontSize(12)
               .text('合計金額（税込）', 300, totalY, { width: 100, align: 'right' })
               .fontSize(14)
               .text(`¥${amountIncludingTax.toLocaleString()}`, 400, totalY, { width: 100, align: 'right' })
               .moveDown(2);

            // Billing Period
            doc.fontSize(10)
               .text(`請求期間: ${receiptData.billingDate}`, { align: 'left' })
               .moveDown();

            // Payment Method
            doc.fontSize(10)
               .text('お支払い方法: Stripe（クレジットカード決済）', { align: 'left' })
               .moveDown(2);

            // Footer
            doc.fontSize(10)
               .text('※この領収書は自動発行されたものです。', { align: 'center' })
               .text('※ご不明な点がございましたら、お問い合わせください。', { align: 'center' });
            
            if (companyConfig.email) {
                doc.text(`お問い合わせ: ${companyConfig.email}`, { align: 'center' });
            }
            
            doc.moveDown();

            // Company stamp area
            doc.fontSize(8)
               .text(`${companyConfig.name}`, { align: 'center' })
               .text(`${companyConfig.address}`, { align: 'center' });
            
            if (companyConfig.invoiceNumber) {
                doc.text(`登録番号: ${companyConfig.invoiceNumber}`, { align: 'center' });
            }

            doc.end();
        });
    }

    /**
     * Format date to Japanese format
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}年${month}月${day}日`;
    }

    /**
     * Generate receipt number
     * Format: RCP-YYYYMMDD-XXXX
     */
    generateReceiptNumber(issueDate) {
        const year = issueDate.getFullYear();
        const month = String(issueDate.getMonth() + 1).padStart(2, '0');
        const day = String(issueDate.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `RCP-${year}${month}${day}-${random}`;
    }
}

module.exports = new ReceiptGenerator();
