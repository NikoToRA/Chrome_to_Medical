/**
 * 特定ユーザーの存在・キー不一致を点検（読み取り専用）
 * 使い方:
 *   node azure-functions/audit_emails_check.js path/to/emails.txt
 *   （1行に1メールアドレス）
 */

const fs = require('fs');
const { TableClient } = require('@azure/data-tables');

const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!conn) {
  console.error('AZURE_STORAGE_CONNECTION_STRING is not set.');
  process.exit(1);
}

const file = process.argv[2] || 'emails.txt';
if (!fs.existsSync(file)) {
  console.error(`Emails file not found: ${file}`);
  process.exit(1);
}

const emails = fs.readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .map(s => s.trim())
  .filter(Boolean);

const b64 = (s) => Buffer.from(s).toString('base64');

async function checkOne(tableClient, email) {
  const lower = (email || '').toLowerCase();
  const rowLower = b64(lower);
  const rowRaw = b64(email || '');

  let foundLower = false;
  let foundRaw = false;
  let entityLower = null;
  let entityRaw = null;

  try {
    entityLower = await tableClient.getEntity('Subscription', rowLower);
    foundLower = true;
  } catch (e) {
    if (e.statusCode !== 404) throw e;
  }

  if (!foundLower && email && email !== lower) {
    try {
      entityRaw = await tableClient.getEntity('Subscription', rowRaw);
      foundRaw = true;
    } catch (e) {
      if (e.statusCode !== 404) throw e;
    }
  }

  return { email, lower, foundLower, foundRaw, entity: entityLower || entityRaw || null };
}

(async () => {
  const subClient = TableClient.fromConnectionString(conn, 'Subscriptions');
  console.log(`# Checking ${emails.length} emails in Subscriptions`);
  for (const email of emails) {
    try {
      const res = await checkOne(subClient, email);
      const summary = {
        email: res.email,
        foundLower: res.foundLower,
        foundRaw: res.foundRaw,
        status: res.entity ? res.entity.status : null,
        currentPeriodEnd: res.entity ? res.entity.currentPeriodEnd : null,
        trialEnd: res.entity ? res.entity.trialEnd : null,
      };
      console.log(summary);
    } catch (e) {
      console.error({ email, error: e.message });
    }
  }
})();

