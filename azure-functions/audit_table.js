/**
 * Azure Table Storage 監査スクリプト（読み取り専用）
 * - Subscriptions / Users テーブルの整合性を確認
 *   - RowKey が b64(lower(email)) か
 *   - email が小文字化されているか
 *   - lower(email) 重複の有無
 *
 * 実行前に AZURE_STORAGE_CONNECTION_STRING を環境変数に設定してください。
 *   node azure-functions/audit_table.js
 */

const { TableClient } = require('@azure/data-tables');

const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!conn) {
  console.error('AZURE_STORAGE_CONNECTION_STRING is not set.');
  process.exit(1);
}

const b64 = (s) => Buffer.from(s).toString('base64');
const lowerB64 = (e) => b64((e || '').toLowerCase());

async function audit(tableName, options = { printSamples: true, sampleLimit: 20 }) {
  const client = TableClient.fromConnectionString(conn, tableName);
  const seen = new Map(); // lower(email) -> count

  let total = 0;
  let badRowKey = 0;
  let emailNotLower = 0;
  let duplicates = 0;

  const samples = {
    badRowKey: [],
    emailNotLower: [],
    duplicates: new Set(),
  };

  for await (const ent of client.listEntities()) {
    total++;
    const email = String(ent.email || '');
    const expected = lowerB64(email);

    if (ent.rowKey !== expected) {
      badRowKey++;
      if (options.printSamples && samples.badRowKey.length < options.sampleLimit) {
        samples.badRowKey.push({ rowKey: ent.rowKey, expected, email });
      }
    }

    if (email && email !== email.toLowerCase()) {
      emailNotLower++;
      if (options.printSamples && samples.emailNotLower.length < options.sampleLimit) {
        samples.emailNotLower.push({ email, lower: email.toLowerCase(), rowKey: ent.rowKey });
      }
    }

    const k = email.toLowerCase();
    if (k) {
      const n = (seen.get(k) || 0) + 1;
      seen.set(k, n);
      if (n === 2) {
        duplicates++;
        if (options.printSamples) samples.duplicates.add(k);
      }
    }
  }

  console.log(`[${tableName}] total=${total}, badRowKey=${badRowKey}, emailNotLower=${emailNotLower}, duplicates=${duplicates}`);
  if (badRowKey || emailNotLower || duplicates) {
    console.log('→ 修正候補あり');
    if (options.printSamples) {
      if (samples.badRowKey.length) {
        console.log('  Sample badRowKey:', samples.badRowKey);
      }
      if (samples.emailNotLower.length) {
        console.log('  Sample emailNotLower:', samples.emailNotLower);
      }
      if (samples.duplicates.size) {
        console.log('  Sample duplicates (lowered emails):', Array.from(samples.duplicates).slice(0, options.sampleLimit));
      }
    }
  }
}

(async () => {
  try {
    await audit('Subscriptions');
    await audit('Users');
  } catch (e) {
    console.error('Audit failed:', e.message);
    process.exit(1);
  }
})();

