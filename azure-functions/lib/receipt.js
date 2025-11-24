function formatYen(amountInMinor) {
  try {
    const n = (amountInMinor || 0) / 100;
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);
  } catch (_) {
    return `${(amountInMinor || 0) / 100} JPY`;
  }
}

function buildReceiptEmail(invoice) {
  const issuer = {
    name: process.env.RECEIPT_ISSUER_NAME || 'Karte AI+',
    address: process.env.RECEIPT_ISSUER_ADDRESS || '',
    email: process.env.RECEIPT_ISSUER_EMAIL || 'no-reply@karte-ai-plus.com'
  };
  const number = invoice.number || invoice.id;
  const amount = invoice.amount_paid || invoice.amount_due;
  const currency = (invoice.currency || 'jpy').toUpperCase();
  const hostedUrl = invoice.hosted_invoice_url;
  const pdfUrl = invoice.invoice_pdf;
  const when = new Date((invoice.status_transitions?.paid_at || invoice.created) * 1000);

  const subject = `【領収書】#${number}`;
  const text = [
    `領収書（Receipt）`,
    `伝票番号: ${number}`,
    `決済日時: ${when.toLocaleString('ja-JP')}`,
    `金額: ${formatYen(amount)} (${currency})`,
    issuer.name ? `発行者: ${issuer.name}` : '',
    issuer.address ? `発行者住所: ${issuer.address}` : '',
    '',
    hostedUrl ? `請求書（Stripeホスト）: ${hostedUrl}` : '',
    pdfUrl ? `PDF: ${pdfUrl}` : '',
  ].filter(Boolean).join('\n');

  const html = `
    <div>
      <h2>領収書（Receipt）</h2>
      <p><b>伝票番号:</b> ${number}</p>
      <p><b>決済日時:</b> ${when.toLocaleString('ja-JP')}</p>
      <p><b>金額:</b> ${formatYen(amount)} (${currency})</p>
      ${issuer.name ? `<p><b>発行者:</b> ${issuer.name}</p>` : ''}
      ${issuer.address ? `<p><b>発行者住所:</b> ${issuer.address}</p>` : ''}
      ${hostedUrl ? `<p><a href="${hostedUrl}">Stripeホスト請求書を表示</a></p>` : ''}
      ${pdfUrl ? `<p><a href="${pdfUrl}">PDFをダウンロード</a></p>` : ''}
    </div>
  `;
  return { subject, text, html };
}

module.exports = { buildReceiptEmail };

